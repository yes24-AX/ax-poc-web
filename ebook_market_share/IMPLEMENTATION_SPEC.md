# eBook 3사 경쟁 비교 리포트 — 구현 명세서

> **이 문서의 사용법**
> 코딩 에이전트에게 이 파일 전체를 컨텍스트로 전달한다. 작업 단위는 [11. 작업 분해](#11-작업-분해)의 `T-xx`이며,
> 각 작업은 독립적으로 착수 가능하도록 선행 조건을 명시했다.
> **레퍼런스 구현이 이미 존재한다** — `ax-poc-web/ebook_market_share/` 의 프로토타입은 모든 지표 계산과 화면 구성이
> 동작하는 상태다. 계산 로직에 이견이 생기면 프로토타입 코드가 정답이다.
>
> | 항목 | 값 |
> |---|---|
> | 문서 버전 | v1.0 (2026-08-29) |
> | 상위 문서 | PRD — eBook 3사 경쟁 비교 리포트 |
> | 레퍼런스 구현 | `ax-poc-web/ebook_market_share/` |
> | 대상 시스템 | `ax-labs-platform` (ASP.NET Core MVC + Razor + vanilla JS) |

---

## 0. 전제와 확인 필요 사항

구현 착수 전 **반드시 확정**되어야 하는 항목. 미확정 상태에서 진행하면 재작업이 발생한다.

| ID | 항목 | 영향 범위 | 미확정 시 대응 |
|---|---|---|---|
| Q-03 | 분야 합계와 「전체」 값 불일치 시 **정본 기준** | 집계 로직 전체 | 본 명세는 **분야합 기준**으로 작성됨. 전체행 기준으로 결정되면 §4 집계 로직 수정 |
| Q-05 | 3사 분야 분류 매핑 기준 (특히 「기타」 정의) | 코드 마스터, 매핑 테이블 | 본 명세의 매핑표(§3.2)는 프로토타입 기준 |
| Q-01 | 2023년 「기타」 분야 부재 | 데이터 이관 | `전체 − 분야합` 잔여값으로 적재, `src_type = 'DERIVED'` 표기 |
| Q-02 | 2023.01~10 수험서 교보·알라딘 미제공 | 데이터 이관 | `NULL` 적재 (0 아님). 집계 시 결측 처리 |
| Q-04 | 원단위 수신 가능 여부 | 컬럼 타입 | `numeric(18,0)` 백만원 단위로 시작, 원단위 전환 시 마이그레이션 |
| Q-06 | MSTR 연동 주기/시점, 관리분류 매핑 | 배치 설계 | T-09 착수 불가 |

**본 명세의 기본 결정 (Q 확정 전 임시)**
- 매출 단위: **백만원**, 정수
- 시장(market) = 예스24 + 교보문고 + 알라딘 (3사 합산). 그 외 서점 개념 없음
- 집계 기준: **분야 합계** (전체행은 검증용으로만 사용)
- 결측 처리: `NULL`은 0으로 치환하지 않는다. 결측이 포함된 구간은 YoY 계산에서 제외

---

## 1. 산출물 범위

| 구분 | 산출물 |
|---|---|
| DB | 팩트 테이블 1개, 코드 마스터 2개, 분류 매핑 1개 |
| API | 조회 3종, 입력 4종 (§5) |
| 화면 | 리포트 1개(탭 5개), 입력 1개 |
| 배치 | 예스24 MSTR 월 적재 1종 |
| 이관 | 2023.01~ 과거 데이터 초기 적재 스크립트 |

---

## 2. 데이터 모델

### 2.1 DDL (PostgreSQL 기준)

> 테이블·전 컬럼 코멘트 필수. 다른 DBMS면 해당 문법의 인라인 COMMENT로 변환할 것.

```sql
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
```

### 2.2 코드 마스터 시드

```sql
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
```

> 매칭 시 공백 제거 후 대소문자 무시 비교한다. 미매칭 분류명은 저장하지 않고 화면에 "미매칭" 목록으로 알린다.

---

## 3. 도메인 규칙

### 3.1 불변 규칙

1. **분야 표시 순서는 `ebook_category.sort_no` 고정.** 매출 크기순 재정렬 금지 (③탭 Gap 정렬은 예외 — 명시적 정렬 기능).
2. **리포트는 `confirm_yn = 'Y' AND latest_yn = 'Y'` 만 조회한다.** 임시저장분은 절대 반영하지 않는다.
3. **정정은 UPDATE가 아니라 INSERT.** 기존 행 `latest_yn = 'N'`, 새 행 `ver_no + 1`, `latest_yn = 'Y'`.
4. **NULL ≠ 0.** 미제공 값을 0으로 저장하면 시장 규모가 과소 집계된다.
5. **예스24 행은 화면에서 수정 불가.** `src_type = 'MSTR'`인 서점은 입력 API에서 거부(403).

### 3.2 결측 처리

| 상황 | 처리 |
|---|---|
| 특정 서점의 특정 월 전체 미입력 | 해당 월을 **집계 구간에서 제외**하고 화면에 경고 표시 |
| 특정 분야만 `NULL` | 해당 분야의 시장 규모·점유율은 `null` 반환 (0 아님). 전체 합계에서도 제외 |
| 전년 동기 데이터 없음 | YoY·점유율 증감 `null`. 화면은 `-` 표기 |
| 전년 동기 **구간 길이 불일치** | YoY 전체를 계산하지 않음 (§4.3 `comparable` 판정) |

---

## 4. 집계 로직

> 레퍼런스: `ebook_market_share/assets/js/app.js`

### 4.1 기간 → 버킷 분해

```
입력: fromYm, toYm, unit ∈ {M, Q, H, Y}
1. months = [fromYm..toYm] 중 데이터가 존재하는 월
2. 각 월의 bucketId 계산
   M → 'YY.MM'        (예: 26.07)
   Q → 'YYYY nQ'      (n = ceil(월/3))
   H → 'YYYY H1|H2'   (월 ≤ 6 → H1)
   Y → 'YYYY년'
3. bucketId 등장 순서대로 그룹핑 → buckets[]
4. 각 버킷의 실제 월 수 < 단위 기준 월 수(M=1,Q=3,H=6,Y=12)면 '미완결 구간' 플래그
```

**미완결 구간은 제외하지 않고 표시하되 플래그를 응답에 포함**한다. 화면에서 문구로 안내한다.

### 4.2 지표 계산

```
market(x)          = yes(x) + kyobo(x) + aladin(x)
yoy(cur, prev)     = prev ? (cur - prev) / prev : null      -- prev가 0이면 null
share(v, market)   = market ? v / market : null
shareDelta         = share(cur) - share(prev)               -- 둘 중 하나라도 null이면 null (%p)
growthGap          = yoyYes - yoyMarket                     -- 핵심 지표 (%p)
contribAmt(cat)    = cat.cur - cat.prev
contribRate(cat)   = contribAmt(cat) / totalContribAmt      -- 예스24 기준 / 시장 기준 각각
captureRate(cat)   = yesContribAmt(cat) / marketContribAmt(cat)   -- 시장 증감 > 0일 때만
gapVs(store)       = yes - store                            -- 격차 차트, 0선 하향 통과 = 역전
```

**널 전파 규칙**: 뺄셈 결과는 두 피연산자가 모두 유효할 때만 계산한다. `a - null = null`.
JS에서 `x - null === x`가 되는 함정이 실제로 있었으므로 전용 함수로 감쌀 것.

### 4.3 전년 동기 비교 가능 판정

```
prevMonths  = months.map(m => m - 12개월)
existing    = prevMonths 중 데이터 존재분
comparable  = existing.length > 0 AND existing.length == months.length
```

`comparable = false`면:
- 모든 YoY / 점유율 증감 / 성장 Gap = `null`
- ④탭(기여도)은 **화면 자체를 비활성**하고 "시작월을 2024.01 이후로 조정" 안내
- ①탭 상단에 사유 배너

### 4.4 「진단」 자동 판정 (④탭)

| 조건 | 판정 |
|---|---|
| 시장 증감 > 0 AND 당사 증감 ≤ 0 | `시장 성장분 미확보` (경고) |
| 시장 증감 > 0 AND 당사 증감 > 0 | `시장 성장 흡수 {captureRate}%` |
| 시장 증감 < 0 AND 당사 증감 ≥ 0 | `역성장 시장서 성장` |
| 그 외 | `동반 감소` |

### 4.5 역전 시점 탐지 (②탭)

```
gap = buckets.map(b => yes(b) - store(b))
for i in 1..n-1:
    if sign(gap[i-1]) != sign(gap[i]):
        gap[i] < 0 → '{store} {label} 역전당함'
        gap[i] ≥ 0 → '{store} {label} 재역전'
```
탐지 결과는 차트 하단 가이드 문구에 문장으로 노출한다.

---

## 5. API 명세

기준 경로 `/api/ebook/market`. 응답은 모두 `application/json; charset=utf-8`.

### 5.1 GET `/summary` — 리포트 조회 (①③④탭 + KPI)

**Query**: `fromYm` `toYm` (필수, YYYYMM) / `unit` (M|Q|H|Y, 기본 M)

```jsonc
{
  "range": {
    "fromYm": "202508", "toYm": "202607", "monthCount": 12,
    "unit": "M", "bucketCount": 12,
    "prevFromYm": "202408", "prevToYm": "202507",
    "comparable": true,
    "partialBucket": null,              // 예: { "id": "2026 3Q", "have": 1, "need": 3 }
    "missingMonths": []                 // 미입력으로 제외된 월
  },
  "kpi": {
    "marketYoy": -0.0995,
    "yesShare": 0.2683, "yesSharePrev": 0.2996, "yesShareDelta": -0.0313,
    "yesYoy": -0.1937, "growthGap": -0.0942
  },
  "total": {
    "cur":  { "yes": 19082, "kyobo": 30206, "aladin": 21815, "market": 71103 },
    "prev": { "yes": 23670, "kyobo": 29332, "aladin": 26033, "market": 79035 }
  },
  "categories": [
    {
      "categoryCd": "LITERATURE", "categoryNm": "문학", "sortNo": 1,
      "cur":  { "yes": 2673, "kyobo": 4397, "aladin": 2628, "market": 9698 },
      "prev": { "yes": 3995, "kyobo": 4441, "aladin": 3114, "market": 11550 },
      "yoy":  { "yes": -0.331, "kyobo": -0.010, "aladin": -0.156, "market": -0.160 },
      "share": 0.2756, "sharePrev": 0.3459, "shareDelta": -0.0703,
      "growthGap": -0.171,
      "contribution": { "yesAmt": -1322, "yesRate": 0.288, "marketAmt": -1852, "marketRate": 0.233, "captureRate": null },
      "hasNull": false
    }
  ]
}
```

- 배열 순서는 `sortNo` 오름차순 고정. 정렬은 클라이언트가 수행.
- 모든 비율은 **소수**(0.2756 = 27.56%). 화면에서 ×100 후 포맷.
- 반올림하지 않고 원값을 내려보낸다.

### 5.2 GET `/trend` — 기간별 추이 (②탭)

**Query**: `fromYm` `toYm` `unit`

```jsonc
{
  "range": { "...": "5.1과 동일 구조" },
  "buckets": [
    {
      "id": "26.07", "months": ["202607"], "partial": false,
      "cur":  { "yes": 1439, "kyobo": 2463, "aladin": 1590, "market": 5492 },
      "prev": { "yes": 1575, "kyobo": 2459, "aladin": 1800, "market": 5834 },
      "yoy":  { "yes": -0.086, "kyobo": 0.002, "aladin": -0.117, "market": -0.059 },
      "yesShare": 0.2620,
      "gap": { "kyobo": -1024, "aladin": -151 }
    }
  ],
  "crossings": [
    { "storeCd": "KYOBO", "bucketId": "24.01", "type": "OVERTAKEN" }
  ]
}
```

### 5.3 GET `/category/{categoryCd}` — 분야별 상세 (⑤탭)

**Query**: `fromYm` `toYm` `unit` → 5.2와 동일 구조이되 해당 분야 값만. 요약 카드용 `summary` 블록 추가.

### 5.4 GET `/input?baseYm=&storeCd=` — 입력 화면 초기 데이터

```jsonc
{
  "baseYm": "202608", "storeCd": "KYOBO", "storeNm": "교보문고",
  "editable": true,                       // src_type = MSTR 이면 false
  "status": "EMPTY",                      // EMPTY | DRAFT | CONFIRMED
  "verNo": 0,
  "rows": [
    { "categoryCd": "LITERATURE", "categoryNm": "문학", "sortNo": 1,
      "amt": null, "prevAmt": 385, "yearAgoAmt": 380 }
  ],
  "totalAmt": null,
  "history": [
    { "verNo": 1, "status": "CONFIRMED", "regId": "yes24ax", "regDt": "2026-08-05T10:22:00" }
  ]
}
```

### 5.5 POST `/input/validate` — 검증만 수행 (저장 없음)

**Body**: `{ baseYm, storeCd, rows: [{ categoryCd, amt }], totalAmt }`

```jsonc
{
  "ok": false,                            // ERROR가 하나라도 있으면 false
  "items": [
    { "level": "ERROR",   "code": "VR-01", "categoryCd": null,   "message": "미입력 분야 2개: 로맨스, BL" },
    { "level": "WARNING", "code": "VR-03", "categoryCd": "COMIC", "message": "전월 대비 +82.1% (전월 258)" }
  ]
}
```

### 5.6 POST `/input/save` — 임시저장 / 5.7 POST `/input/confirm` — 확정

- `save`: `confirm_yn = 'N'`으로 저장. 검증 실패해도 저장 허용.
- `confirm`: 서버에서 **검증을 재수행**하고 `ERROR`가 있으면 `422` 반환. 통과 시 기존 최신행 `latest_yn='N'` → 새 버전 INSERT (`ver_no+1`, `confirm_yn='Y'`, `latest_yn='Y'`).
- 두 API 모두 `src_type='MSTR'` 서점이면 `403`.

### 5.7 검증 규칙 (서버·클라이언트 공통)

| 코드 | 등급 | 조건 | 확정 차단 |
|---|---|---|---|
| VR-01 | ERROR | 미입력 분야 존재 | O |
| VR-02 | ERROR | 숫자 아님 또는 음수 | O |
| VR-03 | WARNING | 전월 대비 절대값 > 50% | X |
| VR-04 | WARNING | 전년동월 대비 절대값 > 60% | X |
| VR-05 | WARNING | \|분야합 − totalAmt\| / totalAmt > 1% | X |

> **클라이언트 검증은 UX용이며 신뢰 대상이 아니다.** 확정 시 서버에서 반드시 재검증한다.

---

## 6. 화면 명세

### 6.1 공통 — 조회 조건 바

| 요소 | 동작 |
|---|---|
| 시작월 / 종료월 | 데이터 존재 구간만 선택 가능. 시작 > 종료면 시작을 종료로 보정 |
| 집계단위 | 월 / 분기 / 반기 / 연도. 변경 시 ②⑤탭만 재구성, ①③④는 구간 합계 유지 |
| 빠른 선택 | 최근 12개월 / 24개월 / 전체 |
| 조회 요약 | `조회 2025.08 ~ 2026.07 (12개월, 월 단위 12구간) · 전년 동기 비교 2024.08 ~ 2025.07` |

**기본값**: 최근 12개월, 월 단위.

### 6.2 KPI 3종 (탭 무관 상단 고정)

| 순서 | 지표 | 표시 |
|---|---|---|
| ① | 3사 시장 성장률 | YoY %, 시장 규모와 전년 규모 |
| ② | 예스24 점유율 | 점유율 % + 전년비 %p, 전년 점유율과 당사 매출 |
| ③ | 시장 대비 성장 Gap | %p + 판정 문구 (초과 성장 / 선방 / 성장분 미확보 / 더 큰 하락) |

판정 문구 로직:
```
gap >= 0 : marketYoy < 0 ? '시장 역성장 대비 선방' : '시장 대비 초과 성장'
gap <  0 : marketYoy < 0 ? '시장보다 더 큰 하락'   : '시장 성장분 미확보'
```

### 6.3 탭 구성

| 탭 | 구성 요소 |
|---|---|
| ① 3사 전체 시장 현황 | 서점 요약 카드 3 · 분야별 매출/YoY 표(9행+전체) · **분야별 점유율 100% 누적 막대**(9분야+전체, 마우스오버 툴팁) |
| ② 기간별 추이 | 3사 매출 추이 · **예스24 대비 경쟁사 격차** · 서점별 YoY · 점유율 추이 · 시장 vs 예스24 성장률 |
| ③ 분야별 경쟁력 비교 | Gap 내림차순 표(색 농도 heat) · 시장YoY × 예스24YoY 매트릭스(원 크기 = 시장 규모) |
| ④ 분야별 증감 기여도 | 기여도 표 + 진단 배지 · 증감액 막대(예스24 vs 시장) · 미확보 분야 경고 배너 |
| ⑤ 분야별 상세 | 분야 칩 9종 · 요약 카드 4 · 매출/YoY/점유율/점유율증감 4개 차트 |

### 6.4 차트 요구사항

- 서점 색상은 CSS 변수 `--c-yes` `--c-kyobo` `--c-aladin` 로만 참조. 인라인 색상 금지.
- 2단 배치 차트는 SVG가 축소 렌더링되므로 **축 라벨 확대 + 화면 폭 구간별 보정** 필요.
- X축 라벨은 개수에 따라 샘플링하고, **직전 라벨과 최소 간격 미달 시 생략**(마지막 라벨 포함).
- 모든 차트에 마우스오버 툴팁 — 커서 위 표시, 상단 공간 부족 시 아래로 반전, 화살표가 커서를 가리킴. 커서는 `zoom-in`.
- 다크모드에서 축·격자·텍스트가 테마 토큰을 따라야 한다.

### 6.5 「읽는 법」 가이드

모든 차트·표 하단에 해석 가이드 문구를 고정 노출한다. 프로토타입의 문구를 그대로 이관한다 (총 16개 영역).

---

## 7. 데이터 이관

**원천**: `경쟁사 비교.xlsx` (연도별 블록, 월당 10열 stride, 2023~2026)

| 단계 | 내용 |
|---|---|
| 1 | 연도 블록 4개 파싱 → 월 43개 × 서점 3 × 분야 9 |
| 2 | 원천 분류명 → `category_cd` 매핑 (§2.2) |
| 3 | 2023년 「기타」: `전체 − 분야합` 산출 후 `src_type='DERIVED'`, `remark='2023년 기타 분야 잔여값 산출'` |
| 4 | 2023.01~10 수험서 교보·알라딘: `NULL` 적재, `remark='원천 미제공'` |
| 5 | 전체 제공값을 `ebook_market_total`에 별도 적재 |
| 6 | 전 행 `confirm_yn='Y'`, `latest_yn='Y'`, `ver_no=1`, `reg_id='MIGRATION'` |

**검증 쿼리** (이관 후 필수 실행)
```sql
-- 월×서점별 행 수가 9인지
SELECT base_ym, store_cd, count(*) AS cnt
  FROM ebook_market_sales WHERE latest_yn = 'Y'
 GROUP BY base_ym, store_cd HAVING count(*) <> 9;

-- 분야합과 전체 제공값 차이가 1% 초과인 건
SELECT s.base_ym, s.store_cd, sum(s.sales_amt) AS cat_sum, t.total_amt,
       sum(s.sales_amt) - t.total_amt AS diff
  FROM ebook_market_sales s
  JOIN ebook_market_total t ON t.base_ym = s.base_ym AND t.store_cd = s.store_cd
 WHERE s.latest_yn = 'Y'
 GROUP BY s.base_ym, s.store_cd, t.total_amt
HAVING abs(sum(s.sales_amt) - t.total_amt) > t.total_amt * 0.01
 ORDER BY s.base_ym;
```

> 2번째 쿼리는 **2026.01 교보에서 164 차이가 검출되는 것이 정상**이다(Q-03 미해결 상태의 알려진 값). 이 건이 나오지 않으면 파싱이 잘못된 것이다.

---

## 8. MSTR 연동 배치

| 항목 | 내용 |
|---|---|
| 주기 | 월 1회 (전월 마감 후, 시점은 Q-06 확정 필요) |
| 대상 | 예스24 관리분류 기준 월별·분야별 매출 |
| 처리 | 공통 분야코드 매핑 → `src_type='MSTR'`, `confirm_yn='Y'`, `ver_no+1` INSERT |
| 실패 | 적재 0건 또는 분야 9개 미만이면 실패 처리, 기존 데이터 유지, 담당자 알림 |
| 재실행 | 동일 월 재적재 시 새 버전으로 INSERT (멱등하지 않음 — 이전 버전 보존이 목적) |

---

## 9. 비기능 요구사항

| ID | 항목 | 기준 |
|---|---|---|
| NFR-01 | 성능 | 전체 기간(43개월 × 27행 = 1,161행) 조회 시 단일 쿼리 + 애플리케이션 집계. 사전집계 테이블 불필요 |
| NFR-02 | 레이아웃 | 컨텐츠 영역은 화면 폭 전체 사용(`max-width` 해제). 차트 SVG는 상한 폭 980px |
| NFR-03 | 테마 | 라이트/다크 모두 지원. 브랜드 색상은 테마 무관 고정 |
| NFR-04 | 디자인 | `ax-labs-platform` 디자인 시스템(사이드바+헤더 셸, card/btn/badge) 사용. 신규 색상 하드코딩 금지 |
| NFR-05 | 접근성 | 키보드 포커스 표시, `prefers-reduced-motion` 존중 |
| NFR-06 | 권한 | 조회는 eBook사업팀 전체, 입력·확정은 지정 담당자만 |

---

## 10. 테스트 케이스

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| TC-01 | 2026.07 당월 조회 | 시장 YoY −5.9%, 예스24 점유율 26.2%(−0.8%p), Gap −2.8%p |
| TC-02 | 2025.08~2026.07 12개월 | 시장 YoY −10.0%, 점유율 26.8%(−3.1%p), Gap −9.3%p |
| TC-03 | 2024.01~2026.07 + 분기 | 11개 분기 버킷, 마지막 `2026 3Q`가 1/3개월 미완결로 표시 |
| TC-04 | 전체 기간(2023.01~) 조회 | `comparable = false` → 모든 YoY `-`, ④탭 비활성 + 안내 |
| TC-05 | 전체 기간 + 격차 차트 | 역전 탐지: 교보 2024 1Q, 알라딘 2025 2Q |
| TC-06 | 연도 단위 조회 | 2023 점유율 38.7% / 2024 32.9% / 2025 28.1% / 2026 26.9% |
| TC-07 | 미입력 월 입력 화면 | 상태 `EMPTY`, 9개 분야 모두 ERROR, 확정 버튼 차단 |
| TC-08 | 붙여넣기 (분야명+금액 9줄) | 9개 분야 매칭, 상태 `DRAFT` 전환 |
| TC-09 | 붙여넣기 (숫자만 9줄) | `sort_no` 순서대로 반영 |
| TC-10 | 확정된 월 재확정 | `ver_no` +1, 이전 버전 `latest_yn='N'`, 이력 2건 |
| TC-11 | 예스24 선택 | 입력 비활성, 저장·확정 API 호출 시 403 |
| TC-12 | 특정 분야 NULL 포함 월 | 해당 분야 시장 규모 `null`, 0으로 집계되지 않음 |
| TC-13 | 다크모드 전환 | 차트 축·격자·텍스트 색 전환, 브랜드 색 3종은 유지 |

---

## 11. 작업 분해

| ID | 작업 | 선행 | 산출물 |
|---|---|---|---|
| T-01 | DDL + 코드 마스터 시드 적용 | Q-03, Q-05 | §2 스크립트 실행, 데이터 사전 반영 확인 |
| T-02 | 엑셀 → DB 이관 스크립트 | T-01, Q-01, Q-02 | 43개월 적재 + §7 검증 쿼리 통과 |
| T-03 | 집계 서비스 (버킷 분해 + 지표 계산) | T-01 | §4 로직. **단위 테스트 필수** — TC-01/02/06 |
| T-04 | 조회 API 3종 | T-03 | §5.1~5.3 |
| T-05 | 입력 API 4종 + 서버 검증 | T-01 | §5.4~5.7, 버전 관리 동작(TC-10) |
| T-06 | 차트 컴포넌트 (선/막대/100%누적 + 툴팁) | — | §6.4. 프로토타입 `app.js` 이식 |
| T-07 | 리포트 화면 5개 탭 | T-04, T-06 | §6.3 |
| T-08 | 입력 화면 | T-05 | §6, 붙여넣기 매칭 포함 |
| T-09 | MSTR 월배치 | T-01, Q-06 | §8 |
| T-10 | 통합 테스트 | T-07, T-08 | §10 전 항목 |

**권장 순서**: T-01 → T-02 → T-03(테스트 먼저) → T-04/T-05 병렬 → T-06 → T-07/T-08 병렬 → T-09 → T-10

---

## 12. 구현 시 주의점

프로토타입 개발 중 실제로 발생한 문제들이다. 같은 실수를 반복하지 않도록 명시한다.

1. **`값 − null`이 `값`이 되는 함정** — 전년 데이터가 없을 때 점유율 증감이 `+38.9%p`로 표시됐다. 뺄셈은 반드시 널 검사 함수를 거칠 것.
2. **구간 길이가 다른 YoY** — 전체 기간(43개월) 조회 시 전년 비교 구간은 31개월만 존재해 시장이 폭락한 것처럼 보였다. `comparable` 판정을 반드시 넣을 것.
3. **미완결 구간** — 분기·연도 단위에서 마지막 구간이 1개월만 차 있으면 급감으로 오독된다. 플래그와 문구 필수.
4. **SVG 텍스트 크기** — `viewBox` 스케일 때문에 2단 배치 차트의 글씨가 실제로는 6px로 보였다. 컨테이너 폭 대비 보정 필요.
5. **툴팁 위치** — 커서 위에 띄우되 상단 공간이 없으면 반전. 고정 위치로 두면 마우스를 따라오지 않아 부자연스럽다.
6. **X축 라벨 마지막 항목** — "마지막은 무조건 표시"로 두면 직전 라벨과 겹친다. 최소 간격 검사 필요.
7. **2023년 데이터의 특수성** — 「기타」 부재, 수험서 일부 결측. 이 구간이 포함된 조회에는 반드시 경고를 노출할 것.
