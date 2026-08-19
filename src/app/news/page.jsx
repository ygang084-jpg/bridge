import Link from 'next/link'
import NewsBoard from '@/components/NewsBoard'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { fetchBridgeNews } from '@/lib/supabase/readClient'
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
 * '교량뉴스' 화면.
 * ---------------------------------------------------------------------------
 * 내비의 '기록' 자리를 대신한다. '기록'은 대표 교량 하나의 관리 이력으로 가는
 * 지름길이었는데, 어느 교량을 대표로 삼을지를 우리가 골라야 했고 교량 데이터가
 * 없으면 늘 비활성이었다. 관리 이력의 제자리는 교량 상세 안이다
 * (`/bridges/[id]/history` — 상세의 요약 카드에서 들어간다).
 *
 * 목록 렌더링은 `NewsBoard` 가 한다. 대시보드의 발췌와 같은 컴포넌트다.
 *
 * 기사를 특정 교량에 붙이지 않는다. 제목에 교량명이 들어 있다는 것만으로 그
 * 교량의 상태를 말할 수는 없고, 붙이면 '뉴스에 났다 = 그 다리가 위험하다'로
 * 읽힌다 (`0003_bridge_news.sql` 주석에 같은 이유가 적혀 있다). 그래서 이
 * 화면에는 교량별 필터가 없다.
 * ---------------------------------------------------------------------------
 */
export default async function NewsPage() {
  const news = await fetchBridgeNews(NEWS_LIMIT)
  const refreshedAt = cronTextFor(vercelConfig?.crons, '/api/cron/refresh-news')

  return (
    <>
      <TopNav active="news" />

      <main className="screen-wide relative z-10 flex w-full flex-1 flex-col py-xl">
        <header className="mb-md w-full px-margin-mobile md:px-margin-desktop">
          <h1 className="mb-3 text-[24px] leading-8 font-semibold text-primary md:text-headline-lg">
            교량뉴스
          </h1>
          <p className="max-w-3xl text-body-lg text-on-surface-variant">
            교량에 대한 언론 보도를 모아 둔 목록입니다. <strong className="font-semibold">공식 기록이
            아닙니다.</strong> 기사를 특정 교량에 붙이지 않습니다 — 제목에 교량 이름이 있다는 것만으로
            그 교량의 상태를 말할 수는 없기 때문입니다.
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {/* 갱신 주기는 vercel.json 에서 파생시킨다. 손으로 적으면 스케줄을 바꿀 때 어긋난다. */}
            수집 주기 {refreshedAt ?? '확인할 수 없습니다'} ·{' '}
            <Link href="/info" className="font-semibold text-primary underline hover:no-underline">
              출처와 분류 방식
            </Link>
          </p>
        </header>

        {/* available 이 false 여도 items 는 빈 배열이므로, 목록 자리에서 '수집 전'을
            그대로 보여준다. 여기서 오류 화면으로 갈라놓으면 '아직 수집되지 않음'과
            '읽지 못함'이 같은 모양으로 보인다 — 문구는 NewsBoard 가 구별해 적는다. */}
        <NewsBoard
          items={news.items}
          limit={NEWS_LIMIT}
          heading="언론 보도"
          className="w-full px-margin-mobile md:px-margin-desktop"
        />
      </main>

      <AppFooter />
      <BottomNav active="news" />
    </>
  )
}
