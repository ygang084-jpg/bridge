import Link from 'next/link'
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
    // 이유는 서버 로그에도 남긴다. 화면 문구는 '읽지 못했다'까지만 말하므로,
    // 프로덕션에서 접속 설정이 틀렸을 때 무엇이 틀렸는지 알 방법이 없었다
    // (sitemap.js 가 같은 이유로 console.warn 을 남긴다).
    console.error(`[bridges] 목록 조회 실패: ${error.message}`)
    loadError = error.message
    available = false
  }

  return (
    <>
      <ScreenHeader title="내 주변 교량" backHref="/dashboard" />
      <main className="flex-1 px-4 py-5">
        {/* 담아 둔 범위를 목록 위에 적는다. '총 781곳'만 보이면 전국 목록으로
            읽히고, 서울 밖에 계신 분에게는 '내 주변에 교량이 없다'가 된다 —
            정보가 없는 것을 없는 것으로 바꿔 읽히게 하지 않는다 (F-05). */}
        {available && bridges.length > 0 && (
          <p className="mb-4 rounded-lg bg-surface-container-low px-3 py-2 text-[13px] leading-[18px] text-on-surface-variant">
            지금 담아 둔 범위는 <strong className="font-semibold">서울특별시</strong> 입니다. 다른
            지역 교량은 공개 데이터에 있지만 아직 옮겨 오지 않았습니다 —{' '}
            <Link href="/info" className="font-medium text-accent underline">
              앱안내
            </Link>
          </p>
        )}
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
            backHref="/dashboard"
            backLabel="대시보드로"
          />
        )}
      </main>
    </>
  )
}
