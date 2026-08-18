/**
 * 인라인 SVG 아이콘.
 *
 * 프로토타입은 Phosphor Icons 를 CDN 에서 불렀는데, 배포판에서는 인라인으로 바꿨다.
 * 이유 두 가지 — 제3자 도메인으로 방문자 요청이 새지 않고, CDN 이 죽어도
 * 상태 아이콘이 사라지지 않는다. 접근성 요구(색상 단독 사용 금지)를 아이콘이
 * 떠받치고 있으므로, 아이콘이 사라지면 요구가 무너진다.
 */

const PATHS = {
  'arrow-left': <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  'map-pin': (
    <>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.7-4.7" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </>
  ),
  'warning-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.4v.2" />
    </>
  ),
  'minus-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12h7" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6v.2" />
    </>
  ),
  'file-text': (
    <>
      <path d="M6 3.5h7.5L18 8v12.5H6z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9 12.5h6M9 16h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  building: (
    <>
      <path d="M5 20.5V6.5l7-3 7 3v14" />
      <path d="M9.5 20.5v-5h5v5" />
      <path d="M9 10h1.5M13.5 10H15" />
    </>
  ),

  /* 대시보드 섹션 머리·내비게이션용. Stitch 대시보드가 Material Symbols 를
     CDN 에서 불렀는데, 여기서는 같은 뜻의 라인 아이콘을 인라인으로 둔다 —
     이 파일 맨 위에 적은 이유(제3자 요청·CDN 장애)가 그대로 적용된다. */
  'cloud-sun': (
    <>
      <path d="M8 6.5V5M4.6 8.1 3.5 7M11.4 8.1 12.5 7M4 12H2.5" />
      <circle cx="8" cy="11.5" r="2.8" />
      <path d="M9 20.5h8.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 9 20.5z" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4" />
      <path d="M12 16.6v.2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  'heart-pulse': (
    <>
      <path d="M12 20s-7.5-4.7-7.5-9.5A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.9c0 1.3-.6 2.6-1.5 3.8" />
      <path d="M12.5 14h2l1.5-2.2 1.5 4.4L19 14h2.5" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 8.5h3l1.5-2h6l1.5 2h3v10h-15z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5v9.5H4z" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  map: (
    <>
      <path d="M9.5 4.5 3.5 6.5v13l6-2 5 2 6-2v-13l-6 2z" />
      <path d="M9.5 4.5v13M14.5 6.5v13" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.5 3.5a5 5 0 0 0-4.2 7.4L4 17.2 6.8 20l6.3-6.3A5 5 0 0 0 19 4.8l-2.7 2.7-2.3-.4-.4-2.3z" />
    </>
  ),
  car: (
    <>
      <path d="M4 15.5h16v-3l-1.8-4H5.8L4 12.5z" />
      <path d="M4 15.5v2.5h2.5v-2.5M17.5 15.5V18H20v-2.5" />
      <path d="M7 12h10" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16.5V5.5" />
      <path d="m8 9.5 4-4 4 4" />
      <path d="M4.5 15v4.5h15V15" />
    </>
  ),

  /* '내 교량' 화면의 관측 요인·카드 액션용. */
  wind: (
    <>
      <path d="M3 8.5h9a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12.5h13a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16.5h6" />
    </>
  ),
  thermometer: (
    <>
      <path d="M14 14.8V5.5a2 2 0 1 0-4 0v9.3a3.5 3.5 0 1 0 4 0z" />
      <path d="M12 11v4.6" />
    </>
  ),
  droplet: <path d="M12 3.5s5.5 5.6 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.1 12 3.5 12 3.5z" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  star: (
    <path d="m12 4.5 2.4 5 5.4.7-3.9 3.7 1 5.4-4.9-2.7-4.9 2.7 1-5.4-3.9-3.7 5.4-.7z" />
  ),
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
}

export default function Icon({ name, size = 20, className = '' }) {
  const shape = PATHS[name]
  if (!shape) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {shape}
    </svg>
  )
}
