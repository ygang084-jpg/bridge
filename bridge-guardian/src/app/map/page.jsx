import Icon from '@/components/Icon'
import BridgeCardGrid from '@/components/BridgeCardGrid'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { firstHistoryHref, loadBridgeCards } from '@/lib/bridges/cards.js'

export const metadata = { title: '지도 — BRIDGE SAFE' }

/**
 * 지도 화면 — Stitch `bridge_safe_5` 구성을 옮긴 것.
 * 대시보드의 지도 영역을 누르면 이 화면으로 들어온다.
 * ---------------------------------------------------------------------------
 * 디자인을 따른 것 : 화면 전체를 덮는 고정 지도 배경 레이어 + 그 위에 뜨는
 *   반투명 카드(bg-surface/90 + backdrop-blur), 상단 내비, 페이지 헤더,
 *   1→2→3열 카드 그리드, 하단 탭바, 푸터.
 *
 * 지도 자체는 아직 없다. 두 가지 이유가 겹친다 :
 *   · PRD §4 에서 지도 렌더링을 v0 범위 밖(Out)으로 두고 목록으로 대체했다
 *   · 디자인 파일의 배경은 외부(Google) 이미지 주소다. 그대로 쓰면 방문자
 *     요청이 제3자 도메인으로 나가고, 그 주소가 사라지면 배경도 사라진다.
 *     타일 서버를 붙이는 것도 같은 문제를 만든다 (Icon.jsx·layout.jsx 에 적어
 *     둔 이유와 같다)
 *
 * 그래서 배경은 외부 이미지 없이 CSS 로만 그린 격자로 두고, 지도가 아니라는
 * 것을 화면에 적는다. 실제 지도는 v1 에서 이 레이어를 갈아 끼우면 된다.
 *
 * 카드·데이터는 '내 교량' 화면과 같은 컴포넌트를 쓴다 (BridgeCardGrid).
 * ---------------------------------------------------------------------------
 */
export default async function MapPage() {
  const { bridges, loadFailed } = await loadBridgeCards()
  const historyHref = firstHistoryHref(bridges)

  return (
    <>
      {/* 고정 배경 레이어. globals.css 의 .map-canvas 가 격자를 그린다. */}
      <div className="map-canvas fixed inset-0 z-[-1]" aria-hidden="true" />

      <TopNav active="map" historyHref={historyHref} />

      <main className="dashboard-wide relative z-10 flex w-full flex-1 flex-col px-margin-mobile py-xl md:px-margin-desktop xl:px-32">
        <div className="mb-xl w-full text-center md:text-left">
          <h1 className="mb-4 text-[24px] leading-8 font-semibold text-primary md:text-headline-lg">
            지도에서 교량을 찾아보세요.
          </h1>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            공개된 점검·보수 기록을 옮겨 보여드립니다. 저희가 상태를 측정하거나 판정하지는
            않습니다.
          </p>

          {/* 지도가 없다는 사실을 화면에서 밝힌다. 배경 격자를 지도라고 착각하면
              핀이 없는 것을 '주변에 교량이 없다'로 읽을 수 있다. */}
          <p className="mt-4 inline-flex items-start gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-left text-sm leading-[22px] text-on-surface-variant">
            <Icon name="info" size={16} className="mt-0.5" />
            <span>
              배경은 지도가 아닙니다. 지도 렌더링은 v1 에서 도입합니다 — 지금은 아래 목록과 검색으로
              찾습니다.
            </span>
          </p>
        </div>

        <div className="mb-xl">
          <BridgeCardGrid bridges={bridges} loadFailed={loadFailed} />
        </div>
      </main>

      <BottomNav active="map" historyHref={historyHref} />
      <AppFooter />
    </>
  )
}
