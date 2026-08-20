/**
 * 교량 공개 데이터를 Supabase 에 넣는다.
 * ---------------------------------------------------------------------------
 * 왜 크론이 아니라 스크립트인가. 두 가지 이유다.
 *
 *   ① 이 데이터는 기준연도(hyear)별로 한 해치가 통째로 온다. 하루에 한 번
 *      부를 이유가 없고, 새 기준연도가 열릴 때 한 번 돌리면 된다.
 *   ② 2024년 기준 40,006건이다. 페이지 41개를 받아 upsert 하는 일은 서버리스
 *      함수의 60초 안에 끝나지 않는다.
 *
 * 실행 :
 *   node scripts/load-bridges.mjs --sido=서울특별시 --dry-run
 *   node scripts/load-bridges.mjs --sido=서울특별시
 *   node scripts/load-bridges.mjs --hyear=2024 --max-pages=5
 *
 * --sido 를 주면 그 시·도만 넣는다. API 에 지역 파라미터가 없어 받아 놓고
 * sidoNm 으로 고른다. 전국 4만 건을 한 번에 넣으면 지금 화면이 무너진다 —
 * fetchBridgesForList 가 교량 전체를 한 번에 읽기 때문이다. 규모를 감당하도록
 * 조회를 고치기 전에는 한 지역씩 넣어 확인한다.
 *
 * 키는 .env.local 에서 읽는다 :
 *   DATA_GO_KR_KEY                일반 인증키(Decoding)
 *   SUPABASE_URL                  실제 프로젝트 주소
 *   SUPABASE_SERVICE_ROLE_KEY     RLS 를 우회해 쓰기 위한 키
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import {
  fetchBridgePage,
  historyRowsFor,
  normalizeBridge,
} from '../src/lib/bridges/publicBridges.js'

const CHUNK = 500

function env(name) {
  let text
  try {
    text = readFileSync('.env.local', 'utf8')
  } catch {
    return null
  }
  const line = text.split(/\r?\n/).find((row) => row.trim().startsWith(`${name}=`))
  return line ? line.slice(line.indexOf('=') + 1).trim() : null
}

function arg(name, fallback = null) {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`))
  return found ? found.slice(name.length + 3) : fallback
}

const dryRun = process.argv.includes('--dry-run')
const hyear = arg('hyear', '2024')
const sido = arg('sido')
const maxPages = Number(arg('max-pages', '50'))

const serviceKey = env('DATA_GO_KR_KEY')
if (!serviceKey) {
  console.log('DATA_GO_KR_KEY 가 .env.local 에 없습니다.')
  process.exit(1)
}

let supabase = null
if (!dryRun) {
  const url = env('SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    console.log('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다.')
    process.exit(1)
  }
  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    console.log(`SUPABASE_URL 이 로컬 주소입니다 (${url}).`)
    console.log('실제 프로젝트 주소(https://<ref>.supabase.co)로 바꿔 주세요.')
    process.exit(1)
  }
  supabase = createClient(url, key, { auth: { persistSession: false } })
}

const fetchedAt = new Date().toISOString()
const bridges = new Map()
const history = []
let scanned = 0
let totalCount = null

for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
  const page = await fetchBridgePage({ serviceKey, hyear, pageNo })
  totalCount = page.totalCount ?? totalCount
  if (page.items.length === 0) break

  scanned += page.items.length
  for (const item of page.items) {
    if (sido && String(item?.sidoNm ?? '').trim() !== sido) continue
    const bridge = normalizeBridge(item, { fetchedAt })
    if (!bridge) continue
    // 같은 교량이 상·하행으로 두 줄 오는 경우가 있다. 이름·좌표가 다르면 별개
    // 시설물이므로 id 도 갈리고, 완전히 같으면 뒤엣것이 앞엣것을 덮는다.
    bridges.set(bridge.id, bridge)
    history.push(...historyRowsFor(item, bridge.id))
  }

  const done = scanned >= (totalCount ?? Infinity)
  process.stdout.write(
    `\r페이지 ${pageNo} — 훑은 ${scanned}${totalCount ? `/${totalCount}` : ''}건 · 담은 ${bridges.size}곳`,
  )
  if (done) break
}
process.stdout.write('\n')

const bridgeRows = [...bridges.values()]
// 같은 (교량, 날짜, 종류) 가 두 번 생기면 DB 의 unique 제약에 걸린다. 미리 지운다.
const historyRows = dedupe(history, (row) => `${row.bridge_id}|${row.occurred_on}|${row.event_type}`)

console.log(`\n담은 교량 ${bridgeRows.length}곳 · 이력 ${historyRows.length}건`)
if (bridgeRows.length > 0) {
  const withCoords = bridgeRows.filter((row) => row.lat !== null && row.lng !== null).length
  const withYear = bridgeRows.filter((row) => row.completed_year !== null).length
  const withOrg = bridgeRows.filter((row) => row.manager_org !== null).length
  console.log(`  좌표 ${withCoords}곳 · 준공년도 ${withYear}곳 · 관리기관 ${withOrg}곳`)
  console.log(`  교량당 이력 평균 ${(historyRows.length / bridgeRows.length).toFixed(2)}건`)
  console.log('\n첫 항목 :')
  console.log(bridgeRows[0])
  console.log(historyRows.filter((row) => row.bridge_id === bridgeRows[0].id))
}

if (dryRun) {
  console.log('\n--dry-run 이므로 저장하지 않았습니다.')
  process.exit(0)
}

if (bridgeRows.length === 0) {
  console.log('담을 것이 없어 저장하지 않았습니다.')
  process.exit(0)
}

for (const chunk of chunks(bridgeRows, CHUNK)) {
  const { error } = await supabase.from('bridges').upsert(chunk, { onConflict: 'id' })
  if (error) throw new Error(`bridges 저장 실패: ${error.message}`)
  process.stdout.write(`\rbridges 저장 ${chunk.length}건`)
}
process.stdout.write('\n')

for (const chunk of chunks(historyRows, CHUNK)) {
  const { error } = await supabase
    .from('bridge_history')
    .upsert(chunk, { onConflict: 'bridge_id,occurred_on,event_type' })
  if (error) throw new Error(`bridge_history 저장 실패: ${error.message}`)
  process.stdout.write(`\rbridge_history 저장 ${chunk.length}건`)
}
process.stdout.write('\n')

console.log(`\n완료 — 교량 ${bridgeRows.length}곳 · 이력 ${historyRows.length}건`)

function dedupe(rows, keyOf) {
  const seen = new Map()
  for (const row of rows) if (!seen.has(keyOf(row))) seen.set(keyOf(row), row)
  return [...seen.values()]
}

function* chunks(rows, size) {
  for (let index = 0; index < rows.length; index += size) {
    yield rows.slice(index, index + size)
  }
}
