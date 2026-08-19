/**
 * bridge_summaries 읽기·쓰기, 그리고 요약 생성에 필요한 원본 읽기.
 * 컬럼은 PRD §9 정의를 따른다 — bridge_history 는 v0.4에서 통합된 테이블이다.
 */

const TABLE = 'bridge_summaries'

export function createSupabaseSummariesRepo(client) {
  return {
    async getByBridgeId(bridgeId) {
      const { data, error } = await client
        .from(TABLE)
        .select('id, bridge_id, summary_text, based_on, generated_at')
        .eq('bridge_id', bridgeId)
        .maybeSingle()

      if (error) throw new Error(`${TABLE} 조회 실패 (${bridgeId}): ${error.message}`)
      return data ?? null
    },

    async upsert(row) {
      // bridges : bridge_summaries 는 1:1 이므로 bridge_id 유니크 제약으로 갈아탄다.
      const { error } = await client.from(TABLE).upsert(row, { onConflict: 'bridge_id' })
      if (error) throw new Error(`${TABLE} 저장 실패 (${row.bridge_id}): ${error.message}`)
    },
  }
}

export const HISTORY_COLUMNS =
  'id, bridge_id, occurred_on, event_type, description, safety_grade, source, data_as_of'

/**
 * 요약 생성에 필요한 원본을 읽어온다.
 *
 * 이력은 최신 1건만 쓰는 것이 아니라 전부 읽는다 — F-03이 제품의 중심이 되면서
 * '마지막 점검'과 '마지막 보수'를 각각 골라야 하기 때문이다.
 */
export async function loadSummaryInputs(client, { bridgeIds = null, limit = 100 } = {}) {
  let bridgeQuery = client
    .from('bridges')
    .select('id, name, completed_year, source, fetched_at')
    .order('name', { ascending: true })
    .limit(limit)

  if (bridgeIds?.length) bridgeQuery = bridgeQuery.in('id', bridgeIds)

  const { data: bridges, error: bridgeError } = await bridgeQuery
  if (bridgeError) throw new Error(`bridges 조회 실패: ${bridgeError.message}`)

  const ids = (bridges ?? []).map((bridge) => bridge.id)
  if (ids.length === 0) return []

  // 교량 수만큼 쿼리를 날리지 않고 한 번에 읽는다. 무료 티어에서 왕복 수를 줄이는 편이 낫다.
  const { data: history, error: historyError } = await client
    .from('bridge_history')
    .select(HISTORY_COLUMNS)
    .in('bridge_id', ids)
    .order('occurred_on', { ascending: false })

  if (historyError) throw new Error(`bridge_history 조회 실패: ${historyError.message}`)

  const byBridge = new Map(ids.map((id) => [id, []]))
  for (const row of history ?? []) byBridge.get(row.bridge_id)?.push(row)

  return (bridges ?? []).map((bridge) => ({
    bridgeId: bridge.id,
    bridge,
    history: byBridge.get(bridge.id) ?? [],
  }))
}
