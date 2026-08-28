# eBook 단독 선출간 후보 자동 추천 · MD 검토 프로세스 — 구현 설계서

> 이 문서는 **다른 코딩 에이전트가 datahub에 실제 구현할 때 참조하는 명세**입니다.
> UI 확정용 프로토타입(`ax-poc-web/ebook_solo_pub/`)의 화면·동작을 기준으로 작성했으며,
> 프로토타입은 샘플 데이터로 동작하는 정적 페이지입니다. 실제 구현은 배치 + DB + 웹 + 메일로 구성됩니다.

---

## 1. 목적과 범위

### 1.1 배경

현재 eBook MD가 종이책 신간·발주량·판매량·작가 이력을 **개별 화면에서 수동 탐색**해 단독 선출간 후보를 찾고 있습니다. 탐색 시간이 크고 후보 누락 위험이 있습니다.

### 1.2 To-Be

매 영업일 배치가 후보를 자동 추출 → 오전 10시 메일 발송 → MD는 화면에서 **섭외 / 보류 / 제외**만 판단 → 판단 결과와 실제 선출간 성과를 누적해 추천 기준을 고도화합니다.

### 1.3 구현 범위

| 구분 | 포함 | 비고 |
|---|---|---|
| 배치 | 후보 추출, 중복 제거, 지표 스냅샷 적재, 메일 발송 | 영업일 1회 |
| DB | 추천 이력 · 사유 · 지표 스냅샷 · MD 판단 · 선출간 결과 | 8장 참조 |
| 화면 | 오늘의 추천 후보 / 일일 추천 메일 / 추천·검토 이력 / 추천 성과 리포트 / 담당 MD 매핑 | 5개 |
| 연동 | 사내 영업프로그램 발주 데이터, 판매 집계, 상품 마스터, eBook 등록 여부 | 조회 전용 |
| 제외 | eBook 실제 매출 연동(2차), 출판사 컨택 관리(별도 시스템) | — |

---

## 2. 용어

| 용어 | 정의 |
|---|---|
| 후보 | 추출 조건 ①~⑥ 중 하나 이상을 충족한, eBook 미등록 종이책 상품 |
| 추천 | 후보 중 **한 번도 추천된 적 없는** 상품을 이력에 적재하고 메일에 담는 행위 |
| 추천 사유 | 그 상품이 충족한 조건 코드 목록 (복수 가능) |
| 지표 스냅샷 | 추천 시점의 발주량·판매량·순위 등 원본 수치. 사후 분석의 근거 |
| MD 판단 | 섭외(GO) / 보류(HOLD) / 제외(DROP) |
| 선출간 성사 | 섭외 결정 건이 실제 eBook 단독 선출간으로 이어진 것 |

---

## 3. 추출 조건 (6종)

`REASON_CODE` 는 DB·API·화면에서 동일하게 사용합니다.

| 코드 | 표시 | 기준 | 데이터 경로 | 임계값 파라미터 |
|---|---|---|---|---|
| `R1` | ① 초도 발주량 상위 | 초도 발주 수량 ≥ 임계값. **취소 수량 차감하지 않음** | 영업프로그램 > 발주/반출 > 발주현황조회 | `R1_MIN_QTY` (기본 800) |
| `R2` | ② 당일 발주량 급증 | 당일 발주 수량 ≥ 임계값. 초도 여부 무관 | 동일 | `R2_MIN_QTY` (기본 100) |
| `R3` | ③ 최근 7일 판매 TOP 50 | 최근 7일 국내도서 판매량 순위 ≤ N. 신간 여부 무관 | 판매 집계(일별 판매량 7일 누계) | `R3_MAX_RANK` (기본 50) |
| `R4` | ④ 예약판매 | 판매상태 = 예약판매. 최초 예판 + 재고부족 전환분 모두 포함 | 상품 마스터 판매상태 코드 | 없음 |
| `R5` | ⑤ 주목할 신상품 TOP 120 | 닷컴 주목할 신상품(국내도서) 판매량순 ≤ N | 닷컴 > 주목할 신상품 > 국내도서 > 판매량순 | `R5_MAX_RANK` (기본 120) |
| `R6` | ⑥ 베스트셀러·셀럽 작가 | 저자의 이전 종이책 최고 판매량 ≥ 임계값 **OR** 셀럽 저자 목록에 등재 | 저자별 판매 이력 + 셀럽 저자 관리 테이블 | `R6_MIN_PREV_QTY` (기본 30000) |

**공통 전제**
- 대상은 **eBook 미등록 종이책**만. eBook 상품이 이미 존재하면 후보에서 제외합니다.
- 조건은 **OR** 결합입니다. 하나라도 충족하면 후보입니다.
- 한 상품이 여러 조건을 충족하면 **사유를 모두 기록**하고 화면·메일에 모두 표시합니다.

### 3.1 확정 필요 사항 (사업부서 협의)

1. **`R2_MIN_QTY`** — 요청서 본문은 "당일 발주량 100부 이상", 상세 설명은 "200부 이상"으로 기재가 엇갈립니다. **현재 100부로 구현**하되 파라미터화하여 배포 없이 조정 가능하게 합니다.
2. **`R1_MIN_QTY`** — "구체적 상위 기준은 실제 데이터 분포 확인 후 협의"로 명시되어 있습니다. 초기 800부로 두고, 운영 1개월 후 일별 추천 건수 분포를 보고 조정합니다.
3. **`R6` 셀럽 판정** — 자동 판정이 불가능합니다. `EBOOK_CELEB_AUTHOR` 테이블에 MD가 직접 등록하는 관리 목록을 두고, 저자코드로 조인합니다.
4. **판권 필터** — 운영 데이터상 제외 사유 1위가 "제작 불가 (판권 이슈)"로 예상됩니다. 계약 정보 연동이 가능하면 추출 단계에서 사전 제외하는 것을 2차 과제로 검토합니다.

---

## 3.2 추천 우선순위 (사업부서 추가 요구)

여러 조건을 동시에 충족하거나 발주·판매 반응이 큰 상품일수록 위로 올라오게 해, MD가 **가장 먼저 검토·섭외해야 할 상품을 즉시** 확인할 수 있게 합니다.

### 조건 가중치 (사업부서 지정 순서)

| 순위 | 조건 | `RULE_WEIGHT` |
|---|---|---|
| 1 | R1 초도 발주량 상위 | 60 |
| 2 | R2 당일 발주량 급증 | 50 |
| 3 | R3 최근 7일 판매량 상위 | 42 |
| 4 | R5 주목할 신상품 상위 | 32 |
| 5 | R6 베스트셀러·셀럽 작가 | 24 |
| 6 | R4 예약판매 | 14 |

### 점수 산식

```
score = max(weight of matched rules)
      + 0.4 × sum(weight of remaining matched rules)   -- 복수 조건 충족 가산
      + intensityBonus                                  -- 반응 강도 (0~20)

intensityBonus:
  초도 발주  ≥3000 +8 | ≥2000 +6 | ≥1000 +4 | ≥500 +2
  당일 발주  ≥500  +6 | ≥300  +4 | ≥150  +2
  7일 판매   ≥3000 +6 | ≥2000 +4 | ≥1000 +2
```

- 최상위 조건이 기준선을 정하고, 추가 조건은 40%만 가산합니다. 조건 하나짜리 고반응 상품이 조건 여럿짜리 저반응 상품에 무조건 밀리지 않게 하기 위함입니다.
- 등급: `score ≥ 90` 최우선 / `≥ 62` 높음 / 그 외 보통. 화면 배지 색으로 구분합니다.
- 가중치·보너스 구간은 `EBOOK_PRE_RECO_RULE.PRIORITY_WEIGHT` 등으로 파라미터화해 운영 중 조정 가능하게 하세요.
- 점수는 **추천 시점에 계산해 `EBOOK_PRE_RECO.PRIORITY_SCORE`에 저장**합니다. 나중에 산식이 바뀌어도 당시 우선순위를 재현할 수 있어야 합니다.

## 3.3 MD별 1일 추천 상한 (사업부서 추가 요구)

추천이 한꺼번에 쏟아지면 MD가 소화하지 못해 미검토 재고가 쌓입니다. 이를 막기 위한 규칙입니다.

- **MD 1인당 하루 최대 `MD_DAILY_LIMIT`(기본 10)종**까지만 추천·발송합니다.
- 배정은 **담당 MD별로 우선순위 점수 내림차순 TOP 10**.
- 상한을 넘은 상품은 **버리지 않고 다음 영업일 추천 대상으로 이월**합니다. 이월 건은 다음 날 신규 후보와 **함께 우선순위를 재산정**해 경쟁시킵니다.
- 이월 상태에서도 `EBOOK_PRE_RECO` 행은 이미 존재하므로, **중복 추천 방지 규칙과 충돌하지 않습니다.** 이월은 "발송 여부"의 문제이지 "추천 여부"의 문제가 아닙니다.

