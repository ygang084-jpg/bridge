import Icon from './Icon'
import { INFO_STATE } from '@/lib/infoState'

/**
 * F-05 정보 상태 배지 (이력 있음 / 이력 부분 / 이력 없음).
 *
 * PRD §11 접근성 : 상태를 색상만으로 전달하지 않는다.
 * 그래서 tint 배경 + 아이콘 + 텍스트를 항상 함께 낸다. 셋 중 하나라도
 * 빼면 요구가 무너지므로, 이 컴포넌트 밖에서 배지를 직접 만들지 않는다.
 */
const TONE = {
  [INFO_STATE.PRESENT]: {
    className: 'bg-safe-bg text-safe-fg',
    icon: 'check-circle',
  },
  [INFO_STATE.PARTIAL]: {
    className: 'bg-caution-bg text-caution-fg',
    icon: 'warning-circle',
  },
  [INFO_STATE.ABSENT]: {
    // '없음'에 위험색(danger)을 쓰지 않는다. 기록이 없는 것은 문제가 아니라
    // 우리가 모른다는 뜻이고, 붉은색은 그것을 문제로 읽히게 만든다 (F-05 ②).
    className: 'bg-unknown-bg text-unknown-fg',
    icon: 'minus-circle',
  },
}

export default function InfoStateBadge({ state, label, size = 'md' }) {
  const tone = TONE[state] ?? TONE[INFO_STATE.ABSENT]
  const scale =
    size === 'sm' ? 'text-[13px] px-2.5 py-1' : 'text-[14px] px-3 py-1.5'

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-medium ${tone.className} ${scale}`}
    >
      <Icon name={tone.icon} size={size === 'sm' ? 14 : 16} />
      {label}
    </span>
  )
}
