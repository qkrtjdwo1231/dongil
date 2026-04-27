insert into public.customers (name, default_site, default_line, memo)
values
  ('OO건설', '청주A현장', '2라인', '주요 거래처'),
  ('청주창호', '오창B현장', '1라인', '창호 중심 거래처'),
  ('충북유리', '진천C현장', '3라인', '유리 교체 작업 빈도 높음')
on conflict (name) do nothing;

insert into public.items (item_code, item_name, process, width, height, default_quantity, memo)
values
  ('DG-001', '복층유리', '복층', 1200, 1800, 10, '기본 복층유리'),
  ('DG-002', '강화유리', '강화', 900, 1200, 12, '기본 강화유리'),
  ('DG-003', '로이복층유리', '복층', 1000, 2000, 8, '로이유리 포함')
on conflict do nothing;

insert into public.orders (
  pid,
  process,
  item_code,
  item_name,
  width,
  height,
  quantity,
  area_pyeong,
  request_no,
  no,
  customer,
  site,
  line,
  registrant,
  status,
  memo,
  is_favorite_source
)
values
  ('P-001', '복층', 'DG-001', '복층유리', 1200, 1800, 30, 19.6, 'REQ-001', '1', 'OO건설', '청주A현장', '2라인', '김대리', '등록', '긴급 요청', false),
  ('P-002', '강화', 'DG-002', '강화유리', 900, 1200, 20, 5.88, 'REQ-002', '2', '청주창호', '오창B현장', '1라인', '이주임', '진행', '샘플 시공', false),
  ('P-003', '복층', 'DG-003', '로이복층유리', 1000, 2000, 15, 9.08, 'REQ-003', '3', '충북유리', '진천C현장', '3라인', '박사원', '확인필요', '세로 규격 재확인 필요', true);

insert into public.favorites (
  name,
  process,
  item_code,
  item_name,
  width,
  height,
  quantity,
  customer,
  site,
  line,
  memo
)
values
  ('OO건설 청주A 기본', '복층', 'DG-001', '복층유리', 1200, 1800, 30, 'OO건설', '청주A현장', '2라인', '자주 쓰는 기본 조합'),
  ('청주창호 강화 기본', '강화', 'DG-002', '강화유리', 900, 1200, 20, '청주창호', '오창B현장', '1라인', '반복 등록용');
