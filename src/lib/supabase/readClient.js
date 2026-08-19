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

/**
 * 교량 뉴스 — 스케줄러가 채운 bridge_news 에서 최신순으로 읽는다.
 *
 * 조회에 실패하면 던지지 않고 빈 목록을 준다. 뉴스는 이 화면의 본체가 아니라
 * 곁가지이므로, 기사를 못 읽었다고 대시보드 전체가 오류 화면이 되면 안 된다.
 * 대신 available 로 '출처가 없어 비었는지 / 읽기에 실패했는지'를 구분해 준다.
 */
/* 화면은 6건만 쓰지만 넉넉히 읽는다 — 말머리 고정과 '같은 카테고리 3연속 방지'가
   고를 후보를 남겨 둬야 동작한다. */
export async function fetchBridgeNews(limit = 24) {
  const client = getReadClient()
  if (!client) return { items: [], available: false }

  const { data, error } = await client
    .from('bridge_news')
    // description 은 화면의 '요약' 두 줄에 쓴다 — 우리가 쓴 문장이 아니라 원문 발췌다.
    .select('id, title, url, publisher, description, published_at, source')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) return { items: [], available: false }
  return { items: data ?? [], available: true }
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

/**
 * 사이트맵에 넣을 교량 id 목록.
 *
 * 목록 화면과 달리 id 와 fetched_at 만 읽는다 — 사이트맵이 쓰는 건 주소와 최종
 * 수정 시각뿐이고, 나머지 컬럼과 이력까지 끌고 오면 빌드만 느려진다.
 *
 * limit 을 인자로 명시해 두는 이유 : PostgREST 는 프로젝트 설정의 max-rows 까지만
 * 돌려주고 조용히 잘라낸다. 상한을 코드에 적어 두면 나중에 교량이 늘어 사이트맵이
 * 잘렸을 때 어디를 봐야 하는지 알 수 있다. 사이트맵 하나의 규격 상한은 URL
 * 50,000 개이고 교량 1건이 3개(상세·이력·오늘)를 만들므로, 5,000 건까지는
 * 나눠 담을 필요가 없다.
 *
 * ⚠ sample- 로 시작하는 표본 교량은 제외한다 (supabase/seed/sample.sql).
 *   표본은 '한강대교 (표본)' 처럼 실제 교량명에 지어낸 점검 기록을 붙인 값이다.
 *   화면에서는 이름으로 표본임을 알 수 있지만, 검색엔진에 색인되면 그 문장만
 *   떨어져 나가 실제 점검 기록으로 읽힌다. 사이트맵은 '이 주소를 색인해 달라'는
 *   요청이므로, 표본을 넣는 것은 오정보를 유포하는 것이 된다.
 */
export async function fetchBridgeIdsForSitemap(limit = 5000) {
  const client = getReadClient()
  if (!client) return []

  const { data, error } = await client
    .from('bridges')
    .select('id, fetched_at')
    .not('id', 'like', 'sample-%')
    .order('id', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`bridges 조회 실패 (사이트맵): ${error.message}`)
  return data ?? []
}
