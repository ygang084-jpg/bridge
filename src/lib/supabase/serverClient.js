import { createClient } from '@supabase/supabase-js'
import { normalizeSupabaseUrl } from './normalizeUrl.js'

/**
 * 서버 전용 Supabase 클라이언트.
 * ---------------------------------------------------------------------------
 * 8단계 기술스택 문서가 정한 이 프로젝트의 첫 번째 제약 :
 *   키를 브라우저에 노출하지 않는다. 외부 호출과 쓰기는 서버 계층만 한다.
 *
 * Vite 는 `VITE_` 로 시작하는 환경변수를 번들에 그대로 박아 넣는다. 그래서
 * 서비스 롤 키가 `VITE_` 접두사로 들어와 있으면 아래에서 즉시 던진다 —
 * 조용히 동작하다 배포 번들에 키가 실려 나가는 쪽이 훨씬 위험하다.
 * ---------------------------------------------------------------------------
 */

const LEAKY_PREFIXES = ['VITE_', 'PUBLIC_', 'NEXT_PUBLIC_']

function readEnv(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function assertServiceKeyNotPublic(env = process.env) {
  const leaked = LEAKY_PREFIXES.map((p) => `${p}SUPABASE_SERVICE_ROLE_KEY`).filter(
    (name) => typeof env[name] === 'string' && env[name].trim(),
  )
  if (leaked.length > 0) {
    throw new Error(
      `서비스 롤 키가 브라우저에 노출되는 이름으로 설정되어 있습니다: ${leaked.join(', ')}. ` +
        'SUPABASE_SERVICE_ROLE_KEY 로 바꾸세요.',
    )
  }
}

/**
 * 캐시 갱신·요약 생성처럼 쓰기가 필요한 서버 작업용 클라이언트.
 * 브라우저 코드에서 절대 import 하지 않는다.
 */
export function createServerSupabaseClient() {
  assertServiceKeyNotPublic()

  const url = normalizeSupabaseUrl(readEnv('SUPABASE_URL'))
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceKey) {
    const missing = [!url && 'SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean)
      .join(', ')
    throw new Error(`환경변수가 없습니다: ${missing}`)
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** 환경변수가 갖춰져 있는지만 확인한다 (확인 스크립트에서 분기용). */
export function hasServerSupabaseEnv() {
  return Boolean(readEnv('SUPABASE_URL') && readEnv('SUPABASE_SERVICE_ROLE_KEY'))
}
