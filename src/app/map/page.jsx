import Icon from '@/components/Icon'
import MapExplorer from '@/components/MapExplorer'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { fetchBridgeDetail, fetchBridgesForList } from '@/lib/supabase/readClient'
import { resolveInfoState } from '@/lib/infoState'
import { buildTimeline } from '@/lib/history'

export const metadata = { title: '교량 지도 — BRIDGE SAFE' }

/**
 * 교량 지도 — Stitch '교량 지도' + '교량 상세 정보' 구성을 옮긴 것.
 * 대시보드의 지도 영역이나 내비의 '지도'를 누르면 이 화면으로 온다.
 * ---------------------------------------------------------------------------
 * 화면 구성은 MapExplorer 가 맡는다 (사이드바 검색·지역 필터·목록 + 마커 캔버스 +
 * 마커를 고르면 뜨는 상세 패널). 붙여주신 세 파일 — 지도 / 검색 결과가 열린 지도 /
 * 상세 정보 — 은 그 한 화면의 세 상태다.
 *
 * 이 파일은 값만 읽어 넘긴다. 걸러 내기와 선택은 브라우저에서 한다 — 검색어를
 * 서버로 보내면 DB 에 저장하지 않아도 접근 로그에 남는다 (PRD §15.7 과 같은 이유).
 *
 * ⚠ 붙여주신 지도 파일 두 개의 config 는 primary(#1a2b4b)·primary-container
 *   (#d8e2ff)가 theme.css(#031635 · #1a2b4b)와 달랐다. 상세 파일과 이전 다섯
 *   파일은 theme.css 와 같아서 팔레트를 바꾸지 않았다.
 * ---------------------------------------------------------------------------
 */
export default async function MapPage() {
  const { bridges, historyHref } = await loadBridgesForMap()

  return (
    <>
      <TopNav active="map" historyHref={historyHref} />

      <main className="screen-wide relative z-10 flex w-full flex-1 flex-col px-margin-mobile py-lg md:px-margin-desktop">
        <div className="mb-md w-full">
          <h1 className="mb-2 text-[24px] leading-8 font-semibold text-primary md:text-headline-lg">
            교량 지도
          </h1>
          <p className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
            <Icon name="info" size={18} className="mt-1" />
            <span>
              공개된 점검·보수 기록을 옮겨 보여드립니다. 저희가 상태를 측정하거나 판정하지는
              않습니다. 지도와 타일은 카카오맵에서 옵니다 — 지도를 띄우지 못하면 마커의 상대
              위치만 표시하고 그 사실을 화면에 적습니다.
            </span>
          </p>
        </div>

        <MapExplorer bridges={bridges} />
      </main>

      <BottomNav active="map" historyHref={historyHref} />
      <AppFooter />
    </>
  )
}

/**
 * 지도·목록·상세에 필요한 값을 한 번에 읽는다.
 *
 * 교량마다 이력 원본을 따로 조회한다 — 상세 패널의 연혁이 필요하기 때문이다.
 * 표본 3건에서는 문제가 없지만, 실제 데이터가 들어오면 목록 조회에 이력 컬럼을
 * 함께 실어 한 번에 받아야 한다.
 */
async function loadBridgesForMap() {
  let list
  try {
    list = await fetchBridgesForList()
  } catch {
    return { bridges: [], historyHref: null }
  }
  if (!list.available) return { bridges: [], historyHref: null }

  const bridges = await Promise.all(
    list.bridges.map(async (bridge) => {
      const info = resolveInfoState(bridge.history)
      const detail = await fetchBridgeDetail(bridge.id).catch(() => null)
      const timeline = buildTimeline(detail?.history ?? [])

      return {
        id: bridge.id,
        name: bridge.name,
        address: bridge.address ?? null,
        lat: typeof bridge.lat === 'number' ? bridge.lat : null,
        lng: typeof bridge.lng === 'number' ? bridge.lng : null,
        completedYear: bridge.completed_year ?? null,
        facilityType: bridge.facility_type ?? null,
        facilityClass: bridge.facility_class ?? null,
        infoState: info.state,
        infoLabel: info.label,
        recordCount: info.recordCount,
        // 클라이언트로 넘기는 값은 화면에 쓰는 것만 남긴다.
        timeline: timeline.items.map((item) => ({
          id: item.id ?? null,
          date: formatDate(item.occurred_on),
          occurredOn: item.occurred_on ?? null,
          eventType: item.event_type ?? '기타',
          description: item.description ?? null,
          source: item.source ?? null,
          dataAsOf: item.data_as_of ? formatDate(item.data_as_of) : null,
          isCompletion: Boolean(item.isCompletion),
        })),
      }
    }),
  )

  const withRecords = bridges.find((bridge) => bridge.recordCount > 0)

  return {
    bridges,
    historyHref: withRecords ? `/bridges/${withRecords.id}/history` : null,
  }
}

/** 'YYYY-MM-DD' → '2025.11.28'. 형식을 못 읽으면 원문 그대로 둔다. */
function formatDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : String(value)
}
