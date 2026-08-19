'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Script from 'next/script'

/**
 * 카카오 지도 — 교량 마커를 실제 위경도에 찍는다.
 * ---------------------------------------------------------------------------
 * 키에 대하여
 *
 * 여기 쓰는 것은 카카오 **JavaScript 키**다. 이 저장소의 다른 키(Supabase,
 * 네이버)와 성격이 다르다 — JS 키는 설계상 브라우저에 노출되며, 보호 장치는
 * 비밀이 아니라 카카오 개발자 콘솔에 등록한 **사이트 도메인**이다. 그래서
 * NEXT_PUBLIC_ 접두사를 붙인다. REST API 키를 여기 넣으면 안 된다.
 *
 * 외부 요청에 대하여
 *
 * 지도 타일은 카카오 서버에서 온다. 이 저장소는 그동안 방문자 요청이 제3자로
 * 나가지 않게 해 왔지만(폰트 자체 서빙·아이콘 인라인), 지도는 그 예외로 두기로
 * 했다. SDK 를 불러오는 곳은 이 컴포넌트 하나뿐이고, 이것을 쓰는 화면은 지도
 * (`MapExplorer`)와 대시보드의 지도 자리(`MapPreview`) 둘이다 — 대시보드에
 * 붙이면서 요청이 나가는 화면이 하나 늘었다. 그 밖으로는 번지지 않는다.
 *
 * 키가 없거나 SDK 가 뜨지 않을 때
 *
 * 지도가 빈 사각형으로 남지 않게 onUnavailable() 로 알린다. 부모(MapExplorer)가
 * 이전에 쓰던 격자 배경 + 상대 위치 마커로 되돌린다. 지도를 못 띄운 것이
 * '주변에 교량이 없다'로 읽히면 안 된다.
 * ---------------------------------------------------------------------------
 */

const SDK_TIMEOUT_MS = 6000

export default function KakaoMap({
  apiKey,
  bridges = [],
  selectedId = null,
  onSelect,
  onUnavailable,
  interactive = true,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [ready, setReady] = useState(false)

  // 좌표가 없는 교량은 지도에 찍을 수 없다. memo 로 두어 아래 effect 의
  // 의존성이 정적으로 검사되게 한다 (매 렌더 새 배열이면 마커를 계속 다시 그린다).
  const points = useMemo(
    () => bridges.filter((bridge) => Number.isFinite(bridge.lat) && Number.isFinite(bridge.lng)),
    [bridges],
  )

  /** SDK 가 실제로 준비됐을 때 지도를 만든다. */
  const initMap = useCallback(() => {
    const kakao = window.kakao
    if (!kakao?.maps || !containerRef.current || mapRef.current) return

    mapRef.current = new kakao.maps.Map(containerRef.current, {
      // 첫 중심은 아래 fitBounds 가 곧 덮어쓴다. 좌표가 하나도 없을 때를 위한 값.
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    })

    // 미리보기(대시보드)는 끌거나 확대하지 못하게 둔다. 영역 전체가 /map 으로
    // 가는 링크이므로, 끌린 지도는 링크를 누르려다 실패한 것으로 읽힌다.
    if (!interactive) {
      mapRef.current.setDraggable(false)
      mapRef.current.setZoomable(false)
    }

    setReady(true)
  }, [interactive])

  /** 스크립트가 이미 로드된 상태로 다시 마운트되는 경우(뒤로가기 등)를 처리한다. */
  useEffect(() => {
    if (window.kakao?.maps?.Map) {
      initMap()
      return
    }
    // SDK 가 끝내 오지 않으면 격자 배경으로 되돌린다. 잘못된 키·미등록 도메인은
    // 스크립트 자체는 200 으로 오고 그 뒤에 실패하는 경우가 있어 시간으로 잡는다.
    const timer = setTimeout(() => {
      if (!window.kakao?.maps?.Map) onUnavailable?.('SDK 로드 시간 초과')
    }, SDK_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [initMap, onUnavailable])

  /** 마커를 다시 그린다 — 검색·지역 필터로 목록이 바뀔 때마다. */
  useEffect(() => {
    if (!ready) return
    const kakao = window.kakao
    const map = mapRef.current

    for (const { marker, overlay } of markersRef.current) {
      marker.setMap(null)
      overlay.setMap(null)
    }
    markersRef.current = []

    if (points.length === 0) return

    const bounds = new kakao.maps.LatLngBounds()

    for (const bridge of points) {
      const position = new kakao.maps.LatLng(bridge.lat, bridge.lng)
      bounds.extend(position)

      const marker = new kakao.maps.Marker({ position, map, title: bridge.name })

      // 이름표. 선택된 것만 보이게 두고, 나머지는 마커만 찍는다 —
      // 표본이 늘어나면 이름표가 서로 겹쳐 읽을 수 없게 된다.
      const overlay = new kakao.maps.CustomOverlay({
        position,
        yAnchor: 2.1,
        content: `<div style="padding:2px 8px;border-radius:6px;border:1px solid #c5c6cf;background:#fff;color:#031635;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 1px 2px rgba(3,22,53,.15)">${escapeHtml(bridge.name)}</div>`,
      })

      kakao.maps.event.addListener(marker, 'click', () => onSelect?.(bridge.id))
      markersRef.current.push({ id: bridge.id, marker, overlay })
    }

    if (points.length === 1) {
      map.setCenter(new kakao.maps.LatLng(points[0].lat, points[0].lng))
      map.setLevel(5)
    } else {
      map.setBounds(bounds, 40, 40, 40, 40)
    }

    return () => {
      for (const { marker, overlay } of markersRef.current) {
        marker.setMap(null)
        overlay.setMap(null)
      }
      markersRef.current = []
    }
  }, [ready, onSelect, points])

  /** 선택이 바뀌면 그 마커의 이름표만 띄우고 지도를 옮긴다. */
  useEffect(() => {
    if (!ready) return
    const map = mapRef.current
    for (const { id, marker, overlay } of markersRef.current) {
      const isSelected = id === selectedId
      overlay.setMap(isSelected ? map : null)
      if (isSelected) map.panTo(marker.getPosition())
    }
  }, [ready, selectedId])

  return (
    <>
      {/* autoload=false 로 받고 kakao.maps.load 로 직접 켠다 — 자동 로드는
          스크립트가 언제 준비됐는지 알 수 없어 마커를 붙일 시점을 잡기 어렵다. */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => window.kakao?.maps?.load(initMap)}
        onError={() => onUnavailable?.('SDK 를 불러오지 못했습니다')}
      />
      {/* 부모를 꽉 채운다. `h-full`(height:100%)로 두면 부모 높이가 `min-height`
          로만 정해진 화면에서 0 으로 풀려 지도가 보이지 않는다 — 좁은 폭의
          `/map` 이 실제로 그랬다. 이 컴포넌트를 쓰는 자리는 position 이 잡힌
          부모여야 한다. */}
      <div ref={containerRef} className="absolute inset-0" />
    </>
  )
}

/** 이름을 HTML 로 끼워 넣기 전에 이스케이프한다. 교량명은 DB 에서 온 값이다. */
function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  )
}
