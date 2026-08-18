import ScreenHeader from '@/components/ScreenHeader'
import EmptyNotice from '@/components/EmptyNotice'
import { fetchBridgesForList } from '@/lib/supabase/readClient'
import { resolveInfoState } from '@/lib/infoState'
import BridgeList from './BridgeList'

export const metadata = { title: '교량 목록 — BRIDGE SAFE' }

/**
 * F-01 목록 화면 (서버 컴포넌트).
 *
 * 정보 상태는 서버에서 계산해 라벨만 내려보낸다. 이력 원본을 브라우저까지
 * 들고 갈 필요가 없고, 계산 규칙(F-05)이 한 곳에만 있게 된다.
 */
export default async function BridgeListPage({ searchParams }) {
  const params = await searchParams
  const mode = params?.mode === 'search' ? 'search' : 'nearby'

  let bridges = []
  let available = true
  let loadError = null

  try {
    const result = await fetchBridgesForList()
    available = result.available
    bridges = result.bridges.map((bridge) => {
      const info = resolveInfoState(bridge.history)
      return {
        id: bridge.id,
        name: bridge.name,
        address: bridge.address ?? null,
        lat: bridge.lat,
        lng: bridge.lng,
        infoState: info.state,
        infoLabel: info.label,
      }
    })
  } catch (error) {
    // PRD §11 장애 대응 — 화면을 비우지 않는다.
    loadError = error.message
    available = false
  }

  return (
    <>
      <ScreenHeader title="내 주변 교량" backHref="/" />
      <main className="flex-1 px-4 py-5">
        {available ? (
          <BridgeList bridges={bridges} initialMode={mode} />
        ) : (
          <EmptyNotice
            headline="교량 목록을 불러오지 못했습니다."
            note={
              loadError
                ? '잠시 후 다시 시도해 주세요. 목록이 비어 있는 것은 교량이 없다는 뜻이 아니라, 지금 데이터를 읽지 못했다는 뜻입니다.'
                : '데이터베이스 연결이 아직 설정되지 않았습니다. .env.local 에 SUPABASE_URL 과 SUPABASE_ANON_KEY 를 채워 주세요.'
            }
            backHref="/"
            backLabel="처음으로"
          />
        )}
      </main>
    </>
  )
}