### 구현

`EBOOK_PRE_RECO`에 아래 컬럼을 추가합니다(8.2 DDL 참조).

```sql
ALTER TABLE EBOOK_PRE_RECO ADD COLUMN PRIORITY_SCORE NUMERIC(6,1);
ALTER TABLE EBOOK_PRE_RECO ADD COLUMN MD_RANK        SMALLINT;
ALTER TABLE EBOOK_PRE_RECO ADD COLUMN CARRY_OVER_YN  CHAR(1) DEFAULT 'N' NOT NULL;

COMMENT ON COLUMN EBOOK_PRE_RECO.PRIORITY_SCORE IS '추천 우선순위 점수. 조건 가중치 + 복수 조건 가산 + 반응 강도 보너스의 합. 클수록 우선';
COMMENT ON COLUMN EBOOK_PRE_RECO.MD_RANK        IS '담당 MD 내 우선순위 순번. 1이 가장 우선이며, 1일 상한 초과 여부의 판정 기준';
COMMENT ON COLUMN EBOOK_PRE_RECO.CARRY_OVER_YN  IS '다음 영업일 이월 여부. Y=1일 상한을 넘어 오늘 발송하지 않고 대기, N=오늘 발송 대상';
```

메일 발송 배치의 대상 조건은 `MAIL_SENT_YN = 'N' AND CARRY_OVER_YN = 'N'` 입니다.
매일 추출 배치는 **미발송 이월 건까지 포함**해 MD별 순위를 다시 매기고 `MD_RANK` / `CARRY_OVER_YN`을 갱신합니다.

```sql
-- 이월 건 + 신규 건을 합쳐 MD별 순위 재산정
WITH pool AS (
  SELECT RECO_ID, MD_ID, PRIORITY_SCORE,
         ROW_NUMBER() OVER (PARTITION BY MD_ID ORDER BY PRIORITY_SCORE DESC, RECO_ID) AS rn
    FROM EBOOK_PRE_RECO
   WHERE MAIL_SENT_YN = 'N'
)
UPDATE EBOOK_PRE_RECO e
   SET MD_RANK = p.rn,
       CARRY_OVER_YN = CASE WHEN p.rn > :MD_DAILY_LIMIT THEN 'Y' ELSE 'N' END
  FROM pool p
 WHERE p.RECO_ID = e.RECO_ID;
```

> 이월이 계속 쌓이면 특정 MD의 대기열이 길어집니다. 대기 건수가 임계치를 넘으면 팀장에게 알리거나 상한을 일시 상향하는 운영 규칙을 함께 두는 것을 권장합니다.

---

## 4. 중복 추천 방지 (핵심 규칙)

> **상품번호 기준, 상품당 추천은 평생 1회.**

- `EBOOK_PRE_RECO` 테이블에 `GOODS_NO` **UNIQUE 제약**을 겁니다. 이것이 중복 방지의 최종 방어선입니다.
- 배치는 후보 추출 후 기존 이력과 `LEFT JOIN`하여 **미존재 건만** INSERT합니다.
- 최초 추천 이후 다른 조건을 새로 충족해도 **재추천·재발송하지 않습니다.**
- 예: 같은 상품이 ① + ③ + ⑤를 동시 충족 → 1회만 노출, 사유는 3개 모두 표시.

**보류 건 재노출** (프로토타입 기본값, 확정 필요)
- `DROP` 판단 건은 영구 제외합니다.
- `HOLD` 판단 건은 판단일로부터 `HOLD_REEXPOSE_DAYS`(기본 30일) 경과 후 **검토 화면에만** 다시 띄웁니다. **메일은 재발송하지 않습니다.**
- 재노출 시 신규 추천 행을 만들지 않습니다. 기존 행을 다시 목록에 포함시킬 뿐입니다.

---

## 5. 시스템 구성

```
[사내 소스]                    [datahub]                        [사용자]
영업프로그램 발주현황  ─┐
판매 집계(일/7일)      ─┤                                    ┌─ eBook팀 메일 그룹
상품 마스터(판매상태)  ─┼─→ ① 일일 추출 배치 ─→ DB 적재 ─→ ─┤
닷컴 주목할 신상품     ─┤        (05:00)                     └─ 검토 화면 (MD)
저자별 판매 이력       ─┘                │                          │
eBook 등록 여부        ─┘                └─→ ② 메일 발송 배치       │
                                              (영업일 10:00)  ←─────┘
                                                                 판단 입력
```

| 컴포넌트 | 실행 시각 | 설명 |
|---|---|---|
| 추출 배치 | 매일 05:00 | 조건 평가 → 중복 제거 → 추천/사유/지표 INSERT |
| 메일 발송 배치 | **영업일** 10:00 | 미발송 추천 건 취합 → HTML 메일 발송 → 발송 로그 |
| 리마인드 배치 | 영업일 10:30 | 추천 후 `REMIND_DAYS`(3영업일) 경과 미검토 건 → 담당 MD 개별 발송 |
| 웹 | 상시 | 검토·이력·리포트 화면 + 엑셀 다운로드 |

**영업일 처리** — 주말·공휴일에 추출된 건은 이력에 쌓이되 메일은 나가지 않습니다. 다음 영업일 10시에 **합산 발송**합니다. 공휴일 판단은 사내 영업일 캘린더 테이블을 사용합니다.

---

## 6. 배치 설계

### 6.1 추출 배치 의사코드

```
BEGIN
  batch_id := INSERT INTO EBOOK_PRE_RECO_BATCH (배치 시작 로그)

  -- 1) 조건별 후보 수집 (조건마다 별도 쿼리, 결과를 UNION)
  candidates := []
  FOR rule IN (SELECT * FROM EBOOK_PRE_RECO_RULE WHERE USE_YN = 'Y')
      candidates += evaluate(rule)   -- 6.2 참조. (goods_no, reason_code, metric_value)

  -- 2) eBook 미등록 필터
  candidates := candidates WHERE NOT EXISTS (해당 종이책의 eBook 상품)

  -- 3) 중복 제거 (상품당 1행, 사유는 배열로 병합)
  grouped := GROUP BY goods_no  →  reasons[]

  -- 4) 기추천 제외
  new_items := grouped WHERE goods_no NOT IN (SELECT GOODS_NO FROM EBOOK_PRE_RECO)

  -- 5) 적재 (한 트랜잭션)
  FOR item IN new_items
      reco_id := INSERT INTO EBOOK_PRE_RECO       (상품 스냅샷 + 담당 MD)
                 INSERT INTO EBOOK_PRE_RECO_REASON (사유 N행 + 조건별 지표값)
                 INSERT INTO EBOOK_PRE_RECO_METRIC (추천 시점 공통 지표 1행)

  UPDATE EBOOK_PRE_RECO_BATCH (건수, 종료 시각, 상태)
COMMIT
```

**중요** — 지표 스냅샷은 **추천 시점에 반드시 함께 저장**합니다. 나중에 소스에서 다시 조회하면 값이 바뀌어 있어 "어떤 조건이 유효했는가" 분석이 불가능해집니다.

### 6.2 조건별 추출 쿼리 스켈레톤

실제 테이블·컬럼명은 사내 스키마에 맞춰 치환하세요. 아래는 **입출력 계약**입니다.

