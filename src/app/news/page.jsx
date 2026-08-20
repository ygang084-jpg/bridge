import Link from 'next/link'
import Image from 'next/image'
import Icon from '@/components/Icon'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import NewsDisclaimer from '@/components/news/NewsDisclaimer'
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

/** fetchBridgeNews 의 기본값과 같다. 뉴스 목록은 이 화면에만 있다. */
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
 *   · 히어로 배경 사진 → 디자인의 사진은 외부(Google) 주소여서 쓸 수 없다.
 *     저장소의 사진(public/backgrounds/evening.png)을 같은 방식(짙은 남색
 *     그라디언트를 덮는 것)으로 깔고, **이 기사와 무관한 이미지**라고 캡션에
 *     적었다. 적지 않으면 그 사진이 기사의 교량으로 읽힌다.
 *   · 조회수 '2,451' → 조회수를 세지 않는다. 없는 숫자는 적지 않는다.
 *   · 기사 썸네일 → 네이버 뉴스 검색 API 는 이미지를 주지 않는다. 자리는 두되
 *     사진이 아니라 도형이라는 게 보이게 두었다 (NewsExplorer 의 RowTile).
 *   · 사이드바 '많이 읽은 뉴스' 5위 → 조회수가 없으므로 인기 순위를 만들 수 없다.
 *     같은 번호 목록 모양에 **발표일 최신 5건**을 넣고 제목도 그렇게 적었다.
 *   · 사이드바 '실시간 주요 키워드' → 인기를 측정하지 않는다. 같은 해시태그 칩
 *     모양에 말머리·카테고리를 붙일 때 **실제로 걸린 낱말**을 넣었다. 우리 분류의
 *     근거 공개다.
 *   · 항목의 기관명(국토교통부 · 안전관리공단 · 행정안전부) → 우리가 가진 값은
 *     링크 호스트명에서 뽑은 **언론사**다. 기관명으로 적으면 기사가 정부 발표로
 *     읽히고, 그 순간 언론 보도가 공식 기록으로 격상된다.
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

        {/* 기사가 없어도 화면 골격은 그대로 두고, 각 자리에 왜 비어 있는지 적는다
            (CLAUDE.md — 값이 없을 때 자리를 남기고 이유를 쓴다). 안내 한 장으로
            화면을 대체하면 만들어지지 않은 화면으로 읽힌다.
            다만 칩 필터는 비어 있을 때 아예 만들지 않는다 — 고를 것이 없는데
            누를 수 있게 두면 눌러도 아무 일이 없는 조작이 된다. */}
        {featured ? <Featured row={featured} /> : <FeaturedEmpty />}

        <div className="flex w-full flex-col gap-xl lg:flex-row">
          <div className="w-full lg:w-3/4">
            {rows.length === 0 ? <NotCollectedYet /> : <NewsExplorer rows={rest} />}
          </div>
          <aside className="flex w-full flex-col gap-md lg:w-1/4">
            <RecentList rows={rows} />
            <MatchedWords rows={rows} />
            <Queries rows={rows} />
          </aside>
        </div>

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
      {/* 목록이 왜 계속 비어 있는지 적는다. '수집 전'만 두면 곧 채워질 것으로
          읽히는데, 지금은 출처가 연결되지 않아 스케줄러가 돌아도 채워지지 않는다. */}
      {count === 0 && (
        <p className="mt-2 max-w-3xl text-body-md text-on-surface-variant">
          지금은 기사 출처가 연결되지 않아 목록이 비어 있습니다. 네이버 뉴스 검색 API 의 신규 발급
          창구가 바뀌어(NAVER API HUB) 기존 키로는 호출이 거부됩니다. 연결되면 이 자리에 기사가
          채워지고, 출처와 갱신 주기는{' '}
          <Link href="/info" className="font-semibold text-primary underline hover:no-underline">
            앱안내
          </Link>
          에 적습니다.
        </p>
      )}
    </header>
  )
}

/* ── 머리기사 ────────────────────────────────────────────────────────── */

/**
 * 히어로 배경. 디자인은 석양의 교량 사진 위에 아래에서 위로 짙어지는 남색
 * 그라디언트를 덮었다. 그 사진은 외부(Google) 주소라 쓸 수 없어, 저장소에 있는
 * 사진(public/backgrounds/evening.png)을 같은 방식으로 깐다.
 *
 * 사진이 기사와 무관하다는 것을 화면에 적는다(아래 캡션). 적지 않으면 머리기사
 * 위의 사진이 그 기사의 교량으로 읽히고, 이 제품에서 그건 오정보다.
 */
