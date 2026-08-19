import Link from 'next/link'
import Image from 'next/image'
import Icon from '@/components/Icon'

export const metadata = {
  title: 'BRIDGE SAFE — 일상의 안전을 잇다',
  description:
    '흩어져 있는 교량 공공데이터를 일상 속으로 가져와 연결합니다. 안전하다·위험하다고 단정하지 않고, 관리 이력과 관측값을 있는 그대로 전달합니다.',
}

/**
 * 랜딩 화면 — Stitch '일상의 안전을 잇다' 구성을 옮긴 것.
 * 초록 버튼(바로 시작하기 / 지금 내 주변 다리 확인하기)을 누르면 대시보드로 간다.
 * ---------------------------------------------------------------------------
 * 디자인을 따른 것 : 격자 배경 + 고정 상단 내비(초록 CTA) / 히어로(오버레이 위
 *   흰 글자) / '교량 안전에 집중하는 이유' 4장(01~04 큰 숫자 + 원형 아이콘) /
 *   '데이터는 있지만' 대비 2단 + 화살표 / 원칙 배너 / 핵심 기능 벤토 4장 /
 *   CTA 배너 / 초록 포인트가 있는 남색 푸터.
 *
 * 배경 이미지를 쓰지 않았다. 디자인 파일의 히어로·기능 카드 이미지는 외부
 * (Google) 주소여서, 그대로 두면 방문자 요청이 제3자 도메인으로 나가고 그 주소가
 * 사라지면 이미지도 사라진다. 같은 자리를 primary 그라디언트와 격자로 채웠다.
 *
 * 문구 중 두 곳을 사실에 맞게 고쳤다 :
 *   · '측풍 주의 / 현재 풍속 12m/s' → 지금 관측값을 받아 오지 못한다. 랜딩에
 *     지어낸 관측값을 적으면 그 자체가 오정보다
 *   · '실시간 기상 정보를 연결하여 보여줍니다' → 아직 연결되지 않았다.
 *     화면에 준비 중임을 적었다 (PRD §13 Q2·Q3)
 * ---------------------------------------------------------------------------
 */
export default function LandingPage() {
  return (
    <div className="bg-grid-pattern relative">
      <LandingNav />

      <main className="screen-wide w-full flex-1 px-gutter pt-24 pb-xl md:px-margin-desktop">
        <Hero />
        <WhyBridges />
        <ProblemAndShift />
        <Principle />
        <CoreFeatures />
        <ClosingCta />
      </main>

      <LandingFooter />
    </div>
  )
}

/* ── 상단 내비 ───────────────────────────────────────────────────────── */

const SECTIONS = [
  { href: '#why', label: '서비스 소개' },
  { href: '#features', label: '핵심 기능' },
  // 차별점 = '데이터는 있지만, 당신과는 연결되지 않았습니다' 절.
  // 정적 행정 데이터와 이용자 맥락을 나란히 놓은 곳이 이 서비스의 차별점이다.
  { href: '#difference', label: '차별점' },
]

function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-md bg-surface/80 px-gutter py-4 shadow-sm backdrop-blur-md md:px-margin-desktop">
      <span className="text-headline-md font-bold text-primary">
        BRIDGE SAFE
        <span className="ml-xs text-label-md font-normal text-on-surface-variant">
          : 국민용 교량 안전정보 알림 서비스
        </span>
      </span>

      {/* 디자인의 앵커 3개. 실제로 이 화면 안의 절로 내려간다. */}
      <div className="hidden items-center gap-lg md:flex">
        {SECTIONS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="text-label-md text-on-surface-variant transition-colors hover:text-primary"
          >
            {section.label}
          </a>
        ))}
      </div>

      <StartButton className="px-sm py-2 text-label-md">바로 시작하기</StartButton>
    </nav>
  )
}

