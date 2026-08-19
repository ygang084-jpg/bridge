/**
 * 교량 뉴스 말머리·카테고리·지역 분류 — 규칙 기반.
 * ---------------------------------------------------------------------------
 * 왜 규칙인가
 *
 * 이 분류는 화면에 '[긴급]'이라고 붙는 일이다. 모델에게 판단을 맡기면 그
 * 판단이 왜 그렇게 나왔는지 설명할 수 없고, 붙는 순간 우리가 긴급하다고
 * 판정한 것이 된다. 이 서비스는 판정하지 않기로 했다 (PRD §2.2 · §7).
 *
 * 그래서 태그는 '제목·요약에 이 낱말이 있었다'는 사실만 근거로 붙인다.
 * 어떤 낱말이 맞았는지 matched 로 함께 돌려주므로, 화면에서도 근거를 밝힐 수
 * 있고 오분류를 보면 규칙을 고칠 수 있다.
 *
 * 요약문을 새로 쓰지 않는다. 기사 원문 발췌(네이버가 준 description)를 문장
 * 단위로 자르기만 한다 — 우리가 다시 쓰면 원문에 없는 뜻이 섞인다.
 * ---------------------------------------------------------------------------
 */

/** 말머리. 위에 있는 것이 먼저 적용된다. */
export const TAG_RULES = [
  {
    tag: '긴급',
    hint: '즉시 확인 필요',
    keywords: ['붕괴', '전면통제', '전면 통제', '통행 금지', '통행금지', '침하', '유실', '추락', '무너'],
  },
  {
    tag: '해외',
    hint: '국외 소식',
    keywords: ['미국', '중국', '일본', '대만', '인도', '베트남', '독일', '프랑스', '이탈리아', '영국', '브라질', '해외'],
  },
  {
    tag: '공지',
    hint: '이용자 영향',
    keywords: ['통제', '공사', '우회', '차로', '통행료', '제한', '폐쇄'],
  },
  {
    tag: '정책',
    hint: '법령·예산·기준',
    keywords: ['법', '시행령', '예산', '기준', '개정', '계획', '지침', '조례'],
  },
  {
    tag: '기술',
    hint: '공법·기술',
    keywords: ['공법', '신소재', '센서', '계측', '디지털트윈', '스마트', '드론', 'AI', '공학'],
  },
]

export const DEFAULT_TAG = { tag: '안내', hint: '일반 정보' }

/** 화면 상단에 고정하는 말머리. */
export const PINNED_TAGS = ['긴급', '공지']

/** 카테고리 9개. 위에서부터 먼저 맞는 것을 쓴다. */
export const CATEGORY_RULES = [
  { category: '사고·재난', keywords: ['붕괴', '침하', '유실', '충돌', '태풍', '지진', '손상', '파손', '추락', '피해'] },
  { category: '안전점검·진단', keywords: ['정밀안전진단', '안전진단', '안전점검', '점검', '안전등급', '결함', '시설물 지정', '균열'] },
  { category: '유지관리·통제', keywords: ['보수', '보강', '통제', '우회', '차로', '유지관리', '재포장', '폐쇄'] },
  { category: '신설·개통', keywords: ['개통', '착공', '준공', '신설', '가설', '명칭'] },
  { category: '기술·공법', keywords: ['공법', '신소재', '센서', '계측', '디지털트윈', '스마트', '드론', '실험'] },
  { category: '정책·예산', keywords: ['예산', '법', '시행령', '개정', '기준', '계획', '지침', '조례', '국고'] },
  { category: '발주·입찰', keywords: ['발주', '입찰', '낙찰', '공모', '설계용역', '수주', '사업 공고'] },
  { category: '통행·요금', keywords: ['통행료', '하이패스', '요금', '중량', '높이 제한', '축하중'] },
  { category: '경관·문화', keywords: ['경관', '야간', '랜드마크', '관광', '보행교', '축제'] },
]

