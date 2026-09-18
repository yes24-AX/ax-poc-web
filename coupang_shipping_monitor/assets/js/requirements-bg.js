/* AX 요구사항 #306 배경 블록 — 요구사항 점검표(R1~R27)에 없는 "왜 필요한가·무엇을 없애나"만 담는다.
   출처: ax-labs 요구사항 상세의 「한눈에 보기」 목적·배경, AS-IS, 첨부 파일 요약 (2026-09-17 기준).
   본 화면(app.js)과 요구사항 창(requirements.js)이 같은 마크업을 쓴다. */
(function () {
  'use strict';

  var BG = {
    source: 'https://ax-labs.yes24.com/Requirement/Detail/306',
    asOf: '2026-09-17 요구서·첨부 기준',
    purpose: '쿠팡은 주문시 출고예정일로 정시출고를 평가하고, 이 실적이 판매자 점수·상품 노출 중지·동일상품 셀러 노출 순위에 바로 반영됩니다. ' +
      '그런데 WING 공식 지표는 약 1주 전 출고예정 주문을 뒤늦게 집계해, 지금 생기는 지연을 점수에 반영되기 전에 잡기 어렵습니다.',
    metrics: [
      { label: '정시출고완료 점수', value: '86.2', unit: '점', sub: '주의 등급 · 목표 99.0 이상', tone: 'bad' },
      { label: '지난 7일 출고지연', value: '2,052', unit: '건', sub: '지난 30일 5,278건', tone: 'bad' },
      { label: '수기 확인 작업', value: '60', unit: '분/일', sub: '담당 1명 · 엑셀과 영업관리시스템 대조', tone: 'plain' }
    ],
    metricsNote: '점수·지연 건수는 첨부한 WING 캡처 기준, 수기 시간은 요구서 본문 기준',
    steps: [
      { title: 'WING 배송관리에서 주문 엑셀 다운로드', now: '쿠팡 발주서 API 자동 수집', reqs: ['R2', 'R3', 'R18'], state: 'done' },
      { title: '주문시 출고예정일로 당일 출고 대상·지연 주문 선별', now: '당일 출고 대상·출고 지연 자동 구분, 지연일수 산출', reqs: ['R4', 'R5', 'R6', 'R7'], state: 'done' },
      { title: '업체상품코드로 자사 상품번호 확인 → 유통상태 확인 → 영업관리시스템에서 자사 주문번호·출고상태 대조',
        now: '자사 상품번호·자사 주문번호·출고상태는 자동. 유통상태(R22)는 2단계, 자사 기준 지연(R23)은 확인 필요', reqs: ['R21', 'R11', 'R22', 'R23'], state: 'partial' },
      { title: '지연 상품 종수·주문 수 확인, 최신 현황을 보려면 같은 작업 반복', now: '주요 지연 상품·직전 집계 대비 증감·일자별 추이 자동', reqs: ['R10', 'R8', 'R9'], state: 'done' }
    ]
  };

  var STATE = {
    done: ['자동화', 'badge-success'],
    partial: ['일부 자동화', 'badge-warning']
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 배경 블록 HTML. chip(id) 는 각 화면의 요구사항 태그 렌더러. */
  window.AX_REQ_BG = {
    data: BG,
    html: function (chip) {
      return '<section class="req-bg" aria-labelledby="reqBgTitle">' +
        '<div class="req-bg-head"><h3 id="reqBgTitle">배경 · 왜 필요한가</h3>' +
          '<a class="req-bg-link" href="' + BG.source + '" target="_blank" rel="noopener">원본 요구서 열기 (ax-labs #306)</a></div>' +
        '<p class="req-bg-purpose">' + esc(BG.purpose) + '</p>' +
        '<div class="req-bg-metrics">' + BG.metrics.map(function (m) {
          return '<div class="req-bg-metric"><span class="k">' + esc(m.label) + '</span>' +
            '<span class="v' + (m.tone === 'bad' ? ' bad' : '') + '"><b class="num">' + esc(m.value) + '</b>' + esc(m.unit) + '</span>' +
            '<span class="s">' + esc(m.sub) + '</span></div>';
        }).join('') + '</div>' +
        '<p class="req-bg-note">' + esc(BG.metricsNote) + ' · ' + esc(BG.asOf) + '</p>' +
        '<h4 class="req-bg-sub">지금의 수작업 4단계와 대체 항목</h4>' +
        '<ol class="req-bg-steps">' + BG.steps.map(function (s) {
          var st = STATE[s.state];
          return '<li><div class="step-top"><span class="step-title">' + esc(s.title) + '</span>' +
            '<span class="badge ' + st[1] + '">' + st[0] + '</span></div>' +
            '<div class="step-now">→ ' + esc(s.now) + '</div>' +
            '<div class="req-row">' + s.reqs.map(chip).join('') + '</div></li>';
        }).join('') + '</ol>' +
      '</section>';
    }
  };
})();
