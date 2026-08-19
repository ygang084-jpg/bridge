import Link from 'next/link'
import Icon from '@/components/Icon'
import { TopNav, BottomNav } from '@/components/AppNav'
import AppFooter from '@/components/AppFooter'
import { DISCLOSURE_TEXT } from '@/components/Disclosure'
import { firstHistoryHref, loadBridgeCards } from '@/lib/bridges/cards.js'
import { cronTextFor } from '@/lib/cron.js'
import vercelConfig from '../../../vercel.json'

export const metadata = {
  title: '정보 안내 — BRIDGE SAFE',
  description:
    '어떤 기관의 데이터를 쓰는지, 언제 갱신되는지, 그리고 이 서비스가 무엇을 하지 않는지 적어 둔 화면입니다.',
}

/**
 * '정보 안내' 화면 — Stitch `정보 안내` 구성을 옮긴 것.
 * ---------------------------------------------------------------------------
 * 이 화면이 다른 서비스의 '더보기'와 다른 자리에 있는 이유는 하나다. 판정하지
 * 않는다는 원칙은 화면 곳곳의 빈자리로 나타나는데, 설명이 없으면 그 빈자리가
 * 고장으로 읽힌다. 그래서 내비게이션에 항목을 두고 상시 고지에서도 링크한다.
 *
 * 디자인을 따른 것 : 중앙 정렬 헤더 + 한 문단 소개 / 상단 고지 배너 / '데이터 출처
 *   및 갱신 주기' 카드 그리드 / FAQ 아코디언 / 하단 푸터.
 *
 * 디자인 파일과 다르게 옮긴 것 — 모두 '없는 것을 있다고 말하지 않기' 하나에서
 * 나온다 (CLAUDE.md · PRD §7) :
 *
 *   · 'AI 분석은 참고용이며…' → 이 제품에 AI 가 없다. 요약은 규칙 기반
 *     템플릿이다 (PRD §15.1). AI 라고 적으면 사실과 다르고, 고지가 막으려던
 *     오해를 오히려 키운다 — Disclosure.jsx 가 같은 이유로 같은 결론을 적어 두었다.
 *     그래서 배너 문구를 그 상시 고지에서 그대로 가져와 한 곳에서만 관리한다.
 *   · '실시간 IoT 센서망', '가공된 예측값' → 센서도 예측도 없다.
 *   · 출처 카드의 기관·갱신주기(국토교통부 월 1회 / 국토안전관리원 분기별 /
 *     기상청 10분) → 지어낸 값이다. 지금 실제로 연결된 외부 출처는 둘뿐이므로
 *     '쓰는 것'과 '아직 연결되지 않은 것'을 나눠 적는다. 여기서 갱신 주기를
 *     실제보다 짧게 적는 것은 데이터를 실제보다 믿게 만드는 일이다.
 *   · 아직 연결되지 않은 항목에 기관명을 적지 않는다. 어느 데이터셋을 쓸지는
 *     아직 정하지 못했다 (PRD §13 Q2 미해소). 예정 기관을 적으면 결정된 것처럼
 *     읽힌다 — 연결되는 시점에 이 표에 이름과 갱신 주기를 적는다.
 *   · "'정보 없음'은 정밀 점검 진행 중이어 보류된 상태" → 그런 사실을 알 수
 *     없다. 없는 이유를 지어내는 것이 '기록 없음'을 '문제 없음'으로 바꿔 읽히게
 *     만드는 가장 빠른 길이다 (PRD F-05 ②③).
 *   · 배너 색 : 디자인은 error(빨강) 계열이었다. 중립 배경 + primary 테두리로
 *     바꿨다. 이 배너는 위험을 알리는 것이 아니라 우리가 무엇을 하지 않는지
 *     알리는 것이고, 빨강은 '이 다리가 위험하다'로 읽힐 자리를 만든다
 *     (등급 칩을 중립 색으로 둔 것과 같은 이유).
 *   · 상단 내비의 Reports / 알림 / 설정 / 프로필 아바타, 푸터의 배지·ⓒ2024 →
 *     제보도 알림도 로그인도 없고 아바타는 외부(Google) 이미지였다. 앱의
 *     공통 내비(AppNav)와 푸터(AppFooter)를 그대로 쓴다.
 *
 * 갱신 주기는 `vercel.json` 에서 파생시킨다. 화면에 손으로 적으면 스케줄을 바꿀 때
 * 조용히 어긋나고, '언제 갱신되는지'는 곧 '얼마나 믿어도 되는지'다.
 * ---------------------------------------------------------------------------
 */
