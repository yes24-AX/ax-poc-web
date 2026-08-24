/* =====================================================
   경쟁사 매출 입력 — POC
   교보문고/알라딘 수기 입력 + 검증 + 이력, 예스24는 MSTR 자동연동(읽기전용)
   ===================================================== */
(function () {
  const CATS = DATA.categories;
  const STORE_NAME = { yes: '예스24', kyobo: '교보문고', aladin: '알라딘' };
  const M = {};
  DATA.months.forEach(r => (M[r.month] = r));
  const KEYS = DATA.months.map(r => r.month);
  const LAST = KEYS[KEYS.length - 1];

  const shift = (key, n) => {
    const p = key.split('-');
    const t = Number(p[0]) * 12 + (Number(p[1]) - 1) + n;
    return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0');
  };
  const nf = n => (n == null || !isFinite(n) ? '-' : Math.round(n).toLocaleString('ko-KR'));
  const sgn = v => (v == null || !isFinite(v) ? '-' : (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%');
  const cls = v => (v == null || !isFinite(v) ? 'zero' : v > 0.0005 ? 'pos' : v < -0.0005 ? 'neg' : 'zero');
  const rate = (c, p) => (p && c ? (c - p) / p : null);
  const ymLabel = k => k.replace('-', '년 ') + '월';

  // 입력 후보 월: 데이터 마지막 달 다음 달(미입력)부터 과거 24개월
  const NEXT = shift(LAST, 1);
  const OPTIONS = [NEXT].concat(KEYS.slice().reverse().slice(0, 24));

  // 세션 저장소 (데모 — 실제로는 DB)
  const store = {};   // 'kyobo|2026-08' -> {vals:{}, total:null, status:'draft'|'confirmed', ver:n}
  const hist = [];    // {ym, store, status, ver, by, at}

  const state = { month: NEXT, store: 'kyobo' };
  const skey = () => state.store + '|' + state.month;

  function ref(month, storeKey) {          // 원본(엑셀) 기준 참조값
    const r = M[month];
    if (!r) return null;
    const o = { cats: {}, total: r.total[storeKey] };
    CATS.forEach(c => (o.cats[c] = (r.cats[c] || {})[storeKey]));
    return o;
  }

  function cell() {                        // 현재 입력중인 값 묶음
    if (!store[skey()]) {
      const saved = ref(state.month, state.store);
      store[skey()] = {
        vals: {},
        total: saved ? saved.total : null,
        status: saved ? 'confirmed' : 'empty',
        ver: saved ? 1 : 0,
      };
      CATS.forEach(c => (store[skey()].vals[c] = saved ? saved.cats[c] : null));
      if (saved) hist.push({ ym: state.month, st: state.store, status: 'confirmed', ver: 1, by: '초기적재(엑셀)', at: '—' });
    }
    return store[skey()];
  }

  /* ---------- 검증 ---------- */
  function validate() {
    const d = cell();
    const prev = ref(shift(state.month, -1), state.store);
    const yago = ref(shift(state.month, -12), state.store);
    const out = [];
    const missing = CATS.filter(c => d.vals[c] == null || d.vals[c] === '');
    if (missing.length) out.push({ t: 'e', m: '미입력 분야 ' + missing.length + '개: ' + missing.join(', ') });
    CATS.forEach(c => {
      const v = d.vals[c];
      if (v == null || v === '') return;
      if (!isFinite(v) || v < 0) { out.push({ t: 'e', m: c + ': 숫자가 아니거나 음수입니다' }); return; }
      if (prev && prev.cats[c]) {
        const r = rate(v, prev.cats[c]);
        if (Math.abs(r) > 0.5) out.push({ t: 'w', m: c + ': 전월 대비 ' + sgn(r) + ' (전월 ' + nf(prev.cats[c]) + ') — 이상치 확인 필요' });
      }
      if (yago && yago.cats[c]) {
        const r = rate(v, yago.cats[c]);
        if (Math.abs(r) > 0.6) out.push({ t: 'w', m: c + ': 전년동월 대비 ' + sgn(r) + ' (전년 ' + nf(yago.cats[c]) + ')' });
      }
    });
    const sum = CATS.reduce((a, c) => a + (Number(d.vals[c]) || 0), 0);
    if (d.total != null && d.total !== '' && sum) {
      const gap = sum - Number(d.total);
      if (Math.abs(gap) / Number(d.total) > 0.01)
        out.push({ t: 'w', m: '분야 합계(' + nf(sum) + ')와 전체 제공값(' + nf(d.total) + ')이 ' + nf(gap) + ' 차이납니다 — 정본 기준 확인 필요' });
    }
    if (!out.length && !missing.length) out.push({ t: 'o', m: '검증 통과 — 확정 저장 가능합니다' });
    return { list: out, ok: !out.some(x => x.t === 'e') };
  }

  /* ---------- 렌더 ---------- */
  function renderStatus() {
    const d = cell();
    const map = {
      empty: ['status-soldout', '미입력'],
      draft: ['status-low', '임시저장'],
      confirmed: ['status-selling', '확정 (v' + d.ver + ')'],
    };
    const s = map[d.status];
    document.getElementById('statusArea').innerHTML =
      '<span class="status-badge ' + s[0] + '">' + s[1] + '</span>';
  }

  function renderNotice() {
    const el = document.getElementById('topNotice');
    if (state.store === 'yes') {
      el.innerHTML = '<div class="callout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.2-8.6"/><polyline points="21 3 21 9 15 9"/></svg>' +
        '<div><b>예스24는 MSTR 관리분류 기준으로 월배치 자동 연동</b>되어 수기 입력 대상이 아닙니다. 값이 비어 있거나 분류가 어긋난 경우에만 담당자가 재동기화를 실행합니다.</div></div>';
      return;
    }
    const d = cell();
    if (d.status === 'confirmed')
      el.innerHTML = '<div class="callout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        '<div>이미 <b>확정된 월</b>입니다. 각 사에서 정정본을 받은 경우 값을 수정하고 다시 확정하면 <b>버전 v' + (d.ver + 1) + '</b>으로 이력이 남습니다.</div></div>';
    else if (d.status === 'empty')
      el.innerHTML = '<div class="callout warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>' +
        '<div><b>' + ymLabel(state.month) + ' ' + STORE_NAME[state.store] + ' 매출이 아직 입력되지 않았습니다.</b> 미입력 월은 리포트에서 제외되며, 해당 월의 시장 규모·점유율이 과소 집계됩니다.</div></div>';
    else el.innerHTML = '';
  }

  function renderSummary() {
    const d = cell();
    const sum = CATS.reduce((a, c) => a + (Number(d.vals[c]) || 0), 0);
    const prev = ref(shift(state.month, -1), state.store);
    const yago = ref(shift(state.month, -12), state.store);
    const filled = CATS.filter(c => d.vals[c] != null && d.vals[c] !== '').length;
    document.getElementById('sumRow').innerHTML =
      '<div class="stat-card"><div class="stat-head"><h4>입력 합계</h4></div><div class="stat-num">' + nf(sum) + '<span class="unit">백만</span></div><div class="stat-sub">' + filled + ' / ' + CATS.length + ' 분야 입력됨</div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>전월 합계</h4></div><div class="stat-num">' + (prev ? nf(prev.total) : '-') + '<span class="unit">백만</span></div><div class="stat-sub">전월비 <span class="delta ' + cls(prev ? rate(sum, prev.total) : null) + '">' + (prev ? sgn(rate(sum, prev.total)) : '-') + '</span></div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>전년동월 합계</h4></div><div class="stat-num">' + (yago ? nf(yago.total) : '-') + '<span class="unit">백만</span></div><div class="stat-sub">전년비 <span class="delta ' + cls(yago ? rate(sum, yago.total) : null) + '">' + (yago ? sgn(rate(sum, yago.total)) : '-') + '</span></div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>전체 제공값</h4></div>' +
      '<div class="stat-num"><input class="inp-cell" id="totalInput" style="width:130px;font-size:20px" placeholder="선택 입력" value="' + (d.total == null ? '' : d.total) + '"' + (state.store === 'yes' ? ' disabled' : '') + '></div>' +
      '<div class="stat-sub">각 사가 함께 준 전체 합계 (분야합 대사용)</div></div>';
    const ti = document.getElementById('totalInput');
    if (ti) ti.addEventListener('input', e => { const v = e.target.value.replace(/,/g, '').trim(); cell().total = v === '' ? null : Number(v); markDraft(); refresh(false); });
  }

  function renderTable() {
    const d = cell();
    const prev = ref(shift(state.month, -1), state.store);
    const yago = ref(shift(state.month, -12), state.store);
    const dis = state.store === 'yes' ? ' disabled' : '';
    let body = '';
    CATS.forEach((c, i) => {
      const v = d.vals[c];
      const pr = prev ? prev.cats[c] : null;
      const ya = yago ? yago.cats[c] : null;
      const rm = v != null && pr ? rate(v, pr) : null;
      const ry = v != null && ya ? rate(v, ya) : null;
      const bad = v != null && ((rm != null && Math.abs(rm) > 0.5) || (ry != null && Math.abs(ry) > 0.6));
      body += '<tr><td>' + (i + 1) + '. ' + c + '</td>' +
        '<td><input class="inp-cell' + (bad ? ' warn' : '') + '" data-c="' + c + '" value="' + (v == null ? '' : v) + '"' + dis + '></td>' +
        '<td class="num bl">' + nf(pr) + '</td><td class="' + cls(rm) + '">' + sgn(rm) + '</td>' +
        '<td class="num bl">' + nf(ya) + '</td><td class="' + cls(ry) + '">' + sgn(ry) + '</td></tr>';
    });
    const sum = CATS.reduce((a, c) => a + (Number(d.vals[c]) || 0), 0);
    body += '<tr class="total-row"><td>분야 합계</td><td class="num">' + nf(sum) + '</td>' +
      '<td class="num bl">' + (prev ? nf(prev.total) : '-') + '</td><td class="' + cls(prev ? rate(sum, prev.total) : null) + '">' + (prev ? sgn(rate(sum, prev.total)) : '-') + '</td>' +
      '<td class="num bl">' + (yago ? nf(yago.total) : '-') + '</td><td class="' + cls(yago ? rate(sum, yago.total) : null) + '">' + (yago ? sgn(rate(sum, yago.total)) : '-') + '</td></tr>';

    document.getElementById('inputTable').innerHTML =
      '<thead><tr><th>분야</th><th>' + ymLabel(state.month) + ' 매출</th><th class="bl">전월</th><th>전월비</th><th class="bl">전년동월</th><th>전년비</th></tr></thead><tbody>' + body + '</tbody>';

    document.querySelectorAll('#inputTable input').forEach(inp => {
      inp.addEventListener('input', e => {
        const v = e.target.value.replace(/,/g, '').trim();
        cell().vals[e.target.getAttribute('data-c')] = v === '' ? null : Number(v);
        markDraft();
        refresh(false);
      });
    });
  }

  function renderValidation() {
    const v = validate();
    document.getElementById('vList').innerHTML = v.list.map(x =>
      '<li><span class="tag ' + x.t + '">' + (x.t === 'e' ? '오류' : x.t === 'w' ? '경고' : '정상') + '</span><span>' + x.m + '</span></li>').join('');
  }

  function renderHist() {
    const rows = hist.filter(h => h.ym === state.month && h.st === state.store);
    document.getElementById('histTable').innerHTML =
      '<thead><tr><th>버전</th><th>상태</th><th>처리자</th><th>일시</th></tr></thead><tbody>' +
      (rows.length
        ? rows.slice().reverse().map(h => '<tr><td>v' + h.ver + '</td><td>' + (h.status === 'confirmed' ? '확정' : '임시저장') + '</td><td>' + h.by + '</td><td>' + h.at + '</td></tr>').join('')
        : '<tr><td colspan="4" style="color:var(--muted-foreground)">이력 없음</td></tr>') + '</tbody>';
  }

  function markDraft() {
    const d = cell();
    if (d.status === 'confirmed') d.status = 'draft';
    else if (d.status === 'empty') d.status = 'draft';
  }

  function refresh(full) {
    if (full !== false) { renderNotice(); renderTable(); renderSummary(); }
    else { renderSummary(); }
    renderStatus();
    renderValidation();
    renderHist();
    if (full === false) {
      // 표의 경고 테두리/합계만 갱신
      const d = cell();
      const prev = ref(shift(state.month, -1), state.store);
      const yago = ref(shift(state.month, -12), state.store);
      document.querySelectorAll('#inputTable input').forEach(inp => {
        const c = inp.getAttribute('data-c'), v = d.vals[c];
        const rm = v != null && prev && prev.cats[c] ? rate(v, prev.cats[c]) : null;
        const ry = v != null && yago && yago.cats[c] ? rate(v, yago.cats[c]) : null;
        inp.classList.toggle('warn', !!((rm != null && Math.abs(rm) > 0.5) || (ry != null && Math.abs(ry) > 0.6)));
      });
    }
  }

  /* ---------- 붙여넣기 파싱 ---------- */
  const ALIAS = {
    '문학': '문학', '소설': '문학', '소설/시': '문학',
    '인문': '인문', '인문학': '인문',
    '경제': '경제', '경제경영': '경제', '경제/경영': '경제', '자기계발': '경제',
    '수험서': '수험서', '수험서/자격증': '수험서', '자격증': '수험서',
    '만화·라노벨': '만화·라노벨', '만화/라노벨': '만화·라노벨', '만화': '만화·라노벨', '라노벨': '만화·라노벨',
    '로맨스': '로맨스', 'BL': 'BL', 'bl': 'BL',
    '판타지/무협': '판타지/무협', '판타지': '판타지/무협', '무협': '판타지/무협',
    '기타': '기타',
  };
  function parsePaste(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const d = cell();
    let hit = 0;
    const nums = [];
    lines.forEach(line => {
      const parts = line.split(/[\t,;|]+|\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const key = parts[0].replace(/\s/g, '');
        const cat = ALIAS[key] || ALIAS[key.replace(/[·/]/g, '/')];
        const num = Number(parts[parts.length - 1].replace(/[,\s원]/g, ''));
        if (cat && isFinite(num)) { d.vals[cat] = num; hit++; return; }
      }
      const only = Number(line.replace(/[,\s원]/g, ''));
      if (isFinite(only) && line.replace(/[,\s원]/g, '') !== '') nums.push(only);
    });
    if (!hit && nums.length >= CATS.length) {
      CATS.forEach((c, i) => (d.vals[c] = nums[i]));
      hit = CATS.length;
    }
    return hit;
  }

  /* ---------- init ---------- */
  const sel = document.getElementById('selMonth');
  sel.innerHTML = OPTIONS.map(k => '<option value="' + k + '">' + ymLabel(k) + (k === NEXT ? ' (신규)' : '') + '</option>').join('');
  sel.value = state.month;
  sel.addEventListener('change', () => { state.month = sel.value; refresh(true); });

  document.getElementById('segStore').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.store = b.getAttribute('data-s');
    const all = document.querySelectorAll('#segStore button');
    for (let i = 0; i < all.length; i++) all[i].classList.toggle('active', all[i] === b);
    refresh(true);
  });

  document.getElementById('btnParse').addEventListener('click', () => {
    const n = parsePaste(document.getElementById('pasteBox').value);
    document.getElementById('parseNote').textContent = n ? n + '개 분야를 채웠습니다' : '인식된 값이 없습니다 — 분야명+금액 또는 숫자 9줄 형식으로 붙여넣어 주세요';
    if (n) markDraft();
    refresh(true);
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    const d = cell();
    CATS.forEach(c => (d.vals[c] = null));
    d.total = null;
    d.status = 'draft';
    refresh(true);
  });

  document.getElementById('btnPrevFill').addEventListener('click', () => {
    const prev = ref(shift(state.month, -1), state.store);
    if (!prev) return;
    const d = cell();
    CATS.forEach(c => (d.vals[c] = prev.cats[c]));
    markDraft();
    refresh(true);
  });

  const stamp = () => {
    const t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0') +
      ' ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  };

  document.getElementById('btnSave').addEventListener('click', () => {
    if (state.store === 'yes') return alert('예스24는 MSTR 자동 연동 대상으로 수기 저장할 수 없습니다.');
    const d = cell();
    d.status = 'draft';
    hist.push({ ym: state.month, st: state.store, status: 'draft', ver: d.ver, by: 'yes24ax', at: stamp() });
    refresh(true);
  });

  document.getElementById('btnConfirm').addEventListener('click', () => {
    if (state.store === 'yes') return alert('예스24는 MSTR 자동 연동 대상으로 수기 저장할 수 없습니다.');
    const v = validate();
    if (!v.ok) return alert('오류 항목이 있어 확정할 수 없습니다. 검증 결과를 확인해 주세요.');
    const d = cell();
    d.ver += 1;
    d.status = 'confirmed';
    hist.push({ ym: state.month, st: state.store, status: 'confirmed', ver: d.ver, by: 'yes24ax', at: stamp() });
    refresh(true);
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    document.getElementById('iconMoon').classList.toggle('hidden', dark);
    document.getElementById('iconSun').classList.toggle('hidden', !dark);
  });

  refresh(true);
})();
