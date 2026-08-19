import Link from 'next/link'
import Icon from './Icon'

/**
 * Stitch 대시보드·'내 교량' 화면의 상단/하단 내비게이션.
 *
 * 두 화면이 같은 내비를 쓰므로 여기 한 곳에 둔다. 항목이 어긋나면
 * 화면을 옮길 때마다 현재 위치 표시가 달라져 사용자가 길을 잃는다.
 *
 * 목적지 :
 *   홈       /dashboard   메인 대시보드 (랜딩은 /)
 *   지도     /map         지도 화면 (지도 렌더링 자체는 v1, 배경은 격자)
 *   내 교량  /my-bridges  교량 카드 목록
 *   교량뉴스 /news        언론 보도 목록
 *   앱안내   /info        출처·갱신 주기·하지 않는 일. 판정하지 않는다는 원칙이
 *                         화면의 빈자리로 나타나므로, 그 설명을 '더보기'에 묻지 않는다
 *   내 정보  없음 — 로그인을 만들지 않는다 (v0 비목표)
 *
 * href 가 없는 항목은 링크로 두지 않는다. 눌러도 아무 일이 없는 링크는
 * 고장으로 읽힌다.
 *
 * '기록' 항목이 있던 자리다. 대표 교량 하나의 관리 이력으로 가는 지름길이었는데,
 * 어느 교량을 대표로 삼을지를 우리가 골라야 했고 교량 데이터가 없으면 늘
 * 비활성이었다. 관리 이력의 제자리는 교량 상세 안이다 (요약 카드에서 들어간다).
 * 그래서 항목마다 목적지를 넘겨받던 historyHref 도 함께 없앴다.
 */
/* export 하지 않는다 — 컴포넌트 외의 것을 함께 내보내면 fast refresh 가 깨진다. */
const NAV_ITEMS = [
  { key: 'home', label: '홈', icon: 'home', href: '/dashboard' },
  { key: 'map', label: '지도', icon: 'map', href: '/map' },
  { key: 'bridges', label: '내 교량', icon: 'building', href: '/my-bridges' },
  { key: 'news', label: '교량뉴스', icon: 'file-text', href: '/news' },
  { key: 'info', label: '앱안내', icon: 'info', href: '/info' },
  { key: 'me', label: '내 정보', icon: 'user', href: null },
]

export function TopNav({ active }) {
  return (
    <nav className="sticky top-0 z-50 hidden border-b border-outline-variant/30 bg-surface/80 shadow-sm backdrop-blur-md md:block">
      <div className="flex h-16 w-full items-center justify-between px-margin-desktop">
        <div className="flex items-baseline gap-2">
          {/* 워드마크는 랜딩(/)으로. 앱 안의 '홈'은 대시보드(/dashboard)다. */}
          <Link
            href="/"
            className="text-headline-md font-bold tracking-tight text-primary hover:underline"
          >
            BRIDGE SAFE
          </Link>
          {/* 워드마크 옆 한 줄 설명. 워드마크보다 작게 두어 이름과 섞이지 않게 한다. */}
          <span className="text-caption text-on-surface-variant">교량 안전정보 알림 웹앱</span>
        </div>

        <div className="flex items-center space-x-6">
          {NAV_ITEMS.filter((item) => item.key !== 'me').map((item) => {
            const href = item.href
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
            const isActive = item.key === active
            return (
              <Link
                key={item.key}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'border-b-2 border-primary pb-1 text-label-md text-primary'
                    : 'text-label-md text-on-surface-variant transition-colors hover:text-primary'
                }
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* 디자인은 여기 검색 입력창을 뒀다. 실제로 동작하는 검색창은 지도 아래로
            옮겼다 (BridgeSearch) — 내비에 두면 화면마다 따라다니는데, 검색 결과를
            펼칠 자리가 없어 눌러야 넘어가는 '검색창 모양의 버튼'이 된다. */}
        <span
          aria-disabled="true"
          title="v0 는 로그인이 없습니다"
          className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full text-on-surface-variant/50"
        >
          <Icon name="user" size={22} />
        </span>
      </div>
    </nav>
  )
}

export function BottomNav({ active }) {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
      {NAV_ITEMS.map((item) => {
        const href = item.href
        const isActive = item.key === active
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
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center rounded-xl px-3 py-1 transition-colors ${
              isActive
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
