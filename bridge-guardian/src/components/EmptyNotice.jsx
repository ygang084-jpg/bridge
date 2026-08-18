import Link from 'next/link'
import Icon from './Icon'

/**
 * '정보 없음' 안내 — PRD §5 정보 없음 화면, F-05 ①②③.
 *
 * 빈 화면·에러 화면처럼 보이지 않게 아이콘 + 문장 + 문의처 + 돌아가기를
 * 갖춘 완결된 카드로 만든다 (design-system/MASTER.md §6-5).
 *
 * headline/note 문구는 직접 쓰지 말고 describeInfoState() 에서 받는다.
 * 문구가 여러 곳에 흩어지면 '기록 없음 ≠ 관리 안 함' 규칙이 한 곳에서 무너진다.
 */
export default function EmptyNotice({ headline, note, managerOrg, managerContact, backHref, backLabel = '목록으로' }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-unknown-bg text-unknown-fg">
        <Icon name="minus-circle" size={28} />
      </span>

      <h2 className="text-[20px] leading-7 font-bold text-primary">{headline}</h2>
      {note && <p className="mt-2 text-[15px] leading-[24px] text-fg-muted">{note}</p>}

      {(managerOrg || managerContact) && (
        <div className="mt-5 rounded-lg bg-surface-muted p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
            <Icon name="building" size={14} />
            관리기관에 직접 확인하기
          </p>
          {managerOrg && <p className="mt-1 text-[16px] font-medium text-fg">{managerOrg}</p>}
          {managerContact ? (
            <p className="mt-0.5 text-[15px] text-fg">{managerContact}</p>
          ) : (
            <p className="mt-0.5 text-[13px] text-fg-muted">
              문의처가 공개 데이터에 없습니다.
            </p>
          )}
        </div>
      )}

      {backHref && (
        <Link
          href={backHref}
          className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-medium text-accent hover:underline"
        >
          <Icon name="arrow-left" size={16} />
          {backLabel}
        </Link>
      )}
    </section>
  )
}
