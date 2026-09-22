/* =========================================================
   이벤트 데일리 성과 리포트 v2 — 종합 점수 기준
   근거: 「클릭·구매 상품 매출의 성과 평가 적용안」
     · 매출을 보여주는 것과 매출로 순위를 정하는 것을 구분한다
     · 종합 점수 = 행동·참여 지표 (100 − w)% + 클릭·구매 상품 매출(참고) w%
     · w = 0% 기준안 / 5% · 10% 시험안 — 같은 표본에 나란히 적용해 순위 변화를 본다
     · 지표 → 점수 변환은 백분위로 고정 (비중 변경의 영향만 비교하기 위해)
   샘플 이벤트·집계 함수·드로어 셸은 common.js 를 그대로 쓴다.
   ========================================================= */

/* ---------------------------------------------------------
   v2 행동 지표 (샘플)
   rr  : 전일 반응률 %      = 클릭 집계 ÷ 방문자   (상품·장바구니·주문 버튼 클릭)
   br  : 전일 구매 전환율 % = 구매 집계 ÷ 클릭 집계
   aRr / aBr : 비교 기간 일평균
   cmt / aCmt: 댓글 참여자 수 (댓글형 이벤트만, 아니면 null)
   prd : 대상 상품 수 (클릭 또는 구매 집계가 있는 상품, 중복 제거)
   cost: 쿠폰·상품권 비용 — 별도 표시용, 매출에서 차감하지 않는다
   --------------------------------------------------------- */
const V2 = {
  EV24091: { rr: 31, br:  9.5, aRr: 29, aBr:  9.0, cmt: null, aCmt: null, prd:  46, cost:       0 },
  EV24102: { rr: 27, br:  8.2, aRr: 26, aBr:  8.0, cmt: null, aCmt: null, prd:  18, cost:       0 },
  EV23887: { rr: 19, br:  6.0, aRr: 20, aBr:  6.2, cmt:   84, aCmt:   90, prd:  32, cost:       0 },
  EV24140: { rr: 24, br:  7.4, aRr: 23, aBr:  7.1, cmt: null, aCmt: null, prd:  25, cost: 1240000 },
  EV24118: { rr: 22, br:  4.1, aRr: 22, aBr:  4.4, cmt:  312, aCmt:  298, prd:  20, cost:       0 },
  EV23801: { rr: 26, br:  8.8, aRr: 25, aBr:  8.5, cmt: null, aCmt: null, prd:  40, cost:       0 },
  EV24177: { rr: 33, br: 10.2, aRr: 32, aBr:  9.8, cmt: null, aCmt: null, prd:  12, cost:       0 },
  EV24156: { rr: 28, br: 11.5, aRr: 27, aBr: 11.0, cmt: null, aCmt: null, prd:  22, cost:  380000 },
  EV24095: { rr:  9, br:  3.2, aRr: 10, aBr:  3.4, cmt: null, aCmt: null, prd:  28, cost:       0 },
  EV23412: { rr:  7, br:  3.0, aRr:  8, aBr:  3.2, cmt: null, aCmt: null, prd:  35, cost:       0 },
  EV24182: { rr: 21, br:  6.1, aRr: 19, aBr:  5.6, cmt:  640, aCmt:  410, prd:   8, cost: 1500000 },
  EV24190: { rr: 12, br:  4.0, aRr: 11, aBr:  3.8, cmt: null, aCmt: null, prd: 120, cost:       0 },
  EV24108: { rr: 23, br:  7.0, aRr: 23, aBr:  7.2, cmt: null, aCmt: null, prd:  30, cost:       0 },
  EV24149: { rr: 36, br:  9.0, aRr: 27, aBr:  7.5, cmt: null, aCmt: null, prd:  24, cost:       0 },
  EV23902: { rr: 17, br:  5.0, aRr: 18, aBr:  5.2, cmt: null, aCmt: null, prd:  16, cost:       0 },
  EV24126: { rr: 11, br:  3.5, aRr: 12, aBr:  3.8, cmt: null, aCmt: null, prd:  19, cost:       0 },
  EV24168: { rr: 38, br: 10.5, aRr: 26, aBr:  7.0, cmt:  150, aCmt:   80, prd:  14, cost:       0 },
  EV23776: { rr: 10, br:  4.5, aRr: 11, aBr:  4.6, cmt: null, aCmt: null, prd:  22, cost:       0 },
  EV24099: { rr:  8, br:  3.0, aRr:  9, aBr:  3.1, cmt:   22, aCmt:   25, prd:  15, cost:       0 },
  EV24113: { rr: 14, br: 12.0, aRr: 15, aBr: 12.5, cmt: null, aCmt: null, prd:  60, cost: 2100000 },
  EV24101: { rr:  9, br:  2.8, aRr: 10, aBr:  3.0, cmt: null, aCmt: null, prd:  18, cost:       0 },
  EV23855: { rr:  6, br:  2.5, aRr:  7, aBr:  2.6, cmt: null, aCmt: null, prd:  26, cost:       0 },
  EV24185: { rr: 18, br:  6.5, aRr: 18, aBr:  6.4, cmt: null, aCmt: null, prd:  21, cost:       0 },
  EV24193: { rr: 30, br:  8.5, aRr: 22, aBr:  6.0, cmt: null, aCmt: null, prd:  17, cost:       0 },
  EV24201: { rr: 25, br:  6.0, aRr:  0, aBr:  0,   cmt:   95, aCmt: null, prd:  11, cost:       0 },
  EV24202: { rr: 20, br:  5.5, aRr:  0, aBr:  0,   cmt: null, aCmt: null, prd:   9, cost:       0 },
  EV23830: { rr:  5, br:  3.0, aRr:  6, aBr:  3.2, cmt: null, aCmt: null, prd:  24, cost:       0 },
  EV24172: { rr: 32, br:  8.0, aRr: 25, aBr:  6.5, cmt: null, aCmt: null, prd:  10, cost:       0 },
  EV24139: { rr: 29, br:  3.0, aRr: 28, aBr:  3.1, cmt: null, aCmt: null, prd:  33, cost:       0 },
  EV23891: { rr: 26, br:  9.5, aRr: 25, aBr:  9.2, cmt: null, aCmt: null, prd:  20, cost:       0 },
  EV24220: { rr: 16, br:  6.0, aRr: 17, aBr:  6.2, cmt: null, aCmt: null, prd:  12, cost:       0 },
  EV24225: { rr: 22, br:  7.0, aRr: 20, aBr:  6.4, cmt: null, aCmt: null, prd:  27, cost:       0 },
  EV24210: { rr: 21, br:  8.0, aRr: 20, aBr:  7.8, cmt: null, aCmt: null, prd:  36, cost:       0 },
  EV24215: { rr: 42, br: 11.0, aRr: 33, aBr:  9.0, cmt:  880, aCmt:  520, prd:   6, cost:       0 },
  EV23940: { rr: 10, br:  3.8, aRr: 11, aBr:  4.0, cmt: null, aCmt: null, prd:  29, cost:       0 },
  EV24188: { rr: 27, br:  9.0, aRr: 26, aBr:  8.6, cmt: null, aCmt: null, prd:  23, cost:       0 },
  EV24205: { rr: 24, br:  7.5, aRr: 20, aBr:  6.5, cmt: null, aCmt: null, prd:  31, cost:       0 },
  EV23915: { rr:  8, br:  3.5, aRr:  9, aBr:  3.6, cmt: null, aCmt: null, prd:  44, cost:       0 }
};

