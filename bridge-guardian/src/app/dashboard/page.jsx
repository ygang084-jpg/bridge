import Link from 'next/link'
import Icon from '@/components/Icon'
import InfoStateBadge from '@/components/InfoStateBadge'
import BridgeSearch from '@/components/BridgeSearch'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import {
  fetchBridgeDetail,
  fetchBridgeNews,
  fetchBridgesForList,
} from '@/lib/supabase/readClient'
import { resolveInfoState } from '@/lib/infoState'
import { buildTimeline, summarizeManagement } from '@/lib/history'
import { arrangeNews, classifyNews, excerptSentences } from '@/lib/news/classify.js'
import { normalizeSafetyGrade } from '@/lib/summary'

export const metadata = { title: '대시보드 — BRIDGE SAFE' }

/**
 * 메인 대시보드 — Stitch `bridge_safe_9` 구성을 그대로 옮긴 것.
 * 랜딩(/)의 초록 버튼을 누르면 이 화면으로 들어온다.
 * ---------------------------------------------------------------------------
 * 섹션 순서·칼럼 분할·카드 모양·상하단 내비게이션 모두 디자인 파일을 따랐다.
 *   TopNavBar(hidden md:block) / Hero(중앙) / 벤토 8:4 (지도 + 오늘의 안전 +
 *   비상대피경로) / 내 주변 교량 현황 3열 / 건강검진·타임머신 2열 /
 *   이상징후 제보 밴드 / BottomNavBar(md:hidden) / 데이터 갱신 / Footer
 *
 * 화면에 나가는 값은 전부 DB 에서 읽는다. 디자인 파일의 값(준공 2005년,
 * 최근 점검 2026년 3월, 강풍 주의, 갱신 소식 4건 …)은 예시 텍스트라 옮기지 않았다.
 * 실제 교량 이름에 붙은 지어낸 점검 기록은 그대로 쓸 수 없다.
 *
 * 디자인의 자리는 그대로 두고 내용만 사실로 바꾼 곳 — 지어낸 값이 곧 오정보가
 * 되는 네 군데다. 각 자리에 왜 비어 있는지가 적혀 있다.
 *   ① 오늘의 교량 안전 4타일 '낮음/주의/정상'
 *      → 기준치가 없으면 우리가 위험을 판정하는 것이 된다 (PRD §13 Q2·Q3 미해소).
 *        risk_thresholds 에 출처 있는 기준치가 들어오면 그대로 켜진다
 *   ② '현재 공개정보 기준 특별한 통행 제한 없음'
 *      → bridge_restrictions 가 비어 있다. 근거 없는 '제한 없음'은 가장 위험한
 *        거짓말이다 — 없는 정보를 안전 신호로 바꿔 읽히게 한다
 *   ③ 비상대피경로 '대피경로 확인' 버튼
 *      → 오안내가 곧 인명 피해다. 카드는 남기고 버튼은 비활성으로 둔다
 *   ④ '제보된 사진은 AI가 1차 분류하여 담당 기관에 전달됩니다'
 *      → 전달 경로가 없고 AI 도 쓰지 않는다. 밴드는 남기고 문구를 사실로 바꿨다
 *
 * 그 밖에 '© 2024 국가교량안전기관'은 실재하지 않는 기관이라 쓰지 않았고,
 * 교량 사진은 디자인 파일의 예시 이미지라 자리만 남겼다.
 * ---------------------------------------------------------------------------
 */
