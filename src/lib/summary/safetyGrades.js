/**
 * 안전등급 코드 → 법정 정의 문구 매핑표
 * ---------------------------------------------------------------------------
 * 근거 법령 : 「시설물의 안전 및 유지관리에 관한 특별법 시행령」
 *             별표 8 「안전등급의 기준」
 * 출처 URL  : ''  ← 국가법령정보센터(law.go.kr) 원문 링크를 직접 확인한 뒤 채운다.
 * 대조 날짜 : null ← 아래 문구를 원문과 한 글자씩 대조한 날짜(YYYY-MM-DD).
 *
 * ⚠ 아래 legalDefinition 문구는 위 별표의 내용을 옮겨 적은 것이지만,
 *   조문 번호와 문구를 원문과 대조하지 못했다. 그래서 SAFETY_GRADE_SOURCE.url 과
 *   verifiedOn 을 비워 두었고, 화면은 그 둘이 비어 있으면 정의를 표시하지 않는다.
 *   (6단계 데이터설계에서 risk_thresholds 에 적용한 원칙과 같다 —
 *    "출처가 비면 화면에 표시하지 않는다". 출처 없는 법정 문구를 그대로 내보내는
 *    것은 이 서비스가 하지 않기로 한 '임의 판정'과 같아진다.)
 *
 * 이 매핑표는 교량 상세의 '안전등급 정의 툴팁'(4단계 워크시트 Should 항목)용이다.
 * 한 문장 요약에는 쓰지 않는다 — 등급 문구를 요약에 넣으면
 *   · '양호/우수/불량' 같은 판정 표현이 되고,
 *   · 등급을 모르는 사람에게 등급을 되풀이하는 것이 되어
 * 5단계 워크시트가 정한 요약의 목적(등급의 뜻을 일상어로 풀기)에 어긋난다.
 * ---------------------------------------------------------------------------
 */

/** 매핑표 전체의 출처. url·verifiedOn 이 비어 있으면 화면 노출 금지. */
export const SAFETY_GRADE_SOURCE = Object.freeze({
  name: '시설물의 안전 및 유지관리에 관한 특별법 시행령',
  article: '별표 8 (안전등급의 기준)',
  url: '',
  verifiedOn: null,
})

/**
 * 코드 → { label, legalDefinition }
 * label 은 법령이 등급에 붙인 이름이고, legalDefinition 은 상태 설명 문구다.
 */
export const SAFETY_GRADES = Object.freeze({
  A: Object.freeze({
    label: '우수',
    legalDefinition: '문제점이 없는 최상의 상태',
  }),
  B: Object.freeze({
    label: '양호',
    legalDefinition:
      '보조부재에 경미한 결함이 발생하였으나 기능 발휘에는 지장이 없으며 ' +
      '내구성 증진을 위하여 보수가 필요한 상태',
  }),
  C: Object.freeze({
    label: '보통',
    legalDefinition:
      '주요부재에 경미한 결함 또는 보조부재에 광범위한 결함이 발생하였으나 ' +
      '전체적인 시설물의 안전에는 지장이 없으며, 주요부재에 내구성·기능성 저하 ' +
      '방지를 위한 보수가 필요하거나 보조부재에 간단한 보강이 필요한 상태',
  }),
  D: Object.freeze({
    label: '미흡',
    legalDefinition:
      '주요부재에 결함이 발생하여 긴급한 보수·보강이 필요하며 ' +
      '사용제한 여부를 결정하여야 하는 상태',
  }),
  E: Object.freeze({
    label: '불량',
    legalDefinition:
      '주요부재에 발생한 심각한 결함으로 인하여 시설물의 안전에 위험이 있어 ' +
      '즉각 사용을 금지하고 보강 또는 개축을 하여야 하는 상태',
  }),
})

/** 매핑표의 출처가 확인되어 화면에 정의를 표시해도 되는 상태인지. */
export function isSafetyGradeDefinitionPublishable() {
  return Boolean(SAFETY_GRADE_SOURCE.url) && Boolean(SAFETY_GRADE_SOURCE.verifiedOn)
}

/**
 * 등급 코드를 정규화한다. 'B등급', ' b ', 'B' → 'B'. 그 밖에는 null.
 * 원본에 없는 등급을 추정해 채우지 않는다.
 */
export function normalizeSafetyGrade(raw) {
  if (typeof raw !== 'string') return null
  const matched = /^\s*([A-Ea-e])\s*(?:등급)?\s*$/.exec(raw)
  return matched ? matched[1].toUpperCase() : null
}

/**
 * 툴팁에 쓸 등급 정의를 돌려준다.
 * 출처가 확인되지 않았거나 모르는 코드면 null — 화면은 항목 자체를 감춘다.
 */
export function getSafetyGradeDefinition(raw) {
  const code = normalizeSafetyGrade(raw)
  if (!code) return null
  if (!isSafetyGradeDefinitionPublishable()) return null

  const grade = SAFETY_GRADES[code]
  return {
    code,
    label: grade.label,
    legalDefinition: grade.legalDefinition,
    source: SAFETY_GRADE_SOURCE,
  }
}
