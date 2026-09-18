/* 쿠팡 정시출고 모니터링 — POC (AX 요구사항 #306)
   모든 데이터는 고정 시드로 만든 예시 값이다. */
(function () {
  'use strict';

  // ── 유틸 ──
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function fmt(n) { return Number(n).toLocaleString('ko-KR'); }
  function $(id) { return document.getElementById(id); }

  // ── 요구사항 항목 (assets/js/requirements-data.js 공용 정의) ──
  var REQ = window.AX_REQ.items;
  var REQ_MAP = {};
  REQ.forEach(function (r) { REQ_MAP[r.id] = r; });
  var STATUS = {};
  Object.keys(window.AX_REQ.statuses).forEach(function (k) {
    STATUS[k] = [window.AX_REQ.statuses[k].label, window.AX_REQ.statuses[k].badge];
  });

  function reqChip(id) {
    var r = REQ_MAP[id];
    if (!r) return '';
    return '<button type="button" class="req" data-req-id="' + r.id + '" title="' + esc(r.id + ' · ' + r.text + ' (' + r.src + ') — 눌러서 상세 보기') + '"><b>' + r.id + '</b>' + esc(r.short) + '</button>';
  }
  function reqRow(ids) {
    return '<div class="req-row">' + ids.split(' ').map(reqChip).join('') + '</div>';
  }
  function renderReqTags() {
    Array.prototype.forEach.call(document.querySelectorAll('.req-row[data-req]'), function (el) {
      el.innerHTML = el.dataset.req.split(' ').map(reqChip).join('');
    });
  }

  function renderTrace() {
    var cnt = {};
    REQ.forEach(function (r) { cnt[r.status] = (cnt[r.status] || 0) + 1; });
    var screenReqs = REQ.filter(function (r) { return r.status !== 'offscreen'; }).length;
    var shown = (cnt.ui || 0) + (cnt.cond || 0) + (cnt.partial || 0);
    $('traceVerdict').innerHTML =
      '요구사항 ' + REQ.length + '개 중 화면에 해당하는 ' + screenReqs + '개 가운데 <b>' + shown + '개를 표현</b>했습니다. ' +
      '빠진 항목은 <b>' + ((cnt.pending || 0) + (cnt.excluded || 0)) + '개</b>(R22 자사 유통상태·발매예정일, R23 자사 기준 출고상태)이고, ' +
      (cnt.offscreen || 0) + '개는 수집·운영에서 다룹니다. 일부 반영 ' + (cnt.partial || 0) + '개(' +
      REQ.filter(function (r) { return r.status === 'partial'; }).map(function (r) { return r.id; }).join('·') + ')는 남은 일을 점검표에서 확인하세요.';
    $('traceSummary').innerHTML = Object.keys(STATUS).filter(function (k) { return cnt[k]; }).map(function (k) {
      return '<span class="badge ' + STATUS[k][1] + '">' + STATUS[k][0] + ' ' + cnt[k] + '</span>';
    }).join('');
    $('traceBody').innerHTML = REQ.map(function (r) {
      var st = STATUS[r.status];
      return '<tr class="trace-row" data-req-id="' + r.id + '" tabindex="0"><td class="num col-nowrap"><b>' + r.id + '</b></td>' +
        '<td>' + esc(r.text) + '</td>' +
        '<td class="src">' + esc(r.src) + '</td>' +
        '<td>' + esc(r.where) + (r.note ? '<span class="note">' + esc(r.note) + '</span>' : '') + '</td>' +
        '<td class="col-nowrap"><span class="badge ' + st[1] + '">' + st[0] + '</span></td></tr>';
    }).join('');
  }

  // ── 요구사항 상세 보기 (별도 창, 막히면 화면 안 모달) ──
  var reqWin = null;
  function openReq(id) {
    var url = 'requirements.html' + (id ? '?id=' + encodeURIComponent(id) : '');
    if (reqWin && !reqWin.closed) {
      try {
        reqWin.focus();
        if (id) reqWin.postMessage({ type: 'ax-req-focus', id: id }, location.origin);
        return;
      } catch (e) { reqWin = null; }
    }
    var feat = 'width=620,height=920,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes';
    try { reqWin = window.open(url, 'axReq306', feat); } catch (e) { reqWin = null; }
    if (!reqWin) { showReqModal(id); return; }     // 팝업 차단 등 — 화면 안에서 보여준다
    try { reqWin.focus(); } catch (e) { /* 무시 */ }
  }

  function reqDetailHtml(r) {
    var st = STATUS[r.status];
    return '<div class="req-item-head"><span class="req-id">' + r.id + '</span>' +
      '<h2 class="req-item-title">' + esc(r.short) + '</h2>' +
      '<span class="badge ' + st[1] + '">' + st[0] + '</span></div>' +
      '<div class="req-item-body">' + (r.text !== r.short ? '<p class="req-text">' + esc(r.text) + '</p>' : '') +
      (r.quote && r.quote !== r.text ? '<blockquote class="req-quote">' + esc(r.quote) + '<cite>요구서 ' + esc(r.src) + '</cite></blockquote>' : '') +
      '<dl class="req-dl"><div><dt>시안에서</dt><dd>' + esc(r.where) + '</dd></div>' +
      (r.data ? '<div><dt>데이터</dt><dd>' + esc(r.data) + '</dd></div>' : '') +
      (r.note ? '<div><dt>남은 일</dt><dd>' + esc(r.note) + '</dd></div>' : '') + '</dl></div>';
  }

  function showReqModal(id) {
    var r = REQ_MAP[id];
    $('reqModalBody').innerHTML = r ? reqDetailHtml(r) :
      '<p class="req-text">요구사항 목록을 별도 창으로 열지 못했습니다. 아래 「요구사항 반영 점검」 표에서 전체 항목을 볼 수 있습니다.</p>';
    $('reqModal').hidden = false;
    $('reqModalClose').focus();
  }
  function closeReqModal() { $('reqModal').hidden = true; }

  document.addEventListener('click', function (e) {
    var tag = e.target.closest('.req[data-req-id]') || e.target.closest('.trace-row[data-req-id]');
    if (tag) { openReq(tag.dataset.reqId); return; }
    if (e.target.closest('#reqModalClose') || e.target.closest('.req-modal-backdrop')) closeReqModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('reqModal').hidden) closeReqModal();
    var row = e.target.closest ? e.target.closest('.trace-row[data-req-id]') : null;
    if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openReq(row.dataset.reqId); }
  });

  // ── 예시 데이터 ──
  var rnd = rng(306);
  var TODAY = new Date(2026, 8, 17);

  // cat = 쿠팡 카테고리(가정 값), bias = 지연 성향
  var PRODUCTS = [
    { no: '193984819', name: '[CD] 루미너스 - 정규 2집 [초회한정반 A]', cat: '음반', w: 16, bias: .82 },
    { no: '193984817', name: '[CD] 루미너스 - 정규 2집 [초회한정반 B]', cat: '음반', w: 13, bias: .8 },
    { no: '180884719', name: 'The Quiet Harbor (Paperback)', cat: '외국도서', w: 10, bias: .76 },
    { no: '195142070', name: '[Blu-ray] 스텔라 1st CONCERT TOUR [3 DISC]', cat: 'DVD/블루레이', w: 9, bias: .7 },
    { no: '181203356', name: 'Ocean Tales Box Set (Hardcover, 4 vols)', cat: '외국도서', w: 6, bias: .7 },
    { no: '196010442', name: '[LP] 여름밤 재즈 컬렉션 [180g 투명 컬러]', cat: '음반', w: 7, bias: .6 },
    { no: '194889625', name: '달빛 요정 대모험 : 공식 애니메이션 스토리북', cat: '국내도서', w: 12, bias: .55 },
    { no: '194904291', name: '막차의 고양이 3~4 세트', cat: '국내도서', w: 8, bias: .5 },
    { no: '195018864', name: '[DVD] 우주 탐사 다큐 시리즈 [6 DISC]', cat: 'DVD/블루레이', w: 4, bias: .5 },
    { no: '196334020', name: '달빛 문구 2027 다이어리', cat: '문구/오피스', w: 6, bias: .45 },
    { no: '195700813', name: '마음 정리 연습 (양장 특별판)', cat: '국내도서', w: 7, bias: .2 },
    { no: '193550128', name: '2027 수능특강 영어영역', cat: '국내도서', w: 11, bias: .15 },
    { no: '192277301', name: '초등 수학 개념 완성 5-2', cat: '국내도서', w: 9, bias: .1 },
    { no: '194120775', name: '요리하는 과학자', cat: '국내도서', w: 5, bias: .1 },
    { no: '197002151', name: '[CD] 노을밴드 - 미니 3집 (발매 예정)', cat: '음반', w: 8, bias: 0, noDate: true }
  ];
  var totalW = PRODUCTS.reduce(function (s, p) { return s + p.w; }, 0);
  function pick() {
    var r = rnd() * totalW;
    for (var i = 0; i < PRODUCTS.length; i++) { r -= PRODUCTS[i].w; if (r <= 0) return PRODUCTS[i]; }
    return PRODUCTS[0];
  }

  // 현재 출고상태 = 자사 주문상태 (사내 API). 값은 이 5종뿐이다.
  var SHIP_STATUS = ['주문접수', '결제확인', '출하지시', '출고완료', '배송완료'];
  var SHIP_CLASS = { '주문접수': 'st-received', '결제확인': 'st-paid', '출하지시': 'st-instructed', '출고완료': 'st-shipped', '배송완료': 'st-delivered' };
  var rndS = rng(3061);   // 상태 배정 전용 — 기존 예시 수치가 바뀌지 않게 난수열을 분리

  var rows = [];
  for (var i = 0; i < 360; i++) {
    var p = pick(), late;
    if (p.noDate) late = null;
    else if (rnd() < p.bias) { var r = rnd(); late = r < .45 ? 1 : r < .72 ? 2 : 3 + Math.floor(rnd() * 8); }
    else late = rnd() < .6 ? 0 : -1;               // 0 = 오늘 예정, -1 = 내일 이후(모니터 대상 아님)
    if (late === -1) continue;
    var due = late === null ? null : addDays(TODAY, -late);
    var ordered = late === null ? addDays(TODAY, -Math.floor(rnd() * 20)) : addDays(due, -(1 + Math.floor(rnd() * 3)));
    // 08:00 이후 14:00 전에 출고된 주문 → 14:00 집계에서 '출고완료'
    var shipped = late !== null && rnd() < (late === 0 ? .45 : .2)
      ? ymd(TODAY) + ' ' + pad(9 + Math.floor(rnd() * 5)) + ':' + pad(Math.floor(rnd() * 60)) : null;
    // 미출고 상태: 곧 출고될 주문은 출하지시, 나머지는 출하지시·결제확인·주문접수 중 하나
    var sr = rndS();
    var openStatus = shipped ? '출하지시' : sr < .78 ? '출하지시' : sr < .95 ? '결제확인' : '주문접수';
    rows.push({
      p: p,
      orderId: String(2 + Math.floor(rnd() * 25)) + String(10236000 + i * 7) + pad(Math.floor(rnd() * 100)) + pad(Math.floor(rnd() * 100)),
      ownOrderNo: String(152300000 + i * 131 + Math.floor(rnd() * 97)),                 // 자사 주문번호 (예시)
      pubOrderNo: 'Y' + ymd(ordered).slice(2).replace(/-/g, '') + String(1000 + Math.floor(rnd() * 8999)),  // 공개주문번호 Y+10자리 (예시)
      ordered: ymd(ordered) + ' ' + pad(Math.floor(rnd() * 24)) + ':' + pad(Math.floor(rnd() * 60)),
      due: due ? ymd(due) : null,
      late: late,
      shippedAt: shipped,
      openStatus: openStatus
    });
  }

  // ── 상태 ──
  var state = { snap: '14', tab: 'today', days: '', ship: '', q: '', page: 1 };
  var PAGE_SIZE = 12;
  var PREV_DAY_14 = { late: 131, d1: 58, d2: 41, d3: 32 };   // 전일 14:00 집계 (예시)

  function isShipped(r, snap) { return snap === '14' && !!r.shippedAt; }
  function statusOf(r, snap) { return isShipped(r, snap) ? '출고완료' : r.openStatus; }
  function bucket(late) { return late >= 3 ? 'd3' : 'd' + late; }

  function summarize(snap) {
    var s = { today: 0, late: 0, d1: 0, d2: 0, d3: 0, none: 0, todayKinds: {}, lateKinds: {} };
    rows.forEach(function (r) {
      if (isShipped(r, snap)) return;
      if (r.late === null) { s.none++; return; }
      if (r.late === 0) { s.today++; s.todayKinds[r.p.no] = 1; return; }
      s.late++; s[bucket(r.late)]++; s.lateKinds[r.p.no] = 1;
    });
    s.todayKinds = Object.keys(s.todayKinds).length;
    s.lateKinds = Object.keys(s.lateKinds).length;
    return s;
  }
  function prevOf(snap) { return snap === '14' ? summarize('08') : PREV_DAY_14; }

  function deltaHtml(cur, prev) {
    var d = cur - prev;
    if (d === 0) return '<span class="delta flat">– 0</span>';
    return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(d)) + '</span>';
  }

  // ── ① 주요 현황 ──
  function renderKpis() {
    var s = summarize(state.snap), pv = prevOf(state.snap);
    $('kToday').innerHTML = fmt(s.today) + '<small>건</small>';
    $('kTodayKinds').textContent = fmt(s.todayKinds);
    $('kLate').innerHTML = fmt(s.late) + '<small>건</small>';
    $('kLateKinds').textContent = fmt(s.lateKinds);
    $('kLateDelta').outerHTML = '<span id="kLateDelta">' + deltaHtml(s.late, pv.late) + '</span>';
    $('kNone').innerHTML = fmt(s.none) + '<small>건</small>';
    $('kBuckets').innerHTML = [['d1', '1일'], ['d2', '2일'], ['d3', '3일 이상']].map(function (b) {
      return '<div class="bucket"><span class="b-label"><i class="sw-' + b[0] + '"></i>' + b[1] + '</span>' +
        '<span class="b-num num">' + fmt(s[b[0]]) + '</span>' + deltaHtml(s[b[0]], pv[b[0]]) + '</div>';
    }).join('');
    $('deltaBasis').textContent = state.snap === '14' ? '증감은 직전 집계(오늘 08:00) 대비' : '증감은 직전 집계(전일 14:00) 대비';
    $('snapTime').textContent = '2026-09-17 ' + state.snap + ':00';
  }

  // 최근 14영업일 (마지막 = 선택한 집계)
  var TREND = (function () {
    var out = [], d = new Date(TODAY), g = rng(17);
    while (out.length < 14) {
      if (d.getDay() !== 0 && d.getDay() !== 6) out.unshift({ date: new Date(d) });
      d = addDays(d, -1);
    }
    out.forEach(function (o, idx) {
      var k = idx >= 10 ? 1.45 : idx >= 8 ? 1.15 : 1;
      o.d1 = Math.round((38 + g() * 14) * k);
      o.d2 = Math.round((22 + g() * 10) * k);
      o.d3 = Math.round((14 + g() * 6) * (idx >= 10 ? 1.9 : k));
    });
    return out;
  })();

  function renderTrend() {
    var s = summarize(state.snap), last = TREND[TREND.length - 1];
    last.d1 = s.d1; last.d2 = s.d2; last.d3 = s.d3;
    var W = 560, H = 250, L = 34, R = 8, T = 18, B = 30;
    var max = 0;
    TREND.forEach(function (o) { max = Math.max(max, o.d1 + o.d2 + o.d3); });
    var step = max > 160 ? 50 : 25, top = Math.ceil(max / step) * step;
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var bw = (W - L - R) / TREND.length, out = '';
    for (var v = 0; v <= top; v += step) {
      out += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="chart-label" x="' + (L - 6) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + v + '</text>';
    }
    TREND.forEach(function (o, i) {
      var x = L + i * bw + bw * .18, w = bw * .64, acc = 0, isLast = i === TREND.length - 1;
      var label = isLast ? (state.snap === '14' ? '오늘' : '오늘 08시') : (o.date.getMonth() + 1) + '/' + o.date.getDate();
      out += '<g class="trend-col" data-i="' + i + '">' +
        '<rect class="trend-label-bg" x="' + (L + i * bw + 1).toFixed(1) + '" y="' + (H - B + 3) + '" width="' + (bw - 2).toFixed(1) + '" height="19" rx="6"/>';
      ['d1', 'd2', 'd3'].forEach(function (k) {
        var h = (H - T - B) * o[k] / top;
        acc += o[k];
        out += '<rect class="bar-' + k + '" x="' + x.toFixed(1) + '" y="' + y(acc).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '"/>';
      });
      out += '<text class="chart-label trend-x' + (isLast ? ' is-today' : '') + '" x="' + (x + w / 2) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + label + '</text>' +
        '<rect class="trend-hit" x="' + (L + i * bw).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + (H - T) + '"' +
        ' tabindex="0" role="img" aria-label="' + trendLabel(i) + '"/>' +
        '</g>';
      if (isLast || i === 0) out += '<text class="chart-total" x="' + (x + w / 2) + '" y="' + (y(acc) - 5) + '" text-anchor="middle">' + acc + '</text>';
    });
    $('trend').innerHTML = out;
    hideTrendTip();
  }

  // ── 추이 차트 마우스 오버 ──
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  function trendDateLabel(i) {
    var o = TREND[i], isLast = i === TREND.length - 1;
    return (o.date.getMonth() + 1) + '/' + o.date.getDate() + '(' + DOW[o.date.getDay()] + ') ' + (isLast ? state.snap : '14') + ':00 집계';
  }
  function trendLabel(i) {
    var o = TREND[i];
    return trendDateLabel(i) + ' 출고지연 ' + (o.d1 + o.d2 + o.d3) + '건 (1일 ' + o.d1 + ', 2일 ' + o.d2 + ', 3일 이상 ' + o.d3 + ')';
  }
  function fmtPct(v) { return v.toFixed(1) + '%'; }
  function deltaPp(cur, prev) {
    var d = Math.round((cur - prev) * 10) / 10;
    if (d === 0) return '<span class="delta flat">±0.0%p</span>';
    return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '') + d.toFixed(1) + '%p</span>';
  }
  function deltaCnt(cur, prev) {
    var d = cur - prev;
    return '<b class="' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '+' : '') + d + '건</b>';
  }

  function showTrendTip(i) {
    var o = TREND[i], sum = o.d1 + o.d2 + o.d3, tip = $('trendTip'), svg = $('trend');
    var prev = i > 0 ? TREND[i - 1] : null, prevSum = prev ? prev.d1 + prev.d2 + prev.d3 : 0;
    var buckets = [['d1', '1일 지연'], ['d2', '2일 지연'], ['d3', '3일 이상 지연']];
    var topKey = buckets.reduce(function (a, b) { return o[b[0]] > o[a[0]] ? b : a; })[0];
    var o0 = TREND[i];
    tip.innerHTML =
      '<div class="tt-head"><span class="tt-title">' + (o0.date.getMonth() + 1) + '/' + o0.date.getDate() + '(' + DOW[o0.date.getDay()] + ')</span>' +
        '<span class="tt-total"><b class="num">' + fmt(sum) + '</b> 건</span></div>' +
      '<div class="tt-sub">' + (i === TREND.length - 1 ? state.snap : '14') + ':00 집계 · 출고예정일 경과 미출고' +
        (prev ? ' · 전 영업일 대비 ' + deltaCnt(sum, prevSum) : '') + ' · 막대는 구성비, 우측은 전 영업일 대비 증감</div>' +
      buckets.map(function (b) {
        var share = sum ? o[b[0]] / sum * 100 : 0;
        var prevShare = prev && prevSum ? prev[b[0]] / prevSum * 100 : null;
        return '<div class="tt-item">' +
          '<div class="tt-line"><span class="tt-name"><i class="sw-' + b[0] + '"></i>' + b[1] +
            (b[0] === topKey ? '<span class="tt-rank">최다</span>' : '') + '</span>' +
            '<span class="tt-val"><b class="num">' + fmtPct(share) + '</b>' + (prevShare != null ? deltaPp(share, prevShare) : '') + '</span></div>' +
          '<div class="tt-bar"><i class="sw-' + b[0] + '" data-w="' + share.toFixed(1) + '"></i></div>' +
          '<div class="tt-meta"><span>주문 <b class="num">' + o[b[0]] + '</b>건</span>' +
            (prev ? '<span>전 영업일 대비 ' + deltaCnt(o[b[0]], prev[b[0]]) + '</span>' : '<span></span>') + '</div>' +
        '</div>';
      }).join('');
    Array.prototype.forEach.call(tip.querySelectorAll('.tt-bar i'), function (el) { el.style.width = el.dataset.w + '%'; });
    Array.prototype.forEach.call(svg.querySelectorAll('.trend-col'), function (g) {
      g.classList.toggle('is-hover', +g.dataset.i === i);
    });

    // 막대 꼭대기 위에 꼬리를 두고 띄운다. 카드 폭 안으로 좌우를 붙잡고, 꼬리는 늘 막대 중심을 가리킨다.
    tip.hidden = false;
    tip.classList.remove('is-below');
    var wrap = tip.parentNode.getBoundingClientRect();
    var col = svg.querySelector('.trend-col[data-i="' + i + '"] .trend-hit').getBoundingClientRect();
    var barTop = svg.querySelector('.trend-col[data-i="' + i + '"] .bar-d3').getBoundingClientRect().top;
    var tw = tip.offsetWidth, th = tip.offsetHeight, gap = 10, header = 62;
    var cx = col.left + col.width / 2 - wrap.left;
    var left = Math.min(Math.max(cx - tw / 2, 0), wrap.width - tw);
    var top = barTop - wrap.top - gap - th;
    if (barTop - gap - th < header) {            // 화면 위쪽(고정 헤더)에 가리면 막대 아래로 뒤집는다
      tip.classList.add('is-below');
      top = barTop - wrap.top + gap;
    }
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.setProperty('--caret-x', Math.min(Math.max(cx - left, 14), tw - 14) + 'px');
  }
  function hideTrendTip() {
    var tip = $('trendTip'), svg = $('trend');
    if (tip) tip.hidden = true;
    if (svg) {
      Array.prototype.forEach.call(svg.querySelectorAll('.trend-col.is-hover'), function (g) { g.classList.remove('is-hover'); });
    }
  }
  function trendIndexOf(e) {
    var g = e.target.closest ? e.target.closest('.trend-col') : null;
    return g ? +g.dataset.i : -1;
  }
  $('trend').addEventListener('mouseover', function (e) { var i = trendIndexOf(e); if (i >= 0) showTrendTip(i); });
  $('trend').addEventListener('mouseleave', hideTrendTip);
  $('trend').addEventListener('focusin', function (e) { var i = trendIndexOf(e); if (i >= 0) showTrendTip(i); });
  $('trend').addEventListener('focusout', hideTrendTip);

  function productStats(snap) {
    var m = {};
    rows.forEach(function (r) {
      if (isShipped(r, snap) || !(r.late >= 1)) return;
      var e = m[r.p.no] || (m[r.p.no] = { p: r.p, total: 0, d1: 0, d2: 0, d3: 0, maxLate: 0 });
      e.total++; e[bucket(r.late)]++; e.maxLate = Math.max(e.maxLate, r.late);
    });
    return Object.keys(m).map(function (k) { return m[k]; })
      .sort(function (a, b) { return b.total - a.total || b.d3 - a.d3; });
  }

  function renderTop() {
    var list = productStats(state.snap).slice(0, 8);
    $('topBody').innerHTML = list.map(function (e, i) {
      return '<tr><td class="col-center"><span class="rank' + (i < 3 ? ' top' : '') + '">' + (i + 1) + '</span></td>' +
        '<td class="num col-nowrap">' + e.p.no + '</td>' +
        '<td class="cell-title" title="' + esc(e.p.name) + '">' + esc(e.p.name) + '</td>' +
        '<td class="col-num num"><b>' + e.total + '</b></td>' +
        '<td class="col-num num">' + e.d1 + '</td><td class="col-num num">' + e.d2 + '</td>' +
        '<td class="col-num num' + (e.d3 ? ' late-days d3' : '') + '">' + e.d3 + '</td></tr>';
    }).join('');
  }

  // ── ② 상세 목록 ──
  function listRows() {
    var q = state.q.trim().toLowerCase();
    var base = rows.filter(function (r) {
      var shipped = isShipped(r, state.snap);
      if (state.tab === 'today') return r.late === 0 && !shipped;
      return r.late >= 1;
    });
    var counts = {
      today: rows.filter(function (r) { return r.late === 0 && !isShipped(r, state.snap); }).length,
      late: rows.filter(function (r) { return r.late >= 1; }).length
    };
    var list = base.filter(function (r) {
      var shipped = isShipped(r, state.snap);
      if (state.tab === 'late' && state.days) {
        if (state.days === '3' ? r.late < 3 : String(r.late) !== state.days) return false;
      }
      if (state.ship && statusOf(r, state.snap) !== state.ship) return false;
      if (q && (r.p.no + ' ' + r.p.name + ' ' + r.orderId + ' ' + r.ownOrderNo + ' ' + r.pubOrderNo).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return b.late - a.late || a.ordered.localeCompare(b.ordered); });
    return { list: list, counts: counts };
  }

  function renderList() {
    var res = listRows(), list = res.list;
    $('cntToday').textContent = fmt(res.counts.today);
    $('cntLate').textContent = fmt(res.counts.late);
    $('fDays').disabled = state.tab !== 'late';

    var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    $('listCount').innerHTML = '총 <b class="num">' + fmt(list.length) + '</b>건';

    $('listBody').innerHTML = slice.length ? slice.map(function (r) {
      var shipped = isShipped(r, state.snap);
      var days = r.late === 0 ? '<span class="muted">0</span>'
        : '<span class="late-days' + (r.late >= 3 ? ' d3' : '') + '">' + r.late + '일</span>';
      return '<tr>' +
        '<td class="num col-nowrap">' + r.p.no + '</td>' +
        '<td class="cell-title" title="' + esc(r.p.name) + '">' + esc(r.p.name) + '</td>' +
        '<td class="num col-nowrap">' + r.orderId + '</td>' +
        '<td class="num col-nowrap">' + r.ownOrderNo + '</td>' +
        '<td class="num col-nowrap">' + r.pubOrderNo + '</td>' +
        '<td class="num col-nowrap">' + r.ordered + '</td>' +
        '<td class="num col-nowrap">' + r.due + '</td>' +
        '<td class="col-num col-nowrap num">' + days + '</td>' +
        '<td class="col-nowrap"><span class="ship-status ' + SHIP_CLASS[statusOf(r, state.snap)] + '">' + statusOf(r, state.snap) + '</span></td>' +
        '<td class="num col-nowrap">' + (shipped ? r.shippedAt : '<span class="muted">—</span>') + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="10" class="col-center muted">조건에 맞는 주문이 없습니다.</td></tr>';

    var btn = function (label, page, opts) {
      opts = opts || {};
      return '<button type="button" class="pagination-btn' + (opts.active ? ' active' : '') + '"' +
        (opts.disabled ? ' disabled' : ' data-page="' + page + '"') + (opts.aria ? ' aria-label="' + opts.aria + '"' : '') +
        (opts.active ? ' aria-current="page"' : '') + '>' + label + '</button>';
    };
    var html = btn('‹', state.page - 1, { disabled: state.page === 1, aria: '이전 페이지' });
    var from = Math.max(1, Math.min(state.page - 2, pages - 4)), to = Math.min(pages, from + 4);
    for (var p = from; p <= to; p++) html += btn(p, p, { active: p === state.page });
    html += btn('›', state.page + 1, { disabled: state.page === pages, aria: '다음 페이지' });
    $('pager').innerHTML = html;
  }

  // ── ③ AI 분석 (1단계 데이터로 말할 수 있는 것만) ──
  function renderAi() {
    var s = summarize(state.snap);
    var recent = TREND.slice(-3), base = TREND.slice(-10, -3);
    var sum = function (o) { return o.d1 + o.d2 + o.d3; };
    var avg = function (a) { return Math.round(a.reduce(function (t, o) { return t + sum(o); }, 0) / a.length); };
    var a3 = avg(recent), a7 = avg(base), rate = Math.round((a3 / a7 - 1) * 100);
    var d3Base = Math.round(base.reduce(function (t, o) { return t + o.d3; }, 0) / base.length);

    var prods = productStats(state.snap), top2 = prods.slice(0, 2);
    var top2Share = s.late ? Math.round((top2[0].total + top2[1].total) / s.late * 100) : 0;
    var cats = {};
    prods.forEach(function (e) { cats[e.p.cat] = (cats[e.p.cat] || 0) + e.total; });
    var catTop = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0];
    var catShare = s.late ? Math.round(cats[catTop] / s.late * 100) : 0;
    var longLate = prods.filter(function (e) { return e.maxLate >= 5; })[0];
    var d3Kinds = prods.filter(function (e) { return e.d3 > 0; }).length;

    $('aiBrief').innerHTML =
      '<div class="ai-brief-top"></div>' +
      '<div class="ai-brief-head"><span class="ai-badge"><span class="dot"></span>AI</span>' +
        '<h2>출고지연 패턴 요약</h2><span class="ai-brief-meta">최근 14영업일 · 2026-09-17 ' + state.snap + ':00 집계 기준</span></div>' +
      '<div class="ai-brief-body">' +
        '<div class="ai-verdict ' + (rate >= 20 ? 'bad' : 'warn') + '">' + (rate >= 20 ? '지연 증가 · 우선 확인 필요' : '지연 소폭 증가') + '</div>' +
        '<div class="ai-summary">최근 3영업일 출고지연 미출고가 평균 <b>' + a3 + '건</b>으로 직전 7영업일(' + a7 + '건)보다 <b>' + rate + '%</b> 많습니다. ' +
          '늘어난 몫은 주로 <b>' + esc(top2[0].p.name) + '</b> 등 상위 2개 상품에서 나왔고, 3일 이상 지연 <b>' + s.d3 + '건</b>을 먼저 보는 것이 좋습니다.' + reqRow('R17') + '</div>' +
        '<div class="ai-cols">' +
          '<div class="ai-col problems"><div class="ai-col-title">주요 패턴</div><ul class="ai-list">' +
            li('지연 급증', '3일 이상 지연이 최근 3영업일 사이 평소(' + d3Base + '건)의 약 2배로 늘었습니다.', '14영업일 집계 비교', 'high', 'R13') +
            li('반복 지연', esc(top2[0].p.name) + ', ' + esc(top2[1].p.name) + ' — 두 상품 모두 최근 14영업일 중 대부분의 날 지연 목록에 올랐습니다.', '상품별 일자 집계', 'high', 'R14') +
            li('상품·상품군 집중', '상위 2개 상품이 지연의 ' + top2Share + '%, 쿠팡 카테고리 「' + esc(catTop) + '」가 ' + catShare + '%를 차지합니다.', '쿠팡 카테고리 기준', 'mid', 'R15') +
            li('기타 이상 패턴', '금요일 오후 주문의 지연 비율이 다른 요일의 약 2배입니다. 주말을 넘기며 출고예정일을 놓치는 흐름으로 보입니다.', '주문일시 × 지연 여부', 'mid', 'R16') +
          '</ul></div>' +
          '<div class="ai-col actions"><div class="ai-col-title">우선 확인 대상</div>' + reqRow('R17 R10') + '<ul class="ai-list">' +
            act(1, '3일 이상 지연 ' + s.d3 + '건 (' + d3Kinds + '개 상품)', '상세 목록 › 출고 지연 › 지연일수 3일 이상') +
            act(2, esc(top2[0].p.name) + ' 외 1종', '지연 주문 ' + (top2[0].total + top2[1].total) + '건 · 같은 상품 반복 지연') +
            (longLate ? act(3, esc(longLate.p.name), '최대 ' + longLate.maxLate + '일 지연 주문 포함') : '') +
          '</ul></div>' +
        '</div>' +
      '</div>';
  }
  function li(tag, text, ev, sev, req) {
    return '<li><span class="tag">' + tag + '</span>' + text +
      '<span class="sev ' + sev + '">' + (sev === 'high' ? '높음' : '중간') + '</span><span class="ev">근거: ' + ev + '</span>' + reqRow(req) + '</li>';
  }
  function act(n, text, ev) {
    return '<li><span class="num">' + n + '</span>' + text + '<span class="ev">' + ev + '</span></li>';
  }

  // ── 렌더 & 이벤트 ──
  function renderAll() { renderKpis(); renderTrend(); renderTop(); renderList(); renderAi(); }

  function setSnap(snap) {
    state.snap = snap; state.page = 1;
    $('snap08').setAttribute('aria-pressed', String(snap === '08'));
    $('snap14').setAttribute('aria-pressed', String(snap === '14'));
    renderAll();
  }
  $('snap08').addEventListener('click', function () { setSnap('08'); });
  $('snap14').addEventListener('click', function () { setSnap('14'); });

  Array.prototype.forEach.call(document.querySelectorAll('.tab-btn[data-tab]'), function (b) {
    b.addEventListener('click', function () {
      state.tab = b.dataset.tab; state.page = 1;
      if (state.tab !== 'late') { state.days = ''; $('fDays').value = ''; }
      Array.prototype.forEach.call(document.querySelectorAll('.tab-btn[data-tab]'), function (x) {
        var on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on));
      });
      renderList();
    });
  });
  $('fDays').addEventListener('change', function (e) { state.days = e.target.value; state.page = 1; renderList(); });
  $('fShip').addEventListener('change', function (e) { state.ship = e.target.value; state.page = 1; renderList(); });
  $('fQ').addEventListener('input', function (e) { state.q = e.target.value; state.page = 1; renderList(); });
  $('pager').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-page]');
    if (!b) return;
    state.page = Number(b.dataset.page); renderList();
  });

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }
  $('reqOpen').addEventListener('click', function () { openReq(''); });
  // summary 안의 버튼 — 눌러도 접힘/펼침이 바뀌지 않게 기본 동작을 막는다
  $('traceOpen').addEventListener('click', function (e) { e.preventDefault(); openReq(''); });
  $('btnExcel').addEventListener('click', function () {
    toast('시안이라 파일은 만들지 않습니다. 실제 화면은 현재 탭·필터 그대로 xlsx로 내려받습니다.');
  });

  // 다크모드 · 사이드바 (스킬 공통 패턴)
  function syncThemeIcon() {
    var dark = document.documentElement.classList.contains('dark');
    $('iconMoon').classList.toggle('hidden', dark);
    $('iconSun').classList.toggle('hidden', !dark);
  }
  $('themeToggle').addEventListener('click', function () {
    document.documentElement.classList.toggle('dark'); syncThemeIcon();
  });
  $('sidebarToggle').addEventListener('click', function () { $('sidebar').classList.toggle('open'); });
  syncThemeIcon();

  // 요구사항 태그 표시 토글 (보는 사람 브라우저에만 기억)
  function setReqVisible(on) {
    document.body.classList.toggle('hide-req', !on);
    $('reqToggle').setAttribute('aria-pressed', String(on));
    $('reqToggle').textContent = on ? '요구사항 태그 숨기기' : '요구사항 태그 보기';
    try { localStorage.setItem('coupangMonitor.reqTags', on ? '1' : '0'); } catch (e) { /* 저장 불가 환경 무시 */ }
  }
  $('reqToggle').addEventListener('click', function () { setReqVisible(document.body.classList.contains('hide-req')); });
  var savedReq = null;
  try { savedReq = localStorage.getItem('coupangMonitor.reqTags'); } catch (e) { /* 무시 */ }
  setReqVisible(savedReq !== '0');

  renderReqTags();
  $('traceBg').innerHTML = window.AX_REQ_BG.html(reqChip);   // 배경 블록 — 태그는 누르면 요구사항 창으로
  renderTrace();
  renderAll();
})();
