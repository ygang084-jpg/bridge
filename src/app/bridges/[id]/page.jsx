import Link from 'next/link'
import { notFound } from 'next/navigation'
import ScreenHeader from '@/components/ScreenHeader'
import SummaryCard from '@/components/SummaryCard'
import SourceNote from '@/components/SourceNote'
import InfoStateBadge from '@/components/InfoStateBadge'
import GradeChip from '@/components/GradeChip'
import EmptyNotice from '@/components/EmptyNotice'
import Icon from '@/components/Icon'
import { fetchBridgeDetail, hasReadEnv } from '@/lib/supabase/readClient'
import { describeInfoState, resolveInfoState, INFO_STATE } from '@/lib/infoState'
import { summarizeManagement } from '@/lib/history'

/**
 * F-02 교량 상세 — Stitch `실시간 모니터링 대시보드` 구성을 옮긴 것.
 * ---------------------------------------------------------------------------
 * 디자인을 따른 것 : 상단에 ID 배지 + 큰 교량명 / 왼쪽 4칸에 '교량 기본 제원'과
 *   '환경 요인' 카드 / 오른쪽 8칸에 요약 배너와 '유지보수 및 안전 이력' 세로
 *   타임라인 / 맨 아래 계측 카드 2장.
 *
 * 디자인 파일과 다르게 옮긴 것 — 전부 '없는 것을 있다고 말하지 않기'다.
 * 이 디자인은 센서가 달린 교량을 전제로 그려졌고, 우리에게는 센서가 없다.
 *
 *   · '실시간 데이터 수신 중' → 실시간으로 받는 것이 없다. 공개 데이터를 하루
 *     단위로 옮겨 오고, 이 API 는 1년에 한 번 갱신된다. 대신 데이터 기준일을 적는다.
 *   · 주경간 진동 0.42 gal · 하중 변위 1.2 mm → 센서가 없다. 자리는 두고 왜
 *     비었는지 적는다. 이 숫자를 지어내면 그것이 곧 안전 판정이 된다.
 *   · 기준치 '2.0 gal' · 허용 한계 '8 mm' → 출처 있는 기준치가 없다 (§13 Q3).
 *     기준치를 우리가 정하면 위험을 판정하는 것이 된다.
 *   · 풍속 3.2 m/s · 온도 14°C · 습도 45%, 그리고 '안전 범위 내' → 기상이 아직
 *     연결되지 않았고, '안전 범위 내'는 판정이다.
 *   · 타임라인의 '정상 작동' 칩 → 우리가 정상이라고 말할 수 없다. 칩은 공개
 *     데이터의 사건 종류(준공·정기점검·보수 …)를 그대로 적는다.
 *   · 점 색 → 사건 종류로만 나눈다. 등급이나 상태로 색을 나누면 색이 먼저
 *     판정해 버린다 (CLAUDE.md '등급 표시').
 *   · '점검 요청' 버튼 → 접수 후 처리 경로가 없다 (PRD §2.2 비목표).
 *   · '리포트 내보내기' → 만들 리포트가 없다.
 *   · 히어로 사진 → 외부(Google) 이미지였고, 특정 교량 사진을 우리가 갖고 있지도
 *     않다. 그 자리는 요약 문장이 대신한다 — 최상단에 요약을 두는 것은 F-02 ①이다.
 *   · 'ID: BR-SEO-001' → 우리 id 는 시설물 관리번호가 아니라 우리가 만든 해시다.
 *     그 사실을 배지 옆에 적는다.
 *   · 상단 내비의 Reports · Safety Guidelines · 알림 · 설정 · 프로필 → 없는 화면과
 *     없는 로그인이다. 앱 공통 헤더를 쓴다.
 *
 * 안전등급은 이력 항목 안에 있다 (F-02.1) — 교량의 항상적 속성이 아니라 그 시점의
 * 점검 결과이기 때문이다. 그래서 상단에 등급을 크게 뽑지 않는다.
 * ---------------------------------------------------------------------------
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
  const asOf = bridge.fetched_at?.slice(0, 10)

  return (
    <>
      <ScreenHeader title={bridge.name} backHref="/bridges" />

      <main className="screen-wide flex w-full flex-1 flex-col gap-xl px-margin-mobile py-lg md:px-margin-desktop">
        <PageHeader bridge={bridge} id={id} info={info} asOf={asOf} />

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="flex flex-col gap-gutter lg:col-span-4">
            <Specs bridge={bridge} asOf={asOf} />
            <Environment />
          </div>

          <div className="flex flex-col gap-gutter lg:col-span-8">
            {/* 디자인의 히어로 사진 자리. 사진이 없으므로 요약이 그 자리를 쓴다. */}
            <SummaryCard
              summaryText={summary?.summary_text ?? null}
              historyHref={`/bridges/${id}/history`}
            />
            <ManagementSummary management={management} bridge={bridge} asOf={asOf} />
            <HistoryTimeline history={history} id={id} described={described} info={info} />
          </div>
        </div>

        <Measurements />

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

