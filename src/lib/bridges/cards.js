import { fetchBridgeDetail, fetchBridgesForList } from '../supabase/readClient.js'
import { resolveInfoState } from '../infoState.js'
import { findLatestEvent, INSPECTION_EVENTS } from '../history.js'

/**
 * 교량 카드 목록 — 지도 화면과 '내 교량' 화면이 같은 값을 쓴다.
 *
 * 두 화면이 각자 조회하면 같은 교량이 화면마다 다르게 보일 수 있다(정렬·
 * 등급 계산이 갈리는 순간 그렇게 된다). 그래서 읽는 곳을 하나로 둔다.
 *
 * 질의 수는 교량 수만큼이다 — 등급과 점검일이 이력 원본에 있고 목록 조회는
 * 종류·날짜만 내려주기 때문이다. 표본 3건에서는 문제가 없지만, 실제 데이터가
 * 들어오면 목록 조회에 필요한 컬럼을 추가해 한 번에 받아야 한다.
 */
export async function loadBridgeCards() {
  let list
  try {
    list = await fetchBridgesForList()
  } catch {
    return { bridges: [], loadFailed: true }
  }
  if (!list.available) return { bridges: [], loadFailed: true }

  const bridges = await Promise.all(
    list.bridges.map(async (bridge) => {
      const info = resolveInfoState(bridge.history)
      const detail = await fetchBridgeDetail(bridge.id).catch(() => null)
      const history = detail?.history ?? []
      const lastInspection = findLatestEvent(history, INSPECTION_EVENTS)

      return {
        id: bridge.id,
        name: bridge.name,
        address: bridge.address ?? null,
        infoState: info.state,
        infoLabel: info.label,
        recordCount: info.recordCount,
        lastInspectionOn: lastInspection?.occurred_on ?? null,
      }
    }),
  )

  return { bridges, loadFailed: false }
}


