import BridgeCardGrid from '@/components/BridgeCardGrid'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { firstHistoryHref, loadBridgeCards } from '@/lib/bridges/cards.js'

export const metadata = { title: '내 교량 — BRIDGE SAFE' }

/**
 * '내 교량' 화면 — Stitch `bridge_safe_5` 구성을 옮긴 것.
 * ---------------------------------------------------------------------------
 * 지도 화면(/map)과 카드·데이터가 같다. 다른 점은 배경에 지도 레이어가 없고,
 * 헤더 문구가 '내가 건너는 다리'라는 관점이라는 것뿐이다.
 *
 * 담아 두는 기능(즐겨찾기)은 v1 이라, 지금 이 목록은 등록된 교량 전체다.
 * 카드 안에서 별을 비활성으로 두는 이유도 같다 (BridgeCardGrid 주석 참고).
 * ---------------------------------------------------------------------------
 */
export default async function MyBridgesPage() {
  const { bridges, loadFailed } = await loadBridgeCards()
  const historyHref = firstHistoryHref(bridges)

  return (
    <>
      <TopNav active="bridges" historyHref={historyHref} />

      <main className="dashboard-wide relative z-10 flex w-full flex-1 flex-col px-margin-mobile py-xl md:px-margin-desktop xl:px-32">
        <div className="mb-xl w-full text-center md:text-left">
          <h1 className="mb-4 text-[24px] leading-8 font-semibold text-primary md:text-headline-lg">
            내가 건너는 다리들이 어떻게 관리되어 왔는지 확인하세요.
          </h1>
          {/* 디자인 문구는 '실시간 센서 데이터와 기상 정보를 바탕으로 …
              건강 상태를 모니터링합니다'였다. 센서도 모니터링도 없다. */}
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            공개된 점검·보수 기록을 옮겨 보여드립니다. 저희가 상태를 측정하거나 판정하지는
            않습니다.
          </p>
        </div>

        <div className="mb-xl">
          <BridgeCardGrid bridges={bridges} loadFailed={loadFailed} />
        </div>
      </main>

      <BottomNav active="bridges" historyHref={historyHref} />
      <AppFooter />
    </>
  )
}
