-- eBook 3사 경쟁 비교 리포트 — 데이터 이관 검증
-- 실행 순서 3 / 선행: 과거 데이터 이관 완료 후
-- 2번째 쿼리에서 2026.01 교보 164 차이가 검출되는 것이 정상이다 (Q-03 미해결 건).

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
