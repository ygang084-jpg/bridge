/**
 * 사이트의 절대 주소.
 * ---------------------------------------------------------------------------
 * sitemap.xml 과 robots.txt 는 규격상 절대 URL 을 요구한다 — 상대 경로를 쓰면
 * 서치어드바이저가 제출을 거부한다.
 *
 * VERCEL_PROJECT_PRODUCTION_URL 은 버셀이 자동으로 넣어 주는 값이고, Preview
 * 배포에서 빌드해도 항상 '프로덕션' 도메인을 가리킨다. VERCEL_URL 을 쓰면 안
 * 된다 — 그건 그 배포 고유의 주소이고, 버셀은 Preview 응답에 X-Robots-Tag:
 * noindex 를 붙인다. 프리뷰 주소가 사이트맵에 실리면 크롤러가 색인하지 못하는
 * URL 목록을 받아 가게 된다.
 *
 * 커스텀 도메인을 붙이면 SITE_URL 환경변수로 덮어쓴다 (프로토콜까지 포함해서).
 * ---------------------------------------------------------------------------
 */

function readEnv(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** 예: https://bridge-pi-sable.vercel.app — 뒤에 슬래시를 붙이지 않는다. */
export function getSiteUrl() {
  const explicit = readEnv('SITE_URL')
  if (explicit) return explicit.replace(/\/+$/, '')

  const production = readEnv('VERCEL_PROJECT_PRODUCTION_URL')
  if (production) return `https://${production}`

  return 'http://localhost:3000'
}
