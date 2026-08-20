/**
 * Supabase 프로젝트 주소 정리.
 * ---------------------------------------------------------------------------
 * `supabase-js` 는 넘긴 주소 뒤에 `/rest/v1/...` 를 붙인다. 그래서 환경변수에
 * `https://<ref>.supabase.co/rest/v1/` 처럼 경로가 딸린 값이 들어오면 최종 주소가
 * `/rest/v1/rest/v1/bridges` 가 되고, 돌아오는 오류는 이것뿐이다 :
 *
 *   Invalid path specified in request URL
 *
 * 어느 값이 잘못됐는지 한 글자도 알려주지 않는다. 실제로 이 오류로 한참 헤맸다 —
 * 대시보드에서 복사하는 화면에 `Project URL` 과 REST 엔드포인트가 나란히 있어서
 * 흔히 하는 실수이고, Sensitive 로 저장하면 값을 다시 볼 수도 없다.
 *
 * 그래서 받아들이되 정리한다. 조용히 고치지는 않는다 — 무엇을 고쳤는지 로그에
 * 남겨야 설정을 실제로 바로잡을 수 있다.
 * ---------------------------------------------------------------------------
 */

/** 끝의 슬래시와 `/rest/v1` 꼬리를 떼어낸다. 못 읽는 값이면 그대로 돌려준다. */
export function normalizeSupabaseUrl(value, { warn = console.warn } = {}) {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (trimmed === '') return trimmed

  const cleaned = trimmed.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
  if (cleaned !== trimmed) {
    warn(
      `[supabase] SUPABASE_URL 에 경로가 붙어 있어 잘라냈습니다: "${trimmed}" → "${cleaned}". ` +
        '환경변수는 프로젝트 주소까지만 넣어 주세요 (https://<ref>.supabase.co).',
    )
  }
  return cleaned
}