export default async function DashboardPage() {
  // 뉴스는 교량 데이터와 서로 기다릴 필요가 없다.
  const [data, news] = await Promise.all([loadDashboard(), fetchBridgeNews()])
  // 대표 교량이 없으면 '기록'으로 갈 곳이 없다. 억지로 목록을 가리키면
  // 내비의 '기록' 항목이 실제와 다른 곳으로 데려간다.
  const historyHref = data.featured ? `/bridges/${data.featured.id}/history` : null

  return (
    <>
      <TopNav active="home" historyHref={historyHref} />

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
            <MapArea />
            <BridgeSearch bridges={data.searchIndex} />
          </div>
          <div className="flex flex-col gap-gutter md:col-span-4">
            <TodayCard todayHref={data.featured ? `/bridges/${data.featured.id}/today` : null} />
            <SpecCard featured={data.featured} />
          </div>
        </div>

        <NearbySection bridges={data.cards} loadFailed={data.loadFailed} />

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
          <HealthCard featured={data.featured} />
          <TimeMachineCard featured={data.featured} />
        </div>

      </main>

      <BottomNav active="home" historyHref={historyHref} />

      <NewsSection items={news.items} fetchedAt={data.fetchedAt} sources={data.sources} />

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
    return { loadFailed: true, cards: [], sources: [], fetchedAt: null, featured: null, searchIndex: [] }
  }
  if (!list.available) {
    return { loadFailed: true, cards: [], sources: [], fetchedAt: null, featured: null, searchIndex: [] }
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

  // 카드마다 이력 원본이 필요하다(등급·점검·보수 시점). 목록 조회는 종류와
  // 날짜만 내려주기 때문이다. 질의 수는 카드 수(3)로 묶여 있다.
  const cards = await Promise.all(
    scored.map(async ({ bridge, info }) => {
      const detail = await fetchBridgeDetail(bridge.id).catch(() => null)
      const management = summarizeManagement(detail?.history ?? [])
      return {
        id: bridge.id,
        name: bridge.name,
        address: bridge.address ?? null,
        completedYear: bridge.completed_year ?? null,
        facilityType: bridge.facility_type ?? null,
        facilityClass: bridge.facility_class ?? null,
        lengthM: bridge.length_m ?? null,
        infoState: info.state,
        infoLabel: info.label,
        recordCount: info.recordCount,
        grade: latestGrade(detail?.history ?? []),
        lastInspectionYearMonth: management.lastInspectionYearMonth,
        lastRepairYearMonth: management.lastRepairYearMonth,
        lastRepairType: management.lastRepair?.event_type ?? null,
        history: detail?.history ?? [],
      }
    }),
  )

  const featured = cards.find((card) => card.recordCount > 0) ?? cards[0] ?? null

  return {
    loadFailed: false,
    cards,
    sources: [...new Set(list.bridges.map((bridge) => bridge.source).filter(Boolean))],
    fetchedAt: list.fetchedAt,
    featured: featured ? { ...featured, timeline: buildTimeline(featured.history) } : null,
    // 검색은 카드 3장이 아니라 등록된 교량 전체에서 찾는다.
    // 이름·소재지만 내려보낸다 — 검색에 쓰지 않는 값을 브라우저로 보낼 이유가 없다.
    searchIndex: list.bridges.map((bridge) => ({
      id: bridge.id,
      name: bridge.name,
      address: bridge.address ?? null,
    })),
  }
}

/** 가장 최근 점검의 안전등급. 등급이 붙은 기록이 없으면 null. */
function latestGrade(history) {
  const graded = history
    .filter((row) => normalizeSafetyGrade(row.safety_grade))
    .sort((a, b) => String(b.occurred_on).localeCompare(String(a.occurred_on)))
  return graded.length > 0 ? normalizeSafetyGrade(graded[0].safety_grade) : null
}

/* ── 섹션 ────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="space-y-sm text-center">
      <h1 className="text-[32px] leading-10 font-bold text-primary md:text-display-lg lg:text-[56px] lg:leading-[64px]">
        내가 건너는 다리, 오늘은 괜찮을까?
      </h1>
      <p className="text-body-lg text-on-surface-variant">
        공개된 관리 기록과 오늘의 조건을 한곳에서 확인하세요.
      </p>
    </section>
  )
}

/** 지도 자리. 영역 전체가 지도 화면으로 가는 링크다. 칼럼 폭은 부모가 정한다. */
function MapArea() {
  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border border-outline-variant shadow-sm">
      <Link
        href="/map"
        aria-label="지도 화면으로 이동"
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-variant text-on-surface-variant transition-colors hover:bg-surface-dim"
      >
        <Icon name="map" size={28} />
        <span className="flex items-center gap-1.5">
          지도 화면으로 이동
          <Icon name="chevron-right" size={16} />
        </span>
        <span className="text-sm">지도 렌더링은 v1 에서 도입합니다</span>
      </Link>
    </div>
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
      <h2 className="mb-md flex items-center gap-xs text-headline-md text-primary">
        <Icon name="cloud-sun" size={20} />
        오늘의 교량 안전
      </h2>

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
          관측값을 어떤 기준치와 비교해 표시할지가 아직 정해지지 않았습니다. 기준치를 저희가 임의로
          정하면 그 순간 저희가 위험을 판정하는 것이 됩니다.
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

/**
 * 교량 제원 — 어떤 재료로, 어떤 구조 형식으로 지었는지.
 *
 * 구조 형식(아치교·트러스교·사장교 …)과 사용 재료는 지금 DB 에 담을 칸이
 * 없다. `bridges` 에 있는 것은 시설물 종류(콘크리트교·강교), 종별, 연장뿐이다.
 * 시설물 종류가 재료를 짐작하게 하지만 구조 형식과는 다른 값이므로,
 * 있는 값을 구조 형식 자리에 옮겨 적지 않고 빈 칸으로 둔다.
 * 공공데이터 응답에 어떤 필드로 오는지가 §13 Q2 에서 정해지면 채워진다.
 */
function SpecCard({ featured }) {
  if (!featured) return <EmptyPanel title="교량 제원" icon="building" />

  const rows = [
    { label: '구조 형식', value: null, hint: '아치교 · 트러스교 · 사장교 등' },
    { label: '사용 재료', value: null, hint: '강재 · 콘크리트 등' },
    { label: '시설물 종류', value: featured.facilityType },
    { label: '종별', value: featured.facilityClass },
    { label: '연장', value: featured.lengthM ? `${featured.lengthM}m` : null },
    { label: '준공', value: featured.completedYear ? `${featured.completedYear}년` : null },
  ]

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <h2 className="mb-sm flex items-center gap-xs text-headline-md text-primary">
        <Icon name="building" size={20} />
        교량 제원
      </h2>
      <p className="mb-md text-sm text-on-surface-variant">{featured.name}</p>

      <dl className="flex flex-col">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex items-start justify-between gap-3 py-2 text-sm ${
              index < rows.length - 1 ? 'border-b border-outline-variant/30' : ''
            }`}
          >
            <dt className="shrink-0 text-on-surface-variant">
              {row.label}
              {row.hint && (
                <span className="mt-0.5 block text-xs text-on-surface-variant/70">{row.hint}</span>
              )}
            </dt>
            <dd
              className={`text-right ${
                row.value ? 'font-medium text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              {row.value ?? '공개 정보 없음'}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-sm text-xs leading-[18px] text-on-surface-variant">
        구조 형식과 사용 재료는 아직 받아 오는 값이 없습니다. 시설물 종류를 그 자리에 옮겨 적지
        않았습니다 — 다른 값입니다.
      </p>
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

function HealthCard({ featured }) {
  if (!featured) return <EmptyPanel title="교량 건강검진" icon="heart-pulse" />

  const tiles = [
    { label: '최근 점검', has: Boolean(featured.lastInspectionYearMonth), icon: 'check-circle' },
    { label: '보수이력', has: Boolean(featured.lastRepairYearMonth), icon: 'wrench' },
    { label: '안전등급', has: Boolean(featured.grade), icon: 'file-text' },
    { label: '통행정보', has: false, icon: 'car' },
  ]

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <h2 className="mb-md flex items-center gap-xs text-headline-md text-primary">
        <Icon name="heart-pulse" size={20} />
        교량 건강검진
      </h2>

      <div className="mb-md flex items-center gap-md rounded-lg bg-surface-container-low p-md">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary">
          <Icon name="building" size={28} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-primary">{featured.name}</h3>
          {/* 디자인은 '사용연수 28년'을 크게 뽑았다. 연수만 크게 보이면
              '오래됨 = 위험함'으로 읽히므로 준공·점검·보수를 한 줄에 함께 둔다. */}
          <p className="text-sm text-on-surface-variant">
            준공 {featured.completedYear ? `${featured.completedYear}년` : '정보 없음'} · 최근 점검{' '}
            {featured.lastInspectionYearMonth ?? '정보 없음'} · 마지막 보수{' '}
            {featured.lastRepairYearMonth ?? '정보 없음'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-xs text-center">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-surface-container p-sm">
            <Icon
              name={tile.has ? tile.icon : 'minus-circle'}
              size={20}
              className="mx-auto mb-1 text-on-surface-variant"
            />
            <div className="text-xs text-on-surface">{tile.label}</div>
          </div>
        ))}
      </div>

      <p className="mt-sm text-xs leading-[18px] text-on-surface-variant">
        아이콘은 공개된 기록이 있는지만 나타냅니다. 상태가 좋다·나쁘다는 판정이 아닙니다.
      </p>
    </div>
  )
}

/** 디자인의 '교량 타임머신' — 가로 타임라인. 노드는 실제 이력에서 만든다. */
const EVENT_EMOJI = { 준공: '🏗️', 보수: '🛠️', 보강: '🛠️' }

function TimeMachineCard({ featured }) {
  const items = featured?.timeline?.items ?? []
  if (items.length === 0) return <EmptyPanel title="교량 타임머신" icon="clock" />
  const historyHref = `/bridges/${featured.id}/history`

  // 가로 타임라인은 오래된 것이 왼쪽이어야 읽힌다. buildTimeline 은 최신이 위다.
  const ordered = [...items].reverse()

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <h2 className="mb-md flex items-center gap-xs text-headline-md text-primary">
        <Icon name="clock" size={20} />
        교량 타임머신
      </h2>

      <div className="relative mt-md flex min-w-[500px] items-start py-sm">
        <div
          className="absolute top-4 right-0 left-0 z-0 h-1 bg-outline-variant/30"
          aria-hidden="true"
        />
        {ordered.map((item, index) => {
          const latest = index === ordered.length - 1
          return (
            <div key={item.id ?? item.occurred_on} className="relative z-10 flex-1 text-center">
              <div
                className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full ${
                  latest
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'border-2 border-primary bg-surface-container-lowest'
                }`}
              >
                <span aria-hidden="true" className="text-sm">
                  {EVENT_EMOJI[item.event_type] ?? '🔍'}
                </span>
              </div>
              <div className={`text-xs font-bold ${latest ? 'text-primary' : ''}`}>
                {item.date?.year}
              </div>
              <div className={`text-xs ${latest ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
                {item.event_type ?? '기타'}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-sm text-xs leading-[18px] text-on-surface-variant">
        {featured.name} · 공개된 기록 {items.length}건. 노드 사이 간격은 실제 기간과 비례하지
        않습니다.
      </p>

      <Link
        href={historyHref}
        className="mt-sm inline-flex min-h-[44px] items-center gap-1.5 text-label-md text-accent hover:underline"
      >
        <Icon name="clock" size={16} />
        관리 이력 전체 보기
      </Link>
    </div>
  )
}

/**
 * 교량 뉴스 — 공지사항 게시판 형식.
 * ---------------------------------------------------------------------------
 * 출처는 네이버 뉴스 검색 API 이고, 스케줄러가 bridge_news 에 채운 것을 읽는다
 * (화면에서 직접 부르지 않는다 — §11 3초, 키 보호).
 *
 * 항목마다 말머리 · 제목 · 카테고리/지역/발표일 · 요약 · 출처를 낸다.
 * 요청받은 형식에서 두 가지를 다르게 했다 :
 *
 *   · 요약을 새로 쓰지 않는다. 기사 원문 발췌를 2문장까지 자른 것이다.
 *     우리가 다시 쓰면 원문에 없는 뜻이 섞이고, 그 문장이 교량 상태에 대한
 *     우리 주장이 된다 (PRD §7).
 *   · 제목을 28자로 줄이지 않는다. 실제 기사 제목을 자르면 뜻이 바뀔 수 있어
 *     전문을 두고 넘치는 줄만 CSS 로 접는다.
 *
 * '영향받는 대상'은 네이버 응답에 없는 값이라 넣지 않았다. 요청 형식에도
 * '해당 없으면 생략'이라고 되어 있다.
 *
 * 말머리는 우리 판단이 아니라 제목·요약에 있던 낱말에서 나온다. 그 낱말을
 * 항목마다 함께 보여주므로 왜 그 태그가 붙었는지 확인할 수 있다.
 * ---------------------------------------------------------------------------
 */
const NEWS_LIMIT = 6

/** 말머리 색. 태그마다 다르지만 색만으로 뜻을 전하지 않는다 — 글자가 태그 이름이다. */
const TAG_TONE = {
  긴급: 'bg-danger-bg text-danger-fg',
  공지: 'bg-caution-bg text-caution-fg',
  정책: 'bg-summary-bg text-summary-fg',
  기술: 'bg-summary-bg text-summary-fg',
  해외: 'bg-surface-variant text-on-surface-variant',
  안내: 'bg-surface-variant text-on-surface-variant',
}

function NewsSection({ items = [], fetchedAt, sources }) {
  const classified = items.map((item) => ({ ...item, ...classifyNews(item) }))
  const rows = arrangeNews(classified, NEWS_LIMIT)

  return (
    <div className="mb-xl w-full px-margin-mobile md:px-margin-desktop">
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-md shadow-sm">
        <div className="mb-md flex items-center justify-between gap-4 border-b border-outline-variant pb-3">
          <h2 className="text-headline-md font-bold text-primary">교량에 대한 모든 것 · 뉴스</h2>
          <span className="text-sm text-on-surface-variant">
            {rows.length > 0 ? `${rows.length}건` : '수집 전'}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg bg-surface-container-low p-md">
            <p className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
              <Icon name="minus-circle" size={16} className="mt-0.5" />
              아직 수집된 기사가 없습니다.
            </p>
            <p className="mt-2 text-sm leading-[22px] text-on-surface-variant">
              기사 제목과 날짜는 지어낼 수 없어 목록을 비워 두었습니다. 네이버 검색 키를 넣고 수집
              라우트를 한 번 돌리면 여기에 채워집니다.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {rows.map((row, index) => (
              <li
                key={row.id ?? row.url}
                className={index < rows.length - 1 ? 'border-b border-outline-variant/20' : undefined}
              >
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-4 transition-colors hover:bg-surface-container-low/60"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-caption font-bold ${
                        TAG_TONE[row.tag] ?? TAG_TONE.안내
                      }`}
                      title={row.tagHint}
                    >
                      [{row.tag}]
                    </span>
                    <h3 className="line-clamp-2 text-body-md font-semibold text-on-surface">
                      {row.title}
                    </h3>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-on-surface-variant">
                    <span>{row.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{row.region ?? '지역 미표기'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{row.published_at ? formatFetchedAt(row.published_at) : '발표일 미표기'}</span>
                  </p>

                  {row.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-[22px] text-on-surface-variant">
                      {excerptSentences(row.description)}
                    </p>
                  )}

                  <p className="mt-2 text-caption text-on-surface-variant/70">
                    출처 {row.publisher ?? '출처 미표기'}
                    {row.matched.length > 0 && ` · 분류 근거 '${row.matched.join("', '")}'`}
                  </p>
                </a>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-md border-t border-outline-variant/30 pt-3 text-xs leading-[18px] text-on-surface-variant">
          기사는 <strong className="font-semibold">언론 보도이며 공식 기록이 아닙니다.</strong>{' '}
          네이버 뉴스 검색 결과를 옮긴 것이고, 요약은 기사 원문 발췌입니다. 말머리와 카테고리는
          제목·요약에 있던 낱말로 붙인 것이며 저희가 사안의 심각성을 판정한 것이 아닙니다.
          <br />
          화면의 관리 기록 출처: {sources.length > 0 ? sources.join(' · ') : '출처 미표기'}
          {fetchedAt ? ` · ${formatFetchedAt(fetchedAt)} 수집` : ''}
        </p>
      </div>
    </div>
  )
}

/* ── 공통 조각 ───────────────────────────────────────────────────────── */

function EmptyPanel({ title, icon }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <h2 className="mb-md flex items-center gap-xs text-headline-md text-primary">
        <Icon name={icon} size={20} />
        {title}
      </h2>
      <p className="text-body-md text-on-surface-variant">
        표시할 공개 기록을 아직 불러오지 못했습니다.
      </p>
    </div>
  )
}

/** ISO 시각 → '2026.08.18'. 형식을 못 읽으면 원문 그대로 둔다. */
function formatFetchedAt(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : String(value)
}
