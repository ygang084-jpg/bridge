import { createServerSupabaseClient } from '../supabase/serverClient.js'
import { DEFAULT_QUERIES, dedupeByUrl, searchNaverNews } from './naverNews.js'

/**
 * 교량 뉴스 수집 — 스케줄러가 부른다.
 * ---------------------------------------------------------------------------
 * 검색 → 정규화 → 중복 제거 → bridge_news 에 upsert.
 *
 * url 을 유일 키로 두고 upsert 하므로, 같은 기사가 여러 검색어에 걸려도 한 번만
 * 남는다. 기사 내용은 발행 후에도 수정되므로 제목·설명은 최신으로 덮어쓴다.
 *
 * 실패를 삼키지 않는다 — 검색어 하나가 실패해도 나머지는 저장하고, 무엇이
 * 실패했는지 보고에 남긴다. 조용히 빈 목록이 되는 편이 더 나쁘다.
 * ---------------------------------------------------------------------------
 */

/** 한 번에 담아 둘 최대 건수. 이보다 오래된 것은 지운다. */
export const KEEP_LIMIT = 60

export async function refreshNews({
  queries = DEFAULT_QUERIES,
  displayPerQuery = 20,
  logger = () => {},
  client = null,
  // 확인 스크립트에서 네이버 호출과 DB 를 가짜로 바꿔 끼우기 위한 구멍이다.
  // 실제 실행에서는 둘 다 넘기지 않는다.
  fetchImpl = undefined,
} = {}) {
  const supabase = client ?? createServerSupabaseClient()

  const collected = []
  const failures = []

  for (const query of queries) {
    try {
      const items = await searchNaverNews({ query, display: displayPerQuery, fetchImpl })
      logger(`검색 "${query}" — ${items.length}건`)
      collected.push(...items)
    } catch (error) {
      logger(`검색 "${query}" 실패 — ${error.message}`)
      failures.push({ query, error: error.message })
    }
  }

  const unique = dedupeByUrl(collected)
  logger(`중복 제거 후 ${unique.length}건`)

  if (unique.length === 0) {
    return { saved: 0, unique: 0, deleted: 0, failures }
  }

  const { error: upsertError } = await supabase
    .from('bridge_news')
    .upsert(unique, { onConflict: 'url' })

  if (upsertError) throw new Error(`bridge_news 저장 실패: ${upsertError.message}`)
  logger(`저장 ${unique.length}건`)

  const deleted = await trimOldRows(supabase, logger)

  return { saved: unique.length, unique: unique.length, deleted, failures }
}

/**
 * KEEP_LIMIT 을 넘는 오래된 행을 지운다.
 *
 * 지우지 않으면 캐시가 계속 자라고, 화면에는 최신 몇 건만 쓰는데 무료 티어
 * 용량을 뉴스가 먹는다. 발행 시각이 없는 행을 먼저 지운다 — 순서를 못 정하는
 * 항목이라 목록에서도 쓸 수 없다.
 */
async function trimOldRows(supabase, logger) {
  const { data, error } = await supabase
    .from('bridge_news')
    .select('id')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(KEEP_LIMIT, KEEP_LIMIT + 999)

  if (error) throw new Error(`bridge_news 정리 대상 조회 실패: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return 0

  const { error: deleteError } = await supabase.from('bridge_news').delete().in('id', ids)
  if (deleteError) throw new Error(`bridge_news 정리 실패: ${deleteError.message}`)

  logger(`오래된 ${ids.length}건 삭제 (보관 ${KEEP_LIMIT}건)`)
  return ids.length
}
