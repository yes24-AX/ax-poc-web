/* =========================================================
   이벤트 성과 조회 — 화면 렌더
   데일리 TOP 5에 없는 이벤트를 찾기 위한 화면.
   판정 로직·상세 드로어는 데일리 리포트와 동일한 common.js를 쓴다.
   ========================================================= */

const STATUS = {
  bad:      { label: '개선 필요 후보', cls: 'badge-danger' },
  watch:    { label: '관찰 필요',      cls: 'badge-warning' },
  ok:       { label: '양호',           cls: 'badge-success' },
  excluded: { label: '평가 제외',      cls: 'badge-secondary' }
};

function statusOf(e) {
  if (!e.pct) return 'excluded';
  if (e.low.length >= 2) return 'bad';
  if (e.low.length === 1) return 'watch';
  return 'ok';
}

/* 데일리 리포트 어느 리스트에 노출되는지 */
function shownIn(e) {
  const tags = [];
  if (STATE.rank.bad[e.id])  tags.push(`개선 ${STATE.rank.bad[e.id]}위`);
  if (STATE.rank.grow[e.id]) tags.push(`성장 ${STATE.rank.grow[e.id]}위`);
  if (STATE.rank.rev[e.id])  tags.push(`매출 ${STATE.rank.rev[e.id]}위`);
  return tags;
}

const SORTERS = {
  revDesc:    (a, b) => b.rev - a.rev,
  badScore:   (a, b) => (a.pct ? a.lowScore : 999) - (b.pct ? b.lowScore : 999),
  growthDesc: (a, b) => (b.growth ?? -9999) - (a.growth ?? -9999),
  growthAsc:  (a, b) => (a.growth ?? 9999) - (b.growth ?? 9999),
  cvrAsc:     (a, b) => a.cvr - b.cvr,
  daysDesc:   (a, b) => b.days - a.days
};

/* ---------------------------------------------------------
   렌더
   --------------------------------------------------------- */
function renderResult(rows) {
  const tb = $('#tbodyResult');
  $('#badgeCount').textContent = rows.length + '건';
  tb.closest('.tbl-wrap').classList.toggle('hidden', !rows.length);

  if (!rows.length) {
    tb.innerHTML = '';
    $('#emptyResult').innerHTML = emptyBox(
      '조건에 맞는 이벤트가 없습니다',
      '검색어 · 분야 · 담당자 · 판정 조건을 넓혀 다시 조회해 보세요.'
    );
    return;
  }
  $('#emptyResult').innerHTML = '';

  tb.innerHTML = rows.map(e => {
    const st = statusOf(e);
    const tags = shownIn(e);
    const lows = e.pct && e.low.length
      ? `<div class="reasons">${e.low.map(k => `<span class="reason-chip" title="${ACTION_MAP[k].label}">${ACTION_MAP[k].short}</span>`).join('')}</div>`
      : '<span class="dim-cell">—</span>';
    return `
      <tr class="data-row">
        <td>
          <span class="badge ${STATUS[st].cls}">${STATUS[st].label}</span>
          <div class="shown-in">${tags.length ? '데일리 ' + tags.join(' · ') : '데일리 미노출'}</div>
        </td>
        ${commonCells(e)}
        <td>${lows}</td>
      </tr>`;
  }).join('');

  tb.querySelectorAll('[data-link]').forEach(a => a.addEventListener('click', ev => ev.preventDefault()));
}

function renderSummary(rows, r, cond) {
  const counts = { bad: 0, watch: 0, ok: 0, excluded: 0 };
  rows.forEach(e => counts[statusOf(e)]++);
  const hidden = rows.filter(e => statusOf(e) === 'bad' && !STATE.rank.bad[e.id]).length;

  $('#sumTotal').innerHTML = fmtNum(rows.length) + '<span class="unit">건</span>';
  $('#sumTotalSub').textContent = cond;
  $('#sumBad').innerHTML = fmtNum(counts.bad) + '<span class="unit">건</span>';
  $('#sumBadSub').textContent = hidden
    ? `이 중 ${hidden}건은 데일리 TOP 5에 안 뜹니다`
    : '모두 데일리 TOP 5에 노출됩니다';
  $('#sumWatch').innerHTML = fmtNum(counts.watch) + '<span class="unit">건</span>';
  $('#sumExcluded').innerHTML = fmtNum(counts.excluded) + '<span class="unit">건</span>';

  $('#filterMeta').innerHTML =
    `<span class="badge badge-secondary">비교 모집단 ${r.evaluable.length}건</span>
     백분위·판정은 <b>분야·담당자 조건 안의 이벤트끼리</b> 상대 비교합니다. 검색어와 판정 필터는 표시만 거릅니다.`;
}

