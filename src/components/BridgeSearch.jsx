'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'

/**
 * 교량 검색 — 실제로 입력을 받아 걸러 내는 검색창.
 * ---------------------------------------------------------------------------
 * 이전에는 검색창 모양의 링크였다. 눌러야 다른 화면으로 넘어가는 것을 검색창처럼
 * 보이게 두면, 타이핑을 시도한 사람은 고장으로 받아들인다.
 *
 * 걸러 내기를 브라우저에서 한다 (서버로 검색어를 보내지 않는다). PRD §15.7 과
 * 같은 이유다 — 검색어를 서버로 보내면 DB 에 저장하지 않아도 접근 로그에 남는다.
 * 교량 목록(이름·소재지)은 공개 정보이므로 내려보내도 된다.
 *
 * 등록된 교량 안에서만 찾는다는 것을 입력창 아래에 적는다. 전국 교량을 찾는
 * 검색으로 오해하면 결과 없음을 '그런 교량이 없다'로 읽는다.
 * ---------------------------------------------------------------------------
 */

const MAX_RESULTS = 6

/**
 * '현재 위치' 상태 문구.
 *
 * 거부·시간초과·미지원을 한 문장으로 뭉치지 않는다. 각각 사용자가 해야 할 일이
 * 다르기 때문이다 — 거부는 브라우저 설정, 시간초과는 다시 누르기, 미지원은
 * 아무것도 할 수 없음. '위치를 가져오지 못했습니다' 하나로는 어느 쪽인지 알 수 없다.
 *
 * 거부를 오류처럼 적지 않는다. 위치를 주지 않는 것은 선택이고, 그래도 화면은
 * 그대로 쓸 수 있다.
 */
const LOCATE_MESSAGE = {
  idle: '‘현재 위치’를 누르면 위치 권한을 물어보고 가까운 교량부터 보여줍니다. 좌표는 브라우저 밖으로 나가지 않습니다.',
  locating: '위치를 확인하고 있습니다. 브라우저가 권한을 물어보면 허용해 주세요.',
  ready: '내 위치에서 가까운 교량을 지도에 표시했습니다. 좌표는 브라우저 밖으로 나가지 않았습니다.',
  denied:
    '위치 권한을 주지 않으셨습니다. 지도는 등록된 교량 전체를 그대로 보여줍니다 — 이름이나 지역명으로 찾으실 수 있습니다.',
  failed:
    '위치를 확인하지 못했습니다. 실내이거나 신호가 약할 때 생깁니다 — 다시 눌러 보시거나 이름으로 찾아 주세요.',
  unsupported: '이 브라우저는 위치 확인을 지원하지 않습니다. 이름이나 지역명으로 찾아 주세요.',
}

export default function BridgeSearch({
  bridges = [],
  className = '',
  /** 있으면 '현재 위치'가 이 화면에서 위치를 얻는 버튼이 된다 (부모가 지도를 바꾼다). */
  onLocate = null,
  locating = false,
  /** idle | locating | ready | denied | failed | unsupported */
  locateStatus = 'idle',
}) {
  const [query, setQuery] = useState('')
  const keyword = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!keyword) return []
    return bridges
      .filter((bridge) =>
        `${bridge.name ?? ''} ${bridge.address ?? ''}`.toLowerCase().includes(keyword),
      )
      .slice(0, MAX_RESULTS)
  }, [bridges, keyword])

  const matchedAll = keyword
    ? bridges.filter((bridge) =>
        `${bridge.name ?? ''} ${bridge.address ?? ''}`.toLowerCase().includes(keyword),
      ).length
    : 0

  return (
    <section
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm ${className}`}
    >
      <h2 className="mb-sm flex items-center gap-xs text-headline-md text-primary">
        <Icon name="search" size={20} />
        교량 검색
      </h2>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">교량 이름 또는 지역명으로 검색</span>
          <Icon
            name="search"
            size={18}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="교량 이름 또는 지역명"
            className="min-h-[44px] w-full rounded-lg border border-outline bg-surface-container-lowest pr-4 pl-10 text-[16px] text-on-surface placeholder:text-on-surface-variant"
          />
        </label>

        {/* 이름을 모를 때의 경로. onLocate 를 받으면 **이 화면에서** 위치 권한을 물어
            위의 지도를 내 주변으로 바꾼다 (부모가 NearbyPanel 이다). 넘겨받지 못하면
            지도 화면으로 보낸다 — 버튼이 있는데 아무 일도 없는 것보다 낫다.
            좌표는 브라우저에서만 쓰고 서버로 보내지 않는다 (PRD §15.7). */}
        {onLocate ? (
          <button
            type="button"
            onClick={onLocate}
            disabled={locating}
            className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-label-md font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Icon name="map-pin" size={18} />
            {locating ? '위치 확인 중' : '현재 위치'}
          </button>
        ) : (
          <Link
            href="/map"
            className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-label-md font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            <Icon name="map-pin" size={18} />
            현재 위치
          </Link>
        )}
      </div>

      <p className="mt-2 text-caption text-on-surface-variant" aria-live="polite">
        {keyword
          ? `등록된 교량 ${bridges.length}곳 중 ${matchedAll}곳이 맞았습니다.`
          : `등록된 교량 ${bridges.length}곳에서 찾습니다. 아직 공공데이터 연동 전이라 전국 교량이 다 들어 있지는 않습니다.`}
      </p>
      <p className="mt-1 text-caption text-on-surface-variant" aria-live="polite">
        {LOCATE_MESSAGE[locateStatus] ?? LOCATE_MESSAGE.idle}
      </p>

      {keyword && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-surface-container-low p-3 text-sm leading-[22px] text-on-surface-variant">
              <Icon name="minus-circle" size={16} className="mt-0.5" />
              {/* 없는 것을 '그런 교량이 없다'로 쓰지 않는다. 우리 목록에 없다는 뜻이다. */}
              찾으시는 이름이 등록된 목록에 없습니다. 그 교량이 없다는 뜻은 아닙니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map((bridge) => (
                <li key={bridge.id}>
                  <Link
                    href={`/bridges/${bridge.id}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2 transition-colors hover:bg-surface-container"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body-md font-semibold text-primary">
                        {bridge.name}
                      </span>
                      <span className="block truncate text-caption text-on-surface-variant">
                        {bridge.address ?? '소재지 정보 없음'}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={16} className="text-on-surface-variant" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {matchedAll > results.length && (
            <p className="mt-2 text-caption text-on-surface-variant">
              맞은 {matchedAll}곳 중 {results.length}곳만 보여 줍니다.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