/* ── 상단 ─────────────────────────────────────────────────────────────── */

function PageHeader({ bridge, id, info, asOf }) {
  return (
    <header className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {/* 디자인은 'ID: BR-SEO-001' 처럼 관리번호를 보여줬다. 우리 id 는 관리번호가
              아니라 좌표·이름으로 만든 해시이므로, 그렇다고 적는다. */}
          <span
            className="rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 text-caption text-on-surface-variant"
            title="공개 데이터에 시설물 관리번호가 없어 좌표·이름으로 만든 값입니다"
          >
            내부 ID {id}
          </span>
          <InfoStateBadge state={info.state} label={info.label} size="sm" />
          {/* 디자인의 '실시간 데이터 수신 중' 자리. 실시간으로 받는 것이 없으므로
              데이터가 언제 기준인지를 적는다. */}
          <span className="flex items-center gap-1 text-caption text-on-surface-variant">
            <Icon name="clock" size={14} />
            {asOf ? `${asOf} 기준 공개 데이터` : '데이터 기준일 미표기'}
          </span>
        </div>
        <h1 className="text-[28px] leading-9 font-bold text-primary md:text-headline-lg">
          {bridge.name}
        </h1>
      </div>

      {/* 디자인의 '리포트 내보내기'·'점검 요청' 자리. 둘 다 만들지 않는다 —
          만들 리포트가 없고, 점검 요청은 접수 후 처리 경로가 없다. 대신 실제로
          갈 곳이 있는 두 화면을 둔다. */}
      <div className="flex flex-wrap gap-sm">
        <Link
          href={`/bridges/${id}/history`}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 text-label-md font-medium text-on-primary transition-colors hover:bg-primary/90"
        >
          <Icon name="clock" size={18} />
          관리 이력 전체 보기
        </Link>
        <Link
          href={`/bridges/${id}/today`}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-5 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-low"
        >
          <Icon name="cloud-sun" size={18} />
          오늘의 상태
        </Link>
      </div>
    </header>
  )
}

/* ── 왼쪽 : 기본 제원 ─────────────────────────────────────────────────── */

function Specs({ bridge, asOf }) {
  return (
    <Card icon="info" title="교량 기본 제원">
      <dl className="flex flex-col gap-md">
        <Field label="소재지" value={bridge.address} wide />
        <div className="grid grid-cols-2 gap-md">
          <Field label="준공년도" value={bridge.completed_year ? `${bridge.completed_year}년` : null} />
          <Field label="연장" value={bridge.length_m ? `${bridge.length_m}m` : null} />
        </div>
        <div className="grid grid-cols-2 gap-md">
          {/* 디자인의 '교량형식'(게르버 트러스교)·'폭'(27.0m 6차로)·'설계하중'(DB-24)
              자리다. 공개 데이터가 이 값들을 주는데(상부구조·총폭·차로수·설계하중)
              담을 컬럼을 아직 만들지 않아 비어 있다. 컬럼을 추가하면 채워진다. */}
          <Field label="교량형식" value={null} note="담을 컬럼이 아직 없습니다" />
          <Field label="폭 · 차로" value={null} note="담을 컬럼이 아직 없습니다" />
        </div>
        <Field label="설계하중" value={null} note="담을 컬럼이 아직 없습니다" />
        <div className="grid grid-cols-2 gap-md">
          <Field label="관리기관" value={bridge.manager_org} />
          <Field label="문의처" value={bridge.manager_contact} />
        </div>
      </dl>
      <SourceNote source={bridge.source} asOf={asOf} align="left" />
    </Card>
  )
}

