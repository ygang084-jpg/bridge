/**
 * F-05 정보 신뢰도 — 이력 공백을 '정식 상태'로 계산한다.
 * ---------------------------------------------------------------------------
 * PRD §9 '저장하지 않는 것' : 정보 상태는 저장하지 않고 조회 시 계산한다.
 * 지표 측정을 위해 view_logs 에만 기록한다.
 *
 * 이 파일에서 가장 중요한 것은 문구다. PRD F-05 ②③ :
 *   · '기록 없음'을 '관리하지 않음'으로 읽히게 쓰지 않는다
 *   · '기록 없음'을 '문제 없음'으로 읽히게도 쓰지 않는다
 * 두 오독을 동시에 막아야 하므로, 문구는 항상 '공개된 데이터에 없다'는
 * 사실만 말하고 그 이상도 그 이하도 말하지 않는다.
 * ---------------------------------------------------------------------------
 */

/** 준공은 이력 건수에서 제외한다 — 모든 교량이 갖는 값이라 밀도를 재는 데 쓸 수 없다. */
export const COMPLETION_EVENT = '준공'

export const INFO_STATE = Object.freeze({
  PRESENT: 'present', // 이력 있음
  PARTIAL: 'partial', // 이력 부분
  ABSENT: 'absent', // 이력 없음
})

/**
 * 이력 배열로 F-05의 3단계 상태를 계산한다.
 *
 * @param {Array<{event_type?: string}>} history bridge_history 행 배열
 * @returns {{ state: string, recordCount: number, label: string, tone: string }}
 */
export function resolveInfoState(history) {
  const records = Array.isArray(history) ? history : []
  const recordCount = records.filter((row) => row?.event_type !== COMPLETION_EVENT).length

  if (recordCount >= 2) {
    return {
      state: INFO_STATE.PRESENT,
      recordCount,
      label: '이력 있음',
      tone: 'safe',
    }
  }
  if (recordCount === 1) {
    return {
      state: INFO_STATE.PARTIAL,
      recordCount,
      label: '이력 부분',
      tone: 'caution',
    }
  }
  return {
    state: INFO_STATE.ABSENT,
    recordCount: 0,
    label: '이력 없음',
    tone: 'unknown',
  }
}

/**
 * 상태별 안내 문구. 화면에서 이 함수 밖의 문구를 쓰지 않는다 —
 * 문구가 여러 곳에 흩어지면 F-05 ②③ 규칙이 한 곳에서 무너진다.
 */
export function describeInfoState(state, recordCount = 0) {
  switch (state) {
    case INFO_STATE.PRESENT:
      return {
        headline: `공개된 관리 기록이 ${recordCount}건입니다.`,
        note: null,
      }
    case INFO_STATE.PARTIAL:
      return {
        headline: `공개된 관리 기록이 ${recordCount}건입니다.`,
        note: '기록이 적은 것은 점검을 적게 했다는 뜻이 아니라, 공개 데이터에 그만큼만 있다는 뜻입니다.',
      }
    case INFO_STATE.ABSENT:
    default:
      return {
        headline: '이 교량은 공개된 관리 기록이 없습니다.',
        note: '점검을 하지 않았다는 뜻이 아닙니다. 공개 데이터에 기록이 없다는 뜻입니다. 관리기관에 직접 확인하실 수 있습니다.',
      }
  }
}
