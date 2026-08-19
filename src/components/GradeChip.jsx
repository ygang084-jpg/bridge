/**
 * 안전등급 칩.
 *
 * Stitch 디자인은 A등급을 초록(secondary-container), B등급을 노랑
 * (tertiary-fixed)으로 칠하고 점멸하는 점을 붙였다. 셋 다 쓰지 않는다.
 *
 * 등급의 법정 정의 원문을 아직 확인하지 못했다 (PRD §13 Q4). 어느 등급이
 * 좋고 어느 등급이 나쁜지 우리가 말할 근거가 없는 상태에서 초록·노랑으로
 * 칠하면 색이 그 판정을 먼저 해버린다. 실제로 표본 데이터의 C등급이 초록으로
 * 나오는 것을 렌더링해 보고 확인했다.
 *
 * 점멸(animate-pulse)도 쓰지 않는다 — 경고 피로를 만들고, 등급은 지금
 * 실시간으로 변하는 값이 아니라 특정 시점 점검의 결과다.
 *
 * 그래서 칩의 자리·크기·모양은 디자인 그대로 두고, 색만 중립으로 두고
 * 문구는 등급 값만 적는다.
 */
export default function GradeChip({ grade, className = '' }) {
  if (!grade) {
    return (
      <span
        className={`shrink-0 rounded-full bg-unknown-bg px-3 py-1 text-label-md font-bold text-unknown-fg ${className}`}
      >
        등급 정보 없음
      </span>
    )
  }

  return (
    <span
      title="등급은 그 시점 점검의 판정 결과입니다. 교량의 항상적 속성도 아니고 통행 제한 여부와도 별개 정보입니다"
      className={`shrink-0 rounded-full bg-surface-variant px-3 py-1 text-label-md font-bold text-on-surface-variant ${className}`}
    >
      {grade}등급
    </span>
  )
}
