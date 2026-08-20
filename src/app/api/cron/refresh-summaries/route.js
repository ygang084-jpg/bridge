import { runSummaryRefreshJob } from '@/lib/summary/job'

/**
 * 스케줄러가 부르는 요약 갱신 라우트.
 * ---------------------------------------------------------------------------
 * 사용자 요청(교량 상세 조회)에서는 절대 부르지 않는다. 상세 화면은
 * bridge_summaries 에 저장된 문장만 읽는다 — PRD §11 성능 요구가 이 구조에 달려 있다.
 *
 * ⚠ 이 라우트는 원본(bridges / bridge_history)을 갱신하지 않는다.
 *   공공데이터 연동이 아직 없기 때문이다 (§13 Q2). 원본 갱신 라우트가 생기면
 *   그것을 먼저 돌리고 이 라우트를 이어서 부른다.
 *
 * 보호 : Vercel Cron 은 CRON_SECRET 을 Authorization 헤더로 붙여 보낸다.
 *
 *   · 토큰이 설정되지 않았으면 아예 동작하지 않는다 (503).
 *     '설정 안 됨 = 누구나 호출 가능'으로 두면, 환경변수를 잊은 순간
 *     공개 URL 하나로 남이 무료 티어 함수 실행량과 DB 쓰기를 소진시킬 수 있다.
 *     열려 있는 편보다 멈춰 있는 편이 낫다.
 *   · 토큰 비교는 길이가 새지 않도록 상수 시간으로 한다.
 * ---------------------------------------------------------------------------
 */

import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 상수 시간 문자열 비교. 길이가 다르면 즉시 false. */
function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET?.trim()

  // 열린 상태로 배포되는 것을 막는다 (fail closed).
  if (!secret) {
    return Response.json(
      { ok: false, error: 'CRON_SECRET 이 설정되지 않아 실행하지 않았습니다.' },
      { status: 503 },
    )
  }

  const provided = request.headers.get('authorization') ?? ''
  if (!safeEqual(provided, `Bearer ${secret}`)) {
    return Response.json({ ok: false, error: '인증 실패' }, { status: 401 })
  }

  const startedAt = Date.now()
  const lines = []

  try {
    const report = await runSummaryRefreshJob({
      logger: (message) => lines.push(message),
    })

    const tally = report.reduce((acc, row) => {
      acc[row.outcome] = (acc[row.outcome] ?? 0) + 1
      return acc
    }, {})

    // 보고를 응답으로만 돌려주면 스케줄러가 부를 때는 아무도 읽지 않는다.
    // 버셀 크론은 응답 본문을 버리므로, 781곳 중 34곳만 생성된 이유를 알 수
    // 없었다 (refresh-news 도 같은 문제였다).
    for (const line of lines) console.log(`[summary] ${line}`)
    console.log(
      `[summary] 완료 — 대상 ${report.length}곳 · ` +
        `${Object.entries(tally).map(([key, value]) => `${key} ${value}`).join(' / ')} · ` +
        `${Date.now() - startedAt}ms`,
    )

    return Response.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      total: report.length,
      tally,
      log: lines,
    })
  } catch (error) {
    // 실패도 200 이 아니라 500 으로 낸다 — Vercel Cron 로그에서 구분되어야 한다.
    return Response.json(
      { ok: false, error: error.message, elapsedMs: Date.now() - startedAt, log: lines },
      { status: 500 },
    )
  }
}
