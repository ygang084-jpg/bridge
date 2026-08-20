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
const BRIDGE_COLUMNS_FOR_SUMMARY = 'id, name, completed_year, source, fetched_at'

/** 한 번에 훑는 교량 수. 요약이 이미 있는 곳을 건너뛰며 앞으로 나아간다. */
const SCAN_PAGE = 500

/**
 * 요약이 아직 없는 교량을 이름 순으로 limit 만큼 고른다.
 *
 * 예전에는 이름 순 앞 limit 곳을 그냥 집었다. 교량이 몇 곳일 때는 같은 결과였지만,
 * 781곳이 들어온 뒤로는 몇 번을 돌려도 같은 앞쪽 100곳만 다시 처리하고 나머지는
 * 영원히 요약이 생기지 않았다. 스케줄러가 매일 도는데 진도가 나가지 않는 것은
 * '조용히 아무것도 안 하는' 고장이라 찾기 어렵다.
 *
 * 그래서 이미 요약이 있는 bridge_id 를 먼저 읽어 두고, 없는 것만 담는다.
 * 교량 전체를 한 번에 읽지 않고 페이지로 훑어서 규모가 커져도 견디게 둔다.
 */
async function selectPendingBridges(client, limit) {
  const { data: existing, error: existingError } = await client
    .from('bridge_summaries')
    .select('bridge_id')
    .limit(100_000)

  if (existingError) throw new Error(`bridge_summaries 조회 실패: ${existingError.message}`)
  const done = new Set((existing ?? []).map((row) => row.bridge_id))

  const picked = []
  for (let offset = 0; picked.length < limit; offset += SCAN_PAGE) {
    const { data, error } = await client
      .from('bridges')
      .select(BRIDGE_COLUMNS_FOR_SUMMARY)
      .order('name', { ascending: true })
      .range(offset, offset + SCAN_PAGE - 1)

    if (error) throw new Error(`bridges 조회 실패: ${error.message}`)
    if (!data || data.length === 0) break

    for (const bridge of data) {
      if (done.has(bridge.id)) continue
      picked.push(bridge)
      if (picked.length >= limit) break
    }

    if (data.length < SCAN_PAGE) break
  }

  return picked
}

export async function loadSummaryInputs(
  client,
  { bridgeIds = null, limit = 100, onlyMissing = true } = {},
) {
  let bridges
  if (bridgeIds?.length) {
    const { data, error } = await client
      .from('bridges')
      .select(BRIDGE_COLUMNS_FOR_SUMMARY)
      .in('id', bridgeIds)
      .order('name', { ascending: true })
      .limit(limit)
    if (error) throw new Error(`bridges 조회 실패: ${error.message}`)
    bridges = data
  } else if (onlyMissing) {
    bridges = await selectPendingBridges(client, limit)
  } else {
    const { data, error } = await client
      .from('bridges')
      .select(BRIDGE_COLUMNS_FOR_SUMMARY)
      .order('name', { ascending: true })
      .limit(limit)
    if (error) throw new Error(`bridges 조회 실패: ${error.message}`)
    bridges = data
  }

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
