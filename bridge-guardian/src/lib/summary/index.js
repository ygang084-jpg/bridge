export {
  SAFETY_GRADES,
  SAFETY_GRADE_SOURCE,
  getSafetyGradeDefinition,
  isSafetyGradeDefinitionPublishable,
  normalizeSafetyGrade,
} from './safetyGrades.js'

export { FORBIDDEN_PATTERNS, findForbiddenPhrases } from './forbiddenPhrases.js'

export {
  MAX_SUMMARY_LENGTH,
  countCharacters,
  extractNumbers,
  validateSummary,
} from './validateSummary.js'

export {
  SUMMARY_QUALIFIER,
  TEMPLATE_VERSION,
  buildSummaryCandidate,
  generateSummary,
  toReferenceDate,
} from './buildSummary.js'

export {
  createInMemorySummariesRepo,
  fingerprintBasedOn,
  needsRegeneration,
  refreshSummaries,
} from './refreshSummaries.js'

export {
  HISTORY_COLUMNS,
  createSupabaseSummariesRepo,
  loadSummaryInputs,
} from './summariesRepo.js'

/**
 * 화면에 붙이는 배지 문구.
 * AI 생성이 아니므로 'AI 요약'이 아니다 — PRD §15.1 참고.
 */
export const SUMMARY_BADGE_LABEL = '자동 요약'

/**
 * 요약 아래에 붙이는 안내. 판정이 아니라 원문 옮김이라는 사실을 밝힌다.
 * PRD §7 표시규칙 3(원문 경로 제공)은 요약 카드의 '관리 이력 전체 보기' 링크가 맡는다.
 */
export const SUMMARY_DISCLOSURE =
  '공식 기록의 값을 정해진 문장 틀로 옮긴 것입니다. 아래 원문에서 값을 확인할 수 있습니다.'
