/**
 * 공공데이터 응답 점검 — PRD §13 Q2 에 답하기 위한 스크립트.
 * ---------------------------------------------------------------------------
 * PRD §9 가 요구한 것을 그대로 한다 — "각 데이터별로 실제 API 응답 샘플 1건을
 * 받아 이 표에 붙인다. 특히 이력 데이터는 '교량당 평균 몇 건이 있는지'를 함께
 * 확인한다. 건수가 적으면 F-03 이 성립하지 않으므로 제품 개념을 재검토해야 한다."
 *
 * 그래서 이 스크립트가 세는 것은 두 가지다 :
 *   ① 응답이 실제로 어떤 필드를 주는가 (우리 bridges 컬럼과 대조할 수 있게)
 *   ② 그중 이력으로 쓸 수 있는 값이 교량당 몇 건인가
 *
 * 실행 :  node scripts/check-public-data.mjs
 * 키    :  .env.local 의 DATA_GO_KR_KEY (일반 인증키 '디코딩' 값)
 *
 * 값을 지어내지 않는다. 못 받으면 못 받았다고 적고 끝낸다 — 이 스크립트의 결과가
 * 곧 '이 데이터로 F-03 이 되는가'의 판단 근거이므로, 낙관적으로 채우면 판단이
 * 오염된다.
 * ---------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs'

/** 교량 기본정보 + 최종 점검 + 보수보강내역. data.go.kr 이 직접 호스팅한다. */
const BRIDGE_LIST = 'https://apis.data.go.kr/1613000/btiData/getBrdgList'

/** 우리 bridges 테이블이 기대하는 값 → 응답에서 찾을 후보 필드. */
const BRIDGE_FIELDS = {
  name: ['facilName'],
  address: ['newJuso', 'juso'],
  lat: ['sLatitude'],
  lng: ['sLongitude'],
  completed_year: ['openYear'],
  length_m: ['length'],
  facility_type: ['superstNm'],
}

/** 이력으로 쓸 수 있는 값. 이 값이 있는 교량만 타임라인에 점이 하나 생긴다. */
const HISTORY_FIELDS = ['checkDate', 'grade', 'checkType', 'consRecord']

function readEnvLocal(name) {
  let text
  try {
    text = readFileSync('.env.local', 'utf8')
  } catch {
    return null
  }
  const line = text.split(/\r?\n/).find((row) => row.trim().startsWith(`${name}=`))
  return line ? line.slice(line.indexOf('=') + 1).trim() : null
}

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

async function main() {
  const key = readEnvLocal('DATA_GO_KR_KEY')
  if (!key) {
    console.log('DATA_GO_KR_KEY 가 .env.local 에 없습니다.')
    console.log('data.go.kr 마이페이지 > 인증키 의 일반 인증키(Decoding) 값을 넣어 주세요.')
    process.exit(1)
  }

  // 기준연도. 최근 것부터 내려가며 응답이 있는 해를 찾는다 — 어느 해가 채워져
  // 있는지는 문서에 없고, 빈 해를 보고 '데이터가 없다'고 판단하면 틀린다.
  const years = [2024, 2023, 2022, 2021, 2020]

  for (const hyear of years) {
    const url = new URL(BRIDGE_LIST)
    url.searchParams.set('serviceKey', key)
    url.searchParams.set('responseType', 'json')
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('pageNo', '1')
    url.searchParams.set('hyear', String(hyear))

    let response
    try {
      response = await fetch(url)
    } catch (error) {
      console.log(`기준연도 ${hyear} — 호출 실패: ${error.message}`)
      continue
    }

    const body = await response.text()
    if (!response.ok) {
      console.log(`기준연도 ${hyear} — HTTP ${response.status}`)
      console.log(body.slice(0, 400))
      continue
    }

    let payload
    try {
      payload = JSON.parse(body)
    } catch {
      // 인증 실패는 XML 로 온다. 그대로 보여준다.
      console.log(`기준연도 ${hyear} — JSON 이 아닙니다 (인증 오류일 수 있습니다)`)
      console.log(body.slice(0, 400))
      continue
    }

    const items = findItems(payload)
    console.log(`\n기준연도 ${hyear} — 응답 ${items.length}건`)
    if (items.length === 0) {
      console.log('  이 해에는 항목이 없습니다. 다음 해를 봅니다.')
      continue
    }

    report(items)
    return
  }

  console.log('\n어느 기준연도에서도 항목을 받지 못했습니다.')
}

/** 응답 구조가 문서와 다를 수 있으므로 배열을 찾아 들어간다. */
function findItems(payload) {
  const stack = [payload]
  while (stack.length > 0) {
    const node = stack.pop()
    if (Array.isArray(node)) return node
    if (node && typeof node === 'object') {
      if (Array.isArray(node.item)) return node.item
      for (const value of Object.values(node)) stack.push(value)
    }
  }
  return []
}

function report(items) {
  const first = items[0]

  console.log('\n── 응답 필드 (첫 항목) ──')
  for (const [field, value] of Object.entries(first)) {
    const shown = present(value) ? String(value).slice(0, 40) : '(빈 값)'
    console.log(`  ${field.padEnd(18)} ${shown}`)
  }

  console.log('\n── bridges 컬럼 채움률 ──')
  for (const [column, candidates] of Object.entries(BRIDGE_FIELDS)) {
    const found = candidates.find((name) => name in first)
    if (!found) {
      console.log(`  ${column.padEnd(16)} 대응 필드 없음 (${candidates.join(' / ')})`)
      continue
    }
    const filled = items.filter((item) => present(item[found])).length
    console.log(
      `  ${column.padEnd(16)} ${found} — ${filled}/${items.length}건 채워짐`,
    )
  }

  console.log('\n── §13 Q2 : 교량당 이력 건수 ──')
  let totalEvents = 0
  for (const field of HISTORY_FIELDS) {
    const filled = items.filter((item) => present(item[field])).length
    totalEvents += filled
    console.log(`  ${field.padEnd(14)} ${filled}/${items.length}건`)
  }
  const perBridge = (totalEvents / items.length).toFixed(2)
  console.log(`\n  교량당 이력으로 쓸 값 평균 ${perBridge}건`)
  console.log(
    '  이 API 는 최종 점검 1건만 주므로 값이 1~2건에 머물면 예상과 같다.',
  )
  console.log(
    '  F-03 타임라인은 점검 1회당 1행을 주는 별도 출처(건설CALS 점검진단이력)가 필요하다.',
  )

  console.log('\n── 시설물 관리번호 후보 ──')
  const idLike = Object.keys(first).filter((field) => /id$|no$|num|code|cd$/i.test(field))
  console.log(
    idLike.length > 0
      ? `  ${idLike.join(', ')}`
      : '  없음 — 우리 bridges.id(시설물 관리번호)로 쓸 값이 응답에 없다.',
  )
}

await main()
