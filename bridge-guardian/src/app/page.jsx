import Link from 'next/link'
import Icon from '@/components/Icon'

/**
 * 진입 화면 — PRD §5.
 *
 * 헤드라인이 '오늘은 괜찮을까?'가 아닌 이유 :
 * 그 문장은 이 제품이 하지 않기로 한 판정(§2.2)을 첫 화면에서 약속한다.
 * 사용자는 '괜찮다/아니다'라는 답을 기대하고 들어와서, 받지 못하고 나간다.
 * §1이 정의한 대로 이 제품이 실제로 답하는 질문을 그대로 적었다.
 */
export default function EntryPage() {
  return (
    <>
      <header className="flex h-14 items-center px-4">
        <span className="text-[17px] font-semibold text-primary">BRIDGE SAFE</span>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8 px-4">
        <div>
          <h1 className="text-[24px] leading-8 font-extrabold text-primary">
            매일 건너는 다리,
            <br />
            어떻게 관리되어 왔을까?
          </h1>
          <p className="mt-3 text-[16px] leading-[26px] text-fg-muted">
            준공부터 최근 점검까지, 공개된 관리 기록을 시간순으로 보여드립니다. 오늘의 통행
            조건도 함께 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/bridges"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[16px] font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            <Icon name="map-pin" size={20} />
            내 주변 교량 찾기
          </Link>
          <Link
            href="/bridges?mode=search"
            className="flex min-h-[44px] items-center justify-center gap-1.5 text-[14px] font-medium text-accent hover:underline"
          >
            <Icon name="search" size={16} />
            지역명으로 찾기
          </Link>
        </div>

        <p className="text-[13px] leading-[18px] text-fg-muted">
          위치는 가까운 교량을 고르는 데만 쓰이고, 브라우저 밖으로 나가지 않습니다. 서버로
          전송하지 않으므로 저장할 것도 없습니다.
        </p>
      </main>
    </>
  )
}
