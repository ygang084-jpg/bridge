import Link from 'next/link'
import Icon from '@/components/Icon'
import InfoStateBadge from '@/components/InfoStateBadge'
import { fetchBridgeDetail, fetchBridgesForList } from '@/lib/supabase/readClient'
import { resolveInfoState } from '@/lib/infoState'
import { buildTimeline, summarizeManagement } from '@/lib/history'
import { normalizeSafetyGrade } from '@/lib/summary'

/**
 * 메인 대시보드 — Stitch `bridge_safe_9` 구성을 그대로 옮긴 것.
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
  const data = await loadDashboard()
  const historyHref = data.featured ? `/bridges/${data.featured.id}/history` : '/bridges'

  return (
    <>
      <TopNav historyHref={historyHref} />

      <main className="dashboard-wide w-full flex-1 space-y-xl px-margin-mobile py-lg md:px-margin-desktop">
        <Hero />

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          <MapArea featured={data.featured} />
          <div className="flex flex-col gap-gutter md:col-span-4">
            <TodayCard todayHref={data.featured ? `/bridges/${data.featured.id}/today` : null} />
            <EmergencyCard />
          </div>
        </div>

        <NearbySection bridges={data.cards} loadFailed={data.loadFailed} />

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
          <HealthCard featured={data.featured} />
          <TimeMachineCard featured={data.featured} historyHref={historyHref} />
        </div>

        <ReportBand />
      </main>

      <BottomNav historyHref={historyHref} />

      <UpdatesSection bridges={data.cards} fetchedAt={data.fetchedAt} sources={data.sources} />

      <DashFooter />
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
    return { loadFailed: true, cards: [], sources: [], fetchedAt: null, featured: null }
  }
  if (!list.available) {
    return { loadFailed: true, cards: [], sources: [], fetchedAt: null, featured: null }
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
  }
}

/** 가장 최근 점검의 안전등급. 등급이 붙은 기록이 없으면 null. */
function latestGrade(history) {
  const graded = history
    .filter((row) => normalizeSafetyGrade(row.safety_grade))
    .sort((a, b) => String(b.occurred_on).localeCompare(String(a.occurred_on)))
  return graded.length > 0 ? normalizeSafetyGrade(graded[0].safety_grade) : null
}

/* ── 내비게이션 ──────────────────────────────────────────────────────── */

/** 지도·내 정보는 v0 에 목적지가 없다. 링크로 두면 눌러도 아무 일이 없으므로 비활성으로 표시한다. */
const NAV = [
  { key: 'home', label: '홈', icon: 'home', href: '/' },
  { key: 'map', label: '지도', icon: 'map', href: null },
  { key: 'bridges', label: '내 교량', icon: 'building', href: '/bridges' },
  { key: 'history', label: '기록', icon: 'clock', href: 'HISTORY' },
  { key: 'me', label: '내 정보', icon: 'user', href: null },
]

