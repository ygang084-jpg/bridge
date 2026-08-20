'use client'

import { useCallback, useMemo, useState } from 'react'
import MapPreview from './MapPreview'
import BridgeSearch from './BridgeSearch'
import { distanceInMeters, formatDistance } from '@/lib/distance'

/**
 * 대시보드의 지도 + 검색 묶음. '현재 위치'를 누르면 지도가 내 주변으로 바뀐다.
 * ---------------------------------------------------------------------------
 * 왜 두 컴포넌트를 한 곳에서 감싸는가 — 지도와 검색창이 같은 칼럼에 있고, 위치를
 * 얻는 곳(검색창의 버튼)과 쓰는 곳(지도)이 서로 다르다. 상태를 공유할 자리가
 * 필요하고, 그 자리는 둘의 부모다.
 *
 * 좌표는 **브라우저 밖으로 나가지 않는다.** 거리 계산도 여기서 한다 (PRD §15.7) —
 * 좌표를 서버로 보내면 DB 에 저장하지 않아도 접근 로그에 남는다. 그래서 서버에
 * '가까운 교량'을 물어보지 않고, 이미 받아 둔 목록을 브라우저에서 정렬한다.
 *
 * 권한을 거부당했을 때 화면을 되돌리지 않는다. 거부는 오류가 아니라 선택이므로,
 * 지도는 원래대로 두고 그 사실만 한 줄로 적는다.
 * ---------------------------------------------------------------------------
 */

/** 내 주변으로 볼 때 지도에 남길 교량 수. */
const NEARBY_COUNT = 5

/** 위치를 기다리는 최대 시간. 이보다 길면 사용자는 고장으로 받아들인다. */
const GEO_TIMEOUT_MS = 10_000

export default function NearbyPanel({ mapPoints = [], searchIndex = [] }) {
  const [origin, setOrigin] = useState(null)
  const [status, setStatus] = useState('idle')

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude })
        setStatus('ready')
      },
      (error) => {
        // 거부·시간초과·측정실패를 구분해 적는다. 다 '실패'로 뭉치면 사용자가
        // 무엇을 다시 해야 하는지 알 수 없다.
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed')
      },
      { timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
    )
  }, [])

  const reset = useCallback(() => {
    setOrigin(null)
    setStatus('idle')
  }, [])

  /** 내 위치에서 가까운 순으로 자른 목록. 거리도 함께 담는다. */
  const nearby = useMemo(() => {
    if (!origin) return null
    return mapPoints
      .map((bridge) => ({ bridge, meters: distanceInMeters(origin, bridge) }))
      .filter((row) => row.meters !== null)
      .sort((a, b) => a.meters - b.meters)
      .slice(0, NEARBY_COUNT)
  }, [origin, mapPoints])

  const shown = nearby ? nearby.map((row) => row.bridge) : mapPoints

  return (
    <>
      <MapPreview
        bridges={shown}
        origin={origin}
        // 지도 왼쪽 위 배지 문구. 내 주변을 보고 있는지 전체를 보고 있는지
        // 지도만 보고도 알아야 한다.
        badge={origin ? `내 주변 ${shown.length}곳` : null}
      />

      {nearby && (
        <NearbyList rows={nearby} status={status} onReset={reset} />
      )}

      <BridgeSearch
        bridges={searchIndex}
        onLocate={locate}
        locating={status === 'locating'}
        locateStatus={status}
      />
    </>
  )
}

/**
 * 지도 아래 가까운 교량 목록. 지도만으로는 어느 마커가 가장 가까운지 알 수 없다.
 * 거리는 직선거리다 — 걸어가는 거리가 아니므로 그렇게 적는다.
 */
function NearbyList({ rows, status, onReset }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <div className="mb-sm flex items-center justify-between gap-3">
        <h2 className="text-headline-md text-primary">내 주변 교량</h2>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[36px] rounded-lg border border-outline-variant px-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          전체 보기
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          담아 둔 교량 중에 좌표가 있는 곳이 없어 거리를 잴 수 없었습니다.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-outline-variant/40">
          {rows.map((row, index) => (
            <li key={row.bridge.id} className="flex items-baseline gap-3 py-2">
              <span className="w-4 shrink-0 text-label-md font-bold text-primary">{index + 1}</span>
              <a
                href={`/bridges/${row.bridge.id}`}
                className="min-w-0 flex-1 truncate text-body-md text-on-surface hover:text-primary hover:underline"
              >
                {row.bridge.name}
              </a>
              <span className="shrink-0 text-label-md text-on-surface-variant">
                {formatDistance(row.meters)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-sm text-caption leading-4 text-on-surface-variant">
        직선거리입니다 — 걸어가거나 차로 가는 거리가 아닙니다. 좌표는 브라우저에서만 쓰고 서버로
        보내지 않습니다.
        {status === 'ready' && ' 담아 둔 범위(서울)를 벗어난 곳에서는 가까운 교량도 멀게 나옵니다.'}
      </p>
    </section>
  )
}
