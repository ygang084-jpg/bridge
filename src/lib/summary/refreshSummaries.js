import { generateSummary } from './buildSummary.js'

/**
 * bridge_summaries 갱신 파이프라인.
 * ---------------------------------------------------------------------------
 * 사용자 요청 시점에 부르지 않는다. 캐시 갱신 스케줄러(Vercel Cron)가 원본
 * 테이블(bridges / bridge_inspections)을 갱신한 직후에 한 번 부른다.
 *
 * 순차 처리한다. 규칙 기반 생성이라 외부 API 한도 걱정은 없지만,
 * 한 교량이 실패했을 때 어디서 멈췄는지 보고서로 남기려면 순서가 있는 편이 낫다.
 * 요청 사이 대기도 두지 않는다 — 기다릴 상대가 없다.
 * ---------------------------------------------------------------------------
 */

/** 키 순서에 흔들리지 않는 JSON 직렬화. 재생성 판단 비교에만 쓴다. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

/**
 * 재생성 판단에 쓰는 지문. based_on 에서 아래만 뽑는다.
 *
 *  · template_version — 문장 틀이 바뀌면 다시 만들어야 한다
 *  · source           — 원본 값. 이것이 그대로면 원본이 안 바뀐 것이다
 *  · derived          — 원본에서 계산한 값(경과 연수·경과 개월)
 *  · omitted          — 어떤 항목을 뺐는지
 *
 * reference_date 는 일부러 뺐다. 넣으면 날마다 달라져서 매일 재생성한다.
 * derived 를 넣은 이유는 그 반대쪽 함정 때문이다 — 원본이 그대로여도 시간이
 * 흐르면 "9개월 전"이 "10개월 전"으로 틀려진다. 원본만 비교하면 문장이 조용히
 * 사실과 어긋난 채 남는다. 그래서 "원본이 안 바뀌었으면 재생성하지 않는다"를
 * "원본과, 원본에서 계산한 값이 모두 그대로면 재생성하지 않는다"로 읽었다.
 */
export function fingerprintBasedOn(basedOn) {
  if (!basedOn || typeof basedOn !== 'object') return null
  return stableStringify({
    template_version: basedOn.template_version ?? null,
    source: basedOn.source ?? null,
    derived: basedOn.derived ?? null,
    omitted: basedOn.omitted ?? null,
  })
}

/** 저장된 요약과 새로 만든 근거를 비교해 다시 저장해야 하는지 판단한다. */
export function needsRegeneration(storedRow, nextBasedOn) {
  if (!storedRow) return true
  return fingerprintBasedOn(storedRow.based_on) !== fingerprintBasedOn(nextBasedOn)
}

/**
 * 교량 목록을 받아 요약을 갱신한다.
 *
 * @param {Array<{bridgeId: string, bridge: object, history: Array<object>}>} items
 * @param {object} deps
 * @param {{getByBridgeId(id): Promise<object|null>, upsert(row): Promise<void>}} deps.repo
 * @param {string|Date} [deps.referenceDate]  경과 계산의 기준일 (기본: 지금)
 * @param {Date} [deps.now]                   generated_at 에 쓸 시각 (기본: 지금)
 * @param {(msg: string) => void} [deps.logger]
 *
 * @returns {Promise<Array<{bridgeId, outcome, summaryText, basedOn, failures}>>}
 *   outcome — 'saved' | 'cleared' | 'unchanged' | 'rejected' | 'error'
 */
export async function refreshSummaries(items, deps) {
  const { repo, referenceDate, now = new Date(), logger = () => {} } = deps ?? {}
  if (!repo) throw new TypeError('repo 가 필요합니다')

  const report = []

  for (const item of items) {
    const bridgeId = item.bridgeId ?? item.bridge?.id
    if (!bridgeId) {
      report.push({ bridgeId: null, outcome: 'error', error: 'bridgeId 없음' })
      continue
    }

    try {
      const generated = generateSummary(
        { bridge: item.bridge, history: item.history },
        { referenceDate },
      )
      const stored = await repo.getByBridgeId(bridgeId)

      if (!needsRegeneration(stored, generated.basedOn)) {
        logger(`[skip] ${bridgeId} — 원본과 계산값이 그대로여서 재생성하지 않음`)
        report.push({
          bridgeId,
          outcome: 'unchanged',
          summaryText: stored?.summary_text ?? null,
          basedOn: stored?.based_on ?? null,
          failures: [],
        })
        continue
      }

      const failures = generated.validation.ok ? [] : generated.validation.failures

      // 문장을 만들지 못했거나 검증에 걸렸으면 summary_text 를 null 로 저장한다.
      // 지운 이유는 based_on 에 남으므로, 왜 요약이 없는지 나중에 확인할 수 있다.
      await repo.upsert({
        bridge_id: bridgeId,
        summary_text: generated.summaryText,
        based_on: generated.basedOn,
        generated_at: now.toISOString(),
      })

      const outcome = generated.summaryText
        ? 'saved'
        : failures.some((f) => f.check === 'insufficient')
          ? 'cleared'
          : 'rejected'

      logger(
        outcome === 'saved'
          ? `[save] ${bridgeId} — ${generated.summaryText}`
          : `[null] ${bridgeId} — ${failures.map((f) => f.detail).join(' / ')}`,
      )

      report.push({
        bridgeId,
        outcome,
        summaryText: generated.summaryText,
        basedOn: generated.basedOn,
        failures,
      })
    } catch (error) {
      logger(`[fail] ${bridgeId} — ${error.message}`)
      report.push({ bridgeId, outcome: 'error', error: error.message })
    }
  }

  return report
}

/** 메모리 저장소. 확인 스크립트와 테스트에서 쓴다. */
export function createInMemorySummariesRepo(seed = []) {
  const rows = new Map(seed.map((row) => [row.bridge_id, row]))
  return {
    async getByBridgeId(bridgeId) {
      return rows.get(bridgeId) ?? null
    },
    async upsert(row) {
      rows.set(row.bridge_id, { ...rows.get(row.bridge_id), ...row })
    },
    all() {
      return [...rows.values()]
    },
  }
}
