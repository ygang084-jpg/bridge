import { timingSafeEqual } from 'node:crypto'
import { refreshNews } from '@/lib/news/refreshNews.js'
import { hasNaverNewsEnv } from '@/lib/news/naverNews.js'

/**
 * 스케줄러가 부르는 교량 뉴스 수집 라우트.
 * ---------------------------------------------------------------------------
 * 사용자 요청에서는 절대 부르지 않는다. 화면은 bridge_news 에 저장된 것만 읽는다
 * — 요청마다 네이버를 부르면 응답 속도를 통제할 수 없고(§11 3초) 일일 호출
 * 한도가 트래픽에 묶인다.
 *
 * 보호는 요약 갱신 라우트와 같다. CRON_SECRET 이 없으면 아예 동작하지 않는다
 * (fail closed) — 열린 채로 배포되면 공개 URL 하나로 남이 함수 실행량과
 * 네이버 호출 한도를 소진시킬 수 있다.
 * ---------------------------------------------------------------------------
 */

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

  // 키가 없으면 실패로 알린다. 200 으로 조용히 지나가면 목록이 왜 비어 있는지
  // 배포 후에 알 수 없다.
  if (!hasNaverNewsEnv()) {
    return Response.json(
      {
        ok: false,
        error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았습니다.',
      },
      { status: 503 },
    )
  }

  const startedAt = Date.now()
  const lines = []

  try {
    const report = await refreshNews({ logger: (message) => lines.push(message) })

    return Response.json({
      ok: report.failures.length === 0,
      elapsedMs: Date.now() - startedAt,
      ...report,
      log: lines,
    })
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message, elapsedMs: Date.now() - startedAt, log: lines },
      { status: 500 },
    )
  }
}
