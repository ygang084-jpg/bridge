import BridgeCardGrid from '@/components/BridgeCardGrid'
import { HealthCard, TimeMachineCard } from '@/components/BridgeHealth'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { loadBridgeCards } from '@/lib/bridges/cards.js'
import { fetchBridgeDetail } from '@/lib/supabase/readClient'
import { buildTimeline, summarizeManagement } from '@/lib/history'

export const metadata = { title: '내 교량 — BRIDGE SAFE' }

/** 한 시간마다 다시 만든다 — 이유는 dashboard/page.jsx 의 같은 상수에 적었다. */
export const revalidate = 3600

/**
 * '내 교량' 화면 — Stitch `bridge_safe_5` 구성을 옮긴 것.
 * ---------------------------------------------------------------------------
 * 교량 카드 목록 아래에 교량 건강검진과 교량 타임머신이 붙는다. 두 카드는
 * 대시보드에 있었는데, 둘 다 특정 교량 하나를 다루는 내용이어서 교량을 고르는
 * 이 화면 쪽이 제자리다.
 *
 * 어느 교량을 보여줄지 고르는 기준은 공개 기록 건수뿐이다. 좋다/나쁘다를
 * 판정하는 규칙을 쓰면 그 순간 우리가 평가하는 것이 된다.
 *
 * 담아 두는 기능(즐겨찾기)은 v1 이라, 지금 이 목록은 등록된 교량 전체다.
 * 카드 안에서 별을 비활성으로 두는 이유도 같다 (BridgeCardGrid 주석 참고).
 * ---------------------------------------------------------------------------
 */
export default async function MyBridgesPage() {
  const { bridges, loadFailed } = await loadBridgeCards()
  const featured = await loadFeatured(bridges)

  return (
    <>
      <TopNav active="bridges" />

      <main className="screen-wide relative z-10 flex w-full flex-1 flex-col gap-xl px-margin-mobile py-xl md:px-margin-desktop">
        <div className="w-full text-center md:text-left">
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

        <BridgeCardGrid bridges={bridges} loadFailed={loadFailed} />

        {featured && (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <HealthCard featured={featured} />
            <TimeMachineCard featured={featured} />
          </div>
        )}
      </main>

      <BottomNav active="bridges" />
      <AppFooter />
    </>
  )
}

/**
 * 건강검진·타임머신이 쓰는 교량 하나. 공개 기록이 가장 많은 교량을 고른다.
 *
 * 기록이 있는 교량이 없으면 null 을 준다 — 빈 카드 두 개를 띄우는 것보다
 * 섹션 자체를 내지 않는 편이 낫다.
 */
async function loadFeatured(bridges) {
  const top = bridges.find((bridge) => bridge.recordCount > 0)
  if (!top) return null

  const detail = await fetchBridgeDetail(top.id).catch(() => null)
  if (!detail) return null

  const management = summarizeManagement(detail.history)

  return {
    id: detail.bridge.id,
    name: detail.bridge.name,
    completedYear: detail.bridge.completed_year ?? null,
    grade: top.grade,
    lastInspectionYearMonth: management.lastInspectionYearMonth,
    lastRepairYearMonth: management.lastRepairYearMonth,
    timeline: buildTimeline(detail.history),
  }
}
