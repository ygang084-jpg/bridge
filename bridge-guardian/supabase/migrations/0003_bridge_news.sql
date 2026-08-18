-- bridge_news — 교량 관련 언론 기사 캐시
--
-- 0001_core_tables.sql 이 먼저 실행되어 있어야 한다 (같은 스키마를 쓴다).
--
-- 왜 캐시인가 : 화면을 열 때마다 네이버 검색 API 를 부르면 응답 속도를 통제할
-- 수 없고(§11 3초), 일일 호출 한도도 사용자 트래픽에 묶인다. 다른 캐시 테이블과
-- 같은 방식으로 스케줄러가 채우고 화면은 저장된 것만 읽는다.
--
-- 왜 bridge_id 가 없는가 : 기사를 특정 교량에 붙이면 '이 다리가 뉴스에 났다 =
-- 이 다리가 위험하다'로 읽힌다. 기사 제목에 교량명이 들어 있다는 것만으로
-- 그 교량의 상태를 말할 수는 없다. 그래서 교량과 잇지 않고 전체 목록으로만 둔다.
--
-- 이 표의 내용은 공식 기록이 아니라 언론 보도다. bridges·bridge_history 와
-- 같은 층으로 읽히면 안 되므로 화면에서도 따로 묶어 출처를 밝힌다.

create table if not exists public.bridge_news (
  id           uuid primary key default gen_random_uuid(),

  title        text not null,

  -- 원문 링크. 같은 기사를 두 번 담지 않기 위한 자연 키로 쓴다.
  url          text not null,

  -- 링크의 호스트명에서 뽑는다. 네이버 검색 API 는 언론사명을 따로 주지 않는다.
  publisher    text,

  description  text,

  -- 기사 발행 시각. 파싱에 실패하면 넣지 않는다 — 추측한 날짜를 적지 않는다.
  published_at timestamptz,

  -- 어떤 검색어로 걸려 왔는지. 목록이 왜 이렇게 구성됐는지 나중에 설명할 수 있어야 한다.
  query        text,

  -- 어디서 가져왔는지. 값이 비면 화면에 출처를 적을 수 없다.
  source       text not null default '네이버 뉴스 검색 API',

  fetched_at   timestamptz not null default now(),

  constraint bridge_news_url_key unique (url)
);

create index if not exists bridge_news_published_at_idx
  on public.bridge_news (published_at desc nulls last);

alter table public.bridge_news enable row level security;

drop policy if exists "뉴스 공개 읽기" on public.bridge_news;
create policy "뉴스 공개 읽기"
  on public.bridge_news for select
  to anon, authenticated
  using (true);

-- 쓰기 정책은 두지 않는다. 서비스 롤 키가 RLS 를 우회하므로 스케줄러만 쓴다.

comment on table  public.bridge_news is
  '교량 관련 언론 기사 캐시 (네이버 뉴스 검색 API). 공식 기록이 아니다.';
comment on column public.bridge_news.url is
  '원문 링크. 중복 저장을 막는 자연 키.';
comment on column public.bridge_news.published_at is
  '기사 발행 시각. 파싱 실패 시 null — 날짜를 추측해 넣지 않는다.';
