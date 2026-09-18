/* =========================================================
   이벤트 데일리 성과 리포트 — 화면 렌더
   (공통 데이터·집계·드로어는 common.js)
   ========================================================= */


/* ---------------------------------------------------------
   렌더 — 개선 필요 TOP 5
   --------------------------------------------------------- */
function renderBad(list) {
  const tb = $('#tbodyBad');
  const empty = $('#emptyBad');
  $('#badgeBad').textContent = list.length + '건';

  tb.closest('.tbl-wrap').classList.toggle('hidden', !list.length);
  if (!list.length) {
    tb.innerHTML = '';
    empty.innerHTML = emptyBox('개선이 필요한 이벤트가 없습니다', '선택한 조건에서 4개 지표 중 2개 이상이 하위 30%인 이벤트가 없습니다.');
    return;
  }
  empty.innerHTML = '';

  tb.innerHTML = list.map((e, i) => `
    <tr class="data-row" data-idx="${i}">
      ${rankCell(i)}
      ${commonCells(e)}
      <td>
        <div class="reasons">${e.low.map(k => `<span class="reason-chip" title="${ACTION_MAP[k].label}">${ACTION_MAP[k].short}</span>`).join('')}</div>
      </td>
      <td>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </td>
    </tr>
    <tr class="detail-row hidden" data-detail="${i}">
      <td colspan="13">${detailPanel(e)}</td>
    </tr>`).join('');

  tb.querySelectorAll('.data-row').forEach(tr => {
    tr.addEventListener('click', ev => {
      // 바로가기 링크·이벤트명(상세 드로어)은 행 펼침과 분리한다
      if (ev.target.closest('[data-link]')) { ev.preventDefault(); return; }
      if (ev.target.closest('[data-ev]')) return;
      const detail = tb.querySelector(`[data-detail="${tr.dataset.idx}"]`);
      const open = detail.classList.toggle('hidden');
      tr.classList.toggle('open', !open);
    });
  });
}

function detailPanel(e) {
  const bars = METRICS.map(m => {
    const p = e.pct[m.key];
    const isLow = p <= LOWER_PCT;
    const raw = m.key === 'rev' ? e.aRev : m.key === 'cvr' ? e.aCvr : m.key === 'uv' ? e.aUv : e.aNb;
    return `
      <div class="pct-row">
        <span class="k">${m.label}</span>
        <span class="raw">${m.fmt(raw)}</span>
        <span class="pct-track"><span class="pct-fill ${isLow ? 'low' : ''}" style="width:${Math.max(p, 3).toFixed(0)}%"></span></span>
        <span class="v ${isLow ? 'low' : ''}">하위 ${p.toFixed(0)}%</span>
      </div>`;
  }).join('');

  const actions = e.low.map(k => `
    <li>
      <div class="action-cause">${ACTION_MAP[k].label}</div>
      <ul class="action-steps">
        ${ACTION_MAP[k].steps.map((s, i) => `<li><span class="n">${i + 1}</span>${esc(s)}</li>`).join('')}
      </ul>
    </li>`).join('');

  return `
    <div class="detail-panel">
      <div class="detail-block">
        <h5>지표별 백분위 — 비교 기준 ${e.days >= 7 ? '최근 7일' : '시작일~전일'} 일평균</h5>
        ${bars}
        <div class="pct-legend">막대가 짧을수록 전체 진행 이벤트 대비 부진합니다. 붉은 막대가 하위 30% 해당 지표입니다.</div>
      </div>
      <div class="detail-block">
        <h5>권장 액션</h5>
        <ul class="action-list">${actions}</ul>
        <button type="button" class="detail-more" data-ev="${esc(e.id)}">
          이벤트 상세 보기 (추이 · 전체 지표)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </div>`;
}

/* ---------------------------------------------------------
   렌더 — 성장 / 매출 TOP 5
   --------------------------------------------------------- */
