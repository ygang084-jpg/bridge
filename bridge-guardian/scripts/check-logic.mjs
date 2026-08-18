#!/usr/bin/env node
/**
 * F-03 타임라인 · F-05 정보 상태 로직 확인.
 *
 *   node scripts/check-logic.mjs
 *
 * 화면(React)은 이 스크립트로 확인할 수 없다. 대신 화면이 그대로 받아 쓰는
 * 계산 로직을 여기서 전부 돌려 본다 — 정렬 순서, 기록 사이 간격, 상태 3단계,
 * 마지막 점검·보수 선택, 읽을 수 없는 날짜 처리.
 */

import { buildTimeline, summarizeManagement } from '../src/lib/history.js'
import { describeInfoState, resolveInfoState, INFO_STATE } from '../src/lib/infoState.js'

const REFERENCE = '2026-08-18'

let failures = 0
const rule = (char = '─') => console.log(char.repeat(78))

function expect(label, actual, wanted) {
  const ok = JSON.stringify(actual) === JSON.stringify(wanted)
  if (!ok) failures += 1
  console.log(`  ${ok ? '통과' : '실패'}  ${label}`)
  if (!ok) {
    console.log(`        기대 ${JSON.stringify(wanted)}`)
    console.log(`        실제 ${JSON.stringify(actual)}`)
  }
}

const h = (occurred_on, event_type, extra = {}) => ({
  occurred_on,
  event_type,
  source: '표본 데이터',
  ...extra,
})

// ───────────────────────────────────────────────────────────────
const FIXTURES = [
  {
    name: '한강대교 (표본) — 이력 있음',
    history: [
      h('2025-11-03', '정기점검', { safety_grade: 'B' }),
      h('2021-09-14', '정밀안전진단', { safety_grade: 'B' }),
      h('2016-05-20', '보수', { description: '교면 방수 및 포장 보수' }),
      h('1917-10-07', '준공'),
    ],
  },
  {
    name: '마포대교 (표본) — 이력 부분',
    history: [h('2024-05-21', '정기점검', { safety_grade: 'C' }), h('1970-05-16', '준공')],
  },
  {
    name: '샛터소교 (표본) — 이력 없음',
    history: [],
  },
  {
    name: '날짜가 깨진 기록이 섞인 경우',
    history: [
      h('2025-11-03', '정기점검'),
      h('2025-13-40', '보수'), // 존재하지 않는 날짜
      h('2030-01-01', '정기점검'), // 기준일보다 미래
      h('1990-01-01', '준공'),
    ],
  },
]

console.log('')
console.log(`F-03 · F-05 로직 확인   기준일 ${REFERENCE}`)

for (const fixture of FIXTURES) {
  console.log('')
  rule('━')
  console.log(fixture.name)
  rule('━')

  const info = resolveInfoState(fixture.history)
  const described = describeInfoState(info.state, info.recordCount)
  const timeline = buildTimeline(fixture.history, { referenceDate: REFERENCE })
  const management = summarizeManagement(fixture.history, { referenceDate: REFERENCE })

  console.log(`  정보 상태     ${info.state} / ${info.label} / 준공 외 ${info.recordCount}건`)
  console.log(`  안내 문구     ${described.headline}`)
  if (described.note) console.log(`                ${described.note}`)
  console.log(`  마지막 점검   ${management.lastInspectionYearMonth ?? '(없음)'}`)
  console.log(`  마지막 보수   ${management.lastRepairYearMonth ?? '(없음)'}`)
  console.log(
    `  최근 기록 이후 ${timeline.sinceLatestText ?? '(계산 안 함)'}`,
  )
  console.log('  타임라인 (최신이 위)')
  for (const item of timeline.items) {
    console.log(`    ${item.yearMonth}  ${item.event_type}`)
    if (item.intervalToPreviousText) {
      console.log(`      ↕ 이 사이 ${item.intervalToPreviousText} 동안 공개된 기록 없음`)
    }
  }
  if (timeline.unreadable.length > 0) {
    console.log('  타임라인에 넣지 못한 기록')
    for (const row of timeline.unreadable) {
      console.log(`    ${row.event_type} — ${row.reason}`)
    }
  }
}

// ───────────────────────────────────────────────────────────────
console.log('')
rule('━')
console.log('단정 검사')
rule('━')

const full = FIXTURES[0].history
const fullInfo = resolveInfoState(full)
const fullTimeline = buildTimeline(full, { referenceDate: REFERENCE })

expect('준공은 이력 건수에서 빠진다 (4건 중 3건)', fullInfo.recordCount, 3)
expect('2건 이상이면 이력 있음', fullInfo.state, INFO_STATE.PRESENT)
expect('1건이면 이력 부분', resolveInfoState(FIXTURES[1].history).state, INFO_STATE.PARTIAL)
expect('0건이면 이력 없음', resolveInfoState([]).state, INFO_STATE.ABSENT)
expect(
  '최신이 위 (F-03 ①)',
  fullTimeline.items.map((item) => item.yearMonth),
  ['2025년 11월', '2021년 9월', '2016년 5월', '1917년 10월'],
)
expect(
  '기록 사이 간격 (F-03 ②)',
  fullTimeline.items.map((item) => item.intervalToPreviousText),
  ['4년 1개월', '5년 3개월', '98년 7개월', null],
)
expect('가장 오래된 항목은 간격이 null', fullTimeline.items.at(-1).intervalToPreviousText, null)
expect('최근 기록 이후 경과', fullTimeline.sinceLatestText, '9개월')
expect(
  '마지막 점검은 정밀안전진단이 아니라 더 최근의 정기점검',
  summarizeManagement(full).lastInspectionYearMonth,
  '2025년 11월',
)
expect('마지막 보수', summarizeManagement(full).lastRepairYearMonth, '2016년 5월')
expect('보수 기록이 없으면 null', summarizeManagement(FIXTURES[1].history).lastRepair, null)

const broken = buildTimeline(FIXTURES[3].history, { referenceDate: REFERENCE })
expect('깨진 날짜와 미래 날짜는 타임라인에서 제외', broken.items.length, 2)
expect('제외된 기록은 버리지 않고 남긴다', broken.unreadable.length, 2)
expect(
  '미래 날짜가 마지막 점검으로 뽑히지 않는다 (타임라인과 같은 규칙)',
  summarizeManagement(FIXTURES[3].history, { referenceDate: REFERENCE })
    .lastInspectionYearMonth,
  '2025년 11월',
)
expect(
  '이력 없음 문구에 "관리하지 않았다"는 말이 없다 (F-05 ②)',
  /관리(하지|되지)\s*않/.test(describeInfoState(INFO_STATE.ABSENT).note),
  false,
)
expect(
  '이력 없음 문구에 "문제 없다"는 말이 없다 (F-05 ③)',
  /문제\s*(가|는)?\s*없|이상\s*없|안전/.test(describeInfoState(INFO_STATE.ABSENT).note),
  false,
)
expect(
  '이력 없음 문구가 "점검을 하지 않았다는 뜻이 아닙니다"를 반드시 포함',
  describeInfoState(INFO_STATE.ABSENT).note.includes('점검을 하지 않았다는 뜻이 아닙니다'),
  true,
)

console.log('')
rule()
console.log(failures === 0 ? '단정 전부 통과' : `실패 ${failures}건`)
console.log('')

if (failures > 0) process.exitCode = 1
