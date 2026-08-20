import Icon from './Icon'
import SourceNote from './SourceNote'

/**
 * F-03 관리 이력 타임라인 — 제품의 중심.
 *
 * 수용기준과 이 컴포넌트의 대응
 *   ① 최신이 위 (buildTimeline 이 정렬해서 넘겨준다)
 *   ② 기록 사이의 간격을 드러낸다 → 항목 사이에 간격 표시를 끼운다
 *   ③ 항목마다 출처·기준일
 *   ④ 1건이거나 0건이어도 정상 렌더링
 *   ⑤ 빈 구간을 '점검하지 않은 기간'이 아니라 '공개된 기록이 없는 구간'으로
 *   ⑥ 우리가 요약·평가하지 않는다 → 간격에 임계값·색·경고를 붙이지 않는다
 *
 * ⑥ 때문에 간격 표시는 길이에 상관없이 항상 같은 모양·같은 색이다.
 * '3년 이상이면 주황색' 같은 규칙을 넣는 순간 우리가 판정하는 것이 된다.
 */
export default function Timeline({ items, sinceLatestText }) {
  if (!items || items.length === 0) return null

  return (
    <>
      <ol className="flex flex-col">
        {sinceLatestText && (
          <li className="pb-1">
            <GapRow text={`가장 최근 기록 이후 ${sinceLatestText}이 지났습니다.`} />
          </li>
        )}

        {items.map((item, index) => (
          <li key={item.id ?? `${item.occurred_on}-${index}`}>
            <EventRow item={item} />
            {item.intervalToPreviousText && (
              <GapRow
                text={`이 사이 ${item.intervalToPreviousText} 동안은 공개된 기록이 없습니다.`}
              />
            )}
          </li>
        ))}
      </ol>

    </>
  )
}

function EventRow({ item }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center pt-1.5">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            item.isCompletion ? 'bg-accent' : 'bg-on-surface-variant'
          }`}
          aria-hidden="true"
        />
        <span className="mt-1 w-px flex-1 bg-outline-variant" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[16px] font-semibold text-primary">{item.yearMonth}</span>
          <span className="text-[15px] font-medium text-on-surface">{item.event_type ?? '기타'}</span>
        </div>

        {item.description && (
          <p className="mt-1 text-[15px] leading-[24px] text-on-surface">{item.description}</p>
        )}

        <SourceNote source={item.source} asOf={item.data_as_of} align="left" />
      </div>
    </div>
  )
}

function GapRow({ text }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-4 shrink-0 justify-center">
        <span className="w-px flex-1 border-l border-dashed border-outline-variant" aria-hidden="true" />
      </div>
      <p className="flex items-center gap-1.5 pb-4 text-[13px] leading-[18px] text-on-surface-variant">
        <Icon name="minus-circle" size={14} />
        {text}
      </p>
    </div>
  )
}
