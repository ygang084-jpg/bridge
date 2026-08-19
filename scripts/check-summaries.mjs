#!/usr/bin/env node
/**
 * 확인 스크립트 — 교량 3곳의 자동 요약을 생성해 콘솔에 출력한다.
 *
 *   node scripts/check-summaries.mjs
 *   node scripts/check-summaries.mjs --date=2026-08-18   기준일 고정(결과 재현용)
 *   node scripts/check-summaries.mjs --db                Supabase 원본으로 실행
 *
 * 기본은 표본값이다. Supabase 자격증명 없이도 파이프라인 동작을 볼 수 있게 했다.
 */

import {
  MAX_SUMMARY_LENGTH,
  SUMMARY_BADGE_LABEL,
  SUMMARY_QUALIFIER,
  countCharacters,
  createInMemorySummariesRepo,
  isSafetyGradeDefinitionPublishable,
  refreshSummaries,
  toReferenceDate,
  validateSummary,
} from '../src/lib/summary/index.js'
import { resolveInfoState } from '../src/lib/infoState.js'

// ───────────────────────────────────────────────────────────────
// 표본 교량 3곳 — supabase/seed/sample.sql 과 같은 값
//
// ⚠ 공공 API 에서 받은 실제 값이 아니다. 세 가지 상황(이력 있음 / 부분 / 없음)에서
//   요약이 어떻게 달라지는지 보이려고 고른 값이다.
// ───────────────────────────────────────────────────────────────
const h = (occurred_on, event_type, extra = {}) => ({
  occurred_on,
  event_type,
  source: '표본 데이터',
  data_as_of: `${occurred_on.slice(0, 7)}-28`,
  ...extra,
})

const FIXTURES = [
  {
    bridgeId: 'sample-001',
    bridge: {
      id: 'sample-001',
      name: '한강대교 (표본)',
      completed_year: 1917,
      source: '표본 데이터 (공공 API 아님)',
      fetched_at: '2026-08-18T03:00:00.000Z',
    },
    history: [
      h('2025-11-03', '정기점검', { safety_grade: 'B' }),
      h('2021-09-14', '정밀안전진단', { safety_grade: 'B' }),
      h('2016-05-20', '보수', { description: '교면 방수 및 포장 보수' }),
      h('1917-10-07', '준공'),
    ],
    note: '이력 있음 — 준공·점검·보수 세 절이 모두 들어간다',
  },
  {
    bridgeId: 'sample-002',
    bridge: {
      id: 'sample-002',
      name: '마포대교 (표본)',
      completed_year: 1970,
      source: '표본 데이터 (공공 API 아님)',
      fetched_at: '2026-08-18T03:00:00.000Z',
    },
    history: [h('2024-05-21', '정기점검', { safety_grade: 'C' }), h('1970-05-16', '준공')],
    note: '보수 기록 없음 — 보수 절을 통째로 뺀다',
  },
  {
    bridgeId: 'sample-003',
    bridge: {
      id: 'sample-003',
      name: '샛터소교 (표본)',
      completed_year: null,
      source: '표본 데이터 (공공 API 아님)',
      fetched_at: '2026-08-18T03:00:00.000Z',
    },
    history: [],
    note: '준공연도도 이력도 없음 — 요약을 만들지 않고 null 로 둔다',
  },
]

// ───────────────────────────────────────────────────────────────
// 출력 도우미 (한글은 터미널에서 두 칸을 차지한다)
// ───────────────────────────────────────────────────────────────
const isWide = (cp) =>
  (cp >= 0x1100 && cp <= 0x115f) ||
  (cp >= 0x2e80 && cp <= 0xa4cf) ||
  (cp >= 0xac00 && cp <= 0xd7a3) ||
  (cp >= 0xf900 && cp <= 0xfaff) ||
  (cp >= 0xfe30 && cp <= 0xfe6f) ||
  (cp >= 0xff00 && cp <= 0xff60) ||
  (cp >= 0xffe0 && cp <= 0xffe6)

