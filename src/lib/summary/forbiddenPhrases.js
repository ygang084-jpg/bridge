/**
 * 요약 문장에 들어가면 안 되는 표현 목록.
 * ---------------------------------------------------------------------------
 * 지금 문장은 규칙 기반 템플릿이라 이 목록에 걸릴 일이 거의 없다.
 * 그래도 검사를 두는 이유는, 나중에 템플릿을 손볼 때 판정 표현이 슬며시
 * 들어오는 것을 사람 눈이 아니라 코드가 막게 하려는 것이다.
 * 애매하면 통과시키지 않는 쪽(fail closed)으로 정했다.
 * ---------------------------------------------------------------------------
 */

/** 등급 이름(우수·양호·보통·미흡·불량)이 낱말로 등장하는지 검사하는 패턴. */
const GRADE_LABEL = /(?:^|[^가-힣])(우수|양호|보통|미흡|불량)(?:[^가-힣]|$)/

export const FORBIDDEN_PATTERNS = Object.freeze([
  // ── ① 판정 표현 ─────────────────────────────────────────────
  { id: 'verdict/safe', label: '안전하다는 판정', pattern: /안전(?:하다|합니다|한|해|하고|하니|하며|함)/ },
  { id: 'verdict/danger', label: '위험하다는 판정', pattern: /위험(?:하다|합니다|한|해|하고|하니|하며|함|성)/ },
  { id: 'verdict/fine', label: '괜찮다는 판정', pattern: /괜찮/ },
  { id: 'verdict/no-problem', label: '문제·이상 없다는 판정', pattern: /(?:문제|이상|하자)\s*(?:가|는)?\s*없/ },
  { id: 'verdict/caution', label: '주의가 필요하다는 판정', pattern: /주의(?:가|를)?\s*(?:필요|요구|당부)|주의하/ },
  { id: 'verdict/worry', label: '우려·불안 표현', pattern: /우려|불안|심각|노후화?되었|낡았/ },
  { id: 'verdict/grade-label', label: '등급 이름(판정어) 사용', pattern: GRADE_LABEL },

  // ── ② 행동 지시 ─────────────────────────────────────────────
  { id: 'action/cross-ok', label: '건너도 된다는 지시', pattern: /건너(?:도|셔도|어도)\s*(?:된|됩|괜)/ },
  { id: 'action/cross-no', label: '건너지 말라는 지시', pattern: /건너지\s*(?:마|말)/ },
  { id: 'action/detour', label: '우회 지시', pattern: /우회/ },
  { id: 'action/avoid', label: '피하라는 지시', pattern: /피하(?:세요|시|자|는\s*것이)/ },
  { id: 'action/dont-use', label: '이용하지 말라는 지시', pattern: /이용(?:하지|을)\s*(?:마|말|삼)/ },
  { id: 'action/restrict', label: '통행 금지·자제 지시', pattern: /통행(?:을|이)?\s*(?:금지|자제|제한하)/ },
  { id: 'action/advise', label: '권장·추천 표현', pattern: /권장|권고|추천|바랍니다|하시기\s*바/ },

  // ── ③ 등급을 그대로 되풀이하기 ───────────────────────────────
  { id: 'grade/echo', label: '안전등급을 그대로 반복', pattern: /안전\s*등급|등급\s*[A-Ea-e]|[A-Ea-e]\s*등급|등급입니다/ },

  // ── ④ 주어진 값을 넘어선 추정 ────────────────────────────────
  { id: 'guess/likely', label: '추정·전망 표현', pattern: /것으로\s*(?:보|예상|판단|추정)|가능성|듯하|일\s*수\s*있|예상됩/ },
  { id: 'guess/compare', label: '다른 교량과의 비교', pattern: /다른\s*(?:교량|다리)|평균(?:보다|적)|비교(?:하면|해)/ },
])

/**
 * 문장에서 걸린 금지 표현을 모두 찾아 돌려준다. 없으면 빈 배열.
 */
export function findForbiddenPhrases(text) {
  if (typeof text !== 'string' || text.length === 0) return []

  const hits = []
  for (const rule of FORBIDDEN_PATTERNS) {
    const matched = rule.pattern.exec(text)
    if (matched) {
      hits.push({ id: rule.id, label: rule.label, matched: matched[0].trim() })
    }
  }
  return hits
}