/* ---------------------------------------------------------
   점수 구성 — 행동·참여 지표의 상대 비중 (합 100)
   기획 문서상 이 비중은 '남은 결정'이라 아래 값은 시험값이다.
   매출 비중 w 를 주면 이 묶음 전체가 (100 − w)% 로 비례 축소된다.
   --------------------------------------------------------- */
const COMPONENTS = [
  { key: 'uv',  label: '유입',      desc: '방문자 수 (GA4)',                                  w: 20, fmt: v => fmtNum(Math.round(v)) + '명' },
  { key: 'rr',  label: '행동 반응', desc: '반응률 = 클릭 집계 ÷ 방문자 · 상품/장바구니/주문 버튼 클릭', w: 30, fmt: v => v.toFixed(1) + '%' },
  { key: 'br',  label: '구매 전환', desc: '구매 전환율 = 구매 집계 ÷ 클릭 집계',              w: 30, fmt: v => v.toFixed(1) + '%' },
  { key: 'buy', label: '구매 규모', desc: '구매 집계 수',                                     w: 10, fmt: v => fmtNum(Math.round(v)) + '건' },
  { key: 'cmt', label: '참여',      desc: '댓글 참여자 수 · 댓글형 이벤트만 (해당 없으면 제외 후 재정규화)', w: 10, fmt: v => fmtNum(Math.round(v)) + '명' }
];

/* 개선 필요 판정에 쓰는 핵심 4지표 — 참여는 댓글형만 있어 판정에서 뺀다 */
const JUDGE_KEYS = ['uv', 'rr', 'br', 'buy'];

const V2_ACTIONS = {
  uv: {
    label: '유입 하위', short: '유입',
    steps: ['내부 핵심 구좌 노출 확대', 'CRM / 푸시 발송 대상 추가', '배너·카피 교체 후 검색·SNS 등 외부 유입 확대']
  },
  rr: {
    label: '행동 반응 하위', short: '반응',
    steps: ['들어온 방문자가 상품을 누르지 않는 상태 — 헤드카피와 첫 화면 구성부터 점검',
            '상품 큐레이션 재배치 — 반응 있는 상품을 상단으로', '대상 상품 수가 과다하면 핵심 상품 위주로 압축']
  },
  br: {
    label: '구매 전환 하위', short: '전환',
    steps: ['혜택 경쟁력 점검 — 타 이벤트 대비 할인·적립이 충분한가', 'CTA · 장바구니 · 주문 버튼 동선 개선',
            "클릭은 있는데 구매가 없으면 '구매할 이유'가 명확한지부터 확인"]
  },
  buy: {
    label: '구매 규모 하위', short: '구매',
    steps: ['유입과 구매 전환율을 우선 확인', '유입이 낮으면 유입 확대, 전환이 낮으면 이벤트 기획 개선',
            '둘 다 낮으면 혜택·카피·상품 구성을 포함한 이벤트 전면 개편']
  }
};

