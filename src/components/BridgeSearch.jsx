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

export default function BridgeSearch({ bridges = [], className = '' }) {
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

        {/* 이름을 모를 때의 경로. /bridges 가 위치 권한을 물어 가까운 순서로
            정렬해 주는 화면이다 (F-01). 좌표는 브라우저에서만 쓰고 서버로
            보내지 않는다. 권한을 거부하면 그 화면이 지역명 검색으로 넘어간다. */}
        <Link
          href="/map"
          className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-label-md font-medium text-on-primary transition-colors hover:bg-primary/90"
        >
          <Icon name="map-pin" size={18} />
          현재 위치
        </Link>
      </div>

      <p className="mt-2 text-caption text-on-surface-variant" aria-live="polite">
        {keyword
          ? `등록된 교량 ${bridges.length}곳 중 ${matchedAll}곳이 맞았습니다.`
          : `등록된 교량 ${bridges.length}곳에서 찾습니다. 아직 공공데이터 연동 전이라 전국 교량이 다 들어 있지는 않습니다.`}
      </p>
      <p className="mt-1 text-caption text-on-surface-variant">
        ‘현재 위치’를 누르면 위치 권한을 물어보고 가까운 교량부터 보여줍니다. 좌표는 브라우저 밖으로
        나가지 않습니다.
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
