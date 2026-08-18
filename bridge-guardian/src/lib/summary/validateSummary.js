import { findForbiddenPhrases } from './forbiddenPhrases.js'

/** 5단계 워크시트가 정한 요약 최대 길이(글자). */
export const MAX_SUMMARY_LENGTH = 60

/** 글자 수를 센다. 한글은 코드포인트 1개이므로 Array.from 기준으로 센다. */
export function countCharacters(text) {
  return typeof text === 'string' ? Array.from(text).length : 0
}

/** 문장에 등장하는 숫자를 모두 뽑아 정수 배열로 돌려준다. */
export function extractNumbers(text) {
  if (typeof text !== 'string') return []
  const found = text.match(/\d+/g)
  return found ? found.map(Number) : []
}

/**
 * 생성된 문장을 저장 전에 검사한다.
 *
 * @param {string|null} text
 * @param {{ allowedNumbers?: number[] }} options
 *   allowedNumbers — 문장에 등장해도 되는 숫자.
 *   원본 값(준공연도·점검 연·월)과, 그 값에서 정해진 계산으로만 나온 값
 *   (경과 연수·경과 개월)만 들어간다. 생성기가 based_on 에 함께 기록하므로
 *   나중에 어떤 숫자가 어디서 나왔는지 되짚을 수 있다.
 *
 * @returns {{ ok: boolean, failures: Array<{check: string, detail: string}> }}
 */
export function validateSummary(text, { allowedNumbers = [] } = {}) {
  const failures = []

  if (typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, failures: [{ check: 'empty', detail: '문장이 비어 있음' }] }
  }

  // ① 금지 표현 — 판정·행동 지시·등급 반복·추정
  for (const hit of findForbiddenPhrases(text)) {
    failures.push({ check: 'forbidden', detail: `${hit.label} ("${hit.matched}")` })
  }

  // ② 길이
  const length = countCharacters(text)
  if (length > MAX_SUMMARY_LENGTH) {
    failures.push({ check: 'length', detail: `${length}자 (허용 ${MAX_SUMMARY_LENGTH}자)` })
  }

  // ③ 근거 없는 숫자
  const allowed = new Set(allowedNumbers.filter((n) => Number.isFinite(n)))
  const unbacked = [...new Set(extractNumbers(text))].filter((n) => !allowed.has(n))
  if (unbacked.length > 0) {
    failures.push({
      check: 'number',
      detail: `근거 없는 숫자 ${unbacked.join(', ')} (허용 ${[...allowed].join(', ') || '없음'})`,
    })
  }

  return { ok: failures.length === 0, failures }
}
