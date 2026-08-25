/* =====================================================
   eBook 3사 경쟁 비교 리포트 — POC
   데이터: DATA (assets/js/data.js) · 단위: 백만원
   ===================================================== */
(function () {
  const CATS = DATA.categories;
  const STORES = [
    { k: 'yes', name: '예스24', cls: 'yes' },
    { k: 'kyobo', name: '교보문고', cls: 'kyobo' },
    { k: 'aladin', name: '알라딘', cls: 'aladin' },
  ];
  const M = {};
  DATA.months.forEach(r => (M[r.month] = r));
  const KEYS = DATA.months.map(r => r.month);
  const LAST = KEYS[KEYS.length - 1];

  const state = { from: '', to: LAST, unit: 'M', cat: CATS[0] };

  /* ---------- utils ---------- */
  const shift = (key, n) => {
    const p = key.split('-');
    const t = Number(p[0]) * 12 + (Number(p[1]) - 1) + n;
    return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0');
  };
  const label = k => k.split('-')[0] + '.' + k.split('-')[1];

  function rangeKeys() {
    return KEYS.filter(k => k >= state.from && k <= state.to);
  }
  const prevKeys = keys => keys.map(k => shift(k, -12));

  /* 집계단위(월/분기/반기/연도)로 선택 구간을 잘라 버킷 목록을 만든다 */
  const UNIT_NAME = { M: '월', Q: '분기', H: '반기', Y: '연도' };
  function bucketId(key) {
    const p = key.split('-'), y = p[0], m = Number(p[1]);
    if (state.unit === 'Q') return y + ' ' + Math.ceil(m / 3) + 'Q';
    if (state.unit === 'H') return y + ' ' + (m <= 6 ? 'H1' : 'H2');
    if (state.unit === 'Y') return y + '년';
    return y.slice(2) + '.' + p[1];
  }
  function buckets(keys) {
    const order = [], map = {};
    keys.forEach(k => {
      const id = bucketId(k);
      if (!map[id]) { map[id] = []; order.push(id); }
      map[id].push(k);
    });
    return order.map(id => ({ id: id, months: map[id] }));
  }

  function agg(keys) {
    const res = { cats: {}, total: { yes: 0, kyobo: 0, aladin: 0, market: 0 }, missing: false, n: 0 };
    CATS.forEach(c => (res.cats[c] = { yes: 0, kyobo: 0, aladin: 0, market: 0 }));
    keys.forEach(k => {
      const r = M[k];
      if (!r) { res.missing = true; return; }
      res.n++;
      CATS.forEach(c => {
        const v = r.cats[c] || {};
        ['yes', 'kyobo', 'aladin'].forEach(s => {
          if (v[s] == null) res.missing = true;
          res.cats[c][s] += v[s] || 0;
        });
      });
      ['yes', 'kyobo', 'aladin'].forEach(s => (res.total[s] += r.total[s] || 0));
    });
    CATS.forEach(c => (res.cats[c].market = res.cats[c].yes + res.cats[c].kyobo + res.cats[c].aladin));
    res.total.market = res.total.yes + res.total.kyobo + res.total.aladin;
    return res;
  }

  const yoy = (cur, prev) => (prev ? (cur - prev) / prev : null);
  const share = (v, m) => (m ? v / m : null);
  const sub = (a, b) => (a == null || b == null || !isFinite(a) || !isFinite(b) ? null : a - b);

  /* ---------- formatting ---------- */
  const nf = n => (n == null || !isFinite(n) ? '-' : Math.round(n).toLocaleString('ko-KR'));
  const pct = (v, d) => (v == null || !isFinite(v) ? '-' : (v * 100).toFixed(d == null ? 1 : d) + '%');
  const pp = (v, d) => (v == null || !isFinite(v) ? '-' : (v >= 0 ? '+' : '') + (v * 100).toFixed(d == null ? 1 : d) + '%p');
  const sgn = (v, d) => (v == null || !isFinite(v) ? '-' : (v >= 0 ? '+' : '') + (v * 100).toFixed(d == null ? 1 : d) + '%');
  const cls = v => (v == null || !isFinite(v) ? 'zero' : v > 0.0005 ? 'pos' : v < -0.0005 ? 'neg' : 'zero');
  const signed = n => (n == null || !isFinite(n) ? '-' : (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('ko-KR'));
  const heat = v => {
    if (v == null || !isFinite(v)) return '';
    const a = Math.min(Math.abs(v) / 0.3, 1) * 16;
    const c = v > 0 ? 'var(--success)' : 'var(--destructive)';
    return 'background:color-mix(in oklch, ' + c + ' ' + a.toFixed(0) + '%, transparent)';
  };

  /* ---------- SVG charts ---------- */
  const W = 760, PADL = 52, PADR = 14, PADT = 14;

  function niceScale(min, max) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
    const mult = [1, 2, 2.5, 5, 10].find(m => span / (step * m) <= 4.5) || 10;
    const s = step * mult;
    return { lo: Math.floor(min / s) * s, hi: Math.ceil(max / s) * s, step: s };
  }

  function lineChart(opts) {
    const labels = opts.labels, series = opts.series;
    const fmt = opts.fmt || nf, H = opts.height || 240, zero = !!opts.zero, PADB = 26;
    const vals = series.reduce((a, s) => a.concat(s.values.filter(v => v != null && isFinite(v))), []);
    if (!vals.length) return '<div class="empty"><p>표시할 데이터가 없습니다</p></div>';
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (zero) { min = Math.min(min, 0); max = Math.max(max, 0); }
    const sc = niceScale(min, max);
    const x = i => PADL + (i * (W - PADL - PADR)) / Math.max(labels.length - 1, 1);
    const y = v => PADT + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - PADT - PADB);
    let g = '';
    for (let v = sc.lo; v <= sc.hi + 1e-9; v += sc.step) {
      g += '<line class="grid-line" x1="' + PADL + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y(v).toFixed(1) + '"/>';
      g += '<text class="chart-label" x="' + (PADL - 7) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    if (zero && sc.lo < 0 && sc.hi > 0)
      g += '<line class="zero-line" x1="' + PADL + '" y1="' + y(0).toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y(0).toFixed(1) + '"/>';
    const every = Math.ceil(labels.length / 14);
    labels.forEach((l, i) => {
      if (i % every === 0 || i === labels.length - 1)
        g += '<text class="chart-label" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + l + '</text>';
    });
    series.forEach(s => {
      let d = '', pen = false;
      s.values.forEach((v, i) => {
        if (v == null || !isFinite(v)) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' ';
        pen = true;
      });
      g += '<path class="chart-line ' + s.cls + '" d="' + d + '"/>';
      if (labels.length <= 14)
        s.values.forEach((v, i) => {
          if (v == null || !isFinite(v)) return;
          g += '<circle class="chart-dot ' + s.cls + ' dot-fill" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3"/>';
        });
    });
    const legend = series.map(s => '<span><i class="sw-' + s.cls.replace('line-', '') + '"></i>' + s.name + '</span>').join('');
    return '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + g + '</svg></div><div class="chart-legend">' + legend + '</div>';
  }

  function barChart(opts) {
    const labels = opts.labels, series = opts.series;
    const fmt = opts.fmt || nf, H = opts.height || 260, PADB = 42;
    const vals = series.reduce((a, s) => a.concat(s.values.filter(v => v != null && isFinite(v))), []);
    if (!vals.length) return '<div class="empty"><p>표시할 데이터가 없습니다</p></div>';
    const sc = niceScale(Math.min(0, Math.min.apply(null, vals)), Math.max(0, Math.max.apply(null, vals)));
    const y = v => PADT + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - PADT - PADB);
    const bw = (W - PADL - PADR) / labels.length;
    const inner = bw * 0.72, each = inner / series.length;
    let g = '';
    for (let v = sc.lo; v <= sc.hi + 1e-9; v += sc.step) {
      g += '<line class="grid-line" x1="' + PADL + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y(v).toFixed(1) + '"/>';
      g += '<text class="chart-label" x="' + (PADL - 7) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    g += '<line class="zero-line" x1="' + PADL + '" y1="' + y(0).toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + y(0).toFixed(1) + '"/>';
    labels.forEach((l, i) => {
      const cx = PADL + bw * i + bw / 2;
      series.forEach((s, si) => {
        const v = s.values[i];
        if (v == null || !isFinite(v)) return;
        const bx = cx - inner / 2 + each * si;
        const top = Math.min(y(v), y(0)), h = Math.abs(y(v) - y(0));
        const c = s.cls === 'auto' ? (v >= 0 ? 'bar-up' : 'bar-down') : s.cls;
        g += '<rect class="' + c + '" x="' + bx.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + Math.max(each - 2, 1).toFixed(1) + '" height="' + Math.max(h, 1).toFixed(1) + '" rx="2"/>';
      });
      const t = String(l).split(' ');
      g += '<text class="chart-label" x="' + cx.toFixed(1) + '" y="' + (H - 24) + '" text-anchor="middle">' + t[0] + '</text>';
      if (t[1]) g += '<text class="chart-label" x="' + cx.toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + t[1] + '</text>';
    });
    const legend = series.filter(s => s.name).map(s => '<span><i class="sw-' + s.cls.replace('bar-', '') + '"></i>' + s.name + '</span>').join('');
    return '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + g + '</svg></div>' + (legend ? '<div class="chart-legend">' + legend + '</div>' : '');
  }

  const TIPS = {};      // 차트 id -> 항목별 툴팁 HTML
  let TIP_SEQ = 0;

  /* 100% 누적 막대 — 각 항목의 3사 구성비 */
  function stack100(opts) {
    const labels = opts.labels, series = opts.series;   // series: [{name, cls, values}]
    const H = opts.height || 300, PADB = 40, PADTT = 10;
    const bw = (W - PADL - PADR) / labels.length;
    const inner = Math.min(bw * 0.62, 64);
    let g = '';
    for (let p = 0; p <= 100; p += 25) {
      const yy = PADTT + (1 - p / 100) * (H - PADTT - PADB);
      g += '<line class="grid-line" x1="' + PADL + '" y1="' + yy.toFixed(1) + '" x2="' + (W - PADR) + '" y2="' + yy.toFixed(1) + '"/>';
      g += '<text class="chart-label" x="' + (PADL - 7) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end">' + p + '%</text>';
    }
    labels.forEach((l, i) => {
      const cx = PADL + bw * i + bw / 2;
      const tot = series.reduce((a, sr) => a + (Number(sr.values[i]) || 0), 0);
      let acc = 0;
      if (tot > 0) series.forEach(sr => {
        const ratio = (Number(sr.values[i]) || 0) / tot;
        const y0 = PADTT + (1 - (acc + ratio)) * (H - PADTT - PADB);
        const h = ratio * (H - PADTT - PADB);
        g += '<rect class="' + sr.cls + '" x="' + (cx - inner / 2).toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + inner.toFixed(1) + '" height="' + Math.max(h, 0).toFixed(1) + '"/>';
        if (ratio >= 0.07)
          g += '<text class="stack-lbl" x="' + cx.toFixed(1) + '" y="' + (y0 + h / 2 + 3.5).toFixed(1) + '" text-anchor="middle">' + (ratio * 100).toFixed(1) + '</text>';
        acc += ratio;
      });
      const t = String(l).split(' ');
      g += '<text class="stack-cat" x="' + cx.toFixed(1) + '" y="' + (H - 22) + '" text-anchor="middle">' + t[0] + '</text>';
      if (t[1]) g += '<text class="stack-cat" x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + t[1] + '</text>';
      if (opts.tips) g += '<rect class="hit-col" data-i="' + i + '" x="' + (PADL + bw * i).toFixed(1) + '" y="' + PADTT + '" width="' + bw.toFixed(1) + '" height="' + (H - PADTT - PADB + 24).toFixed(1) + '" rx="4"/>';
    });
    const legend = series.map(sr => '<span><i class="sw-' + sr.cls.replace('bar-', '') + '"></i>' + sr.name + '</span>').join('');
    let tipId = '';
    if (opts.tips) { tipId = 'tip' + (++TIP_SEQ); TIPS[tipId] = opts.tips; }
    return '<div class="chart-wrap' + (opts.tips ? ' has-tip" data-tip="' + tipId : '') + '"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + g + '</svg>' +
      (opts.tips ? '<div class="chart-tip"></div>' : '') + '</div><div class="chart-legend">' + legend + '</div>';
  }

  /* 100% 누적 막대 툴팁 바인딩 */
  const cy = (e, r) => e.clientY - r.top;
  function bindTips(root) {
    root.querySelectorAll('.chart-wrap.has-tip').forEach(wrap => {
      const tipEl = wrap.querySelector('.chart-tip');
      const tips = TIPS[wrap.getAttribute('data-tip')];
      if (!tipEl || !tips) return;
      const svg = wrap.querySelector('svg');
      svg.addEventListener('mousemove', e => {
        const hit = e.target.closest('[data-i]');
        if (!hit) { tipEl.classList.remove('on'); return; }
        const i = Number(hit.getAttribute('data-i'));
        if (tipEl.dataset.i !== String(i)) { tipEl.innerHTML = tips[i]; tipEl.dataset.i = String(i); }
        const r = wrap.getBoundingClientRect();
        const hw = tipEl.offsetWidth / 2, th = tipEl.offsetHeight;
        const GAP = 14;
        // 가로: 커서를 따라가되 차트 폭을 벗어나지 않게 (벗어난 만큼은 화살표를 옮겨 커서를 가리킨다)
        const cx = e.clientX - r.left;
        const x = Math.min(Math.max(cx, hw + 2), Math.max(r.width - hw - 2, hw + 2));
        // 세로: 기본은 커서 위. 화면 위쪽 공간이 모자라면 커서 아래로 뒤집는다
        const below = e.clientY - GAP - th < 8;
        tipEl.classList.toggle('below', below);
        tipEl.style.left = x + 'px';
        tipEl.style.top = (below ? cy(e, r) + GAP : cy(e, r) - GAP - th) + 'px';
        const caret = Math.min(Math.max(cx - (x - hw), 16), tipEl.offsetWidth - 16);
        tipEl.style.setProperty('--tip-caret', caret.toFixed(0) + 'px');
        tipEl.classList.add('on');
      });
      svg.addEventListener('mouseleave', () => tipEl.classList.remove('on'));
    });
  }

  /* ---------- 공통 ---------- */
  function ctx() {
    const keys = rangeKeys();
    const pk = prevKeys(keys).filter(k => M[k]);
    // 전년 동기가 부분만 존재하면 기간 길이가 달라 YoY가 왜곡되므로 비교를 끈다
    const comparable = pk.length > 0 && pk.length === keys.length;
    return { keys: keys, pk: pk, comparable: comparable, cur: agg(keys), prv: agg(comparable ? pk : []) };
  }

  function guide(text) {
    return '<div class="guide"><span class="lbl">읽는 법</span><span>' + text + '</span></div>';
  }

  function card(title, body, desc, tip) {
    return '<div class="card"><div class="card-header card-header-col"><div class="card-title">' + title + '</div>' +
      (desc ? '<div class="card-description">' + desc + '</div>' : '') + '</div><div class="card-content">' + body +
      (tip ? guide(tip) : '') + '</div></div>';
  }

  /* ---------- KPI ---------- */
  function renderKPI(c) {
    const mY = yoy(c.cur.total.market, c.prv.total.market);
    const yY = yoy(c.cur.total.yes, c.prv.total.yes);
    const sh = share(c.cur.total.yes, c.cur.total.market);
    const shP = share(c.prv.total.yes, c.prv.total.market);
    const gap = mY == null || yY == null ? null : yY - mY;
    const verdict = gap == null ? '' : gap >= 0
      ? (mY < 0 ? '시장 역성장 대비 선방' : '시장 대비 초과 성장')
      : (mY < 0 ? '시장보다 더 큰 하락' : '시장 성장분 미확보');
    document.getElementById('kpiRow').innerHTML =
      '<div class="stat-card"><div class="stat-head"><h4>① 3사 시장 성장률 (YoY)</h4></div>' +
      '<div class="stat-num ' + (mY < 0 ? 'danger' : '') + '">' + sgn(mY) + '</div>' +
      '<div class="stat-sub">시장 ' + nf(c.cur.total.market) + ' <span class="unit">백만</span> · 전년 ' + nf(c.prv.total.market) + '</div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>② 예스24 3사 내 점유율</h4></div>' +
      '<div class="stat-num">' + pct(sh) + ' <span class="delta ' + cls(sub(sh, shP)) + '">' + pp(sub(sh, shP)) + '</span></div>' +
      '<div class="stat-sub">전년동기 ' + pct(shP) + ' · 예스24 ' + nf(c.cur.total.yes) + ' 백만</div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>③ 시장 대비 성장 Gap</h4></div>' +
      '<div class="stat-num ' + (gap < 0 ? 'danger' : '') + '">' + pp(gap) + '</div>' +
      '<div class="stat-sub">예스24 ' + sgn(yY) + ' vs 시장 ' + sgn(mY) + ' → <b>' + verdict + '</b></div></div>';
  }

  /* ---------- ① 시장 현황 ---------- */
  function tab1(c) {
    const storeCards = STORES.map(s => {
      const v = c.cur.total[s.k], p = c.prv.total[s.k];
      const sh = share(v, c.cur.total.market), shp = share(p, c.prv.total.market);
      return '<div class="stat-card"><div class="stat-head"><h4 class="c-' + s.cls + '">' + s.name + '</h4>' +
        '<span class="badge badge-secondary">점유 ' + pct(sh) + '</span></div>' +
        '<div class="stat-num">' + nf(v) + '<span class="unit">백만</span></div>' +
        '<div class="stat-sub">YoY <span class="delta ' + cls(yoy(v, p)) + '">' + sgn(yoy(v, p)) + '</span> · 점유율 <span class="delta ' + cls(sub(sh, shp)) + '">' + pp(sub(sh, shp)) + '</span></div></div>';
    }).join('');

    const row = (name, a, b, tot) =>
      '<tr' + (tot ? ' class="total-row"' : '') + '><td>' + name + '</td>' +
      '<td class="num">' + nf(a.yes) + '</td><td class="' + cls(yoy(a.yes, b.yes)) + '">' + sgn(yoy(a.yes, b.yes)) + '</td>' +
      '<td class="num bl">' + nf(a.kyobo) + '</td><td class="' + cls(yoy(a.kyobo, b.kyobo)) + '">' + sgn(yoy(a.kyobo, b.kyobo)) + '</td>' +
      '<td class="num bl">' + nf(a.aladin) + '</td><td class="' + cls(yoy(a.aladin, b.aladin)) + '">' + sgn(yoy(a.aladin, b.aladin)) + '</td>' +
      '<td class="num bl">' + nf(a.market) + '</td><td class="' + cls(yoy(a.market, b.market)) + '">' + sgn(yoy(a.market, b.market)) + '</td>' +
      '<td class="num bl">' + pct(share(a.yes, a.market)) + '</td>' +
      '<td class="' + cls(sub(share(a.yes, a.market), share(b.yes, b.market))) + '">' + pp(sub(share(a.yes, a.market), share(b.yes, b.market))) + '</td></tr>';

    const rows = CATS.map(cat => row(cat, c.cur.cats[cat], c.prv.cats[cat], false)).join('') +
      row('전체', c.cur.total, c.prv.total, true);

    const table = '<div class="dt-wrap"><table class="dt"><thead>' +
      '<tr><th rowspan="2">분야</th><th class="grp" colspan="2">예스24</th><th class="grp" colspan="2">교보문고</th>' +
      '<th class="grp" colspan="2">알라딘</th><th class="grp" colspan="2">3사 합산</th><th class="grp" colspan="2">예스24 점유율</th></tr>' +
      '<tr><th>매출</th><th>YoY</th><th class="bl">매출</th><th>YoY</th><th class="bl">매출</th><th>YoY</th>' +
      '<th class="bl">매출</th><th>YoY</th><th class="bl">점유율</th><th>전년비</th></tr>' +
      '</thead><tbody>' + rows + '</tbody></table></div>';

    const tipFor = (name, a, b) => {
      const ranked = STORES.slice().sort((x, y) => a[y.k] - a[x.k]);
      const rows = STORES.map(sr => {
        const sh = share(a[sr.k], a.market), shp = share(b[sr.k], b.market);
        const d = sub(sh, shp);
        const rank = ranked.indexOf(sr) + 1;
        return '<div class="tt-store">' +
          '<div class="tt-l1"><i class="sw-' + sr.cls + '"></i>' +
          '<span class="tt-name">' + sr.name + (rank === 1 ? '<span class="tt-rank">1위</span>' : '') + '</span>' +
          '<span class="tt-share">' + pct(sh) + '</span>' +
          '<span class="tt-dpp ' + cls(d) + '">' + pp(d) + '</span></div>' +
          '<div class="tt-bar"><i class="sw-' + sr.cls + '" style="width:' + ((sh || 0) * 100).toFixed(1) + '%"></i></div>' +
          '<div class="tt-l2"><span>매출 <b>' + nf(a[sr.k]) + '</b> 백만</span>' +
          '<span>YoY <b class="' + cls(yoy(a[sr.k], b[sr.k])) + '">' + sgn(yoy(a[sr.k], b[sr.k])) + '</b></span></div>' +
          '</div>';
      }).join('');
      return '<div class="tt-head">' + name + '<span class="tt-total">' + nf(a.market) + ' 백만</span></div>' +
        '<div class="tt-sub">3사 합산 시장 · YoY <b class="' + cls(yoy(a.market, b.market)) + '">' + sgn(yoy(a.market, b.market)) + '</b>' +
        ' · 막대는 점유율, 우측은 전년 대비 증감</div>' + rows;
    };

    const shareBar = stack100({
      labels: CATS.map(x => x.replace('·', ' ')).concat(['전체']),
      height: 310,
      series: STORES.map(sr => ({
        name: sr.name, cls: 'bar-' + sr.cls,
        values: CATS.map(cat => c.cur.cats[cat][sr.k]).concat([c.cur.total[sr.k]]),
      })),
      tips: CATS.map(cat => tipFor(cat, c.cur.cats[cat], c.prv.cats[cat])).concat([tipFor('전체', c.cur.total, c.prv.total)]),
    });

    let notice = '';
    if (!c.comparable)
      notice += '<div class="callout warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><div>선택 기간의 <b>전년동기 데이터가 없어</b> YoY·점유율 증감을 계산할 수 없습니다. (데이터 시작 시점: 2023.01)</div></div>';
    if (c.keys.some(k => k.indexOf('2023-') === 0) || c.pk.some(k => k.indexOf('2023-') === 0))
      notice += '<div class="callout warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><div>2023년 원본에는 <b>「기타」 분야 행이 없어</b> 전체−분야합 잔여값으로 산출했고, <b>2023.01~10 수험서의 교보·알라딘 값이 미제공</b>이라 해당 분야 YoY는 참고용입니다.</div></div>';

    return notice + '<div class="grid grid-3" style="margin-bottom:14px">' + storeCards + '</div>' +
      card('서점별 · 분야별 매출과 YoY', table, '단위: 백만원 · 점유율은 3사 합산 기준',
        '한 행에서 3사를 가로로 비교합니다. 매출 크기보다 <b>맨 오른쪽 「점유율 전년비(%p)」</b>가 핵심 — 이 값이 +면 당사 매출이 줄었더라도 경쟁 3사 안에서는 비중을 키운 달입니다. 반대로 매출이 늘어도 이 값이 −면 시장이 더 빨리 커진 것입니다.') +
      '<div style="height:14px"></div>' +
      card('분야별 점유율', shareBar, '각 분야의 3사 합산 매출을 100%로 둔 서점별 구성비 (숫자 단위: %)',
        '막대 하나가 <b>그 분야의 3사 시장 전체(100%)</b>이고, 색 구간이 각 사의 몫입니다. 파란 구간(예스24)이 다른 두 구간보다 두꺼운 분야가 <b>당사가 1위인 분야</b>이며, 맨 오른쪽 「전체」와 비교해 <b>전체 평균보다 두꺼운지 얇은지</b>로 상대적 강·약 분야를 가릅니다. 다만 이 그래프는 「현재 위치」이므로, 오르는 중인지 내리는 중인지는 ③탭의 점유율 증감으로 확인하세요. <b>막대에 마우스를 올리면</b> 3사 점유율·매출과 각각의 전년 대비 증감을 함께 볼 수 있습니다.');
  }

  /* ---------- ② 기간별 추이 ---------- */
  function tab2() {
    const bs = buckets(rangeKeys());
    if (!bs.length) return '<div class="empty"><h2>조회 기간에 데이터가 없습니다</h2></div>';
    const labels = bs.map(b => b.id);
    const sum = (b, k) => b.months.reduce((acc, m) => acc + (k === 'market'
      ? M[m].total.yes + M[m].total.kyobo + M[m].total.aladin : M[m].total[k]), 0);
    const prevSum = (b, k) => {
      let t = 0, ok = false;
      b.months.forEach(m => {
        const p = M[shift(m, -12)];
        if (!p) return;
        ok = true;
        t += k === 'market' ? p.total.yes + p.total.kyobo + p.total.aladin : p.total[k];
      });
      return ok ? t : null;
    };
    const S = k => bs.map(b => sum(b, k));
    const Y = k => bs.map(b => { const p = prevSum(b, k); return p ? ((sum(b, k) - p) / p) * 100 : null; });
    const SH = bs.map(b => (sum(b, 'market') ? (sum(b, 'yes') / sum(b, 'market')) * 100 : null));
    const GAP = k => bs.map(b => sum(b, 'yes') - sum(b, k));
    const u = UNIT_NAME[state.unit];

    // 역전 시점 탐지 (예스24 vs 교보/알라딘)
    const cross = [];
    ['kyobo', 'aladin'].forEach(k => {
      const g = GAP(k);
      for (let i = 1; i < g.length; i++)
        if ((g[i - 1] >= 0) !== (g[i] >= 0))
          cross.push((k === 'kyobo' ? '교보문고' : '알라딘') + ' ' + labels[i] + (g[i] < 0 ? ' 역전당함' : ' 재역전'));
    });
    const crossNote = cross.length
      ? '이 구간의 순위 역전: <b>' + cross.join('</b>, <b>') + '</b>'
      : '이 구간에서는 순위 역전이 없었습니다';

    return '<div class="grid grid-2" style="gap:14px">' +
      card('3사 ' + u + '별 매출 추이', lineChart({ labels: labels, series: STORES.map(sr => ({ name: sr.name, cls: 'line-' + sr.cls, values: S(sr.k) })) }), '단위: 백만원 · 집계단위: ' + u,
        '선의 높낮이(규모)보다 <b>선 사이 간격의 변화</b>를 보세요. 간격이 벌어지면 격차 확대, 좁아지면 추격 중입니다. 3사가 동시에 오르내리는 구간은 계절성·시장 요인이므로, <b>집계단위를 분기·반기·연도로 올리면</b> 계절성이 걷히고 장기 추세가 드러납니다.') +
      card('예스24 대비 경쟁사 격차', lineChart({
        labels: labels, zero: true,
        series: [
          { name: '예스24 − 교보문고', cls: 'line-gap-kyobo', values: GAP('kyobo') },
          { name: '예스24 − 알라딘', cls: 'line-gap-aladin', values: GAP('aladin') },
        ],
      }), '단위: 백만원 · 0선 = 매출 동률',
        '<b>0선을 아래로 통과한 지점이 해당 경쟁사에 매출을 추월당한 시점</b>입니다. 이후 선이 계속 내려가면 격차 확대, 0선 쪽으로 올라오면 축소입니다. ' + crossNote + '.') +
      card('서점별 YoY 추이', lineChart({ labels: labels, zero: true, fmt: v => v.toFixed(0) + '%', series: STORES.map(sr => ({ name: sr.name, cls: 'line-' + sr.cls, values: Y(sr.k) })) }), '전년 동일 ' + u + ' 대비',
        '<b>0% 기준선 위/아래</b>가 성장/역성장입니다. 세 선이 함께 내려가면 시장 전체 축소(외부 요인), <b>파란 선만 따로 내려가면 당사 요인</b>이므로 상품·프로모션을 점검할 신호입니다.') +
      card('예스24 3사 내 점유율 추이', lineChart({ labels: labels, fmt: v => v.toFixed(0) + '%', series: [{ name: '예스24 점유율', cls: 'line-yes', values: SH }] }), '3사 합산 매출 대비',
        '<b>기울기</b>가 곧 경쟁력 방향입니다. 우하향이면 시장에서 밀리는 중. 월 단위에는 계절성이 섞이므로 장기 흐름은 분기·반기 단위로 보는 편이 정확합니다.') +
      card('시장 성장률 vs 예스24 성장률', lineChart({
        labels: labels, zero: true, fmt: v => v.toFixed(0) + '%',
        series: [{ name: '3사 시장 YoY', cls: 'line-market', values: Y('market') }, { name: '예스24 YoY', cls: 'line-yes', values: Y('yes') }],
      }), '두 선의 간격이 곧 성장 Gap',
        '<b>회색 점선(시장) 위에 파란 선(예스24)이 있으면 초과 성장</b>, 아래면 부진입니다. 시장이 −10%인데 당사가 −5%면 파란 선이 위 → 역성장 구간에서도 선방한 것으로 읽습니다.') +
      '</div>';
  }

  /* ---------- ③ 분야별 경쟁력 ---------- */
  function tab3(c) {
    const rows = CATS.map(cat => {
      const a = c.cur.cats[cat], b = c.prv.cats[cat];
      const mY = yoy(a.market, b.market), yY = yoy(a.yes, b.yes);
      const gap = mY == null || yY == null ? null : yY - mY;
      const sh = share(a.yes, a.market), shp = share(b.yes, b.market);
      const g = gap == null ? 'even' : gap > 0.005 ? 'win' : gap < -0.005 ? 'lose' : 'even';
      return { cat: cat, mY: mY, yY: yY, kY: yoy(a.kyobo, b.kyobo), aY: yoy(a.aladin, b.aladin), sh: sh, sd: sub(sh, shp), gap: gap, g: g, size: a.market };
    }).sort((x, y) => (y.gap == null ? -9 : y.gap) - (x.gap == null ? -9 : x.gap));

    const body = rows.map(r => '<tr><td>' + r.cat + '</td>' +
      '<td><span class="heat" style="' + heat(r.mY) + '">' + sgn(r.mY) + '</span></td>' +
      '<td><span class="heat" style="' + heat(r.yY) + '">' + sgn(r.yY) + '</span></td>' +
      '<td class="' + cls(r.kY) + '">' + sgn(r.kY) + '</td>' +
      '<td class="' + cls(r.aY) + '">' + sgn(r.aY) + '</td>' +
      '<td class="num bl">' + pct(r.sh) + '</td>' +
      '<td class="' + cls(r.sd) + '">' + pp(r.sd) + '</td>' +
      '<td class="bl"><span class="gap-badge ' + r.g + '">' + (r.g === 'win' ? '▲ 초과' : r.g === 'lose' ? '▼ 부진' : '– 유사') + ' ' + pp(r.gap) + '</span></td></tr>').join('');

    const table = '<div class="dt-wrap"><table class="dt"><thead><tr>' +
      '<th>분야</th><th>시장 YoY</th><th>예스24 YoY</th><th>교보 YoY</th><th>알라딘 YoY</th>' +
      '<th class="bl">예스24 점유율</th><th>점유율 증감</th><th class="bl">성장 Gap</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';

    // 매트릭스 (시장 YoY vs 예스24 YoY)
    const H = 340, PL = 54, PB = 40;
    const xs = rows.map(r => r.mY).filter(v => v != null && isFinite(v));
    const ys = rows.map(r => r.yY).filter(v => v != null && isFinite(v));
    let q = '<div class="empty"><p>비교 가능한 전년 데이터가 없습니다</p></div>';
    if (xs.length) {
      const lo = Math.min(0, Math.min.apply(null, xs), Math.min.apply(null, ys));
      const hi = Math.max(0, Math.max.apply(null, xs), Math.max.apply(null, ys));
      const sc = niceScale(lo, hi);
      const X = v => PL + ((v - sc.lo) / (sc.hi - sc.lo)) * (W - PL - 14);
      const Yy = v => PADT + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - PADT - PB);
      let g = '';
      const x0 = X(sc.lo), x1 = X(sc.hi), y0 = Yy(sc.lo), y1 = Yy(sc.hi);
      g += '<polygon class="quad-bg-win" points="' + x0 + ',' + y0 + ' ' + x1 + ',' + y1 + ' ' + x0 + ',' + y1 + '"/>';
      g += '<polygon class="quad-bg-lose" points="' + x0 + ',' + y0 + ' ' + x1 + ',' + y1 + ' ' + x1 + ',' + y0 + '"/>';
      for (let v = sc.lo; v <= sc.hi + 1e-9; v += sc.step) {
        g += '<line class="grid-line" x1="' + X(v).toFixed(1) + '" y1="' + PADT + '" x2="' + X(v).toFixed(1) + '" y2="' + (H - PB) + '"/>';
        g += '<text class="chart-label" x="' + X(v).toFixed(1) + '" y="' + (H - PB + 15) + '" text-anchor="middle">' + (v * 100).toFixed(0) + '%</text>';
        g += '<line class="grid-line" x1="' + PL + '" y1="' + Yy(v).toFixed(1) + '" x2="' + (W - 14) + '" y2="' + Yy(v).toFixed(1) + '"/>';
        g += '<text class="chart-label" x="' + (PL - 7) + '" y="' + (Yy(v) + 3.5).toFixed(1) + '" text-anchor="end">' + (v * 100).toFixed(0) + '%</text>';
      }
      g += '<line class="zero-line" x1="' + PL + '" y1="' + Yy(0).toFixed(1) + '" x2="' + (W - 14) + '" y2="' + Yy(0).toFixed(1) + '"/>';
      g += '<line class="zero-line" x1="' + X(0).toFixed(1) + '" y1="' + PADT + '" x2="' + X(0).toFixed(1) + '" y2="' + (H - PB) + '"/>';
      g += '<line class="line-market" x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y1 + '" stroke-width="1.5"/>';
      g += '<text class="quad-zone" x="' + (PL + 10) + '" y="' + (PADT + 16) + '">시장보다 더 성장 (경쟁력 확보)</text>';
      g += '<text class="quad-zone" x="' + (W - 24) + '" y="' + (H - PB - 10) + '" text-anchor="end">시장보다 부진 (점유율 하락)</text>';
      const rmax = Math.max.apply(null, rows.map(r => r.size));
      rows.forEach(r => {
        if (r.mY == null || r.yY == null || !isFinite(r.mY) || !isFinite(r.yY)) return;
        const rad = 5 + 11 * Math.sqrt(r.size / rmax);
        g += '<circle class="' + (r.g === 'lose' ? 'bar-down' : 'bar-yes') + '" cx="' + X(r.mY).toFixed(1) + '" cy="' + Yy(r.yY).toFixed(1) + '" r="' + rad.toFixed(1) + '" opacity="0.72"/>';
        g += '<text class="quad-label" x="' + X(r.mY).toFixed(1) + '" y="' + (Yy(r.yY) - rad - 4).toFixed(1) + '" text-anchor="middle">' + r.cat + '</text>';
      });
      q = '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' + g + '</svg></div>' +
        '<div class="chart-legend"><span>가로: 시장 YoY</span><span>세로: 예스24 YoY</span><span>원 크기: 시장 규모</span><span>대각선 위쪽 = 시장 초과 성장</span></div>';
    }

    const win = rows.filter(r => r.g === 'win').map(r => r.cat);
    const lose = rows.filter(r => r.g === 'lose').map(r => r.cat);
    const callout = '<div class="callout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      '<div>시장 대비 <b>초과 성장</b>: ' + (win.length ? win.join(', ') : '없음') + ' &nbsp;/&nbsp; <b>상대적 부진</b>: ' + (lose.length ? lose.join(', ') : '없음') + '</div></div>';

    return callout + card('분야별 경쟁력 비교', table, '성장 Gap = 예스24 YoY − 3사 시장 YoY (Gap 내림차순)',
        '<b>표는 성장 Gap 내림차순</b>입니다. 위쪽은 시장보다 잘한 분야, 아래쪽은 시장을 못 따라간 분야. 「시장 YoY」와 「예스24 YoY」 두 칸의 색 농도를 좌우로 비교해, <b>시장은 초록인데 당사가 빨간 행</b>을 먼저 보세요 — 성장하는 시장을 놓치고 있는 분야입니다.') +
      '<div style="height:14px"></div>' + card('시장 성장률 vs 예스24 성장률 매트릭스', q, '가로: 시장 YoY · 세로: 예스24 YoY · 원 크기: 시장 규모',
      '<b>대각선 위쪽 = 시장보다 더 성장</b>(초록 영역), 아래쪽 = 시장 대비 부진(붉은 영역). 오른쪽 아래(시장은 크게 성장했는데 당사는 정체)가 가장 위험한 자리입니다. <b>원 크기는 시장 규모</b>라, 큰 원이 아래쪽에 있으면 매출 영향이 커서 우선 대응 대상입니다.');
  }

  /* ---------- ④ 기여도 ---------- */
  function tab4(c) {
    if (!c.comparable)
      return '<div class="card"><div class="card-content"><div class="empty"><h2>전년 동기 데이터가 없어 기여도를 계산할 수 없습니다</h2>' +
        '<p>증감 기여도는 전년 동기와 1:1로 비교해야 하므로, 조회 시작월을 <b>2024.01 이후</b>로 조정해 주세요. (데이터 시작: 2023.01)</p></div></div></div>';
    const dYes = c.cur.total.yes - c.prv.total.yes;
    const dMkt = c.cur.total.market - c.prv.total.market;
    const rows = CATS.map(cat => {
      const a = c.cur.cats[cat], b = c.prv.cats[cat];
      const dy = a.yes - b.yes, dm = a.market - b.market;
      return { cat: cat, dy: dy, dm: dm, ry: dYes ? dy / dYes : null, rm: dMkt ? dm / dMkt : null, capture: dm ? dy / dm : null };
    }).sort((x, y) => Math.abs(y.dm) - Math.abs(x.dm));

    const diag = r => r.dm > 0 && r.dy <= 0 ? '<span class="gap-badge lose">시장 성장분 미확보</span>'
      : r.dm > 0 && r.dy > 0 ? '<span class="gap-badge win">시장 성장 흡수 ' + pct(r.capture, 0) + '</span>'
        : r.dm < 0 && r.dy >= 0 ? '<span class="gap-badge win">역성장 시장서 성장</span>'
          : '<span class="gap-badge even">동반 감소</span>';

    const body = rows.map(r => '<tr><td>' + r.cat + '</td>' +
      '<td class="' + cls(r.dy) + '">' + signed(r.dy) + '</td>' +
      '<td class="' + cls(r.ry) + '">' + pct(r.ry) + '</td>' +
      '<td class="' + cls(r.dm) + ' bl">' + signed(r.dm) + '</td>' +
      '<td class="' + cls(r.rm) + '">' + pct(r.rm) + '</td>' +
      '<td class="bl">' + diag(r) + '</td></tr>').join('');

    const table = '<div class="dt-wrap"><table class="dt"><thead><tr>' +
      '<th>분야</th><th>예스24 증감액</th><th>예스24 기여율</th><th class="bl">시장 증감액</th><th>시장 기여율</th><th class="bl">진단</th>' +
      '</tr></thead><tbody>' + body +
      '<tr class="total-row"><td>전체</td><td class="' + cls(dYes) + '">' + signed(dYes) + '</td><td>100.0%</td>' +
      '<td class="' + cls(dMkt) + ' bl">' + signed(dMkt) + '</td><td>100.0%</td><td class="bl"></td></tr>' +
      '</tbody></table></div>';

    const chart = barChart({
      labels: rows.map(r => r.cat.replace('·', ' ')),
      series: [
        { name: '예스24 증감액', cls: 'bar-yes', values: rows.map(r => r.dy) },
        { name: '3사 시장 증감액', cls: 'bar-market', values: rows.map(r => r.dm) },
      ],
      height: 280,
    });

    const miss = rows.filter(r => r.dm > 0 && r.dy <= 0);
    const callout = miss.length
      ? '<div class="callout warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg><div><b>시장 성장분 미확보 분야</b>: ' +
        miss.map(r => r.cat + '(시장 ' + signed(r.dm) + ' / 당사 ' + signed(r.dy) + ')').join(', ') + ' — 시장은 커졌지만 당사 매출은 늘지 않았습니다.</div></div>'
      : '';

    return callout + card('분야별 매출 증감 기여도', table, '단위: 백만원 · 예스24 전체 증감 ' + signed(dYes) + ', 3사 시장 전체 증감 ' + signed(dMkt),
      '「예스24 기여율」은 <b>당사 전체 증감액 중 이 분야가 차지한 비중</b>, 「시장 기여율」은 <b>시장 증감액 중 이 분야의 비중</b>입니다. 두 값이 크게 어긋난 행이 시장과 다른 방향으로 움직인 분야이고, 맨 오른쪽 「진단」이 그 관계를 문장으로 요약합니다.') +
      '<div style="height:14px"></div>' + card('분야별 증감액 — 예스24 vs 시장', chart, '분야별 전년 대비 증감액 (0선 기준)',
      '분야마다 <b>파란 막대(당사)와 회색 막대(시장)의 방향·크기</b>를 비교합니다. 회색이 0선 위로 크게 솟았는데 파란 막대가 낮거나 0선 아래면, 그 분야에서 커진 시장을 경쟁사가 가져갔다는 뜻입니다.');
  }

  /* ---------- ⑤ 분야별 상세 ---------- */
  function tab5(c) {
    const chips = CATS.map(x => '<button class="cat-chip ' + (x === state.cat ? 'active' : '') + '" data-c="' + x + '">' + x + '</button>').join('');
    const bs = buckets(rangeKeys());
    const labels = bs.map(b => b.id);
    const cat = state.cat;
    const u = UNIT_NAME[state.unit];
    const bv = (b, s) => b.months.reduce((acc, m) => acc + (((M[m].cats[cat] || {})[s]) || 0), 0);
    const bmk = b => bv(b, 'yes') + bv(b, 'kyobo') + bv(b, 'aladin');
    const bprev = (b, s) => {
      let t = 0, ok = false;
      b.months.forEach(m => {
        const p = M[shift(m, -12)];
        if (!p || !p.cats[cat]) return;
        ok = true;
        t += p.cats[cat][s] || 0;
      });
      return ok ? t : null;
    };

    const c1 = lineChart({ labels: labels, series: STORES.map(sr => ({ name: sr.name, cls: 'line-' + sr.cls, values: bs.map(b => bv(b, sr.k)) })) });
    const c2 = lineChart({
      labels: labels, zero: true, fmt: x => x.toFixed(0) + '%',
      series: STORES.map(sr => ({
        name: sr.name, cls: 'line-' + sr.cls,
        values: bs.map(b => { const pv = bprev(b, sr.k); return pv ? ((bv(b, sr.k) - pv) / pv) * 100 : null; }),
      })),
    });
    const c3 = lineChart({ labels: labels, fmt: x => x.toFixed(0) + '%', series: [{ name: '예스24 점유율', cls: 'line-yes', values: bs.map(b => (bmk(b) ? (bv(b, 'yes') / bmk(b)) * 100 : null)) }] });
    const c4 = barChart({
      labels: labels, fmt: x => x.toFixed(1), height: 230,
      series: [{
        name: '점유율 전년비(%p)', cls: 'auto',
        values: bs.map(b => {
          const py = bprev(b, 'yes'), pk = bprev(b, 'kyobo'), pa = bprev(b, 'aladin');
          const pm = (py || 0) + (pk || 0) + (pa || 0);
          if (py == null || !pm || !bmk(b)) return null;
          return (bv(b, 'yes') / bmk(b) - py / pm) * 100;
        }),
      }],
    });

    const a = c.cur.cats[cat], b = c.prv.cats[cat];
    const sh = share(a.yes, a.market), shp = share(b.yes, b.market);
    const gap = sub(yoy(a.yes, b.yes), yoy(a.market, b.market));
    const stats = '<div class="grid grid-4" style="margin-bottom:14px">' +
      '<div class="stat-card"><div class="stat-head"><h4>예스24 매출</h4></div><div class="stat-num">' + nf(a.yes) + '<span class="unit">백만</span></div><div class="stat-sub">YoY <span class="delta ' + cls(yoy(a.yes, b.yes)) + '">' + sgn(yoy(a.yes, b.yes)) + '</span></div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>3사 시장</h4></div><div class="stat-num">' + nf(a.market) + '<span class="unit">백만</span></div><div class="stat-sub">YoY <span class="delta ' + cls(yoy(a.market, b.market)) + '">' + sgn(yoy(a.market, b.market)) + '</span></div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>예스24 점유율</h4></div><div class="stat-num">' + pct(sh) + '</div><div class="stat-sub">전년비 <span class="delta ' + cls(sub(sh, shp)) + '">' + pp(sub(sh, shp)) + '</span></div></div>' +
      '<div class="stat-card"><div class="stat-head"><h4>성장 Gap</h4></div><div class="stat-num ' + (gap < 0 ? 'danger' : '') + '">' + pp(gap) + '</div><div class="stat-sub">예스24 YoY − 시장 YoY</div></div>' +
      '</div>';

    return '<div class="cat-chips" id="catChips">' + chips + '</div>' + stats +
      '<div class="grid grid-2" style="gap:14px">' +
      card(cat + ' — 3사 ' + u + '별 매출', c1, '조회 기간 · 단위: 백만원',
      '이 분야에서의 <b>3사 절대 규모 차이</b>와 최근 흐름을 봅니다. 특정 월의 급등은 신간·프로모션 영향일 수 있어 다음 차트(YoY)와 함께 보세요.') +
      card(cat + ' — 3사 YoY', c2, '전년 동일 ' + u + ' 대비',
      '<b>3사가 함께 하락하면 분야 자체가 축소</b>되는 중이고, <b>당사만 하락하면 당사 요인</b>입니다. 대응 방향(시장 방어 vs 내부 개선)이 갈리는 지점입니다.') +
      card(cat + ' — 예스24 점유율', c3, '3사 합산 대비',
      '이 분야 안에서 <b>당사 위치의 변화</b>입니다. 매출이 줄어도 이 선이 유지되면 시장 축소를 함께 겪은 것이고, 이 선이 꺾이면 경쟁에서 밀린 것입니다.') +
      card(cat + ' — 점유율 증감(%p)', c4, '전년 동일 ' + u + ' 대비 점유율 변화 (단위: %p)',
      '<b>초록 막대는 전년보다 점유율이 오른 달, 붉은 막대는 내린 달</b>입니다. 붉은 막대가 연속되면 일시적 부진이 아니라 구조적 이탈 신호로 봅니다.') +
      '</div>';
  }

  /* 분기·반기·연도 단위에서 마지막 구간이 아직 다 안 찬 경우 알림 */
  function partialNote(bs) {
    const need = { M: 1, Q: 3, H: 6, Y: 12 }[state.unit];
    if (!bs.length || need === 1) return '';
    const last = bs[bs.length - 1];
    if (last.months.length >= need) return '';
    return ' · <b class="est">' + last.id + '은 ' + last.months.length + '/' + need + '개월만 집계된 미완결 구간</b>';
  }

  /* ---------- render ---------- */
  function render() {
    Object.keys(TIPS).forEach(k => delete TIPS[k]);   // 재렌더 시 이전 툴팁 데이터 정리
    const c = ctx();
    const bs = buckets(c.keys);
    document.getElementById('rangeNote').innerHTML =
      '조회 <b>' + label(c.keys[0]) + ' ~ ' + label(c.keys[c.keys.length - 1]) + '</b> (' + c.keys.length + '개월, ' +
      UNIT_NAME[state.unit] + ' 단위 ' + bs.length + '구간) · 전년 동기 비교 <b>' +
      (c.pk.length ? label(c.pk[0]) + ' ~ ' + label(c.pk[c.pk.length - 1]) + (c.comparable ? '' : ' (기간 불일치 — YoY 계산 제외)') : '데이터 없음') + '</b>' +
      partialNote(bs);
    renderKPI(c);
    document.getElementById('t1').innerHTML = tab1(c);
    document.getElementById('t2').innerHTML = tab2();
    document.getElementById('t3').innerHTML = tab3(c);
    document.getElementById('t4').innerHTML = tab4(c);
    document.getElementById('t5').innerHTML = tab5(c);
    bindTips(document.getElementById('t1'));
    const chips = document.getElementById('catChips');
    if (chips) chips.addEventListener('click', e => {
      const b = e.target.closest('.cat-chip');
      if (!b) return;
      state.cat = b.getAttribute('data-c');
      render();
      setTab('t5');
    });
  }

  function setTab(id) {
    const btns = document.querySelectorAll('#tabs button');
    for (let i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].getAttribute('data-t') === id);
    const ps = document.querySelectorAll('.tab-panel');
    for (let i = 0; i < ps.length; i++) ps[i].classList.toggle('active', ps[i].id === id);
  }

  /* ---------- init ---------- */
  const selFrom = document.getElementById('selFrom');
  const selTo = document.getElementById('selTo');
  const opts = k => KEYS.slice().reverse().map(x => '<option value="' + x + '">' + x.replace('-', '.') + '</option>').join('');
  selFrom.innerHTML = opts();
  selTo.innerHTML = opts();

  function setRange(from, to) {
    state.from = from < KEYS[0] ? KEYS[0] : from;
    state.to = to > LAST ? LAST : to;
    if (state.from > state.to) state.from = state.to;
    selFrom.value = state.from;
    selTo.value = state.to;
    render();
  }
  setRange(shift(LAST, -11), LAST);           // 기본: 최근 12개월 · 월 단위

  selFrom.addEventListener('change', () => setRange(selFrom.value, state.to));
  selTo.addEventListener('change', () => setRange(state.from, selTo.value));

  document.getElementById('segUnit').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    state.unit = b.getAttribute('data-u');
    const all = document.querySelectorAll('#segUnit button');
    for (let i = 0; i < all.length; i++) all[i].classList.toggle('active', all[i] === b);
    render();
  });

  document.getElementById('segQuick').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const q = b.getAttribute('data-q');
    if (q === 'all') setRange(KEYS[0], LAST);
    else setRange(shift(LAST, -(Number(q) - 1)), LAST);
  });

  document.getElementById('tabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) setTab(b.getAttribute('data-t'));
  });

  document.getElementById('themeToggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    document.getElementById('iconMoon').classList.toggle('hidden', dark);
    document.getElementById('iconSun').classList.toggle('hidden', !dark);
  });
})();
