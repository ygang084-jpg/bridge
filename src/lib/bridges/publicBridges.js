import { createHash } from 'node:crypto'

/**
 * 국토교통부_전국 교량 및 터널 현황정보 → 우리 테이블 모양으로.
 * ---------------------------------------------------------------------------
 * 출처 : data.go.kr 15092289 · https://apis.data.go.kr/1613000/btiData/getBrdgList
 * 기준연도(`hyear`)별로 한 해치가 통째로 온다. 2024년 기준 40,006건.
 *
 * 실제 응답으로 확인한 것 (scripts/check-public-data.mjs) :
 *   · facilName·juso·좌표·length·openYear·orgmNm·orgmTel 은 거의 100% 채워진다
 *   · newJuso(도로명 주소)는 비어 있다 → 주소는 juso(지번)를 쓴다
 *   · 점검은 **최종 1건만** 온다 (checkDate·grade·checkType)
 *   · consRecord(보수보강내역)는 100건 중 2건에서만 채워진다
 *   · checkType 실제 값은 '정기점검'·'정밀점검' 둘뿐이었다
 *
 * 그래서 이 출처만으로 만들 수 있는 타임라인은 교량당 점 두 개(준공 + 최종 점검)다.
 * F-03 이 요구하는 '얼마나 자주 관리되었는가'는 점검 1회당 1행을 주는 다른 출처가
 * 있어야 한다 (건설CALS 점검진단이력). 그 사실을 지우지 않기 위해, 여기서 없는
 * 사건을 만들어 넣지 않는다.
 *
 * 옮기지 않는 값과 이유 :
 *   · superstNm('PSCI거더교') → 상부구조다. 우리 facility_type(시설물 종류)와
 *     다른 값이라 그 자리에 넣지 않는다. 담을 컬럼이 아직 없다.
 *   · special('01'·'02'·'03'·'99') → 시설물 종별로 보이지만 코드집을 확인하지
 *     못했다. '02'를 '2종'으로 적는 것은 추측이고, 종별은 법정 점검 대상을
 *     가르는 값이라 틀리면 곧 오정보다. facility_class 는 비워 둔다.
 * ---------------------------------------------------------------------------
 */

export const PUBLIC_BRIDGE_ENDPOINT = 'https://apis.data.go.kr/1613000/btiData/getBrdgList'

export const PUBLIC_BRIDGE_SOURCE = '국토교통부 전국 교량 및 터널 현황정보'

/** bridge_history.event_type 이 허용하는 값만 남긴다. 모르는 종류는 '기타'로. */
const EVENT_TYPES = new Set([
  '준공',
  '정기점검',
  '정밀점검',
  '정밀안전진단',
  '보수',
  '보강',
  '기타',
])

const GRADES = new Set(['A', 'B', 'C', 'D', 'E'])

