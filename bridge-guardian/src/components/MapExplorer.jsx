'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import InfoStateBadge from './InfoStateBadge'
import KakaoMap from './KakaoMap'

/**
 * 교량 지도 화면 — Stitch '교량 지도' + '교량 상세 정보' 구성을 옮긴 것.
 * ---------------------------------------------------------------------------
 * 왼쪽 사이드바(검색·지역 필터·목록) + 가운데 지도 캔버스(마커) + 마커를 고르면
 * 뜨는 상세 패널. 세 화면(지도 / 검색 결과 / 상세)이 이 한 화면의 상태다.
 *
 * 지도 타일은 없다. PRD §4 가 지도 렌더링을 v0 범위 밖으로 두었고, 디자인 파일의
 * 배경은 외부(Google) 이미지 주소여서 방문자 요청이 제3자로 나간다. 대신
 * 마커 위치는 실제 위경도를 캔버스에 선형 투영해 배치한다 — 서로의 상대 위치는
 * 진짜다. 절대 위치나 축척은 지도가 아니므로 화면에 그렇게 적는다.
 *
 * 디자인의 자리를 두고 내용을 바꾼 곳 :
 *   · 상태 칩 '안정 / 점검요망' → 우리는 안전을 판정하지 않는다 (PRD §2.2).
 *     같은 자리에 F-05 정보 상태(이력 있음·부분·없음)를 둔다
 *   · 연혁의 '센서 데이터 갱신 / 응력·진동 정상 범위 확인' → 센서가 없다.
 *     실제 점검·보수 기록만 싣는다
 *   · '교량 형식 트러스교' → 담을 컬럼이 없어 '공개 정보 없음'
 *   · 사진·프로필 이미지 → 외부 주소여서 넣지 않았다
 *   · 확대/축소·내 위치 버튼 → 조작할 지도가 없어 두지 않았다
 *   · '이상징후 제보' → 접수 경로가 없다 (비활성)
 * ---------------------------------------------------------------------------
 */

const ALL_REGIONS = '전체 지역'