const LOW_SAMPLE_CLICKS = 300;   // 전일 클릭 집계가 이보다 적으면 '표본 적음' 표기 (시험 임계)

const V2STATE = { revWeight: 0, byId: {}, poolSize: 0, baseDate: BASE_DATE };

/* ---------------------------------------------------------
   집계
   --------------------------------------------------------- */
function weightedScore(pcts, revPct, revWeight) {
  // 댓글형이 아니면 참여 지표를 빼고 나머지 비중을 100으로 다시 맞춘다
  const used = COMPONENTS.filter(c => pcts[c.key] !== null && pcts[c.key] !== undefined);
  const sumW = used.reduce((s, c) => s + c.w, 0) || 1;
  const base = used.reduce((s, c) => s + (c.w / sumW) * pcts[c.key], 0);
  return base * (1 - revWeight / 100) + (revPct ?? 0) * (revWeight / 100);
}

function pctOf(list, valueOf) {
  const m = percentileMap(list, valueOf);
  return id => (m.has(id) ? m.get(id) : null);
}

function buildV2(baseDate, cat, field, md, revWeight) {
  const r = buildReport(baseDate, cat, field, md);   // 운영일차·비교 데이터 여부는 v1 과 같은 규칙

  const running = r.running.map(e => {
    const m = V2[e.id];
    const clk  = Math.round(e.uv * m.rr / 100);
    const buy  = Math.round(clk * m.br / 100);
    const aClk = Math.round(e.aUv * m.aRr / 100);
    const aBuy = Math.round(aClk * m.aBr / 100);
    return { ...e, ...m, clk, buy, aClk, aBuy, isComment: m.cmt !== null };
  });

  // ---- 전일 점수: 진행 중 전체 안에서 백분위
  const cmtPool = running.filter(e => e.isComment);
  const P = {
    uv:  pctOf(running, e => e.uv),
    rr:  pctOf(running, e => e.rr),
    br:  pctOf(running, e => e.br),
    buy: pctOf(running, e => e.buy),
    cmt: pctOf(cmtPool, e => e.cmt),
    rev: pctOf(running, e => e.rev)
  };
  running.forEach(e => {
    e.pct2 = { uv: P.uv(e.id), rr: P.rr(e.id), br: P.br(e.id), buy: P.buy(e.id), cmt: e.isComment ? P.cmt(e.id) : null };
    e.revPct = P.rev(e.id);
    e.score  = weightedScore(e.pct2, e.revPct, revWeight);
    e.score0 = weightedScore(e.pct2, e.revPct, 0);          // 0% 기준안 — 순위 변동 비교용
  });

  // ---- 평소 점수: 비교 데이터가 있는 이벤트끼리, 비교 기간 일평균으로 백분위
  const based = running.filter(e => e.hasBase);
  const cmtBased = based.filter(e => e.isComment && e.aCmt !== null);
  const A = {
    uv:  pctOf(based, e => e.aUv),
    rr:  pctOf(based, e => e.aRr),
    br:  pctOf(based, e => e.aBr),
    buy: pctOf(based, e => e.aBuy),
    cmt: pctOf(cmtBased, e => e.aCmt),
    rev: pctOf(based, e => e.aRev),
    clk: pctOf(based, e => e.aClk)
  };
  based.forEach(e => {
    e.aPct2 = { uv: A.uv(e.id), rr: A.rr(e.id), br: A.br(e.id), buy: A.buy(e.id), cmt: (e.isComment && e.aCmt !== null) ? A.cmt(e.id) : null };
    e.aScore = weightedScore(e.aPct2, A.rev(e.id), revWeight);
    e.delta = e.score - e.aScore;
    e.aClkPct = A.clk(e.id);
  });

  // 하위 30% 지표 — 선정 기준이 아니라 '왜 점수가 낮은지' 설명용. 평소 지표 기준으로 통일
  based.forEach(e => { e.low2 = JUDGE_KEYS.filter(k => e.aPct2[k] <= LOWER_PCT); });

  // ---- 세 리스트 모두 같은 종합 점수에서 나온다
  //   전일 성과 = 전일 점수 상위 / 전일 성장 = 전일 − 평소 상승폭 / 개선 필요 = 평소 점수 하위
  // ---- 개선 필요: 운영 3일 이상 · 평소 종합 점수가 하위 30%
  const evaluable = based.filter(e => e.days >= MIN_DAYS);
  const aScorePct = pctOf(evaluable, e => e.aScore);
  evaluable.forEach(e => { e.aScorePct = aScorePct(e.id); });
  const badCandidates = evaluable.filter(e => e.aScorePct <= LOWER_PCT).sort((a, b) => a.aScore - b.aScore);
  const badTop = badCandidates.slice(0, 5);

  // ---- 전일 성장: 평소 점수 대비 상승폭 · 평소 클릭 집계 하위 30%는 제외(극소 표본 왜곡 방지)
  const growTop = based.filter(e => e.aClkPct > LOWER_PCT).sort((a, b) => b.delta - a.delta).slice(0, 5);

  // ---- 전일 성과: 전일 종합 점수 상위
  const byScore  = [...running].sort((a, b) => b.score - a.score);
  const byScore0 = [...running].sort((a, b) => b.score0 - a.score0);
  const byRev    = [...running].sort((a, b) => b.rev - a.rev);
  running.forEach(e => {
    e.rank  = byScore.indexOf(e) + 1;
    e.rank0 = byScore0.indexOf(e) + 1;
    e.revRank = byRev.indexOf(e) + 1;
  });
  const scoreTop = byScore.slice(0, 5);

  return { running, based, evaluable, excluded: running.filter(e => !evaluable.includes(e)), badCandidates, badTop, growTop, scoreTop };
}

