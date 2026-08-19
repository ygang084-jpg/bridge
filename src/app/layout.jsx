import { Noto_Sans_KR } from 'next/font/google'
import Disclosure from '@/components/Disclosure'
import './globals.css'

// next/font 는 빌드 시점에 폰트를 내려받아 우리 도메인에서 서빙한다.
// 프로토타입은 fonts.googleapis.com 을 브라우저에서 직접 불렀는데,
// 공공 정보 서비스가 방문자 요청을 제3자 도메인으로 흘리지 않는 편이 낫다.
// subsets 를 지정하지 않고 preload: false 로 둔다 — 한글 subset 은 매우 커서
// 전부 preload 하면 첫 화면이 오히려 늦어진다 (PRD §11 3초 요구).
// CJK 폰트에서 next/font 가 권하는 방식이다.
const notoSansKR = Noto_Sans_KR({
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
})

export const metadata = {
  title: 'BRIDGE SAFE — 이 다리는 어떻게 관리되어 왔나',
  description:
    '매일 건너는 교량의 공개된 관리 이력과 오늘의 조건을 공공데이터에서 그대로 옮겨 보여줍니다.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={notoSansKR.className}>
      <body className="bg-background text-on-surface">
        {/* 폭은 globals.css 의 .app-shell 이 정한다. 기본 480px(MASTER.md §3),
            메인 대시보드만 넓어진다 — 어느 화면인지는 자식만 알기 때문에
            여기서 분기하지 않고 :has() 로 뒤집는다. */}
        <div className="app-shell mx-auto flex min-h-screen flex-col">
          {children}
          {/* PRD §7 표시규칙 2 · F-05 ④ — 모든 화면에 상시 노출 */}
          <Disclosure />
        </div>
      </body>
    </html>
  )
}
