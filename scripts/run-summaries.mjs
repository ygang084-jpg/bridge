/**
 * 요약을 남은 것이 없을 때까지 생성한다.
 * ---------------------------------------------------------------------------
 * 크론은 한 번에 100곳만 처리하고 서버리스 60초에 묶여 있다. 서울 781곳을 채우려면
 * 여덟 번을 눌러야 하는데, 손으로 여덟 번 누르는 절차는 사람이 잊는다.
 *
 * 그래서 처음 채울 때는 여기서 돌린다 — 시간 제한이 없고, 남은 것이 0이 될 때까지
 * 반복한다. 그 뒤의 유지는 크론이 맡는다 (새로 들어온 교량만 남으므로 하루 100곳
 * 상한으로 충분하다).
 *
 * 실행 :  node scripts/run-summaries.mjs
 * 키    :  .env.local 의 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'

// runSummaryRefreshJob 은 process.env 에서 접속값을 읽는다. import 하기 전에 넣는다.
loadEnvLocal()

const { runSummaryRefreshJob } = await import('../src/lib/summary/job.js')

const BATCH = 200

let round = 0
let lastTotal = -1

for (;;) {
  round += 1
  const report = await runSummaryRefreshJob({ limit: BATCH, logger: () => {} })
  const tally = report.reduce((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] ?? 0) + 1
    return acc
  }, {})

  const summary = Object.entries(tally)
    .map(([key, value]) => `${key} ${value}`)
    .join(' / ')
  console.log(`${round}회 — 대상 ${report.length}곳 · ${summary || '없음'}`)

  if (report.length === 0) break
  // 대상이 있는데 저장도 정리도 되지 않으면 같은 것을 무한히 다시 잡는다.
  // 그 자리에서 멈춘다 — 조용히 도는 것보다 낫다.
  if (report.length === lastTotal && !tally.saved && !tally.cleared) {
    console.log('진도가 나가지 않아 멈춥니다. 로그를 확인해 주세요.')
    break
  }
  lastTotal = report.length
}

console.log('끝났습니다.')

function loadEnvLocal() {
  let text
  try {
    text = readFileSync('.env.local', 'utf8')
  } catch {
    console.log('.env.local 을 읽지 못했습니다.')
    process.exit(1)
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    // 같은 이름이 여러 줄이면 뒤엣것이 이긴다 — 셸이 .env 를 읽는 방식과 같다.
    process.env[line.slice(0, eq)] = line.slice(eq + 1).trim()
  }

  const url = process.env.SUPABASE_URL ?? ''
  if (!url || url.includes('127.0.0.1') || url.includes('localhost')) {
    console.log(`SUPABASE_URL 이 실제 프로젝트 주소가 아닙니다 (${url || '없음'}).`)
    process.exit(1)
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('SUPABASE_SERVICE_ROLE_KEY 가 없습니다.')
    process.exit(1)
  }
}