const displayWidth = (text) =>
  Array.from(String(text)).reduce((w, ch) => w + (isWide(ch.codePointAt(0)) ? 2 : 1), 0)

const LABEL_W = 32
/** 라벨이 길어도 값이 붙어버리지 않게 최소 두 칸은 띄운다. */
const row = (label, value) =>
  console.log(`  ${label}${' '.repeat(Math.max(2, LABEL_W - displayWidth(label)))}${value}`)
const rule = (char = '─') => console.log(char.repeat(78))

// ───────────────────────────────────────────────────────────────
function printItem(index, item, result) {
  const basedOn = result.basedOn ?? {}
  const source = basedOn.source ?? {}
  const history = source.bridge_history ?? {}
  const derived = basedOn.derived ?? {}
  const info = resolveInfoState(item.history)

  console.log('')
  rule('━')
  console.log(`${index + 1}. ${item.bridge?.name ?? item.bridgeId}${item.note ? `   — ${item.note}` : ''}`)
  rule('━')

  const badge = `  [${SUMMARY_BADGE_LABEL}]  `
  const badgeIndent = ' '.repeat(displayWidth(badge))

  console.log('')
  console.log(`  ${SUMMARY_QUALIFIER}   ·   정보 상태 ${info.label} (준공 외 ${info.recordCount}건)`)
  if (result.summaryText) {
    const len = countCharacters(result.summaryText)
    console.log(`${badge}${result.summaryText}`)
    console.log(`${badgeIndent}(${len}자 / 최대 ${MAX_SUMMARY_LENGTH}자, 검증 통과)`)
  } else {
    console.log(`${badge}(없음 — null)`)
    for (const failure of result.failures ?? []) {
      console.log(`${badgeIndent}↳ ${failure.check}: ${failure.detail}`)
    }
  }

  console.log('')
  console.log('  based_on ─ 근거로 삼은 원본 값')
  row('  bridges.completed_year', source.bridges?.completed_year ?? '(없음)')
  row('  · source', source.bridges?.source ?? '(없음)')
  row('  history.record_count', history.record_count ?? 0)
  if (history.last_inspection) {
    row('  마지막 점검 occurred_on', history.last_inspection.occurred_on)
    row('  · event_type', history.last_inspection.event_type ?? '(없음)')
    row('  · safety_grade', `${history.last_inspection.safety_grade ?? '(없음)'}   ← 문장에는 쓰지 않음`)
    row('  · data_as_of', history.last_inspection.data_as_of ?? '(없음)')
  } else {
    row('  마지막 점검', '(공개된 기록 없음)')
  }
  if (history.last_repair) {
    row('  마지막 보수 occurred_on', history.last_repair.occurred_on)
    row('  · event_type', history.last_repair.event_type ?? '(없음)')
  } else {
    row('  마지막 보수', '(공개된 기록 없음)')
  }

  console.log('')
  console.log('  based_on ─ 원본에서 계산한 값')
  row('  기준일', basedOn.reference_date ?? '(없음)')
  row('  조립 단계', basedOn.assembled_step === null ? '(없음)' : `${basedOn.assembled_step}단계`)
  row('  점검 후 경과', derived.months_since_inspection == null
    ? '(계산 안 함)'
    : `${derived.months_since_inspection}개월 → 문장 표기 "${derived.inspection_elapsed_text}"`)
  row('  보수 후 경과', derived.months_since_repair == null
    ? '(계산 안 함)'
    : `${derived.months_since_repair}개월`)
  row('  문장에 허용된 숫자', (basedOn.allowed_numbers ?? []).join(', ') || '(없음)')

  console.log('')
  console.log('  based_on ─ 문장에서 뺀 항목')
  if ((basedOn.omitted ?? []).length === 0) {
    row('  (없음)', '')
  } else {
    for (const omitted of basedOn.omitted) row(`  ${omitted.field}`, omitted.reason)
  }
}

