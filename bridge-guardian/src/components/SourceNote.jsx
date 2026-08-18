/**
 * 출처 기관명 + 데이터 기준일 — PRD F-02 ④, F-03 ③, F-05 ④.
 *
 * 값이 있는데 출처가 없으면 '출처 미표기'라고 적는다. 조용히 비워 두면
 * 출처가 있는 항목과 구별되지 않고, 그러면 출처 표기 규칙이 무의미해진다.
 */
export default function SourceNote({ source, asOf, align = 'right', className = '' }) {
  const parts = []
  if (source) parts.push(source)
  if (asOf) parts.push(`${formatAsOf(asOf)} 기준`)

  const text = parts.length > 0 ? parts.join(' · ') : '출처 미표기'
  const alignment = align === 'right' ? 'text-right' : 'text-left'

  return (
    <p className={`mt-1 text-[13px] leading-[18px] text-on-surface-variant ${alignment} ${className}`}>
      {text}
    </p>
  )
}

/** '2025-11-30' → '2025.11.30'. 형식을 못 읽으면 원문 그대로 둔다. */
function formatAsOf(value) {
  if (typeof value !== 'string') return String(value)
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : value
}
