/* YES24 리뷰 AI 요약 — Admin Page Logic */
(function () {
  'use strict';

  var apiKey = '';
  var currentProduct = null;
  var currentAnalysis = null;

  /* ===== DOM helpers ===== */
  function $(id) { return document.getElementById(id); }
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  /* ===== Init ===== */
  document.addEventListener('DOMContentLoaded', function () {
    // Restore saved key
    var saved = sessionStorage.getItem('y24_ai_key');
    if (saved) {
      $('apiKeyInput').value = saved;
      apiKey = saved;
      setKeyStatus('ok', '✓ API 키가 설정되어 있습니다.');
    }

    $('toggleKeyVisibility').addEventListener('click', function () {
      var inp = $('apiKeyInput');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      this.textContent = inp.type === 'password' ? '👁' : '🙈';
    });
    $('saveApiKey').addEventListener('click', saveKey);
    $('clearApiKey').addEventListener('click', clearKey);
    $('fetchProductBtn').addEventListener('click', fetchProduct);
    $('analyzeBtn').addEventListener('click', analyzeReviews);
    $('previewBtn').addEventListener('click', openSummary);
    $('reAnalyzeBtn').addEventListener('click', function () {
      hide('resultCard');
      show('analyzeCard');
    });
  });

  /* ===== API Key ===== */
  function saveKey() {
    var val = $('apiKeyInput').value.trim();
    if (!val) { setKeyStatus('err', '키를 입력해 주세요.'); return; }
    if (!val.startsWith('sk-ant-')) { setKeyStatus('err', '올바른 Anthropic API 키 형식이 아닙니다 (sk-ant-...).'); return; }
    apiKey = val;
    sessionStorage.setItem('y24_ai_key', val);
    setKeyStatus('ok', '✓ API 키 저장됨. 실제 Claude AI로 분석합니다.');
  }

  function clearKey() {
    apiKey = '';
    $('apiKeyInput').value = '';
    sessionStorage.removeItem('y24_ai_key');
    setKeyStatus('demo', '데모 모드: 미리 생성된 분석 결과를 사용합니다.');
  }

  function setKeyStatus(type, msg) {
    var el = $('apiKeyStatus');
    el.className = 'key-status ' + type;
    el.textContent = msg;
  }

  /* ===== Product Fetch (mock) ===== */
  function fetchProduct() {
    var productId = $('productId').value.trim();
    if (!productId) { alert('상품번호를 입력해 주세요.'); return; }

    var btn = $('fetchProductBtn');
    btn.disabled = true;
    btn.textContent = '불러오는 중...';

    // Simulate network delay
    setTimeout(function () {
      var product = YES24_PRODUCTS[productId];
      btn.disabled = false;
      btn.textContent = '상품 불러오기';

      if (!product) {
        alert('상품을 찾을 수 없습니다. (지원 상품번호: 101375755)');
        return;
      }

      currentProduct = product;
      renderProduct(product);
      renderReviews(SAMPLE_REVIEWS);

      show('productCard');
      show('reviewsCard');
      show('analyzeCard');

      $('analyzeMode').textContent = apiKey
        ? '🤖 Claude claude-haiku-4-5-20251001 모델로 실제 AI 분석을 실행합니다.'
        : '⚡ API 키 미설정 — 데모 분석 결과를 표시합니다. 실제 분석은 Claude API 키가 필요합니다.';

      $('analyzeCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 800);
  }

  function renderProduct(p) {
    var stars = '★'.repeat(Math.round(p.averageRating / 2));
    $('productInfo').innerHTML =
      '<div class="product-info">' +
        '<div class="product-cover">' +
          '<img src="' + p.coverUrl + '" alt="' + p.title + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" />' +
          '<div class="product-cover-placeholder" style="display:none">📚</div>' +
        '</div>' +
        '<div class="product-meta">' +
          '<div class="product-title">' + p.title + '</div>' +
          '<div class="product-author">' + p.author + ' · ' + p.translator + ' · ' + p.publisher + '</div>' +
          '<div class="product-stats">' +
            '<div class="stat-item"><span class="stat-label">평균 평점</span><span class="stat-value rating">★ ' + p.averageRating + '</span></div>' +
            '<div class="stat-item"><span class="stat-label">리뷰</span><span class="stat-value">' + p.reviewCount.toLocaleString() + '개</span></div>' +
            '<div class="stat-item"><span class="stat-label">한줄평</span><span class="stat-value">' + p.oneLineCount.toLocaleString() + '개</span></div>' +
            '<div class="stat-item"><span class="stat-label">가격</span><span class="stat-value">' + p.price.toLocaleString() + '원</span></div>' +
          '</div>' +
          '<div class="product-tags">' +
            p.category.split('>').map(function(t){ return '<span class="tag">' + t.trim() + '</span>'; }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderReviews(reviews) {
    $('reviewCount').textContent = reviews.length + '개';
    var html = '<div class="reviews-list">';
    reviews.forEach(function (r) {
      var starsOn  = '★'.repeat(Math.min(5, Math.round(r.rating / 2)));
      var starsOff = '☆'.repeat(5 - Math.min(5, Math.round(r.rating / 2)));
      html +=
        '<div class="review-item">' +
          '<div class="review-header">' +
            '<span class="review-rating"><span class="stars">' + starsOn + starsOff + '</span>' + r.rating + '/10</span>' +
            '<span class="review-reviewer">' + r.reviewer + ' · ' + r.memberGrade + '</span>' +
            '<span class="review-date">' + r.date + '</span>' +
          '</div>' +
          '<div class="review-title">' + r.title + '</div>' +
          '<p class="review-content">' + r.content + '</p>' +
          '<div class="review-footer">' +
            '<span class="review-helpful">도움돼요 ' + r.helpful + '</span>' +
            '<span class="review-type">' + r.purchaseType + '</span>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    $('reviewsList').innerHTML = html;
  }

  /* ===== Analyze ===== */
  function analyzeReviews() {
    if (!currentProduct) return;
    var btn = $('analyzeBtn');
    btn.disabled = true;

    showLoadingSteps();

    if (apiKey) {
      runRealAnalysis();
    } else {
      runDemoAnalysis();
    }
  }

  function showLoadingSteps() {
    var steps = [
      '리뷰 데이터 수집 중...',
      '텍스트 전처리 및 정규화 중...',
      'Claude AI에 분석 요청 중...',
      '결과 구조화 중...'
    ];
    var html = '<div class="loading-steps" id="loadingSteps">';
    steps.forEach(function (s, i) {
      html += '<div class="loading-step" id="lstep' + i + '"><span class="step-icon">⬜</span>' + s + '</div>';
    });
    html += '</div>';
    $('analyzeCard').insertAdjacentHTML('beforeend', html);
  }

  function activateStep(index, done) {
    var el = $('lstep' + index);
    if (!el) return;
    if (done) {
      el.className = 'loading-step done';
      el.querySelector('.step-icon').textContent = '✅';
    } else {
      el.className = 'loading-step active';
      el.innerHTML = '<span class="step-icon"><div class="spinner"></div></span>' + el.textContent;
    }
  }

  function clearLoadingSteps() {
    var el = $('loadingSteps');
    if (el) el.remove();
  }

  function runDemoAnalysis() {
    var delays = [400, 700, 1100, 500];
    var total = 0;
    delays.forEach(function (d, i) {
      total += d;
      var prev = total - d;
      setTimeout(function () { activateStep(i, false); }, prev);
      setTimeout(function () { activateStep(i, true); }, total);
    });
    setTimeout(function () {
      clearLoadingSteps();
      finishAnalysis(MOCK_ANALYSIS, true);
    }, total + 300);
  }

  function runRealAnalysis() {
    activateStep(0, false);
    setTimeout(function () {
      activateStep(0, true);
      activateStep(1, false);
      setTimeout(function () {
        activateStep(1, true);
        activateStep(2, false);

        callClaudeAPI()
          .then(function (result) {
            activateStep(2, true);
            activateStep(3, false);
            setTimeout(function () {
              activateStep(3, true);
              clearLoadingSteps();
              finishAnalysis(result, false);
            }, 400);
          })
          .catch(function (err) {
            clearLoadingSteps();
            console.error('Claude API error:', err);
            alert('AI 분석 중 오류가 발생했습니다: ' + err.message + '\n\n데모 결과로 대체합니다.');
            finishAnalysis(MOCK_ANALYSIS, true);
          });
      }, 600);
    }, 400);
  }

  function callClaudeAPI() {
    var reviewsText = SAMPLE_REVIEWS.map(function (r, i) {
      return '[' + (i + 1) + '] 평점: ' + r.rating + '/10\n제목: ' + r.title + '\n내용: ' + r.content;
    }).join('\n\n');

    var prompt =
      '당신은 도서 리뷰 전문 분석가입니다.\n\n' +
      '도서 정보:\n' +
      '- 제목: ' + currentProduct.title + '\n' +
      '- 저자: ' + currentProduct.author + ' (' + currentProduct.translator + ')\n' +
      '- 출판사: ' + currentProduct.publisher + '\n' +
      '- 평균 평점: ' + currentProduct.averageRating + '/10 (총 ' + currentProduct.reviewCount + '개 리뷰)\n' +
      '- 카테고리: ' + currentProduct.category + '\n\n' +
      '아래는 고객 리뷰 샘플 ' + SAMPLE_REVIEWS.length + '개입니다 (전체 ' + currentProduct.reviewCount + '개 중 대표 샘플):\n\n' +
      reviewsText + '\n\n' +
      '위 리뷰를 분석하여 정확히 아래 JSON 형식으로만 응답해 주세요. 마크다운이나 다른 텍스트 없이 JSON만 출력하세요.\n\n' +
      '{\n' +
      '  "summary": "전체 리뷰 경향 2-3문장 요약 (전체 ' + currentProduct.reviewCount + '개 기준으로 작성)",\n' +
      '  "themes": [\n' +
      '    { "name": "테마명 (10자 이내)", "percentage": 숫자, "sentiment": "positive 또는 negative 또는 mixed" }\n' +
      '  ],\n' +
      '  "pros": ["긍정 포인트1", "긍정 포인트2", "긍정 포인트3"],\n' +
      '  "cons": ["아쉬운 점1", "아쉬운 점2"],\n' +
      '  "quotes": [\n' +
      '    { "text": "실제 리뷰에서 인상적인 문장", "rating": 숫자 }\n' +
      '  ],\n' +
      '  "ratingDistribution": { "10": 퍼센트, "9": 퍼센트, "8": 퍼센트, "below8": 퍼센트 },\n' +
      '  "analyzedCount": ' + currentProduct.reviewCount + '\n' +
      '}\n\n' +
      'themes 5개, pros 3개, cons 1-2개, quotes 3개. ratingDistribution 합계는 반드시 100.';

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (e) { throw new Error(e.error ? e.error.message : 'HTTP ' + res.status); });
      return res.json();
    })
    .then(function (data) {
      var text = data.content[0].text.trim();
      // Strip markdown code fences if present
      text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(text);
    });
  }

  /* ===== Render Result ===== */
  function finishAnalysis(analysis, isDemo) {
    currentAnalysis = analysis;

    $('resultMeta').textContent =
      (isDemo ? '⚡ 데모 모드 · ' : '🤖 Claude AI 분석 · ') +
      analysis.analyzedCount.toLocaleString() + '개 리뷰 기준';

    renderResultPreview(analysis);

    hide('analyzeCard');
    show('resultCard');
    $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Save for summary page
    localStorage.setItem('reviewSummaryData', JSON.stringify({
      product: currentProduct,
      analysis: analysis,
      generatedAt: new Date().toISOString(),
      isDemo: isDemo
    }));

    $('analyzeBtn').disabled = false;
  }

  function renderResultPreview(a) {
    var html =
      '<div class="result-summary-text">' + a.summary + '</div>' +

      '<div class="result-themes">' +
        '<h4>주요 키워드</h4>' +
        a.themes.map(function (t) {
          return '<div class="theme-row">' +
            '<span class="theme-name">' + t.name + '</span>' +
            '<div class="theme-bar-wrap"><div class="theme-bar-fill ' + t.sentiment + '" style="width:' + t.percentage + '%"></div></div>' +
            '<span class="theme-pct">' + t.percentage + '%</span>' +
            '</div>';
        }).join('') +
      '</div>' +

      '<div class="result-proscons">' +
        '<div class="proscons-card pros"><h4>✨ 독자들이 좋아한 점</h4><ul>' +
          a.pros.map(function(p){ return '<li>' + p + '</li>'; }).join('') +
        '</ul></div>' +
        '<div class="proscons-card cons"><h4>🔸 아쉬운 점</h4><ul>' +
          a.cons.map(function(c){ return '<li>' + c + '</li>'; }).join('') +
        '</ul></div>' +
      '</div>';

    $('resultPreview').innerHTML = html;
  }

  /* ===== Open Summary ===== */
  function openSummary() {
    window.open('summary.html', '_blank');
  }

})();