```sql
-- 공통 출력: (GOODS_NO, REASON_CODE, METRIC_VALUE, METRIC_LABEL)

-- R1) 초도 발주량 상위 — 취소 수량 차감하지 않음
SELECT o.GOODS_NO, 'R1', SUM(o.ORDER_QTY), SUM(o.ORDER_QTY) || '부'
  FROM 발주현황 o
 WHERE o.ORDER_TYPE = '초도'
   AND o.ORDER_DT  >= :base_dt - INTERVAL '7 day'
 GROUP BY o.GOODS_NO
HAVING SUM(o.ORDER_QTY) >= :R1_MIN_QTY;

-- R2) 당일 발주량 급증 — 초도 여부 무관
SELECT o.GOODS_NO, 'R2', SUM(o.ORDER_QTY), SUM(o.ORDER_QTY) || '부'
  FROM 발주현황 o
 WHERE o.ORDER_DT = :base_dt
 GROUP BY o.GOODS_NO
HAVING SUM(o.ORDER_QTY) >= :R2_MIN_QTY;

-- R3) 최근 7일 판매 TOP N — 국내도서
SELECT GOODS_NO, 'R3', rnk, '판매 ' || rnk || '위'
  FROM (SELECT s.GOODS_NO, RANK() OVER (ORDER BY SUM(s.SALE_QTY) DESC) rnk
          FROM 일별판매 s
         WHERE s.SALE_DT BETWEEN :base_dt - 6 AND :base_dt
           AND s.CATEGORY = '국내도서'
         GROUP BY s.GOODS_NO) t
 WHERE rnk <= :R3_MAX_RANK;

-- R4) 예약판매 — 전환분 포함
SELECT g.GOODS_NO, 'R4', NULL, '예약판매'
  FROM 상품마스터 g
 WHERE g.SALE_STATUS_CD = :예약판매코드;

-- R5) 주목할 신상품 TOP N — 판매량순
SELECT n.GOODS_NO, 'R5', n.RANK_NO, '신상품 ' || n.RANK_NO || '위'
  FROM 주목할신상품 n
 WHERE n.CATEGORY = '국내도서' AND n.SORT_TYPE = '판매량순'
   AND n.RANK_NO <= :R5_MAX_RANK
   AND n.BASE_DT = :base_dt;

-- R6) 베스트셀러·셀럽 작가 — 전작 실적 OR 셀럽 목록
SELECT g.GOODS_NO, 'R6', p.MAX_QTY,
       CASE WHEN c.AUTHOR_CD IS NOT NULL THEN c.CELEB_DESC
            ELSE '전작 최고 ' || ROUND(p.MAX_QTY/10000.0,1) || '만부' END
  FROM 상품마스터 g
  JOIN 상품저자 ga         ON ga.GOODS_NO  = g.GOODS_NO
  LEFT JOIN 저자별최고판매 p ON p.AUTHOR_CD = ga.AUTHOR_CD
  LEFT JOIN EBOOK_CELEB_AUTHOR c ON c.AUTHOR_CD = ga.AUTHOR_CD AND c.USE_YN = 'Y'
 WHERE g.PUB_DT >= :base_dt - INTERVAL '60 day'      -- 신작만
   AND (p.MAX_QTY >= :R6_MIN_PREV_QTY OR c.AUTHOR_CD IS NOT NULL);
```

### 6.3 담당 MD 자동 배정 (사업부서 추가 요구)

추천 상품의 **종이책 관리분류**를 기준으로 eBook 담당 MD를 자동 매칭해, 메일과 관리 화면에 담당자 이름을 표시합니다.

**핵심 요구 — 코드에 고정하지 말 것.** 조직개편·업무분장 변경으로 담당 분야가 자주 바뀌므로, 별도의 **매핑 테이블**(8.10)을 두고 운영자가 화면에서 수정할 수 있어야 합니다.

```
배정 로직
  1. 상품의 관리분류 코드(CATEGORY_CD)로 EBOOK_MD_MAPPING 조회 (USE_YN='Y')
  2. 매핑이 있으면 해당 MD_ID / MD_NM 을 EBOOK_PRE_RECO 에 스냅샷 저장
  3. 매핑이 없으면 NULL → 화면·메일에 "미배정"으로 표시하고 팀 공용으로 노출
  4. 한 분류에 복수 담당(예: 만화/라이트노벨 = 이민정/곽수진)이면
     MD_NM 에 표기용 문자열을 두고, 알림 대상은 매핑의 개별 MD_ID 행 전체로 발송
```

- **배정 시점은 추천 시점**입니다. 이후 담당이 바뀌어도 과거 추천 건의 담당은 당시 값으로 보존되어야 조건별·담당별 성과 분석이 깨지지 않습니다.
- 매핑 변경은 **다음 배치부터** 반영됩니다. 이미 추천된 건을 소급 변경해야 하면 별도 재배정 기능으로 처리하세요(기본 동작 아님).
- 1일 상한(3.3)은 이 배정 결과를 기준으로 MD별로 적용됩니다.

---

## 7. 메일 발송

### 7.1 사양

| 항목 | 값 |
|---|---|
| 발송 시각 | 영업일 10:00 |
| 발신 | `AX Datahub <datahub-noreply@yes24.com>` |
| 수신 | eBook팀 메일 그룹 (`ebook-md@yes24.com`) |
| 제목 | `[eBook 선출간] {M}/{D}({요일}) 단독 선출간 후보 {N}종` |
| 본문 | 리드 문구 + 후보 테이블 + 검토 화면 CTA + 안내 푸터 |
| 대상 | `EBOOK_PRE_RECO` 중 `MAIL_SENT_YN = 'N' AND CARRY_OVER_YN = 'N'` (MD별 1일 상한 적용분) |
| 후처리 | 발송 성공 시 `MAIL_SENT_YN = 'Y'`, `MAIL_SENT_AT` 기록 + `EBOOK_PRE_RECO_MAIL` 로그 |

### 7.2 메일 노출 항목

`MD 내 우선순위` / `종이책 상품번호` / `도서명` / `저자` / `출판사` / `관리분류` / `추천 사유(복수 표시)` / `담당 MD`

우선순위 내림차순으로 정렬해 담고, 상한 초과로 이월된 건수를 푸터에 안내합니다.

### 7.3 구현 주의

- **HTML 메일이므로 CSS 변수·flex·grid를 쓸 수 없습니다.** `<table>` 레이아웃 + 인라인 스타일로 작성하세요. 프로토타입의 메일 미리보기는 *레이아웃 참고용*이며 그대로 복사하면 아웃룩에서 깨집니다.
- 추천 사유 배지는 메일에서 `①  초도 발주량 상위 / ③ 최근 7일 판매 TOP 50` 처럼 **텍스트 구분자**로 표기해도 무방합니다.
- CTA 링크는 검토 화면 딥링크(`/ebook/pre-reco?date=YYYY-MM-DD`)로 겁니다.
- 발송 실패 시 `MAIL_SENT_YN`을 갱신하지 않아 다음 회차에 자동 재시도되게 하세요.

---

## 8. 데이터 모델

PostgreSQL 기준입니다. 다른 DBMS면 해당 문법의 인라인 `COMMENT`로 옮기되 **모든 테이블·컬럼 코멘트를 반드시 유지**하세요.

### 8.1 추천 조건 마스터

```sql
CREATE TABLE EBOOK_PRE_RECO_RULE (
    RULE_CD         VARCHAR(10)   NOT NULL,
    RULE_NM         VARCHAR(100)  NOT NULL,
    RULE_DESC       VARCHAR(500),
    THRESHOLD_VAL   NUMERIC(12,2),
    THRESHOLD_UNIT  VARCHAR(10),
    SORT_ORDER      SMALLINT      NOT NULL DEFAULT 0,
    USE_YN          CHAR(1)       NOT NULL DEFAULT 'Y',
    UPD_ID          VARCHAR(50),
    UPD_DT          TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_PRE_RECO_RULE PRIMARY KEY (RULE_CD)
);

COMMENT ON TABLE  EBOOK_PRE_RECO_RULE                IS 'eBook 단독 선출간 후보 추출 조건 마스터. 조건별 임계값과 사용 여부를 배포 없이 조정하기 위한 파라미터 테이블';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.RULE_CD        IS '조건 코드. R1=초도 발주량 상위, R2=당일 발주량 급증, R3=최근 7일 판매 상위, R4=예약판매, R5=주목할 신상품 상위, R6=베스트셀러·셀럽 작가';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.RULE_NM        IS '조건 표시명. 화면·메일에 그대로 노출';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.RULE_DESC      IS '조건 상세 설명. 검토 화면의 조건 가이드 영역에 표시';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.THRESHOLD_VAL  IS '임계값. R1/R2는 발주 수량(부), R3/R5는 순위 상한(위), R6는 저자 전작 최고 판매량(부). R4는 임계값이 없어 NULL';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.THRESHOLD_UNIT IS '임계값 단위. 부 / 위 / NULL';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.SORT_ORDER     IS '화면 표시 순서. 오름차순 정렬';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.USE_YN         IS '조건 사용 여부. Y=배치가 평가함, N=평가 제외';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.UPD_ID         IS '최종 수정자 사번';
COMMENT ON COLUMN EBOOK_PRE_RECO_RULE.UPD_DT         IS '최종 수정 일시';

INSERT INTO EBOOK_PRE_RECO_RULE (RULE_CD, RULE_NM, THRESHOLD_VAL, THRESHOLD_UNIT, SORT_ORDER) VALUES
 ('R1','초도 발주량 상위',       800,  '부', 1),
 ('R2','당일 발주량 급증',       100,  '부', 2),   -- 100 vs 200 협의 필요
 ('R3','최근 7일 판매량 상위',    50,  '위', 3),
 ('R4','예약판매 상품',         NULL,  NULL, 4),
 ('R5','주목할 신상품 상위',     120,  '위', 5),
 ('R6','베스트셀러·셀럽 작가', 30000,  '부', 6);
```

### 8.2 추천 이력 (상품당 1행 · 중복 방지 기준)

