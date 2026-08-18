import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScreenHeader from '@/components/ScreenHeader'
import SummaryCard from '@/components/SummaryCard'
import SourceNote from '@/components/SourceNote'
import InfoStateBadge from '@/components/InfoStateBadge'
import EmptyNotice from '@/components/EmptyNotice'
import Icon from '@/components/Icon'
import { fetchBridgeDetail, hasReadEnv } from '@/lib/supabase/readClient'
import { describeInfoState, resolveInfoState, INFO_STATE } from '@/lib/infoState'
import { summarizeManagement } from '@/lib/history'

/**
 * F-02 교량 상세 — 현재 개요.
 *
 * 수용기준과의 대응
 *   ① 최상단이 한 문장 요약, 원문은 그 아래
 *   ③ 준공연도를 단독으로 강조하지 않는다 → '관리 요약'에서 마지막 점검·보수와
 *      같은 카드 안에 나란히 놓는다. 준공연도만 큰 글씨로 뽑지 않는다
 *   ④ 항목마다 출처 기관명과 데이터 기준일
 *   ⑤ 값이 없으면 추정하지 않고 '공개 정보 없음'
 *   ⑥ 하단 상시 고지 (layout.jsx)
 *
 * 안전등급은 이 화면에 없다 (F-02.1) — 관리 이력의 해당 시점에 있다.
 */
export default async function BridgeDetailPage({ params }) {
  const { id } = await params

  let detail = null
  let loadError = null
  try {
    detail = await fetchBridgeDetail(id)
  } catch (error) {
    loadError = error.message
  }

  // 설정이 없어서 못 읽은 것과, 교량이 실제로 없는 것을 구분한다.
  // 둘 다 404 로 처리하면 '정보 없음'과 '설정 안 됨'이 같은 화면으로 보인다.
  if (loadError || !hasReadEnv()) {
    return (
      <>
        <ScreenHeader title="교량 상세" backHref="/bridges" />
        <main className="flex-1 px-4 py-5">
          <EmptyNotice
            headline="교량 정보를 불러오지 못했습니다."
            note={
              loadError
                ? '화면이 비어 있는 것은 정보가 없다는 뜻이 아니라, 지금 데이터를 읽지 못했다는 뜻입니다.'
                : '데이터베이스 연결이 아직 설정되지 않았습니다. .env.local 에 SUPABASE_URL 과 SUPABASE_ANON_KEY 를 채워 주세요.'
            }
            backHref="/bridges"
          />
        </main>
      </>
    )
  }

  if (!detail) notFound()

  const { bridge, history, summary } = detail
  const info = resolveInfoState(history)
  const described = describeInfoState(info.state, info.recordCount)
  const management = summarizeManagement(history)

  return (
    <>
      <ScreenHeader title={bridge.name} backHref="/bridges" />

      <main className="flex flex-1 flex-col gap-6 px-4 py-5">
        {/* F-02 ① 최상단 */}
        <SummaryCard summaryText={summary?.summary_text ?? null} historyHref={`/bridges/${id}/history`} />

        {/* 관리 요약 — F-02 ③. 준공·점검·보수를 한 카드에 나란히 둔다 */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[20px] leading-7 font-bold text-primary">관리 요약</h2>
            <InfoStateBadge state={info.state} label={info.label} size="sm" />
          </div>

          <div className="rounded-xl border border-border bg-surface shadow-sm">
            <dl className="divide-y divide-border">
              <FactRow
                label="준공"
                value={bridge.completed_year ? `${bridge.completed_year}년` : null}
                source={bridge.source}
                asOf={bridge.fetched_at?.slice(0, 10)}
              />
              <FactRow
                label="마지막 점검"
                value={management.lastInspectionYearMonth}
                detail={management.lastInspection?.event_type}
                source={management.lastInspection?.source}
                asOf={management.lastInspection?.data_as_of}
              />
              <FactRow
                label="마지막 보수"
                value={management.lastRepairYearMonth}
                detail={management.lastRepair?.event_type}
                source={management.lastRepair?.source}
                asOf={management.lastRepair?.data_as_of}
              />
            </dl>
          </div>

          <p className="mt-2 text-[13px] leading-[18px] text-fg-muted">{described.headline}</p>
          {described.note && (
            <p className="mt-1 text-[13px] leading-[18px] text-fg-muted">{described.note}</p>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <Link
            href={`/bridges/${id}/history`}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[16px] font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            <Icon name="clock" size={18} />
            관리 이력 전체 보기
          </Link>
          <Link
            href={`/bridges/${id}/today`}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-[16px] font-medium text-fg transition-colors hover:bg-surface-muted"
          >
            오늘의 상태 보기
          </Link>
        </div>

        {/* 기본 정보 */}
        <section>
          <h2 className="mb-3 text-[20px] leading-7 font-bold text-primary">기본 정보</h2>
          <div className="rounded-xl border border-border bg-surface shadow-sm">
            <dl className="divide-y divide-border">
              <FactRow label="교량명" value={bridge.name} />
              <FactRow label="소재지" value={bridge.address} />
              <FactRow label="관리기관" value={bridge.manager_org} />
              <FactRow label="문의처" value={bridge.manager_contact} />
              <FactRow
                label="연장"
                value={bridge.length_m ? `${bridge.length_m}m` : null}
              />
              <FactRow label="시설물 종류" value={bridge.facility_type} />
            </dl>
          </div>
          <SourceNote source={bridge.source} asOf={bridge.fetched_at?.slice(0, 10)} />
        </section>

        {info.state === INFO_STATE.ABSENT && (
          <EmptyNotice
            headline={described.headline}
            note={described.note}
            managerOrg={bridge.manager_org}
            managerContact={bridge.manager_contact}
          />
        )}
      </main>
    </>
  )
}

/** F-02 ④⑤ — 값이 없으면 추정하지 않고 '공개 정보 없음'으로 적는다. */
function FactRow({ label, value, detail, source, asOf }) {
  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[16px] text-fg-muted">{label}</dt>
        <dd
          className={`text-right text-[16px] ${
            hasValue ? 'font-medium text-fg' : 'text-fg-muted'
          }`}
        >
          {hasValue ? value : '공개 정보 없음'}
          {hasValue && detail && (
            <span className="block text-[13px] font-normal text-fg-muted">{detail}</span>
          )}
        </dd>
      </div>
      {hasValue && (source || asOf) && <SourceNote source={source} asOf={asOf} />}
    </div>
  )
}
