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