export default function MapExplorer({ bridges = [] }) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState(ALL_REGIONS)
  const [selectedId, setSelectedId] = useState(null)

  // 카카오 JS 키가 없으면 지도를 부를 수 없다. 그때는 아래 격자 배경 + 상대
  // 위치 마커로 되돌린다 (이 화면이 원래 쓰던 방식).
  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? ''
  const [mapError, setMapError] = useState(apiKey ? null : '지도 키가 설정되지 않았습니다')
  const useFallback = !apiKey || Boolean(mapError)

  const handleMapUnavailable = useCallback((reason) => {
    setMapError(reason ?? '지도를 불러오지 못했습니다')
  }, [])

  const regions = useMemo(() => {
    const found = new Set()
    for (const bridge of bridges) {
      const first = (bridge.address ?? '').split(' ')[0]
      if (first) found.add(first)
    }
    return [ALL_REGIONS, ...[...found].sort((a, b) => a.localeCompare(b, 'ko'))]
  }, [bridges])

  const keyword = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      bridges.filter((bridge) => {
        const haystack = `${bridge.name ?? ''} ${bridge.address ?? ''}`.toLowerCase()
        const matchesQuery = !keyword || haystack.includes(keyword)
        const matchesRegion = region === ALL_REGIONS || (bridge.address ?? '').startsWith(region)
        return matchesQuery && matchesRegion
      }),
    [bridges, keyword, region],
  )

  const selected = visible.find((bridge) => bridge.id === selectedId) ?? null
  const positions = useMemo(() => project(visible), [visible])

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm md:h-[640px] md:flex-row">
      <Sidebar
        bridges={visible}
        total={bridges.length}
        regions={regions}
        region={region}
        onRegion={setRegion}
        query={query}
        onQuery={setQuery}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onReset={() => {
          setQuery('')
          setRegion(ALL_REGIONS)
          setSelectedId(null)
        }}
      />

      <div
        className={`relative min-h-[420px] flex-1 overflow-hidden ${useFallback ? 'map-canvas' : ''}`}
      >
        {useFallback ? (
          <>
            <p className="absolute top-3 left-3 z-10 flex max-w-[22rem] items-start gap-1.5 rounded-lg bg-surface-container-lowest/90 px-3 py-2 text-caption leading-[18px] text-on-surface-variant shadow-sm backdrop-blur-sm">
              <Icon name="info" size={14} className="mt-0.5" />
              <span>
                {mapError
                  ? `지도를 불러오지 못해 상대 위치만 표시합니다 (${mapError}).`
                  : '지도가 아닙니다. 마커는 실제 위경도의 상대 위치만 나타내며 축척·도로는 표시하지 않습니다.'}
              </span>
            </p>

            {visible.length === 0 ? (
              <p className="flex h-full items-center justify-center text-body-md text-on-surface-variant">
                조건에 맞는 교량이 없습니다.
              </p>
            ) : (
              visible.map((bridge) => {
                const spot = positions.get(bridge.id)
                const isSelected = bridge.id === selectedId
                return (
                  <button
                    key={bridge.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : bridge.id)}
                    aria-pressed={isSelected}
                    className="group absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
                    style={{
                      top: `${spot.top}%`,
                      left: `${spot.left}%`,
                      zIndex: isSelected ? 30 : 20,
                    }}
                  >
                    <span
                      className={`mb-1 rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-caption font-bold whitespace-nowrap text-primary shadow-sm transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {bridge.name}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary shadow-md transition-transform group-hover:scale-110 ${
                        isSelected ? 'ring-4 ring-primary/20' : ''
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-on-primary" />
                    </span>
                  </button>
                )
              })
            )}
          </>
        ) : (
          <KakaoMap
            apiKey={apiKey}
            bridges={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUnavailable={handleMapUnavailable}
          />
        )}

        {selected && <DetailPanel bridge={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  )
}

/* ── 사이드바 ────────────────────────────────────────────────────────── */

function Sidebar({
  bridges,
  total,
  regions,
  region,
  onRegion,
  query,
  onQuery,
  selectedId,
  onSelect,
  onReset,
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-outline-variant md:w-72 md:border-r">
      <div className="border-b border-outline-variant p-gutter">
        <h2 className="text-headline-md font-bold text-primary">교량 기본 정보</h2>
        <p className="mt-1 text-caption text-on-surface-variant">이름·지역으로 찾아 마커를 고릅니다</p>
      </div>

      <div className="border-b border-outline-variant px-gutter py-4">
        <label className="relative block">
          <span className="sr-only">교량 검색</span>
          <Icon
            name="search"
            size={18}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-outline"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="교량 검색…"
            className="min-h-[44px] w-full rounded-full border border-outline bg-surface-container-low pr-4 pl-10 text-[16px] text-on-surface placeholder:text-on-surface-variant"
          />
        </label>
      </div>

      <div className="flex flex-col gap-6 px-gutter py-4">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-label-md text-primary">
            <Icon name="map" size={20} />
            지역 선택
          </h3>
          <select
            value={region}
            onChange={(event) => onRegion(event.target.value)}
            className="block min-h-[44px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 text-[16px] text-on-surface"
          >
            {regions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 목록 — 디자인의 사이드바 리스트. 상태 칩 자리에 정보 상태 배지를 둔다. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {bridges.map((bridge) => {
            const isSelected = bridge.id === selectedId
            return (
              <button
                key={bridge.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : bridge.id)}
                aria-pressed={isSelected}
                className={`flex w-full flex-col gap-1 rounded-lg p-3 text-left transition-colors ${
                  isSelected
                    ? 'border border-primary/20 bg-primary-fixed/50'
                    : 'border border-transparent hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-label-md ${isSelected ? 'font-bold text-primary' : 'font-medium text-on-surface'}`}
                  >
                    {bridge.name}
                  </span>
                  <InfoStateBadge state={bridge.infoState} label={bridge.infoLabel} size="sm" />
                </div>
                <span className="flex items-center gap-1 text-caption text-on-surface-variant">
                  <Icon name="map-pin" size={14} />
                  {bridge.address ?? '소재지 정보 없음'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-outline-variant bg-surface-container-low/50 p-4">
        <p className="mb-3 text-center text-caption text-outline">
          {bridges.length === total
            ? `등록된 교량 ${total}건`
            : `검색 결과 ${bridges.length}건 / 전체 ${total}건`}
        </p>
        {/* 디자인의 '필터 적용' 자리. 걸러 내기는 입력하는 즉시 반영되므로
            누를 일이 없는 버튼을 두지 않고, 실제로 하는 일인 초기화를 둔다. */}
        <button
          type="button"
          onClick={onReset}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary text-label-md font-bold text-on-primary transition-colors hover:bg-primary/90"
        >
          <Icon name="x" size={16} />
          검색·필터 초기화
        </button>
      </div>
    </aside>
  )
}

/* ── 상세 패널 ───────────────────────────────────────────────────────── */

function DetailPanel({ bridge, onClose }) {
  return (
    <div className="absolute inset-x-3 top-3 z-40 flex max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest/95 shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-3 md:w-[380px]">
      <div className="flex items-start justify-between gap-3 bg-primary p-4 text-on-primary">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1 text-label-md text-primary-fixed-dim">
            <Icon name="map-pin" size={16} />
            {bridge.address ?? '소재지 정보 없음'}
          </p>
          <h2 className="text-headline-md font-bold">{bridge.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="상세 닫기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-primary/10 text-on-primary transition-colors hover:bg-on-primary/20"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-label-md font-bold text-on-surface-variant">
            <Icon name="info" size={18} />
            제원 정보
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Spec label="교량 형식" value={null} hint="아치교 · 트러스교 등" />
            <Spec
              label="준공 연도"
              value={bridge.completedYear ? `${bridge.completedYear}년` : null}
            />
            <Spec label="시설물 종류" value={bridge.facilityType} />
            <Spec label="종별" value={bridge.facilityClass} />
            <div className="col-span-2">
              <Spec label="소재지" value={bridge.address} />
            </div>
          </div>
          <p className="mt-2 text-caption leading-[18px] text-on-surface-variant">
            교량 형식은 아직 받아 오는 값이 없습니다. 시설물 종류를 그 자리에 옮겨 적지 않았습니다 —
            다른 값입니다.
          </p>
        </section>

        <section>
          <h3 className="mb-4 flex items-center gap-2 text-label-md font-bold text-on-surface-variant">
            <Icon name="clock" size={18} />
            안전 관리 연혁
          </h3>

          {bridge.timeline.length === 0 ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-surface-container-low p-3 text-caption leading-[18px] text-on-surface-variant">
              <Icon name="minus-circle" size={16} className="mt-0.5" />
              공개된 관리 기록이 없습니다. 점검을 하지 않았다는 뜻이 아닙니다.
            </p>
          ) : (
            <ol className="relative ml-2 space-y-5 border-l-2 border-surface-variant pl-4">
              {bridge.timeline.map((item, index) => (
                <li key={item.id ?? `${item.occurredOn}-${index}`} className="relative">
                  <span
                    className={`absolute top-1 -left-[21px] h-3 w-3 rounded-full border-2 border-surface-container-lowest ${
                      item.isCompletion ? 'bg-outline' : 'bg-primary'
                    }`}
                    aria-hidden="true"
                  />
                  <p className="mb-1 text-sm font-bold text-on-surface-variant">{item.date}</p>
                  <div className="rounded-lg border border-surface-variant bg-surface-bright p-3">
                    <p className="flex items-center gap-2 text-label-md font-bold text-on-surface">
                      <Icon name={item.isCompletion ? 'building' : 'wrench'} size={16} />
                      {item.eventType}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-caption leading-[18px] text-on-surface-variant">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-caption text-on-surface-variant/80">
                      {item.source ?? '출처 미표기'}
                      {item.dataAsOf ? ` · ${item.dataAsOf} 기준` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex gap-3 border-t border-outline-variant bg-surface-container p-4">
        {/* 접수·전달 경로가 없어 열지 않았다 (PRD §2.2 비목표). */}
        <button
          type="button"
          disabled
          title="제보 접수는 제공하지 않습니다"
          className="flex min-h-[44px] flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-surface-variant px-4 text-label-md font-bold text-on-surface-variant"
        >
          <Icon name="warning-circle" size={18} />
          제보 — 제공하지 않음
        </button>
        <Link
          href={`/bridges/${bridge.id}`}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 text-label-md font-bold text-primary transition-colors hover:bg-primary-fixed/20"
        >
          <Icon name="file-text" size={18} />
          공개 기록 전체
        </Link>
      </div>
    </div>
  )
}

function Spec({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-surface-variant bg-surface-bright p-3">
      <p className="mb-1 text-caption text-outline">
        {label}
        {hint && <span className="block text-[11px] text-outline/80">{hint}</span>}
      </p>
      <p
        className={`text-label-md ${value ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}
      >
        {value ?? '공개 정보 없음'}
      </p>
    </div>
  )
}

/* ── 마커 좌표 투영 ──────────────────────────────────────────────────── */

/**
 * 위경도를 캔버스 백분율로 선형 투영한다.
 *
 * 지도 투영법이 아니다. 보이는 교량들의 위경도 범위를 캔버스에 맞춰 늘린 것이라
 * 서로의 상대 위치만 맞다. 좌표가 없는 교량은 배치할 수 없어 가운데에 둔다.
 * 교량이 하나뿐이거나 좌표가 모두 같으면 범위가 0 이 되므로 가운데로 보낸다.
 */
function project(bridges) {
  const points = bridges.filter(
    (bridge) => Number.isFinite(bridge.lat) && Number.isFinite(bridge.lng),
  )
  const positions = new Map()
  if (points.length === 0) {
    bridges.forEach((bridge) => positions.set(bridge.id, { top: 50, left: 50 }))
    return positions
  }

  const lats = points.map((b) => b.lat)
  const lngs = points.map((b) => b.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // 여백 20~80% 안에 배치해 마커 라벨이 캔버스 밖으로 나가지 않게 한다.
  const scale = (value, min, max) => (max === min ? 50 : 20 + ((value - min) / (max - min)) * 60)

  for (const bridge of bridges) {
    if (Number.isFinite(bridge.lat) && Number.isFinite(bridge.lng)) {
      positions.set(bridge.id, {
        // 위도가 클수록 북쪽 = 화면 위쪽이므로 뒤집는다.
        top: 100 - scale(bridge.lat, minLat, maxLat),
        left: scale(bridge.lng, minLng, maxLng),
      })
    } else {
      positions.set(bridge.id, { top: 50, left: 50 })
    }
  }
  return positions
}