function renderPlain(list, tbodyId, emptyId, badgeId, emptyTitle, emptyDesc) {
  const tb = $(tbodyId);
  $(badgeId).textContent = list.length + '건';
  tb.closest('.tbl-wrap').classList.toggle('hidden', !list.length);
  if (!list.length) {
    tb.innerHTML = '';
    $(emptyId).innerHTML = emptyBox(emptyTitle, emptyDesc);
    return;
  }
  $(emptyId).innerHTML = '';
  tb.innerHTML = list.map((e, i) => `<tr class="data-row">${rankCell(i)}${commonCells(e)}</tr>`).join('');
  tb.querySelectorAll('[data-link]').forEach(a => a.addEventListener('click', ev => ev.preventDefault()));
}

/* ---------------------------------------------------------
   렌더 — KPI · 퍼널 · 메타
   --------------------------------------------------------- */
function renderKpi(r) {
  const run = r.running;
  const totalRev = run.reduce((s, e) => s + e.rev, 0);
  const totalBase = run.reduce((s, e) => s + e.aRev, 0);
  const totalOrd = run.reduce((s, e) => s + e.ord, 0);
  const totalUv = run.reduce((s, e) => s + e.uv, 0);
  const diff = totalBase ? ((totalRev - totalBase) / totalBase) * 100 : 0;

  $('#kpiRunning').innerHTML = fmtNum(run.length) + '<span class="unit">건</span>';
  $('#kpiRunningSub').textContent = `평가 대상 ${r.evaluable.length}건 · 운영 1~2일 등 제외 ${r.excluded.length}건`;

  $('#kpiRev').innerHTML = fmtMoneyShort(totalRev) + '<span class="unit">원</span>';
  $('#kpiRevSub').textContent = `최근 일평균 합계 ${fmtMoneyShort(totalBase)}원 대비`;
  const d = $('#kpiRevDelta');
  d.className = 'delta ' + (diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat');
  d.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';

  const cvr = totalUv ? (totalOrd / totalUv) * 100 : 0;
  $('#kpiCvr').innerHTML = cvr.toFixed(2) + '<span class="unit">%</span>';
  $('#kpiCvrSub').textContent = `전일 주문 ${fmtNum(totalOrd)}건 ÷ UV ${fmtNum(totalUv)}`;

  $('#kpiBad').innerHTML = fmtNum(r.badCandidates.length) + '<span class="unit">건</span>';
  $('#kpiBadSub').textContent = `2개 이상 하위 30% · 부진 상위 ${r.badTop.length}건 노출`;
}

function renderFunnel(r) {
  const steps = [
    { k: '① 집계 대상 추출', v: r.running.length, d: '시작일 ≤ 전일 ≤ 종료일 · 상시(9999-12-31) 이벤트 제외' },
    { k: '② 운영 기간 확인', v: r.evaluable.length, d: `시작 후 3일 이상 경과 · 제외 ${r.excluded.length}건` },
    { k: '③ 지표별 백분위', v: 4, unit: '개 지표', d: '일평균 매출 · 구매전환율 · UV · 신규 구매 고객' },
    { k: '④ 하위 30% 판정', v: r.badCandidates.length, d: '4개 지표 중 2개 이상 하위 30%' },
    { k: '⑤ 최종 노출', v: r.badTop.length, d: '부진 정도가 큰 순 최대 5건', last: true }
  ];
  const arrow = `<div class="funnel-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  $('#funnel').innerHTML = steps.map(s => `
    <div class="funnel-step ${s.last ? 'last' : ''}">
      <div class="fs-k">${s.k}</div>
      <div class="fs-v">${fmtNum(s.v)}<span class="unit">${s.unit || '건'}</span></div>
      <div class="fs-d">${s.d}</div>
    </div>`).join(arrow);

  // 후보 8건 중 5건만 노출되므로, 빠진 건수는 조회 화면으로 넘긴다
  const hidden = r.badCandidates.length - r.badTop.length;
  $('#funnelNote').innerHTML = hidden
    ? `개선 필요 후보 ${r.badCandidates.length}건 중 <b>${hidden}건은 이 화면에 뜨지 않습니다</b> —
       <a class="inline-link" href="search.html?status=badHidden">이벤트 성과 조회에서 보기 →</a>`
    : '개선 필요 후보가 모두 이 화면에 노출됩니다.';

  const ex = r.excluded;
  $('#excludedNote').innerHTML = ex.length
    ? `<b>평가 제외 ${ex.length}건</b> — ${ex.map(e => `${esc(e.n)}(D+${e.days})`).join(' · ')} : 운영 1~2일이거나 비교 가능한 과거 데이터가 없어 개선 필요 · 성장 평가에서 제외됩니다. 전일 매출 TOP 5에는 포함됩니다.`
    : '평가 제외 대상이 없습니다.';
}

/* ---------------------------------------------------------
   화면 갱신
   --------------------------------------------------------- */
function refresh() {
  const baseDate = $('#fBaseDate').value || BASE_DATE;
  const field = $('#fField').value;
  const md = $('#fMd').value;
  const r = buildReport(baseDate, field, md);

  renderKpi(r);
  renderFunnel(r);
  renderBad(r.badTop);
  renderPlain(r.growTop, '#tbodyGrow', '#emptyGrow', '#badgeGrow',
    '성장 TOP 대상 이벤트가 없습니다', '비교 가능한 과거 데이터가 있고 일평균 매출 하위 30%가 아닌 이벤트가 없습니다.');
  renderPlain(r.revTop, '#tbodyRev', '#emptyRev', '#badgeRev',
    '전일 매출이 집계된 이벤트가 없습니다', '선택한 조건에 해당하는 진행 중 이벤트가 없습니다.');

  const dt = new Date(baseDate + 'T00:00:00');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  const cond = [field || '전체 분야', md || '전체 담당자'].join(' · ');
  $('#pageSubtitle').textContent =
    `기준일 ${baseDate}(${dow}) 전일 실적 · 매일 1회 자동 집계 · ${cond} · 진행 중 이벤트 ${r.running.length}건`;
  $('#filterMeta').innerHTML =
    `<span class="badge badge-secondary">비교 모집단 ${r.evaluable.length}건</span> 백분위는 조회 조건 안의 이벤트끼리 상대 비교합니다.`;

  // 드로어가 참조할 상태 — 화면에 보이는 모든 이벤트를 id로 찾을 수 있게 둔다
  STATE.baseDate = baseDate;
  STATE.poolSize = r.evaluable.length;
  STATE.byId = {};
  r.running.forEach(e => { STATE.byId[e.id] = e; });
  STATE.rank = { bad: {}, grow: {}, rev: {} };
  r.badTop.forEach((e, i) => { STATE.rank.bad[e.id] = i + 1; });
  r.growTop.forEach((e, i) => { STATE.rank.grow[e.id] = i + 1; });
  r.revTop.forEach((e, i) => { STATE.rank.rev[e.id] = i + 1; });
}

/* ---------------------------------------------------------
   초기화
   --------------------------------------------------------- */
function initFilters() {
  const fields = [...new Set(EVENTS.map(e => e.f))].sort((a, b) => a.localeCompare(b, 'ko'));
  const mds = [...new Set(EVENTS.map(e => e.md))].sort((a, b) => a.localeCompare(b, 'ko'));
  $('#fField').insertAdjacentHTML('beforeend', fields.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  $('#fMd').insertAdjacentHTML('beforeend', mds.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
}


document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  refresh();

  $('#btnSearch').addEventListener('click', refresh);
  $('#fField').addEventListener('change', refresh);
  $('#fMd').addEventListener('change', refresh);
  $('#fBaseDate').addEventListener('change', refresh);
  $('#btnReset').addEventListener('click', () => {
    $('#fBaseDate').value = BASE_DATE;
    $('#fField').value = '';
    $('#fMd').value = '';
    refresh();
  });

  // 선정 기준 안내 접기/펼치기
  const rule = $('#ruleCard');
  $('#ruleToggle').addEventListener('click', () => {
    const open = rule.classList.toggle('open');
    $('#ruleBadge').textContent = open ? '접기' : '펼치기';
  });
});
