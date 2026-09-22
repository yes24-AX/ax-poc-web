/* =========================================================
   용어·산식 툴팁
   - 문구는 여기 한 곳에서 관리한다 (두 화면이 같은 말을 쓰도록)
   - 마크업에는 data-tip-key="키" 만 붙인다
   - 표 헤더·드로어처럼 overflow 로 잘리는 곳에서도 보이도록
     position:fixed 단일 박스를 JS 로 띄운다
   t = 용어 · f = 산식(모노) · d = 한 줄 설명
   ========================================================= */
const TIPS = {
  /* ---- 조회 조건 ---- */
  baseDate:  { t: '기준일 (전일)', d: '집계 대상 일자. 매일 08:00 에 전일 실적을 1회 집계합니다.' },
  cat:       { t: '대분류', d: '이벤트 등록 화면의 대분류. 고르면 같은 대분류 안에서만 백분위와 순위를 매깁니다.' },
  revWeight: { t: '매출 비중 w', f: '종합 점수 = 행동·참여 × (100 − w)% + 매출 × w%', d: '0% 가 기준안. 5% · 10% 는 순위가 어떻게 바뀌는지 보는 시험안입니다.' },
  pool:      { t: '비교 모집단', d: '백분위를 매기는 기준 집합. 운영 3일 이상이고 비교 데이터가 있는 이벤트입니다.' },

  /* ---- KPI ---- */
  running:   { t: '진행 중 이벤트', f: '시작일 ≤ 전일 ≤ 종료일', d: '종료일이 9999-12-31 인 상시 이벤트는 제외합니다.' },
  kpiUv:     { t: '전일 방문자', f: '증감 = (전일 − 최근 일평균) ÷ 최근 일평균', d: '진행 중 이벤트의 GA4 방문자 수 합계.' },
  kpiReact:  { t: '평균 반응률', f: '전체 클릭 집계 ÷ 전체 방문자 × 100', d: '이벤트에 들어온 사람 중 상품·장바구니·주문 버튼을 누른 비율.' },
  kpiBad:    { t: '개선 필요 이벤트', f: '평소 점수의 백분위 ≤ 30', d: '운영 3일 이상 대상. 표에는 평소 점수가 낮은 순 5건만 노출합니다.' },

  /* ---- 점수 ---- */
  score:     { t: '전일 점수', f: 'Σ (지표 백분위 × 비중)', d: '전일 지표로 매긴 종합 점수 0~100. 아래 「성과 n위」는 진행 중 전체 중 순위.' },
  aScore:    { t: '평소 점수', f: '같은 산식 · 비교 기간 일평균 지표', d: '운영 7일 이상은 최근 7일, 3~6일은 시작일~전일 평균. 오픈 당일은 — 로 표시.' },
  delta:     { t: '변화', f: '전일 점수 − 평소 점수 (pt)', d: '평소 대비 전일에 얼마나 올랐거나 내렸는지.' },
  pct:       { t: '백분위', d: '조회 조건 안의 이벤트를 값 순으로 줄 세운 위치. 0 = 최하위, 100 = 최상위.' },
  contrib:   { t: '기여', f: '지표 백분위 × 실제 비중 ÷ 100', d: '이 지표가 종합 점수에 보탠 점수. 모두 더하면 종합 점수가 됩니다.' },
  rank:      { t: '성과 순위', d: '전일 점수 기준 진행 중 전체 이벤트 중 순위.' },
  move:      { t: '순위 변동', d: '매출 비중 0% 기준안과 비교한 성과 순위 변화. ▲ 는 상승, ▼ 는 하락.' },

  /* ---- 지표 ---- */
  dday:      { t: '운영일차', f: '전일 − 시작일 + 1', d: 'D+1 · D+2 는 지표가 안정되지 않아 개선 필요 평가에서 제외합니다.' },
  uv:        { t: '방문자', d: 'GA4 event_visit 기준 일별 방문자 수.' },
  clk:       { t: '클릭 집계', d: 'ERCS 기준 상품 · 장바구니 · 주문 버튼 클릭 수. 구매 수량이 아닙니다.' },
  buy:       { t: '구매 집계', d: 'ERCS 구매 집계 수(orderCount). 확정 주문 건수 · 결제 금액과는 다릅니다.' },
  rr:        { t: '반응률', f: '클릭 집계 ÷ 방문자 × 100', d: '들어온 방문자가 상품에 반응한 비율.' },
  br:        { t: '구매 전환율', f: '구매 집계 ÷ 클릭 집계 × 100', d: '클릭한 뒤 구매까지 이어진 비율.' },
  cmt:       { t: '참여', d: '댓글 참여자 수(TM_EVT_CMT · 중복 제거). 댓글형 이벤트만 점수에 반영합니다.' },
  prd:       { t: '대상 상품', d: '이벤트에서 클릭 또는 구매 집계가 있는 상품 수. 상품번호로 중복 제거.' },
  low30:     { t: '하위 30% 지표', d: '평소 지표의 백분위가 30 이하인 항목. 선정 기준이 아니라 점수가 낮은 원인입니다.' },
  lowSample: { t: '표본 적음', f: '전일 클릭 집계 < 300', d: '표본이 작아 비율 지표가 크게 흔들릴 수 있습니다. 임계는 시험값.' },
  noBase:    { t: '평소 데이터 없음', d: '오픈 당일이라 비교할 과거 데이터가 없습니다.' },

  /* ---- 하위 지표 칩 (v2) ---- */
  low_uv:    { t: '유입 하위', d: '평소 방문자 수가 하위 30%. 노출·CRM·외부 유입부터 점검합니다.' },
  low_rr:    { t: '행동 반응 하위', d: '평소 반응률이 하위 30%. 들어오긴 하는데 상품을 누르지 않는 상태.' },
  low_br:    { t: '구매 전환 하위', d: '평소 구매 전환율이 하위 30%. 클릭은 있는데 구매로 이어지지 않는 상태.' },
  low_buy:   { t: '구매 규모 하위', d: '평소 구매 집계 수가 하위 30%. 유입과 전환 중 어느 쪽 문제인지 먼저 확인합니다.' },

  /* ---- 매출 (참고) ---- */
  revRef:    { t: '참고 매출', f: '구매 전환 상품 ∪ 반응 전환 상품의 매출 합계', d: '이벤트가 발생시킨 매출이 아닙니다. 0% 기준안에서는 점수에 쓰지 않습니다.' },
  revRank:   { t: '매출 순위', d: '참고 매출 기준 순위. 성과 순위와 8계단 이상 벌어지면 주황색으로 표시합니다.' },
  cost:      { t: '쿠폰·상품권 비용', d: '대상 주문 범위가 매출과 같다는 근거가 없어, 매출에서 차감하지 않고 나란히만 표시합니다.' },

  /* ---- 점수 구성 비중 (시험값) ---- */
  w_uv:      { t: '유입 · 20%', f: '방문자 수의 백분위 × 20%', d: '비중은 확정 전 시험값.' },
  w_rr:      { t: '행동 반응 · 30%', f: '반응률의 백분위 × 30%', d: '비중은 확정 전 시험값.' },
  w_br:      { t: '구매 전환 · 30%', f: '구매 전환율의 백분위 × 30%', d: '비중은 확정 전 시험값.' },
  w_buy:     { t: '구매 규모 · 10%', f: '구매 집계 수의 백분위 × 10%', d: '비중은 확정 전 시험값.' },
  w_cmt:     { t: '참여 · 10%', f: '댓글 참여자 수의 백분위 × 10%', d: '댓글형이 아니면 빼고 나머지를 100 으로 다시 맞춥니다.' },
  w_rev:     { t: '매출(참고) · w%', d: '기준안은 0%. 화면에는 보여주되 점수에는 넣지 않습니다.' },

  /* ---- 이벤트 성과 조회 화면 ---- */
  s_status:  { t: '판정', f: '4개 지표 중 하위 30% 인 개수', d: '일평균 매출 · 구매전환율 · UV · 신규 구매 고객. 2개 이상 개선 필요 / 1개 관찰 필요 / 0개 양호.' },
  s_shown:   { t: '데일리 노출', d: '데일리 리포트 TOP 5 에 뜨는지 여부와 순위.' },
  s_rev:     { t: '전일 매출 (참고)', f: '구매 전환 상품 ∪ 반응 전환 상품의 매출 합계', d: '이벤트가 발생시킨 매출이 아닙니다.' },
  s_ord:     { t: '주문건수', d: '전일 이벤트 주문 건수.' },
  s_nb:      { t: '신규 구매', d: '전일 이벤트에서 처음 구매한 고객 수.' },
  s_cvr:     { t: '구매전환율', f: '주문건수 ÷ UV × 100' },
  s_growth:  { t: '증감률', f: '(전일 매출 − 비교 일평균) ÷ 비교 일평균 × 100', d: '비교 일평균은 운영 7일 이상 최근 7일, 미만은 오픈일~전전일.' },
  s_low:     { t: '하위 30% 지표', d: '비교 기간 일평균이 조회 조건 안에서 하위 30% 인 지표.' },
  s_bad:     { t: '개선 필요 후보', f: '하위 30% 지표 ≥ 2개', d: '데일리 리포트는 이 중 부진이 큰 5건만 보여줍니다.' },
  s_watch:   { t: '관찰 필요', f: '하위 30% 지표 = 1개', d: '하나만 더 내려가면 개선 필요가 됩니다.' },
  s_ok:      { t: '양호', f: '하위 30% 지표 = 0개' },
  s_excluded:{ t: '평가 제외', d: '운영 1~2일이거나 비교할 과거 데이터가 없는 이벤트.' }
};

