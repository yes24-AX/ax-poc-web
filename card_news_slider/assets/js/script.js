// ============================================================
// 카드뉴스 팬덱 슬라이더 — 다크모드 토글 + 슬라이더 로직
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

  // ============================================================
  // 팬덱 슬라이더 (Fan Deck)
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
})();