/* ---------------------------------------------------------
   조회
   --------------------------------------------------------- */
function searchRefresh() {
  const baseDate = $('#fBaseDate').value || BASE_DATE;
  const field = $('#fField').value;
  const md = $('#fMd').value;
  const q = $('#fQuery').value.trim().toLowerCase();
  const status = $('#fStatus').value;
  const sort = $('#fSort').value;

  // 판정은 데일리 리포트와 같은 집계를 그대로 쓴다
  const r = buildReport(baseDate, field, md);

  STATE.baseDate = baseDate;
  STATE.poolSize = r.evaluable.length;
  STATE.byId = {};
  r.running.forEach(e => { STATE.byId[e.id] = e; });
  STATE.rank = { bad: {}, grow: {}, rev: {} };
  r.badTop.forEach((e, i) => { STATE.rank.bad[e.id] = i + 1; });
  r.growTop.forEach((e, i) => { STATE.rank.grow[e.id] = i + 1; });
  r.revTop.forEach((e, i) => { STATE.rank.rev[e.id] = i + 1; });

  let rows = r.running;
  if (q) rows = rows.filter(e => e.n.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));

  const scoped = rows;   // 요약 카드는 판정 필터 적용 전 기준
  if (status === 'badHidden') {
    rows = rows.filter(e => statusOf(e) === 'bad' && !STATE.rank.bad[e.id]);
  } else if (status) {
    rows = rows.filter(e => statusOf(e) === status);
  }
  rows = [...rows].sort(SORTERS[sort] || SORTERS.revDesc);

  const dt = new Date(baseDate + 'T00:00:00');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  const cond = [field || '전체 분야', md || '전체 담당자'].join(' · ') + (q ? ` · "${q}"` : '');

  renderSummary(scoped, r, cond);
  renderResult(rows);

  $('#pageSubtitle').textContent =
    `기준일 ${baseDate}(${dow}) 전일 실적 · 진행 중 ${r.running.length}건 중 ${rows.length}건 · 이벤트명을 클릭하면 상세가 열립니다`;
}

/* ---------------------------------------------------------
   초기화
   --------------------------------------------------------- */
function initSearchFilters() {
  const fields = [...new Set(EVENTS.map(e => e.f))].sort((a, b) => a.localeCompare(b, 'ko'));
  const mds = [...new Set(EVENTS.map(e => e.md))].sort((a, b) => a.localeCompare(b, 'ko'));
  $('#fField').insertAdjacentHTML('beforeend', fields.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  $('#fMd').insertAdjacentHTML('beforeend', mds.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
}

/* 데일리 리포트에서 넘어온 조건 (예: search.html?status=badHidden) */
function applyQueryParams() {
  const p = new URLSearchParams(location.search);
  const status = p.get('status');
  const sort = p.get('sort');
  const q = p.get('q');
  if (status && [...$('#fStatus').options].some(o => o.value === status)) $('#fStatus').value = status;
  if (sort && [...$('#fSort').options].some(o => o.value === sort)) $('#fSort').value = sort;
  if (q) $('#fQuery').value = q;
}

document.addEventListener('DOMContentLoaded', () => {
  initSearchFilters();
  applyQueryParams();
  searchRefresh();

  $('#btnSearch').addEventListener('click', searchRefresh);
  ['#fField', '#fMd', '#fStatus', '#fSort', '#fBaseDate'].forEach(sel =>
    $(sel).addEventListener('change', searchRefresh));
  $('#fQuery').addEventListener('input', searchRefresh);
  $('#fQuery').addEventListener('keydown', ev => { if (ev.key === 'Enter') searchRefresh(); });

  $('#btnReset').addEventListener('click', () => {
    $('#fBaseDate').value = BASE_DATE;
    $('#fQuery').value = '';
    $('#fField').value = '';
    $('#fMd').value = '';
    $('#fStatus').value = '';
    $('#fSort').value = 'revDesc';
    searchRefresh();
  });

  // 빠른 조건 칩
  $$('.chip[data-quick]').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.quick;
      if (q === 'cvrAsc') { $('#fSort').value = 'cvrAsc'; }
      else { $('#fStatus').value = q; }
      searchRefresh();
    });
  });
});
