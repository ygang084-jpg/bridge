import Link from 'next/link'
import Icon from '@/components/Icon'
import InfoStateBadge from '@/components/InfoStateBadge'
import NearbyPanel from '@/components/NearbyPanel'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { fetchBridgesForList } from '@/lib/supabase/readClient'
import { resolveInfoState } from '@/lib/infoState'

export const metadata = { title: '대시보드 — BRIDGE SAFE' }

/**
 * 한 시간마다 다시 만든다.
 *
 * 이 값이 없으면 Next 는 이 화면을 빌드 시점에 한 번 렌더해 정적 파일로 굳히고
 * 다시 만들지 않는다. 그런데 이 화면의 값은 배포와 무관하게 스케줄러가 채운다
 * (요약 04:10 · 뉴스 05:00 KST). 그러면 기사가 들어오고 교량이 추가돼도 다음
 * 재배포까지 옛 내용이 남는데, 오류도 빈 화면도 아니어서 며칠 전 목록이 정상처럼
 * 보인다 — '기록을 그대로 옮긴다'가 이 제품의 전부인데 옮긴 시점을 알 수 없게 된다.
 *
 * 수집이 하루 한 번이라 한 시간이면 충분히 촘촘하고, 요청마다 Supabase 를 읽지
 * 않으므로 첫 화면 3초 요구(PRD §11)도 그대로 지킨다.
 */
export const revalidate = 3600

/**
 * 메인 대시보드 — Stitch `bridge_safe_9` 구성을 그대로 옮긴 것.
 * 랜딩(/)의 초록 버튼을 누르면 이 화면으로 들어온다.
 * ---------------------------------------------------------------------------
 * 지금 화면 순서 :
 *   TopNav(md 이상) / Hero / 벤토 8:4 (지도 + 교량 검색 | 오늘의 상태) /
 *   내 주변 교량 현황 3열 / BottomNav(md 이하) / Footer
 *
 * 디자인에 있었으나 지금 없는 것 :
 *   · 비상대피경로 카드 — 오안내가 곧 인명 피해다 (PRD §2.2 비목표)
 *   · 이상징후 제보 밴드 — 접수 후 처리 경로가 없다 (같은 비목표)
 *   · 지도 위 '내 주변 교량' 유리 패널 — 지도 영역이 /map 으로 가는 링크가 되었다
 *   · 교량 제원 카드 — 구조 형식·재료를 담을 컬럼이 없어 검토 끝에 뺐다
 *   · 교량 뉴스 목록 — 내비에 '교량뉴스'(/news) 탭이 생겨 그 화면이 제자리다.
 *     대시보드에 발췌를 겹쳐 두면 같은 목록을 두 곳에서 관리하게 된다
 *
 * 화면에 나가는 값은 전부 DB 에서 읽는다. 디자인 파일의 값(준공 2005년,
 * 최근 점검 2026년 3월, 강풍 주의, 갱신 소식 4건 …)은 예시 텍스트라 옮기지 않았다.
 * 실제 교량 이름에 붙은 지어낸 점검 기록은 그대로 쓸 수 없다.
 *
 * 자리는 두고 내용만 사실로 바꾼 곳 — 지어낸 값이 곧 오정보가 되는 지점이다.
 *   ① 오늘의 상태 4타일 '낮음/주의/정상'
 *      → 기준치가 없으면 우리가 위험을 판정하는 것이 된다 (PRD §13 Q2·Q3 미해소).
 *        risk_thresholds 에 출처 있는 기준치가 들어오면 그대로 켜진다
 *   ② 교량 카드의 A/B 등급 칩 → 이력이 있는지 없는지만 보여준다 (F-05)
 *   ③ 건강검진의 '사용연수 28년' → 준공·최근 점검·마지막 보수를 나란히 둔다
 *
 * 그 밖에 '© 2024 국가교량안전기관'은 실재하지 않는 기관이라 쓰지 않았고,
 * 교량 사진은 디자인 파일의 예시 이미지라 자리만 남겼다.
 * ---------------------------------------------------------------------------
 */