function text(value) {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

function number(value) {
  const raw = text(value)
  if (raw === null) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 시설물 관리번호가 응답에 없어서 우리가 만든다.
 *
 * 관리번호를 그대로 쓰는 것이 원래 설계였는데(URL 이 안정적이고 대조가 쉽다),
 * 이 API 는 주지 않는다. 그래서 바뀌지 않을 값들로 짧은 해시를 만든다 —
 * 행정구역코드 · 시설물명 · 좌표.
 *
 * 좌표는 소수점 4자리(약 11m)로 줄여서 넣는다. 상류에서 좌표가 미세하게
 * 보정되면 id 가 바뀌어 같은 교량이 두 줄로 남기 때문이다. 4자리면 보정은
 * 흡수하고 이웃 교량과는 갈린다.
 */
export function bridgeIdFrom(item) {
  const parts = [
    text(item?.sggCd) ?? '',
    text(item?.facilName) ?? '',
    round4(item?.sLatitude),
    round4(item?.sLongitude),
  ]
  if (!parts[1]) return null
  return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12)
}

function round4(value) {
  const parsed = number(value)
  return parsed === null ? '' : parsed.toFixed(4)
}

/** 응답 한 건 → bridges 행. 이름이 없으면 담지 않는다. */
export function normalizeBridge(item, { fetchedAt = new Date().toISOString() } = {}) {
  const id = bridgeIdFrom(item)
  const name = text(item?.facilName)
  if (!id || !name) return null

  const lat = number(item?.sLatitude)
  const lng = number(item?.sLongitude)

  return {
    id,
    // 상류에 관리번호가 없으므로 external_id 도 비워 둔다. 나중에 관리번호를
    // 주는 출처와 대조할 때 이 칸을 쓴다.
    external_id: null,
    name,
    // 도로명 주소(newJuso)는 응답에서 비어 있었다. 지번 주소를 쓴다.
    address: text(item?.juso) ?? text(item?.newJuso),
    lat: lat !== null && lat >= -90 && lat <= 90 ? lat : null,
    lng: lng !== null && lng >= -180 && lng <= 180 ? lng : null,
    completed_year: validYear(item?.openYear),
    length_m: number(item?.length),
    facility_type: null,
    facility_class: null,
    manager_org: text(item?.orgmNm),
    manager_contact: text(item?.orgmTel),
    source: PUBLIC_BRIDGE_SOURCE,
    fetched_at: fetchedAt,
  }
}

function validYear(value) {
  const parsed = number(value)
  if (parsed === null) return null
  return parsed >= 1000 && parsed <= 9999 ? Math.trunc(parsed) : null
}

/**
 * 응답 한 건 → bridge_history 행들.
 *
 * 만들 수 있는 것은 둘뿐이다 :
 *   · 준공 — openYear 만 있어 월·일을 모른다. 1월 1일로 적고 설명에 그 사실을 쓴다.
 *     날짜를 아는 척하면 타임라인의 간격이 실제보다 정확해 보인다.
 *   · 최종 점검 — checkDate·checkType·grade 한 건.
 *
 * consRecord(보수보강내역)는 날짜가 없는 자유 텍스트다. 사건 일자를 지어낼 수
 * 없으므로 별도 행으로 만들지 않고, 최종 점검 행의 설명에 붙인다.
 */
export function historyRowsFor(item, bridgeId) {
  const rows = []
  const asOf = text(item?.wrtDt)
  const source = PUBLIC_BRIDGE_SOURCE

  const year = validYear(item?.openYear)
  if (year !== null) {
    rows.push({
      bridge_id: bridgeId,
      occurred_on: `${year}-01-01`,
      event_type: '준공',
      description: `준공 ${year}년. 공개 데이터가 연도까지만 주어 월·일은 알 수 없습니다.`,
      safety_grade: null,
      source,
      data_as_of: asOf,
    })
  }

  const checkDate = isoDate(item?.checkDate)
  if (checkDate) {
    const rawType = text(item?.checkType)
    const eventType = rawType && EVENT_TYPES.has(rawType) ? rawType : '기타'
    const grade = text(item?.grade)?.toUpperCase() ?? null
    const repair = text(item?.consRecord)

    const notes = []
    if (rawType && eventType === '기타') notes.push(`공개 데이터의 점검 종류: ${rawType}`)
    if (repair) notes.push(`보수·보강 내역: ${repair}`)
    notes.push('공개 데이터에 기록된 가장 최근 점검입니다. 이전 점검 기록은 이 출처에 없습니다.')

    rows.push({
      bridge_id: bridgeId,
      occurred_on: checkDate,
      event_type: eventType,
      description: notes.join(' '),
      safety_grade: grade && GRADES.has(grade) ? grade : null,
      source,
      data_as_of: asOf,
    })
  }

  return rows
}

/** 'YYYY-MM-DD' 만 받는다. 형식이 다르면 날짜를 만들지 않는다. */
function isoDate(value) {
  const raw = text(value)
  if (!raw) return null
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : null
}

/** 응답에서 항목 배열을 찾는다. 문서와 구조가 달라도 견디게 둔다. */
export function itemsFrom(payload) {
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

/** 한 페이지 조회. serviceKey 는 호출하는 쪽이 넘긴다 (서버에서만 읽는다). */
export async function fetchBridgePage({
  serviceKey,
  hyear,
  pageNo = 1,
  numOfRows = 1000,
  fetchImpl = fetch,
}) {
  const url = new URL(PUBLIC_BRIDGE_ENDPOINT)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('responseType', 'json')
  url.searchParams.set('numOfRows', String(numOfRows))
  url.searchParams.set('pageNo', String(pageNo))
  url.searchParams.set('hyear', String(hyear))

  const response = await fetchImpl(url, { cache: 'no-store' })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`교량 현황정보 조회 실패 (${response.status}) ${body.slice(0, 200)}`)
  }

  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    // 인증 실패는 XML 로 온다. 원문을 그대로 올려 원인을 감추지 않는다.
    throw new Error(`교량 현황정보 응답이 JSON 이 아닙니다: ${body.slice(0, 200)}`)
  }

  const totalCount = Number(payload?.response?.body?.totalCount)
  return {
    items: itemsFrom(payload),
    totalCount: Number.isFinite(totalCount) ? totalCount : null,
  }
}
