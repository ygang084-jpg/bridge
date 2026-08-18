import { createServerSupabaseClient } from '../supabase/serverClient.js'
import { refreshSummaries } from './refreshSummaries.js'
import { createSupabaseSummariesRepo, loadSummaryInputs } from './summariesRepo.js'

/**
 * 스케줄러가 부르는 진입점.
 * ---------------------------------------------------------------------------
 * 부르는 자리는 딱 하나다 — 캐시 갱신 스케줄러가 bridges / bridge_inspections
 * 를 갱신한 직후. 사용자 요청(교량 상세 조회)에서는 절대 부르지 않는다.
 * 상세 화면은 bridge_summaries 에 이미 저장된 문장만 읽는다.
 *
 * Vercel Cron 라우트 예시 (Next.js 로 옮긴 뒤):
 *   // app/api/cron/refresh/route.js
 *   await refreshBridgeCache()            // 원본 갱신 (아직 구현 안 됨)
 *   const report = await runSummaryRefreshJob()
 * ---------------------------------------------------------------------------
 *
 * @param {{ bridgeIds?: string[], referenceDate?: string|Date, limit?: number,
 *           logger?: (msg: string) => void }} [options]
 */
export async function runSummaryRefreshJob(options = {}) {
  const { bridgeIds = null, referenceDate, limit = 100, logger = console.log } = options

  const client = createServerSupabaseClient()
  const items = await loadSummaryInputs(client, { bridgeIds, limit })
  logger(`[summary] 대상 교량 ${items.length}곳`)

  const report = await refreshSummaries(items, {
    repo: createSupabaseSummariesRepo(client),
    referenceDate,
    logger,
  })

  const tally = report.reduce((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] ?? 0) + 1
    return acc
  }, {})
  logger(`[summary] 완료 — ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(' / ')}`)

  return report
}
