/* =============================================
   상품 브리핑 for MD — Mock Data (POC)
   실제 데이터 연동 전, UI 검증용 가짜 데이터
   ============================================= */

const MOCK_BRIEFINGS = {
  // 판매 호조 후 최근 급감 + 부정리뷰 상승 + 재고 소진 임박 시나리오
  "101375755": {
    basic: {
      goodsNo: "101375755",
      title: "안녕이라 그랬어",
      author: "김애란 저",
      publisher: "문학동네",
      category: "국내도서 > 소설/시 > 한국소설",
      md: "이지은",
      mdTeam: "문학 MD",
      status: "selling",          // selling | low | soldout
      statusLabel: "판매중",
      priceList: 16000,
      priceSale: 14400,
      dcRate: 10,
      point: 800,
      pointRate: 5,
      cover: "https://image.yes24.com/goods/147560984/XL",
    },

    ai: {
      generatedAt: "2026-07-07 09:12",
      model: "claude-opus-4-8",
      verdict: { level: "warn", text: "주의 필요 — 판매 모멘텀 둔화 + 재고 리스크" },
      summary:
        "출간 4주차까지 <b>일 평균 45부</b>로 견조하게 판매되며 한국소설 베스트 <b>7위</b>까지 상승했으나, " +
        "<span class=\"ai-evidence\" data-target=\"#salesSection\" data-ev=\"최근 3일 판매량 24→21→20부/일 · 전주 동일요일(화) 47부 → 20부 (-38%) · 베스트 순위 7위→11위\">" +
        "최근 3일간 판매량이 <b>일 20부 수준으로 급감</b>(전주 동일요일 대비 −38%)</span>했습니다. " +
        "같은 기간 <span class=\"ai-evidence\" data-target=\"#reviewSection\" data-ev=\"부정 리뷰 비율 12%→22% · 핵심 키워드: 파본(14) · 배송지연(9) · 인쇄품질(6)\">" +
        "<b>부정 리뷰 비율이 12% → 22%</b>로 상승</span>했고, 주요 원인은 <b>파본·배송 지연</b>으로 분석됩니다. " +
        "현재 재고(340부) 기준 <span class=\"ai-evidence\" data-target=\"#invSection\" data-ev=\"현재 재고 340부 · 최근 판매속도 42부/일 · 발주 리드타임 10일\">" +
        "<b>예상 소진일은 약 8일 후</b></span>로, 재판/발주 리드타임을 고려하면 품절 공백 가능성이 있습니다.",
      problems: [
        { text: "최근 3일 판매 급감 (일 45→20부, 전주 대비 −38%). 순위도 7위→11위 하락", sev: "high" },
        { text: "파본 관련 부정 리뷰·CS 문의 급증 — 특정 인쇄분(2쇄) 품질 이슈 의심", sev: "high" },
        { text: "재고 340부 / 예상 소진 8일 → 발주 리드타임(약 10일) 대비 품절 공백 우려", sev: "mid" },
        { text: "전환율 2.1%로 카테고리 평균(3.4%) 대비 낮음 — 상세페이지 이탈 가능성", sev: "mid" },
      ],
      // urgency: AI가 매긴 긴급도(0~100). 렌더링 시 이 값 기준으로 재정렬된다.
      actions: [
        { text: "물류팀에 2쇄 파본 검수 요청 및 재고 격리 여부 확인", owner: "MD·물류", urgency: 95 },
        { text: "재판 발주 즉시 진행(리드타임 감안 최소 500부) — 품절 공백 방지", owner: "MD", urgency: 88 },
        { text: "파본 리뷰 개별 응대 + CS 매크로 안내문 등록", owner: "CS", urgency: 70 },
        { text: "판매 회복용 쿠폰/사은품 기획전 편성 검토 (다음 주 문학 큐레이션 연계)", owner: "MD·마케팅", urgency: 45 },
      ],
    },

    // AI 브리핑 이력 (오래된→최근). 마지막 항목이 이번 주(= ai.verdict)와 일치해야 한다.
    aiHistory: [
      { date: "06-23", verdict: "good", label: "양호 — 출간 초반 판매 견조", note: "초기 판매 호조, 베스트 진입" },
      { date: "06-30", verdict: "good", label: "양호 — 베스트 상위권 안착", note: "7위까지 상승, 리뷰 지표 안정적" },
      { date: "07-07", verdict: "warn", label: "주의 필요 — 판매 모멘텀 둔화 + 재고 리스크", note: "최근 3일 판매 급감·파본 CS 급증이 새로 감지됨" },
    ],

    // 저자 다른 작품 · 연관 도서 판매 동향
    seriesWorks: {
      authorLabel: "김애란 · 연관 도서",
      aiNote: "「바깥은 여름」이 이번 주 함께 상승 중입니다 — 신간 이벤트와 연계한 저자 컬렉션 프로모션을 고려해볼 만합니다.",
      items: [
        { title: "바깥은 여름", tag: "저자 최신작", trend: "up", trendPct: 18, rank: 15, cover: "https://image.yes24.com/goods/26075504/XL" },
        { title: "비행운", tag: "저자 대표작", trend: "flat", trendPct: 2, rank: 58, cover: "https://image.yes24.com/goods/5017910/XL" },
        { title: "달려라, 아비", tag: "저자 대표작", trend: "down", trendPct: -6, rank: 120, cover: "https://image.yes24.com/goods/2160070/XL" },
      ],
    },

    // 팀/카테고리 평균 대비 포지셔닝
    positioning: {
      mdPortfolio: { total: 42, rank: 3, basis: "최근 7일 판매 급감폭 기준 · 담당 42종 중" },
      categoryPercentile: { rank: 11, total: 320, percentile: 96 },
      vsAvg: [
        { label: "판매량 지수 (최근 14일)", value: 63, avg: 100, unit: "" },
        { label: "평점", value: 8.6, avg: 8.9, unit: "" },
        { label: "전환율 (CVR)", value: 2.1, avg: 3.4, unit: "%" },
      ],
    },

    sales: {
      // 최근 14일 (오래된→최근)
      days: ["06-24","06-25","06-26","06-27","06-28","06-29","06-30","07-01","07-02","07-03","07-04","07-05","07-06","07-07"],
      qty:  [38, 44, 51, 47, 55, 62, 58, 49, 46, 44, 42, 24, 21, 20],
      prevWeekQty: [30, 35, 40, 39, 44, 50, 47, 38, 44, 51, 47, 55, 62, 58], // 전주 동일 구간(비교용)
      revenue: 8_640_000,      // 최근 14일 매출
      orders: 601,             // 최근 14일 주문건
      cancel: 18,
      refund: 11,
      avg7: 32.3,              // 최근 7일 평균 판매량
      avg7Prev: 49.9,         // 직전 7일 평균
      // 전주 동일 요일(화요일) 비교
      sameWeekday: { label: "화요일", current: 20, prev: 47 },
    },

    rank: {
      // 한국소설 베스트 순위 추이 (낮을수록 상위)
      days: ["W1","W2","W3","W4","07-05","07-06","07-07"],
      value: [23, 14, 9, 7, 8, 10, 11],
      current: 11,
      best: 7,
      category: "국내도서 · 한국소설",
    },

    inventory: {
      current: 340,
      velocity: 42,           // 최근 판매속도 (부/일, 최근 7일 기준 보정)
      inbound: 0,             // 입고 예정
      // AI 예측
      predictSelloutDays: 8,
      predictSelloutDate: "2026-07-15",
      leadTime: 10,
      risk: "품절 공백 우려",
    },

    review: {
      ratingNow: 8.6,         // 10점 만점
      ratingPrev: 9.1,
      trend: [9.3, 9.2, 9.1, 9.0, 8.8, 8.7, 8.6],  // 최근 7주/구간
      count7: 34,
      count30: 156,
      negRatio: 22,           // %
      negRatioPrev: 12,
      keywords: [
        { word: "파본", cnt: 14 },
        { word: "배송지연", cnt: 9 },
        { word: "인쇄품질", cnt: 6 },
        { word: "가격", cnt: 4 },
      ],
      compare: { rating7: 8.3, rating30: 8.9, neg7: 27, neg30: 16 },
    },

    events: [
      { type: "coupon", name: "여름 문학 10% 중복쿠폰", period: "~07-14", tag: "쿠폰", live: true },
      { type: "gift", name: "김애란 친필 엽서 (선착순 300)", period: "소진시 마감", tag: "사은품", live: true, stock: "잔여 41" },
      { type: "event", name: "이 달의 한국소설 기획전 노출", period: "07-01~07-31", tag: "기획전", live: true },
      { type: "event", name: "예스24 X 문학동네 북토크 응모", period: "~07-20", tag: "이벤트", live: false },
    ],

    aux: {
      pv: 12840,
      pvDelta: -14,          // %
      cvr: 2.1,              // %
      cvrAvg: 3.4,
      cart: 486,
      cartDelta: -8,
      searchImp: 9210,
      searchDelta: 5,
      cs: 23,
      csDelta: 62,          // % 급증
    },
  },
};

// 샘플 칩에 노출할 상품들
const SAMPLE_GOODS = [
  { no: "101375755", name: "안녕이라 그랬어" },
];
