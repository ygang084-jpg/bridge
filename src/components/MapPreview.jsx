'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import KakaoMap from './KakaoMap'

/**
 * 대시보드의 지도 자리 — 등록된 교량을 실제 위경도에 찍은 미리보기.
 * ---------------------------------------------------------------------------
 * 이 화면의 지도는 조작하지 않는다. 영역 전체가 `/map` 으로 가는 링크이고
 * (그 화면에 검색·지역 필터·상세 패널이 있다), 여기서는 "등록된 교량이 어디에
 * 있는지"만 보여준다. 그래서 KakaoMap 에 interactive={false} 로 넘겨 끌기·확대를
 * 끄고, 투명한 링크를 지도 위에 덮는다 — 마커를 눌러도 상세가 아니라 지도 화면으로
 * 간다. 미리보기에서 고른 마커가 다음 화면에서 풀려 있으면 고장으로 읽힌다.
 *
 * 키가 없거나 SDK 가 뜨지 않으면 이 자리가 원래 쓰던 회색 링크로 되돌린다.
 * 빈 사각형으로 남기면 '주변에 교량이 없다'로 읽힌다 — 지도를 못 띄운 것과
 * 교량이 없는 것은 다른 말이다.
 *
 * **찍을 교량이 없어도 지도는 띄운다.** 예전에는 좌표가 있는 교량이 0곳이면 회색
 * 링크로 되돌렸는데, 그러면 '지도를 못 띄웠다'와 '찍을 교량이 없다'가 같은 모양이
 * 되어 무엇이 없는 것인지 구별할 수 없었다. 지도는 그대로 두고 그 위에 찍을 곳이
 * 없다는 사실을 적는다 — 이때 '주변에 교량이 없다'로 읽히지 않게, 좌표가 아직
 * 없다는 뜻임을 함께 밝힌다.
 *
 * 좌표가 없는 교량은 여기 나타나지 않는다. 그래서 몇 곳을 찍었는지 적는다.
 * 지도에 3개가 보이는데 목록이 5건이면 두 곳이 사라진 것으로 읽힌다.
 * ---------------------------------------------------------------------------
 */
export default function MapPreview({ bridges = [], origin = null, badge = null }) {
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? ''
  const [mapError, setMapError] = useState(apiKey ? null : '지도 키가 설정되지 않았습니다')

  const handleUnavailable = useCallback((reason) => {
    setMapError(reason ?? '지도를 불러오지 못했습니다')
  }, [])

  const plotted = bridges.filter(
    (bridge) => Number.isFinite(bridge.lat) && Number.isFinite(bridge.lng),
  )

  // 되돌리는 경우는 지도를 띄울 수 없을 때뿐이다. 찍을 교량이 없는 것은
  // 지도가 고장난 것이 아니므로 지도를 그대로 띄운다.
  if (!apiKey || mapError) {
    return <MapAreaFallback reason={mapError} />
  }

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border border-outline-variant shadow-sm">
      <KakaoMap
        apiKey={apiKey}
        bridges={plotted}
        origin={origin}
        interactive={false}
        onUnavailable={handleUnavailable}
      />

      {/* 지도 위를 덮는 링크. 지도를 누른 사람은 지도를 쓰려는 사람이므로
          마커 하나가 아니라 지도 화면으로 보낸다. 배경은 투명하게 두어
          카카오 로고·축척이 가려지지 않게 한다. */}
      <Link
        href="/map"
        aria-label={`지도 화면으로 이동 (${badge ?? `교량 ${plotted.length}곳`} 표시)`}
        className="group absolute inset-0 z-10 block"
      >
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-surface-container-lowest/90 px-3 py-2 text-caption font-bold text-primary shadow-sm backdrop-blur-sm">
          <Icon name="map" size={14} />
          {badge ?? `교량 ${plotted.length}곳`}
        </span>

        {/* 마커가 하나도 없을 때. 지도만 덩그러니 두면 '이 지역에 교량이 없다'로
            읽히므로, 없는 것이 교량이 아니라 좌표라는 점을 적는다. */}
        {plotted.length === 0 && (
          <span className="absolute top-1/2 left-1/2 max-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-container-lowest/90 px-4 py-3 text-center text-caption leading-[18px] text-on-surface-variant shadow-sm backdrop-blur-sm">
            지도에 찍을 좌표가 아직 없습니다. 이 지역에 교량이 없다는 뜻이 아닙니다.
          </span>
        )}
        <span className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-caption font-bold text-on-primary shadow-md transition-transform group-hover:scale-[1.03]">
          지도 화면으로 이동
          <Icon name="chevron-right" size={16} />
        </span>
      </Link>
    </div>
  )
}

/**
 * 지도를 띄우지 못했을 때의 자리 — 카카오를 붙이기 전 이 화면이 쓰던 링크다.
 * 이유를 함께 적는다. 아무 말 없이 회색 사각형만 남기면 무엇이 고장인지 알 수 없다.
 */
function MapAreaFallback({ reason }) {
  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border border-outline-variant shadow-sm">
      <Link
        href="/map"
        aria-label="지도 화면으로 이동"
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-variant px-6 text-center text-on-surface-variant transition-colors hover:bg-surface-dim"
      >
        <Icon name="map" size={28} />
        <span className="flex items-center gap-1.5">
          지도 화면으로 이동
          <Icon name="chevron-right" size={16} />
        </span>
        <span className="text-sm">
          {reason
            ? `지금은 지도를 띄우지 못했습니다 — ${reason}.`
            : '지금은 지도를 띄우지 못했습니다.'}
        </span>
      </Link>
    </div>
  )
}
