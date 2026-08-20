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

/** 컨테이너가 붙기를 기다리는 최대 프레임 수. 약 1초. */
const INIT_MAX_TRIES = 60

/**
 * 마커 그림. 카카오 기본 마커는 빨간 핀이라 우리 화면과 어울리지 않아 직접 그린다.
 *
 * 색은 theme.css 의 secondary(#006d37)다. 흰 테두리를 두르는 이유는 지도 타일 위
 * 어디에 놓여도 형태가 보여야 하기 때문이다 — 위성 사진처럼 어두운 배경이 오면
 * 색만으로는 묻힌다.
 *
 * ⚠ 마커 색으로 상태를 말하지 않는다. 781곳 전부 같은 색이다. 교량마다 색을
 *   달리하면 그 순간 우리가 등급을 판정하는 것이 되고, 그건 등급 칩을 중립 색으로
 *   둔 이유와 정면으로 부딪친다 (CLAUDE.md '등급 표시').
 */
const MARKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36">' +
  '<path d="M13 1C6.9 1 2 5.9 2 12c0 7.7 9.4 20.2 10.2 21.2a1 1 0 0 0 1.6 0C14.6 32.2 24 19.7 24 12 24 5.9 19.1 1 13 1z" ' +
  'fill="#006d37" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="13" cy="12" r="4" fill="#ffffff"/></svg>'

const MARKER_IMAGE_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(MARKER_SVG)}`

/**
 * '내 위치' 마커. 교량 핀과 **형태부터** 다르게 둔다 — 색만 다르면 '등급이 다른
 * 교량'으로 읽힌다. 속이 빈 원 + 가운데 점은 지도 앱에서 현재 위치를 뜻하는
 * 관용 표현이다. 색은 primary(#031635)로 초록 교량 핀과 섞이지 않게 한다.
 */
const ORIGIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
  '<circle cx="12" cy="12" r="9" fill="#ffffff" stroke="#031635" stroke-width="2"/>' +
  '<circle cx="12" cy="12" r="4" fill="#031635"/></svg>'

const ORIGIN_IMAGE_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(ORIGIN_SVG)}`