/* ---------------------------------------------------------
   렌더 — 표
   --------------------------------------------------------- */
/* 세 표가 같은 컬럼을 쓴다 — 전일 점수 · 평소 점수 · 변화를 항상 함께 보여주고,
   각 리스트가 정렬에 쓰는 컬럼만 강조한다 (sortKey: 'score' | 'aScore' | 'delta') */
function scoreCells(e, sortKey) {
  const hl = k => (k === sortKey ? ' sort-col' : '');
  const w = V2STATE.revWeight;
  let move = '';
  if (w) {
    const d = e.rank0 - e.rank;
    move = d > 0 ? ` <span class="rank-move up" data-tip-key="move">▲${d}</span>` : d < 0 ? ` <span class="rank-move down" data-tip-key="move">▼${-d}</span>` : '';
  }
  const none = '<span class="dim-cell" data-tip-key="noBase">—</span>';
  const delta = e.hasBase
    ? `<span class="delta ${e.delta > 0.5 ? 'up' : e.delta < -0.5 ? 'down' : 'flat'}">${e.delta > 0 ? '+' : ''}${e.delta.toFixed(1)}</span>`
    : none;
  return `
    <td class="num${hl('score')}"><span class="score-num">${e.score.toFixed(1)}</span><span class="rev-rank"><span data-tip-key="rank">성과 ${e.rank}위</span>${move}</span></td>
    <td class="num${hl('aScore')}">${e.hasBase ? `<span class="score-num">${e.aScore.toFixed(1)}</span>` : none}</td>
    <td class="num${hl('delta')}">${delta}</td>`;
}

function v2Cells(e, sortKey) {
  const gap = Math.abs(e.revRank - e.rank) >= 8;   // 매출 순위와 성과 순위가 크게 다르면 강조
  const lows = e.low2 && e.low2.length
    ? `<div class="reasons">${e.low2.map(k => `<span class="reason-chip" data-tip-key="low_${k}">${V2_ACTIONS[k].short}</span>`).join('')}</div>`
    : '<span class="dim-cell">—</span>';
  return `
    <td class="nowrap">${esc(e.md)}</td>
    <td class="nowrap">${esc(e.f)}<div class="cat-sub">${esc(e.c)}</div></td>
    <td>
      <div class="ev-name">
        <span class="txt" title="${esc(e.n)} — 클릭 시 이벤트 상세" data-ev="${esc(e.id)}">${esc(e.n)}</span>
        <a class="ev-link" href="#" title="이벤트 랜딩 바로가기 (${esc(e.id)})" aria-label="이벤트 랜딩 바로가기" data-link="1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div class="ev-sub">${esc(e.id)} · <span data-tip-key="prd">대상 상품 ${fmtNum(e.prd)}종</span>${e.clk < LOW_SAMPLE_CLICKS ? '<span class="low-sample" data-tip-key="lowSample">표본 적음</span>' : ''}</div>
    </td>
    <td class="dday">D+${e.days}</td>
    ${scoreCells(e, sortKey)}
    <td class="num">${fmtNum(e.uv)}</td>
    <td class="num">${fmtNum(e.clk)}</td>
    <td class="num">${fmtNum(e.buy)}</td>
    <td class="num">${e.rr.toFixed(1)}%</td>
    <td class="num">${e.br.toFixed(1)}%</td>
    <td class="num rev-ref">${fmtWon(e.rev)}<span class="rev-rank ${gap ? 'gap' : ''}" data-tip-key="revRank">매출 ${e.revRank}위</span></td>
    <td>${lows}</td>`;
}