```sql
CREATE TABLE EBOOK_PRE_RECO (
    RECO_ID       BIGSERIAL     NOT NULL,
    GOODS_NO      VARCHAR(20)   NOT NULL,
    RECO_DT       DATE          NOT NULL,
    GOODS_NM      VARCHAR(500)  NOT NULL,
    AUTHOR_NM     VARCHAR(300),
    PUBLISHER_NM  VARCHAR(200),
    CATEGORY_NM   VARCHAR(100),
    SALE_STATUS   VARCHAR(50),
    MD_ID         VARCHAR(50),
    MD_NM         VARCHAR(50),
    MAIL_SENT_YN  CHAR(1)       NOT NULL DEFAULT 'N',
    MAIL_SENT_AT  TIMESTAMP,
    BATCH_ID      BIGINT,
    REG_DT        TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_PRE_RECO  PRIMARY KEY (RECO_ID),
    CONSTRAINT UK_EBOOK_PRE_RECO  UNIQUE (GOODS_NO)
);

COMMENT ON TABLE  EBOOK_PRE_RECO              IS 'eBook 단독 선출간 추천 이력. 종이책 상품번호 기준으로 상품당 1행만 존재하며, 이 UNIQUE 제약이 중복 추천 방지의 기준';
COMMENT ON COLUMN EBOOK_PRE_RECO.RECO_ID      IS '추천 일련번호. 내부 PK';
COMMENT ON COLUMN EBOOK_PRE_RECO.GOODS_NO     IS '종이책 상품번호. UNIQUE. 한 번 적재되면 다른 조건을 새로 충족해도 재추천하지 않음';
COMMENT ON COLUMN EBOOK_PRE_RECO.RECO_DT      IS '최초 추천 일자(배치 기준일)';
COMMENT ON COLUMN EBOOK_PRE_RECO.GOODS_NM     IS '추천 시점 도서명 스냅샷';
COMMENT ON COLUMN EBOOK_PRE_RECO.AUTHOR_NM    IS '추천 시점 저자명 스냅샷. 공저는 구분자로 연결';
COMMENT ON COLUMN EBOOK_PRE_RECO.PUBLISHER_NM IS '추천 시점 출판사명 스냅샷';
COMMENT ON COLUMN EBOOK_PRE_RECO.CATEGORY_NM  IS '추천 시점 분야명 스냅샷. 담당 MD 배정 근거';
COMMENT ON COLUMN EBOOK_PRE_RECO.SALE_STATUS  IS '추천 시점 판매상태. 판매중 / 예약판매 등';
COMMENT ON COLUMN EBOOK_PRE_RECO.MD_ID        IS '담당 MD 사번. 분야 매핑으로 배정하며 매핑이 없으면 NULL(미배정)';
COMMENT ON COLUMN EBOOK_PRE_RECO.MD_NM        IS '담당 MD 성명 스냅샷. 이후 담당이 바뀌어도 당시 배정 보존';
COMMENT ON COLUMN EBOOK_PRE_RECO.MAIL_SENT_YN IS '메일 발송 여부. N=미발송(다음 발송 배치 대상), Y=발송 완료';
COMMENT ON COLUMN EBOOK_PRE_RECO.MAIL_SENT_AT IS '메일 발송 완료 일시';
COMMENT ON COLUMN EBOOK_PRE_RECO.BATCH_ID     IS '이 건을 적재한 배치 실행 ID';
COMMENT ON COLUMN EBOOK_PRE_RECO.REG_DT       IS '행 생성 일시';

CREATE INDEX IX_EBOOK_PRE_RECO_01 ON EBOOK_PRE_RECO (RECO_DT DESC);
CREATE INDEX IX_EBOOK_PRE_RECO_02 ON EBOOK_PRE_RECO (MAIL_SENT_YN) WHERE MAIL_SENT_YN = 'N';
CREATE INDEX IX_EBOOK_PRE_RECO_03 ON EBOOK_PRE_RECO (MD_ID, RECO_DT DESC);
```

### 8.3 추천 사유 (1:N)

```sql
CREATE TABLE EBOOK_PRE_RECO_REASON (
    RECO_ID       BIGINT        NOT NULL,
    RULE_CD       VARCHAR(10)   NOT NULL,
    METRIC_VAL    NUMERIC(14,2),
    METRIC_LABEL  VARCHAR(100),
    THRESHOLD_VAL NUMERIC(12,2),
    REG_DT        TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_PRE_RECO_REASON PRIMARY KEY (RECO_ID, RULE_CD),
    CONSTRAINT FK_EBOOK_PRE_RECO_REASON FOREIGN KEY (RECO_ID) REFERENCES EBOOK_PRE_RECO (RECO_ID)
);

COMMENT ON TABLE  EBOOK_PRE_RECO_REASON               IS 'eBook 선출간 추천 사유. 한 상품이 여러 조건을 동시 충족하면 조건 수만큼 행이 생기며, 조건별 성과(적중률) 분석의 기준 테이블';
COMMENT ON COLUMN EBOOK_PRE_RECO_REASON.RECO_ID       IS '추천 일련번호. EBOOK_PRE_RECO 참조';
COMMENT ON COLUMN EBOOK_PRE_RECO_REASON.RULE_CD       IS '충족한 조건 코드. EBOOK_PRE_RECO_RULE 참조';
COMMENT ON COLUMN EBOOK_PRE_RECO_REASON.METRIC_VAL    IS '해당 조건의 실제 측정값. R1/R2는 발주 수량, R3/R5는 순위, R6는 저자 전작 최고 판매량. R4는 NULL';
COMMENT ON COLUMN EBOOK_PRE_RECO_REASON.METRIC_LABEL  IS '화면 표시용 문자열. 예: 1,420부 / 판매 18위 / 신상품 12위 / 예약판매';
COMMENT ON COLUMN EBOOK_PRE_RECO_REASON.THRESHOLD_VAL IS '추천 당시 적용된 임계값. 이후 임계값을 바꿔도 과거 추천의 판단 근거를 재현하기 위해 함께 보존';
COMMENT ON COLUMN EBOOK_PRE_RECO_REASON.REG_DT        IS '행 생성 일시';

CREATE INDEX IX_EBOOK_PRE_RECO_REASON_01 ON EBOOK_PRE_RECO_REASON (RULE_CD);
```

### 8.4 추천 시점 지표 스냅샷 (1:1)

```sql
CREATE TABLE EBOOK_PRE_RECO_METRIC (
    RECO_ID          BIGINT       NOT NULL,
    INIT_ORDER_QTY   INTEGER,
    TODAY_ORDER_QTY  INTEGER,
    SALE_QTY_7D      INTEGER,
    SALE_RANK_7D     INTEGER,
    NEW_GOODS_RANK   INTEGER,
    AUTHOR_MAX_QTY   INTEGER,
    LIST_PRICE       INTEGER,
    PUB_DT           DATE,
    REG_DT           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_PRE_RECO_METRIC PRIMARY KEY (RECO_ID),
    CONSTRAINT FK_EBOOK_PRE_RECO_METRIC FOREIGN KEY (RECO_ID) REFERENCES EBOOK_PRE_RECO (RECO_ID)
);

COMMENT ON TABLE  EBOOK_PRE_RECO_METRIC                  IS 'eBook 선출간 추천 시점의 주요 지표 스냅샷. 소스 데이터는 시간이 지나면 값이 변하므로 추천 시점 값을 그대로 보존해 사후 분석에 사용';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.RECO_ID          IS '추천 일련번호. EBOOK_PRE_RECO 참조';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.INIT_ORDER_QTY   IS '초도 발주 수량(부). 취소 수량을 차감하지 않은 발주 원본 수량';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.TODAY_ORDER_QTY  IS '추천 기준일 당일 발주 수량(부)';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.SALE_QTY_7D      IS '최근 7일 판매 수량(부)';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.SALE_RANK_7D     IS '최근 7일 국내도서 판매량 순위(위). 미집계 시 NULL';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.NEW_GOODS_RANK   IS '주목할 신상품 판매량순 순위(위). 미노출 시 NULL';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.AUTHOR_MAX_QTY   IS '저자의 이전 종이책 최고 판매량(부). 전작이 없으면 NULL';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.LIST_PRICE       IS '추천 시점 정가(원)';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.PUB_DT           IS '종이책 출간일';
COMMENT ON COLUMN EBOOK_PRE_RECO_METRIC.REG_DT           IS '행 생성 일시';
```

### 8.5 MD 검토 결과

