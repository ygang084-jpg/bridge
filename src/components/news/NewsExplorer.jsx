'use client'

import { useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { excerptSentences } from '@/lib/news/classify.js'
import { toneFor, formatDate } from '@/lib/news/tagTone.js'

/**
 * 교량뉴스 목록 — 카테고리 필터 + 더 보기.
 * ---------------------------------------------------------------------------
 * 디자인의 칩 필터와 '더 보기' 버튼을 옮긴 것이다. 서버에서 이미 받아 온 목록을
 * 브라우저에서 고르고 펼친다 — searchParams 로 하면 화면이 요청마다 렌더되어
 * 한 시간 캐시(`revalidate`)가 풀리고, 칩을 누를 때마다 Supabase 를 읽는다.
 *
 * 칩은 **실제로 목록에 있는 카테고리만** 만든다. 디자인은 '안전 소식 · 행정 공고 ·
 * 기술 트렌드'를 고정으로 뒀는데, 없는 칩을 눌러 빈 목록이 나오면 수집이 고장난
 * 것으로 읽힌다. 카테고리 이름도 우리가 새로 짓지 않고 classify.js 의 값을 쓴다.
 *
 * 디자인에 있었으나 넣지 않은 것 :
 *   · 썸네일 이미지 — 네이버 뉴스 검색 API 는 이미지를 주지 않는다. 아무 교량
 *     사진을 끼우면 그 기사가 그 교량 이야기인 것처럼 읽힌다.
 *   · '2시간 전' 상대 시각 — 이 화면은 한 시간 단위로 캐시되므로 서버에서 만든
 *     '2시간 전'이 굳어 실제와 어긋난다. 발표일을 그대로 적는다.
 *   · 조회수 — 세지 않는다. 없는 숫자를 적을 수 없다.
 * ---------------------------------------------------------------------------
 */

const ALL = '전체'
const PAGE = 10

export default function NewsExplorer({ rows = [] }) {
  const [category, setCategory] = useState(ALL)
  const [shown, setShown] = useState(PAGE)

  const categories = useMemo(() => {
    const present = []
    for (const row of rows) if (!present.includes(row.category)) present.push(row.category)
    return [ALL, ...present]
  }, [rows])

  const filtered = useMemo(
    () => (category === ALL ? rows : rows.filter((row) => row.category === category)),
    [rows, category],
  )

  const visible = filtered.slice(0, shown)
  const remaining = filtered.length - visible.length

  return (
    <div className="flex w-full flex-col gap-lg">
      {/* 칩이 하나(전체)뿐이면 고를 것이 없으므로 줄을 만들지 않는다. */}
      {categories.length > 1 && (
        <div className="flex gap-sm overflow-x-auto pb-1">
          {categories.map((name) => {
            const active = name === category
            const count = name === ALL ? rows.length : rows.filter((r) => r.category === name).length
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategory(name)
                  setShown(PAGE)
                }}
                className={`min-h-[40px] shrink-0 rounded-full px-4 py-2 text-label-md whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {name} {count}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col">
        {visible.map((row) => (
          <article key={row.id ?? row.url} className="border-b border-outline-variant/30">
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col gap-xs rounded-lg px-2 py-md transition-colors hover:bg-surface-container-lowest"
            >
              <div className="flex items-center gap-sm">
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-caption font-bold ${toneFor(row.tag)}`}
                  title={row.tagHint}
                >
                  [{row.tag}]
                </span>
                {/* 디자인은 여기에 기관명(국토교통부 …)을 뒀다. 우리가 가진 값은
                    링크의 호스트명에서 뽑은 언론사이므로 기관으로 적지 않는다 —
                    정부 발표로 읽히면 기사가 공식 기록으로 격상된다. */}
                <span className="truncate text-label-md text-on-surface-variant">
                  {row.publisher ?? '언론사 미표기'}
                </span>
              </div>

              <h3 className="line-clamp-2 text-[18px] leading-7 font-semibold text-on-surface">
                {row.title}
              </h3>

              {row.description && (
                <p className="line-clamp-2 text-body-md text-on-surface-variant">
                  {excerptSentences(row.description)}
                </p>
              )}

              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-on-surface-variant">
                <span>{row.category}</span>
                <span aria-hidden="true">·</span>
                <span>{row.region ?? '지역 미표기'}</span>
                <span aria-hidden="true">·</span>
                <span>{row.published_at ? formatDate(row.published_at) : '발표일 미표기'}</span>
                {row.matched?.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>분류 근거 ‘{row.matched.join('’, ‘')}’</span>
                  </>
                )}
              </p>
            </a>
          </article>
        ))}
      </div>

      {remaining > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShown((value) => value + PAGE)}
            className="flex min-h-[44px] items-center gap-xs rounded-lg border border-outline-variant px-6 py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container"
          >
            더 보기 {remaining}건
            <Icon name="arrow-down" size={18} />
          </button>
        </div>
      )}

      {/* 필터를 걸어 0건이 된 경우. 수집이 안 된 것과 구별해 적는다. */}
      {filtered.length === 0 && rows.length > 0 && (
        <p className="rounded-lg bg-surface-container-low p-md text-body-md text-on-surface-variant">
          ‘{category}’ 로 분류된 기사가 없습니다. 수집된 기사는 {rows.length}건입니다.
        </p>
      )}
    </div>
  )
}
