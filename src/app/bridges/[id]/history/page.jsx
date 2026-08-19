import { notFound } from 'next/navigation'
import ScreenHeader from '@/components/ScreenHeader'
import Timeline from '@/components/Timeline'
import EmptyNotice from '@/components/EmptyNotice'
import InfoStateBadge from '@/components/InfoStateBadge'
import Icon from '@/components/Icon'
import { fetchBridgeDetail } from '@/lib/supabase/readClient'
import { buildTimeline } from '@/lib/history'
import { describeInfoState, resolveInfoState, INFO_STATE } from '@/lib/infoState'

/**
 * F-03 관리 이력 타임라인 — 제품의 중심.
 * PRD §12 북극성 지표('상세 진입자 중 타임라인 도달 비율')가 세는 화면이 이곳이다.
 */
export default async function BridgeHistoryPage({ params }) {
  const { id } = await params

  let detail = null
  let loadError = null
  try {
    detail = await fetchBridgeDetail(id)
  } catch (error) {
    loadError = error.message
  }

  if (loadError) {
    return (
      <>
        <ScreenHeader title="관리 이력" backHref={`/bridges/${id}`} />
        <main className="flex-1 px-4 py-5">
          <EmptyNotice
            headline="관리 이력을 불러오지 못했습니다."
            note="비어 있는 것은 기록이 없다는 뜻이 아니라, 지금 데이터를 읽지 못했다는 뜻입니다."
            backHref={`/bridges/${id}`}
            backLabel="상세로 돌아가기"
          />
        </main>
      </>
    )
  }

  if (!detail) notFound()

  const { bridge, history } = detail
  const info = resolveInfoState(history)
  const described = describeInfoState(info.state, info.recordCount)
  const timeline = buildTimeline(history)

  return (
    <>
      <ScreenHeader title={`${bridge.name} 관리 이력`} backHref={`/bridges/${id}`} />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] leading-7 font-bold text-primary">
              공개된 기록을 시간순으로
            </h2>
            <p className="mt-1 text-[14px] leading-[22px] text-on-surface-variant">
              {described.headline}
            </p>
          </div>
          <InfoStateBadge state={info.state} label={info.label} size="sm" />
        </div>

        {described.note && (
          <p className="rounded-lg bg-surface-container-low p-3 text-[13px] leading-[18px] text-on-surface-variant">
            {described.note}
          </p>
        )}

        {timeline.items.length > 0 ? (
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <Timeline items={timeline.items} sinceLatestText={timeline.sinceLatestText} />
          </section>
        ) : (
          <EmptyNotice
            headline={described.headline}
            note={described.note}
            managerOrg={bridge.manager_org}
            managerContact={bridge.manager_contact}
            backHref={`/bridges/${id}`}
            backLabel="상세로 돌아가기"
          />
        )}

        {/* 날짜를 읽을 수 없어 타임라인에 넣지 못한 기록. 조용히 버리지 않는다. */}
        {timeline.unreadable.length > 0 && (
          <section className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="flex items-start gap-1.5 text-[13px] leading-[18px] text-on-surface-variant">
              <Icon name="warning-circle" size={14} className="mt-0.5" />
              날짜를 읽을 수 없어 시간순에 넣지 못한 기록이 {timeline.unreadable.length}건
              있습니다. 원본 데이터의 날짜 형식이 다릅니다.
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {timeline.unreadable.map((row, index) => (
                <li key={row.id ?? index} className="text-[13px] text-on-surface-variant">
                  {row.event_type ?? '기타'} — {row.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        {info.state !== INFO_STATE.ABSENT && (
          <p className="text-[13px] leading-[18px] text-on-surface-variant">
            기록의 순서와 간격을 그대로 옮겼습니다. 이 목록을 우리가 요약하거나 평가하지
            않습니다.
          </p>
        )}
      </main>
    </>
  )
}
