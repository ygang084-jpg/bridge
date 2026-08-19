-- BRIDGE SAFE v0 — 공공데이터 캐시·기록 계층
-- 출처 : PRD v0.4 §9 데이터 구조
--
-- 이 DB는 사용자 데이터 저장소가 아니다. users 테이블이 없는 것은 누락이 아니라
-- 설계다 (로그인이 없다). reports(시민 제보)도 v0.4에서 삭제되었다.
--
-- 실행 순서 : 0001 → 0002. bridge_summaries 가 bridges 를 참조하므로 이 파일이 먼저다.

-- ─────────────────────────────────────────────────────────────
-- bridges — 교량 기본정보 캐시 (F-01 · F-02)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bridges (
  -- 공공데이터의 시설물 관리번호를 그대로 쓴다. URL 이 안정적이고 대조가 쉽다.
  id              text primary key,
  external_id     text,
  name            text not null,
  address         text,
  lat             double precision,
  lng             double precision,
  completed_year  integer,
  length_m        numeric,
  facility_type   text,
  -- 시설물안전법상 종별(1종/2종/3종). 종별에 따라 법정 점검 대상이 달라
  -- 이력 밀도가 갈린다 — PRD §4.1
  facility_class  text,
  manager_org     text,
  manager_contact text,
  source          text,
  fetched_at      timestamptz,

  constraint bridges_completed_year_check
    check (completed_year is null or completed_year between 1000 and 9999),
  constraint bridges_lat_check check (lat is null or lat between -90 and 90),
  constraint bridges_lng_check check (lng is null or lng between -180 and 180)
);

create index if not exists bridges_name_idx on public.bridges (name);

-- ─────────────────────────────────────────────────────────────
-- bridge_history — 관리 이력 (F-03, 제품의 중심)
--   v0.4에서 bridge_inspections 를 흡수했다. 점검과 보수를 분리하지 않고
--   하나의 사건 흐름으로 다룬다.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bridge_history (
  id           uuid primary key default gen_random_uuid(),
  bridge_id    text not null references public.bridges (id) on delete cascade,
  occurred_on  date not null,
  -- PRD F-03 '사건 종류'. 공공데이터의 실제 종류 체계는 [확인 필요 — §13 Q2]이므로
  -- enum 이 아니라 text + check 로 두고, 모르는 값은 '기타'로 받는다.
  event_type   text not null,
  description  text,
  -- 해당 사건이 점검이고 등급이 나온 경우에만 채운다. 교량의 항상적 속성이 아니다.
  safety_grade text,
  source       text,
  data_as_of   date,

  constraint bridge_history_event_type_check check (
    event_type in ('준공', '정기점검', '정밀점검', '정밀안전진단', '보수', '보강', '기타')
  ),
  constraint bridge_history_grade_check
    check (safety_grade is null or safety_grade in ('A', 'B', 'C', 'D', 'E')),
  -- 같은 교량·같은 날·같은 종류가 두 번 들어오는 것은 수집 중복이다.
  constraint bridge_history_unique_event unique (bridge_id, occurred_on, event_type)
);

create index if not exists bridge_history_bridge_date_idx
  on public.bridge_history (bridge_id, occurred_on desc);

-- ─────────────────────────────────────────────────────────────
-- bridge_restrictions — 통행제한 캐시 (F-04)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bridge_restrictions (
  id            uuid primary key default gen_random_uuid(),
  bridge_id     text not null references public.bridges (id) on delete cascade,
  is_restricted boolean not null,
  reason        text,
  started_on    date,
  ended_on      date,
  source        text,
  fetched_at    timestamptz,

  constraint bridge_restrictions_period_check
    check (ended_on is null or started_on is null or ended_on >= started_on)
);

create index if not exists bridge_restrictions_bridge_idx
  on public.bridge_restrictions (bridge_id, started_on desc);

-- ─────────────────────────────────────────────────────────────
-- weather_snapshots — 기상 관측 캐시 (F-04)
--   조회 실패 시 '마지막 갱신 시각'을 보여주기 위해 저장이 필수다 (§11 장애 대응)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.weather_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  bridge_id          text not null references public.bridges (id) on delete cascade,
  station_name       text,
  station_distance_m numeric,
  wind_speed         numeric,
  precipitation      numeric,
  temperature        numeric,
  river_level        numeric,
  observed_at        timestamptz,
  source             text,
  fetched_at         timestamptz not null default now()
);

create index if not exists weather_snapshots_bridge_time_idx
  on public.weather_snapshots (bridge_id, observed_at desc);

