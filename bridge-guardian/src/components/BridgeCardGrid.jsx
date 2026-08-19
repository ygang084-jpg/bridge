import Link from 'next/link'
import Icon from './Icon'
import GradeChip from './GradeChip'
import InfoStateBadge from './InfoStateBadge'

/**
 * 교량 카드 그리드 — Stitch `bridge_safe_5` 의 벤토 카드.
 *
 * 지도 화면(/map)과 '내 교량'(/my-bridges)이 같은 카드를 쓴다. 한쪽만 고치면
 * 두 화면의 카드가 갈라지므로 여기 한 곳에 둔다.
 *
 * 디자인의 자리를 두고 내용을 사실로 바꾼 곳 :
 *   · 관측 3칸(바람·온도·습도) → weather_snapshots 가 비어 있다. 공공 API
 *     연동이 아직 없어(§13 Q2) 값을 만들 수가 없다
 *   · 즐겨찾기 별 → favorites 테이블도 로그인도 없다(v1). 눌러도 남길 곳이 없다
 *   · '새로운 교량 추가하기' → 담아 둘 곳이 없어 실제로 되는 검색으로 잇는다
 */

/** 관측 3칸. 값이 없으므로 셋 모두 같은 모양·같은 색이다. */
const FACTORS = [
  { key: 'wind', label: '바람', icon: 'wind' },
  { key: 'temp', label: '온도', icon: 'thermometer' },
  { key: 'humidity', label: '습도', icon: 'droplet' },
]

export default function BridgeCardGrid({ bridges, loadFailed }) {
  if (loadFailed) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <p className="text-body-md text-on-surface-variant">
          교량 목록을 불러오지 못했습니다. 화면이 비어 있는 것은 교량이 없다는 뜻이 아니라, 지금
          데이터를 읽지 못했다는 뜻입니다.
        </p>
      </div>
    )
  }

  return (
    <div className="grid w-full grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
      {bridges.map((bridge) => (
        <BridgeCard key={bridge.id} bridge={bridge} />
      ))}
      <FindMoreCard />
    </div>
  )
}

function BridgeCard({ bridge }) {
  return (
    <div className="relative flex flex-col rounded-xl border border-outline-variant/50 bg-surface/90 p-6 shadow-[0_4px_20px_rgba(3,22,53,0.05)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(3,22,53,0.1)]">
      <div className="absolute top-6 right-6">
        {bridge.grade ? (
          <GradeChip grade={bridge.grade} />
        ) : (
          <InfoStateBadge state={bridge.infoState} label={bridge.infoLabel} size="sm" />
        )}
      </div>

      <div className="mb-6 pr-24">
        <h2 className="mb-1 text-headline-md text-primary">{bridge.name}</h2>
        <p className="flex items-center gap-1 text-caption text-on-surface-variant">
          <Icon name="map-pin" size={16} />
          {bridge.address ?? '소재지 정보 없음'}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-3">
        {FACTORS.map((factor, index) => (
          <div
            key={factor.key}
            className={`flex flex-col items-center text-center ${
              index === 1 ? 'border-r border-l border-outline-variant/30' : ''
            }`}
          >
            <Icon name={factor.icon} size={18} className="mb-1 text-outline" />
            <span className="text-caption text-on-surface-variant">{factor.label}</span>
            {/* 한 칸만 색을 달리 쓰면 그 요인을 우리가 '주의'로 판정한 것이 된다. */}
            <span className="text-label-md text-on-surface-variant">준비 중</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-4">
        <div className="text-caption text-on-surface-variant">
          최근 점검:{' '}
          {bridge.lastInspectionOn ? formatDate(bridge.lastInspectionOn) : '공개 정보 없음'}
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-disabled="true"
            title="즐겨찾기는 v1 에서 제공합니다"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full text-on-surface-variant/40"
          >
            <Icon name="star" size={18} />
          </span>
          <Link
            href={`/bridges/${bridge.id}`}
            className="flex min-h-[44px] items-center gap-1 rounded-lg bg-primary-container px-3 text-label-md text-on-primary transition-colors hover:bg-primary"
          >
            상세보기
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function FindMoreCard() {
  return (
    <Link
      href="/bridges"
      className="group flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low/80 p-6 text-center backdrop-blur-md transition-all duration-300 hover:border-primary-fixed-dim hover:bg-surface-container/90"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed transition-transform duration-300 group-hover:scale-110">
        <Icon name="plus" size={32} />
      </div>
      <h2 className="mb-2 text-headline-md text-primary">다른 교량 찾아보기</h2>
      <p className="mb-6 text-body-md text-on-surface-variant">
        위치나 지역명으로 찾을 수 있습니다.
        <br />
        목록에 담아 두는 기능은 v1 에서 제공합니다.
      </p>
      {/* 검색창 모양으로 두지 않는다 — 타이핑되지 않는 입력창은 고장으로 읽힌다.
          실제로 입력을 받는 검색창은 이 화면 위쪽(BridgeSearch)에 있다. */}
      <span className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-container px-4 text-label-md text-on-primary">
        <Icon name="map-pin" size={18} />
        내 주변 교량 목록 열기
      </span>
    </Link>
  )
}

/** 'YYYY-MM-DD' → '2025.11.28'. 형식을 못 읽으면 원문 그대로 둔다. */
function formatDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : String(value)
}