```sql
CREATE TABLE EBOOK_PRE_RECO_REVIEW (
    REVIEW_ID     BIGSERIAL     NOT NULL,
    RECO_ID       BIGINT        NOT NULL,
    REVIEW_CD     VARCHAR(10)   NOT NULL,
    REASON_CD     VARCHAR(30),
    REASON_MEMO   VARCHAR(1000),
    MD_ID         VARCHAR(50)   NOT NULL,
    MD_NM         VARCHAR(50),
    REVIEW_DT     TIMESTAMP     NOT NULL DEFAULT NOW(),
    LATEST_YN     CHAR(1)       NOT NULL DEFAULT 'Y',
    CONSTRAINT PK_EBOOK_PRE_RECO_REVIEW PRIMARY KEY (REVIEW_ID),
    CONSTRAINT FK_EBOOK_PRE_RECO_REVIEW FOREIGN KEY (RECO_ID) REFERENCES EBOOK_PRE_RECO (RECO_ID)
);

COMMENT ON TABLE  EBOOK_PRE_RECO_REVIEW             IS 'eBook 선출간 추천 건에 대한 MD 판단 이력. 판단을 번복할 수 있으므로 갱신이 아니라 행을 추가하고 LATEST_YN으로 현재 값을 구분';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.REVIEW_ID   IS '검토 일련번호. 내부 PK';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.RECO_ID     IS '추천 일련번호. EBOOK_PRE_RECO 참조';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.REVIEW_CD   IS 'MD 판단. GO=섭외, HOLD=보류, DROP=제외';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.REASON_CD   IS '보류·제외 사유 코드. GO일 때는 NULL, HOLD/DROP일 때는 필수. 8.6 코드값 참조';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.REASON_MEMO IS '사유 상세 메모. 자유 입력이며 선택 항목';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.MD_ID       IS '판단한 MD 사번';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.MD_NM       IS '판단한 MD 성명 스냅샷';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.REVIEW_DT   IS 'MD 검토 일시';
COMMENT ON COLUMN EBOOK_PRE_RECO_REVIEW.LATEST_YN   IS '최신 판단 여부. Y=현재 유효한 판단, N=번복되어 무효화된 과거 판단';

CREATE UNIQUE INDEX UX_EBOOK_PRE_RECO_REVIEW_01 ON EBOOK_PRE_RECO_REVIEW (RECO_ID) WHERE LATEST_YN = 'Y';
CREATE INDEX        IX_EBOOK_PRE_RECO_REVIEW_02 ON EBOOK_PRE_RECO_REVIEW (MD_ID, REVIEW_DT DESC);
```

**제약 규칙 (애플리케이션에서 검증)** — `REVIEW_CD IN ('HOLD','DROP')` 이면 `REASON_CD`는 **필수**입니다. 요청서상 제외 사유 입력이 필수 요건이며, 보류도 동일하게 받습니다.

### 8.6 보류·제외 사유 코드 (사업부서 확정)

별도 공통코드로 관리하거나 아래 값을 하드코딩합니다. **화면 표시 순서 = 아래 순서**입니다.

| 구분 | 코드 | 표시 |
|---|---|---|
| HOLD | `WAIT_REPLY` | 출판사 회신 대기 |
| HOLD | `NEW_SUPPLY` | 신규 공급 계약 진행 |
| HOLD | `ETC` | 기타 |
| DROP | `EBOOK_PLANNED` | 이미 eBook 출간 예정 |
| DROP | `COMPETITOR` | 경쟁사 단독 선출간 |
| DROP | `RIGHTS` | 제작 불가 (판권 이슈) |
| DROP | `UNSUITABLE` | eBook 제작 부적합 |
| DROP | `ETC` | 기타 |

`REASON_CD`는 코드로 저장하고 표시명은 화면에서 매핑하세요. 표시명이 바뀌어도 과거 데이터의 집계가 깨지지 않아야 합니다.

### 8.7 선출간 성과 추적

```sql
CREATE TABLE EBOOK_PRE_RECO_DEAL (
    RECO_ID        BIGINT       NOT NULL,
    DEAL_STATUS_CD VARCHAR(20)  NOT NULL,
    CONTACT_DT     DATE,
    CLOSE_DT       DATE,
    EBOOK_GOODS_NO VARCHAR(20),
    FAIL_REASON    VARCHAR(500),
    UPD_ID         VARCHAR(50),
    UPD_DT         TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_PRE_RECO_DEAL PRIMARY KEY (RECO_ID),
    CONSTRAINT FK_EBOOK_PRE_RECO_DEAL FOREIGN KEY (RECO_ID) REFERENCES EBOOK_PRE_RECO (RECO_ID)
);

COMMENT ON TABLE  EBOOK_PRE_RECO_DEAL                IS 'eBook 선출간 섭외 진행 및 성사 결과. MD가 섭외(GO)로 판단한 건에 대해서만 생성하며, 조건별 적중률 분석의 최종 성과 지표';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.RECO_ID        IS '추천 일련번호. EBOOK_PRE_RECO 참조';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.DEAL_STATUS_CD IS '섭외 진행 상태. ONGOING=섭외 진행중, SUCCESS=선출간 성사, FAIL=섭외 실패';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.CONTACT_DT     IS '출판사 최초 컨택 일자';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.CLOSE_DT       IS '섭외 종료 일자. 성사 또는 실패가 확정된 날';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.EBOOK_GOODS_NO IS '성사 시 생성된 eBook 상품번호. 이후 eBook 매출 연동의 조인 키';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.FAIL_REASON    IS '섭외 실패 사유. DEAL_STATUS_CD가 FAIL일 때 입력';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.UPD_ID         IS '최종 수정자 사번';
COMMENT ON COLUMN EBOOK_PRE_RECO_DEAL.UPD_DT         IS '최종 수정 일시';
```

### 8.8 셀럽 저자 관리 목록

```sql
CREATE TABLE EBOOK_CELEB_AUTHOR (
    AUTHOR_CD   VARCHAR(20)   NOT NULL,
    AUTHOR_NM   VARCHAR(100)  NOT NULL,
    CELEB_TYPE  VARCHAR(20),
    CELEB_DESC  VARCHAR(200),
    USE_YN      CHAR(1)       NOT NULL DEFAULT 'Y',
    REG_ID      VARCHAR(50),
    REG_DT      TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_CELEB_AUTHOR PRIMARY KEY (AUTHOR_CD)
);

COMMENT ON TABLE  EBOOK_CELEB_AUTHOR            IS '셀럽 저자 관리 목록. 방송인·연예인·유명 인사는 판매 이력으로 자동 판정할 수 없어 MD가 직접 등록하며, 추출 조건 R6에서 사용';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.AUTHOR_CD  IS '저자 코드. 상품 저자 정보와 조인하는 키';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.AUTHOR_NM  IS '저자명';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.CELEB_TYPE IS '셀럽 유형. BROADCAST=방송인, ENTERTAINER=연예인, INFLUENCER=인플루언서, AWARD=수상 작가, ETC=기타';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.CELEB_DESC IS '추천 사유에 표시할 부연 설명. 예: 유튜브 82만, 방송 출연, 문학상 수상';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.USE_YN     IS '사용 여부. Y=조건 평가에 반영, N=제외';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.REG_ID     IS '등록자 사번';
COMMENT ON COLUMN EBOOK_CELEB_AUTHOR.REG_DT     IS '등록 일시';
```

### 8.9 배치 실행 로그

```sql
CREATE TABLE EBOOK_PRE_RECO_BATCH (
    BATCH_ID      BIGSERIAL     NOT NULL,
    BATCH_TYPE    VARCHAR(20)   NOT NULL,
    BASE_DT       DATE          NOT NULL,
    START_DT      TIMESTAMP     NOT NULL DEFAULT NOW(),
    END_DT        TIMESTAMP,
    STATUS_CD     VARCHAR(20)   NOT NULL DEFAULT 'RUNNING',
    CAND_CNT      INTEGER       DEFAULT 0,
    NEW_RECO_CNT  INTEGER       DEFAULT 0,
    DUP_SKIP_CNT  INTEGER       DEFAULT 0,
    MAIL_CNT      INTEGER       DEFAULT 0,
    ERR_MSG       VARCHAR(2000),
    CONSTRAINT PK_EBOOK_PRE_RECO_BATCH PRIMARY KEY (BATCH_ID)
);

COMMENT ON TABLE  EBOOK_PRE_RECO_BATCH              IS 'eBook 선출간 추천 배치 실행 로그. 중복으로 걸러진 건수까지 남겨 배치가 정상 동작했는지 사후 확인';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.BATCH_ID     IS '배치 실행 일련번호';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.BATCH_TYPE   IS '배치 유형. EXTRACT=후보 추출, MAIL=메일 발송, REMIND=미검토 리마인드';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.BASE_DT      IS '배치 기준 일자';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.START_DT     IS '배치 시작 일시';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.END_DT       IS '배치 종료 일시';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.STATUS_CD    IS '실행 상태. RUNNING=실행중, SUCCESS=정상 종료, FAIL=오류 종료';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.CAND_CNT     IS '조건을 충족한 후보 건수(중복 제거 전)';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.NEW_RECO_CNT IS '실제 신규 추천으로 적재된 건수';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.DUP_SKIP_CNT IS '기추천 이력이 있어 제외된 건수. 화면의 중복 차단 지표로 노출';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.MAIL_CNT     IS '메일에 담아 발송한 건수';
COMMENT ON COLUMN EBOOK_PRE_RECO_BATCH.ERR_MSG      IS '오류 메시지. STATUS_CD가 FAIL일 때 기록';
```

