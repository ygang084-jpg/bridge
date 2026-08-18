import Link from 'next/link'
import Icon from './Icon'
import { SUMMARY_BADGE_LABEL, SUMMARY_DISCLOSURE, SUMMARY_QUALIFIER } from '@/lib/summary'

/**
 * 교량 상세 최상단의 한 문장 요약 — PRD F-02 ①②, §7, §15.1·15.2.
 *
 * · 배지는 '자동 요약'. AI가 아니다 (§15.1)
 * · '공개된 공식 정보 기준'이라는 한정구는 문장 안이 아니라 이 카드의 라벨에 있다 (§15.2)
 * · §7 표시규칙 3 — 요약 옆에 원문(관리 이력)으로 가는 경로를 항상 둔다
 * · 요약이 없을 수 있다. 그때 억지 문장을 만들지 않고 이 카드가 그 사실을 말한다
 */
export default function SummaryCard({ summaryText, historyHref }) {
  return (
    <section className="relative rounded-xl border border-border bg-surface py-4 pl-5 pr-4 shadow-sm before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:rounded-l-xl before:bg-accent before:content-['']">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-fg-muted">{SUMMARY_QUALIFIER}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-summary-bg px-3 py-1 text-[14px] font-medium text-summary-fg">
          <Icon name="file-text" size={14} />
          {SUMMARY_BADGE_LABEL}
        </span>
      </div>

      {summaryText ? (
        <p className="text-[24px] leading-8 font-extrabold text-primary">{summaryText}</p>
      ) : (
        <div>
          <p className="text-[20px] leading-7 font-bold text-primary">
            한 문장으로 옮길 수 있는 공개 정보가 아직 없습니다.
          </p>
          <p className="mt-2 text-[14px] leading-[22px] text-fg-muted">
            점검을 하지 않았다는 뜻이 아닙니다. 요약을 만들 근거가 부족할 때는 문장을
            지어내지 않고 비워 둡니다.
          </p>
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[13px] leading-[18px] text-fg-muted">
        <Icon name="info" size={14} className="mt-0.5" />
        {SUMMARY_DISCLOSURE}
      </p>

      <Link
        href={historyHref}
        className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-accent hover:underline"
      >
        <Icon name="clock" size={16} />
        이 문장의 근거 — 관리 이력 보기
      </Link>
    </section>
  )
}
