import { formatDate } from '@/lib/news/tagTone.js'

/**
 * 뉴스 목록 아래 고지.
 *
 * 이 문장이 목록에서 빠지는 것이 '뉴스에 났다 = 그 다리가 위험하다'로 읽히는
 * 가장 빠른 길이다. 그래서 목록을 그리는 화면과 따로 두어, 목록을 옮기거나
 * 다시 짜도 문구가 같이 사라지지 않게 한다.
 *
 * 원래 대시보드 발췌(NewsBoard)와 함께 있었는데, 대시보드에서 뉴스 목록을 빼면서
 * 그 컴포넌트가 쓰이지 않게 되어 문구만 여기로 옮겼다.
 */
export default function NewsDisclaimer({ sources = null, fetchedAt = null, className = '' }) {
  return (
    <p className={`text-xs leading-[18px] text-on-surface-variant ${className}`}>
      기사는 <strong className="font-semibold">언론 보도이며 공식 기록이 아닙니다.</strong> 네이버
      뉴스 검색 결과를 옮긴 것이고, 요약은 기사 원문 발췌입니다. 말머리와 카테고리는 제목·요약에
      있던 낱말로 붙인 것이며 저희가 사안의 심각성을 판정한 것이 아닙니다.
      {sources && (
        <>
          <br />
          화면의 관리 기록 출처: {sources.length > 0 ? sources.join(' · ') : '출처 미표기'}
          {fetchedAt ? ` · ${formatDate(fetchedAt)} 수집` : ''}
        </>
      )}
    </p>
  )
}