### 8.10 관리분류 → eBook 담당 MD 매핑

```sql
CREATE TABLE EBOOK_MD_MAPPING (
    CATEGORY_CD   VARCHAR(20)   NOT NULL,
    CATEGORY_NM   VARCHAR(100)  NOT NULL,
    MD_ID         VARCHAR(50),
    MD_NM         VARCHAR(100)  NOT NULL,
    SORT_ORDER    SMALLINT      NOT NULL DEFAULT 0,
    USE_YN        CHAR(1)       NOT NULL DEFAULT 'Y',
    UPD_ID        VARCHAR(50),
    UPD_DT        TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT PK_EBOOK_MD_MAPPING PRIMARY KEY (CATEGORY_CD)
);

COMMENT ON TABLE  EBOOK_MD_MAPPING             IS '종이책 관리분류별 eBook 담당 MD 매핑. 조직개편·업무분장 변경에 대응하기 위해 코드에 고정하지 않고 운영자가 화면에서 수정하는 테이블';
COMMENT ON COLUMN EBOOK_MD_MAPPING.CATEGORY_CD IS '종이책 관리분류 코드. 상품의 관리분류와 조인하는 키. 예: 001014=인문';
COMMENT ON COLUMN EBOOK_MD_MAPPING.CATEGORY_NM IS '관리분류명. 화면 표시용이며 실제 매칭은 코드로 수행';
COMMENT ON COLUMN EBOOK_MD_MAPPING.MD_ID       IS '담당 MD 사번. 알림·리마인드 발송 대상. 복수 담당 분류는 분류당 여러 행으로 관리';
COMMENT ON COLUMN EBOOK_MD_MAPPING.MD_NM       IS '담당 MD 표시명. 복수 담당이면 구분자로 연결해 표기 (예: 이민정/곽수진)';
COMMENT ON COLUMN EBOOK_MD_MAPPING.SORT_ORDER  IS '관리 화면 표시 순서';
COMMENT ON COLUMN EBOOK_MD_MAPPING.USE_YN      IS '사용 여부. Y=배정에 사용, N=제외(매핑 없음으로 처리되어 미배정)';
COMMENT ON COLUMN EBOOK_MD_MAPPING.UPD_ID      IS '최종 수정자 사번';
COMMENT ON COLUMN EBOOK_MD_MAPPING.UPD_DT      IS '최종 수정 일시';
```

> **복수 담당 분류**(만화/라이트노벨 등)를 개별 사번으로 관리해야 하면 PK를 `(CATEGORY_CD, MD_ID)`로 바꾸고 표시명은 조회 시 집계하세요. 아래 시드는 화면 표기 우선으로 분류당 1행 구조입니다.

**초기 시드 (사업부서 제공 · 국내도서 001)**

```sql
INSERT INTO EBOOK_MD_MAPPING (CATEGORY_CD, CATEGORY_NM, MD_NM, SORT_ORDER) VALUES
 ('001001','수험서 자격증',   '설재희',        1),
 ('001002','IT 모바일',       '김혜연',        2),
 ('001003','중고등학습서',    '김효인',        3),
 ('001004','대학교재',        '설재희',        4),
 ('001005','유아',            '김효인',        5),
 ('001006','국내문학',        '김영원',        6),
 ('001007','종교',            '김효인',        7),
 ('001008','만화/라이트노벨', '이민정/곽수진', 8),
 ('001009','사회 정치',       '김효인',        9),
 ('001010','잡지',            '김영원',       10),
 ('001011','국어 외국어 사전','김혜연',       11),
 ('001012','여행',            '김영원',       12),
 ('001013','경제 경영',       '김혜연',       13),
 ('001014','인문',            '김효인',       14),
 ('001015','역사',            '김효인',       15),
 ('001016','예술',            '김영원',       16),
 ('001017','가정 살림',       '김영원',       17),
 ('001019','청소년',          '김효인',       18),
 ('001020','자연과학',        '김효인',       19),
 ('001022','자기계발',        '김혜연',       20),
 ('001023','건강 취미',       '김영원',       21),
 ('001026','해외문학',        '김효인',       22),
 ('001027','어린이',          '김효인',       23),
 ('001029','초등학습서',      '김효인',       24),
 ('001033','소설/시/희곡',    '김영원',       25),
 ('001034','에세이',          '김영원',       26);
-- '문학' 분류: 제공된 스크린샷에서 분류코드가 잘려 확인 필요. 담당은 김영원.
```

> 시드에 없는 분류의 상품이 추천되면 `MD_NM`이 NULL이 되어 "미배정"으로 노출됩니다. 운영 초기에 미배정 건을 모니터링해 매핑을 보완하세요.

---

## 9. API 명세

REST 기준입니다. 응답은 `{ code, message, data }` 래핑을 가정합니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/ebook/pre-reco/today` | 검토 대상 목록. 파라미터: `status`(all/todo/go/hold/drop/**carry**), `ruleCd`, `mdId`, `date`. 기본 정렬은 **우선순위 점수 내림차순** |
| `GET` | `/api/ebook/pre-reco/summary` | 상단 KPI. 오늘 발송 수, 검토 완료 수, 섭외 수, **이월 대기 수**, 중복 차단 수 + **MD별 배분 현황**(`{md, sent, carry, limit}`) |
| `POST` | `/api/ebook/pre-reco/{recoId}/review` | 판단 저장. 본문: `{ reviewCd, reasonCd, reasonMemo }` |
| `DELETE` | `/api/ebook/pre-reco/{recoId}/review` | 판단 취소(최신 건 `LATEST_YN='N'` 처리) |
| `GET` | `/api/ebook/pre-reco/history` | 이력 목록. 파라미터: `q`, `from`, `to`, `status`, `ruleCd`, **`mdId`**, 페이징 |
| `GET` | `/api/ebook/pre-reco/history/excel` | 이력 엑셀 다운로드 (서버 생성 시) |
| `GET` | `/api/ebook/pre-reco/report` | 성과 리포트. 퍼널·판단 분포·조건별 성과 |
| `GET` | `/api/ebook/pre-reco/rules` | 조건 가이드에 표시할 조건 목록과 현재 임계값 |
| `PUT` | `/api/ebook/pre-reco/deal/{recoId}` | 섭외 진행 상태 갱신 |
| `GET` | `/api/ebook/md-mapping` | 관리분류 → 담당 MD 매핑 목록 |
| `PUT` | `/api/ebook/md-mapping/{categoryCd}` | 매핑 수정. 본문: `{ mdId, mdNm, useYn }`. 다음 배치부터 반영 |

### 9.1 판단 저장 검증

```
IF reviewCd NOT IN ('GO','HOLD','DROP')            → 400
IF reviewCd IN ('HOLD','DROP') AND reasonCd IS NULL → 400 "사유를 선택해 주세요."
IF 해당 recoId 없음                                  → 404
저장 시: 기존 LATEST_YN='Y' 행을 'N'으로 내리고 새 행 INSERT
reviewCd='GO' 이면 EBOOK_PRE_RECO_DEAL 에 ONGOING 행 자동 생성(없을 때만)
```

### 9.2 조건별 성과 집계 쿼리

```sql
SELECT r.RULE_CD,
       COUNT(DISTINCT rs.RECO_ID)                                        AS RECO_CNT,
       COUNT(DISTINCT CASE WHEN v.REVIEW_CD = 'GO'      THEN rs.RECO_ID END) AS GO_CNT,
       COUNT(DISTINCT CASE WHEN d.DEAL_STATUS_CD = 'SUCCESS' THEN rs.RECO_ID END) AS DEAL_CNT
  FROM EBOOK_PRE_RECO_RULE   r
  JOIN EBOOK_PRE_RECO_REASON rs ON rs.RULE_CD = r.RULE_CD
  JOIN EBOOK_PRE_RECO        e  ON e.RECO_ID  = rs.RECO_ID
  LEFT JOIN EBOOK_PRE_RECO_REVIEW v ON v.RECO_ID = e.RECO_ID AND v.LATEST_YN = 'Y'
  LEFT JOIN EBOOK_PRE_RECO_DEAL   d ON d.RECO_ID = e.RECO_ID
 WHERE e.RECO_DT BETWEEN :from AND :to
 GROUP BY r.RULE_CD, r.SORT_ORDER
 ORDER BY r.SORT_ORDER;