export default async function InfoPage() {
  // 내비의 '기록' 목적지를 다른 화면과 같게 두려고 읽는다. 이 화면 자체는
  // 교량 데이터를 쓰지 않는다.
  const { bridges } = await loadBridgeCards()
  const historyHref = firstHistoryHref(bridges)

  const crons = vercelConfig?.crons
  const newsCron = cronTextFor(crons, '/api/cron/refresh-news')
  const summaryCron = cronTextFor(crons, '/api/cron/refresh-summaries')

  return (
    <>
      <TopNav active="info" historyHref={historyHref} />

      <main className="screen-wide relative z-10 flex w-full flex-1 flex-col px-margin-mobile py-xl md:px-margin-desktop">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-xl">
          <Intro />
          <NoticeBanner />
          <WhatWeDoNot />
          <DataSources newsCron={newsCron} summaryCron={summaryCron} />
          <Faq />
        </div>
      </main>

      <AppFooter />
      <BottomNav active="info" historyHref={historyHref} />
    </>
  )
}

/* ── 소개 ─────────────────────────────────────────────────────────────── */

function Intro() {
  return (
    <header className="text-center md:text-left">
      <h1 className="mb-4 text-[24px] leading-8 font-semibold text-primary md:text-headline-lg">
        정보 안내
      </h1>
      <p className="mx-auto max-w-2xl text-body-lg text-on-surface-variant md:mx-0">
        BRIDGE SAFE 는 매일 건너는 교량에 대해 <strong className="font-semibold">공개된 기록</strong>
        을 찾아 읽기 쉬운 자리에 옮겨 놓는 서비스입니다. 저희가 교량을 측정하거나 상태를 판정하지는
        않습니다. 이 화면에는 어떤 데이터를 어디서 가져오는지, 언제 갱신되는지, 그리고 이 서비스가
        하지 않는 일이 무엇인지 적어 두었습니다.
      </p>
    </header>
  )
}

/* ── 고지 배너 ────────────────────────────────────────────────────────── */

function NoticeBanner() {
  return (
    <section
      aria-labelledby="notice-heading"
      className="flex items-start gap-4 rounded-xl border border-primary/30 border-l-4 border-l-primary bg-surface-container-low p-md"
    >
      <span className="mt-0.5 shrink-0 text-primary">
        <Icon name="info" size={24} />
      </span>
      <div>
        <h2 id="notice-heading" className="mb-2 text-[18px] leading-7 font-semibold text-primary">
          요약과 문구를 AI 가 만들지 않습니다
        </h2>
        <p className="text-body-md text-on-surface-variant">
          교량 상세 화면 맨 위의 한 문장 요약은 저장된 기록을 정해진 템플릿에 넣어 만듭니다. 문장을
          생성하는 모델도, 상태를 추정하는 예측값도, 현장 센서도 쓰지 않습니다. {DISCLOSURE_TEXT}{' '}
          이상 징후를 발견하셨다면 이 서비스가 아니라 해당 교량의 관리기관이나 119 로 알려주세요 —
          저희는 접수 창구가 아닙니다.
        </p>
      </div>
    </section>
  )
}

/* ── 하지 않는 것 ─────────────────────────────────────────────────────── */

/** 각 항목의 '왜'까지 적는다. 이유가 없으면 기능이 덜 만들어진 것으로 읽힌다. */
const NOT_DOING = [
  {
    icon: 'scale',
    title: '안전·위험 판정',
    body:
      '“안전합니다 / 위험합니다” 라고 쓰지 않습니다. 그렇게 쓰려면 우리가 기준을 정해야 하고, ' +
      '그 순간 공개 기록을 옮기는 일이 아니라 판정하는 일이 됩니다.',
  },
  {
    icon: 'map-pin',
    title: '대피 경로 안내',
    body: '경로를 잘못 안내하면 그것이 곧 인명 피해가 됩니다. 통제·우회 안내의 1차 출처는 관리기관과 내비게이션입니다.',
  },
  {
    icon: 'upload',
    title: '이상징후 제보 접수',
    body: '접수한 뒤 처리하고 회신할 경로가 없습니다. 받아만 두면 신고한 사람은 조치가 진행된다고 믿게 됩니다.',
  },
  {
    icon: 'user',
    title: '로그인·개인정보 수집',
    body:
      '계정이 없습니다. 위치는 브라우저에서만 쓰고 서버로 보내지 않으며, ' +
      '‘내 교량’ 목록도 이용자 브라우저에 저장됩니다.',
  },
]