// ───────────────────────────────────────────────────────────────
function printValidatorSelfCheck() {
  console.log('')
  rule('━')
  console.log('검증기 자체 점검 — 앞의 셋은 막혀야 하고, 마지막 하나는 통과해야 한다')
  rule('━')

  const passing =
    '1917년에 지어졌고, 최근 점검은 9개월 전인 2025년 11월, 마지막 보수는 2016년 5월입니다.'

  const cases = [
    { text: '안전등급 B등급이라 건너도 괜찮습니다.', allowedNumbers: [] },
    { text: '1917년에 지어졌고 하루 12만대가 지납니다.', allowedNumbers: [1917] },
    { text: `1917년에 지어졌고, ${'아'.repeat(55)}.`, allowedNumbers: [1917] },
    { text: passing, allowedNumbers: [1917, 9, 2025, 11, 2016, 5] },
  ]

  console.log('')
  for (const testCase of cases) {
    const result = validateSummary(testCase.text, { allowedNumbers: testCase.allowedNumbers })
    const preview =
      Array.from(testCase.text).slice(0, 34).join('') +
      (countCharacters(testCase.text) > 34 ? '…' : '')
    console.log(`  ${result.ok ? '통과' : '차단'}  "${preview}"`)
    for (const failure of result.failures) console.log(`        ↳ ${failure.check}: ${failure.detail}`)
  }
}

// ───────────────────────────────────────────────────────────────
async function loadItems(useDb) {
  if (!useDb) return FIXTURES

  const { hasServerSupabaseEnv, createServerSupabaseClient } = await import(
    '../src/lib/supabase/serverClient.js'
  )
  if (!hasServerSupabaseEnv()) {
    throw new Error(
      '--db 를 쓰려면 SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다. ' +
        '(.env.local 은 git 에 올라가지 않습니다)',
    )
  }
  const { loadSummaryInputs } = await import('../src/lib/summary/summariesRepo.js')
  const items = await loadSummaryInputs(createServerSupabaseClient(), { limit: 3 })
  return items.map((item) => ({ ...item, note: 'Supabase 원본' }))
}

async function main() {
  const args = process.argv.slice(2)
  const useDb = args.includes('--db')
  const dateArg = args.find((a) => a.startsWith('--date='))?.slice('--date='.length)
  const referenceDate = toReferenceDate(dateArg ?? new Date())

  console.log('')
  console.log('BRIDGE SAFE — 자동 요약 확인')
  console.log(`기준일 ${referenceDate}   원본 ${useDb ? 'Supabase' : '표본값(실제 데이터 아님)'}`)
  console.log(
    `안전등급 정의 표시 : ${
      isSafetyGradeDefinitionPublishable()
        ? '표시 가능'
        : '표시 안 함 (PRD §13 Q4 미해소 — 법령 원문 출처·대조 날짜 미확인)'
    }`,
  )

  const items = await loadItems(useDb)
  const repo = createInMemorySummariesRepo()

  // 1회차 — 새로 만든다
  const report = await refreshSummaries(items, { repo, referenceDate })
  items.forEach((item, index) => printItem(index, item, report[index]))

  // 2회차 — 원본이 그대로면 다시 만들지 않는지 확인한다
  const second = await refreshSummaries(items, { repo, referenceDate })

  console.log('')
  rule('━')
  console.log('재생성 판단 — 같은 원본으로 한 번 더 돌렸을 때')
  rule('━')
  console.log('')
  for (const [index, result] of second.entries()) {
    row(
      `  ${items[index].bridge?.name ?? result.bridgeId}`,
      result.outcome === 'unchanged' ? 'unchanged (재생성 안 함)' : `${result.outcome} ← 재생성함`,
    )
  }

  printValidatorSelfCheck()

  const tally = report.reduce((acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] ?? 0) + 1 }), {})
  console.log('')
  rule()
  console.log(
    `합계 ${report.length}곳 — ` +
      Object.entries(tally)
        .map(([key, value]) => `${key} ${value}`)
        .join(' / '),
  )
  console.log('요약이 없는 것이 잘못된 요약보다 낫다 — null 은 실패가 아니라 설계된 결과다.')
  console.log('')
}

main().catch((error) => {
  console.error(`\n실패: ${error.message}\n`)
  process.exitCode = 1
})
