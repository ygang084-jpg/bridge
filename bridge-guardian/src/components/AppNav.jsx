import Link from 'next/link'
import Icon from './Icon'

/**
 * Stitch 대시보드·'내 교량' 화면의 상단/하단 내비게이션.
 *
 * 두 화면이 같은 내비를 쓰므로 여기 한 곳에 둔다. 항목이 어긋나면
 * 화면을 옮길 때마다 현재 위치 표시가 달라져 사용자가 길을 잃는다.
 *
 * 목적지 :
 *   홈       /            메인 대시보드
 *   지도     /map         지도 화면 (지도 렌더링 자체는 v1, 배경은 격자)
 *   내 교량  /my-bridges  교량 카드 목록
 *   기록     대표 교량의 관리 이력. 이력이 있는 교량이 없으면 비활성
 *   내 정보  없음 — 로그인을 만들지 않는다 (v0 비목표)
 *
 * href 가 없는 항목은 링크로 두지 않는다. 눌러도 아무 일이 없는 링크는
 * 고장으로 읽힌다.
 */
/* export 하지 않는다 — 컴포넌트 외의 것을 함께 내보내면 fast refresh 가 깨진다. */
const NAV_ITEMS = [
  { key: 'home', label: '홈', icon: 'home', href: '/' },
  { key: 'map', label: '지도', icon: 'map', href: '/map' },
  { key: 'bridges', label: '내 교량', icon: 'building', href: '/my-bridges' },
  { key: 'history', label: '기록', icon: 'clock', href: null },
  { key: 'me', label: '내 정보', icon: 'user', href: null },
]

/** href 가 null 인 항목과, 대표 교량이 없어 기록으로 갈 수 없는 경우를 함께 처리한다. */
function resolveHref(item, historyHref) {
  if (item.key === 'history') return historyHref ?? null
  return item.href
}

export function TopNav({ active, historyHref = null }) {
  return (
    <nav className="sticky top-0 z-50 hidden border-b border-outline-variant/30 bg-surface/80 shadow-sm backdrop-blur-md md:block">
      <div className="flex h-16 w-full items-center justify-between px-margin-desktop xl:px-32">
        <div className="flex items-baseline gap-2">
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
            const href = resolveHref(item, historyHref)
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

        <div className="flex items-center gap-4">
          {/* 디자인은 여기 입력창을 뒀다. 입력을 받으려면 클라이언트 컴포넌트가
              필요하고 검색 화면이 이미 있으므로, 같은 모양의 링크로 둔다. */}
          <Link
            href="/bridges?mode=search"
            className="hidden items-center gap-2 rounded-full bg-surface-container-highest py-1.5 pr-4 pl-3 text-body-md text-on-surface-variant transition-colors hover:text-primary lg:flex"
          >
            <Icon name="search" size={18} />
            교량 검색…
          </Link>

          {/* account_circle 자리. v0 는 로그인이 없어 계정 화면이 존재하지 않는다. */}
          <span
            aria-disabled="true"
            title="v0 는 로그인이 없습니다"
            className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full text-on-surface-variant/50"
          >
            <Icon name="user" size={22} />
          </span>
        </div>
      </div>
    </nav>
  )
}

export function BottomNav({ active, historyHref = null }) {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden">
      {NAV_ITEMS.map((item) => {
        const href = resolveHref(item, historyHref)
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