export default async function DashboardPage() {
  const data = await loadDashboard()

  return (
    <>
      <TopNav active="home" />

      {/* 좌우 여백: 16px(모바일) → 64px(md 이상). 컨테이너 1280px 에서 본문은
          1152px 가 된다 (globals.css .app-shell 주석 참고).
          상단 내비·뉴스·푸터·상시 고지도 같은 값을 쓴다 — 한 곳만 바꾸면
          선이 어긋난다. */}
      <main className="screen-wide w-full flex-1 space-y-xl px-margin-mobile py-lg md:px-margin-desktop">
        <Hero />

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          {/* 지도와 검색창을 한 칼럼에 둔다 — 검색창이 지도 폭에 맞고, 지도에서
              못 찾을 때 바로 아래에서 이름으로 찾게 된다. */}
          <div className="flex flex-col gap-gutter md:col-span-8">
            {/* 지도와 검색창을 한 클라이언트 컴포넌트가 감싼다 — '현재 위치'로 얻은
                좌표를 지도가 써야 하고, 그 좌표는 브라우저를 벗어나지 않는다. */}
            <NearbyPanel mapPoints={data.mapPoints} searchIndex={data.searchIndex} />
          </div>
          <div className="md:col-span-4">
            <TodayCard todayHref={data.featured ? `/bridges/${data.featured.id}/today` : null} />
          </div>
        </div>

        <NearbySection bridges={data.cards} loadFailed={data.loadFailed} />
      </main>

      <BottomNav active="home" />

      <AppFooter />
    </>
  )
}

/* ── 데이터 ──────────────────────────────────────────────────────────── */

const MAX_CARDS = 3 // 디자인의 '내 주변 교량 현황' 3열에 맞춘다

async function loadDashboard() {
  let list
  try {
    list = await fetchBridgesForList()
  } catch {
    return {
      loadFailed: true,
      cards: [],
      featured: null,
      searchIndex: [],
      mapPoints: [],
    }
  }
  if (!list.available) {
    return {
      loadFailed: true,
      cards: [],
      featured: null,
      searchIndex: [],
      mapPoints: [],
    }
  }

  // 대표 교량을 고르는 기준은 공개 기록 건수뿐이다. 좋다/나쁘다를 판정하는
  // 규칙을 쓰면 그 순간 우리가 평가하는 것이 된다. 동수면 이름 순으로 고정한다.
  const scored = list.bridges
    .map((bridge) => ({ bridge, info: resolveInfoState(bridge.history) }))
    .sort(
      (a, b) =>
        b.info.recordCount - a.info.recordCount ||
        (a.bridge.name ?? '').localeCompare(b.bridge.name ?? '', 'ko'),
    )
    .slice(0, MAX_CARDS)

  // 건강검진·타임머신이 '내 교량' 화면으로 옮겨가면서 이 화면에는 교량별 이력
  // 원본이 필요하지 않게 되었다. 목록 조회 한 번으로 끝난다 — 이전에는 카드마다
  // 상세를 한 번씩 더 불렀다.
  const cards = scored.map(({ bridge, info }) => ({
    id: bridge.id,
    name: bridge.name,
    address: bridge.address ?? null,
    infoState: info.state,
    infoLabel: info.label,
    recordCount: info.recordCount,
  }))

  const featured = cards.find((card) => card.recordCount > 0) ?? cards[0] ?? null

  return {
    loadFailed: false,
    cards,
    featured,
    // 검색은 카드 3장이 아니라 등록된 교량 전체에서 찾는다.
    // 이름·소재지만 내려보낸다 — 검색에 쓰지 않는 값을 브라우저로 보낼 이유가 없다.
    searchIndex: list.bridges.map((bridge) => ({
      id: bridge.id,
      name: bridge.name,
      address: bridge.address ?? null,
    })),
    // 지도 미리보기도 카드 3장이 아니라 등록된 교량 전체를 찍는다. 마커에 필요한
    // 값만 내려보낸다 — 이름은 마커의 title(마우스를 올렸을 때)에 쓴다.
    mapPoints: list.bridges
      .filter((bridge) => typeof bridge.lat === 'number' && typeof bridge.lng === 'number')
      .map((bridge) => ({
        id: bridge.id,
        name: bridge.name,
        lat: bridge.lat,
        lng: bridge.lng,
      })),
  }
}

/* ── 섹션 ────────────────────────────────────────────────────────────── */

/**
 * 제목을 한 줄로 둔다. 줄바꿈을 막는 폭은 화면 크기별로 계산해서 정했다 —
 * 이 문장은 한글 14자 + 공백·부호로 약 16.2em 이라, 글자 크기에 그대로 비례해
 * 폭이 정해진다. 본문 폭은 컨테이너에서 좌우 여백을 뺀 값이다.
 *
 *   lg (1024px) : 본문 896px, 48px 글자 → 약 778px  ✓
 *   xl (1280px) : 본문 1152px, 56px 글자 → 약 907px ✓
 *
 * 그보다 좁은 화면에서는 nowrap 을 걸지 않는다. 걸면 문장이 화면을 넘어가
 * 가로 스크롤이 생기고, 그건 한 줄로 보이는 것보다 나쁘다 (랜딩 히어로도 같은
 * 이유로 md 이상에서만 한 줄로 고정한다).
 */