```

> 한 상품이 여러 조건을 충족하면 **각 조건에 중복 집계**됩니다. 화면에 이 사실을 명시하세요(프로토타입 문구 참고).

---

## 10. 화면 사양

프로토타입: `ax-poc-web/ebook_solo_pub/index.html`. 아래는 각 화면의 요구 동작입니다.

### 10.1 공통 셸

- 좌측 사이드바(브랜드 `AX Datahub`) + 상단 헤더(브레드크럼, 다크모드 토글) + 본문.
- 사이드바 메뉴 5개: 오늘의 추천 후보 / 일일 추천 메일 / 추천·검토 이력 / 추천 성과 리포트 / 담당 MD 매핑.
- 콘텐츠 영역은 **화면 폭에 맞춰 확장**됩니다(`max-width` 없음).

### 10.2 오늘의 추천 후보 (메인)

**① 추천 조건 가이드** — 접기/펼치기 가능한 카드. 조건 6개를 **3열 × 2행**(1180px 이하 2열, 720px 이하 1열)로 균등 배치합니다. 각 항목은 `번호 배지 · 조건명(한 줄 고정) · 기준값 pill · 설명 · 데이터 경로`. 하단에 운영 규칙 3줄(중복 방지 / 발송 / 판단 입력).

**② KPI 5종** — 오늘 발송 추천, 검토 완료(진행바), 섭외 결정, 다음 영업일 이월, 중복 차단.
그 아래 **MD별 배분 바**로 `김도현 10/10 이월 3` 처럼 상한 소진 현황을 표시합니다(상한 도달 시 경고색).

**③ 필터** — 상태 세그먼트(전체/미검토/섭외/보류/제외/**이월 대기**, 각 건수 표시) + 추천 사유 셀렉트 + 담당 MD 셀렉트 + 엑셀 내려받기.
'전체'는 오늘 발송분만 보여주고, 이월 건은 '이월 대기' 탭에서만 노출합니다.

**④ 후보 카드 목록** — **우선순위 점수 내림차순 정렬**. 카드 1장 = 상품 1건.
- 좌: 우선순위 배지(`#MD내 순위` + 등급 + 담당 MD명, 등급별 색상) + **표지 이미지** / 중: 상품번호·분야·판매상태 배지, 도서명, 저자·출판사, **추천 사유 배지(충족한 조건 전부, 조건별 측정값 포함)**, 지표 5종(초도 발주·당일 발주·7일 판매·순위·작가 이력)
- 우: `섭외 / 보류 / 제외` 버튼 + 판단 결과 요약 + 상품 상세·발주 현황 링크
- 우측 상단에 `우선순위 102점 · ① 초도 발주량 상위 외 2개 조건` 형태로 산정 근거를 노출합니다.
- **표지 이미지와 도서명은 상품 상세로 이동하는 링크**입니다. 새 탭(`target="_blank" rel="noopener"`)으로 엽니다.
  - 이미지: `https://image.yes24.com/goods/{상품번호}` (기본 XL 798×1200). 목록에는 과하므로 `/L`(266×400)을 사용하고, 로드 실패 시 플레이스홀더로 대체합니다.
  - 상세: `https://www.yes24.com/product/goods/{상품번호}`
- 분류 pill에 관리분류명을 표시하고 `title` 속성으로 관리분류 코드를 노출합니다.
- 판단 완료 시 카드를 흐리게 처리하고, 같은 버튼을 다시 누르면 판단 취소.
- **이월 대기 건**은 점선 테두리 + `다음 영업일 이월` 배지로 구분하고, 순위 자리에 `—`를 표시합니다.

**⑤ 사유 입력 모달** — 보류·제외 선택 시 표시. 사유 칩(단일 선택, 필수) + 상세 메모(선택). 사유 미선택 상태로 저장하면 인라인 오류를 띄우고 저장을 막습니다. 칩 목록은 8.6 코드표를 그대로 사용합니다.

### 10.3 일일 추천 메일

실제 발송 HTML 메일의 미리보기. 제목·발신·수신·발송 시각과 후보 테이블(상품번호/도서명·저자·출판사/추천 사유), CTA, 안내 푸터.

### 10.4 추천·검토 이력

검색(도서명·상품번호·출판사·저자) + 기간 + 판단 + **담당 MD** + 사유 필터. 컬럼: 추천일 / 상품번호 / 도서명·저자·출판사·분야 / 추천 사유 / **추천 당시 지표** / 담당 MD / 판단 / 사유·검토일 / 선출간 결과. 엑셀 내려받기 제공.

### 10.5 추천 성과 리포트

- KPI 4종: 총 추천, 검토 완료율, 섭외 결정(비율), 선출간 성사(성사율)
- 퍼널: 추천 → 검토 완료 → 섭외 결정 → 선출간 성사
- MD 판단 분포 + 제외 사유 상위
- **조건별 성과 테이블**: 추천 / 섭외 / 섭외 전환율 / 성사 / 적중률(막대) / 평가 등급
- 개선 제안 패널(적중률 낮은 조건의 기준 재검토 등)

### 10.6 담당 MD 매핑 (운영자 관리 화면)

관리분류별 담당 MD를 **화면에서 직접 수정**하는 화면입니다. 담당이 코드에 박혀 있지 않아야 한다는 요구를 실제로 만족시키는 지점이므로, 읽기 전용 표로 만들지 마세요.

**상단 요약 4종** — 등록 분류(사용/미사용), 담당 MD 수, MD당 평균 담당 분류 수, **미배정 추천 건수**(0이 아니면 경고 배지).

**필터** — 분류코드·분류명 검색 / 담당 MD / '오늘 추천이 있는 분류만' 체크.

**표 (인라인 편집)**

| 컬럼 | 편집 | 비고 |
|---|---|---|
| 분류코드 | 텍스트 | 중복 불가. 저장 시 검증 |
| 관리분류 | 텍스트 | 표시용 |
| eBook 담당 MD | 셀렉트 | 기존 담당자 목록 + `직접 입력…` |
| 사용 | 토글 | OFF면 매핑 없음으로 처리 → 미배정 |
| 오늘 추천 | 읽기 전용 | 해당 분류에서 오늘 추천된 건수 |
| 최종 수정 | 읽기 전용 | 일자 + 수정자 |

- 오늘 추천이 있는 분류는 행을 강조하고, 미사용 분류는 흐리게 + 취소선 처리합니다.
- **분류 추가** 버튼으로 신규 행을 만들 수 있습니다.

**저장 규칙**

- 편집은 **초안(draft)** 에만 반영되고, `매핑 저장`을 눌러야 실제 매핑이 바뀝니다. 미저장 상태는 상단 `저장하지 않은 변경 있음` 뱃지로 표시하고, `되돌리기`로 초안을 폐기합니다.
- 저장 시 검증: 분류코드·분류명·담당 MD **필수**, 분류코드 **중복 불가**.
- 저장하면 **다음 배치부터** 새 담당으로 배정됩니다. 이미 추천된 건의 담당은 추천 당시 스냅샷이므로 바뀌지 않습니다.
- 담당이 바뀌면 **MD별 1일 상한(3.3)도 다시 계산**되어야 합니다. 프로토타입은 저장 즉시 재배정·재정렬해 이 파급효과를 보여줍니다.

> 프로토타입은 저장 시 화면의 후보 목록·배분 현황이 즉시 갱신되도록 만들어 두었습니다. 실제 구현에서는 배치 주기를 따르되, 화면에는 "다음 배치부터 반영" 안내를 반드시 노출하세요.

### 10.6 반응형

| 폭 | 동작 |
|---|---|
| ≥1181px | 조건 가이드 3열, 이력 테이블 전체 표시 |
| 721~1180px | 조건 가이드 2열 |
| ≤900px | 후보 카드의 판단 영역이 아래로 내려감 |
| ≤720px | 조건 가이드 1열 |

테이블은 카드 내부에서만 가로 스크롤되며 **페이지 자체는 가로 스크롤되지 않아야 합니다.**

---

## 11. 디자인 시스템

프로토타입은 `ax-labs-platform`의 디자인 시스템을 이식했습니다. datahub 구현 시에도 동일 토큰을 사용하세요.

| 항목 | 값 |
|---|---|
| 테마 | vercel (라이트) / `.dark` (다크). oklch 색 토큰 |
| 폰트 | **Pretendard** (jsdelivr CDN). 숫자·상품번호는 `--font-mono` |
| 색 | 하드코딩 금지. `var(--primary)`, `var(--muted-foreground)`, `var(--success)`, `var(--warning)`, `var(--destructive)`, `var(--violet)` 등 토큰만 사용 |
| 강조 배경 | `color-mix(in oklch, var(--primary) 10%, transparent)` 패턴 |
| 컴포넌트 | `.card` `.btn` `.badge` `.pill` `.status-badge` `.stat-card` `.ai-brief` 등 |

**추천 사유 배지 색상 규약** (조건별 고정)

| 코드 | 클래스 | 색 토큰 |
|---|---|---|
| R1 | `.rsn-r1` | `--primary` |
| R2 | `.rsn-r2` | `--info` |
| R3 | `.rsn-r3` | `--success` |
| R4 | `.rsn-r4` | `--warning` |
| R5 | `.rsn-r5` | `--violet` |
| R6 | `.rsn-r6` | amber (`oklch(0.72 0.16 85)`) |

다크모드 토글 시 모든 색이 따라 바뀌어야 합니다. 인라인 hex를 쓰면 이 단계에서 드러납니다.

