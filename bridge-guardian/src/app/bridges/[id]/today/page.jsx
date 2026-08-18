import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScreenHeader from '@/components/ScreenHeader'
import Icon from '@/components/Icon'
import { fetchBridgeDetail } from '@/lib/supabase/readClient'

/**
 * F-04 오늘의 상태 — PRD §13 착수 판정에 따라 아직 만들지 않았다.
 * ---------------------------------------------------------------------------
 * 이 파일에 기준치 비교 코드가 한 줄도 없는 것은 실수가 아니다.
 *
 *   Q2 (BLOCK) — 통행제한·기상·수위 데이터의 제공 필드가 미확인
 *   Q3 (BLOCK) — 위험 표시의 기준치를 누가 확정하는지 미정
 *
 * 기준치를 우리가 임시로라도 적어 넣으면 그 순간 '제품이 임의로 정한 기준'이
 * 되고, §2.2가 하지 않기로 한 위험도 판정에 해당한다. 임시값은 지워지지 않는다.
 *
 * 화면을 아예 없애지 않고 남긴 이유는, F-02에서 이 화면으로 가는 버튼이 있고
 * 눌렀을 때 404가 나는 것보다 '왜 아직 없는지'를 읽는 편이 낫기 때문이다.
 * ---------------------------------------------------------------------------
 */
export default async function BridgeTodayPage({ params }) {
  const { id } = await params

  let detail = null
  try {
    detail = await fetchBridgeDetail(id)
  } catch {
    detail = null
  }
  if (detail === null) notFound()

  const { bridge } = detail

  return (
    <>
      <ScreenHeader title="오늘의 상태" backHref={`/bridges/${id}`} />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-unknown-bg text-unknown-fg">
            <Icon name="minus-circle" size={28} />
          </span>

          <h2 className="text-[20px] leading-7 font-bold text-primary">
            오늘의 상태는 아직 제공하지 않습니다.
          </h2>
          <p className="mt-2 text-[15px] leading-[24px] text-fg-muted">
            {bridge.name}의 통행 제한 여부와 기상 조건을 표시하려면, 어떤 값을 기준으로
            &lsquo;기준치를 넘었다&rsquo;고 적을지가 먼저 정해져야 합니다. 그 기준을 저희가 임의로
            정하면, 공식 기관이 발표하지 않은 판정을 저희가 하는 것이 됩니다. 그래서 기준의
            출처가 확보될 때까지 이 화면을 비워 둡니다.
          </p>

          <div className="mt-5 rounded-lg bg-surface-muted p-4">
            <p className="text-[13px] font-medium text-fg-muted">확정되어야 하는 것</p>
            <ul className="mt-2 flex flex-col gap-2 text-[14px] leading-[22px] text-fg">
              <li>
                <span className="font-medium">공개 데이터 명세</span> — 통행 제한·기상 특보·하천
                수위가 실제로 어떤 필드로 제공되는지
              </li>
              <li>
                <span className="font-medium">기준치와 그 출처</span> — 풍속·강수·결빙·수위의
                기준값을 발표한 기관과 문서
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-[16px] font-semibold text-primary">지금 확인할 수 있는 것</h3>
          <p className="mt-1 text-[14px] leading-[22px] text-fg-muted">
            이 교량이 준공 이후 어떻게 관리되어 왔는지는 지금도 볼 수 있습니다.
          </p>
          <Link
            href={`/bridges/${id}/history`}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-medium text-accent hover:underline"
          >
            <Icon name="clock" size={16} />
            관리 이력 보기
          </Link>
        </section>

        <p className="text-[13px] leading-[18px] text-fg-muted">
          통행 제한의 1차 출처는 관리기관과 내비게이션입니다. 실시간 통제 정보는 그쪽에서
          확인하십시오.
        </p>
      </main>
    </>
  )
}
