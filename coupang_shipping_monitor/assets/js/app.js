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

  // ── 요구사항 항목 (AX 요구사항 #306 본문·댓글을 항목으로 분해) ──
  // status: ui 반영 · cond 반영(조건부) · partial 일부 반영 · pending 2단계(자사 데이터 필요) · excluded 미반영(확인 필요) · offscreen 화면 외
  var REQ = [
    { id: 'R1', text: '출고지연은 자사 상품출발예정일이 아니라 WING 주문시 출고예정일 기준으로 판단', short: 'WING 출고예정일 기준 판정', src: '산출물 · 완료 기준 · 댓글 답변 1', where: '헤더 판정 기준 배지, 모든 집계', status: 'ui' },
    { id: 'R2', text: '당일 출고 대상(오늘이 출고예정일인데 미출고) 주문을 엑셀 없이 자동 확인', short: '당일 출고 대상 자동 확인', src: 'TO-BE', where: '주요 현황 첫 카드, 상세 목록 「당일 출고 대상」 탭', status: 'ui' },
    { id: 'R3', text: '출고 지연(출고예정일 경과 미출고) 주문을 자동 확인', short: '출고 지연 자동 확인', src: 'TO-BE', where: '주요 현황 둘째 카드, 상세 목록 「출고 지연」 탭', status: 'ui' },
    { id: 'R4', text: '출고예정일 대비 지연일수를 자동 산출해 1일·2일·3일 이상으로 구분', short: '지연일수 산출·1/2/3일+ 구분', src: 'TO-BE', where: '지연일수별 카드, 추이 차트 색, 상품 표, 목록 지연일수 컬럼', status: 'ui' },
    { id: 'R5', text: '오늘 출고예정 미출고 주문 수 / 상품 종수', short: '오늘 출고예정 미출고 수·종수', src: '산출물 › 주요 현황', where: '주요 현황 첫 카드', status: 'ui' },
    { id: 'R6', text: '출고예정일 경과 미출고 주문 수 / 상품 종수', short: '경과 미출고 수·종수', src: '산출물 › 주요 현황', where: '주요 현황 둘째 카드', status: 'ui' },
    { id: 'R7', text: '1일 / 2일 / 3일 이상 지연 주문 수', short: '1/2/3일+ 지연 주문 수', src: '산출물 › 주요 현황', where: '지연일수별 카드', status: 'ui' },
    { id: 'R8', text: '직전 집계 대비 지연 증감', short: '직전 집계 대비 지연 증감', src: '산출물 › 주요 현황', where: '둘째·셋째 카드의 ▲▼ 표시', status: 'cond', note: '집계를 저장해 비교하므로 운영 후 두 번째 집계부터 표시' },
    { id: 'R9', text: '일자별 추이', short: '일자별 추이', src: '산출물 › 주요 현황', where: '일자별 출고지연 추이 차트', status: 'cond', note: '운영 시작일부터 누적. 이전 기간은 주문 이력으로 근사 재구성' },
    { id: 'R10', text: '주요 출고지연 상품', short: '주요 출고지연 상품', src: '산출물 › 주요 현황', where: '주요 출고지연 상품 표', status: 'ui' },
    { id: 'R11', text: '상세목록: 자사 상품번호 / 상품명 / 쿠팡·자사·자사 공개 주문번호 / 주문일 / 주문시 출고예정일 / 지연일수 / 현재 출고상태 / 실제 출고일', short: '상세목록 10개 컬럼', src: '산출물 › 상세목록', where: '상세 목록 표', status: 'partial', note: '자사 주문번호·자사 공개주문번호는 쿠팡 API에 없어 자사 매핑 원천 확정 후 채움' },
    { id: 'R12', text: '상세목록 엑셀 다운로드', short: '엑셀 다운로드', src: '산출물 › 상세목록', where: '상세 목록 「엑셀 다운로드」 버튼', status: 'ui' },
    { id: 'R13', text: 'AI 분석: 최근 대비 지연 급증', short: 'AI · 지연 급증', src: '산출물 › AI 분석', where: 'AI 분석 「주요 패턴」', status: 'cond', note: '비교할 집계 이력이 쌓여야 정확' },
    { id: 'R14', text: 'AI 분석: 반복 지연 상품', short: 'AI · 반복 지연 상품', src: '산출물 › AI 분석', where: 'AI 분석 「주요 패턴」', status: 'cond', note: '상품별 일자 이력이 쌓여야 판단 가능' },
    { id: 'R15', text: 'AI 분석: 특정 상품·상품군 지연 집중', short: 'AI · 상품·상품군 집중', src: '산출물 › AI 분석', where: 'AI 분석 「주요 패턴」', status: 'cond', note: '상품군은 쿠팡 카테고리 기준(자사 분류가 필요하면 추가 조회)' },
    { id: 'R16', text: 'AI 분석: 기타 기존 추이와 다른 이상 패턴', short: 'AI · 기타 이상 패턴', src: '산출물 › AI 분석', where: 'AI 분석 「주요 패턴」', status: 'ui' },
    { id: 'R17', text: '누적 데이터로 주요 패턴을 AI가 요약해 우선 확인 대상을 빠르게 파악', short: 'AI 요약·우선 확인 대상', src: 'TO-BE', where: 'AI 요약 문단, 「우선 확인 대상」', status: 'ui' },
    { id: 'R18', text: '자동 갱신: 실시간(10·30분 단위) 희망, 호출 제한상 어려우면 영업일 08시·14시', short: '자동 갱신 주기', src: 'TO-BE', where: '헤더 갱신 안내, 집계 시각', status: 'partial', note: '시안은 08시·14시안. 30분 수집은 영업관리시스템과 함께 쓰는 API 호출 한도 확인 후 결정' },
    { id: 'R19', text: '별도 알림(메일·메신저) 없이 담당자가 화면을 직접 열어 확인', short: '알림 없음·화면 확인', src: '산출물 › 알림 · 댓글 답변 2', where: '알림 기능을 두지 않음', status: 'ui' },
    { id: 'R20', text: '엑셀 작업 없이 As-Is 1~3단계를 자동으로 확인할 수 있는 상태', short: 'As-Is 1~3단계 자동화', src: 'TO-BE', where: '화면 전체', status: 'partial', note: '1~2단계(주문 다운로드·선별)와 3단계 중 자사 상품번호 확인은 반영. 3단계의 자사 유통상태·주문번호 대조는 R22·R23 참고' },
    { id: 'R21', text: '업체상품코드로 자사 상품번호를 확인해 출고지연이 많은 상품 파악', short: '자사 상품번호로 지연 상품 파악', src: 'AS-IS 3단계', where: '주요 출고지연 상품 표, 목록 자사 상품번호', status: 'ui' },
    { id: 'R22', text: '자사 상품번호 기준 유통상태(품절·일시품절·절판·예약판매)와 발매예정일 확인', short: '자사 유통상태·발매예정일', src: 'AS-IS 3단계 · 댓글 답변 3', where: '— (화면에 없음)', status: 'pending', note: '산출물 목록엔 없지만 TO-BE가 1~3단계 자동화를 언급. 자사 상품 데이터 연동이 필요해 2단계로 분리' },
    { id: 'R23', text: '자사 주문번호 기준 출고상태·상품출발예정일로 자사 기준 지연 확인', short: '자사 기준 출고상태·출발예정일', src: 'AS-IS 3단계 · 댓글 답변 3', where: '— (화면에 없음)', status: 'excluded', note: '판정은 WING 기준으로 한다는 답변(R1)에 따라 제외. 자사 기준 값도 함께 볼지 요청 부서 확인 필요' },
    { id: 'R24', text: '예약판매·업체배송·반품불가 등 일부 상품은 쿠팡 출고예정일이 공란', short: '출고예정일 공란 처리', src: 'AS-IS 주석', where: '「출고예정일 없음」 카드(편의), 지연 판정에서 제외', status: 'ui' },
    { id: 'R25', text: '사용 주체: 제휴영업팀 2명(실무 1명)·팀장, 수시 사용, 별도 모니터링 담당자 없음', short: '사용 주체·주기', src: '사용 주체 · 사용 주기', where: '메뉴 권한 설정', status: 'offscreen' },
    { id: 'R26', text: '쿠팡 API 초당 5회 이상 호출 시 차단, SECRET KEY 6개월 교체(영업관리시스템 제휴 암호키관리)', short: 'API 호출 제한·키 교체', src: '데이터소스', where: '수집 배치 설계', status: 'offscreen' },
    { id: 'R27', text: '완료 기준: 3주 연속 정상 집계, 담당자 수기 확인 60분 → 0', short: '완료 기준(3주·수기 0)', src: '완료 기준', where: '운영 검증', status: 'offscreen' }
  ];
  var REQ_MAP = {};
  REQ.forEach(function (r) { REQ_MAP[r.id] = r; });
  var STATUS = {
    ui: ['반영', 'badge-success'],
    cond: ['반영 · 조건부', 'badge-info'],
    partial: ['일부 반영', 'badge-warning'],
    pending: ['2단계 · 자사 데이터 필요', 'badge-warning'],
    excluded: ['미반영 · 확인 필요', 'badge-danger'],
    offscreen: ['화면 외 (수집·운영)', 'badge-secondary']
  };

  function reqChip(id) {
    var r = REQ_MAP[id];
    if (!r) return '';
    return '<span class="req" title="' + esc(r.id + ' · ' + r.text + ' (' + r.src + ')') + '"><b>' + r.id + '</b>' + esc(r.short) + '</span>';
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
      (cnt.offscreen || 0) + '개는 수집·운영에서 다룹니다. 일부 반영 ' + (cnt.partial || 0) + '개는 자사 주문번호 연동과 갱신 주기 확인이 남아 있습니다.';
    $('traceSummary').innerHTML = Object.keys(STATUS).filter(function (k) { return cnt[k]; }).map(function (k) {
      return '<span class="badge ' + STATUS[k][1] + '">' + STATUS[k][0] + ' ' + cnt[k] + '</span>';
    }).join('');
    $('traceBody').innerHTML = REQ.map(function (r) {
      var st = STATUS[r.status];
      return '<tr><td class="num col-nowrap"><b>' + r.id + '</b></td>' +
        '<td>' + esc(r.text) + '</td>' +
        '<td class="src">' + esc(r.src) + '</td>' +
        '<td>' + esc(r.where) + (r.note ? '<span class="note">' + esc(r.note) + '</span>' : '') + '</td>' +
        '<td class="col-nowrap"><span class="badge ' + st[1] + '">' + st[0] + '</span></td></tr>';
    }).join('');
  }

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

  var rows = [];
  for (var i = 0; i < 360; i++) {
    var p = pick(), late;
    if (p.noDate) late = null;
    else if (rnd() < p.bias) { var r = rnd(); late = r < .45 ? 1 : r < .72 ? 2 : 3 + Math.floor(rnd() * 8); }
    else late = rnd() < .6 ? 0 : -1;               // 0 = 오늘 예정, -1 = 내일 이후(모니터 대상 아님)
    if (late === -1) continue;
    var due = late === null ? null : addDays(TODAY, -late);
    var ordered = late === null ? addDays(TODAY, -Math.floor(rnd() * 20)) : addDays(due, -(1 + Math.floor(rnd() * 3)));
    // 08:00 이후 14:00 전에 출고된 주문 → 14:00 집계에서 '출고됨'
    var shipped = late !== null && rnd() < (late === 0 ? .45 : .2)
      ? ymd(TODAY) + ' ' + pad(9 + Math.floor(rnd() * 5)) + ':' + pad(Math.floor(rnd() * 60)) : null;
    rows.push({
      p: p,
      orderId: String(2 + Math.floor(rnd() * 25)) + String(10236000 + i * 7) + pad(Math.floor(rnd() * 100)) + pad(Math.floor(rnd() * 100)),
      ordered: ymd(ordered) + ' ' + pad(Math.floor(rnd() * 24)) + ':' + pad(Math.floor(rnd() * 60)),
      due: due ? ymd(due) : null,
      late: late,
      shippedAt: shipped
    });
  }

  // ── 상태 ──
  var state = { snap: '14', tab: 'today', days: '', ship: '', q: '', page: 1 };
  var PAGE_SIZE = 12;
  var PREV_DAY_14 = { late: 131, d1: 58, d2: 41, d3: 32 };   // 전일 14:00 집계 (예시)

  function isShipped(r, snap) { return snap === '14' && !!r.shippedAt; }
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
      ['d1', 'd2', 'd3'].forEach(function (k) {
        var h = (H - T - B) * o[k] / top;
        acc += o[k];
        out += '<rect class="bar-' + k + '" x="' + x.toFixed(1) + '" y="' + y(acc).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '">' +
          '<title>' + ymd(o.date) + ' · ' + (k === 'd3' ? '3일 이상' : k.slice(1) + '일') + ' ' + o[k] + '건</title></rect>';
      });
      var label = isLast ? (state.snap === '14' ? '오늘' : '오늘 08시') : (o.date.getMonth() + 1) + '/' + o.date.getDate();
      out += '<text class="chart-label' + (isLast ? ' is-today' : '') + '" x="' + (x + w / 2) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + label + '</text>';
      if (isLast || i === 0) out += '<text class="chart-total" x="' + (x + w / 2) + '" y="' + (y(acc) - 5) + '" text-anchor="middle">' + acc + '</text>';
    });
    $('trend').innerHTML = out;
  }

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
      if (state.ship === 'wait' && shipped) return false;
      if (state.ship === 'done' && !shipped) return false;
      if (q && (r.p.no + ' ' + r.p.name + ' ' + r.orderId).toLowerCase().indexOf(q) < 0) return false;
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
        '<td class="col-nowrap cell-pending">—</td>' +
        '<td class="col-nowrap cell-pending">—</td>' +
        '<td class="num col-nowrap">' + r.ordered + '</td>' +
        '<td class="num col-nowrap">' + r.due + '</td>' +
        '<td class="col-num col-nowrap num">' + days + '</td>' +
        '<td class="col-nowrap">' + (shipped ? '<span class="ship-status done">출고됨(배송지시)</span>' : '<span class="ship-status wait">상품준비중</span>') + '</td>' +
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
  renderTrace();
  renderAll();
})();
