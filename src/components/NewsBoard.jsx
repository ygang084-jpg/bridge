import Link from 'next/link'
import Icon from './Icon'
import { arrangeNews, classifyNews, excerptSentences } from '@/lib/news/classify.js'

/**
 * 교량 뉴스 — 공지사항 게시판 형식.
 * ---------------------------------------------------------------------------
 * 출처는 네이버 뉴스 검색 API 이고, 스케줄러가 bridge_news 에 채운 것을 읽는다
 * (화면에서 직접 부르지 않는다 — §11 3초, 키 보호).
 *
 * 항목마다 말머리 · 제목 · 카테고리/지역/발표일 · 요약 · 출처를 낸다.
 * 요청받은 형식에서 두 가지를 다르게 했다 :
 *
 *   · 요약을 새로 쓰지 않는다. 기사 원문 발췌를 2문장까지 자른 것이다.
 *     우리가 다시 쓰면 원문에 없는 뜻이 섞이고, 그 문장이 교량 상태에 대한
 *     우리 주장이 된다 (PRD §7).
 *   · 제목을 28자로 줄이지 않는다. 실제 기사 제목을 자르면 뜻이 바뀔 수 있어
 *     전문을 두고 넘치는 줄만 CSS 로 접는다.
 *
 * '영향받는 대상'은 네이버 응답에 없는 값이라 넣지 않았다. 요청 형식에도
 * '해당 없으면 생략'이라고 되어 있다.
 *
 * 말머리는 우리 판단이 아니라 제목·요약에 있던 낱말에서 나온다. 그 낱말을
 * 항목마다 함께 보여주므로 왜 그 태그가 붙었는지 확인할 수 있다.
 *
 * 대시보드(발췌 6건 + '전체 보기')와 교량뉴스 화면(전체 목록)이 같은 목록을 쓴다.
 * 그래서 대시보드 안에 있던 것을 여기로 옮겼다 — 두 벌로 두면 말머리 색이나
 * 하단 고지 문구를 한쪽만 고치게 되고, 뉴스 목록에서 그 고지가 빠지는 것이
 * 가장 위험하다 ('뉴스에 났다 = 위험하다'로 읽히는 것을 막는 문장이다).
 * ---------------------------------------------------------------------------
 */

/** 말머리 색. 태그마다 다르지만 색만으로 뜻을 전하지 않는다 — 글자가 태그 이름이다. */
const TAG_TONE = {
  긴급: 'bg-danger-bg text-danger-fg',
  공지: 'bg-caution-bg text-caution-fg',
  정책: 'bg-summary-bg text-summary-fg',
  기술: 'bg-summary-bg text-summary-fg',
  해외: 'bg-surface-variant text-on-surface-variant',
  안내: 'bg-surface-variant text-on-surface-variant',
}

export default function NewsBoard({
  items = [],
  limit = 6,
  heading = '교량에 대한 모든 것 · 뉴스',
  /** 발췌만 보여주는 자리(대시보드)에서 전체 목록으로 가는 경로. */
  moreHref = null,
  /** 화면 전체의 관리 기록 출처. 뉴스만 있는 화면에서는 넘기지 않는다. */
  sources = null,
  fetchedAt = null,
  className = 'mb-xl w-full px-margin-mobile md:px-margin-desktop',
}) {
  const classified = items.map((item) => ({ ...item, ...classifyNews(item) }))
  const rows = arrangeNews(classified, limit)

  return (
    <div className={className}>
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-md shadow-sm">
        <div className="mb-md flex items-center justify-between gap-4 border-b border-outline-variant pb-3">
          <h2 className="text-headline-md font-bold text-primary">{heading}</h2>
          <span className="flex items-center gap-3 text-sm text-on-surface-variant">
            {/* '수집 전'과 '0건'을 구별해 적는다 — 0건은 수집이 돌았는데 결과가
                없었다는 뜻으로 읽히고, 실제로는 아직 돈 적이 없다. */}
            {rows.length > 0 ? `${rows.length}건` : '수집 전'}
            {moreHref && rows.length > 0 && (
              <Link href={moreHref} className="font-semibold text-primary underline hover:no-underline">
                전체 보기
              </Link>
            )}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg bg-surface-container-low p-md">
            <p className="flex items-start gap-1.5 text-body-md text-on-surface-variant">
              <Icon name="minus-circle" size={16} className="mt-0.5" />
              아직 수집된 기사가 없습니다.
            </p>
            <p className="mt-2 text-sm leading-[22px] text-on-surface-variant">
              기사 제목과 날짜는 지어낼 수 없어 목록을 비워 두었습니다. 네이버 검색 키를 넣고 수집
              라우트를 한 번 돌리면 여기에 채워집니다.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {rows.map((row, index) => (
              <li
                key={row.id ?? row.url}
                className={index < rows.length - 1 ? 'border-b border-outline-variant/20' : undefined}
              >
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-4 transition-colors hover:bg-surface-container-low/60"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-caption font-bold ${
                        TAG_TONE[row.tag] ?? TAG_TONE.안내
                      }`}
                      title={row.tagHint}
                    >
                      [{row.tag}]
                    </span>
                    <h3 className="line-clamp-2 text-body-md font-semibold text-on-surface">
                      {row.title}
                    </h3>
                  </div>

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-on-surface-variant">
                    <span>{row.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{row.region ?? '지역 미표기'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{row.published_at ? formatFetchedAt(row.published_at) : '발표일 미표기'}</span>
                  </p>

                  {row.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-[22px] text-on-surface-variant">
                      {excerptSentences(row.description)}
                    </p>
                  )}

                  <p className="mt-2 text-caption text-on-surface-variant/70">
                    출처 {row.publisher ?? '출처 미표기'}
                    {row.matched.length > 0 && ` · 분류 근거 '${row.matched.join("', '")}'`}
                  </p>
                </a>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-md border-t border-outline-variant/30 pt-3 text-xs leading-[18px] text-on-surface-variant">
          기사는 <strong className="font-semibold">언론 보도이며 공식 기록이 아닙니다.</strong>{' '}
          네이버 뉴스 검색 결과를 옮긴 것이고, 요약은 기사 원문 발췌입니다. 말머리와 카테고리는
          제목·요약에 있던 낱말로 붙인 것이며 저희가 사안의 심각성을 판정한 것이 아닙니다.
          {sources && (
            <>
              <br />
              화면의 관리 기록 출처: {sources.length > 0 ? sources.join(' · ') : '출처 미표기'}
              {fetchedAt ? ` · ${formatFetchedAt(fetchedAt)} 수집` : ''}
            </>
          )}
        </p>
      </div>
    </div>
  )
}

/* ── 공통 조각 ───────────────────────────────────────────────────────── */

function formatFetchedAt(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : String(value)
}
