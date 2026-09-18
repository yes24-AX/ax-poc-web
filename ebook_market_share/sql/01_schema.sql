-- eBook 3사 경쟁 비교 리포트 — 스키마 생성
-- 실행 순서 1 / 대상: 운영 DB

-- ============================================================
-- 1) 서점 코드 마스터
-- ============================================================
CREATE TABLE ebook_store (
    store_cd      varchar(10)  NOT NULL,
    store_nm      varchar(50)  NOT NULL,
    brand_color   varchar(20)  NOT NULL,
    src_type      varchar(10)  NOT NULL,
    sort_no       smallint     NOT NULL,
    use_yn        char(1)      NOT NULL DEFAULT 'Y',
    CONSTRAINT pk_ebook_store PRIMARY KEY (store_cd)
);

COMMENT ON TABLE  ebook_store             IS 'eBook 경쟁 비교 대상 서점 마스터 (예스24 및 경쟁 2사)';
COMMENT ON COLUMN ebook_store.store_cd    IS '서점코드 (YES24/KYOBO/ALADIN)';
COMMENT ON COLUMN ebook_store.store_nm    IS '서점명 (화면 표시용)';
COMMENT ON COLUMN ebook_store.brand_color IS '화면 차트에 사용하는 브랜드 색상값 (CSS 색상 표기)';
COMMENT ON COLUMN ebook_store.src_type    IS '데이터 수집 방식 (MSTR: 자동연동, MANUAL: 수기입력)';
COMMENT ON COLUMN ebook_store.sort_no     IS '화면 표시 순서 (오름차순)';
COMMENT ON COLUMN ebook_store.use_yn      IS '사용 여부 (Y: 사용, N: 미사용)';


-- ============================================================
-- 2) 공통 분야 코드 마스터
-- ============================================================
CREATE TABLE ebook_category (
    category_cd   varchar(20)  NOT NULL,
    category_nm   varchar(50)  NOT NULL,
    sort_no       smallint     NOT NULL,
    use_yn        char(1)      NOT NULL DEFAULT 'Y',
    CONSTRAINT pk_ebook_category PRIMARY KEY (category_cd)
);

COMMENT ON TABLE  ebook_category             IS 'eBook 3사 공통 분야 분류 마스터 (9개 고정, 표시 순서 포함)';
COMMENT ON COLUMN ebook_category.category_cd IS '분야코드 (LITERATURE/HUMANITIES/ECONOMY/EXAM/COMIC/ROMANCE/BL/FANTASY/ETC)';
COMMENT ON COLUMN ebook_category.category_nm IS '분야명 (화면 표시용, 예: 문학/인문/경제)';
COMMENT ON COLUMN ebook_category.sort_no     IS '화면 표시 순서 (1~9 고정, 임의 변경 금지)';
COMMENT ON COLUMN ebook_category.use_yn      IS '사용 여부 (Y: 사용, N: 미사용)';


-- ============================================================
-- 3) 서점별 원천 분류 → 공통 분야 매핑
-- ============================================================
CREATE TABLE ebook_category_map (
    store_cd        varchar(20)  NOT NULL,
    src_category_nm varchar(100) NOT NULL,
    category_cd     varchar(20)  NOT NULL,
    reg_dt          timestamp    NOT NULL DEFAULT now(),
    CONSTRAINT pk_ebook_category_map PRIMARY KEY (store_cd, src_category_nm),
    CONSTRAINT fk_ecm_category FOREIGN KEY (category_cd) REFERENCES ebook_category (category_cd)
);

COMMENT ON TABLE  ebook_category_map                 IS '각 서점의 원천 분류명을 3사 공통 분야코드로 매핑 (엑셀 붙여넣기 자동 매칭에 사용)';
COMMENT ON COLUMN ebook_category_map.store_cd        IS '서점코드. COMMON은 서점 무관 공통 별칭';
COMMENT ON COLUMN ebook_category_map.src_category_nm IS '각 사가 전달하는 원천 분류명 (예: 경제경영, 소설/시, 만화/라노벨)';
COMMENT ON COLUMN ebook_category_map.category_cd     IS '매핑되는 공통 분야코드';
COMMENT ON COLUMN ebook_category_map.reg_dt          IS '등록일시';