/* ── 왼쪽 : 환경 요인 ─────────────────────────────────────────────────── */

/**
 * 디자인은 풍속·온도·습도에 실제 값과 '안전 범위 내' 판정을 함께 뒀다.
 * 기상이 연결되지 않았고, '안전 범위 내'는 우리가 할 수 없는 판정이다.
 * 자리와 항목 이름만 남기고 왜 비었는지 적는다.
 */
const ENVIRONMENT_ROWS = [
  { icon: 'wind', label: '풍속' },
  { icon: 'thermometer', label: '온도' },
  { icon: 'droplet', label: '습도' },
]

function Environment() {
  return (
    <Card icon="cloud-sun" title="환경 요인">
      <div className="flex flex-col gap-sm">
        {ENVIRONMENT_ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3"
          >
            <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
              <Icon name={row.icon} size={18} />
              {row.label}
            </span>
            <span className="text-label-md text-on-surface-variant">표시 준비 중</span>
          </div>
        ))}
      </div>
      <p className="mt-sm text-caption leading-4 text-on-surface-variant">
        기상 관측을 아직 연결하지 않아 값이 없습니다. 값이 들어와도 ‘안전 범위 내’ 같은 판정은 적지
        않습니다 — 어느 값부터 주의인지에 대한 출처 있는 기준을 확인하지 못했습니다.
      </p>
    </Card>
  )
}

/* ── 오른쪽 : 관리 요약 ───────────────────────────────────────────────── */

/** F-02 ③ — 준공연도를 단독으로 강조하지 않고 점검·보수와 나란히 둔다. */
function ManagementSummary({ management, bridge, asOf }) {
  return (
    <Card icon="scale" title="관리 요약">
      <dl className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <Field
          label="준공"
          value={bridge.completed_year ? `${bridge.completed_year}년` : null}
          source={bridge.source}
          asOf={asOf}
        />
        <Field
          label="마지막 점검"
          value={management.lastInspectionYearMonth}
          detail={management.lastInspection?.event_type}
          source={management.lastInspection?.source}
          asOf={management.lastInspection?.data_as_of}
        />
        <Field
          label="마지막 보수"
          value={management.lastRepairYearMonth}
          detail={management.lastRepair?.event_type}
          source={management.lastRepair?.source}
          asOf={management.lastRepair?.data_as_of}
        />
      </dl>
    </Card>
  )
}

/* ── 오른쪽 : 타임라인 ────────────────────────────────────────────────── */

/**
 * 점 색은 사건 종류로만 나눈다. 디자인은 '정상 작동'(초록)·'점검 완료'(남색)처럼
 * 상태로 나눴는데, 우리는 상태를 판정하지 않는다. 색이 등급을 대신 말하게 되는
 * 것을 막는 것이 등급 칩을 중립 색으로 둔 이유와 같다.
 */
const DOT_TONE = {
  준공: 'bg-surface-tint',
  정기점검: 'bg-primary',
  정밀점검: 'bg-primary',
  정밀안전진단: 'bg-primary',
  보수: 'bg-outline',
  보강: 'bg-outline',
}

const TIMELINE_PREVIEW = 4