-- 30일 보존. 이 테이블만 계속 늘어나므로 무료 500MB 한도를 여기서 지킨다.
-- pg_cron 확장을 켠 뒤 아래를 등록한다 (Supabase Dashboard > Database > Extensions):
--
--   select cron.schedule(
--     'weather-snapshots-retention', '0 4 * * *',
--     $$delete from public.weather_snapshots where observed_at < now() - interval '30 days'$$
--   );
--
-- 실제로 돌았는지는 select * from cron.job_run_details order by start_time desc; 로 확인한다.

-- ─────────────────────────────────────────────────────────────
-- weather_alerts — 기상특보 (F-04). 교량이 아니라 지역에 발효된다
-- ─────────────────────────────────────────────────────────────
create table if not exists public.weather_alerts (
  id          uuid primary key default gen_random_uuid(),
  region_code text not null,
  alert_type  text not null,
  issued_at   timestamptz not null,
  cleared_at  timestamptz,
  source      text,
  fetched_at  timestamptz not null default now()
);

create index if not exists weather_alerts_region_idx
  on public.weather_alerts (region_code, issued_at desc);

-- ─────────────────────────────────────────────────────────────
-- risk_thresholds — 위험 표시 기준치 (F-04)
--
--   PRD §9 : '출처가 비면 화면에 표시하지 않는다' — §7 원칙의 강제 수단.
--   그래서 source_name·source_url 을 not null 로 걸었다. 출처 없는 기준치는
--   애초에 들어갈 수 없다. 지금 이 테이블이 비어 있는 것은 §13 Q3 미해소 때문이며,
--   비어 있는 동안 F-04 는 어떤 기준치도 표시하지 않는다.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.risk_thresholds (
  id              uuid primary key default gen_random_uuid(),
  factor          text not null,
  threshold_value numeric not null,
  unit            text not null,
  source_name     text not null,
  source_url      text not null,
  fetched_at      timestamptz not null default now(),

  constraint risk_thresholds_factor_key unique (factor),
  constraint risk_thresholds_source_url_check check (length(trim(source_url)) > 0),
  constraint risk_thresholds_source_name_check check (length(trim(source_name)) > 0)
);

-- ─────────────────────────────────────────────────────────────
-- view_logs — 익명 조회 기록 (§12 지표 측정용)
--
--   개인 식별 정보를 넣지 않는다. session_id 는 브라우저 세션 단위 임의값이며,
--   이용자가 적은 시점에는 session_id + occurred_at + bridge_id 조합만으로도
--   개인 동선이 복원될 수 있다. 그래서 occurred_at 을 시(hour) 단위로 절삭해
--   넣는 것을 권한다 — 지표(전환율·정보없음 비율)에는 시 단위로 충분하다.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.view_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  screen      text not null,
  bridge_id   text references public.bridges (id) on delete set null,
  info_state  text,
  occurred_at timestamptz not null default date_trunc('hour', now()),

  constraint view_logs_info_state_check
    check (info_state is null or info_state in ('present', 'partial', 'absent'))
);

create index if not exists view_logs_occurred_idx on public.view_logs (occurred_at desc);

-- ─────────────────────────────────────────────────────────────
-- RLS — v0 는 로그인이 없다. 읽기는 누구나, 쓰기는 서비스 롤(스케줄러)만.
-- 서비스 롤 키는 RLS 를 우회하므로 쓰기 정책을 따로 두지 않는다.
-- ─────────────────────────────────────────────────────────────
alter table public.bridges             enable row level security;
alter table public.bridge_history      enable row level security;
alter table public.bridge_restrictions enable row level security;
alter table public.weather_snapshots   enable row level security;
alter table public.weather_alerts      enable row level security;
alter table public.risk_thresholds     enable row level security;
alter table public.view_logs           enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'bridges', 'bridge_history', 'bridge_restrictions',
      'weather_snapshots', 'weather_alerts', 'risk_thresholds'
    ])
  loop
    execute format('drop policy if exists "공개 읽기" on public.%I', t);
    execute format(
      'create policy "공개 읽기" on public.%I for select to anon, authenticated using (true)', t
    );
  end loop;
end
$$;

-- view_logs 는 읽기도 막는다. 지표 조회는 대시보드(서비스 롤)에서 한다.
-- 익명이라 해도 조회 기록 전체를 공개할 이유가 없다.

comment on table public.bridge_history is
  '관리 이력. F-03의 본체. 점검·보수·보강을 하나의 사건 흐름으로 담는다.';
comment on table public.risk_thresholds is
  '위험 표시 기준치. source_name·source_url 이 not null 인 것은 출처 없는 기준치를 막기 위함이다.';
