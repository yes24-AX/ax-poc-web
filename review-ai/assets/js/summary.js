/* YES24 리뷰 AI 요약 — Customer Summary Page */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var raw = localStorage.getItem('reviewSummaryData');
    if (!raw) {
      renderNoData();
      return;
    }
    try {
      var data = JSON.parse(raw);
      renderAll(data.product, data.analysis, data.isDemo);
    } catch (e) {
      renderNoData();
    }
  });

  function renderAll(product, analysis, isDemo) {
    renderHero(product);
    renderAiBadge(analysis, isDemo);
    renderSummary(analysis.summary);
    renderThemes(analysis.themes);
    renderProsCons(analysis.pros, analysis.cons);
    renderQuotes(analysis.quotes);
    renderRatingDist(analysis.ratingDistribution);

    // Animate bars after a short delay
    setTimeout(animateBars, 120);
  }

  /* ===== Hero ===== */
  function renderHero(p) {
    document.getElementById('heroTitle').textContent  = p.title;
    document.getElementById('heroAuthor').textContent = p.author + ' · ' + p.translator + ' · ' + p.publisher;
    document.getElementById('heroRating').textContent = '★ ' + p.averageRating;
    document.getElementById('heroReviewCnt').textContent = p.reviewCount.toLocaleString() + '개 리뷰';

    var img = document.getElementById('heroCoverImg');
    img.src = p.coverUrl;
    img.alt = p.title;
    img.onerror = function () {
      this.style.display = 'none';
      document.getElementById('heroCoverPlaceholder').style.display = 'flex';
    };
  }

  /* ===== AI Badge ===== */
  function renderAiBadge(analysis, isDemo) {
    var el = document.getElementById('aiBadge');
    el.innerHTML =
      '<span class="ai-dot"></span>' +
      'AI가 <strong>' + analysis.analyzedCount.toLocaleString() + '개</strong> 리뷰를 분석했습니다' +
      (isDemo ? ' <span style="font-size:11px;opacity:0.7;">(데모)</span>' : '');
  }

  /* ===== Summary Text ===== */
  function renderSummary(summary) {
    document.getElementById('summaryText').textContent = summary;
  }

  /* ===== Themes ===== */
  function renderThemes(themes) {
    var html = '';
    themes.forEach(function (t) {
      var noteMap = { positive: '긍정적으로 언급', negative: '부정적으로 언급', mixed: '긍·부정 혼재' };
      html +=
        '<div class="theme-item">' +
          '<div class="theme-item-head">' +
            '<span class="theme-item-name">' + t.name + '</span>' +
            '<span class="theme-item-pct">' + t.percentage + '%</span>' +
          '</div>' +
          '<div class="theme-item-bar">' +
            '<div class="theme-item-fill ' + t.sentiment + '" data-pct="' + t.percentage + '"></div>' +
          '</div>' +
          '<div class="theme-item-note">' + noteMap[t.sentiment] + '</div>' +
        '</div>';
    });
    document.getElementById('themesGrid').innerHTML = html;
  }

  /* ===== Pros / Cons ===== */
  function renderProsCons(pros, cons) {
    document.getElementById('prosList').innerHTML =
      pros.map(function (p) { return '<li><span class="li-icon">✅</span>' + p + '</li>'; }).join('');
    document.getElementById('consList').innerHTML =
      cons.map(function (c) { return '<li><span class="li-icon">🔸</span>' + c + '</li>'; }).join('');
  }

  /* ===== Quotes ===== */
  function renderQuotes(quotes) {
    var html = '';
    quotes.forEach(function (q) {
      var stars = '★'.repeat(Math.min(5, Math.round(q.rating / 2))) +
                  '☆'.repeat(5 - Math.min(5, Math.round(q.rating / 2)));
      html +=
        '<div class="quote-card">' +
          '<p class="quote-text">' + q.text + '</p>' +
          '<div class="quote-footer">' +
            '<span class="quote-stars">' + stars + '</span>' +
            '<span class="quote-rating">' + q.rating + '/10</span>' +
          '</div>' +
        '</div>';
    });
    document.getElementById('quotesList').innerHTML = html;
  }

  /* ===== Rating Distribution ===== */
  function renderRatingDist(dist) {
    var labels = ['10점', '9점', '8점', '8점 미만'];
    var keys   = ['10', '9', '8', 'below8'];
    var html   = '';
    keys.forEach(function (k, i) {
      var pct = dist[k] || 0;
      html +=
        '<div class="rating-dist-row">' +
          '<span class="rating-dist-label">' + labels[i] + '</span>' +
          '<div class="rating-dist-bar">' +
            '<div class="rating-dist-fill" data-pct="' + pct + '"></div>' +
          '</div>' +
          '<span class="rating-dist-pct">' + pct + '%</span>' +
        '</div>';
    });
    document.getElementById('ratingDist').innerHTML = html;
  }

  /* ===== Bar animation ===== */
  function animateBars() {
    var fills = document.querySelectorAll('[data-pct]');
    fills.forEach(function (el) {
      el.style.width = el.getAttribute('data-pct') + '%';
    });
  }

  /* ===== No data ===== */
  function renderNoData() {
    document.getElementById('summaryContent').innerHTML =
      '<div class="nodata">' +
        '<div class="nodata-icon">📭</div>' +
        '<p>표시할 분석 결과가 없습니다.<br/>관리자 페이지에서 상품을 조회하고 AI 분석을 먼저 실행해 주세요.</p>' +
        '<a href="admin.html" class="btn btn-primary" style="margin-top:16px;">관리자 페이지로 가기</a>' +
      '</div>';
  }

})();