function HeroBackdrop() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Image
        src="/backgrounds/evening.png"
        alt=""
        fill
        sizes="100vw"
        priority={false}
        className="object-cover"
      />
      {/* 디자인의 from-primary/90 via-primary/50 to-transparent 를 그대로 쓴다.
          글자가 얹히는 아래쪽이 가장 짙어야 대비가 확보된다. */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-primary/20" />
    </div>
  )
}

function Featured({ row }) {
  if (!row) return null

  return (
    <section aria-labelledby="featured-heading">
      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className="relative flex h-[400px] items-end overflow-hidden rounded-xl shadow-sm md:h-[500px]"
      >
        <HeroBackdrop />
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
      {/* 왜 이 기사가 맨 위인지, 그리고 배경 사진이 무엇인지 밝힌다. 둘 다 적지
          않으면 '우리가 고른 중요한 소식'과 '그 기사의 교량 사진'으로 읽힌다. */}
      <p className="mt-2 text-caption text-on-surface-variant">
        말머리가 [긴급]·[공지]인 기사를 먼저, 그다음 발표일 최신순으로 둡니다. 저희가 중요도를 매긴
        것이 아닙니다. 배경 사진은 이 기사와 무관한 이미지입니다.
      </p>
    </section>
  )
}

/**
 * 머리기사 자리가 비어 있을 때. 같은 크기·같은 바탕을 두고 이유만 적는다.
 * 링크를 걸지 않는다 — 갈 곳이 없는데 누를 수 있게 두면 고장으로 읽힌다.
 */
function FeaturedEmpty() {
  return (
    <section className="relative flex h-[400px] items-end overflow-hidden rounded-xl shadow-sm md:h-[500px]">
      {/* 기사가 있을 때와 같은 배경을 쓴다. 비어 있을 때만 다르게 보이면
          '아직 안 만든 화면'으로 읽힌다. */}
      <HeroBackdrop />
      <div className="relative z-10 flex w-full flex-col gap-sm p-lg md:w-3/4">
        <span className="flex w-max items-center gap-1.5 rounded-full bg-on-primary/15 px-3 py-1 text-label-md font-bold text-on-primary">
          <Icon name="minus-circle" size={16} />
          머리기사 자리
        </span>
        <p className="max-w-2xl text-body-lg text-on-primary/80">
          수집된 기사가 없어 비어 있습니다. 기사가 들어오면 말머리가 [긴급]·[공지]인 것을 먼저,
          그다음 발표일 최신순으로 이 자리에 놓입니다. 저희가 중요도를 매기지 않습니다.
        </p>
        <p className="text-caption text-on-primary/60">배경 사진은 특정 교량이 아닙니다.</p>
      </div>
    </section>
  )
}

/* ── 사이드바 ────────────────────────────────────────────────────────── */

/**
 * 디자인의 '많이 읽은 뉴스' 자리 — 번호 + 제목 5줄.
 *
 * 조회수를 세지 않으므로 인기 순위를 만들 수 없다. 같은 모양에 발표일 최신 5건을
 * 넣고, 제목도 '최근 기사'로 적었다. 순위처럼 보이는 자리에 순위가 아닌 것을 넣을
 * 때는 무엇으로 줄 세운 것인지 이름에 드러나야 한다.
 */
function RecentList({ rows }) {
  const recent = [...rows]
    .sort((a, b) => (Date.parse(b.published_at ?? 0) || 0) - (Date.parse(a.published_at ?? 0) || 0))
    .slice(0, 5)

  return (
    <SideCard icon="clock" title="최근 기사">
      {recent.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">아직 수집된 기사가 없습니다.</p>
      ) : (
        <ol className="flex flex-col gap-sm">
          {recent.map((row, index) => (
            <li key={row.id ?? row.url} className="flex items-start gap-sm">
              <span className="text-body-lg font-bold text-primary">{index + 1}</span>
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 text-body-md text-on-surface transition-colors hover:text-primary"
              >
                {row.title}
              </a>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-sm text-caption text-on-surface-variant">
        조회수 순위가 아닙니다. 발표일이 최신인 순서입니다.
      </p>
    </SideCard>
  )
}

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
          {rows.length === 0
            ? '아직 수집된 기사가 없어 보여줄 검색어가 없습니다.'
            : '수집 당시 검색어가 기록되지 않은 기사들입니다.'}
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
    <SideCard icon="info" title="주요 낱말">
      {entries.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          {rows.length === 0
            ? '아직 수집된 기사가 없어 걸린 낱말이 없습니다.'
            : '제목·요약에서 분류 낱말이 걸리지 않아 전부 ‘기타’로 두었습니다.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {entries.map(([word, count]) => (
            <span
              key={word}
              className="rounded-full bg-surface-container px-3 py-1 text-caption text-on-surface-variant"
            >
              #{word} {count}
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