function HistoryTimeline({ history, id, described, info }) {
  const rows = [...(history ?? [])]
    .sort((a, b) => String(b.occurred_on).localeCompare(String(a.occurred_on)))
    .slice(0, TIMELINE_PREVIEW)

  return (
    <Card icon="clock" title="유지보수 및 안전 이력" action={{ href: `/bridges/${id}/history`, label: '전체 보기' }}>
      {rows.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{described.headline}</p>
      ) : (
        <ol className="relative ml-2 space-y-lg border-l-2 border-outline-variant/60 pb-2">
          {rows.map((row) => (
            <li key={`${row.occurred_on}-${row.event_type}`} className="relative pl-8">
              <span
                aria-hidden="true"
                className={`absolute top-1.5 -left-[9px] h-4 w-4 rounded-full border-2 border-surface-container-lowest ${
                  DOT_TONE[row.event_type] ?? 'bg-outline-variant'
                }`}
              />
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded bg-surface-variant px-2 py-0.5 text-caption font-bold text-on-surface-variant">
                  {row.event_type}
                </span>
                <span className="text-label-md font-bold text-on-surface-variant">
                  {formatDate(row.occurred_on)}
                </span>
              </div>
              {row.safety_grade && <GradeChip grade={row.safety_grade} className="mb-2" />}
              {row.description && (
                <p className="text-body-md text-on-surface-variant">{row.description}</p>
              )}
              <SourceNote source={row.source} asOf={row.data_as_of} align="left" />
            </li>
          ))}
        </ol>
      )}

      {/* 점이 적은 것이 관리를 적게 했다는 뜻이 아니라는 문장. 이 화면에서 가장
          중요한 문구다 (F-03 수용기준 ⑤, F-05 ②). */}
      {info.state !== INFO_STATE.ABSENT && described.note && (
        <p className="mt-md text-caption leading-4 text-on-surface-variant">{described.note}</p>
      )}
    </Card>
  )
}

/* ── 아래 : 계측 ──────────────────────────────────────────────────────── */

/**
 * 디자인의 '주경간 진동 수치'·'하중 변위량' 카드 자리.
 *
 * 이 교량에 센서가 없다. 값도 없고 기준치도 없다. 자리를 지우지 않고 남기는
 * 이유는, 지웠다면 '이 화면에 계측이 원래 없다'로 읽히기 때문이다 — 없는 것은
 * 계측 자체가 아니라 우리가 받아 오는 값이다.
 */
const MEASUREMENTS = [
  { icon: 'wind', title: '주경간 진동', unit: 'gal' },
  { icon: 'scale', title: '하중 변위량', unit: 'mm' },
]

function Measurements() {
  return (
    <section>
      <h2 className="mb-md flex items-center gap-2 text-headline-md font-semibold text-primary">
        <Icon name="eye" size={20} />
        계측값
      </h2>
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
        {MEASUREMENTS.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
          >
            <h3 className="mb-md flex items-center gap-2 border-b border-outline-variant pb-3 text-body-lg font-semibold text-primary">
              <Icon name={item.icon} size={18} />
              {item.title}
            </h3>
            <p className="flex items-end gap-2">
              <span className="text-[32px] leading-none font-bold text-on-surface-variant/40">—</span>
              <span className="pb-1 text-body-md text-on-surface-variant">{item.unit}</span>
            </p>
            <p className="mt-md text-caption leading-4 text-on-surface-variant">
              이 교량에 계측 센서가 없습니다. 값을 지어내면 그것이 곧 안전 판정이 되므로 비워 둡니다.
              기준치(‘허용 한계’)도 출처를 확인하지 못해 표시하지 않습니다.
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── 공통 조각 ────────────────────────────────────────────────────────── */

function Card({ icon, title, action, children }) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-md flex items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <h2 className="flex items-center gap-2 text-headline-md font-semibold text-primary">
          <Icon name={icon} size={20} />
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-label-md font-bold text-primary hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** F-02 ④⑤ — 값이 없으면 추정하지 않고 왜 없는지 적는다. */
function Field({ label, value, detail, note, source, asOf, wide = false }) {
  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className={`flex flex-col gap-1 ${wide ? 'col-span-full' : ''}`}>
      <dt className="text-caption text-on-surface-variant">{label}</dt>
      <dd
        className={
          hasValue ? 'text-body-md font-bold text-primary' : 'text-body-md text-on-surface-variant'
        }
      >
        {hasValue ? value : (note ?? '공개 정보 없음')}
        {hasValue && detail && (
          <span className="block text-caption font-normal text-on-surface-variant">{detail}</span>
        )}
      </dd>
      {hasValue && (source || asOf) && <SourceNote source={source} asOf={asOf} align="left" />}
    </div>
  )
}

/** '2024-10-30' → '2024. 10. 30'. 형식을 못 읽으면 원문 그대로 둔다. */
function formatDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return matched ? `${matched[1]}. ${matched[2]}. ${matched[3]}` : String(value)
}
