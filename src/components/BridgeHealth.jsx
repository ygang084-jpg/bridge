import Link from 'next/link'
import Icon from './Icon'

/**
 * 교량 건강검진 · 교량 타임머신 — Stitch 대시보드의 두 카드.
 *
 * '내 교량'(/my-bridges) 화면에 있다. 대시보드에도 있었지만, 두 카드가 모두
 * 특정 교량 하나를 다루는 내용이어서 교량을 고르는 화면 쪽이 제자리다.
 *
 * 둘 다 `featured` 하나에 의존한다. 값이 없으면 빈 화면이 아니라 왜 비어 있는지
 * 적는 카드를 낸다 (F-05 — 공백도 정식 상태다).
 */

export function HealthCard({ featured }) {
  if (!featured) return <EmptyPanel title="교량 건강검진" icon="heart-pulse" />

  // 아이콘은 '기록이 있는지'만 나타낸다. 상태가 좋다·나쁘다는 판정하지 않는다.
  const tiles = [
    { label: '최근 점검', has: Boolean(featured.lastInspectionYearMonth), icon: 'check-circle' },
    { label: '보수이력', has: Boolean(featured.lastRepairYearMonth), icon: 'wrench' },
    { label: '보강이력', has: false, icon: 'scale' },
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

/** 가로 타임라인. 노드는 실제 이력에서 만든다. */
const EVENT_EMOJI = { 준공: '🏗️', 보수: '🛠️', 보강: '🛠️' }

export function TimeMachineCard({ featured }) {
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
              <div
                className={`text-xs ${latest ? 'font-bold text-primary' : 'text-on-surface-variant'}`}
              >
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
        href={`/bridges/${featured.id}/history`}
        className="mt-sm inline-flex min-h-[44px] items-center gap-1.5 text-label-md text-accent hover:underline"
      >
        <Icon name="clock" size={16} />
        관리 이력 전체 보기
      </Link>
    </div>
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
