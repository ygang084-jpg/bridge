import Link from 'next/link'
import Icon from '@/components/Icon'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { NewsDisclaimer } from '@/components/NewsBoard'
import NewsExplorer from '@/components/news/NewsExplorer'
import { fetchBridgeNews } from '@/lib/supabase/readClient'
import { arrangeNews, classifyNews, excerptSentences } from '@/lib/news/classify.js'
import { toneFor, formatDate } from '@/lib/news/tagTone.js'
import { cronTextFor } from '@/lib/cron.js'
import vercelConfig from '../../../vercel.json'

export const metadata = {
  title: '교량뉴스 — BRIDGE SAFE',
  description:
    '교량에 대한 언론 보도를 모아 둔 목록입니다. 공식 기록이 아니며, 기사를 특정 교량에 붙이지 않습니다.',
}

/** 대시보드는 6건만 발췌하므로 전체 목록은 fetchBridgeNews 의 기본값(24)을 그대로 쓴다. */
const NEWS_LIMIT = 24

/**
 * 한 시간마다 다시 만든다.
 *
 * 이 값이 없으면 Next 가 빌드 시점의 목록을 그대로 굳혀 놓는다. 스케줄러가
 * 매일 기사를 채워도 재배포할 때까지 화면이 바뀌지 않고, '뉴스'라는 이름으로
 * 몇 주 전 목록을 보여주게 된다. 수집이 하루 한 번이므로 한 시간이면 충분히
 * 촘촘하고, 요청마다 Supabase 를 읽을 이유도 없다 (§11 3초).
 */
export const revalidate = 3600

/**
 * '교량뉴스' 화면 — Stitch `교량 뉴스` 구성을 옮긴 것.
 * ---------------------------------------------------------------------------
 * 디자인을 따른 것 : 큰 머리기사 히어로 / 카테고리 칩 필터 / 기사 목록 + '더 보기' /
 *   오른쪽 사이드바 / 하단 푸터.
 *
 * 디자인 파일과 다르게 옮긴 것 — 전부 '가진 값만 적는다' 하나에서 나온다 :
 *
 *   · 히어로 배경 사진 → 외부(Google) 이미지였고, 무엇보다 특정 기사 위에 교량
 *     사진을 깔면 그 사진이 그 기사의 교량으로 읽힌다. 랜딩이 같은 문제를 푼
 *     방식(그라디언트 + 격자)을 따랐다.
 *   · 조회수 '2,451' → 조회수를 세지 않는다. 없는 숫자는 적지 않는다.
 *   · 기사 썸네일 → 네이버 뉴스 검색 API 는 이미지를 주지 않는다.
 *   · '2시간 전' 상대 시각 → 이 화면은 한 시간 단위로 캐시되므로 서버에서 만든
 *     상대 시각이 굳어 실제와 어긋난다. 발표일을 그대로 적는다.
 *   · 항목의 기관명(국토교통부 · 안전관리공단 · 행정안전부) → 우리가 가진 값은
 *     링크 호스트명에서 뽑은 **언론사**다. 기관명으로 적으면 기사가 정부 발표로
 *     읽히고, 그 순간 언론 보도가 공식 기록으로 격상된다.
 *   · 사이드바 '많이 읽은 뉴스' 5위 → 조회수가 없으므로 순위를 만들 수 없다.
 *     대신 **이 목록을 만든 검색어**를 적는다. 목록이 왜 이렇게 구성됐는지
 *     밝히지 못하면 무엇이 빠졌는지도 말할 수 없다.
 *   · 사이드바 '실시간 주요 키워드' → 인기를 측정하지 않는다. 대신 말머리·카테고리를
 *     붙일 때 **실제로 걸린 낱말**과 그 건수를 적는다. 우리 분류의 근거 공개다.
 *   · 상단 내비의 Public Reports · Technology · About Us · **Emergency Portal**
 *     → 제보도 기술 페이지도 없고, 비상 포털은 특히 위험하다(누르면 아무 일도
 *     없는 비상 창구는 그 자체로 위해다). 앱 공통 내비를 쓴다.
 *   · 푸터의 ⓒ2024 · Government Relations 등 → 실재하지 않는다. AppFooter 를 쓴다.
 *
 * 히어로에 올리는 기사는 우리가 '중요하다'고 고른 것이 아니다. arrangeNews 의
 * 첫 항목 — 말머리가 [긴급]·[공지]인 것을 먼저, 그다음 최신순 — 그대로다.
 * 그 규칙을 화면에 적어 두었다.
 * ---------------------------------------------------------------------------
 */