/* 템플릿 문자열에서 쓰는 헬퍼 — ` data-tip-key="rr"` */
function tipAttr(key) { return TIPS[key] ? ` data-tip-key="${key}"` : ''; }

(function () {
  let box = null, current = null;

  function ensure() {
    if (!box) {
      box = document.createElement('div');
      box.className = 'tipbox';
      box.setAttribute('role', 'tooltip');
      document.body.appendChild(box);
    }
    return box;
  }

  function show(target) {
    const t = TIPS[target.dataset.tipKey];
    if (!t) return;
    current = target;
    const b = ensure();
    b.innerHTML = `<div class="tip-t">${t.t}</div>`
      + (t.f ? `<div class="tip-f">${t.f}</div>` : '')
      + (t.d ? `<div class="tip-d">${t.d}</div>` : '');
    b.classList.add('on');

    // 대상 아래 중앙 → 화면 밖이면 위로, 좌우는 화면 안으로 당긴다
    const r = target.getBoundingClientRect();
    const bw = b.offsetWidth, bh = b.offsetHeight;
    let x = r.left + r.width / 2 - bw / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - bw - 8));
    // KPI 제목은 바로 아래가 숫자라 가리지 않게 위쪽을 우선한다
    const preferTop = !!target.closest('.stat-head');
    let y = preferTop ? r.top - bh - 8 : r.bottom + 8;
    if (preferTop && y < 8) y = r.bottom + 8;
    if (!preferTop && y + bh > window.innerHeight - 8) y = r.top - bh - 8;
    b.style.left = Math.round(x) + 'px';
    b.style.top = Math.round(Math.max(8, y)) + 'px';
  }

  function hide() { if (box) box.classList.remove('on'); current = null; }

  document.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-tip-key]');
    if (t && t !== current) show(t);
  });
  document.addEventListener('mouseout', e => {
    const t = e.target.closest('[data-tip-key]');
    if (t && !t.contains(e.relatedTarget)) hide();
  });
  document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip-key]'); if (t) show(t); });
  document.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
})();
