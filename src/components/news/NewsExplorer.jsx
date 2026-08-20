'use client'

import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/Icon'
import { excerptSentences } from '@/lib/news/classify.js'
import { toneFor, formatDate } from '@/lib/news/tagTone.js'

/**
 * 교량뉴스 목록 — 카테고리 칩 필터 + 기사 행 + 더 보기.
 * ---------------------------------------------------------------------------
 * 디자인의 행 구성을 따랐다 : 왼쪽에 출처 줄 · 제목 · 요약 2줄 · 시각, 오른쪽에
 * 정사각 타일.
 *
 * 타일 자리에 사진을 넣지 않는다. 네이버 뉴스 검색 API 는 이미지를 주지 않으므로
 * 아무 교량 사진을 끼우면 그 기사가 그 교량 이야기인 것처럼 읽힌다. 대신 사진이
 * 아니라는 게 분명한 도형(그라디언트 + 격자)에 말머리를 얹었다.
 *
 * '2시간 전'은 브라우저에서 계산한다. 이 화면은 한 시간 단위로 캐시되므로 서버에서
 * 만들면 그 값이 굳어 실제와 어긋난다. 마운트 전에는 발표일을 그대로 보여주고
 * (서버·클라이언트 결과가 같아 hydration 이 어긋나지 않는다), 마운트 뒤에 상대
 * 시각으로 바꾼다. 절대 날짜는 title 로 남겨 둔다.
 *
 * 칩은 실제로 목록에 있는 카테고리만 만든다. 디자인은 '안전 소식 · 행정 공고 ·
 * 기술 트렌드'를 고정으로 뒀는데, 없는 칩을 눌러 빈 목록이 나오면 수집이 고장난
 * 것으로 읽힌다. 카테고리 이름도 classify.js 의 값을 그대로 쓴다.
 *
 * 조회수는 넣지 않는다 — 세지 않으므로 적을 숫자가 없다.
 * ---------------------------------------------------------------------------
 */

const ALL = '전체'
const PAGE = 10

export default function NewsExplorer({ rows = [] }) {
  const [category, setCategory] = useState(ALL)
  const [shown, setShown] = useState(PAGE)
  const [now, setNow] = useState(null)

  useEffect(() => {
    setNow(Date.now())
    // 화면을 열어 둔 채로도 '몇 분 전'이 흐르게 1분마다 다시 잡는다.
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

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
              className="flex items-start gap-md rounded-lg px-2 py-md transition-colors hover:bg-surface-container-lowest"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <div className="flex items-center gap-sm">
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-caption font-bold ${toneFor(row.tag)}`}
                    title={row.tagHint}
                  >
                    [{row.tag}]
                  </span>
                  {/* 디자인은 여기에 기관명(국토교통부 …)을 뒀다. 우리가 가진 값은
                      링크 호스트명에서 뽑은 언론사이므로 기관으로 적지 않는다 —
                      정부 발표로 읽히면 기사가 공식 기록으로 격상된다. */}
                  <span className="flex min-w-0 items-center gap-1.5 text-label-md text-on-surface-variant">
                    <Icon name="file-text" size={16} />
                    <span className="truncate">{row.publisher ?? '언론사 미표기'}</span>
                  </span>
                </div>

                <h3 className="line-clamp-2 text-[18px] leading-7 font-semibold text-on-surface md:text-headline-md">
                  {row.title}
                </h3>

                {row.description && (
                  <p className="line-clamp-2 text-body-md text-on-surface-variant">
                    {excerptSentences(row.description)}
                  </p>
                )}

                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-outline">
                  <span title={row.published_at ? formatDate(row.published_at) : undefined}>
                    {relativeTime(row.published_at, now)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{row.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{row.region ?? '지역 미표기'}</span>
                  {row.matched?.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>분류 근거 ‘{row.matched.join('’, ‘')}’</span>
                    </>
                  )}
                </p>
              </div>

              <RowTile tag={row.tag} />
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

      {filtered.length === 0 && rows.length > 0 && (
        <p className="rounded-lg bg-surface-container-low p-md text-body-md text-on-surface-variant">
          ‘{category}’ 로 분류된 기사가 없습니다. 수집된 기사는 {rows.length}건입니다.
        </p>
      )}
    </div>
  )
}

/**
 * 디자인의 썸네일 자리. 사진이 아니라 도형이라는 게 보이게 둔다 —
 * 기사에 딸린 사진이 없는데 사진처럼 보이는 것을 넣으면 그게 곧 오정보다.
 */
function RowTile({ tag }) {
  return (
    <span
      aria-hidden="true"
      className="bg-grid-pattern flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-outline-variant/30 md:h-32 md:w-32"
      style={{ backgroundImage: 'linear-gradient(135deg, #1a2b4b 0%, #364768 100%)' }}
    >
      <span className="text-caption font-bold text-on-primary/80">{tag}</span>
    </span>
  )
}

/**
 * '2시간 전'. now 가 없으면(마운트 전) 절대 날짜를 그대로 돌려준다.
 * 발표일이 없으면 지어내지 않고 그렇게 적는다.
 */
function relativeTime(publishedAt, now) {
  if (!publishedAt) return '발표일 미표기'
  if (!now) return formatDate(publishedAt)

  const at = Date.parse(publishedAt)
  if (Number.isNaN(at)) return formatDate(publishedAt)

  const minutes = Math.floor((now - at) / 60_000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`

  return formatDate(publishedAt)
}
