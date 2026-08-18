import { createClient } from '@supabase/supabase-js'
import { HISTORY_COLUMNS } from '@/lib/summary/summariesRepo'

/**
 * 읽기 전용 Supabase 클라이언트 — 서버 컴포넌트에서만 쓴다.
 * ---------------------------------------------------------------------------
 * PRD §11 보안 : 키를 브라우저에 노출하지 않는다.
 * anon 키는 원래 공개용이지만, 그렇다고 굳이 브라우저로 내보낼 이유도 없다.
 * 데이터 접근은 전부 서버 컴포넌트에서 하고, 브라우저에는 결과만 보낸다.
 *
 * ⚠ 이 파일을 'use client' 컴포넌트에서 import 하면 키가 번들에 실린다.
 *   NEXT_PUBLIC_ 접두사를 쓰지 않는 것이 그 실수를 빌드 단계에서 막아준다
 *   (접두사 없는 process.env 는 클라이언트 번들에서 undefined 가 된다).
 * ---------------------------------------------------------------------------
 */

let cached = null

function readEnv(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** 환경변수가 갖춰졌는지. 없으면 화면은 '정보 없음' 경로로 흐른다. */
export function hasReadEnv() {
  return Boolean(readEnv('SUPABASE_URL') && readEnv('SUPABASE_ANON_KEY'))
}

export function getReadClient() {
  if (cached) return cached
  const url = readEnv('SUPABASE_URL')
  const key = readEnv('SUPABASE_ANON_KEY')
  if (!url || !key) return null

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

const BRIDGE_COLUMNS =
  'id, name, address, lat, lng, completed_year, length_m, facility_type, facility_class, manager_org, manager_contact, source, fetched_at'

/**
 * 목록용 교량 전체.
 *
 * 좌표를 함께 내려보낸다 — 거리 계산을 브라우저에서 하기 때문이다 (PRD §15.7).
 * 사용자 좌표를 서버로 보내면 DB에 저장하지 않아도 접근 로그에 남는다.
 */
export async function fetchBridgesForList() {
  const client = getReadClient()
  if (!client) return { bridges: [], available: false, fetchedAt: null }

  const { data, error } = await client
    .from('bridges')
    .select(`${BRIDGE_COLUMNS}, bridge_history(occurred_on, event_type)`)
    .order('name', { ascending: true })

  if (error) throw new Error(`bridges 조회 실패: ${error.message}`)

  const bridges = (data ?? []).map((row) => ({
    ...row,
    history: row.bridge_history ?? [],
  }))

  return {
    bridges,
    available: true,
    fetchedAt: bridges.reduce(
      (latest, row) => (row.fetched_at && row.fetched_at > (latest ?? '') ? row.fetched_at : latest),
      null,
    ),
  }
}

/** 상세·타임라인용 교량 1건 + 이력 전체 + 저장된 요약. */
export async function fetchBridgeDetail(bridgeId) {
  const client = getReadClient()
  if (!client) return null

  const { data: bridge, error } = await client
    .from('bridges')
    .select(BRIDGE_COLUMNS)
    .eq('id', bridgeId)
    .maybeSingle()

  if (error) throw new Error(`bridges 조회 실패 (${bridgeId}): ${error.message}`)
  if (!bridge) return null

  const [{ data: history, error: historyError }, { data: summary, error: summaryError }] =
    await Promise.all([
      client
        .from('bridge_history')
        .select(HISTORY_COLUMNS)
        .eq('bridge_id', bridgeId)
        .order('occurred_on', { ascending: false }),
      client
        .from('bridge_summaries')
        .select('summary_text, based_on, generated_at')
        .eq('bridge_id', bridgeId)
        .maybeSingle(),
    ])

  if (historyError) throw new Error(`bridge_history 조회 실패 (${bridgeId}): ${historyError.message}`)
  if (summaryError)
    throw new Error(`bridge_summaries 조회 실패 (${bridgeId}): ${summaryError.message}`)

  return { bridge, history: history ?? [], summary: summary ?? null }
}
