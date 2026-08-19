/** @type {import('next').NextConfig} */
const nextConfig = {
  // 8단계 기술스택 문서의 지침 : App Router 한 방식만 쓰고 서버 컴포넌트를
  // 최소한으로 유지한다. 여러 방식을 섞으면 오류 원인을 찾기 어렵다.
  reactStrictMode: true,

  // 빌드 산출물에 소스 경로·원본 코드를 남기지 않는다.
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 이 서비스는 교량 안전 정보를 다룬다. 남의 페이지 안에 iframe 으로
          // 끼워 넣어 다른 기관의 발표처럼 보이게 만드는 것을 막는다.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },

          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // PRD §11 개인정보 — 위치는 우리 페이지에서만 쓰고, 카메라·마이크 등은
          // 아예 쓰지 않는다. 브라우저 수준에서 못박아 둔다.
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
      {
        // 스케줄러 라우트는 어떤 캐시에도 남지 않아야 한다.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ]
  },
}

export default nextConfig
