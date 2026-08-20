-- bridges 제원 컬럼 추가 — 교량형식 · 폭 · 차로수 · 설계하중
--
-- 0001_core_tables.sql 이 먼저 실행되어 있어야 한다.
--
-- 왜 지금 추가하는가
--
-- 0001 을 쓸 때는 이 값들을 담지 않았다. 어느 출처를 쓸지 정해지지 않아 무엇이
-- 오는지 몰랐고, 담을 곳이 없어 교량 상세의 '구조 형식·사용 재료' 자리를 비워
-- 두었다 (CLAUDE.md '화면을 만들 때 지키는 것' 표).
--
-- 이제 출처가 정해졌고(국토교통부 전국 교량 및 터널 현황정보, data.go.kr 15092289)
-- 실제 응답에 네 값이 들어 있는 것을 확인했다. 받아서 버리고 있었으므로 담는다.
--
--   superstNm  'PSCI거더교'  → superstructure   상부구조
--   totWidth   9.8          → total_width_m    총폭(m)
--   lineNum    2            → lane_count       차로수
--   designNm   'DB-24'      → design_load      설계하중
--
-- facility_type(시설물 종류)에 상부구조를 넣지 않는 이유
--
-- 'PSCI거더교'는 상부구조 형식이고, 시설물 종류(콘크리트교 등)는 다른 값이다.
-- 같은 칸에 넣으면 두 분류가 섞여 무엇을 보고 있는지 알 수 없게 된다. 그래서
-- facility_type 은 그대로 비워 두고 컬럼을 따로 만든다.
--
-- facility_class(시설물 종별)를 여기서 채우지 않는 이유
--
-- 응답의 special(01·02·03·99)이 종별로 보이지만 코드집을 확인하지 못했다.
-- 종별은 법정 점검 대상을 가르는 값이라 추측이 곧 오정보다. 확인될 때까지 비운다.

alter table public.bridges
  add column if not exists superstructure text,
  add column if not exists total_width_m  numeric,
  add column if not exists lane_count     integer,
  add column if not exists design_load    text;

-- 총폭과 차로수는 음수가 될 수 없다. 상류 값이 이상해도 화면까지 흘러가지 않게
-- DB 에서 막는다 — '폭 -9.8m' 이 표시되면 그 자체가 오정보다.
alter table public.bridges
  drop constraint if exists bridges_total_width_check;
alter table public.bridges
  add constraint bridges_total_width_check
  check (total_width_m is null or total_width_m > 0);

alter table public.bridges
  drop constraint if exists bridges_lane_count_check;
alter table public.bridges
  add constraint bridges_lane_count_check
  check (lane_count is null or lane_count between 1 and 40);

comment on column public.bridges.superstructure is
  '상부구조 형식 (예: PSCI거더교). 시설물 종류(facility_type)와 다른 값이다.';
comment on column public.bridges.total_width_m is '총폭(m). 보도를 포함한 전체 폭.';
comment on column public.bridges.lane_count is '차로수.';
comment on column public.bridges.design_load is
  '설계활하중 표기 (예: DB-24). 공개 데이터의 문자열을 그대로 옮긴다.';

-- 읽기 정책은 0001 에서 테이블 단위로 걸어 두었으므로 컬럼 추가만으로 충분하다.
notify pgrst, 'reload schema';
