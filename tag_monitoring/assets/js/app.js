/* 태그 모니터링 POC — 정적 데이터 렌더링 (DB 연결 없음) */
(function () {
  'use strict';
  var D = window.TM_DATA;
  var $ = function (id) { return document.getElementById(id); };
  var nf = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ENT[c]; }); };
  var charts = {};
  var uploaded = false;

  /* ── 테마 색상 (Labs.Web/wwwroot/js/chart-helpers.js 의 AxChart 규약을 따름) ── */
  var root = document.documentElement;
  function cssVar(name, fb) {
    try { var v = getComputedStyle(root).getPropertyValue(name); return (v && v.trim()) || fb || ''; } catch (e) { return fb || ''; }
  }
  function isDark() { return root.classList.contains('dark'); }
  function colors() {
    var border = cssVar('--border', 'rgba(0,0,0,0.1)');
    return {
      text: cssVar('--muted-foreground', 'rgba(0,0,0,0.5)'),
      grid: 'color-mix(in oklab, ' + border + ' 70%, transparent)',
      border: border,
      primary: cssVar('--primary', '#4f7cff'),
      warning: cssVar('--warning', '#f5a524'),
      muted: cssVar('--muted', '#eeeeee'),
      palette: ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']
        .map(function (n) { return cssVar(n, ''); }).filter(Boolean)
    };
  }
  function pal(i) { var p = colors().palette; return p.length ? p[i % p.length] : '#4f7cff'; }

  /* ── 파생 지표 ── */
  var sumTag = D.tagClicks.reduce(function (a, b) { return a + b.clicks; }, 0);
  var sumProd = D.prodClicks.reduce(function (a, b) { return a + b.clicks; }, 0);
  var tagByName = {};
  D.tagClicks.forEach(function (t) { tagByName[t.name] = t.clicks; });
  var funnel = D.prodClicks
    .filter(function (p) { return tagByName[p.name] != null; })
    .map(function (p) { return { name: p.name, x: tagByName[p.name], y: p.clicks, ratio: p.clicks / tagByName[p.name] }; });

  /* ── KPI ── */
  function renderKpi() {
    var zero = D.newTags.filter(function (t) { return t.linked === 0; }).length;
    $('kpiNewTags').textContent = nf(D.newTags.length);
    $('kpiNewTagsSub').textContent = zero ? '연결상품 0건 ' + zero + '개 포함' : '모두 상품 연결됨';
    $('kpiNewTagsSub').className = 'stat-change ' + (zero ? 'negative' : 'positive');
    $('kpiTagClicks').textContent = nf(sumTag);
    $('kpiProdClicks').textContent = nf(sumProd);
    $('kpiRatio').textContent = (sumProd / sumTag).toFixed(1) + 'x';
    // 산점도는 두 순위표에 모두 든 태그만 좌표가 나온다 — 표본 수를 명시한다
    $('funnelDesc').textContent = '점선 위쪽은 한 번 눌릴 때 상품을 깊게 파는 태그, 아래쪽은 태그만 눌리고 마는 태그입니다. '
      + '태그 클릭 · 연결상품 클릭 양쪽 상위 20위에 모두 든 ' + funnel.length + '개 태그만 표시됩니다.';
  }

  /* ── 테이블 ── */
  function table(el, head, rows) {
    el.innerHTML = '<thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>'
      + '<tbody>' + rows.join('') + '</tbody>';
  }

  function renderTables() {
    table($('tblTagClicks'), ['순위', '태그명', '클릭수'], D.tagClicks.map(function (r) {
      return '<tr><td class="tm-num">' + r.rank + '</td><td>' + esc(r.name) + '</td><td class="tm-num">' + nf(r.clicks) + '</td></tr>';
    }));

    table($('tblProdClicks'), ['순위', '태그명', '클릭수'], D.prodClicks.map(function (r) {
      return '<tr><td class="tm-num">' + r.rank + '</td><td>' + esc(r.name) + '</td><td class="tm-num">' + nf(r.clicks) + '</td></tr>';
    }));

    table($('tblProdDetail'), ['순위', '태그명', '상품번호', '상품명', '관리분류명', '클릭수'], D.prodDetail.map(function (r) {
      return '<tr><td class="tm-num">' + r.rank + '</td><td>' + esc(r.tag) + '</td><td class="tm-mono">' + esc(r.pid) + '</td><td>' + esc(r.title)
        + '</td><td><span class="badge badge-secondary">' + esc(r.cat) + '</span></td><td class="tm-num">' + nf(r.clicks) + '</td></tr>';
    }));

    table($('tblNewTags'), ['태그번호', '태그명', '등록자', '등록일', '연결상품수'], D.newTags.map(function (r) {
      var warn = r.linked === 0;
      return '<tr><td class="tm-mono">' + esc(r.no) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.user) + '</td><td class="tm-mono">' + esc(r.date)
        + '</td><td class="tm-num">' + (warn ? '<span class="badge badge-warning">연결 0건</span>' : nf(r.linked)) + '</td></tr>';
    }));

    var freq = {};
    D.daily.forEach(function (row) { row.tags.forEach(function (t) { if (t) freq[t] = (freq[t] || 0) + 1; }); });
    table($('tblDaily'), ['순위'].concat(D.dailyDates), D.daily.map(function (row) {
      return '<tr><td class="tm-num">' + row.rank + '</td>' + row.tags.map(function (t) {
        var lv = Math.min(4, Math.ceil((freq[t] || 0) / 2));
        return '<td><span class="tm-heat tm-heat-' + lv + '">' + esc(t) + '</span></td>';
      }).join('') + '</tr>';
    }));
  }

  /* ── 태그 작업 큐 ── */
  function queueRows() {
    var scope = document.querySelector('[data-scope].active').getAttribute('data-scope');
    var src = $('tmSrcFilter').value;
    var list = [];
    if (uploaded && src !== 'best') {
      list = list.concat(D.mainUpdate.map(function (r) { return { src: 'main', cat: r.cat, pid: r.pid, title: r.title, tags: r.tags, miss: r.miss }; }));
    }
    if (src !== 'main') {
      list = list.concat(D.best100.map(function (r) { return { src: 'best', cat: r.cat, pid: r.pid, title: r.title, tags: r.tags, miss: r.miss }; }));
    }
    if (scope === 'miss') list = list.filter(function (r) { return r.miss; });
    return list;
  }

  function renderQueue() {
    var list = queueRows();
    $('tmQueueEmpty').classList.toggle('hidden', list.length > 0);
    $('tblQueue').classList.toggle('hidden', list.length === 0);
    $('tmQueueCount').textContent = nf(list.length) + '건';
    table($('tblQueue'), ['출처', '관리분류명', '상품번호', '상품명', '태그'], list.map(function (r) {
      var tags = r.tags.length
        ? r.tags.map(function (t) { return '<span class="tag' + (t === '청년패스' ? ' tm-tag-auto' : '') + '">' + esc(t) + '</span>'; }).join('')
        : '<span class="badge badge-warning">태그 없음</span>';
      return '<tr class="' + (r.miss ? 'tm-miss' : '') + '">'
        + '<td><span class="badge ' + (r.src === 'main' ? 'badge-primary' : 'badge-outline') + '">' + (r.src === 'main' ? '메인' : '베스트') + '</span></td>'
        + '<td>' + esc(r.cat) + '</td><td class="tm-mono">' + esc(r.pid) + '</td><td>' + esc(r.title) + '</td>'
        + '<td><div class="tag-list">' + tags + '</div></td></tr>';
    }));
  }

  /* ── 차트 ── */
  function destroy() {
    Object.keys(charts).forEach(function (k) { if (charts[k]) charts[k].destroy(); });
    charts = {};
  }

  var labelPlugin = {
    id: 'tmLabels',
    afterDatasetsDraw: function (c) {
      var meta = c.getDatasetMeta(0);
      if (!meta || !meta.data) return;
      var ctx = c.ctx, cl = colors();
      ctx.save();
      ctx.font = '11px ' + cssVar('--font-sans', 'sans-serif');
      ctx.fillStyle = cl.text;
      ctx.textAlign = 'center';
      meta.data.forEach(function (pt, i) {
        var d = c.data.datasets[0].data[i];
        if (!d || !d.label) return;
        if (d.ratio < 1.2 || d.ratio > 3.5) ctx.fillText(d.label, pt.x, pt.y - 10);
      });
      ctx.restore();
    }
  };

  function buildCharts() {
    var cl = colors();
    var legend = { labels: { color: cl.text, boxWidth: 10, font: { size: 11 } } };
    var ax = function (o) {
      var a = { grid: { color: cl.grid }, ticks: { color: cl.text, font: { size: 11 } } };
      if (o) Object.keys(o).forEach(function (k) { a[k] = o[k]; });
      return a;
    };
    var common = { responsive: true, maintainAspectRatio: false };

    /* 퍼널 산점도 */
    var maxX = Math.max.apply(null, funnel.map(function (p) { return p.x; }));
    charts.funnel = new Chart($('chFunnel'), {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '태그', pointRadius: 6, pointHoverRadius: 9,
            backgroundColor: cl.primary, borderColor: cl.primary,
            data: funnel.map(function (p) { return { x: p.x, y: p.y, label: p.name, ratio: p.ratio }; })
          },
          {
            label: '1:1 기준선', type: 'line', borderColor: cl.border, borderDash: [4, 4], borderWidth: 1,
            pointRadius: 0, fill: false, data: [{ x: 0, y: 0 }, { x: maxX, y: maxX }]
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: ax({ title: { display: true, text: '태그 클릭', color: cl.text } }),
          y: ax({ title: { display: true, text: '연결상품 클릭', color: cl.text } })
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (c) {
                var d = c.raw;
                if (!d.label) return '';
                return [d.label, '태그 클릭 ' + nf(d.x) + ' → 상품 클릭 ' + nf(d.y), '전환 배율 ' + d.ratio.toFixed(1) + 'x'];
              }
            }
          }
        }
      },
      plugins: [labelPlugin]
    });

    /* 요일별 순위 범프 */
    var series = {};
    D.daily.forEach(function (row) {
      row.tags.forEach(function (t, di) {
        if (!t) return;
        if (!series[t]) series[t] = D.dailyDates.map(function () { return null; });
        series[t][di] = row.rank;
      });
    });
    var picked = Object.keys(series)
      .map(function (k) {
        var days = series[k].filter(function (v) { return v != null; }).length;
        return { name: k, data: series[k], days: days };
      })
      .filter(function (s) { return s.days >= 3; })
      .sort(function (a, b) { return b.days - a.days; })
      .slice(0, 8);

    charts.bump = new Chart($('chBump'), {
      type: 'line',
      data: {
        labels: D.dailyDates,
        datasets: picked.map(function (s, i) {
          return {
            label: s.name, data: s.data, borderColor: pal(i), backgroundColor: pal(i),
            tension: 0.3, spanGaps: true, pointRadius: 3, borderWidth: 2
          };
        })
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: ax(),
          y: ax({
            reverse: true, min: 1, max: 10,
            ticks: { stepSize: 1, color: cl.text, font: { size: 11 }, callback: function (v) { return v + '위'; } }
          })
        },
        plugins: { legend: { position: 'bottom', labels: legend.labels } }
      }
    });

    /* 관리분류별 연결상품 클릭 */
    var byCat = {};
    D.prodDetail.forEach(function (r) { byCat[r.cat] = (byCat[r.cat] || 0) + r.clicks; });
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    charts.cat = new Chart($('chCat'), {
      type: 'bar',
      data: { labels: cats, datasets: [{ label: '클릭수', data: cats.map(function (c) { return byCat[c]; }), backgroundColor: cl.primary, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: ax(), y: ax() },
        plugins: { legend: { display: false } }
      }
    });

    /* 커버리지 도넛 */
    function donut(el, done, miss, color) {
      return new Chart(el, {
        type: 'doughnut',
        data: { labels: ['태그 있음', '미태깅'], datasets: [{ data: [done, miss], backgroundColor: [color, cl.muted], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
      });
    }
    var mTotal = D.mainUpdate.length;
    var mMiss = D.mainUpdate.filter(function (r) { return r.miss; }).length;
    var bTotal = D.best100.length;
    var bMiss = D.best100.filter(function (r) { return r.miss; }).length;

    charts.covMain = donut($('chCovMain'), uploaded ? mTotal - mMiss : 0, uploaded ? mMiss : 1, cl.warning);
    charts.covBest = donut($('chCovBest'), bTotal - bMiss, bMiss, cl.primary);

    $('covMainPct').textContent = uploaded ? Math.round((mTotal - mMiss) / mTotal * 100) + '%' : '—';
    $('covMainSub').textContent = uploaded ? mMiss + ' / ' + mTotal + '건 미비' : '첨부 대기 중';
    $('covMainSub').className = 'stat-change' + (uploaded ? ' negative' : '');
    $('covBestPct').textContent = Math.round((bTotal - bMiss) / bTotal * 100) + '%';
    $('covBestSub').textContent = bMiss + ' / ' + bTotal + '건 미비';

    /* 관리분류별 미태깅 */
    var miss = {};
    (uploaded ? D.mainUpdate : []).concat(D.best100).forEach(function (r) {
      if (r.miss) miss[r.cat] = (miss[r.cat] || 0) + 1;
    });
    var mc = Object.keys(miss).sort(function (a, b) { return miss[b] - miss[a]; });
    charts.missCat = new Chart($('chMissCat'), {
      type: 'bar',
      data: { labels: mc, datasets: [{ label: '미태깅 상품 수', data: mc.map(function (c) { return miss[c]; }), backgroundColor: cl.warning, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        scales: { x: ax({ ticks: { color: cl.text, precision: 0, font: { size: 11 } } }), y: ax() },
        plugins: { legend: { display: false } }
      }
    });
  }

  function rebuild() { destroy(); buildCharts(); }

  /* ── 첨부 등록 (POC 시뮬레이션) ── */
  function setUploaded(v, name) {
    uploaded = v;
    $('tmDropzone').classList.toggle('hidden', v);
    $('tmUploadDone').classList.toggle('hidden', !v);
    if (v) $('tmUploadDoneText').innerHTML = '<b>' + esc(name || '메인업데이트도서.xlsx') + '</b> · 상품번호 ' + D.mainUpdate.length + '건 인식됨';
    var chip = $('tmUploadChip');
    chip.textContent = v ? '첨부 등록됨' : '첨부 미등록';
    chip.className = 'badge ' + (v ? 'badge-success' : 'badge-warning');
    rebuild();
    renderQueue();
  }

  /* ── 이벤트 ── */
  function bind() {
    var tabs = document.querySelectorAll('.tab-btn[data-tab]');
    Array.prototype.forEach.call(tabs, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs, function (x) { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
        b.classList.add('active');
        b.setAttribute('aria-selected', 'true');
        var t = b.getAttribute('data-tab');
        $('tmReport').classList.toggle('hidden', t !== 'report');
        $('tmQueue').classList.toggle('hidden', t !== 'queue');
        // 숨겨진 동안 만들어진 차트는 캔버스가 0x0 이므로 노출 시 다시 재본다
        Object.keys(charts).forEach(function (k) { if (charts[k]) charts[k].resize(); });
      });
    });

    var scopes = document.querySelectorAll('[data-scope]');
    Array.prototype.forEach.call(scopes, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(scopes, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        renderQueue();
      });
    });
    $('tmSrcFilter').addEventListener('change', renderQueue);

    var dz = $('tmDropzone'), input = $('tmFileInput');
    dz.addEventListener('click', function () { input.click(); });
    dz.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('tm-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('tm-dragover'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && !/\.xlsx$/i.test(f.name)) { window.alert('.xlsx 파일만 업로드할 수 있습니다.'); return; }
      setUploaded(true, f && f.name);
    });
    input.addEventListener('change', function () {
      setUploaded(true, input.files[0] && input.files[0].name);
    });
    $('tmUploadReset').addEventListener('click', function () { input.value = ''; setUploaded(false); });

    var toggle = document.querySelector('.theme-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      root.classList.toggle('dark');
      window.dispatchEvent(new CustomEvent('ax:theme-change', { detail: { dark: isDark() } }));
    });
    window.addEventListener('ax:theme-change', rebuild);

    var sb = $('sidebar-toggle');
    if (sb) sb.addEventListener('click', function () {
      document.querySelector('.app-layout').classList.toggle('sidebar-collapsed');
    });
  }

  renderKpi();
  renderTables();
  renderQueue();
  buildCharts();
  bind();
}());
