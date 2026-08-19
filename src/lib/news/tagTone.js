/**
 * 말머리 색.
 *
 * 태그마다 다르지만 색만으로 뜻을 전하지 않는다 — 글자가 곧 태그 이름이다
 * (design-system 의 '색상 단독 사용 금지'). 대시보드 발췌와 교량뉴스 화면이
 * 같은 색을 써야 해서 컴포넌트 밖으로 뺐다. 상수를 컴포넌트 모듈에서 함께
 * export 하면 fast refresh 가 깨진다.
 */
export const TAG_TONE = {
  긴급: 'bg-danger-bg text-danger-fg',
  공지: 'bg-caution-bg text-caution-fg',
  정책: 'bg-summary-bg text-summary-fg',
  기술: 'bg-summary-bg text-summary-fg',
  해외: 'bg-surface-variant text-on-surface-variant',
  안내: 'bg-surface-variant text-on-surface-variant',
}

/** 모르는 태그는 중립 색으로 떨어뜨린다. */
export function toneFor(tag) {
  return TAG_TONE[tag] ?? TAG_TONE.안내
}

/** 'YYYY-MM-DD…' → '2026.08.20'. 형식을 못 읽으면 원문 그대로 둔다. */
export function formatDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : String(value)
}
