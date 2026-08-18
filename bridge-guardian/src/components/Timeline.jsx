import Icon from './Icon'
import SourceNote from './SourceNote'
import { getSafetyGradeDefinition, normalizeSafetyGrade } from '@/lib/summary'

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

  // 등급 정의를 아직 표시할 수 없다는 설명은 항목마다 되풀이하지 않고 아래에 한 번만 적는다.
  // 항목마다 세 줄씩 붙으면 정작 읽어야 할 기록이 설명에 묻힌다.
  const hasUnexplainedGrade = items.some(
    (item) => normalizeSafetyGrade(item.safety_grade) && !getSafetyGradeDefinition(item.safety_grade),
  )

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

      {hasUnexplainedGrade && (
        <p className="mt-1 border-t border-outline-variant pt-3 text-[13px] leading-[18px] text-on-surface-variant">
          안전등급의 법정 정의 원문을 아직 확인하지 못해 뜻을 함께 적지 못했습니다. 등급은 그
          시점 점검의 판정 결과이며, 교량의 항상적 속성도 아니고 통행 제한 여부와도 별개
          정보입니다.
        </p>
      )}
    </>
  )
}

function EventRow({ item }) {
  const grade = normalizeSafetyGrade(item.safety_grade)
  const definition = getSafetyGradeDefinition(item.safety_grade)

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

        {/* F-02.1 — 등급은 이 시점에 놓고, 법정 정의를 같은 줄에 펼친다.
            툴팁·아코디언으로 숨기지 않는다.
            정의를 아직 표시할 수 없는 이유는 Timeline 하단에 한 번만 적는다. */}
        {grade && (
          <p className="mt-1 text-[14px] leading-[22px] text-on-surface-variant">
            안전등급 {grade}
            {definition && (
              <>
                {' — '}
                {definition.legalDefinition}
                <span className="block text-[13px]">
                  {definition.source.name} {definition.source.article}
                </span>
              </>
            )}
          </p>
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