export default async function NewsPage() {
  const news = await fetchBridgeNews(NEWS_LIMIT)
  const refreshedAt = cronTextFor(vercelConfig?.crons, '/api/cron/refresh-news')

  const classified = news.items.map((item) => ({ ...item, ...classifyNews(item) }))
  const rows = arrangeNews(classified, NEWS_LIMIT)
  const [featured, ...rest] = rows

  return (
    <>
      <TopNav active="news" />

      <main className="screen-wide flex w-full flex-1 flex-col gap-xl px-margin-mobile py-xl md:px-margin-desktop">
        <Intro refreshedAt={refreshedAt} count={rows.length} />

        {rows.length === 0 ? (
          <NotCollectedYet />
        ) : (
          <>
            <Featured row={featured} />

            <div className="flex w-full flex-col gap-xl lg:flex-row">
              <div className="w-full lg:w-3/4">
                <NewsExplorer rows={rest} />
              </div>
              <aside className="flex w-full flex-col gap-md lg:w-1/4">
                <Queries rows={rows} />
                <MatchedWords rows={rows} />
              </aside>
            </div>
          </>
        )}

        <NewsDisclaimer className="border-t border-outline-variant/30 pt-3" />
      </main>

      <AppFooter />
      <BottomNav active="news" />
    </>
  )
}

/* ── 머리말 ──────────────────────────────────────────────────────────── */

function Intro({ refreshedAt, count }) {
  return (
    <header>
      <h1 className="mb-3 text-[24px] leading-8 font-semibold text-primary md:text-headline-lg">
        교량뉴스
      </h1>
      <p className="max-w-3xl text-body-lg text-on-surface-variant">
        교량에 대한 언론 보도를 모아 둔 목록입니다. <strong className="font-semibold">공식 기록이
        아닙니다.</strong> 기사를 특정 교량에 붙이지 않습니다 — 제목에 교량 이름이 있다는 것만으로
        그 교량의 상태를 말할 수는 없기 때문입니다.
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-md text-on-surface-variant">
        <span>수집 주기 {refreshedAt ?? '확인할 수 없습니다'}</span>
        <span aria-hidden="true">·</span>
        <span>{count > 0 ? `${count}건` : '수집 전'}</span>
        <span aria-hidden="true">·</span>
        <Link href="/info" className="font-semibold text-primary underline hover:no-underline">
          출처와 분류 방식
        </Link>
      </p>
    </header>
  )
}

/* ── 머리기사 ────────────────────────────────────────────────────────── */

