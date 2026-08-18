import Icon from './Icon'

/**
 * 상시 고지 — PRD §7 표시규칙 2, F-05 ④.
 * 모든 화면 하단에 반복 노출한다 (layout.jsx 에서 한 번 렌더).
 *
 * 문구가 'AI 분석은 참고용이며…'가 아닌 이유는 PRD §15.1 에 있다.
 * 이 제품에는 AI가 없다. AI라고 적으면 사실과 다르고, §7이 막으려던
 * 오해(요약이 공식 판정으로 읽히는 것)를 오히려 키운다.
 */
export const DISCLOSURE_TEXT =
  '이 화면의 정보는 공공데이터를 옮긴 것이며, 공식 안전진단을 대체하지 않습니다.'

export default function Disclosure() {
  return (
    <footer className="app-disclosure border-t border-outline-variant px-4 py-5">
      <p className="flex items-start gap-1.5 text-[13px] leading-[18px] text-on-surface-variant">
        <Icon name="info" size={14} className="mt-0.5" />
        {DISCLOSURE_TEXT}
      </p>
    </footer>
  )
}