function TopNav({ historyHref }) {
  return (
    <nav className="sticky top-0 z-50 hidden border-b border-outline-variant/30 bg-surface/80 shadow-sm backdrop-blur-md md:block">
      <div className="flex h-16 w-full items-center justify-between px-margin-desktop">
        <span className="text-headline-md font-bold tracking-tight text-primary">BRIDGE SAFE</span>

        <div className="flex items-center space-x-6">
          {NAV.filter((item) => item.key !== 'me').map((item) => {
            const href = item.href === 'HISTORY' ? historyHref : item.href
            if (!href) {
              return (
                <span
                  key={item.key}
                  aria-disabled="true"
                  title="v0 에서는 제공하지 않습니다"
                  className="cursor-not-allowed text-label-md text-on-surface-variant/50"
                >
                  {item.label}
                </span>
              )
            }
            const active = item.key === 'home'
            return (
              <Link
                key={item.key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'border-b-2 border-primary pb-1 text-label-md text-primary'
                    : 'text-label-md text-on-surface-variant transition-colors hover:text-primary'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* 디자인의 account_circle 자리. v0 는 로그인이 없어 계정 화면이 존재하지 않는다. */}
        <span
          aria-disabled="true"
          title="v0 는 로그인이 없습니다"
          className="cursor-not-allowed rounded-lg p-2 text-on-surface-variant/50"
        >
          <Icon name="user" size={22} />
        </span>
      </div>
    </nav>
  )
}

function BottomNav({ historyHref }) {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
      {NAV.map((item) => {
        const href = item.href === 'HISTORY' ? historyHref : item.href
        const active = item.key === 'home'
        const inner = (
          <>
            <Icon name={item.icon} size={20} className="mb-1" />
            <span className="text-caption">{item.label}</span>
          </>
        )
        if (!href) {
          return (
            <span
              key={item.key}
              aria-disabled="true"
              title="v0 에서는 제공하지 않습니다"
              className="flex min-h-[44px] cursor-not-allowed flex-col items-center justify-center rounded-xl px-3 py-1 text-on-surface-variant/40"
            >
              {inner}
            </span>
          )
        }
        return (
          <Link
            key={item.key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl px-3 py-1 transition-colors ${
              active
                ? 'bg-secondary-container/50 text-primary'
                : 'text-on-surface-variant hover:bg-surface-variant/30'
            }`}
          >
            {inner}
          </Link>
        )
      })}
    </nav>
  )
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

/** 벤토 왼쪽 8칸 — 지도 자리 + 위에 얹히는 '내 주변 교량' 유리 패널. */
function MapArea({ featured }) {
  return (
    <div className="relative h-[500px] overflow-hidden rounded-xl border border-outline-variant shadow-sm md:col-span-8">
      {/* 라벨을 가운데가 아니라 오른쪽 아래에 둔다 — 가운데 두면 위에 얹히는
          유리 패널에 가려 글자가 잘린다. */}
      <div className="absolute inset-0 bg-surface-variant">
        <span className="absolute right-4 bottom-4 text-on-surface-variant">
          지도 — v1 에서 도입
        </span>
      </div>

      <div className="glass-panel absolute top-4 right-4 left-4 rounded-xl p-md md:right-auto md:w-[360px]">
        <h2 className="mb-sm flex items-center gap-xs text-headline-md text-primary">
          <Icon name="map-pin" size={20} />
          내 주변 교량
        </h2>

        {featured ? (
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-sm">
            <div className="mb-xs flex items-start justify-between gap-2">
              <Link
                href={`/bridges/${featured.id}`}
                className="text-lg font-bold text-primary hover:underline"
              >
                {featured.name}
              </Link>
              <GradeChip grade={featured.grade} />
            </div>

            {/* 디자인의 '특별한 통행 제한 없음' 자리. 근거가 없으면 '없음'이라고
                적을 수 없다 — 정보가 없는 것을 안전 신호로 바꿔 읽히게 만든다. */}
            <p className="mb-sm flex items-center gap-1 text-sm text-on-surface-variant">
              <Icon name="minus-circle" size={14} />
              통행 제한 정보는 아직 제공되지 않습니다
            </p>

            <ul className="space-y-1 text-xs text-on-surface-variant">
              <li>준공: {featured.completedYear ? `${featured.completedYear}년` : '공개 정보 없음'}</li>
              <li>최근 점검: {featured.lastInspectionYearMonth ?? '공개 정보 없음'}</li>
              <li>
                최근 보수:{' '}
                {featured.lastRepairYearMonth
                  ? `${featured.lastRepairYearMonth} ${featured.lastRepairType ?? ''}`.trim()
                  : '공개 정보 없음'}
              </li>
            </ul>
          </div>
        ) : (
          <p className="rounded-lg bg-surface-container-lowest p-sm text-sm text-on-surface-variant">
            표시할 교량을 아직 불러오지 못했습니다.
          </p>
        )}
      </div>
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

function EmergencyCard() {
  return (
    <div className="rounded-xl border border-error/20 bg-error-container/20 p-md shadow-sm">
      <h2 className="mb-sm flex items-center gap-xs text-headline-md text-error">
        <Icon name="alert-triangle" size={20} />
        비상대피경로
      </h2>
      <p className="mb-md text-sm text-on-surface-variant">
        대피 경로는 안내하지 않습니다. 잘못된 안내가 곧 인명 피해로 이어지기 때문입니다. 통제와
        우회는 관리기관과 내비게이션의 안내를 따라 주세요.
      </p>
      <button
        type="button"
        disabled
        title="대피 경로 안내는 제공하지 않습니다"
        className="w-full cursor-not-allowed rounded-lg bg-error/30 py-2 font-bold text-on-error"
      >
        대피경로 확인 — 제공하지 않음
      </button>
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
                {bridge.grade ? (
                  <GradeChip grade={bridge.grade} />
                ) : (
                  <InfoStateBadge state={bridge.infoState} label={bridge.infoLabel} size="sm" />
                )}
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

function TimeMachineCard({ featured, historyHref }) {
  const items = featured?.timeline?.items ?? []
  if (items.length === 0) return <EmptyPanel title="교량 타임머신" icon="clock" />

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

function ReportBand() {
  return (
    <section className="flex flex-col items-center justify-between rounded-xl bg-primary p-lg text-on-primary md:flex-row">
      <div className="mb-md md:mb-0">
        <h2 className="mb-xs text-[32px] leading-10 font-bold">
          <span aria-hidden="true">📸</span> 이상징후 제보
        </h2>
        <p className="mb-sm text-on-primary/80">&ldquo;어? 다리에 이상한 부분이 보여요.&rdquo;</p>
        {/* 디자인에는 '제보된 사진은 AI가 1차 분류하여 담당 기관에 전달됩니다'가
            적혀 있었다. 전달 경로가 없고 AI 도 쓰지 않으므로 사실로 바꿨다. */}
        <p className="text-xs text-on-primary/60">
          * 아직 접수·전달 경로가 없어 준비 중입니다. 접수만 받고 아무 일도 일어나지 않는 창구를
          만들지 않으려고 열지 않았습니다.
        </p>
      </div>
      <button
        type="button"
        disabled
        title="제보 접수는 준비 중입니다"
        className="flex cursor-not-allowed items-center rounded-lg bg-on-primary/40 px-8 py-3 font-bold text-primary"
      >
        <Icon name="upload" size={18} className="mr-2" />
        사진 올리기 — 준비 중
      </button>
    </section>
  )
}

/** 디자인의 '데이터 갱신 소식' 자리. 지어낸 공지 대신 실제 수집 상태를 적는다. */
function UpdatesSection({ bridges, fetchedAt, sources }) {
  const rows = [
    ...bridges.map((bridge) => ({
      text: `${bridge.name} — 공개된 관리 기록 ${bridge.recordCount}건`,
      date: fetchedAt,
    })),
    { text: '통행제한·기상·하천수위 정보는 아직 제공하지 않습니다', date: null },
  ]

  return (
    <div className="mb-xl w-full px-margin-mobile md:px-margin-desktop">
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-md shadow-sm">
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-headline-md font-bold text-primary">데이터 갱신 소식</h2>
          <span className="text-sm text-on-surface-variant">
            {sources.length > 0 ? sources.join(' · ') : '출처 미표기'}
          </span>
        </div>
        <div>
          {rows.map((row, index) => (
            <div
              key={row.text}
              className={`flex items-center justify-between gap-4 py-3 ${
                index < rows.length - 1 ? 'border-b border-outline-variant/20' : ''
              }`}
            >
              <span className="text-body-md text-on-surface-variant">{row.text}</span>
              <span className="shrink-0 text-sm text-on-surface-variant/60">
                {row.date ? formatFetchedAt(row.date) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FOOTER_LINKS = ['공공기관 정보', '문의하기', '법적 고지', '개인정보 처리방침']

function DashFooter() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-low pb-24 md:pb-0">
      <div className="flex w-full flex-col items-start justify-between gap-md px-margin-mobile py-lg md:flex-row md:items-center md:px-margin-desktop">
        <div className="flex flex-col">
          <span className="mb-sm text-headline-md font-bold text-primary">BRIDGE SAFE</span>
          {/* 디자인에는 '© 2024 국가교량안전기관'이 적혀 있었다.
              실재하지 않는 기관이므로 쓰지 않는다. */}
          <span className="text-caption text-on-surface-variant">
            공공데이터를 옮겨 보여주는 프로젝트입니다. 공식 기관이 운영하지 않습니다.
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-md">
          {FOOTER_LINKS.map((label) => (
            <span
              key={label}
              aria-disabled="true"
              title="아직 준비되지 않았습니다"
              className="cursor-not-allowed text-body-md text-on-surface-variant/50"
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  )
}

/* ── 공통 조각 ───────────────────────────────────────────────────────── */

function GradeChip({ grade }) {
  if (!grade) {
    return (
      <span className="shrink-0 rounded-full bg-unknown-bg px-2 py-1 text-xs font-bold text-unknown-fg">
        등급 정보 없음
      </span>
    )
  }
  // 디자인은 등급 칩을 초록(secondary-container)으로, 문구를 '안전 B등급'으로
  // 뒀다. 둘 다 그대로 쓸 수 없다 — 등급의 법정 정의를 아직 구하지 못해
  // (§13 Q4) 어느 등급이 좋고 나쁜지를 우리가 말할 근거가 없는데, 초록색과
  // '안전'이라는 말은 그 판정을 이미 해버린다. 실제로 C등급도 초록으로 나왔다.
  // 칩의 자리·모양은 그대로 두고 색만 중립으로, 문구는 등급 값만 적는다.
  return (
    <span
      className="shrink-0 rounded-full bg-surface-variant px-2 py-1 text-xs font-bold text-on-surface-variant"
      title="등급은 그 시점 점검의 판정 결과입니다. 교량의 항상적 속성도 아니고 통행 제한 여부와도 별개 정보입니다"
    >
      {grade}등급
    </span>
  )
}

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
