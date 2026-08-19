/**
 * 크론 표현식을 화면에 적을 문장으로 바꾼다.
 * ---------------------------------------------------------------------------
 * 앱안내 화면이 '갱신 주기'를 적어야 하는데, 그 값을 화면에 손으로 쓰면
 * `vercel.json` 의 스케줄을 바꿀 때 조용히 어긋난다. 갱신 주기를 잘못 적는 것은
 * 이 제품에서 가벼운 실수가 아니다 — 언제 갱신되는지가 곧 데이터를 얼마나
 * 믿어도 되는지이기 때문이다. 그래서 유일한 출처(`vercel.json`)에서 파생시킨다.
 *
 * 버셀 크론은 UTC 로 해석된다. 화면은 한국 사용자를 향하므로 KST(UTC+9)로 옮겨
 * 적고, 어느 시간대인지 문장에 남긴다.
 *
 * 하루 한 번짜리(`분 시 * * *`)만 문장으로 바꾼다. 그 밖의 형태는 표현식을 그대로
 * 보여준다 — 아는 척 풀어쓰다 틀리는 것보다 낫다. Hobby 플랜은 하루 1회를 넘는
 * 크론을 거부하므로 실제로는 이 형태만 쓰인다.
 * ---------------------------------------------------------------------------
 */

const DAILY = /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/

/** '0 20 * * *' → '매일 05:00 (KST)'. 못 읽으면 표현식 + UTC 표기. */
export function formatCronKst(schedule) {
  if (typeof schedule !== 'string') return null

  const matched = DAILY.exec(schedule.trim())
  if (!matched) return `${schedule} (UTC)`

  const minute = Number(matched[1])
  const utcHour = Number(matched[2])
  if (minute > 59 || utcHour > 23) return `${schedule} (UTC)`

  const kstHour = (utcHour + 9) % 24
  return `매일 ${pad(kstHour)}:${pad(minute)} (KST)`
}

/** crons 배열에서 path 가 같은 항목의 스케줄 문장을 찾는다. 없으면 null. */
export function cronTextFor(crons, path) {
  if (!Array.isArray(crons)) return null
  const found = crons.find((entry) => entry?.path === path)
  return found ? formatCronKst(found.schedule) : null
}

function pad(value) {
  return String(value).padStart(2, '0')
}
