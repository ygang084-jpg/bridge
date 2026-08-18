/**
 * Stitch 대시보드·'내 교량' 화면의 푸터.
 *
 * 디자인에는 '© 2024 국가교량안전청 / 국가교량안전기관'이 적혀 있었다.
 * 실재하지 않는 기관이므로 쓰지 않는다 — 공공기관이 운영하는 서비스로
 * 읽히면 화면의 모든 문장이 공식 발표처럼 받아들여진다.
 *
 * 링크 4개는 아직 대상 문서가 없어 비활성으로 둔다. href="#" 로 두면
 * 눌렀을 때 같은 화면이 다시 뜨는 것처럼 보여 더 혼란스럽다.
 */
const LINKS = ['공공기관 정보', '문의하기', '법적 고지', '개인정보 처리방침']

export default function AppFooter() {
  return (
    <footer className="mt-auto w-full border-t border-outline-variant bg-surface-container-low pb-24 md:pb-0">
      <div className="flex w-full flex-col items-start justify-between gap-md px-margin-mobile py-lg md:flex-row md:items-center md:px-margin-desktop xl:px-32">
        <div className="flex flex-col gap-2">
          <span className="text-headline-md font-bold text-primary">BRIDGE SAFE</span>
          <span className="text-caption text-on-surface-variant">
            공공데이터를 옮겨 보여주는 프로젝트입니다. 공식 기관이 운영하지 않습니다.
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LINKS.map((label) => (
            <span
              key={label}
              aria-disabled="true"
              title="아직 준비되지 않았습니다"
              className="cursor-not-allowed text-body-md text-on-surface-variant/50"
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  )
}
