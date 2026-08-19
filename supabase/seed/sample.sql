-- ⚠ 표본 데이터 — 실제 공공데이터가 아니다.
--
-- 화면 5개가 세 가지 정보 상태(이력 있음 / 부분 / 없음)에서 각각 어떻게 보이는지
-- 확인하기 위한 값이다. 교량명에 '(표본)'을 붙였고 id 에 sample- 접두사를 두었다 —
-- 실제 데이터와 섞이거나 실제 기록으로 오인되는 것을 막기 위함이다.
--
-- 공공데이터 연동(§13 Q2)이 끝나면 이 파일은 지운다.
--   delete from public.bridges where id like 'sample-%';

insert into public.bridges
  (id, name, address, lat, lng, completed_year, length_m, facility_type,
   facility_class, manager_org, manager_contact, source, fetched_at)
values
  ('sample-001', '한강대교 (표본)', '서울 용산구 이촌동', 37.5175, 126.9573,
   1917, 1005, '콘크리트교', '1종', '서울특별시 시설안전본부', '02-0000-0000',
   '표본 데이터 (공공 API 아님)', now()),

  ('sample-002', '마포대교 (표본)', '서울 마포구 마포동', 37.5390, 126.9455,
   1970, 1400, '강교', '1종', '서울특별시 시설안전본부', '02-0000-0000',
   '표본 데이터 (공공 API 아님)', now()),

  ('sample-003', '샛터소교 (표본)', '서울 강서구 개화동', 37.5820, 126.8100,
   null, 24, null, '3종', '강서구청', null,
   '표본 데이터 (공공 API 아님)', now())
on conflict (id) do nothing;

-- sample-001 : 이력 있음 (준공 외 3건) — 타임라인이 온전히 채워지는 경우
insert into public.bridge_history
  (bridge_id, occurred_on, event_type, description, safety_grade, source, data_as_of)
values
  ('sample-001', '1917-10-07', '준공', null, null, '표본 데이터', '2025-01-31'),
  ('sample-001', '2016-05-20', '보수', '교면 방수 및 포장 보수', null, '표본 데이터', '2016-06-30'),
  ('sample-001', '2021-09-14', '정밀안전진단', null, 'B', '표본 데이터', '2021-10-31'),
  ('sample-001', '2025-11-03', '정기점검', null, 'B', '표본 데이터', '2025-11-30')
on conflict (bridge_id, occurred_on, event_type) do nothing;

-- sample-002 : 이력 부분 (준공 외 1건) — 타임라인이 성립하지 않는 경우
insert into public.bridge_history
  (bridge_id, occurred_on, event_type, description, safety_grade, source, data_as_of)
values
  ('sample-002', '1970-05-16', '준공', null, null, '표본 데이터', '2025-01-31'),
  ('sample-002', '2024-05-21', '정기점검', null, 'C', '표본 데이터', '2024-06-30')
on conflict (bridge_id, occurred_on, event_type) do nothing;

-- sample-003 : 이력 없음 — 준공연도조차 공개되지 않은 소규모 교량.
--   PRD §4.1 '주의' 항목이 지적한 상황이다. 정작 페르소나가 매일 건너는 다리가
--   이런 경우일 수 있으므로, 이 상태에서 화면이 어떻게 보이는지가 중요하다.
--   이력 행을 하나도 넣지 않는다.

-- risk_thresholds 는 비워 둔다 — §13 Q3 미해소.
-- 출처 없는 기준치를 넣을 수 없도록 source_url 이 not null 이다.
