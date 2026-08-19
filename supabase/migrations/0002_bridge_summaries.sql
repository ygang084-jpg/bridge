-- bridge_summaries — 교량 상세 최상단의 한 문장 요약
-- 출처 : PRD v0.4 §9
--
-- 0001_core_tables.sql 을 먼저 실행해야 한다 (bridges 를 참조한다).
--
-- 이 테이블이 존재하는 이유는 §11 성능 요구다. 요청 시점에 문장을 만들면
-- 3초 안에 보여주기 어렵고, 원본이 바뀌지 않았는데 매번 만들 이유도 없다.
-- 요약은 규칙 기반 템플릿으로 생성한다 (PRD §15.1) — AI 호출이 아니다.

create table if not exists public.bridge_summaries (
  id           uuid primary key default gen_random_uuid(),
  bridge_id    text not null references public.bridges (id) on delete cascade,

  -- null 을 허용한다. 근거가 부족하거나 검증에 걸리면 억지로 만들지 않고
  -- 비워 두기로 했기 때문이다 (F-05, §7).
  summary_text text,

  -- 근거로 삼은 원본 값 + 원본에서 계산한 값 + 문장에서 뺀 항목.
  -- 나중에 요약이 원문과 어긋났는지 대조하고, 재생성이 필요한지 판단한다.
  based_on     jsonb not null,

  generated_at timestamptz not null default now(),

  -- bridges : bridge_summaries = 1:1 (현재 유효한 요약 1건)
  constraint bridge_summaries_bridge_id_key unique (bridge_id),

  -- 60자 제한. 애플리케이션 검증이 뚫려도 DB 가 막는다.
  constraint bridge_summaries_length_check
    check (summary_text is null or char_length(summary_text) <= 60)
);

create index if not exists bridge_summaries_generated_at_idx
  on public.bridge_summaries (generated_at desc);

alter table public.bridge_summaries enable row level security;

drop policy if exists "요약 공개 읽기" on public.bridge_summaries;
create policy "요약 공개 읽기"
  on public.bridge_summaries for select
  to anon, authenticated
  using (true);

-- 쓰기 정책은 두지 않는다. 서비스 롤 키는 RLS 를 우회하므로 스케줄러만 쓴다.

comment on table  public.bridge_summaries is
  '교량 상세 최상단 한 문장 요약. 규칙 기반 템플릿으로 생성 (AI 아님).';
comment on column public.bridge_summaries.summary_text is
  '요약 문장. 근거가 부족하거나 검증 실패 시 null.';
comment on column public.bridge_summaries.based_on is
  '근거 원본 값 + 계산값 + 제외 항목. 재생성 판단과 사후 대조에 쓴다.';