function WhatWeDoNot() {
  return (
    <section aria-labelledby="not-doing-heading">
      <h2
        id="not-doing-heading"
        className="mb-6 flex items-center gap-2 text-headline-md font-semibold text-primary"
      >
        <Icon name="minus-circle" size={22} />
        이 서비스가 하지 않는 일
      </h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {NOT_DOING.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
                <Icon name={item.icon} size={20} />
              </span>
              <h3 className="text-label-md font-bold text-primary">{item.title}</h3>
            </div>
            <p className="text-body-md text-on-surface-variant">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── 데이터 출처 ──────────────────────────────────────────────────────── */

function DataSources({ newsCron, summaryCron }) {
  const inUse = [
    {
      icon: 'file-text',
      org: '네이버',
      name: '뉴스 검색 API',
      role: '교량 관련 언론 기사 목록. 제목·링크·요약은 기사 원문에서 그대로 옮기고, 저희가 새로 쓰지 않습니다.',
      cycle: newsCron,
    },
    {
      icon: 'map',
      org: '카카오',
      name: '카카오맵',
      role: '지도 화면과 대시보드 지도 자리의 지도 타일. 지도를 여는 동안 브라우저가 카카오에 직접 요청합니다.',
      cycle: '지도를 열 때마다',
    },
  ]

  const pending = [
    { icon: 'building', label: '교량 기본정보', detail: '준공년도 · 연장 · 시설물 종별 · 관리기관' },
    { icon: 'clock', label: '관리 이력', detail: '점검 · 보수 · 보강 기록과 그 시점' },
    { icon: 'cloud-sun', label: '기상 관측·특보', detail: '바람 · 기온 · 강수 · 특보 발효 여부' },
    { icon: 'car', label: '통행 제한', detail: '차량 통행 제한 등록 여부' },
    { icon: 'alert-triangle', label: '위험 표시 기준치', detail: '어느 값부터 주의인지에 대한 출처 있는 기준' },
  ]

  return (
    <section aria-labelledby="sources-heading">
      <h2
        id="sources-heading"
        className="mb-6 flex items-center gap-2 text-headline-md font-semibold text-primary"
      >
        <Icon name="info" size={22} />
        데이터 출처와 갱신 주기
      </h2>

      <h3 className="mb-3 text-label-md font-bold text-on-surface">지금 쓰는 것</h3>
      <ul className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {inUse.map((source) => (
          <li
            key={source.name}
            className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name={source.icon} size={20} />
              </span>
              <div>
                <p className="text-caption text-on-surface-variant">{source.org}</p>
                <h4 className="text-label-md font-bold text-primary">{source.name}</h4>
              </div>
            </div>
            <p className="mb-4 text-body-md text-on-surface-variant">{source.role}</p>
            <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-3">
              <span className="text-caption text-on-surface-variant">갱신 주기</span>
              {/* 크론을 못 읽으면 지어내지 않고 그렇게 적는다. */}
              <span className="text-label-md text-on-surface">
                {source.cycle ?? '확인할 수 없습니다'}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mb-8 text-body-md text-on-surface-variant">
        교량 상세의 한 문장 요약은 저장된 기록에서 다시 만듭니다 —{' '}
        <strong className="font-semibold text-on-surface">{summaryCron ?? '확인할 수 없습니다'}</strong>. 갱신에
        실패하면 값을 지우지 않고 마지막 갱신 시각과 함께 실패 사실을 함께 보여줍니다.
      </p>

      <h3 className="mb-2 text-label-md font-bold text-on-surface">아직 연결되지 않은 것</h3>
      <p className="mb-3 text-body-md text-on-surface-variant">
        아래 항목은 화면에 자리가 있지만 값이 비어 있습니다. 어느 기관의 어떤 데이터를 쓸지 아직
        정하지 못했기 때문이며, 연결되는 시점에 기관명과 갱신 주기를 이 표에 적습니다. 비어 있는
        자리를 임의의 값이나 ‘해당 없음’으로 채우지 않습니다 — 값이 없다는 사실 자체가 정보입니다.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pending.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-3"
          >
            <span className="mt-0.5 shrink-0 text-on-surface-variant/70">
              <Icon name={item.icon} size={18} />
            </span>
            <div>
              <p className="text-label-md font-semibold text-on-surface">{item.label}</p>
              <p className="text-caption text-on-surface-variant">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */

/**
 * `<details>` 로 만든다. 여닫는 데 자바스크립트가 필요 없고, 스크립트가 실패해도
 * 답변 문구가 화면에 남는다. 이 화면에서 사라지면 안 되는 것이 바로 그 문구다.
 */
const FAQ = [
  {
    q: '이 서비스는 다리가 안전한지 판정해주나요?',
    a:
      '아니요. 판정하지 않습니다. 저희가 하는 일은 공개된 점검·보수 기록과 관측값을 시간순으로 ' +
      '늘어놓는 것까지입니다. 그 기록을 보고 판단하는 것은 이용자이고, 공식 판정은 해당 교량의 ' +
      '관리기관과 법정 안전진단이 합니다.',
  },
  {
    q: '‘정보 없음’이라고 뜨면 위험한 건가요?',
    a:
      '아니요. 그리고 반대로 ‘문제 없다’는 뜻도 아닙니다. ‘정보 없음’은 공개된 데이터에서 그 값을 ' +
      '찾지 못했다는 뜻일 뿐입니다. 기록이 없는 구간을 ‘점검하지 않은 기간’으로 적지 않는 것도, ' +
      '통행 제한 자리를 ‘제한 없음’으로 채우지 않는 것도 같은 이유입니다 — 정보가 없는 상태를 ' +
      '안전 신호로 바꿔 읽히게 하지 않기 위해서입니다.',
  },
  {
    q: '안전등급이 초록·빨강으로 표시되지 않는 이유가 뭔가요?',
    a:
      '색으로 칠하면 어느 등급이 좋은지를 색이 먼저 판정해 버립니다. 등급의 법정 정의 원문을 아직 ' +
      '확인하지 못했으므로 등급 칩은 중립 색으로 두고 등급 값만 적습니다. 등급은 관리 이력 ' +
      '타임라인의 해당 시점에서 보는 것이 제자리입니다.',
  },
  {
    q: '교량 목록이 비어 있는데 오류인가요?',
    a:
      '오류가 아닙니다. 교량 데이터가 아직 연결되지 않아 등록된 교량이 0건입니다. 목록이 비어 ' +
      '있는 것은 다리가 없다는 뜻이 아니라, 아직 옮겨 온 공개 기록이 없다는 뜻입니다. 데이터를 ' +
      '읽어오다 실패한 경우에는 화면이 그 사실을 따로 알려줍니다.',
  },
  {
    q: '뉴스 기사는 왜 특정 교량에 붙지 않나요?',
    a:
      '기사를 교량에 붙이면 ‘뉴스에 났다 = 그 다리가 위험하다’로 읽힙니다. 제목에 교량명이 들어 ' +
      '있다는 것만으로 그 교량의 상태를 말할 수는 없습니다. 그래서 기사는 전체 목록으로만 두고, ' +
      '말머리도 제목·요약에 실제로 있던 낱말로만 붙이며 그 낱말을 함께 보여줍니다.',
  },
]

function Faq() {
  return (
    <section aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="mb-6 flex items-center gap-2 text-headline-md font-semibold text-primary"
      >
        <Icon name="file-text" size={22} />
        자주 묻는 질문
      </h2>
      <div className="flex flex-col gap-4">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-label-md font-bold text-on-surface transition-colors hover:bg-surface-variant/30">
              <span>{item.q}</span>
              <span className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-90">
                <Icon name="chevron-right" size={18} />
              </span>
            </summary>
            <div className="border-t border-outline-variant px-6 pt-3 pb-4">
              <p className="text-body-md text-on-surface-variant">{item.a}</p>
            </div>
          </details>
        ))}
      </div>

      <p className="mt-6 text-body-md text-on-surface-variant">
        더 보실 곳 —{' '}
        <Link href="/bridges" className="font-semibold text-primary underline">
          내 주변 교량 목록
        </Link>{' '}
        ·{' '}
        <Link href="/map" className="font-semibold text-primary underline">
          지도
        </Link>
      </p>
    </section>
  )
}