function Hero() {
  return (
    <section className="space-y-sm text-center">
      <h1 className="text-[32px] leading-10 font-bold text-primary md:text-[40px] md:leading-[48px] lg:text-display-lg lg:whitespace-nowrap xl:text-[56px] xl:leading-[64px]">
        내가 건너는 다리, 오늘은 괜찮을까?
      </h1>
      <p className="text-body-lg text-on-surface-variant">
        공개된 관리 기록과 오늘의 조건을 한곳에서 확인하세요.
      </p>
    </section>
  )
}

/** 디자인의 4타일 그대로. 값만 지어내지 않는다 (§13 Q2·Q3). */
const TODAY_TILES = [
  { emoji: '🌧️', label: '강수량' },
  { emoji: '🌬️', label: '강풍' },
  { emoji: '❄️', label: '결빙' },
  { emoji: '🌊', label: '하천수위' },
]

function TodayCard({ todayHref }) {
  return (
    <div className="flex-1 rounded-xl border border-outline-variant bg-surface-container-low p-md shadow-sm">
      <h2 className="flex items-center gap-xs text-headline-md text-primary">
        <Icon name="cloud-sun" size={20} />
        오늘의 교량 안전
      </h2>
      {/* 어느 지역 관측인지 제목 옆에 밝힌다. 지역을 적지 않으면 사용자는 자기
          위치의 값으로 읽는데, 실제로는 서울 관측 지점 하나를 쓴다. */}
      <p className="mt-1 mb-md flex items-center gap-1 text-caption text-on-surface-variant">
        <Icon name="map-pin" size={14} />
        서울특별시 기준
      </p>

      <div className="mb-md grid grid-cols-2 gap-sm">
        {TODAY_TILES.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-sm text-center"
          >
            <span className="mb-1 text-2xl" aria-hidden="true">
              {tile.emoji}
            </span>
            <span className="text-xs text-on-surface-variant">{tile.label}</span>
            {/* 네 타일이 모두 같은 모양·같은 색이다. 하나만 색을 달리 쓰면
                그 항목을 우리가 '주의'로 판정한 것이 된다. */}
            <span className="text-sm font-bold text-on-surface-variant">표시 준비 중</span>
          </div>
        ))}
      </div>

      <div className="flex items-start rounded-lg bg-primary-container p-sm text-sm text-on-primary">
        <Icon name="info" size={16} className="mt-0.5 mr-2 text-primary-fixed" />
        <p>
          서울 관측 지점의 값을 어떤 기준치와 비교해 표시할지가 아직 정해지지 않았습니다. 기준치를
          저희가 임의로 정하면 그 순간 저희가 위험을 판정하는 것이 됩니다.
        </p>
      </div>

      {todayHref && (
        <Link
          href={todayHref}
          className="mt-sm inline-flex min-h-[44px] items-center gap-1.5 text-label-md text-accent hover:underline"
        >
          <Icon name="info" size={16} />
          무엇이 준비되면 표시되는지 보기
        </Link>
      )}
    </div>
  )
}


function NearbySection({ bridges, loadFailed }) {
  return (
    <section>
      <h2 className="mb-md flex items-center gap-xs text-headline-md text-primary">
        <Icon name="eye" size={20} />
        내 주변 교량 현황
      </h2>

      {loadFailed || bridges.length === 0 ? (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
          <p className="text-body-md text-on-surface-variant">
            교량 목록을 불러오지 못했습니다. 화면이 비어 있는 것은 교량이 없다는 뜻이 아니라, 지금
            데이터를 읽지 못했다는 뜻입니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {bridges.map((bridge) => (
            <Link
              key={bridge.id}
              href={`/bridges/${bridge.id}`}
              className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm transition-colors hover:border-outline"
            >
              {/* 디자인의 사진 자리. 예시 이미지였고 교량 사진을 갖고 있지 않다. */}
              <div className="flex h-24 items-center justify-center bg-surface-variant text-on-surface-variant">
                <Icon name="building" size={28} />
              </div>
              <div className="flex items-center justify-between gap-2 p-sm">
                <span className="min-w-0 truncate text-base font-bold text-primary">
                  {bridge.name}
                </span>
                {/* 등급이 아니라 이력이 있는지 없는지만 보여준다. 등급은 그 시점
                    점검의 판정 결과라 카드에서 교량의 속성처럼 읽히고, 법정 정의도
                    아직 확인하지 못했다. 여기서 알아야 할 것은 '들어가면 볼 기록이
                    있는가'다. */}
                <InfoStateBadge state={bridge.infoState} label={bridge.infoLabel} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
