/* =========================================================
   키워드 판매 분석 POC — 화면 로직
   목업 API(검색 / AI 관련성 판정 / 판매 집계) + 집계 + 렌더 + 엑셀
   실제 API로 교체할 때도 호출 흐름은 그대로 유지된다.
   ========================================================= */
(function () {
  'use strict';

  const { CATALOG, KEYWORDS, mulberry32, TODAY } = window.KS_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ===================== 날짜 유틸 ===================== */
  const DAY = 86400000;
  const toDate = s => new Date(s + 'T00:00:00Z');
  const fmtDate = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => fmtDate(new Date(toDate(s).getTime() + n * DAY));
  const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
  const nf = n => Math.round(n).toLocaleString('ko-KR');

  /* 금액 축약 — KPI 카드용 */
  function shortWon(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(1) + '억';
    if (n >= 1e4) return nf(n / 1e4) + '만';
    return nf(n);
  }

  /* ===================== 목업 API ===================== */
  /* 전년 동기 비교가 성립하려면 최소 2년치가 필요하다 (최근 3년까지 커버) */
  const SERIES_DAYS = 1300;
  const SERIES_START = addDays(TODAY, -(SERIES_DAYS - 1));
  const seriesCache = {};

  /* 상품별 일자별 판매량 — 상품번호 시드 고정이라 새로고침해도 동일 */
  function series(item) {
    if (seriesCache[item.itemId]) return seriesCache[item.itemId];
    const rnd = mulberry32((Number(item.itemId) ^ 0x9E3779B9) >>> 0);
    const DOW = [0.85, 0.75, 1.15, 1.05, 1.0, 1.0, 1.1]; // 일~토
    const out = {};
    for (let i = 0; i < SERIES_DAYS; i++) {
      const d = addDays(SERIES_START, i);
      const age = diffDays(item.publishDate, d);
      let qty = 0;
      if (age >= 0) {
        const spike = 1 + 2.2 * Math.exp(-age / 21);        // 신간 스파이크 후 감쇠
        const noise = 0.62 + rnd() * 0.76;
        qty = Math.max(0, Math.round(item._base / 30 * spike * DOW[toDate(d).getUTCDay()] * noise));
      } else {
        rnd(); // 미출간 구간도 난수를 소비해 시계열을 고정한다
      }
      out[d] = qty;
    }
    return (seriesCache[item.itemId] = out);
  }

  const KS_MOCK = {
    /* GET /api/keyword-sales/search 대응 — 응답 봉투를 실제 문서와 동일하게 맞춘다 */
    search(query, opt) {
      const o = Object.assign({ category: 'ALL', sort: 'DEFAULT', page: 1, pageSize: 20 }, opt);
      return new Promise((resolve, reject) => setTimeout(() => {
        const hit = CATALOG[query.trim()];
        if (!hit) {
          reject({ success: false, errorCode: 'SEARCH_001', message: '검색 결과가 없습니다.' });
          return;
        }
        resolve({
          success: true, message: 'OK', errorCode: null,
          data: {
            meta: {
              apiTitle: 'YES24 상품검색', query: query.trim(), total: hit.length,
              page: o.page, pageSize: o.pageSize, pubDate: new Date().toISOString()
            },
            data: { items: hit.map((it, i) => Object.assign({ sortOrder: i + 1 }, it)) }
          }
        });
      }, 300));
    },

    /* POST /api/keyword-sales/relevance 대응 — 배치 1회 호출, itemId로 매칭
       캐시는 (키워드, 상품번호) 단위. 키워드 단위로 통째 캐싱하면 검색 결과에 상품이
       추가됐을 때 새 상품이 판정 없이 통과해버린다. */
    judge(query, items) {
      const key = 'ks.judge.' + query;
      let cache = {};
      try { cache = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { /* 저장소 차단 환경 */ }
      if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};

      const miss = items.filter(it => !cache[it.itemId]);
      const done = () => ({ rows: items.map(it => cache[it.itemId]), cached: miss.length === 0 });
      if (!miss.length) return Promise.resolve(done());

      return new Promise(resolve => setTimeout(() => {
        miss.forEach(it => {
          cache[it.itemId] = {
            itemId: it.itemId, verdict: it.verdict,
            confidence: it.confidence, reason: it.reason
          };
        });
        try { localStorage.setItem(key, JSON.stringify(cache)); } catch (e) { /* 무시 */ }
        resolve(done());
      }, 800));
    },

    /* POST /api/keyword-sales/stats 대응 */
    stats(items, from, to) {
      const out = {};
      items.forEach(it => {
        const s = series(it);
        let qty = 0;
        const days = [];
        for (let d = from; d <= to; d = addDays(d, 1)) {
          const q = s[d] || 0;
          qty += q;
          days.push({ d: d, qty: q });
        }
        out[it.itemId] = { qty: qty, amount: qty * it.salePrice, days: days };
      });
      return out;
    }
  };

  /* ===================== 상태 ===================== */
  const S = {
    query: '',
    items: [],
    judged: {},        // itemId -> {verdict, confidence, reason}
    overrides: {},     // itemId -> 'relevant'|'excluded'  (MD 수동 판단)
    judging: false,
    filterOn: true,
    sortKey: 'qty',
    unit: 'month',
    from: TODAY.slice(0, 4) + '-01-01',
    to: TODAY,
    tab: 'relevant',
    groups: [],        // 선택한 상품군 (국내도서 / eBook …)
    cats: [],          // 선택한 분야(대분류)
    tags: [],          // 선택한 상품태그
    refine: '',        // 결과 내 재검색어
    page: 1,
    pageSize: 20,
    view: null         // 마지막 집계 결과
  };

  const verdictOf = id => S.overrides[id] || (S.judged[id] ? S.judged[id].verdict : 'relevant');
  const isManual = id => !!S.overrides[id];

  /* ===================== 집계 ===================== */

  const UNIT_NAME = { day: '일', month: '월', year: '연' };

  /* 단위를 바꾸면 기간을 그 단위 경계에 맞춘다.
     맞추지 않으면 8/9~9/7 범위에서 '2026-08' 버킷이 23일치인데도 8월 전체처럼 읽힌다.
     끝은 오늘을 넘지 않게 자르므로, 마지막 구간은 여전히 진행 중일 수 있다(partial 표시). */
  function snapRange(unit) {
    if (unit === 'day') return false;
    const before = S.from + S.to;
    if (unit === 'year') {
      S.from = S.from.slice(0, 4) + '-01-01';
      S.to = S.to.slice(0, 4) + '-12-31';
    } else {
      S.from = S.from.slice(0, 8) + '01';
      const d = toDate(S.to);
      S.to = fmtDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
    }
    if (S.to > TODAY) S.to = TODAY;
    $('#dFrom').value = S.from;
    $('#dTo').value = S.to;
    return before !== S.from + S.to;
  }

  /* 비교 구간 — 1년 이하면 전년 동기, 그보다 길면 직전 동일 길이 기간.
     언론 데이터의 절반은 "전년 대비 몇 %"이므로 이 값이 화면 전면에 나와야 한다. */
  const shiftYear = (s, n) => {
    const d = toDate(s);
    d.setUTCFullYear(d.getUTCFullYear() + n);
    return fmtDate(d);
  };

  function comparePeriod() {
    const span = diffDays(S.from, S.to) + 1;
    if (span <= 366) {
      return { from: shiftYear(S.from, -1), to: shiftYear(S.to, -1), label: '전년 동기' };
    }
    return { from: addDays(S.from, -span), to: addDays(S.from, -1), label: '직전 동기간' };
  }

  const majorCat = it => String(it.dispCategoryName).split(' > ')[0];
  /* 분야 키는 상품군을 포함한다 — 같은 '컴퓨터/모바일' 이라도 국내도서와 eBook 은 별개 항목 */
  const catKey = it => it.goodsGroup + '|' + majorCat(it);

  /* 상세 조건은 AI 판정보다 **앞에** 적용된다.
     오탐은 분야로 뭉치므로(인공관절=의학, 인공위성=공학, 인공 낙원=소설)
     분야를 먼저 좁히면 판정·검수 대상이 통째로 줄어든다. */
  function passesFilter(it) {
    if (S.groups.length && S.groups.indexOf(it.goodsGroup) < 0) return false;
    if (S.cats.length && S.cats.indexOf(catKey(it)) < 0) return false;
    if (S.tags.length && !(it.hashtags || []).some(t => S.tags.indexOf(t) >= 0)) return false;
    if (S.refine) {
      const q = S.refine.toLowerCase();
      const hay = (it.title + ' ' + (it.subTitle || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  const hasFilter = () => S.groups.length || S.cats.length || S.tags.length || S.refine;

  function compute() {
    const scoped = S.items.filter(passesFilter);
    const included = S.filterOn ? scoped.filter(it => verdictOf(it.itemId) === 'relevant') : scoped.slice();
    const excluded = scoped.filter(it => included.indexOf(it) < 0);

    const span = diffDays(S.from, S.to) + 1;
    const cmp = comparePeriod();
    const cur = KS_MOCK.stats(S.items, S.from, S.to);
    const base = KS_MOCK.stats(S.items, cmp.from, cmp.to);

    const sorted = included.slice().sort((a, b) => cur[b.itemId][S.sortKey] - cur[a.itemId][S.sortKey]);
    const curRank = {};
    sorted.forEach((it, i) => { curRank[it.itemId] = i + 1; });

    const sum = (list, table) => list.reduce((a, it) => ({
      qty: a.qty + table[it.itemId].qty, amount: a.amount + table[it.itemId].amount
    }), { qty: 0, amount: 0 });
    const total = sum(included, cur);
    const baseTotal = sum(included, base);

    /* 증감률 — 비교 구간 판매량이 0이면 비율이 성립하지 않으므로 '신규'로 구분한다 */
    const mk = (it, rank) => ({
      item: it,
      rank: rank,
      qty: cur[it.itemId].qty,
      amount: cur[it.itemId].amount,
      baseQty: base[it.itemId].qty,
      baseAmount: base[it.itemId].amount,
      growth: base[it.itemId].qty ? (cur[it.itemId].qty - base[it.itemId].qty) / base[it.itemId].qty : null,
      share: total[S.sortKey] ? cur[it.itemId][S.sortKey] / total[S.sortKey] : 0
    });

    const rows = included.map(it => mk(it, curRank[it.itemId])).sort((a, b) => a.rank - b.rank);
    const exRows = excluded.map(it => mk(it, null)).sort((a, b) => b[S.sortKey] - a[S.sortKey]);

    const growthOf = k => baseTotal[k] ? (total[k] - baseTotal[k]) / baseTotal[k] : null;

    S.view = {
      rows, exRows, total, baseTotal, span, cur, cmp, scoped,
      growth: { qty: growthOf('qty'), amount: growthOf('amount') }
    };
    return S.view;
  }

  /* ===================== 렌더 ===================== */
  function render() {
    if (!S.items.length) return;
    const v = compute();
    renderBanner();
    renderFacets();
    renderSnapshot(v);
    renderKpi(v);
    renderTable(v);
    $('#resultArea').classList.remove('hidden');
  }

  function renderBanner() {
    const total = S.items.length;
    const ex = S.items.filter(it => verdictOf(it.itemId) === 'excluded').length;
    const low = S.items.filter(it => verdictOf(it.itemId) === 'relevant' &&
      S.judged[it.itemId] && S.judged[it.itemId].confidence < 0.7).length;
    const man = Object.keys(S.overrides).length;

    if (S.judging) {
      $('#aiSummary').innerHTML = '<span class="ai-thinking" style="margin:0"><svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
      '검색된 ' + total + '종의 관련성을 판정하는 중…</span>';
      $('#aiMeta').textContent = 'batch 1 request';
      return;
    }
    $('#aiSummary').innerHTML =
      '검색 <b>' + total + '종</b> 중 <b>관련 ' + (total - ex) + '종 / 제외 ' + ex + '종</b>' +
      (low ? ' · <span class="badge badge-warning">검토 필요 ' + low + '종</span>' : '') +
      (man ? ' · <span class="badge badge-secondary">사용자 수정 ' + man + '건</span>' : '');
    $('#aiMeta').textContent = S.judgeCached ? 'cache hit · 0ms' : 'batch 1 request · 800ms';
  }

  /* 산출 조건 — 화면과 엑셀에 같은 문구를 쓴다. 언론에 나간 숫자를 나중에 방어하는 근거다 */
  function snapshotLines(v) {
    const ex = S.items.filter(it => verdictOf(it.itemId) === 'excluded').length;
    const man = Object.keys(S.overrides).length;
    return [
      '키워드 "' + S.query + '" · 기간 ' + S.from + ' ~ ' + S.to +
        ' · 대상 ' + groupDesc(),
      '상세 조건 ' + filterDesc() +
        (hasFilter() ? ' → ' + v.scoped.length + '종' : ''),
      '집계 대상 ' + v.rows.length + '종' +
        (S.filterOn
          ? ' (검색 ' + S.items.length + '종 중 AI 관련성 판정으로 ' + ex + '종 제외' +
            (man ? ', 담당자 수동 조정 ' + man + '건' : '') + ')'
          : ' (AI 관련성 필터 미적용 — 검색 전건)'),
      '비교 구간 ' + v.cmp.from + ' ~ ' + v.cmp.to + ' (' + v.cmp.label + ')' +
        ' · 매출 기준 판매량 × 판매가 · 추출 ' + new Date().toLocaleString('ko-KR')
    ];
  }

  function renderSnapshot(v) {
    $('#snapshot').innerHTML = snapshotLines(v).map(l => '<div>' + l + '</div>').join('');
  }

  /* 패싯 카운트는 검색 결과 전건 기준으로 고정한다 (YES24 검색 좌측과 같은 방식).
     선택할 때마다 카운트가 흔들리면 무엇을 고를지 판단할 수 없다. */
  function renderFacets() {
    const count = (list, keyOf) => {
      const m = {};
      list.forEach(it => keyOf(it).forEach(k => { m[k] = (m[k] || 0) + 1; }));
      return Object.keys(m).map(k => ({ k: k, n: m[k] })).sort((a, b) => b.n - a.n);
    };
    const groups = count(S.items, it => [it.goodsGroup]);
    const tags = count(S.items, it => it.hashtags || []);

    const row = (name, n, kind, val, sel, sub) =>
      '<label class="ks-facet' + (sub ? ' sub' : '') + (sel.indexOf(val) >= 0 ? ' on' : '') + '">' +
        '<input type="checkbox" data-kind="' + kind + '" value="' + val + '"' +
          (sel.indexOf(val) >= 0 ? ' checked' : '') + ' />' +
        '<span class="ks-facet-name">' + name + '</span>' +
        '<span class="ks-facet-n">' + nf(n) + '</span>' +
      '</label>';

    /* 분야는 2단 트리 — 상품군(국내도서/eBook) 아래 전시분류 대분류.
       하위 체크박스 값은 '상품군|대분류' 라서 상품군이 다르면 별개로 동작한다. */
    $('#facetCats').innerHTML = groups.map(g => {
      const subs = count(S.items.filter(it => it.goodsGroup === g.k), it => [majorCat(it)]);
      return row(g.k, g.n, 'group', g.k, S.groups, false) +
        subs.map(c => row(c.k, c.n, 'cat', g.k + '|' + c.k, S.cats, true)).join('');
    }).join('');

    $('#facetTags').innerHTML = tags.slice(0, 12)
      .map(t => row('#' + t.k, t.n, 'tag', t.k, S.tags, false)).join('');
    $('#btnResetFilter').classList.toggle('hidden', !hasFilter());
  }

  /* 화면·엑셀에 남길 필터 조건 문구 — 이게 없으면 그 숫자를 재현할 수 없다 */
  const groupDesc = () => S.groups.length ? S.groups.join('·') : '전체';

  function filterDesc() {
    const p = [];
    if (S.groups.length) p.push('상품군 ' + S.groups.join('·'));
    if (S.cats.length) {
      /* '국내도서|과학' 키를 '국내도서 > 과학·인문' 처럼 상품군별로 묶어 읽기 좋게 */
      const byGroup = {};
      S.cats.forEach(k => {
        const i = k.indexOf('|');
        (byGroup[k.slice(0, i)] = byGroup[k.slice(0, i)] || []).push(k.slice(i + 1));
      });
      p.push('분야 ' + Object.keys(byGroup)
        .map(g => g + ' > ' + byGroup[g].join('·')).join(' / '));
    }
    if (S.tags.length) p.push('태그 ' + S.tags.map(t => '#' + t).join('·'));
    if (S.refine) p.push('재검색 "' + S.refine + '"');
    return p.length ? p.join(' / ') : '없음';
  }

  /* 엑셀 '산출 조건' 시트용 — 화면 요약과 같은 내용을 항목·내용 표로 편다 */
  function snapshotRows(v, pub) {
    const ex = S.items.filter(it => verdictOf(it.itemId) === 'excluded').length;
    const man = Object.keys(S.overrides).length;
    const rows = [
      ['키워드', S.query],
      ['조회 기간', S.from + ' ~ ' + S.to],
      ['집계 단위', UNIT_NAME[S.unit] + ' 단위'],
      ['대상', groupDesc()],
      ['검색 결과', S.items.length + '종'],
      ['상세 조건', filterDesc()],
      ['상세 조건 적용 후', v.scoped.length + '종'],
      ['AI 관련성 필터', S.filterOn ? '적용' : '미적용 (검색 전건 집계)'],
      ['AI 판정 제외', ex + '종'],
      ['담당자 수동 조정', man + '건'],
      ['집계 대상', v.rows.length + '종'],
      ['비교 구간', v.cmp.from + ' ~ ' + v.cmp.to + ' (' + v.cmp.label + ')'],
      ['매출 기준', '판매량 × 판매가'],
      ['정렬 기준', S.sortKey === 'qty' ? '판매량' : '매출'],
      ['내보내기 범위', pub ? '대외 제공용 — 집계에 포함된 상품만' : '내부 확인용 — 제외 항목·판정 근거 포함'],
      ['추출 일시', new Date().toLocaleString('ko-KR')]
    ];
    return rows;
  }

  const pct = g => (g >= 0 ? '▲ ' : '▼ ') + Math.abs(g * 100).toFixed(1) + '%';
  const deltaHtml = (g, label) => g === null
    ? '<span class="delta flat">비교 불가</span>'
    : '<span class="delta ' + (g >= 0 ? 'up' : 'down') + '">' + pct(g) + '</span>' +
      '<span class="ks-delta-note">' + label + '</span>';

  function renderKpi(v) {
    $('#kpiCountLabel').textContent = S.filterOn ? '집계 대상' : '검색 전건';
    $('#kpiCount').innerHTML = v.rows.length + '<span class="unit">종</span>';
    $('#kpiCountSub').textContent = S.filterOn
      ? '제외 ' + v.exRows.length + '종' : 'AI 필터 미적용';

    $('#kpiQty').textContent = nf(v.total.qty);
    $('#kpiQtySub').innerHTML = deltaHtml(v.growth.qty, v.cmp.label + ' 대비');

    $('#kpiAmt').innerHTML = shortWon(v.total.amount) + '<span class="unit">원</span>';
    $('#kpiAmtSub').innerHTML = deltaHtml(v.growth.amount, v.cmp.label + ' 대비');

    $('#kpiTop').textContent = v.rows.length ? v.rows[0].item.title : '—';
    $('#kpiTopSub').textContent = v.rows.length
      ? nf(v.rows[0].qty) + '부 · 점유율 ' + (v.rows[0].share * 100).toFixed(1) + '%' : '';
  }

  /* 검색 키워드와 일치하는 태그는 강조 — 이 상품이 왜 검색에 걸렸는지 바로 보인다 */
  function tagsHtml(tags) {
    if (!tags || !tags.length) return '<span class="ks-no-tag">태그 없음</span>';
    return '<div class="ks-tags">' + tags.map(t =>
      '<span class="ks-tag' + (t === S.query ? ' match' : '') + '">' + t + '</span>').join('') + '</div>';
  }

  function rowHtml(r, excludedView) {
    const it = r.item;
    const j = S.judged[it.itemId] || {};
    const low = !excludedView && j.confidence < 0.7;
    return '<tr data-id="' + it.itemId + '" class="' + (excludedView ? 'ks-excluded ' : '') +
      '">' +
      '<td class="ks-rank ks-c-center ' + (r.rank === 1 ? 'ks-rank-1' : '') + '">' + (r.rank || '—') + '</td>' +
      '<td class="ks-col-id"><a class="ks-idlink mono" href="' + it.link + '" target="_blank" rel="noopener">' + it.itemId + '</a></td>' +
      '<td class="ks-col-title">' +
        '<div class="ks-title">' + it.title +
          (low ? ' <span class="badge badge-warning">검토 필요 ' + j.confidence.toFixed(2) + '</span>' : '') +
          (isManual(it.itemId) ? ' <span class="badge badge-secondary">사용자 수정</span>' : '') +
        '</div>' +
        '<div class="ks-sub">' + it.author + ' · ' + it.publisher + '</div>' +
        (excludedView ? '<div class="ks-reason">' + (j.reason || '') + '</div>' : '') +
      '</td>' +
      '<td class="ks-col-sub"><div class="ks-subtitle">' + (it.subTitle || '—') + '</div></td>' +
      '<td class="ks-col-tags">' + tagsHtml(it.hashtags) + '</td>' +
      '<td class="ks-num">' + it.publishDate + '</td>' +
      '<td class="ks-num ks-c-right">' + nf(it.salePrice) + '</td>' +
      '<td class="ks-num ks-c-right"><b>' + nf(r.qty) + '</b></td>' +
      '<td class="ks-num ks-c-right">' + nf(r.amount) + '</td>' +
      '<td class="ks-num ks-c-right">' + (r.baseQty ? nf(r.baseQty) : '—') + '</td>' +
      '<td class="ks-num ks-c-right">' + (r.growth === null
        ? '<span class="delta flat">신규</span>'
        : '<span class="delta ' + (r.growth >= 0 ? 'up' : 'down') + '">' + pct(r.growth) + '</span>') + '</td>' +
      '<td class="ks-c-right"><button class="ks-rowbtn" data-act="' + (excludedView ? 'restore' : 'drop') + '" data-id="' + it.itemId + '">' +
        (excludedView ? '집계에 포함' : '제외') + '</button></td>' +
    '</tr>';
  }

  function renderTable(v) {
    const all = S.tab === 'excluded' ? v.exRows : v.rows;
    $('#tabRelevant').textContent = '관련 ' + v.rows.length;
    $('#tabExcluded').textContent = '제외 ' + v.exRows.length;
    $('#tabRelevant').classList.toggle('active', S.tab === 'relevant');
    $('#tabExcluded').classList.toggle('active', S.tab === 'excluded');
    $$('.ks-th-sort').forEach(th => th.classList.toggle('on', th.dataset.sort === S.sortKey));

    /* 페이징은 표시 단위일 뿐 — 순위·점유율·KPI 는 이미 전체 집합으로 계산돼 있다 */
    const pages = Math.max(1, Math.ceil(all.length / S.pageSize));
    if (S.page > pages) S.page = pages;
    const start = (S.page - 1) * S.pageSize;
    const rows = all.slice(start, start + S.pageSize);

    $('#tbody').innerHTML = rows.length
      ? rows.map(r => rowHtml(r, S.tab === 'excluded')).join('')
      : '<tr><td colspan="12" style="text-align:center;padding:34px;color:var(--muted-foreground)">해당 항목이 없습니다.</td></tr>';

    renderPager(all.length, pages, start, rows.length);
  }

  function renderPager(total, pages, start, shown) {
    $('#pageInfo').textContent = total
      ? '총 ' + nf(total) + '건 중 ' + nf(start + 1) + '–' + nf(start + shown)
      : '0건';

    /* 현재 페이지 주변만 노출 — 페이지가 많아도 버튼이 넘치지 않게 한다 */
    const win = [];
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - S.page) <= 2) win.push(p);
      else if (win[win.length - 1] !== '…') win.push('…');
    }

    $('#pageBtns').innerHTML =
      '<button class="ks-page" data-page="' + (S.page - 1) + '"' + (S.page === 1 ? ' disabled' : '') + ' aria-label="이전 페이지">‹</button>' +
      win.map(p => p === '…'
        ? '<span class="ks-page-gap">…</span>'
        : '<button class="ks-page' + (p === S.page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>').join('') +
      '<button class="ks-page" data-page="' + (S.page + 1) + '"' + (S.page === pages ? ' disabled' : '') + ' aria-label="다음 페이지">›</button>';

    $('#pager').classList.toggle('hidden', total === 0);
  }

  /* ===================== 엑셀 ===================== */
  const fileTag = () => S.query + '_' + S.from.replace(/-/g, '') + '-' + S.to.replace(/-/g, '');

  /* 대외 제공용은 사내 정보(전시분류·판매상태·AI 판정 과정)를 빼고, 집계에 포함된
     상품만 내보낸다. 어떤 책을 왜 뺐는지는 우리 내부 판단이라 기자에게 나가면 안 된다. */
  const XLSX_COLS = {
    public: [
      ['순위', 6, r => r.rank],
      ['상품번호', 12, r => r.item.itemId],
      ['도서명', 40, r => r.item.title],
      ['부제', 40, r => r.item.subTitle || ''],
      ['해시태그', 30, r => (r.item.hashtags || []).join(' ')],
      ['저자', 18, r => r.item.author],
      ['출판사', 16, r => r.item.publisher],
      ['출간일', 12, r => r.item.publishDate],
      ['정가', 10, r => r.item.shopPrice],
      ['판매가', 10, r => r.item.salePrice],
      ['판매량', 10, r => r.qty],
      ['매출액', 14, r => r.amount],
      ['ISBN13', 16, r => r.item.isbn13]
    ],
    internalExtra: [
      ['전시분류명', 26, r => r.item.dispCategoryName],
      ['판매상태', 10, r => r.item.itemStatus],
      ['AI판정', 12, r => (verdictOf(r.item.itemId) === 'excluded' ? '제외' : '관련') +
        (isManual(r.item.itemId) ? '(수동)' : '')],
      ['신뢰도', 8, r => { const j = S.judged[r.item.itemId] || {}; return j.confidence != null ? j.confidence : ''; }],
      ['판정근거', 60, r => (S.judged[r.item.itemId] || {}).reason || '']
    ]
  };

  function xlsxSummary() {
    const v = S.view;
    const pub = $('#xlsxMode').value === 'public';
    const shareLabel = (S.sortKey === 'qty' ? '판매량' : '매출') + ' 점유율(%)';

    /* 비교 구간 컬럼은 두 모드 공통 — 기사에 쓰이는 핵심 숫자다 */
    const cmpCols = [
      [v.cmp.label + ' 판매량', 14, r => r.baseQty],
      ['증감률(%)', 10, r => r.growth === null ? '신규' : Number((r.growth * 100).toFixed(1))],
      [shareLabel, 12, r => Number((r.share * 100).toFixed(2))]
    ];

    const defs = XLSX_COLS.public.concat(cmpCols, pub ? [] : XLSX_COLS.internalExtra);
    const src = pub ? v.rows : v.rows.concat(v.exRows);

    /* 시트를 나눈다 — 상품별 집계는 목록만 두고, 산출 조건은 별도 시트에.
       주석이 표 위에 섞여 있으면 정렬·필터·복사를 할 때마다 걸린다. */
    downloadXlsx('키워드판매_' + (pub ? '대외' : '내부') + '_' + fileTag() + '.xlsx', [
      {
        name: '상품별 집계',
        cols: defs.map(d => d[1]),
        header: defs.map(d => d[0]),
        rows: src.map(r => defs.map(d => {
          const val = d[2](r);
          return val === null || val === undefined ? '' : val;
        }))
      },
      {
        name: '산출 조건',
        cols: [18, 78],
        header: ['항목', '내용'],
        filter: false,
        rows: snapshotRows(v, pub)
      }
    ]);
    toast((pub ? '대외 제공용' : '내부 확인용') + ' ' + src.length + '행을 내려받았습니다. (산출 조건 시트 포함)');
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ===================== 검색 흐름 ===================== */
  function doSearch(q) {
    const query = (q || $('#q').value || '').trim();
    if (!query) return;
    S.query = query;
    $('#q').value = query;
    $('#errBox').classList.add('hidden');
    $('#resultArea').classList.add('hidden');
    $('#skeleton').classList.remove('hidden');
    S.overrides = {};
    S.tab = 'relevant';
    S.page = 1;
    S.groups = []; S.cats = []; S.tags = []; S.refine = '';
    $('#refine').value = '';

    KS_MOCK.search(query, {})
      .then(res => {
        S.items = res.data.data.items;
        S.judged = {};
        S.judging = true;
        $('#skeleton').classList.add('hidden');
        render();                                   // ① 판정 전에도 표를 즉시 그린다

        return KS_MOCK.judge(query, S.items);       // ② 배치 1회 판정
      })
      .then(res => {                                // ③ 판정 도착 → 순위·점유율 재계산
        if (!res) return;
        res.rows.forEach(r => { S.judged[r.itemId] = r; });
        S.judgeCached = res.cached;
        S.judging = false;
        render();
      })
      .catch(err => {
        $('#skeleton').classList.add('hidden');
        $('#resultArea').classList.add('hidden');
        $('#errBox').classList.remove('hidden');
        /* 검색 실패(errorCode 있음)와 렌더 중 예외를 구분한다.
           구분하지 않으면 화면 버그가 "없는 키워드"로 둔갑해 원인을 못 찾는다. */
        if (err && err.errorCode) {
          $('#errMsg').textContent = '"' + query + '" 은(는) 목업에 없는 키워드입니다. (' + err.errorCode + ')';
        } else {
          console.error('화면 렌더 중 오류', err);
          $('#errMsg').textContent = '화면을 그리는 중 오류가 발생했습니다: ' + (err && err.message ? err.message : err);
        }
      });
  }

  /* ===================== 이벤트 ===================== */
  function bind() {
    $('#btnSearch').addEventListener('click', () => doSearch());
    $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    $('#chips').innerHTML = KEYWORDS.map(k => '<button class="chip" data-kw="' + k + '">' + k + '</button>').join('');
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('[data-kw]');
      if (b) doSearch(b.dataset.kw);
    });

    $('#dFrom').addEventListener('change', e => { S.from = e.target.value; S.page = 1; render(); });
    $('#dTo').addEventListener('change', e => { S.to = e.target.value; S.page = 1; render(); });

    $('#unitSeg').addEventListener('click', e => {
      const b = e.target.closest('[data-unit]');
      if (!b) return;
      S.unit = b.dataset.unit;
      $$('#unitSeg button').forEach(x => x.classList.toggle('active', x === b));
      const moved = snapRange(S.unit);
      S.page = 1;
      render();
      if (moved) toast(UNIT_NAME[S.unit] + ' 단위에 맞춰 기간을 ' + S.from + ' ~ ' + S.to + ' 로 조정했습니다.');
    });

    $('#quick').addEventListener('click', e => {
      const b = e.target.closest('[data-preset]');
      if (!b) return;
      const p = b.dataset.preset;
      S.to = TODAY;
      S.from = p === 'ytd' ? TODAY.slice(0, 4) + '-01-01' : shiftYear(TODAY, -Number(p.replace('y', '')));
      snapRange(S.unit);
      $('#dFrom').value = S.from;
      $('#dTo').value = S.to;
      S.page = 1;
      render();
    });

    $('#aiToggle').addEventListener('change', e => {
      S.filterOn = e.target.checked;
      if (!S.filterOn) S.tab = 'relevant';
      S.page = 1;
      render();
    });

    $('#tabRelevant').addEventListener('click', () => { S.tab = 'relevant'; S.page = 1; render(); });
    $('#tabExcluded').addEventListener('click', () => { S.tab = 'excluded'; S.page = 1; render(); });

    $$('.ks-th-sort').forEach(th => th.addEventListener('click', () => {
      S.sortKey = th.dataset.sort;
      S.page = 1;
      render();
    }));

    $('#pageBtns').addEventListener('click', e => {
      const b = e.target.closest('.ks-page:not([disabled])');
      if (!b) return;
      S.page = Number(b.dataset.page);
      render();
      $('.ks-table-wrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    $('#pageSize').addEventListener('change', e => {
      S.pageSize = Number(e.target.value);
      S.page = 1;
      render();
    });

    $('#tbody').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (btn) {
        e.stopPropagation();
        S.overrides[btn.dataset.id] = btn.dataset.act === 'drop' ? 'excluded' : 'relevant';
        render();
        toast(btn.dataset.act === 'drop' ? '집계에서 제외했습니다. 순위를 다시 계산합니다.'
                                         : '집계에 포함했습니다. 순위를 다시 계산합니다.');
      }
    });

    const toggle = (arr, val, on) => {
      const i = arr.indexOf(val);
      if (on && i < 0) arr.push(val);
      if (!on && i >= 0) arr.splice(i, 1);
    };

    const facetChange = e => {
      const cb = e.target.closest('input[data-kind]');
      if (!cb) return;
      const key = { group: 'groups', cat: 'cats', tag: 'tags' }[cb.dataset.kind];
      toggle(S[key], cb.value, cb.checked);

      /* 상품군을 켜면 그 아래 대분류도 함께 켠다 — 트리에서 상위를 고르면
         하위가 다 선택되는 게 자연스럽다. 끄면 같이 꺼진다.
         (다른 상품군에도 있는 대분류는 남겨둔다) */
      /* 상품군을 켜면 **그 상품군의** 하위 분야만 함께 켠다. 키에 상품군이 들어 있어
         국내도서를 켜도 eBook 쪽 같은 이름의 분야는 건드리지 않는다. */
      if (cb.dataset.kind === 'group') {
        S.items.filter(it => it.goodsGroup === cb.value)
          .forEach(it => toggle(S.cats, catKey(it), cb.checked));
      }

      S.page = 1;
      render();
    };
    $('#facetCats').addEventListener('change', facetChange);
    $('#facetTags').addEventListener('change', facetChange);

    let refineTimer;
    $('#refine').addEventListener('input', e => {
      clearTimeout(refineTimer);
      const val = e.target.value.trim();
      refineTimer = setTimeout(() => { S.refine = val; S.page = 1; render(); }, 250);
    });

    $('#btnResetFilter').addEventListener('click', () => {
      S.groups = []; S.cats = []; S.tags = []; S.refine = '';
      $('#refine').value = '';
      S.page = 1;
      render();
    });

    $('#btnXlsx').addEventListener('click', xlsxSummary);

    $('#themeToggle').addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      $('#iconMoon').classList.toggle('hidden', dark);
      $('#iconSun').classList.toggle('hidden', !dark);
    });
  }

  /* ===================== 시작 ===================== */
  document.addEventListener('DOMContentLoaded', () => {
    $('#dFrom').value = S.from;
    $('#dTo').value = S.to;
    bind();
    doSearch('필사');   // 오탐 시연 키워드로 시작
  });

  window.KS_MOCK = KS_MOCK;   // 콘솔에서 응답 형태를 확인할 수 있게 노출
})();
