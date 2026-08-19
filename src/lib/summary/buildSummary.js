import { formatYearMonth, monthsBetween, parseDateOnly, summarizeManagement, toReferenceDate } from '../history.js'
import { normalizeSafetyGrade } from './safetyGrades.js'
import { validateSummary, MAX_SUMMARY_LENGTH, countCharacters } from './validateSummary.js'

/**
 * 규칙 기반 한 문장 요약 생성기.
 * ---------------------------------------------------------------------------
 * 문장 틀 (PRD F-02 ①③ · §15.2 · §15.3)
 *   "1917년에 지어졌고, 최근 점검은 9개월 전인 2025년 11월, 마지막 보수는 2023년 6월입니다."
 *
 * 지키는 것
 *  · 준공연도를 단독으로 내보내지 않는다. 항상 점검·보수 시점과 함께 나온다 (F-02 ③)
 *  · 경과 '연수'를 강조하지 않는다. §1의 논지 그대로 — 연수만 크게 보이면
 *    '오래됨 = 위험함'이라는 오해를 문장이 스스로 만든다
 *  · 값이 없는 절은 통째로 뺀다. 추정하지 않는다 (F-02 ⑤)
 *  · 쓸 값이 하나도 없으면 문장을 만들지 않고 null (F-05)
 *  · 안전등급은 문장에 쓰지 않는다. based_on 에만 기록한다 (F-02.1)
 *
 * '공개된 공식 정보 기준'이라는 한정구는 문장 안이 아니라 요약 카드 라벨에 있다
 * (§15.2). 60자 안에서 그 8글자가 앞머리를 다 먹고, 모든 교량에서 같은 말이
 * 반복되면 읽히지 않기 때문이다.
 * ---------------------------------------------------------------------------
 */

/** 문장 틀이 바뀌면 올린다. based_on 에 기록되어 재생성 판단에 쓰인다. */
export const TEMPLATE_VERSION = 'rule-2-history'

/** 요약 카드에 붙는 한정 라벨. 문장이 아니라 카드가 이 조건을 밝힌다. */
export const SUMMARY_QUALIFIER = '공개된 공식 정보 기준'

/** 준공연도 정규화. 네 자리 정수가 아니면 null. */
function parseYear(value) {
  const year = Number(value)
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return null
  return year
}

/** 경과 개월을 문장에 쓸 표기와, 그 표기에 등장하는 숫자로 나눈다. */
function elapsedParts(months) {
  if (!Number.isFinite(months) || months < 0) return null
  if (months === 0) return { text: '한 달 이내', numbers: [] }
  if (months < 12) return { text: `${months}개월`, numbers: [months] }
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0
    ? { text: `${years}년`, numbers: [years] }
    : { text: `${years}년 ${rest}개월`, numbers: [years, rest] }
}

/**
 * 절을 모아 문장을 만든다. 60자를 넘으면 정해진 순서로 덜어낸다.
 *
 * 덜어내는 순서 — 덜 중요한 것부터
 *   1) 점검 경과 표기('9개월 전인')  … 절대 연월이 바로 옆에 있으므로 장식에 가깝다
 *   2) 마지막 보수 절                … 상세 화면 '관리 요약'에 같은 값이 그대로 있다
 * 둘을 다 덜어도 60자를 넘으면 문장을 만들지 않는다.
 */
function assemble({ completionYear, inspection, repair }, { withElapsed, withRepair }) {
  const parts = []
  const numbers = []

  const hasInspection = Boolean(inspection)
  const hasRepair = Boolean(repair) && withRepair
  const alone = completionYear !== null && !hasInspection && !hasRepair

  if (completionYear !== null) {
    parts.push(alone ? `${completionYear}년에 지어졌습니다.` : `${completionYear}년에 지어졌고`)
    numbers.push(completionYear)
  }

  if (hasInspection) {
    const elapsed = withElapsed ? inspection.elapsed : null
    parts.push(
      elapsed
        ? `최근 점검은 ${elapsed.text} 전인 ${inspection.year}년 ${inspection.month}월`
        : `최근 점검은 ${inspection.year}년 ${inspection.month}월`,
    )
    numbers.push(inspection.year, inspection.month)
    if (elapsed) numbers.push(...elapsed.numbers)
  }

  if (hasRepair) {
    parts.push(`마지막 보수는 ${repair.year}년 ${repair.month}월`)
    numbers.push(repair.year, repair.month)
  }

  if (parts.length === 0) return null

  const text = alone ? parts[0] : `${parts.join(', ')}입니다.`
  return { text, numbers }
}

/**
 * 요약 후보 문장과 근거(based_on)를 만든다. 검증은 하지 않는다.
 *
 * @param {object} input
 * @param {object} input.bridge   bridges 행
 * @param {Array}  input.history  bridge_history 행 배열
 * @param {{ referenceDate?: string|Date }} [options]
 */