export default function KakaoMap({
  apiKey,
  bridges = [],
  /**
   * 사용자의 현재 위치. 있으면 별도 마커로 찍고 경계에 함께 넣는다.
   * 이 값은 브라우저에서만 다룬다 — 서버로 보내지 않는다 (PRD §15.7).
   */
  origin = null,
  selectedId = null,
  onSelect,
  onUnavailable,
  interactive = true,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  /** 크기가 처음 잡혔을 때 경계를 다시 맞추기 위해 마커 effect 가 채워 둔다. */
  const fitRef = useRef(null)
  const sizedRef = useRef(false)
  const initTriesRef = useRef(0)
  /** initMap 이 자기 자신을 다시 부르기 위한 참조. useCallback 은 자기를 못 본다. */
  const initMapRef = useRef(null)
  const [ready, setReady] = useState(false)

  // 좌표가 없는 교량은 지도에 찍을 수 없다. memo 로 두어 아래 effect 의
  // 의존성이 정적으로 검사되게 한다 (매 렌더 새 배열이면 마커를 계속 다시 그린다).
  const points = useMemo(
    () =>
      bridges.filter(
        (bridge) =>
          Number.isFinite(bridge.lat) &&
          Number.isFinite(bridge.lng) &&
          // 정확히 0,0 은 버린다. 수집 단계에서 이미 걸러내지만, 한 점이 새어 들어오면
          // 경계가 지구 반대편까지 벌어져 지도 전체가 빈 화면이 된다 — 마커 하나를
          // 잃는 것보다 지도를 잃는 쪽이 훨씬 나쁘다.
          !(bridge.lat === 0 && bridge.lng === 0),
      ),
    [bridges],
  )

  /**
   * SDK 가 실제로 준비됐을 때 지도를 만든다.
   *
   * 컨테이너가 아직 없으면 예전에는 그냥 끝냈다. 그런데 그러면 지도도 만들어지지
   * 않고, 6초 타임아웃은 `kakao.maps.Map` 존재만 보므로 되돌림도 뜨지 않아서,
   * 화면에 흰 상자만 남았다 — 무엇이 잘못됐는지 알 방법이 없는 상태였다.
   * 그래서 다음 프레임에 다시 시도하고, 끝내 안 되면 그 사실을 알린다.
   */
  const initMap = useCallback(() => {
    const kakao = window.kakao
    if (mapRef.current) return

    if (!kakao?.maps) {
      console.info('[map] SDK 가 아직 준비되지 않았습니다.')
      return
    }

    // 자리가 아직 없거나 크기가 0이면 **지도를 만들지 않고 기다린다.**
    //
    // 0×0 상태에서 만들면 카카오는 자기 크기를 0으로 잡고 타일을 한 장도
    // 요청하지 않는다. 나중에 relayout() 을 불러도 이미 잘못 잡힌 축척이 남아
    // (축척 바가 128km 로 표시됐다) 화면은 흰 상자 그대로다. 그래서 크기가
    // 생긴 뒤에 만든다 — 고치는 것보다 잘못 만들지 않는 것이 확실하다.
    const box = containerRef.current?.getBoundingClientRect()
    if (!box || box.width < 1 || box.height < 1) {
      if (initTriesRef.current >= INIT_MAX_TRIES) {
        console.warn(
          `[map] 자리를 얻지 못했습니다 — ${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : '컨테이너 없음'}`,
        )
        onUnavailable?.('지도를 놓을 자리를 얻지 못했습니다')
        return
      }
      initTriesRef.current += 1
      requestAnimationFrame(() => initMapRef.current?.())
      return
    }

    console.warn(`[map] 지도 생성 — 컨테이너 ${Math.round(box.width)}×${Math.round(box.height)}`)

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

    // 만든 직후 크기를 다시 알려준다. 지도를 만드는 시점에 컨테이너가 아직
    // 0×0 이면 카카오는 타일을 그리지 않고, 나중에 크기가 잡혀도 스스로 복구하지
    // 않는다. 그래서 흰 사각형으로 남아 있다가 클릭·확대 같은 이벤트가 다시
    // 그리기를 유발할 때 비로소 지도가 나타났다 — 첫 화면에서는 지도가 없는
    // 것과 같다.
    requestAnimationFrame(() => mapRef.current?.relayout())

    setReady(true)
  }, [interactive, onUnavailable])

  // rAF 재시도에서 최신 initMap 을 부를 수 있게 담아 둔다.
  useEffect(() => {
    initMapRef.current = initMap
  }, [initMap])

  /**
   * 컨테이너 크기가 바뀌면 지도에 알린다.
   *
   * 크기는 여러 이유로 늦게, 그리고 다시 정해진다 — 폰트가 늦게 오거나, 부모가
   * globals.css 의 `:has()` 규칙으로 480px↔1280px 를 오가거나, 창을 돌리거나.
   * relayout() 을 부르지 않으면 그때마다 타일이 어긋난 채 남는다.
   *
   * 경계를 다시 맞추는 것은 **크기가 처음 0에서 벗어날 때 한 번만** 한다. 매번
   * 맞추면 사용자가 옮겨 둔 지도가 창 크기만 바뀌어도 제자리로 튕겨 돌아간다.
   */
  useEffect(() => {
    if (!ready) return
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box || box.width === 0 || box.height === 0) return

      mapRef.current?.relayout()
      if (!sizedRef.current) {
        sizedRef.current = true
        fitRef.current?.()
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [ready])

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

    // 찍을 교량이 없어도 내 위치는 찍는다 — 아래에서 origin 을 다루므로 여기서 끝내지 않는다.
    if (points.length === 0 && !Number.isFinite(origin?.lat)) return

    const bounds = new kakao.maps.LatLngBounds()

    // 마커 그림은 한 번만 만들어 전부가 같은 것을 쓴다. 781개를 각각 만들면
    // 같은 data URI 를 그만큼 다시 파싱한다.
    const markerImage = new kakao.maps.MarkerImage(
      MARKER_IMAGE_SRC,
      new kakao.maps.Size(26, 36),
      // 핀의 뾰족한 끝이 좌표를 가리키게 맞춘다.
      { offset: new kakao.maps.Point(13, 35) },
    )

    for (const bridge of points) {
      const position = new kakao.maps.LatLng(bridge.lat, bridge.lng)
      bounds.extend(position)

      const marker = new kakao.maps.Marker({
        position,
        map,
        title: bridge.name,
        image: markerImage,
      })

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

    // 내 위치. 교량 마커와 함께 경계에 넣어 '나와 가까운 다리들'이 한 화면에 들어오게 한다.
    const hasOrigin = Number.isFinite(origin?.lat) && Number.isFinite(origin?.lng)
    if (hasOrigin) {
      const position = new kakao.maps.LatLng(origin.lat, origin.lng)
      bounds.extend(position)
      const marker = new kakao.maps.Marker({
        position,
        map,
        title: '내 위치',
        image: new kakao.maps.MarkerImage(ORIGIN_IMAGE_SRC, new kakao.maps.Size(24, 24), {
          offset: new kakao.maps.Point(12, 12),
        }),
        // 교량 핀 위에 올려 가려지지 않게 한다.
        zIndex: 10,
      })
      // 교량 마커와 같은 목록에 담아 정리(cleanup)에서 함께 지운다.
      // overlay 는 없으므로 setMap 만 하는 껍데기를 넣는다.
      markersRef.current.push({ id: '__origin__', marker, overlay: { setMap: () => {} } })
    }

    // 크기가 늦게 잡히는 경우를 위해 남겨 둔다 (위 ResizeObserver 가 한 번 부른다).
    fitRef.current = () => {
      // 내 위치가 있으면 한 곳만 있을 때도 경계로 맞춘다 — 나와 그 교량이 함께 보여야 한다.
      if (points.length === 1 && !hasOrigin) {
        map.setCenter(new kakao.maps.LatLng(points[0].lat, points[0].lng))
        map.setLevel(5)
      } else {
        map.setBounds(bounds, 40, 40, 40, 40)
      }
    }
    fitRef.current()

    return () => {
      for (const { marker, overlay } of markersRef.current) {
        marker.setMap(null)
        overlay.setMap(null)
      }
      markersRef.current = []
    }
  }, [ready, onSelect, points, origin])

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
