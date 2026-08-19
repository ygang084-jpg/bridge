import { getSiteUrl } from '@/lib/siteUrl'

/**
 * /robots.txt
 * ---------------------------------------------------------------------------
 * 파일이 아예 없으면(404) 크롤러는 '전체 허용'으로 해석하지만, 네이버
 * 서치어드바이저 진단은 이를 경고로 잡는다. 그리고 실제로 막아야 할 곳이 있다.
 *
 *   /api/         스케줄러 라우트. 색인할 내용이 없고, 크롤러가 부르면
 *                 CRON_SECRET 검사에 걸려 401 만 쌓인다.
 *   /my-bridges   사용자가 브라우저에 저장한 목록 화면. 남이 열면 빈 화면이다.
 *
 * 네이버 크롤러(Yeti)도 표준 robots.txt 를 따르므로 userAgent 를 따로 나누지
 * 않는다. 봇마다 규칙을 쪼개면 한쪽만 고치고 잊는 일이 생긴다.
 * ---------------------------------------------------------------------------
 */

export default function robots() {
  const base = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/my-bridges'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
