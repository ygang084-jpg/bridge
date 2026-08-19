# BRIDGE SAFE

BRIDGE SAFE 웹앱. 요구사항은 [`prd.md`](prd.md) (PRD v0.4) 이고,
문서와 구현이 어긋난 부분은 그 문서의 **§15 부록**에 모아 두었다.

## 저장소 배치

앱이 저장소 루트에 있다. `docs/` · `prototype/` · `design-system/` ·
`stitch_bridge_safe_public_web_app/` 은 배포에 실리지 않는 자료이며 `.vercelignore` 가 거른다.

2026-08-19 까지는 앱이 `bridge-guardian/` 안에 있었다. 버셀 Root Directory 가 저장소
루트를 보고 있어서 하위 폴더의 `vercel.json`·`next.config.mjs` 가 아예 읽히지 않았고,
배포된 주소는 홈까지 전부 404 였다. 하위 폴더를 유지하는 길은 대시보드 설정에
의존하므로 앱을 루트로 옮겼다 — 이제 버셀 기본 설정으로 붙는다.

## 스택

Next.js (App Router) · React · Supabase · Tailwind CSS v4 · Vercel

PRD §10 이 정한 조합이다. 이전에는 Vite + React 스캐폴드였고, 2026-08-18 에 전환했다.

## 시작하기

```bash
npm install
cp .env.example .env.local     # 값을 채운다
npm run dev                    # http://localhost:3000
```

`.env.local` 없이도 화면은 뜬다. 데이터를 읽지 못하면 F-05 '정보 없음' 경로로
흐르게 만들어 두었기 때문이다 — 빈 화면이나 오류로 끝나지 않는다.

### 데이터베이스

Supabase SQL Editor 에서 순서대로 실행한다.

| 순서 | 파일 | 내용 |
| --- | --- | --- |
| 1 | `supabase/migrations/0001_core_tables.sql` | bridges · bridge_history · 캐시 테이블 · view_logs |
| 2 | `supabase/migrations/0002_bridge_summaries.sql` | bridge_summaries (0001 의 bridges 를 참조) |
| 3 | `supabase/seed/sample.sql` | **표본 데이터.** 화면 확인용. 실제 공공데이터가 아니다 |

표본 데이터를 지울 때는 `delete from public.bridges where id like 'sample-%';`

## 확인 스크립트

화면(React)은 브라우저에서 봐야 하지만, 화면이 그대로 받아 쓰는 계산 로직은
터미널에서 전부 돌려볼 수 있다.

```bash
npm run check           # 아래 둘을 이어서 실행
npm run check:logic     # F-03 타임라인 · F-05 정보 상태 (단정 17개)
npm run check:summaries # 자동 요약 생성 + based_on + 검증기 자체 점검
```

`check:summaries --db` 를 붙이면 표본값 대신 Supabase 원본으로 돌린다.

## 화면과 소스의 대응

| PRD | 화면 | 파일 |
| --- | --- | --- |
| — | 진입 | `src/app/page.jsx` |
| F-01 | 교량 목록 | `src/app/bridges/page.jsx` + `BridgeList.jsx` (클라이언트) |
| F-02 | 교량 상세 | `src/app/bridges/[id]/page.jsx` |
| **F-03** | **관리 이력 타임라인** | `src/app/bridges/[id]/history/page.jsx` + `src/components/Timeline.jsx` |
| F-04 | 오늘의 상태 | `src/app/bridges/[id]/today/page.jsx` — **판정 로직 없음.** §13 Q2·Q3 미해소 |
| F-05 | 정보 없음 | `src/lib/infoState.js` + `src/components/EmptyNotice.jsx` |

## 이 코드에서 무너지면 안 되는 규칙

읽지 않고 고치면 제품의 전제가 깨지는 곳들이다.

| 규칙 | 지키는 곳 |
| --- | --- |
| 요약에 판정·행동 지시·등급 반복·추정을 넣지 않는다 | `src/lib/summary/forbiddenPhrases.js` (패턴 17개) + `validateSummary.js` |
| 요약이 60자를 넘거나 근거 없는 숫자를 담으면 저장하지 않는다 | `validateSummary.js` + DB `check` 제약 |
| '기록 없음'을 '관리 안 함' 또는 '문제 없음'으로 읽히게 쓰지 않는다 | `src/lib/infoState.js` — 문구를 이 파일 밖에서 쓰지 않는다 |
| 타임라인 간격에 임계값·경고색을 붙이지 않는다 | `src/components/Timeline.jsx` — 붙이는 순간 우리가 판정하게 된다 |
| 상태를 색상만으로 전달하지 않는다 | `src/components/InfoStateBadge.jsx` — tint + 아이콘 + 텍스트를 항상 함께 |
| 출처 없는 기준치는 화면에 나오지 않는다 | DB `risk_thresholds.source_url not null` |
| 법령 정의는 원문을 대조하기 전까지 표시하지 않는다 | `src/lib/summary/safetyGrades.js` — `url`·`verifiedOn` 이 비면 렌더링 안 함 |
| 사용자 좌표를 서버로 보내지 않는다 | `BridgeList.jsx` 에서 거리 계산. 서버는 좌표를 받지 않는다 |
| 키를 브라우저에 노출하지 않는다 | `src/lib/supabase/serverClient.js` — `VITE_`/`NEXT_PUBLIC_` 접두사 발견 시 예외 |

## 환경변수

`.env.example` 참고. `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · `CRON_SECRET`.

**어느 것에도 `NEXT_PUBLIC_` 을 붙이지 않는다.** 접두사가 없으면 클라이언트 번들에서
`process.env.X` 가 `undefined` 가 되므로, 실수로 클라이언트 컴포넌트에서 DB 를 읽으려
하면 빌드가 아니라 동작에서 바로 드러난다.

## 스케줄러

`vercel.json` 에 하루 1회(`10 19 * * *` UTC = 04:10 KST) `/api/cron/refresh-summaries` 를 등록해 두었다.

- 이 라우트는 **요약만** 갱신한다. 원본(bridges·bridge_history)을 채우는 라우트는 아직 없다 (§13 Q2).
- Vercel Hobby 플랜의 Cron 주기 제한은 변동이 잦다. 하루 1회로 둔 것은 그 제한 안에
  확실히 들어가기 때문이다. 더 잦은 주기가 필요해지면 공식 요금 페이지를 먼저 확인한다.
- `CRON_SECRET` 을 설정하면 그 토큰 없이 호출하는 요청은 401 이 된다.

## Vite 스캐폴드에서 제거한 파일

`vite.config.js` · `index.html` · `src/main.jsx` · `src/App.jsx` · `src/App.css` ·
`src/index.css` · `src/assets/*` · `public/favicon.svg` · `public/icons.svg`

커밋 `8802f6d` 에 남아 있으므로 되돌릴 수 있다.

```bash
git checkout 8802f6d -- bridge-guardian/vite.config.js bridge-guardian/index.html   # 당시 경로
```
