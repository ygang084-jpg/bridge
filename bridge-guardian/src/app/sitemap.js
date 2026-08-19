import { fetchBridgeIdsForSitemap } from '@/lib/supabase/readClient'
import { getSiteUrl } from '@/lib/siteUrl'

/**
 * /sitemap.xml — 네이버 서치어드바이저·구글 서치콘솔에 제출하는 주소 목록.
 * ---------------------------------------------------------------------------
 * 빌드 시점에 Supabase 를 한 번 읽어 교량 상세 주소까지 채운다. 그래서 빌드
 * 환경에도 SUPABASE_URL / SUPABASE_ANON_KEY 가 있어야 한다.
 *
 * 읽기가 실패해도 던지지 않는다 — 사이트맵 하나 때문에 배포가 막히는 것보다
 * 정적 화면만 담긴 사이트맵이 나가는 편이 낫다. 대신 빌드 로그에 남긴다.
 * 조용히 빈 사이트맵을 내보내면 '왜 색인이 안 되는지' 를 2주 뒤에 알게 된다.
 *
 * /my-bridges 는 넣지 않는다. 사용자가 자기 브라우저에 저장한 목록을 보여주는
 * 화면이라 크롤러가 열면 빈 화면이고, 색인해도 검색 결과에 쓸 내용이 없다.
 * ---------------------------------------------------------------------------
 */

// 하루 한 번 다시 만든다. 교량 이력은 스케줄러(19:10 KST)가 채우므로 재배포를
// 기다릴 이유가 없고, 그렇다고 요청마다 Supabase 를 읽을 이유도 없다.
export const revalidate = 86400

const STATIC_PATHS = ['/', '/dashboard', '/map', '/bridges']

export default async function sitemap() {
  const base = getSiteUrl()

  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }))

  let bridges = []
  try {
    bridges = await fetchBridgeIdsForSitemap()
  } catch (error) {
    console.warn(`[sitemap] 교량 목록을 읽지 못해 정적 화면만 넣습니다: ${error.message}`)
  }

  // 교량 1건이 세 화면을 만든다 (F-01 상세 · 이력 타임라인 · 오늘의 조건).
  // '오늘' 화면만 daily 로 둔다 — 나머지는 이력이 갱신될 때만 바뀐다.
  const bridgeEntries = bridges.flatMap(({ id, fetched_at }) => {
    const lastModified = fetched_at ? new Date(fetched_at) : undefined
    return [
      { url: `${base}/bridges/${id}`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
      {
        url: `${base}/bridges/${id}/history`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.5,
      },
      { url: `${base}/bridges/${id}/today`, lastModified, changeFrequency: 'daily', priority: 0.5 },
    ]
  })

  return [...staticEntries, ...bridgeEntries]
}
