'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/Icon'
import InfoStateBadge from '@/components/InfoStateBadge'
import { distanceInMeters, formatDistance } from '@/lib/distance'

/**
 * F-01 내 주변 교량 목록.
 *
 * 수용기준과의 대응
 *   ① 진입 시 위치 권한 요청 → 허용하면 현재 위치 기준 정렬
 *   ② 거부·실패 시 지역명 검색으로 대체 — 빈 화면이나 오류로 끝나지 않는다
 *   ③ 교량명·거리·정보 상태(F-05 3단계)
 *   ④ 선택 시 상세로
 *   ⑤ 반경 내 교량이 없으면 안내 + 검색 진입
 *
 * 좌표는 이 컴포넌트 안에서만 쓰이고 서버로 가지 않는다 (PRD §15.7).
 * 서버가 이미 내려준 목록을 브라우저에서 정렬할 뿐이다.
 */
const DEFAULT_RADIUS_M = 3000 // F-01 기본 반경 3km [가설]

const LOCATION = {
  IDLE: 'idle',
  ASKING: 'asking',
  GRANTED: 'granted',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
}

export default function BridgeList({ bridges, initialMode = 'nearby' }) {
  const [position, setPosition] = useState(null)
  const [locationState, setLocationState] = useState(
    initialMode === 'search' ? LOCATION.IDLE : LOCATION.ASKING,
  )
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (locationState !== LOCATION.ASKING) return

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState(LOCATION.UNAVAILABLE)
      return
    }

    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (cancelled) return
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
        setLocationState(LOCATION.GRANTED)
      },
      () => {
        if (!cancelled) setLocationState(LOCATION.DENIED)
      },
      { timeout: 8000, maximumAge: 60000 },
    )

    return () => {
      cancelled = true
    }
  }, [locationState])

  const rows = useMemo(() => {
    const keyword = query.trim()
    const filtered = keyword
      ? bridges.filter(
          (bridge) =>
            bridge.name.includes(keyword) || (bridge.address ?? '').includes(keyword),
        )
      : bridges

    const withDistance = filtered.map((bridge) => ({
      ...bridge,
      distance: position ? distanceInMeters(position, bridge) : null,
    }))

    if (!position) return withDistance

    withDistance.sort((a, b) => {
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })
    return withDistance
  }, [bridges, position, query])

  const withinRadius = useMemo(
    () =>
      position && !showAll && !query.trim()
        ? rows.filter((row) => row.distance !== null && row.distance <= DEFAULT_RADIUS_M)
        : rows,
    [rows, position, showAll, query],
  )

  const outsideCount = rows.length - withinRadius.length

  return (
    <div className="flex flex-col gap-5">
      <label className="relative block">
        <span className="sr-only">지역명 또는 교량명 검색</span>
        <Icon
          name="search"
          size={18}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
        />
        {/* 테두리만 카드와 다른 outline(#75777f)을 쓴다. 입력칸의 경계는 어디에
            입력하는지를 알려주는 유일한 표시라 WCAG 1.4.11 이 3:1 을 요구하는데,
            카드용 outline-variant(#c5c6cf)는 흰 배경 대비 1.70:1 로 미달이다.
            outline 은 4.47:1. */}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="지역명 또는 교량명으로 찾기"
          className="min-h-[44px] w-full rounded-lg border border-outline bg-surface-container-lowest pr-4 pl-10 text-[16px] text-on-surface placeholder:text-on-surface-variant"
        />
      </label>

      <LocationNotice
        state={locationState}
        onRetry={() => setLocationState(LOCATION.ASKING)}
        hasQuery={Boolean(query.trim())}
      />

      <p className="text-[13px] text-on-surface-variant">
        {position && !query.trim() && !showAll
          ? `현재 위치 기준 ${(DEFAULT_RADIUS_M / 1000).toFixed(0)}km 안 · 총 ${withinRadius.length}곳`
          : `총 ${withinRadius.length}곳`}
      </p>

      {withinRadius.length === 0 ? (
        <EmptyResult
          hasQuery={Boolean(query.trim())}
          hasPosition={Boolean(position)}
          onShowAll={() => setShowAll(true)}
          totalCount={rows.length}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {withinRadius.map((bridge) => (
            <li key={bridge.id}>
              <Link
                href={`/bridges/${bridge.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-colors hover:bg-surface-container-low"
              >
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold text-primary">
                    {bridge.name}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-on-surface-variant">
                    {[bridge.address, formatDistance(bridge.distance)]
                      .filter(Boolean)
                      .join(' · ') || '소재지 정보 없음'}
                  </p>
                </div>
                <InfoStateBadge state={bridge.infoState} label={bridge.infoLabel} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {position && outsideCount > 0 && !showAll && !query.trim() && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="min-h-[44px] text-[14px] font-medium text-accent hover:underline"
        >
          반경 밖 {outsideCount}곳도 보기
        </button>
      )}
    </div>
  )
}

function LocationNotice({ state, onRetry, hasQuery }) {
  if (state === LOCATION.GRANTED || hasQuery) return null

  const message = {
    [LOCATION.IDLE]: '지역명이나 교량명으로 찾아보세요.',
    [LOCATION.ASKING]: '현재 위치를 확인하고 있습니다.',
    [LOCATION.DENIED]:
      '위치를 사용할 수 없어 거리 순으로 정렬하지 못했습니다. 지역명이나 교량명으로 찾아보세요.',
    [LOCATION.UNAVAILABLE]:
      '이 브라우저에서는 위치를 사용할 수 없습니다. 지역명이나 교량명으로 찾아보세요.',
  }[state]

  if (!message) return null

  return (
    <div className="rounded-lg bg-surface-container-low p-3">
      <p className="flex items-start gap-1.5 text-[13px] leading-[18px] text-on-surface-variant">
        <Icon name="info" size={14} className="mt-0.5" />
        {message}
      </p>
      {state === LOCATION.DENIED && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-[44px] text-[13px] font-medium text-accent hover:underline"
        >
          위치 다시 시도
        </button>
      )}
    </div>
  )
}

/** F-01 ⑤ — 결과가 없어도 빈 화면으로 끝내지 않는다. */
function EmptyResult({ hasQuery, hasPosition, onShowAll, totalCount }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-center shadow-sm">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-unknown-bg text-unknown-fg">
        <Icon name="search" size={24} />
      </span>
      <p className="text-[16px] font-medium text-on-surface">
        {hasQuery
          ? '검색어와 맞는 교량을 찾지 못했습니다.'
          : hasPosition
            ? '반경 3km 안에 등록된 교량이 없습니다.'
            : '표시할 교량이 없습니다.'}
      </p>
      <p className="mt-2 text-[14px] leading-[22px] text-on-surface-variant">
        공개 데이터에 등록된 교량만 표시합니다. 없는 것이 곧 다리가 없다는 뜻은 아닙니다.
      </p>
      {hasPosition && !hasQuery && totalCount > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-4 min-h-[44px] text-[14px] font-medium text-accent hover:underline"
        >
          전체 {totalCount}곳 보기
        </button>
      )}
    </div>
  )
}