function Featured({ row }) {
  if (!row) return null

  return (
    <section aria-labelledby="featured-heading">
      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className="relative flex min-h-[280px] items-end overflow-hidden rounded-xl shadow-sm md:min-h-[360px]"
      >
        {/* 사진 대신 그라디언트 + 격자. 특정 기사 위에 교량 사진을 깔면 그 사진이
            그 기사의 교량으로 읽힌다 (랜딩 히어로와 같은 판단). */}
        <div
          className="bg-grid-pattern absolute inset-0"
          style={{
            backgroundColor: '#031635',
            backgroundImage: 'linear-gradient(115deg, #031635 0%, #1a2b4b 55%, #364768 100%)',
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex w-full flex-col gap-sm p-lg md:w-3/4">
          <span className={`w-max rounded-full px-3 py-1 text-label-md font-bold ${toneFor(row.tag)}`}>
            [{row.tag}] {row.tagHint}
          </span>
          <h2 id="featured-heading" className="text-[22px] leading-8 font-semibold text-on-primary md:text-headline-lg">
            {row.title}
          </h2>
          {row.description && (
            <p className="line-clamp-2 max-w-2xl text-body-md text-on-primary/80">
              {excerptSentences(row.description)}
            </p>
          )}
          <p className="mt-xs flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-on-primary/70">
            <span>{row.publisher ?? '언론사 미표기'}</span>
            <span aria-hidden="true">·</span>
            <span>{row.category}</span>
            <span aria-hidden="true">·</span>
            <span>{row.published_at ? formatDate(row.published_at) : '발표일 미표기'}</span>
          </p>
        </div>
      </a>
      {/* 왜 이 기사가 맨 위인지 밝힌다. 우리가 중요도를 판정한 것이 아니다. */}
      <p className="mt-2 text-caption text-on-surface-variant">
        말머리가 [긴급]·[공지]인 기사를 먼저, 그다음 발표일 최신순으로 둡니다. 저희가 중요도를 매긴
        것이 아닙니다.
      </p>
    </section>
  )
}

/* ── 사이드바 ────────────────────────────────────────────────────────── */

/** 이 목록을 만든 검색어. bridge_news.query 에 수집 당시 검색어가 남는다. */
function Queries({ rows }) {
  const counts = new Map()
  for (const row of rows) {
    const key = row.query?.trim()
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <SideCard icon="search" title="이 목록을 만든 검색어">
      {entries.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          수집 당시 검색어가 기록되지 않은 기사들입니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-sm">
          {entries.map(([query, count]) => (
            <li key={query} className="flex items-baseline justify-between gap-2">
              <span className="text-body-md text-on-surface">{query}</span>
              <span className="shrink-0 text-caption text-on-surface-variant">{count}건</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-sm text-caption text-on-surface-variant">
        이 검색어로 걸리지 않은 기사는 목록에 없습니다.
      </p>
    </SideCard>
  )
}

/** 말머리·카테고리를 붙일 때 실제로 걸린 낱말. 우리 분류의 근거다. */
function MatchedWords({ rows }) {
  const counts = new Map()
  for (const row of rows) {
    for (const word of row.matched ?? []) counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)

  return (
    <SideCard icon="info" title="분류에 걸린 낱말">
      {entries.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          제목·요약에서 분류 낱말이 걸리지 않아 전부 ‘기타’로 두었습니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {entries.map(([word, count]) => (
            <span
              key={word}
              className="rounded-full bg-surface-container px-3 py-1 text-caption text-on-surface-variant"
            >
              {word} {count}
            </span>
          ))}
        </div>
      )}
      {/* 디자인의 '실시간 주요 키워드'와 다른 것임을 분명히 적는다. */}
      <p className="mt-sm text-caption text-on-surface-variant">
        인기 순위가 아닙니다. 제목·요약에 실제로 있던 낱말이며, 이 낱말이 말머리와 카테고리를
        결정했습니다.
      </p>
    </SideCard>
  )
}

function SideCard({ icon, title, children }) {
  return (
    <section className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-md shadow-sm">
      <h2 className="mb-sm flex items-center gap-xs text-body-lg font-semibold text-primary">
        <Icon name={icon} size={18} />
        {title}
      </h2>
      {children}
    </section>
  )
}

/* ── 수집 전 ─────────────────────────────────────────────────────────── */

function NotCollectedYet() {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-unknown-bg text-unknown-fg">
        <Icon name="minus-circle" size={28} />
      </span>
      <h2 className="text-[20px] leading-7 font-bold text-primary">아직 수집된 기사가 없습니다.</h2>
      <p className="mt-2 text-[15px] leading-[24px] text-on-surface-variant">
        기사 제목과 날짜는 지어낼 수 없어 목록을 비워 두었습니다. 네이버 검색 키를 넣고 수집 라우트가
        한 번 돌면 여기에 채워집니다. 화면이 비어 있는 것은 교량에 관한 보도가 없다는 뜻이 아닙니다.
      </p>
      <Link
        href="/info"
        className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-medium text-accent hover:underline"
      >
        <Icon name="info" size={16} />
        어떤 데이터를 쓰는지 보기
      </Link>
    </section>
  )
}