export function buildSummaryCandidate(input, options = {}) {
  const bridge = input?.bridge ?? {}
  const history = Array.isArray(input?.history) ? input.history : []
  const referenceDate = toReferenceDate(options.referenceDate ?? new Date())
  const reference = parseDateOnly(referenceDate)

  const omitted = []

  // ── 준공연도 ────────────────────────────────────────────────
  const completionYear = parseYear(bridge.completed_year)
  if (completionYear === null) {
    omitted.push({
      field: 'bridges.completed_year',
      reason:
        bridge.completed_year == null
          ? '원본에 값이 없음'
          : `연도로 읽을 수 없는 값: ${JSON.stringify(bridge.completed_year)}`,
    })
  } else if (completionYear > reference.year) {
    omitted.push({
      field: 'bridges.completed_year',
      reason: `준공연도(${completionYear})가 기준일(${referenceDate})보다 미래`,
    })
  }
  const usableCompletionYear =
    completionYear !== null && completionYear <= reference.year ? completionYear : null

  // ── 마지막 점검 · 마지막 보수 ───────────────────────────────
  const { lastInspection, lastRepair } = summarizeManagement(history, { referenceDate })

  const toEvent = (event, field) => {
    if (!event) {
      omitted.push({ field, reason: '공개된 기록이 없음' })
      return null
    }
    const months = monthsBetween(event.date, reference)
    if (months < 0) {
      omitted.push({ field, reason: `기록일(${event.occurred_on})이 기준일(${referenceDate})보다 미래` })
      return null
    }
    return {
      year: event.date.year,
      month: event.date.month,
      months,
      elapsed: elapsedParts(months),
      row: event,
    }
  }

  const inspection = toEvent(lastInspection, 'bridge_history(점검)')
  const repair = toEvent(lastRepair, 'bridge_history(보수·보강)')

  // ── 조립 : 60자에 맞을 때까지 정해진 순서로 덜어낸다 ────────
  const source = { completionYear: usableCompletionYear, inspection, repair }
  const ladder = [
    { withElapsed: true, withRepair: true },
    { withElapsed: false, withRepair: true },
    { withElapsed: true, withRepair: false },
    { withElapsed: false, withRepair: false },
  ]

  let built = null
  let usedStep = null
  let shortest = null
  let shortestStep = null

  for (const [step, mode] of ladder.entries()) {
    const candidate = assemble(source, mode)
    // 그 조합으로는 쓸 절이 없는 경우(예: 보수만 있는데 보수를 뺀 조합). 다음 단계로.
    if (!candidate) continue

    if (!shortest || countCharacters(candidate.text) < countCharacters(shortest.text)) {
      shortest = candidate
      shortestStep = step
    }
    if (countCharacters(candidate.text) <= MAX_SUMMARY_LENGTH) {
      built = candidate
      usedStep = step
      break
    }
  }

  // 다 덜어내도 60자를 넘으면 가장 짧은 후보를 그대로 넘겨 검증에서 걸리게 둔다.
  // 여기서 조용히 잘라내면 문장이 잘린 채 저장된다.
  if (!built && shortest) {
    built = shortest
    usedStep = shortestStep
  }

  const basedOn = {
    template_version: TEMPLATE_VERSION,
    reference_date: referenceDate,
    assembled_step: usedStep,
    source: {
      bridges: {
        completed_year: bridge.completed_year ?? null,
        source: bridge.source ?? null,
        fetched_at: bridge.fetched_at ?? null,
      },
      bridge_history: {
        last_inspection: lastInspection
          ? {
              occurred_on: lastInspection.occurred_on ?? null,
              event_type: lastInspection.event_type ?? null,
              // 문장에는 쓰지 않는다 (F-02.1). 사후 대조용으로만 남긴다.
              safety_grade: normalizeSafetyGrade(lastInspection.safety_grade),
              source: lastInspection.source ?? null,
              data_as_of: lastInspection.data_as_of ?? null,
            }
          : null,
        last_repair: lastRepair
          ? {
              occurred_on: lastRepair.occurred_on ?? null,
              event_type: lastRepair.event_type ?? null,
              source: lastRepair.source ?? null,
              data_as_of: lastRepair.data_as_of ?? null,
            }
          : null,
        record_count: history.length,
      },
    },
    derived: {
      completion_year: usableCompletionYear,
      inspection_year: inspection?.year ?? null,
      inspection_month: inspection?.month ?? null,
      months_since_inspection: inspection?.months ?? null,
      inspection_elapsed_text: inspection?.elapsed?.text ?? null,
      repair_year: repair?.year ?? null,
      repair_month: repair?.month ?? null,
      months_since_repair: repair?.months ?? null,
    },
    allowed_numbers: built ? [...new Set(built.numbers)] : [],
    omitted,
  }

  return {
    summaryText: built?.text ?? null,
    basedOn,
    allowedNumbers: basedOn.allowed_numbers,
    skippedReason: built ? null : '문장에 쓸 수 있는 값이 하나도 없음',
  }
}

/**
 * 후보 문장을 만들고 곧바로 검증한다.
 * 검증에 걸리면 summaryText 를 null 로 내린다 — 요약이 없는 것이 잘못된 요약보다 낫다.
 *
 * 재시도는 두지 않았다. 같은 입력에 같은 문장이 나오는 결정적 생성이라
 * 다시 돌려도 결과가 같고, 재시도 흉내를 내면 템플릿 버그를 가린다.
 */
export function generateSummary(input, options = {}) {
  const candidate = buildSummaryCandidate(input, options)

  if (candidate.summaryText === null) {
    return {
      summaryText: null,
      basedOn: {
        ...candidate.basedOn,
        rejected_by: null,
        skipped_reason: candidate.skippedReason,
      },
      validation: {
        ok: false,
        failures: [{ check: 'insufficient', detail: candidate.skippedReason }],
      },
    }
  }

  const validation = validateSummary(candidate.summaryText, {
    allowedNumbers: candidate.allowedNumbers,
  })

  if (!validation.ok) {
    return {
      summaryText: null,
      basedOn: {
        ...candidate.basedOn,
        rejected_text: candidate.summaryText,
        rejected_by: validation.failures,
        skipped_reason: '검증 실패로 저장하지 않음',
      },
      validation,
    }
  }

  return {
    summaryText: candidate.summaryText,
    basedOn: { ...candidate.basedOn, rejected_by: null, skipped_reason: null },
    validation,
  }
}

export { formatYearMonth, toReferenceDate }
