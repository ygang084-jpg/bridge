/**
 * 네이버 뉴스 검색 API 클라이언트 — 서버 전용.
 * ---------------------------------------------------------------------------
 * PRD §11 보안 : 키를 브라우저에 노출하지 않는다. 이 파일은 스케줄러 라우트에서만
 * 부르고, 화면은 bridge_news 에 저장된 것만 읽는다. 'use client' 컴포넌트에서
 * import 하면 키가 번들에 실린다 — NEXT_PUBLIC_ 접두사를 쓰지 않는 이유다.
 *
 * 응답을 그대로 저장하지 않고 정규화한다 :
 *   · title·description 에 <b> 태그와 HTML 엔티티가 섞여 온다
 *   · pubDate 는 RFC 1123 문자열이다
 *   · 언론사명을 따로 주지 않아 링크 호스트명에서 뽑는다
 * ---------------------------------------------------------------------------
 */

const ENDPOINT = 'https://openapi.naver.com/v1/search/news.json'

/**
 * 기본 검색어.
 *
 * '다리'는 신체 부위와 겹쳐 관계없는 기사가 대량으로 섞이므로 쓰지 않는다.
 * '교량'이 가장 넓게 걸리고, 나머지 둘은 관리 이력과 직접 관련된 보도를 놓치지
 * 않으려고 함께 던진다.
 */
export const DEFAULT_QUERIES = ['교량', '교량 점검', '교량 보수']

export const NEWS_SOURCE_NAME = '네이버 뉴스 검색 API'

function readEnv(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** 키가 갖춰졌는지. 없으면 수집 라우트가 아무것도 하지 않고 그 사실을 알린다. */
export function hasNaverNewsEnv() {
  return Boolean(readEnv('NAVER_CLIENT_ID') && readEnv('NAVER_CLIENT_SECRET'))
}

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
}

/** <b> 강조 태그와 HTML 엔티티를 벗긴다. 태그가 남으면 화면에 그대로 보인다. */
export function stripHtml(value) {
  if (typeof value !== 'string') return null
  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, (match) => ENTITIES[match.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 0 ? text : null
}

/** 'Mon, 18 Aug 2026 10:00:00 +0900' → ISO 문자열. 못 읽으면 null. */
export function parsePubDate(value) {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

/** 링크의 호스트명에서 언론사 표기를 만든다. 'www.' 는 뗀다. */
export function publisherFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * 검색 결과 한 건을 저장 가능한 모양으로.
 * 제목이나 링크가 없으면 담지 않는다 — 빈 항목이 목록에 남으면 눌러도 아무 일이 없다.
 */
export function normalizeItem(raw, query) {
  const title = stripHtml(raw?.title)
  // 원문 링크를 우선한다. 네이버 중계 링크(link)는 기사가 내려가면 함께 사라진다.
  const url = typeof raw?.originallink === 'string' && raw.originallink.trim()
    ? raw.originallink.trim()
    : typeof raw?.link === 'string' && raw.link.trim()
      ? raw.link.trim()
      : null

  if (!title || !url) return null

  return {
    title,
    url,
    publisher: publisherFromUrl(url),
    description: stripHtml(raw?.description),
    published_at: parsePubDate(raw?.pubDate),
    query: query ?? null,
    source: NEWS_SOURCE_NAME,
  }
}

/**
 * 검색어 하나로 조회한다.
 *
 * @param {object} options
 * @param {string} options.query 검색어
 * @param {number} [options.display] 건수 (네이버 최대 100)
 * @param {string} [options.sort] 'date'(최신) | 'sim'(정확도)
 * @param {typeof fetch} [options.fetchImpl] 테스트에서 주입
 * @returns {Promise<Array<object>>} 정규화된 항목
 */
export async function searchNaverNews({ query, display = 20, sort = 'date', fetchImpl = fetch }) {
  const clientId = readEnv('NAVER_CLIENT_ID')
  const clientSecret = readEnv('NAVER_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았습니다.')
  }
  if (!query || !String(query).trim()) throw new Error('검색어가 비어 있습니다.')

  const url = new URL(ENDPOINT)
  url.searchParams.set('query', String(query).trim())
  url.searchParams.set('display', String(Math.min(Math.max(display, 1), 100)))
  url.searchParams.set('sort', sort)

  const response = await fetchImpl(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    // 캐시하지 않는다 — 저장은 DB 가 맡고, 여기서는 매번 최신을 받는다.
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`네이버 뉴스 검색 실패 (${response.status}) ${body.slice(0, 200)}`)
  }

  const payload = await response.json()
  const items = Array.isArray(payload?.items) ? payload.items : []
  return items.map((raw) => normalizeItem(raw, query)).filter(Boolean)
}

/** 여러 검색어의 결과를 합치고 링크 기준으로 중복을 제거한다. */
export function dedupeByUrl(items) {
  const seen = new Map()
  for (const item of items) {
    if (!seen.has(item.url)) seen.set(item.url, item)
  }
  return [...seen.values()]
}
