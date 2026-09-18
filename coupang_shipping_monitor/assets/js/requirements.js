/* 요구사항 정리 팝업 창 — 항목별 원문·시안 반영 상태.
   본 화면(app.js)에서 window.open 으로 열고, 태그를 누르면 postMessage 로 항목을 지정한다. */
(function () {
  'use strict';

  var DATA = window.AX_REQ;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var state = { status: '', q: '', selected: '' };

  function counts() {
    var c = {};
    DATA.items.forEach(function (r) { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }

  function renderHead() {
    var m = DATA.meta, c = counts();
    $('reqTitle').textContent = m.title;
    $('reqMeta').textContent = m.org + ' · ' + m.owner + ' · ' + m.registered;
    var screenReqs = DATA.items.filter(function (r) { return r.status !== 'offscreen'; }).length;
    var shown = (c.ui || 0) + (c.cond || 0) + (c.partial || 0);
    $('reqVerdict').innerHTML = '요구사항 ' + DATA.items.length + '개 중 화면에 해당하는 ' + screenReqs +
      '개 가운데 <b>' + shown + '개를 시안에 표현</b>했습니다. 남은 ' + ((c.pending || 0) + (c.excluded || 0)) +
      '개(R22·R23)는 자사 데이터 연동과 요청 부서 확인이 필요하고, ' + (c.offscreen || 0) + '개는 수집·운영에서 다룹니다.';
    $('reqCounts').innerHTML = Object.keys(DATA.statuses).filter(function (k) { return c[k]; }).map(function (k) {
      return '<button type="button" class="badge ' + DATA.statuses[k].badge + ' filter-badge" data-status="' + k + '" aria-pressed="false">' +
        DATA.statuses[k].label + ' ' + c[k] + '</button>';
    }).join('');
  }

  function match(r) {
    if (state.status && r.status !== state.status) return false;
    var q = state.q.trim().toLowerCase();
    if (!q) return true;
    return (r.id + ' ' + r.short + ' ' + r.text + ' ' + (r.quote || '') + ' ' + r.where + ' ' + (r.note || '')).toLowerCase().indexOf(q) >= 0;
  }

  function renderList() {
    var list = DATA.items.filter(match);
    $('reqList').innerHTML = list.length ? list.map(function (r) {
      var st = DATA.statuses[r.status];
      return '<article class="card req-item' + (r.id === state.selected ? ' is-selected' : '') + '" id="item-' + r.id + '" tabindex="-1"' +
        (r.id === state.selected ? ' aria-current="true"' : '') + '>' +
        '<div class="req-item-head">' +
          '<span class="req-id">' + r.id + '</span>' +
          '<h2 class="req-item-title">' + esc(r.short) + '</h2>' +
          '<span class="badge ' + st.badge + '">' + st.label + '</span>' +
        '</div>' +
        '<div class="req-item-body">' +
          (r.text !== r.short ? '<p class="req-text">' + esc(r.text) + '</p>' : '') +
          (r.quote && r.quote !== r.text ? '<blockquote class="req-quote">' + esc(r.quote) + '<cite>요구서 ' + esc(r.src) + '</cite></blockquote>' : '') +
          '<dl class="req-dl">' +
            '<div><dt>시안에서</dt><dd>' + esc(r.where) + '</dd></div>' +
            (r.data ? '<div><dt>데이터</dt><dd>' + esc(r.data) + '</dd></div>' : '') +
            (r.note ? '<div><dt>남은 일</dt><dd>' + esc(r.note) + '</dd></div>' : '') +
          '</dl>' +
        '</div>' +
      '</article>';
    }).join('') : '<p class="empty">조건에 맞는 요구사항이 없습니다.</p>';
  }

  function focusItem(id) {
    if (!id || !DATA.items.some(function (r) { return r.id === id; })) return;
    // 필터에 가려져 있으면 먼저 푼다
    state.status = ''; state.q = '';
    $('reqSearch').value = '';
    Array.prototype.forEach.call(document.querySelectorAll('.filter-badge'), function (b) { b.setAttribute('aria-pressed', 'false'); });
    state.selected = id;
    renderList();
    jumpTo(id);
  }

  // 애니메이션 없이 즉시 이동 — 상단 고정 헤더만큼 띄운다(scroll-margin-top)
  function jumpTo(id) {
    var el = $('item-' + id);
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    el.focus({ preventScroll: true });
  }

  // ── 이벤트 ──
  $('reqCounts').addEventListener('click', function (e) {
    var b = e.target.closest('.filter-badge');
    if (!b) return;
    var on = b.getAttribute('aria-pressed') !== 'true';
    Array.prototype.forEach.call(document.querySelectorAll('.filter-badge'), function (x) { x.setAttribute('aria-pressed', 'false'); });
    b.setAttribute('aria-pressed', String(on));
    state.status = on ? b.dataset.status : '';
    renderList();
  });
  $('reqSearch').addEventListener('input', function (e) { state.q = e.target.value; renderList(); });

  function syncThemeIcon() {
    var dark = document.documentElement.classList.contains('dark');
    $('iconMoon').classList.toggle('hidden', dark);
    $('iconSun').classList.toggle('hidden', !dark);
  }
  $('themeToggle').addEventListener('click', function () {
    document.documentElement.classList.toggle('dark'); syncThemeIcon();
  });

  // 본 화면에서 태그를 누르면 메시지로 항목이 온다 (같은 출처만 처리)
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (d && d.type === 'ax-req-focus') focusItem(d.id);
  });

  // 배경 블록 — 이 창 안에서는 태그를 누르면 해당 항목으로 바로 이동
  var ITEM = {};
  DATA.items.forEach(function (r) { ITEM[r.id] = r; });
  function chip(id) {
    var r = ITEM[id];
    return r ? '<button type="button" class="req" data-req-id="' + r.id + '" title="' + esc(r.text) + '"><b>' + r.id + '</b>' + esc(r.short) + '</button>' : '';
  }
  $('reqBg').innerHTML = window.AX_REQ_BG.html(chip);
  $('reqBg').addEventListener('click', function (e) {
    var b = e.target.closest('.req[data-req-id]');
    if (b) focusItem(b.dataset.reqId);
  });

  renderHead();
  syncThemeIcon();
  renderList();
  var initialId = new URLSearchParams(location.search).get('id');
  focusItem(initialId);
  // 웹폰트가 늦게 적용되면 카드 높이가 바뀌어 위치가 밀리므로 폰트 로드 뒤 한 번 더 맞춘다
  if (initialId && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (state.selected === initialId) jumpTo(initialId); });
  }
  // 본 화면이 이 창을 재사용할 수 있도록 준비 완료를 알린다
  if (window.opener) { try { window.opener.postMessage({ type: 'ax-req-ready' }, location.origin); } catch (err) { /* 무시 */ } }
})();
