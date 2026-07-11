// ============================================================
// 카드뉴스 슬라이더 — 옵션 탭 전환 + 다크모드 토글 + 두 슬라이더 로직
// ============================================================
(function () {
  'use strict';

  var IMAGE_COUNT = 12;
  var images = [];
  for (var i = 0; i < IMAGE_COUNT; i++) images.push('assets/img/' + i + '.jpg');

  // ---------------- 다크모드 토글 ----------------
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var dark = document.documentElement.classList.toggle('dark');
      document.getElementById('iconMoon').classList.toggle('hidden', dark);
      document.getElementById('iconSun').classList.toggle('hidden', !dark);
    });
  }

  // ---------------- 옵션 탭 전환 ----------------
  var tabs = document.querySelectorAll('#optionTabs .step-pill');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var opt = tab.getAttribute('data-option');
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('.option-panel').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.getAttribute('data-option-panel') !== opt);
      });
    });
  });

  // ============================================================
  // 옵션 1 — 팬덱 슬라이더 (Fan Deck)
  // ============================================================
  (function initFanDeck() {
    var stage = document.getElementById('fandeckStage');
    var dotsWrap = document.getElementById('fandeckDots');
    var prevBtn = document.getElementById('fandeckPrev');
    var nextBtn = document.getElementById('fandeckNext');
    if (!stage) return;

    var total = images.length;
    var current = 0;
    var VISIBLE = 5; // 앞에서부터 보여줄 카드 수 (나머지는 뒤에 완전히 숨김)
    var cards = [];

    images.forEach(function (src, i) {
      var el = document.createElement('div');
      el.className = 'fandeck-card';
      el.innerHTML =
        '<img src="' + src + '" alt="카드 이미지 ' + (i + 1) + '" draggable="false">' +
        '<div class="fandeck-caption"><span class="idx">' + String(i + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + '</span>카드뉴스 이미지 ' + (i + 1) + '</div>';
      stage.appendChild(el);
      cards.push(el);
    });

    dotsWrap.innerHTML = '';
    var dots = images.map(function (_, i) {
      var d = document.createElement('button');
      d.className = 'dot';
      d.setAttribute('aria-label', (i + 1) + '번째 카드로 이동');
      d.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(d);
      return d;
    });

    function render() {
      cards.forEach(function (el, i) {
        var pos = (i - current + total) % total; // 0 = 맨 앞
        el.classList.toggle('is-front', pos === 0);
        if (pos >= VISIBLE) {
          el.style.opacity = '0';
          el.style.zIndex = '0';
          el.style.pointerEvents = 'none';
          el.style.transform = 'translate(30px, 22px) rotate(16deg) scale(0.8)';
          return;
        }
        var tx = pos * 16;
        var ty = pos * 12;
        var rot = pos * 7;
        var scale = 1 - pos * 0.055;
        el.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) rotate(' + rot + 'deg) scale(' + scale + ')';
        el.style.opacity = '1';
        el.style.zIndex = String(VISIBLE - pos);
        el.style.pointerEvents = pos === 0 ? 'auto' : 'none';
      });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
    }

    function next() { current = (current + 1) % total; render(); }
    function prev() { current = (current - 1 + total) % total; render(); }
    function goTo(i) { current = ((i % total) + total) % total; render(); }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    // 드래그 / 스와이프
    var dragging = false, startX = 0, startY = 0, dx = 0;
    var frontEl = null;

    function onDown(e) {
      var point = e.touches ? e.touches[0] : e;
      frontEl = cards[current];
      dragging = true;
      startX = point.clientX;
      startY = point.clientY;
      dx = 0;
      frontEl.classList.add('dragging');
    }
    function onMove(e) {
      if (!dragging) return;
      var point = e.touches ? e.touches[0] : e;
      dx = point.clientX - startX;
      var dy = point.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && e.cancelable) e.preventDefault();
      var rot = dx / 12;
      frontEl.style.transform = 'translate(' + dx + 'px, ' + (dy * 0.15) + 'px) rotate(' + rot + 'deg) scale(1)';
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      frontEl.classList.remove('dragging');
      var threshold = 70;
      if (dx <= -threshold) { next(); }
      else if (dx >= threshold) { prev(); }
      else { render(); }
    }

    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', onDown, { passive: true });
    stage.addEventListener('touchmove', onMove, { passive: false });
    stage.addEventListener('touchend', onUp);

    render();
  })();

  // ============================================================
  // 옵션 2 — 대각선 캐스케이드 레일 (Diagonal Cascade Rail)
  // ============================================================
  (function initCascade() {
    var track = document.getElementById('cascadeTrack');
    var dotsWrap = document.getElementById('cascadeDots');
    var prevBtn = document.getElementById('cascadePrev');
    var nextBtn = document.getElementById('cascadeNext');
    if (!track) return;

    var total = images.length;
    var current = 0;
    var CARD_STEP = 112; // 카드 폭(176) - 겹침(64)
    var cards = [];

    images.forEach(function (src, i) {
      var el = document.createElement('div');
      el.className = 'cascade-card';
      el.style.setProperty('--tilt', (i % 2 === 0 ? -7 : 7) + 'deg');
      el.innerHTML = '<img src="' + src + '" alt="카드 이미지 ' + (i + 1) + '" draggable="false">';
      el.addEventListener('click', function () { goTo(i); });
      track.appendChild(el);
      cards.push(el);
    });

    dotsWrap.innerHTML = '';
    var dots = images.map(function (_, i) {
      var d = document.createElement('button');
      d.className = 'dot';
      d.setAttribute('aria-label', (i + 1) + '번째 카드로 이동');
      d.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(d);
      return d;
    });

    var baseOffsetX = 0;

    function render(withTransition) {
      cards.forEach(function (el, i) {
        var dist = Math.abs(i - current);
        el.classList.toggle('is-active', i === current);
        el.classList.toggle('is-near', dist === 1);
      });
      var shift = -current * CARD_STEP;
      track.style.transform = 'translate(calc(-50% + ' + shift + 'px), -50%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
    }

    function next() { if (current < total - 1) { current++; render(); } }
    function prev() { if (current > 0) { current--; render(); } }
    function goTo(i) { current = Math.max(0, Math.min(total - 1, i)); render(); }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    // 드래그 / 스와이프 (전체 레일 이동)
    var dragging = false, startX = 0, dx = 0;

    function onDown(e) {
      var point = e.touches ? e.touches[0] : e;
      dragging = true;
      startX = point.clientX;
      dx = 0;
      track.classList.add('dragging');
    }
    function onMove(e) {
      if (!dragging) return;
      var point = e.touches ? e.touches[0] : e;
      dx = point.clientX - startX;
      if (e.cancelable) e.preventDefault();
      var shift = -current * CARD_STEP + dx;
      track.style.transform = 'translate(calc(-50% + ' + shift + 'px), -50%)';
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      var threshold = 50;
      if (dx <= -threshold) { next(); }
      else if (dx >= threshold) { prev(); }
      else { render(); }
    }

    track.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    track.addEventListener('touchstart', onDown, { passive: true });
    track.addEventListener('touchmove', onMove, { passive: false });
    track.addEventListener('touchend', onUp);

    render();
  })();
})();