-- ============================================================
-- 4) 월별 매출 팩트 (핵심 테이블)
-- ============================================================
CREATE TABLE ebook_market_sales (
    base_ym      char(6)      NOT NULL,
    store_cd     varchar(10)  NOT NULL,
    category_cd  varchar(20)  NOT NULL,
    ver_no       smallint     NOT NULL DEFAULT 1,
    sales_amt    numeric(18,0),
    src_type     varchar(10)  NOT NULL,
    confirm_yn   char(1)      NOT NULL DEFAULT 'N',
    latest_yn    char(1)      NOT NULL DEFAULT 'Y',
    remark       varchar(200),
    reg_id       varchar(50)  NOT NULL,
    reg_dt       timestamp    NOT NULL DEFAULT now(),
    CONSTRAINT pk_ebook_market_sales PRIMARY KEY (base_ym, store_cd, category_cd, ver_no),
    CONSTRAINT fk_ems_store    FOREIGN KEY (store_cd)    REFERENCES ebook_store (store_cd),
    CONSTRAINT fk_ems_category FOREIGN KEY (category_cd) REFERENCES ebook_category (category_cd)
);

COMMENT ON TABLE  ebook_market_sales             IS 'eBook 3사 월별·분야별 매출 실적 (경쟁 비교 리포트 원천). 정정 시 버전을 올려 이력 보존';
COMMENT ON COLUMN ebook_market_sales.base_ym     IS '기준연월 (YYYYMM 형식, 예: 202607)';
COMMENT ON COLUMN ebook_market_sales.store_cd    IS '서점코드 (YES24/KYOBO/ALADIN)';
COMMENT ON COLUMN ebook_market_sales.category_cd IS '공통 분야코드 (9개 고정)';
COMMENT ON COLUMN ebook_market_sales.ver_no      IS '입력 버전(회차). 각 사 정정본 수신 시 1씩 증가, 이전 버전 보존';
COMMENT ON COLUMN ebook_market_sales.sales_amt   IS '매출액 (단위: 백만원). NULL은 미제공을 의미하며 0과 구분한다';
COMMENT ON COLUMN ebook_market_sales.src_type    IS '데이터 출처 (MSTR: 자동연동, MANUAL: 수기입력, DERIVED: 전체-분야합 잔여값 산출)';
COMMENT ON COLUMN ebook_market_sales.confirm_yn  IS '확정 여부 (Y: 확정-리포트 반영, N: 임시저장-리포트 미반영)';
COMMENT ON COLUMN ebook_market_sales.latest_yn   IS '최신 버전 여부 (Y: 현재 유효, N: 과거 버전). 조회는 Y만 사용';
COMMENT ON COLUMN ebook_market_sales.remark      IS '비고 (정정 사유, 추정치 근거 등)';
COMMENT ON COLUMN ebook_market_sales.reg_id      IS '입력자 ID';
COMMENT ON COLUMN ebook_market_sales.reg_dt      IS '입력일시';

CREATE INDEX ix_ebook_market_sales_01
    ON ebook_market_sales (base_ym, latest_yn, confirm_yn);
COMMENT ON INDEX ix_ebook_market_sales_01 IS '기간 조회용 인덱스 (확정·최신 버전 필터)';


-- ============================================================
-- 5) 월별 전체 제공값 (분야합 대사용, 선택 입력)
-- ============================================================
CREATE TABLE ebook_market_total (
    base_ym    char(6)      NOT NULL,
    store_cd   varchar(10)  NOT NULL,
    total_amt  numeric(18,0),
    reg_id     varchar(50)  NOT NULL,
    reg_dt     timestamp    NOT NULL DEFAULT now(),
    CONSTRAINT pk_ebook_market_total PRIMARY KEY (base_ym, store_cd)
);

COMMENT ON TABLE  ebook_market_total           IS '각 서점이 분야별 자료와 함께 전달한 월 전체 매출. 분야 합계와의 대사(對査) 검증에만 사용';
COMMENT ON COLUMN ebook_market_total.base_ym   IS '기준연월 (YYYYMM)';
COMMENT ON COLUMN ebook_market_total.store_cd  IS '서점코드';
COMMENT ON COLUMN ebook_market_total.total_amt IS '전달받은 전체 매출액 (단위: 백만원). 분야 합계와 1% 초과 차이 시 경고';
COMMENT ON COLUMN ebook_market_total.reg_id    IS '입력자 ID';
COMMENT ON COLUMN ebook_market_total.reg_dt    IS '입력일시';
