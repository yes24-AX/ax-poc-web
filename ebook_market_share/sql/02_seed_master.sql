-- eBook 3사 경쟁 비교 리포트 — 코드 마스터 시드
-- 실행 순서 2 / 선행: 01_schema.sql

INSERT INTO ebook_store (store_cd, store_nm, brand_color, src_type, sort_no) VALUES
  ('YES24',  '예스24',   '#0080FF',            'MSTR',   1),
  ('KYOBO',  '교보문고', 'rgb(77, 172, 39)',   'MANUAL', 2),
  ('ALADIN', '알라딘',   '#FB2888',            'MANUAL', 3);

INSERT INTO ebook_category (category_cd, category_nm, sort_no) VALUES
  ('LITERATURE',  '문학',        1),
  ('HUMANITIES',  '인문',        2),
  ('ECONOMY',     '경제',        3),
  ('EXAM',        '수험서',      4),
  ('COMIC',       '만화·라노벨', 5),
  ('ROMANCE',     '로맨스',      6),
  ('BL',          'BL',          7),
  ('FANTASY',     '판타지/무협', 8),
  ('ETC',         '기타',        9);

-- 원천 분류명 매핑 (COMMON = 서점 무관 별칭)
INSERT INTO ebook_category_map (store_cd, src_category_nm, category_cd) VALUES
  ('COMMON', '문학',          'LITERATURE'),
  ('COMMON', '소설',          'LITERATURE'),
  ('COMMON', '소설/시',       'LITERATURE'),
  ('COMMON', '인문',          'HUMANITIES'),
  ('COMMON', '인문학',        'HUMANITIES'),
  ('COMMON', '경제',          'ECONOMY'),
  ('COMMON', '경제경영',      'ECONOMY'),
  ('COMMON', '경제/경영',     'ECONOMY'),
  ('COMMON', '자기계발',      'ECONOMY'),
  ('COMMON', '수험서',        'EXAM'),
  ('COMMON', '수험서/자격증', 'EXAM'),
  ('COMMON', '자격증',        'EXAM'),
  ('COMMON', '만화·라노벨',   'COMIC'),
  ('COMMON', '만화/라노벨',   'COMIC'),
  ('COMMON', '만화',          'COMIC'),
  ('COMMON', '라노벨',        'COMIC'),
  ('COMMON', '로맨스',        'ROMANCE'),
  ('COMMON', 'BL',            'BL'),
  ('COMMON', '판타지/무협',   'FANTASY'),
  ('COMMON', '판타지',        'FANTASY'),
  ('COMMON', '무협',          'FANTASY'),
  ('COMMON', '기타',          'ETC');
