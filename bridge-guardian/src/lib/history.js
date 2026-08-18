/**
 * F-03 관리 이력 타임라인 — 정렬과 '기록 사이의 간격' 계산.
 * ---------------------------------------------------------------------------
 * PRD F-03 수용기준에서 이 파일이 책임지는 것 :
 *   ① 시간 역순(최신이 위)으로 일관되게
 *   ② 기록 사이의 간격을 드러낸다 — 사용자가 알아야 할 것은 사건 목록이 아니라
 *      '얼마나 자주 관리되었는가'다
 *   ⑤ 비어 있는 구간을 '점검하지 않은 기간'으로 쓰지 않는다
 *   ⑥ 우리가 요약·평가하지 않는다
 *
 * ②를 만족시키면서 ⑥을 어기지 않는 방법은 하나뿐이다 — 간격에 임계값을 두지
 * 않는 것. '3년 넘으면 경고'처럼 기준을 세우는 순간 우리가 판정하는 것이 된다.
 * 그래서 모든 간격을 똑같이, 있는 그대로 적는다. 길다/짧다는 사용자가 읽는다.
 * ---------------------------------------------------------------------------
 */

export const COMPLETION_EVENT = '준공'

/** PRD F-03 '사건 종류'. 공공데이터 명세 확정 전이라 [확인 필요 — §13 Q2]. */
export const INSPECTION_EVENTS = Object.freeze(['정기점검', '정밀점검', '정밀안전진단'])
export const REPAIR_EVENTS = Object.freeze(['보수', '보강'])

/** 'YYYY-MM-DD' → { year, month, day }. 실제로 존재하지 않는 날짜면 null. */
export function parseDateOnly(value) {
  if (typeof value !== 'string') return null
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!matched) return null

  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

/** 기준일(Date 또는 'YYYY-MM-DD')을 한국 시각 달력 날짜 문자열로. */
export function toReferenceDate(input = new Date()) {
  if (typeof input === 'string') {
    if (!parseDateOnly(input)) throw new TypeError(`기준일 형식이 잘못되었습니다: ${input}`)
    return input.trim().slice(0, 10)
  }
  const kst = new Date(input.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** 두 달력 날짜 사이의 온전한 개월 수. later 가 earlier 보다 앞이면 음수. */
export function monthsBetween(earlier, later) {
  let months = (later.year - earlier.year) * 12 + (later.month - earlier.month)
  if (later.day < earlier.day) months -= 1
  return months
}

/** 개월 수를 일상어로. 판정 없이 길이만 적는다. */
export function describeDuration(months) {
  if (!Number.isFinite(months) || months < 0) return null
  if (months === 0) return '한 달 이내'
  if (months < 12) return `${months}개월`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`
}

/** '2025년 11월' 표기. 연월까지만 쓴다 — 일 단위는 이력 읽기에 쓰이지 않는다. */
export function formatYearMonth(date) {
  return date ? `${date.year}년 ${date.month}월` : null
}

/**
 * 이력 배열을 타임라인으로 만든다.
 *
 * @param {Array<object>} history bridge_history 행 배열
 * @param {{ referenceDate?: string|Date }} [options]
 * @returns {{
 *   items: Array<object>,        최신이 위. 각 항목에 date/yearMonth/intervalToPrevious*
 *   unreadable: Array<object>,   날짜를 읽을 수 없어 타임라인에 넣지 못한 행
 *   sinceLatestMonths: number|null,
 *   sinceLatestText: string|null,
 *   referenceDate: string
 * }}
 */
export function buildTimeline(history, options = {}) {
  const referenceDate = toReferenceDate(options.referenceDate ?? new Date())
  const reference = parseDateOnly(referenceDate)

  const readable = []
  const unreadable = []

  for (const row of Array.isArray(history) ? history : []) {
    const date = parseDateOnly(row?.occurred_on)
    // 기준일보다 미래인 기록은 타임라인에 끼우지 않는다. 추정으로 고치지도 않는다.
    if (!date || monthsBetween(date, reference) < 0) {
      unreadable.push({
        ...row,
        reason: !date
          ? `날짜를 읽을 수 없음: ${JSON.stringify(row?.occurred_on ?? null)}`
          : `기준일(${referenceDate})보다 미래`,
      })
      continue
    }
    readable.push({ ...row, date })
  }

  // 최신이 위 (F-03 ①). 같은 날이면 준공을 가장 아래로 밀어 흐름의 시작점으로 둔다.
  readable.sort((a, b) => {
    const diff =
      b.date.year - a.date.year || b.date.month - a.date.month || b.date.day - a.date.day
    if (diff !== 0) return diff
    if (a.event_type === COMPLETION_EVENT) return 1
    if (b.event_type === COMPLETION_EVENT) return -1
    return 0
  })

  const items = readable.map((row, index) => {
    // 바로 아래(더 오래된) 기록과의 간격. 마지막 항목은 그 아래가 없으므로 null.
    const older = readable[index + 1]
    const gapMonths = older ? monthsBetween(older.date, row.date) : null
    return {
      ...row,
      yearMonth: formatYearMonth(row.date),
      isCompletion: row.event_type === COMPLETION_EVENT,
      intervalToPreviousMonths: gapMonths,
      intervalToPreviousText: gapMonths === null ? null : describeDuration(gapMonths),
    }
  })

  const latest = readable[0]
  const sinceLatestMonths = latest ? monthsBetween(latest.date, reference) : null

  return {
    items,
    unreadable,
    sinceLatestMonths,
    sinceLatestText: sinceLatestMonths === null ? null : describeDuration(sinceLatestMonths),
    referenceDate,
  }
}

/**
 * 주어진 종류들 중 가장 최근 1건. 없으면 null.
 *
 * 기준일보다 미래인 기록은 건너뛴다 — buildTimeline 과 같은 규칙이다.
 * 이 둘이 어긋나면 타임라인에는 없는 날짜가 '마지막 점검'으로 표시된다.
 */
export function findLatestEvent(history, eventTypes, options = {}) {
  const allowed = new Set(eventTypes)
  const reference = parseDateOnly(toReferenceDate(options.referenceDate ?? new Date()))
  let best = null

  for (const row of Array.isArray(history) ? history : []) {
    if (!allowed.has(row?.event_type)) continue
    const date = parseDateOnly(row.occurred_on)
    if (!date) continue
    if (monthsBetween(date, reference) < 0) continue
    if (
      !best ||
      date.year > best.date.year ||
      (date.year === best.date.year &&
        (date.month > best.date.month ||
          (date.month === best.date.month && date.day > best.date.day)))
    ) {
      best = { ...row, date }
    }
  }
  return best
}

/**
 * F-02 '관리 요약' — 마지막 점검·마지막 보수 시점.
 * PRD F-02 ③ 때문에 준공연도와 이 둘은 항상 함께 다룬다.
 */
export function summarizeManagement(history, options = {}) {
  const lastInspection = findLatestEvent(history, INSPECTION_EVENTS, options)
  const lastRepair = findLatestEvent(history, REPAIR_EVENTS, options)
  return {
    lastInspection,
    lastRepair,
    lastInspectionYearMonth: formatYearMonth(lastInspection?.date),
    lastRepairYearMonth: formatYearMonth(lastRepair?.date),
  }
}
