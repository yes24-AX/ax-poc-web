// ============================================================
// data.js — 데이터센터의 지리와 대사를 한곳에 모아 둔다.
// 좌표(z)는 월드 픽셀. 카메라는 +z에서 출발해 -z 방향으로 나아간다.
// ============================================================

/** 구역 중심 z 좌표 */
export const ZONE = {
  ENTRY: -700,
  MSTR: -2600,
  CLICK: -4400,
  UNIFY: -6500,
  PERF: -9100,
  DASH: -11400,
};

/** 복도 치수 */
export const HALL = {
  wallX: 300,      // 좌우 랙이 서 있는 x
  floorY: 300,     // 바닥 높이 (y는 아래가 +)
  ceilY: -320,     // 천장 높이
  rackFrom: 500,   // 랙이 시작되는 z
  rackTo: -7600,   // 랙이 끝나는 z
  rackStep: 420,
};

/** 공간에 떠 있는 대형 구역 표지 (카메라가 통과한다) */
export const SIGNS = [
  { z: -1800,  no: '01', word: 'MSTR',        sub: '매출 · 재고 · 발주 · 상품권', color: 'var(--c-mstr)' },
  { z: -3800,  no: '02', word: 'CLICKSTREAM', sub: '행동 데이터',                color: 'var(--c-click)' },
  { z: -5900,  no: '03', word: 'UNIFY',       sub: 'GA4 · 클릭스트림 · 매출',    color: 'var(--c-unify)' },
  { z: -8100,  no: '04', word: 'PERFORMANCE', sub: '유입에서 매출까지',          color: 'var(--c-perf)' },
  { z: -10500, no: '05', word: 'DASHBOARD',   sub: '지표와 이상 징후',           color: '#60a5fa' },
];

/** MSTR 구역에서 실제로 데이터를 꺼내는 랙 (스캔 대상) */
export const DATA_RACKS = [
  { z: -2150, side: -1, tag: '매출',   records: 4820000 },
  { z: -2570, side: 1,  tag: '재고',   records: 824180 },
  { z: -2990, side: -1, tag: '발주',   records: 313400 },
  { z: -3410, side: 1,  tag: '상품권', records: 186200 },
];

/** 클릭스트림 구역의 세션 경로 */
export const HOPS = ['홈', '검색', '상품 상세', '장바구니', '주문'];

/** 성과 측정 구역의 퍼널 게이트 (카메라가 통과한다) */
export const GATES = [
  { z: -8600, w: 660, h: 440, label: '이벤트 유입', val: '412,800' },
  { z: -9000, w: 540, h: 372, label: '상품 클릭',   val: '96,430' },
  { z: -9400, w: 430, h: 306, label: '주문',        val: '12,870' },
  { z: -9800, w: 336, h: 244, label: '매출',        val: '₩1.24B' },
];

/** 대시보드 홀의 패널 */
// 도착 지점(카메라 z ≈ -11000)에서 화면 좌우를 감싸도록 배치.
// 가까운 패널일수록 원근으로 커지므로 더 바깥으로 밀어, 중앙 문구 자리를 비운다.
export const BOARDS = [
  { x: -680, y: -165, z: -11350, ry: 17,  title: '통합 매출',   note: 'Today',   value: '₩1.24B', delta: '▲ 18%', bars: true },
  { x: 680,  y: -140, z: -11350, ry: -17, title: '주문 전환율', note: '7일 평균', value: '3.12%',  delta: '▲ 0.4p', bars: true },
  { x: -800, y: 150,  z: -11680, ry: 22,  title: '세션',        note: 'MAU',     value: '412,800', delta: '▲ 11%', bars: true },
  { x: 800,  y: 128,  z: -11680, ry: -22, title: '이상 징후',   note: '자동 감지', value: '2건',    delta: '',      alert: true },
];

/**
 * 모바일은 화각(perspective 680)과 화면 폭이 달라 위 좌표를 그대로 쓰면
 * 패널이 전부 화면 밖으로 나간다. 더 멀리 두어 작게 만들고,
 * 위·아래로 벌려 가운데 문구 자리를 비운다.
 */