/** 초록 CTA — 누르면 대시보드로 간다. 랜딩의 시작 버튼은 모두 이 컴포넌트다. */
function StartButton({ children, className = '', icon = null }) {
  return (
    <Link
      href="/dashboard"
      className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-sm rounded-full bg-secondary font-bold text-on-secondary shadow-md transition-colors hover:bg-on-secondary-container ${className}`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </Link>
  )
}

/* ── 히어로 ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="mt-lg mb-xl">
      <div className="relative flex min-h-[600px] items-center overflow-hidden rounded-[24px] shadow-lg">
        {/* 그라디언트는 영상이 아직 안 떴거나 재생하지 않을 때의 바탕이다.
            영상 로딩 중에 흰 사각형이 보이지 않게 항상 깔아 둔다. */}
        <div
          className="absolute inset-0 z-0 bg-primary"
          style={{
            backgroundImage:
              'linear-gradient(115deg, #031635 0%, #1a2b4b 55%, #364768 100%)',
          }}
          aria-hidden="true"
        />

        {/* 배경 영상. 소리가 없고 장식이므로 aria-hidden 으로 숨긴다.
            muted 는 자동재생의 필수 조건이고, preload="metadata" 로 첫 화면에서
            2.8MB 를 한꺼번에 받지 않게 한다 (PRD §11 3초 요구).
            움직임을 줄이도록 설정한 사용자에게는 globals.css 가 이 영상을 숨겨
            위 그라디언트만 남긴다. */}
        <video
          className="hero-video absolute inset-0 z-0 h-full w-full object-cover"
          src="/차도_다니게_해줘.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div
          className="absolute inset-0 z-10 bg-gradient-to-r from-primary/90 to-primary/20"
          aria-hidden="true"
        />

        {/* 폭 제한(md:max-w-3xl)을 걷어낸 이유 — 제목을 md 이상에서 한 줄로 두려면
            48px × 15자가 들어갈 폭이 필요하다. 본문 가독성은 아래 문단이 스스로
            max-w-2xl 로 제한한다. */}
        <div className="relative z-20 p-lg text-on-primary md:p-xl">
          <span className="mb-md inline-block rounded-full border border-secondary-container/30 bg-secondary/20 px-sm py-xs text-label-md text-secondary-container">
            Bridge Safety Information Service
          </span>

          {/* md 이상에서만 한 줄로 고정한다. 모바일에서 nowrap 을 걸면 화면을
              넘어가 가로 스크롤이 생긴다. */}
          <h1 className="mb-md text-[32px] leading-tight font-bold sm:text-[40px] md:text-display-lg md:whitespace-nowrap">
            매일 건너는 다리, 정말 안전할까?
          </h1>

          {/* 폭만 줄이고 높이는 그대로 둔다.
              w-fit 으로 상자를 가장 긴 줄에 딱 맞춰 오른쪽 빈 공간을 없애고,
              좌우 여백만 24px→16px 로 줄였다. 세로 여백과 줄 수는 그대로여서
              높이는 변하지 않는다. 글씨를 더 줄이거나 폭을 더 좁히면 줄이
              늘어나 오히려 높아진다.
              max-w-full 은 모바일에서 상자가 화면을 넘지 않게 하는 상한이다. */}
          <div className="mb-lg w-fit max-w-full rounded-xl bg-primary/20 px-4 py-md text-body-md backdrop-blur-md">
            <p>우리는 매일 다리를 건너지만,</p>
            <p>그 안전에 대해서는 막연한 믿음에 기대고만 있습니다.</p>
            <p>흩어져 있는 공공 데이터를 당신의 일상 속으로 가져와 연결합니다.</p>
          </div>

          <StartButton
            icon="map-pin"
            className="border-t border-white/20 bg-gradient-to-t from-secondary to-secondary-fixed-dim px-xl py-sm text-body-md shadow-lg"
          >
            지금 내 주변 다리 확인하기
          </StartButton>
        </div>
      </div>
    </section>
  )
}

/* ── 교량 안전에 집중하는 이유 ───────────────────────────────────────── */

const REASONS = [
  {
    no: '01',
    icon: 'car',
    title: '하나의 구조물, 여러 개의 위험',
    body: '구조적 안전성뿐만 아니라 차량 사고, 기상 악화(강풍, 결빙), 추락 위험, 하천 수위 상승 등 교통 공간으로서의 다양한 위험 요소가 복합적으로 작용하는 공간입니다.',
  },
  {
    no: '02',
    icon: 'warning-circle',
    title: '교량 안전의 시작은 ‘사전 인지’',
    body: '강풍이나 결빙, 하천 수위 상승과 같은 외부 환경부터 교량의 안전 상태와 관리 이력까지 미리 확인할 수 있다면, 이용자의 안전한 이동과 신속한 대응에 도움이 됩니다.',
  },
  {
    no: '03',
    icon: 'wrench',
    title: '오래된 교량, 중요한 건 ‘관리 상태’',
    body: '교량은 시간이 지날수록 노후화가 진행되지만, 노후화 자체가 곧 사고나 위험을 의미하지는 않습니다. 정기적인 안전점검과 적절한 보수·보강이 이루어진다면 노후 교량도 지속적으로 안전하게 관리할 수 있습니다.',
  },
  {
    no: '04',
    icon: 'eye-off',
    title: '안전한 교량, 국민에게는 보이지 않는다',
    body: '안전 관련 데이터는 존재하지만, 일반 시민이 이를 일상에서 직관적으로 체감하고 이해하기는 매우 어렵습니다.',
  },
]

function WhyBridges() {
  return (
    <section id="why" className="mb-xl scroll-mt-24">
      <div className="mb-lg text-center">
        <h2 className="mb-sm text-headline-lg text-primary">교량 안전에 집중하는 이유</h2>
        <p className="mx-auto max-w-3xl text-body-md text-on-surface-variant">
          우리가 매일 건너는 다리, 왜 그 안전에 더 많은 주의를 기울여야 할까요?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        {REASONS.map((reason) => (
          <div
            key={reason.no}
            className="group flex gap-lg rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-sm transition-all duration-300 hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-md">
              {/* 밝은 초록(secondary-fixed-dim #4ae183). 흰 카드 위에서 대비가
                  낮은 색이라 기본 투명도를 20%→70% 로 올렸다 — 20% 로 두면 거의
                  보이지 않는다. 순서를 나타내는 장식 숫자이고 같은 정보가 카드
                  순서로도 전달되므로 본문 대비 기준을 적용하지 않는다. */}
              <div className="text-display-lg leading-none font-bold text-secondary-fixed-dim opacity-70 transition-opacity duration-300 group-hover:opacity-100">
                {reason.no}
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-on-primary">
                <Icon name={reason.icon} size={24} />
              </div>
            </div>
            <div className="flex flex-col gap-md">
              <h3 className="text-headline-md text-primary">{reason.title}</h3>
              <p className="text-body-md leading-relaxed text-on-surface-variant">{reason.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── 데이터는 있지만 ─────────────────────────────────────────────────── */

const STATIC_POINTS = [
  '엑셀 파일 속 방대한 숫자',
  '담당 관리자만 볼 수 있는 점검표',
  '전문가만 이해할 수 있는 전문 용어',
]

const LIVE_POINTS = [
  '내 위치 기준으로 고른 교량 목록',
  '기상 관측값과 함께 보는 다리 상태',
  '직관적인 타임라인과 시각화',
]

function ProblemAndShift() {
  return (
    // scroll-mt-24 는 sticky 상단 내비 높이만큼 띄우는 것이다. 없으면 내비가
    // 제목을 덮어 눌러도 아무 데도 안 간 것처럼 보인다.
    <section id="difference" className="mb-xl scroll-mt-24">
      <div className="mb-lg text-center">
        <h2 className="mb-sm text-headline-lg text-primary">
          데이터는 있지만, 당신과는 연결되지 않았습니다.
        </h2>
        <p className="mx-auto max-w-3xl text-body-md text-on-surface-variant">
          복잡한 행정 문서는 전문가를 위한 것입니다. 우리는 시민의 눈높이에서 필요한 정보를
          재구성합니다.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-md md:flex-row md:items-stretch md:gap-lg">
        <div className="flex-1 rounded-xl border border-outline-variant/30 bg-surface-dim/30 p-lg shadow-sm">
          <div className="mb-md flex items-center gap-sm">
            <Icon name="file-text" size={22} className="text-outline" />
            <h3 className="text-headline-md text-outline">정적 행정 데이터 (Static)</h3>
          </div>
          <ul className="space-y-sm text-body-md text-on-surface-variant">
            {STATIC_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-sm">
                <Icon name="x" size={20} className="mt-0.5 text-outline" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center self-center py-sm text-primary md:py-0">
          <Icon name="arrow-down" size={40} className="md:hidden" />
          <Icon name="arrow-right" size={40} className="hidden md:block" />
        </div>

        <div className="relative flex-1 overflow-hidden rounded-xl border border-primary/20 bg-primary-container p-lg shadow-lg">
          <div className="mb-md flex items-center gap-sm">
            <Icon name="heart-pulse" size={22} className="text-secondary-fixed" />
            <h3 className="text-headline-md text-on-primary">이용자의 맥락으로</h3>
          </div>
          <ul className="space-y-sm text-body-md text-on-primary/90">
            {LIVE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-sm">
                <Icon name="check-circle" size={20} className="mt-0.5 text-secondary-fixed" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 원칙 ────────────────────────────────────────────────────────────── */

function Principle() {
  return (
    <section
      id="principle"
      className="mb-xl scroll-mt-24 rounded-2xl border-y border-outline-variant/20 bg-surface-container-low px-gutter py-xl text-center md:px-margin-desktop"
    >
      <Icon name="scale" size={44} className="mx-auto mb-md text-primary" />
      <h2 className="mb-md text-headline-lg text-primary">사실 그대로, 이용자의 맥락으로</h2>
      <div className="mx-auto max-w-4xl space-y-2 text-body-lg leading-relaxed text-on-surface-variant">
        <p>
          BRIDGE SAFE 는 특정 다리가 “위험하다” 또는 “안전하다”고 단정짓지 않습니다.
        </p>
        <p>
          대신 신뢰할 수 있는 관리 이력과, 주기적으로 갱신되는 기상 관측값을 있는 그대로
          전달합니다.
        </p>
        <p className="font-bold text-on-surface">
          오늘 이 다리를 건널지는 그 정보를 보고 당신이 판단합니다.
        </p>
      </div>
    </section>
  )
}

/* ── 핵심 기능 ───────────────────────────────────────────────────────── */

function CoreFeatures() {
  return (
    <section id="features" className="mb-xl scroll-mt-24">
      <h2 className="mb-lg text-center text-headline-lg text-primary">핵심 기능</h2>

      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {/* 큰 카드 — 관리 타임라인 */}
        <div className="group relative flex min-h-[400px] flex-col overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm transition-all duration-300 hover:shadow-lg md:col-span-2">
          {/* 배경 사진. next/image 가 WebP 로 변환·리사이즈한다 — 원본 PNG 는
              1.7MB 라 그대로 내보내면 첫 화면 3초 요구(PRD §11)를 넘긴다. */}
          <Image
            src="/features/screen.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 768px) 66vw, 100vw"
            className="z-0 object-cover"
          />
          {/* 사진 위 글자가 읽히도록 남색을 덮는다. 사진이 아직 안 떴을 때의
              바탕도 이 층이 맡는다. */}
          <div
            className="absolute inset-0 z-0 bg-gradient-to-t from-primary via-primary/70 to-primary/30"
            aria-hidden="true"
          />
          {/* ⚠ max-w-xl 을 쓰면 안 된다. Stitch 간격 토큰 --spacing-xl: 80px 가
              Tailwind 의 컨테이너 스케일 이름(xl = 36rem)과 겹쳐, max-w-xl 이
              80px 로 해석되어 글자가 한 자씩 세로로 쌓인다 (렌더링해 보고 확인).
              같은 이유로 max-w-{sm,md,lg} 도 쓸 수 없다 — 값을 직접 적는다. */}
          <div className="relative z-10 m-md mt-auto max-w-[36rem] rounded-xl bg-primary/20 p-md text-on-primary backdrop-blur-md md:p-lg">
            <div className="mb-md flex items-center gap-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-on-primary backdrop-blur-md">
                <Icon name="clock" size={28} />
              </div>
              <div>
                <h3 className="mb-xs text-headline-md">관리 타임라인</h3>
                <p className="text-label-md font-bold text-secondary-fixed">
                  Bridge Lifecycle Tracking
                </p>
              </div>
            </div>
            <p className="text-body-lg leading-relaxed text-on-primary/90">
              준공부터 최근의 정밀안전진단·보수 이력까지, 다리의 생애 주기를 한눈에 볼 수 있는
              타임라인을 제공합니다. 기록 사이의 간격도 함께 보여 얼마나 자주 관리되었는지 읽을 수
              있습니다.
            </p>
          </div>
        </div>

        {/* 오늘의 상태 */}
        <FeatureCard icon="cloud-sun" title="오늘의 상태" image="/features/f.png">
          <p className="mb-lg text-body-md leading-relaxed text-on-surface-variant">
            다리 위치에 해당하는 기상 관측값과 특보를 연결해 보여줍니다.
          </p>
          {/* 디자인에는 '측풍 주의 / 현재 풍속 12m/s' 가 적혀 있었다. 지금 관측값을
              받아 오지 못하므로 지어낸 수치를 랜딩에 적지 않는다. */}
          <div className="mt-auto flex items-center gap-md rounded-xl border border-outline-variant/40 bg-surface-container-low p-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-variant">
              <Icon name="wind" size={22} className="text-on-surface-variant" />
            </div>
            <div>
              <div className="text-label-md font-bold text-on-surface-variant">표시 준비 중</div>
              <div className="text-caption text-on-surface-variant">
                출처 있는 기준치를 확보한 뒤 켭니다
              </div>
            </div>
          </div>
        </FeatureCard>

        {/* 내 주변 다리 */}
        <FeatureCard icon="map" title="내 주변 다리" image="/features/n.png">
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            위치를 기준으로 가까운 다리를 골라 목록으로 보여줍니다. 위치는 브라우저 밖으로 나가지
            않습니다.
          </p>
        </FeatureCard>

        {/* 넓은 카드 — 정보의 투명성 */}
        <div className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm transition-all duration-300 hover:shadow-lg md:col-span-2 md:flex-row">
          {/* 'DATA MISSING' 사진 — 기록이 비어 있다는 이 카드의 내용과 맞는다. */}
          <div className="bg-grid-pattern relative h-48 shrink-0 bg-surface-container md:h-auto md:w-1/2">
            <Image
              src="/features/unnamed.jpg"
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center bg-surface-container-lowest p-lg md:w-1/2 md:p-xl">
            <div className="mb-md flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-low transition-colors duration-300 group-hover:bg-primary/5">
              <Icon
                name="minus-circle"
                size={36}
                className="text-outline transition-colors duration-300 group-hover:text-primary"
              />
            </div>
            <h3 className="mb-sm text-headline-md text-primary">정보의 투명성</h3>
            <p className="text-body-lg leading-relaxed text-on-surface-variant">
              데이터가 누락되거나 확인되지 않는 경우, 억지로 빈칸을 채우지 않고 “기록 없음”을
              명확히 표기합니다. 기록이 없다는 것은 점검을 하지 않았다는 뜻이 아닙니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, image, children }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/30 shadow-sm transition-all duration-300 hover:shadow-lg">
      {/* 사진 자리. 높이를 고정(h-40)하지 않고 카드 폭에 대한 비율(4:3)로 둔다 —
          카드가 넓어질수록 사진도 같이 커져서 잘리는 부분이 줄어든다.
          원본이 1024×1024 정사각이라 160px 띠로 두면 위아래가 많이 잘렸다.
          사진이 없으면 격자 바탕을 그대로 둔다. */}
      <div className="bg-grid-pattern relative aspect-[4/3] shrink-0 bg-surface-container">
        {image && (
          <Image
            src={image}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex grow flex-col bg-surface-container-lowest p-lg">
        <div className="mb-md flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-on-primary">
          <Icon name={icon} size={26} />
        </div>
        <h3 className="mb-sm text-headline-md text-primary">{title}</h3>
        {children}
      </div>
    </div>
  )
}

/* ── 마무리 CTA ──────────────────────────────────────────────────────── */

function ClosingCta() {
  return (
    <section className="mb-lg">
      <div className="relative overflow-hidden rounded-[24px] bg-primary p-lg text-center shadow-lg md:p-xl">
        <div className="bg-grid-pattern absolute inset-0 z-0 opacity-20" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="mb-md text-headline-lg text-on-primary">
            출퇴근길, 내가 지나는 교량의 상태를 확인하세요.
          </h2>
          <p className="mb-lg text-body-md text-on-primary/80">
            태풍, 강풍, 결빙 등 궂은 날씨 속에서도 매일 다리를 건너야 하는 국민들을 위해. 공개된
            관리 이력과 관측값을 있는 그대로 전달합니다.
          </p>
          <StartButton icon="arrow-right" className="px-xl py-lg text-[24px] shadow-lg">
            지금 내 주변 다리 확인하기
          </StartButton>
        </div>
      </div>
    </section>
  )
}

/* ── 푸터 ────────────────────────────────────────────────────────────── */

const FOOTER_LINKS = [
  'Privacy Policy',
  'Terms of Service',
  'Accessibility',
  'Contact Authority',
  'Data Transparency',
]

function LandingFooter() {
  return (
    <footer className="flex w-full flex-col items-center justify-between gap-sm border-t border-outline-variant/20 bg-primary px-gutter py-lg md:flex-row md:px-margin-desktop">
      <div className="flex flex-col items-center gap-md md:flex-row">
        <span className="text-headline-md font-bold text-on-primary">BRIDGE SAFE</span>
        <span className="text-caption text-on-primary/60">
          © 2026 BRIDGE SAFE.{' '}
          <span className="bg-secondary/20 text-secondary-fixed">
            Bridge Safety Information Service
          </span>
          .
        </span>
      </div>

      {/* 대상 문서가 아직 없어 비활성으로 둔다. href="#" 로 두면 눌렀을 때
          같은 화면이 다시 뜨는 것처럼 보여 더 혼란스럽다. */}
      <div className="flex flex-wrap justify-center gap-md text-caption">
        {FOOTER_LINKS.map((label) => (
          <span
            key={label}
            aria-disabled="true"
            title="아직 준비되지 않았습니다"
            className="cursor-not-allowed text-on-primary/50"
          >
            {label}
          </span>
        ))}
      </div>
    </footer>
  )
}
