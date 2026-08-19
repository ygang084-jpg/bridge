import Link from 'next/link'
import Icon from './Icon'

export default function ScreenHeader({ title, backHref }) {
  return (
    <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-14 items-center gap-1 px-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="뒤로가기"
            className="flex h-11 w-11 items-center justify-center text-on-surface transition-colors hover:text-primary"
          >
            <Icon name="arrow-left" size={22} />
          </Link>
        ) : (
          <span className="w-3" />
        )}
        <h1 className="truncate text-[17px] font-semibold text-primary">{title}</h1>
      </div>
    </header>
  )
}