export const BOARDS_MOBILE = [
  { x: -230, y: -300, z: -11750, ry: 17 },
  { x: 230,  y: -275, z: -11750, ry: -17 },
  { x: -280, y: 280,  z: -12100, ry: 22 },
  { x: 280,  y: 255,  z: -12100, ry: -22 },
];

/**
 * 장면 구성
 *   scan   : HUD 스캐너에 표시할 내용
 *   lock   : 리티클이 고정될 화면 위치(%)와 꼬리표 (null이면 숨김)
 *   dur    : 장면 길이(초, 1× 기준)
 */
export const ACTS = [
  {
    key: 'entry',
    chapter: '진입',
    eyebrow: 'AX DataHub',
    title: '데이터를 찾아<br />데이터센터로',
    body: '사내 여러 시스템에 흩어져 있는 데이터.<br />그 데이터가 실제로 놓여 있는 곳부터 들어갑니다.',
    accent: '#38bdf8',
    scan: { mode: 'BOOTING', target: '복도 진입 · COLD AISLE', count: 0 },
    lock: null,
    hot: [],
    dur: 5.0,
  },
  {
    key: 'mstr',
    chapter: 'MSTR',
    eyebrow: '01 — 데이터 연동',
    title: 'MSTR 랙에서<br />원천을 꺼냅니다',
    body: '매출 · 재고 · 발주 · 상품권.<br />네 개의 원천 데이터를 랙에서 그대로 끌어옵니다.',
    accent: '#3b82f6',
    // 아래 count는 찾아낸 레코드의 "누적"이다 (DATA_RACKS 4종 합계)
    scan: { mode: 'SCANNING', target: 'MSTR / 매출 · 재고 · 발주 · 상품권', count: 6143780 },
    lock: { x: 30, y: 48, size: 190, tag: 'MSTR RACK' },
    hot: ['매출', '재고', '발주', '상품권'],
    dur: 8.2,
  },
  {
    key: 'click',
    chapter: '클릭스트림',
    eyebrow: '02 — 행동 데이터',
    title: '고객이 지나간 길이<br />복도에 떠오릅니다',
    body: '클릭스트림 로그를 세션 단위로 이어 붙여<br />유입부터 주문까지의 경로를 그대로 시각화합니다.',
    accent: '#a855f7',
    scan: { mode: 'TRACING', target: 'CLICKSTREAM / SESSION PATH', count: 9572680 },
    lock: { x: 52, y: 42, size: 220, tag: 'SESSION PATH' },
    hot: [],
    dur: 7.4,
  },
  {
    key: 'unify',
    chapter: '통합',
    eyebrow: '03 — 통합 분석',
    title: '서로 다른 데이터가<br />한 축에서 만납니다',
    body: 'GA4 · 클릭스트림 · 매출을 같은 세션과 같은 시간축에 정렬해<br />하나의 질문으로 답을 얻습니다.',
    accent: '#14b8a6',
    scan: { mode: 'JOINING', target: 'GA4 ⨝ CLICKSTREAM ⨝ SALES', count: 12486120 },
    lock: { x: 42, y: 46, size: 240, tag: 'JOIN CORE' },
    hot: [],
    dur: 7.4,
  },
  {
    key: 'perf',
    chapter: '성과',
    eyebrow: '04 — 성과 측정',
    title: '이벤트가 매출까지<br />얼마나 이어졌나',
    body: '이벤트 유입 · 상품 클릭 · 주문 · 매출.<br />네 개의 관문을 지나며 성과가 숫자로 남습니다.',
    accent: '#f59e0b',
    scan: { mode: 'MEASURING', target: 'FUNNEL / 유입 → 클릭 → 주문 → 매출', count: 12898920 },
    lock: { x: 50, y: 48, size: 260, tag: 'FUNNEL GATE' },
    hot: [],
    dur: 7.8,
  },
  {
    key: 'dash',
    chapter: '대시보드',
    eyebrow: '05 — 모니터링',
    title: '찾아온 데이터가<br />한 화면에 모입니다',
    body: '주요 지표는 대시보드로 상시 제공하고,<br />평소 범위를 벗어난 변화는 즉시 알립니다.',
    accent: '#3b82f6',
    scan: { mode: 'COMPLETE', target: 'AX DATAHUB / LIVE DASHBOARD', count: 12898920 },
    lock: null,
    hot: [],
    dur: 8.2,
  },
];