---

## 12. 엑셀 다운로드

프로토타입은 외부 라이브러리 없이 브라우저에서 `.xlsx`를 생성합니다(`assets/js/xlsx.js` — 무압축 ZIP + OOXML). **datahub 구현 시에는 서버에서 Apache POI 등으로 생성**하는 편이 낫습니다. 다만 컬럼 구성과 파일명 규칙은 유지하세요.

| 화면 | 파일명 | 컬럼 |
|---|---|---|
| 오늘의 추천 후보 | `eBook_선출간_추천후보_YYYYMMDD.xlsx` | 추천일 · **MD내 순위** · **우선순위 점수** · 상품번호 · 도서명 · 저자 · 출판사 · 관리분류코드 · 관리분류 · 추천 사유 · 초도 발주 · 당일 발주 · 7일 판매 · 순위 · 작가 이력 · 담당 MD · MD 판단 · 보류/제외 사유 |
| 추천·검토 이력 | `eBook_선출간_추천이력_YYYYMMDD.xlsx` | 위 항목 + 검토일 · 선출간 결과 |

공통: 헤더 볼드 + 회색 배경, 첫 행 틀 고정, 자동 필터, 열 너비 지정. **화면에 적용된 필터가 그대로 반영**되어야 합니다.

---

## 13. 권한

| 역할 | 권한 |
|---|---|
| eBook MD | 전체 목록 조회, **모든 건 판단 가능**(담당 외 건도 입력 가능하되 담당자를 함께 표기) |
| eBook 팀장 | MD 권한 + 조건 임계값 조정, 선출간 결과 입력 |
| 조회자 | 목록·리포트 조회만 |

담당 MD 배정은 알림·리마인드 대상 선정용이며, **판단을 담당자로 제한하지 않습니다** — 요청서상 제약이 없고, 담당 부재 시 검토가 막히는 것이 더 큰 문제입니다.

---

## 14. 구현 순서 제안

1. **DB 스키마 + 조건 마스터 시드** (8장) — 여기서부터 시작해야 나머지가 붙습니다
2. **추출 배치** (6장) — 소스 쿼리 매핑이 가장 오래 걸립니다. 조건 1개(R3)만 먼저 붙여 파이프라인을 검증한 뒤 나머지를 확장하세요
3. **검토 화면 + 판단 API** (10.2, 9장) — MD가 실제로 쓰는 핵심 화면
4. **메일 발송 배치** (7장)
5. **이력 화면 + 엑셀** (10.4, 12장)
6. **성과 리포트** (10.5, 9.2) — 데이터가 한 달 이상 쌓인 뒤 의미가 생깁니다
7. 리마인드 배치, 선출간 결과 입력

---

## 15. 테스트 체크리스트

**중복 방지**
- [ ] 같은 상품이 여러 조건을 동시 충족해도 추천은 1건, 사유는 전부 표시
- [ ] 어제 추천된 상품이 오늘 다른 조건을 충족해도 재추천·재발송되지 않음
- [ ] 배치를 같은 날 두 번 돌려도 중복 INSERT 없음(멱등성)

**추출**
- [ ] eBook이 이미 등록된 종이책은 후보에서 제외
- [ ] R1은 취소 수량을 차감하지 않은 수량으로 판정
- [ ] R4는 재고 부족으로 예약판매 전환된 상품도 포함
- [ ] 임계값을 마스터에서 바꾸면 다음 배치부터 반영(재배포 불필요)

**메일**
- [ ] 주말 추출분이 다음 영업일 10시에 합산 발송
- [ ] 발송 실패 시 `MAIL_SENT_YN`이 N으로 남아 다음 회차 재시도
- [ ] 아웃룩·웹메일에서 레이아웃 정상

**우선순위 · 1일 상한**
- [ ] 조건을 여럿 충족한 상품이 하나만 충족한 상품보다 위에 노출
- [ ] 같은 조건이면 발주·판매 수치가 큰 상품이 위에 노출
- [ ] MD별로 11번째부터 이월 처리되고 메일에 담기지 않음
- [ ] 이월 건이 다음 날 신규 건과 함께 재정렬되어 경쟁
- [ ] 이월 건이 중복 방지 규칙에 걸려 사라지지 않음

**판단**
- [ ] 보류 사유가 3종(출판사 회신 대기 / 신규 공급 계약 진행 / 기타)으로 노출
- [ ] 제외 사유가 5종(이미 eBook 출간 예정 / 경쟁사 단독 선출간 / 제작 불가(판권 이슈) / eBook 제작 부적합 / 기타)으로 노출
- [ ] 제외 선택 시 사유 미입력이면 저장 불가
- [ ] 판단 번복 시 과거 판단이 이력으로 남고 최신 1건만 유효
- [ ] 섭외 판단 시 선출간 추적 행이 자동 생성

**담당 MD 배정**
- [ ] 관리분류 코드로 담당 MD가 자동 배정되고 메일·화면에 표시
- [ ] 매핑표를 수정하면 다음 배치부터 새 담당으로 배정
- [ ] 저장 전에는 초안만 바뀌고 실제 배정은 그대로 (되돌리기 동작)
- [ ] 분류코드 미입력·중복 시 저장 차단
- [ ] 사용 토글 OFF 시 해당 분류 상품이 미배정으로 전환
- [ ] 담당 변경 후 MD별 1일 상한·이월이 다시 계산
- [ ] 이미 추천된 건의 담당은 매핑을 바꿔도 당시 값 유지
- [ ] 매핑이 없는 분류는 "미배정"으로 표시되고 검토가 막히지 않음

**화면**
- [ ] 표지·도서명 클릭 시 상품 상세가 새 탭으로 열림
- [ ] 표지 이미지 로드 실패 시 레이아웃이 깨지지 않음
- [ ] 조건 가이드가 3열 2행으로 균등 배치(5+1로 갈라지지 않음)
- [ ] 다크모드 토글 시 모든 색·차트가 전환
- [ ] 1024/1280/1920px에서 페이지 가로 스크롤 없음
- [ ] 엑셀 다운로드가 화면 필터를 반영(우선순위·점수 컬럼 포함)
- [ ] 이력 화면에서 담당 MD 필터가 동작

---

## 16. 프로토타입 파일 맵

```
ax-poc-web/ebook_solo_pub/
├── index.html              # 4개 화면 전체 마크업 (view 전환 방식)
├── SPEC.md                 # 이 문서
└── assets/
    ├── css/style.css       # 디자인 토큰 + 공통 컴포넌트 + 페이지 전용 클래스
    └── js/
        ├── app.js          # 샘플 데이터, 렌더링, 판단 입력, 필터, 엑셀 연결
        └── xlsx.js         # 의존성 없는 XLSX 생성기 (참고용)
```

`app.js` 상단의 `REASONS` / `MD_MAP` / `CANDIDATES` / `HISTORY` / `PERF` / `RULES` 가 화면에 필요한 **데이터 계약**입니다. API 응답 스키마를 설계할 때 이 구조를 출발점으로 삼으세요.

---

## 17. 미해결 사항 (착수 전 확인 필요)

| # | 항목 | 현재 처리 | 필요 조치 |
|---|---|---|---|
| 1 | `R2` 임계값 100 vs 200 | 100으로 구현 | 사업부서 확정 |
| 2 | `R1` "상위" 기준 | 800부 | 실제 분포 확인 후 협의 |
| 3 | 셀럽 저자 판정 | 관리 테이블 수동 등록 | 초기 목록 확보 및 등록 화면 필요 여부 |
| 4 | 보류 건 재노출 | 30일 후 화면만 재노출 | 정책 확정 |
| 5 | 판권 이슈 사전 필터 | 없음 | 계약 정보 연동 가능 여부 |
| 6 | eBook 매출 연동 | 범위 외 | `EBOOK_PRE_RECO_DEAL.EBOOK_GOODS_NO` 로 2차 연결 |
| 7 | 소스 테이블 실제 스키마 | 의사 SQL | 사내 스키마 매핑 필요 |
| 8 | 우선순위 가중치·보너스 구간 | 프로토타입 값(60/50/42/32/24/14) | 운영 데이터로 튜닝 |
| 9 | MD 1일 상한 10종 | 기본 10 | 실제 처리량 확인 후 조정 |
| 10 | 이월 적체 시 처리 | 규칙 없음 | 대기 임계치 초과 시 알림·상한 상향 정책 필요 |
| 11 | '문학' 분류 코드 | 스크린샷에서 잘려 미확인 | 분류코드 확인 후 시드 보완 |
| 12 | 복수 담당 분류(만화/라이트노벨) | 표시명 문자열로 처리 | 알림 대상을 개별 사번으로 나눌지 확정 |
| 13 | 국내도서 외 상위분류 | 국내도서(001)만 매핑 | 외국도서 등 확장 여부 확인 |