export const DEFAULT_CATEGORY = '기타'

/** 지역. 광역시·도를 먼저 보고, 없으면 '○○시/군/구' 패턴을 찾는다. */
const WIDE_REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '강원도', '경기도',
]

function firstMatch(text, keywords) {
  for (const keyword of keywords) {
    if (text.includes(keyword)) return keyword
  }
  return null
}

/**
 * 지역 추출. 못 찾으면 null — 추측해서 넣지 않는다.
 * @returns {string|null}
 */
export function extractRegion(text) {
  if (typeof text !== 'string') return null
  const wide = firstMatch(text, WIDE_REGIONS)
  if (wide) return wide

  const local = /([가-힣]{2,5}(?:시|군|구))(?![가-힣])/.exec(text)
  return local ? local[1] : null
}

/**
 * 기사 원문 발췌를 최대 2문장으로 자른다.
 *
 * 문장을 다시 쓰지 않는다. 자를 지점을 찾지 못하면 원문을 그대로 둔다 —
 * 네이버 description 은 이미 짧고 끝이 '...'로 잘려 오는 경우가 많다.
 */
export function excerptSentences(value, maxSentences = 2) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  // 마침표 뒤 공백, 또는 개조식 종결('~함.' '~예정.' '~다.') 뒤에서 끊는다.
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (parts.length <= 1) return text
  return parts.slice(0, maxSentences).join(' ')
}

/**
 * 기사 한 건을 분류한다.
 *
 * @param {{title?: string, description?: string}} item
 * @returns {{tag: string, tagHint: string, category: string, region: string|null, matched: string[]}}
 */
export function classifyNews(item) {
  const haystack = `${item?.title ?? ''} ${item?.description ?? ''}`
  const matched = []

  let tagRule = null
  for (const rule of TAG_RULES) {
    const hit = firstMatch(haystack, rule.keywords)
    if (hit) {
      tagRule = rule
      matched.push(hit)
      break
    }
  }

  let category = DEFAULT_CATEGORY
  for (const rule of CATEGORY_RULES) {
    const hit = firstMatch(haystack, rule.keywords)
    if (hit) {
      category = rule.category
      if (!matched.includes(hit)) matched.push(hit)
      break
    }
  }

  return {
    tag: tagRule?.tag ?? DEFAULT_TAG.tag,
    tagHint: tagRule?.hint ?? DEFAULT_TAG.hint,
    category,
    region: extractRegion(haystack),
    matched,
  }
}

/**
 * 게시판 정렬 — 말머리 고정 + 최신순 + 같은 카테고리 3연속 방지.
 *
 * 3연속 방지는 순서를 바꾸는 일이므로 '최신순'을 어긴다. 그래서 바로 다음
 * 후보 하나만 앞으로 당기고, 당길 것이 없으면 그대로 둔다 — 목록 전체를
 * 재배치해 시간 순서를 흐트러뜨리지 않는다.
 */
export function arrangeNews(items, limit = 6) {
  const withTime = (item) => (item.published_at ? Date.parse(item.published_at) : 0)

  const pinned = items
    .filter((item) => PINNED_TAGS.includes(item.tag))
    .sort((a, b) => withTime(b) - withTime(a))
  const rest = items
    .filter((item) => !PINNED_TAGS.includes(item.tag))
    .sort((a, b) => withTime(b) - withTime(a))

  const ordered = [...pinned, ...rest]
  const result = []

  while (ordered.length > 0 && result.length < limit) {
    let pick = 0
    const last = result.length - 1
    const isThirdInRow =
      result.length >= 2 &&
      result[last].category === result[last - 1].category &&
      result[last].category === ordered[0].category

    if (isThirdInRow) {
      const alternative = ordered.findIndex((item) => item.category !== ordered[0].category)
      if (alternative > 0) pick = alternative
    }

    result.push(ordered[pick])
    ordered.splice(pick, 1)
  }

  return result
}