function v2Rank(i) {
  return `<td><span class="rank-badge ${i === 0 ? 'r1' : ''}">${i + 1}</span></td>`;
}

function v2Table(list, tbodyId, emptyId, badgeId, sortKey, emptyTitle, emptyDesc) {
  const tb = $(tbodyId);
  $(badgeId).textContent = list.length + '건';
  tb.closest('.tbl-wrap').classList.toggle('hidden', !list.length);
  if (!list.length) { tb.innerHTML = ''; $(emptyId).innerHTML = emptyBox(emptyTitle, emptyDesc); return; }
  $(emptyId).innerHTML = '';
  tb.innerHTML = list.map((e, i) => `<tr class="data-row">${v2Rank(i)}${v2Cells(e, sortKey)}</tr>`).join('');
  tb.querySelectorAll('[data-link]').forEach(a => a.addEventListener('click', ev => ev.preventDefault()));
}

/* ---------------------------------------------------------
   렌더 — KPI · 퍼널 · 안내
   --------------------------------------------------------- */
function renderV2Kpi(r) {
  const run = r.running;
  const uv = run.reduce((s, e) => s + e.uv, 0), aUv = run.reduce((s, e) => s + e.aUv, 0);
  const clk = run.reduce((s, e) => s + e.clk, 0), buy = run.reduce((s, e) => s + e.buy, 0);
  const diff = aUv ? ((uv - aUv) / aUv) * 100 : 0;

  $('#kpiRunning').innerHTML = fmtNum(run.length) + '<span class="unit">건</span>';
  $('#kpiRunningSub').textContent = `평가 대상 ${r.evaluable.length}건 · 운영 1~2일 등 제외 ${r.excluded.length}건`;

  $('#kpiUv').innerHTML = fmtNum(uv) + '<span class="unit">명</span>';
  const d = $('#kpiUvDelta');
  d.className = 'delta ' + (diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat');
  d.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
  $('#kpiUvSub').textContent = `최근 일평균 합계 ${fmtNum(aUv)}명 대비`;

  $('#kpiReact').innerHTML = (uv ? (clk / uv) * 100 : 0).toFixed(1) + '<span class="unit">%</span>';
  $('#kpiReactSub').textContent = `클릭 집계 ${fmtNum(clk)} · 구매 집계 ${fmtNum(buy)} · 구매 전환 ${(clk ? (buy / clk) * 100 : 0).toFixed(1)}%`;

  $('#kpiBad').innerHTML = fmtNum(r.badCandidates.length) + '<span class="unit">건</span>';
  $('#kpiBadSub').textContent = `평소 종합 점수 하위 30% · 부진 상위 ${r.badTop.length}건 노출`;
}

function renderV2Funnel(r) {
  const steps = [
    { k: '① 집계 대상 추출', v: r.running.length, d: '시작일 ≤ 전일 ≤ 종료일 · 상시(9999-12-31) 이벤트 제외' },
    { k: '② 운영 기간 확인', v: r.evaluable.length, d: `시작 후 3일 이상 경과 · 제외 ${r.excluded.length}건` },
    { k: '③ 평소 종합 점수 산출', v: r.evaluable.length, d: '비교 기간 일평균 지표 → 백분위 × 비중 (매출 0% 기준안)' },
    { k: '④ 하위 30% 판정', v: r.badCandidates.length, d: '평소 종합 점수가 평가 대상 중 하위 30%' },
    { k: '⑤ 최종 노출', v: r.badTop.length, d: '평소 종합 점수가 낮은 순 최대 5건', last: true }
  ];
  const arrow = `<div class="funnel-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  $('#funnel').innerHTML = steps.map(s => `
    <div class="funnel-step ${s.last ? 'last' : ''}">
      <div class="fs-k">${s.k}</div>
      <div class="fs-v">${fmtNum(s.v)}<span class="unit">${s.unit || '건'}</span></div>
      <div class="fs-d">${s.d}</div>
    </div>`).join(arrow);

  const ex = r.excluded;
  $('#excludedNote').innerHTML = ex.length
    ? `<b>평가 제외 ${ex.length}건</b> — ${ex.map(e => `${esc(e.n)}(D+${e.days})`).join(' · ')} : 운영 1~2일이거나 비교 가능한 과거 데이터가 없어 개선 필요 평가에서 제외됩니다. 전일 성과 TOP 5에는 포함됩니다.`
    : '평가 제외 대상이 없습니다.';
}

function renderWeights() {
  const w = V2STATE.revWeight;
  const rows = COMPONENTS.map(c => `
    <div class="weight-row">
      <span class="wl" data-tip-key="w_${c.key}">${c.label}</span>
      <span class="wd">${c.desc}</span>
      <span class="ww">${(c.w * (100 - w) / 100).toFixed(c.w * (100 - w) % 100 ? 1 : 0)}%</span>
    </div>`).join('');
  $('#weightRows').innerHTML = rows + `
    <div class="weight-row rev-row">
      <span class="wl" data-tip-key="w_rev">매출(참고)</span>
      <span class="wd">클릭·구매 상품 매출 — ${w ? `시험안 ${w}% 반영 중` : '화면에는 표시하되 점수에는 반영하지 않음 (기준안)'}</span>
      <span class="ww">${w}%</span>
    </div>`;
}

/* ---------------------------------------------------------
   드로어 v2 — common.js 의 openDrawer 를 이 화면용으로 교체
   --------------------------------------------------------- */
function v2Series(e, baseDate) {
  const n = Math.min(e.days, DETAIL_DAYS);
  const rnd = seededRandom(hashSeed(e.id + 'v2'));
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(baseDate, -i);
    if (i === 0) { out.push({ day, clk: e.clk, rr: e.rr, br: e.br, last: true }); continue; }
    const f = 0.8 + rnd() * 0.4, g = 0.88 + rnd() * 0.24, h = 0.85 + rnd() * 0.3;
    const baseClk = e.hasBase ? e.aClk : e.clk, baseRr = e.hasBase ? e.aRr : e.rr, baseBr = e.hasBase ? e.aBr : e.br;
    out.push({ day, clk: Math.max(Math.round(baseClk * f), 1), rr: baseRr * g, br: baseBr * h });
  }
  return out;
}

window.openDrawer = function (id) {
  const e = V2STATE.byId[id];
  if (!e) return;
  const w = V2STATE.revWeight;
  const series = v2Series(e, V2STATE.baseDate);

  $('#drawerTitle').textContent = e.n;
  $('#drawerId').textContent = `${e.id} · ${e.s} 시작 · 기준일 ${V2STATE.baseDate} (D+${e.days})`;
  $('#drawerLink').title = `이벤트 랜딩 바로가기 (${e.id})`;

  const tags = [];
  if (V2STATE.rankIn.bad[id])   tags.push(`<span class="badge badge-danger">개선 필요 ${V2STATE.rankIn.bad[id]}위</span>`);
  if (V2STATE.rankIn.grow[id])  tags.push(`<span class="badge badge-success">전일 성장 ${V2STATE.rankIn.grow[id]}위</span>`);
  if (V2STATE.rankIn.score[id]) tags.push(`<span class="badge badge-primary">전일 성과 ${V2STATE.rankIn.score[id]}위</span>`);
  $('#drawerPills').innerHTML = `
    <span class="pill pill-cat">${esc(e.c)}</span><span class="pill">${esc(e.f)}</span>
    <span class="pill pill-md">담당 ${esc(e.md)}</span><span class="pill">운영 D+${e.days}</span>
    ${e.isComment ? '<span class="pill">댓글형</span>' : ''}${tags.join('')}`;

  // 점수 구성
  const used = COMPONENTS.filter(c => e.pct2[c.key] !== null);
  const sumW = used.reduce((s, c) => s + c.w, 0);
  const rawOf = k => ({ uv: e.uv, rr: e.rr, br: e.br, buy: e.buy, cmt: e.cmt }[k]);
  const comp = COMPONENTS.map(c => {
    const p = e.pct2[c.key];
    if (p === null) {
      return `<div class="comp-row off"><span class="k">${c.label}</span><span class="raw">—</span><span class="pct-track"></span><span class="p">해당 없음</span><span class="c">—</span></div>`;
    }
    const eff = (c.w / sumW) * (100 - w);              // 재정규화 + 매출 비중 반영 후 실제 비중
    return `<div class="comp-row">
      <span class="k" data-tip-key="w_${c.key}">${c.label} <span style="opacity:.7">${eff.toFixed(0)}%</span></span>
      <span class="raw">${c.fmt(rawOf(c.key))}</span>
      <span class="pct-track"><span class="pct-fill ${p <= LOWER_PCT ? 'low' : ''}" style="width:${Math.max(p, 3).toFixed(0)}%"></span></span>
      <span class="p">상위 ${(100 - p).toFixed(0)}%</span>
      <span class="c">+${(eff * p / 100).toFixed(1)}</span>
    </div>`;
  }).join('') + `<div class="comp-row ${w ? '' : 'off'}">
      <span class="k" data-tip-key="w_rev">매출(참고) <span style="opacity:.7">${w}%</span></span>
      <span class="raw">${fmtMoneyShort(e.rev)}원</span>
      <span class="pct-track"><span class="pct-fill" style="width:${Math.max(e.revPct, 3).toFixed(0)}%"></span></span>
      <span class="p">상위 ${(100 - e.revPct).toFixed(0)}%</span>
      <span class="c">${w ? '+' + (w * e.revPct / 100).toFixed(1) : '미반영'}</span>
    </div>`;

  const hero = `
    <div class="score-hero">
      <div class="big">${e.score.toFixed(1)}<small>/ 100</small></div>
      <div class="side">
        전일 성과 <b>${e.rank}위</b> / ${V2STATE.total}건 · 참고 매출로는 <b>${e.revRank}위</b><br>
        ${e.hasBase ? `평소 점수 <b>${e.aScore.toFixed(1)}</b> → 전일 <b>${e.delta > 0 ? '+' : ''}${e.delta.toFixed(1)}pt</b>` : '오픈 초기라 평소 점수 없음'}
        · 매출 비중 <b>${w}%</b>${w ? ' 시험안' : ' 기준안'}
      </div>
    </div>`;

  // 판정
  let judge, actions = '';
  const lowTxt = e.low2 && e.low2.length ? e.low2.map(k => V2_ACTIONS[k].label).join(' · ') : '';
  if (e.aScorePct === undefined || e.aScorePct === null) {
    judge = `<div class="verdict neutral"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span class="body"><b>평가 제외</b> — ${e.days < MIN_DAYS ? `운영 ${e.days}일차로 시작 후 3일이 지나지 않았습니다.` : '비교 가능한 과거 데이터가 없습니다.'} 전일 점수만 참고하세요.</span></div>`;
  } else if (e.aScorePct <= LOWER_PCT) {
    judge = `<div class="verdict bad"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span class="body"><b>개선 필요</b> — 평소 종합 점수 ${e.aScore.toFixed(1)}점 · 평가 대상 ${V2STATE.poolSize}건 중 하위 30% 이내${lowTxt ? ' · 원인 지표: ' + lowTxt : ''}</span></div>`;
  } else if (lowTxt) {
    judge = `<div class="verdict neutral"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span class="body"><b>관찰 필요</b> — 평소 종합 점수(${e.aScore.toFixed(1)}점)는 하위 30% 밖이지만 ${lowTxt} 지표가 하위 30%입니다.</span></div>`;
  } else {
    judge = `<div class="verdict good"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span class="body"><b>개선 필요 아님</b> — 평소 종합 점수 ${e.aScore.toFixed(1)}점, 하위 30%에 걸린 지표도 없습니다.</span></div>`;
  }
  if (e.low2 && e.low2.length) {
    actions = `<ul class="action-list">${e.low2.map(k => `
      <li><div class="action-cause">${V2_ACTIONS[k].label}</div>
      <ul class="action-steps">${V2_ACTIONS[k].steps.map((s, i) => `<li><span class="n">${i + 1}</span>${esc(s)}</li>`).join('')}</ul></li>`).join('')}</ul>`;
  }

  $('#drawerBody').innerHTML = `
    <div class="drawer-sec">
      <h4><span data-tip-key="score">전일 종합 점수</span></h4>
      ${hero}
    </div>
    <div class="drawer-sec">
      <h4>점수 구성<span class="hint">지표별 백분위 × 비중 — ${e.isComment ? '댓글형이라 참여 지표 포함' : '댓글형이 아니라 참여 지표는 빼고 재정규화'}</span></h4>
      <div class="comp-head" style="display:grid;grid-template-columns:84px 96px minmax(70px,1fr) 58px 58px;gap:9px"><span>지표 · 비중</span><span style="text-align:right">전일 값</span><span>전체 대비 위치</span><span style="text-align:right" data-tip-key="pct">백분위</span><span style="text-align:right" data-tip-key="contrib">기여</span></div>
      ${comp}
    </div>
    <div class="drawer-sec">
      <h4>일자별 추이</h4>
      <div class="chart-box">
        <div class="cb-head"><span class="cb-title">일별 클릭 집계</span><span class="cb-note">최근 ${series.length}일 · 진한 막대가 전일</span></div>
        ${barChart(series, d => d.clk, { avg: e.hasBase ? e.aClk : null, fmt: v => fmtNum(Math.round(v)) })}
      </div>
      <div class="chart-grid">
        <div class="chart-box"><div class="cb-head"><span class="cb-title">일별 반응률</span></div>${lineChart(series, d => d.rr, { fmt: v => v.toFixed(1) + '%' })}</div>
        <div class="chart-box"><div class="cb-head"><span class="cb-title">일별 구매 전환율</span></div>${lineChart(series, d => d.br, { fmt: v => v.toFixed(1) + '%' })}</div>
      </div>
    </div>
    <div class="drawer-sec">
      <h4>참고 정보<span class="hint">점수·순위에 쓰지 않는 값</span></h4>
      <div class="ref-box">
        <div class="ref-line"><span data-tip-key="revRef">클릭·구매 상품 매출(참고)</span><span class="v">${fmtWon(e.rev)}원 · 매출 ${e.revRank}위</span></div>
        <div class="ref-line"><span data-tip-key="prd">대상 상품 수</span><span class="v">${fmtNum(e.prd)}종</span></div>
        <div class="ref-line"><span data-tip-key="cost">쿠폰·상품권 비용</span><span class="v">${e.cost ? fmtWon(e.cost) + '원' : '없음'}</span></div>
        <div class="ref-note">매출은 이벤트에서 반응을 받은 상품의 판매 규모이며 이벤트가 발생시킨 매출이 아닙니다. 쿠폰·상품권 비용은 대상 주문 범위가 같다는 근거가 없어 매출에서 차감하지 않고 나란히만 표시합니다.</div>
      </div>
    </div>
    <div class="drawer-sec">
      <h4>개선 필요 판정<span class="hint">평소(비교 기간 일평균) 기준 · 비교 모집단 ${V2STATE.poolSize}건</span></h4>
      ${judge}${actions}
    </div>`;

  $('#drawer').classList.add('open');
  $('#drawerBack').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('#drawerClose').focus();
};

/* ---------------------------------------------------------
   화면 갱신
   --------------------------------------------------------- */
function v2Refresh() {
  const baseDate = $('#fBaseDate').value || BASE_DATE;
  const cat = $('#fCat').value, field = $('#fField').value, md = $('#fMd').value;
  const w = V2STATE.revWeight;
  const r = buildV2(baseDate, cat, field, md, w);

  V2STATE.baseDate = baseDate;
  V2STATE.poolSize = r.evaluable.length;
  V2STATE.total = r.running.length;
  V2STATE.byId = {};
  r.running.forEach(e => { V2STATE.byId[e.id] = e; });
  V2STATE.rankIn = { bad: {}, grow: {}, score: {} };
  r.badTop.forEach((e, i) => { V2STATE.rankIn.bad[e.id] = i + 1; });
  r.growTop.forEach((e, i) => { V2STATE.rankIn.grow[e.id] = i + 1; });
  r.scoreTop.forEach((e, i) => { V2STATE.rankIn.score[e.id] = i + 1; });

  renderV2Kpi(r);
  renderV2Funnel(r);
  renderWeights();

  v2Table(r.badTop, '#tbodyBad', '#emptyBad', '#badgeBad', 'aScore',
    '개선이 필요한 이벤트가 없습니다', '선택한 조건에서 평소 종합 점수가 하위 30%인 이벤트가 없습니다.');
  v2Table(r.growTop, '#tbodyGrow', '#emptyGrow', '#badgeGrow', 'delta',
    '성장 TOP 대상 이벤트가 없습니다', '비교 가능한 과거 데이터가 있고 평소 클릭 집계가 하위 30%가 아닌 이벤트가 없습니다.');
  v2Table(r.scoreTop, '#tbodyScore', '#emptyScore', '#badgeScore', 'score',
    '전일 성과가 집계된 이벤트가 없습니다', '선택한 조건에 해당하는 진행 중 이벤트가 없습니다.');

  const dt = new Date(baseDate + 'T00:00:00');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  const cond = [cat || '전체 대분류', field || '전체 분야', md || '전체 담당자'].join(' · ');
  $('#pageSubtitle').textContent =
    `기준일 ${baseDate}(${dow}) 전일 실적 · 매일 1회 자동 집계 · ${cond} · 진행 중 이벤트 ${r.running.length}건`;
  $('#filterMeta').innerHTML =
    `<span class="badge badge-secondary" data-tip-key="pool">비교 모집단 ${r.evaluable.length}건</span>
     <span class="badge ${w ? 'badge-warning' : 'badge-primary'}" data-tip-key="revWeight">매출 비중 ${w}% ${w ? '시험안' : '기준안'}</span>
     점수는 <b>같은 대분류 · 조회 조건 안의 이벤트끼리</b> 백분위로 매깁니다.`;
}

document.addEventListener('DOMContentLoaded', () => {
  $('#fCat').insertAdjacentHTML('beforeend', CATEGORIES.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  const fields = [...new Set(EVENTS.map(e => e.f))].sort((a, b) => a.localeCompare(b, 'ko'));
  const mds = [...new Set(EVENTS.map(e => e.md))].sort((a, b) => a.localeCompare(b, 'ko'));
  $('#fField').insertAdjacentHTML('beforeend', fields.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  $('#fMd').insertAdjacentHTML('beforeend', mds.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));

  v2Refresh();

  $('#btnSearch').addEventListener('click', v2Refresh);
  ['#fCat', '#fField', '#fMd', '#fBaseDate'].forEach(s => $(s).addEventListener('change', v2Refresh));
  $('#btnReset').addEventListener('click', () => {
    $('#fBaseDate').value = BASE_DATE; $('#fCat').value = ''; $('#fField').value = ''; $('#fMd').value = '';
    V2STATE.revWeight = 0;
    $$('#revSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.w === '0' ? 'true' : 'false'));
    v2Refresh();
  });

  // 매출 비중 0% · 5% · 10%
  $$('#revSeg button').forEach(btn => btn.addEventListener('click', () => {
    V2STATE.revWeight = Number(btn.dataset.w);
    $$('#revSeg button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    v2Refresh();
  }));

  const rule = $('#ruleCard');
  $('#ruleToggle').addEventListener('click', () => {
    const open = rule.classList.toggle('open');
    $('#ruleBadge').textContent = open ? '접기' : '펼치기';
  });
});
