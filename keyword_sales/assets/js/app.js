/* =========================================================
   키워드 판매 분석 POC — 화면 로직
   목업 API(검색 / 판매 집계 / AI 관련성 판별) + 집계 + 렌더 + 엑셀
   실제 API로 교체할 때도 호출 흐름은 그대로 유지된다.

   흐름: 검색 → 상세 조건 → 기간 집계 → (다운로드 시) AI 관련성 판별 → 엑셀
   AI 판별은 검색 시점이 아니라 **엑셀 다운로드 시점**에, 체크박스가 켜져 있을 때만
   호출한다. 매번 LLM을 태우면 조회만 하는 사용자에게 지연·비용이 그대로 전가된다.
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
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ===================== 목업 API ===================== */
  /* 비교 구간(전년 동기)이 성립하려면 최소 2년치가 필요하다 (최근 3년까지 커버) */
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
      const o = Object.assign({ category: 'ALL', sort: 'DEFAULT', page: 1, pageSize: 200 }, opt);
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
       추가됐을 때 새 상품이 판별 없이 통과해버린다. */
    judge(query, items) {
      const key = 'ks.judge.' + query;
      let cache = {};
      try { cache = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { /* 저장소 차단 환경 */ }
      if (!cache || typeof cache !== 'object' || Array.isArray(cache)) cache = {};

      const miss = items.filter(it => !cache[it.itemId]);
      const done = () => ({ rows: items.map(it => cache[it.itemId]), cached: miss.length === 0 });
      if (!miss.length) return Promise.resolve(done());

      /* 실제 API도 상품 수와 무관하게 배치 1회다. 지연만 건수에 따라 흉내낸다. */
      const wait = Math.min(2600, 700 + miss.length * 45);
      return new Promise(resolve => setTimeout(() => {
        miss.forEach(it => {
          cache[it.itemId] = {
            itemId: it.itemId, verdict: it.verdict,
            confidence: it.confidence, reason: it.reason
          };
        });
        try { localStorage.setItem(key, JSON.stringify(cache)); } catch (e) { /* 무시 */ }
        resolve(Object.assign(done(), { ms: wait }));
      }, wait));
    },

    /* POST /api/keyword-sales/stats 대응 — 화면은 조회 기간의 합계만 쓴다 */
    stats(items, from, to) {
      const out = {};
      items.forEach(it => {
        const s = series(it);
        let qty = 0;
        for (let d = from; d <= to; d = addDays(d, 1)) qty += (s[d] || 0);
        out[it.itemId] = { qty: qty, amount: qty * it.salePrice };
      });
      return out;
    }
  };

  /* ===================== 상품 정렬 ===================== */
  /* YES24 상품검색(www.yes24.com/product/search)이 제공하는 정렬을 그대로 옮기고,
     이 화면의 목적(판매 집계)에 필요한 판매량·매출순을 앞에 둔다. */
  const num = s => Number(String(s).replace(/\D/g, '')) || 0;

  /* 정확도 — 키워드가 어디에 걸렸는지로 점수를 준다 (태그 > 제목 > 부제) */
  function relScore(it, q) {
    if (!q) return 0;
    let n = 0;
    if ((it.hashtags || []).indexOf(q) >= 0) n += 4;
    const t = String(it.title);
    if (t.indexOf(q) >= 0) n += 2;
    if (t.indexOf(q) === 0 || t.indexOf('[eBook] ' + q) === 0) n += 1;
    if (String(it.subTitle || '').indexOf(q) >= 0) n += 1;
    return n;
  }

  const bySortOrder = (a, b) => a.item.sortOrder - b.item.sortOrder;
  const SORTS = {
    /* 이 화면 고유 — 순위·점유율의 기준축이 된다 */
    qty:        { label: '판매량순', rank: true,  cmp: (a, b) => b.qty - a.qty || bySortOrder(a, b) },
    amount:     { label: '매출순',   rank: true,  cmp: (a, b) => b.amount - a.amount || bySortOrder(a, b) },
    /* YES24 상품검색과 동일한 8종 */
    POPULAR:    { label: '인기도순', cmp: bySortOrder },
    RELATION:   { label: '정확도순', cmp: (a, b) => relScore(b.item, S.query) - relScore(a.item, S.query) || bySortOrder(a, b) },
    RECENT:     { label: '신상품순', cmp: (a, b) => (a.item.publishDate < b.item.publishDate ? 1 : a.item.publishDate > b.item.publishDate ? -1 : 0) || bySortOrder(a, b) },
    /* 목업에는 등록일 필드가 없어 상품번호(채번 순서)를 대용한다 — 실 API는 REG_DTS 사용 */
    REG_DTS:    { label: '등록일순', cmp: (a, b) => num(b.item.itemId) - num(a.item.itemId) },
    PRICE_ASC:  { label: '최저가순', cmp: (a, b) => a.item.salePrice - b.item.salePrice || bySortOrder(a, b) },
    PRICE_DESC: { label: '최고가순', cmp: (a, b) => b.item.salePrice - a.item.salePrice || bySortOrder(a, b) },
    SCORE:      { label: '평점순',   cmp: (a, b) => b.item.starScore - a.item.starScore || bySortOrder(a, b) },
    REVIEW:     { label: '리뷰순',   cmp: (a, b) => b.item.reviewCount - a.item.reviewCount || bySortOrder(a, b) }
  };
  /* 순위·점유율의 기준축 — 판매 기준 정렬이면 그 축, 상품 기준 정렬이면 판매량 */
  const rankKey = () => (S.sort === 'amount' ? 'amount' : 'qty');

  /* ===================== 상태 ===================== */
  const S = {
    query: '',
    items: [],
    judged: {},        // itemId -> {verdict, confidence, reason}
    judgedQuery: '',   // 판별이 끝난 키워드 (검색이 바뀌면 판별 결과를 버린다)
    judging: false,
    judgeCached: false,
    hideIrrel: false,  // 무관 판정 상품 숨기기 (표시 옵션일 뿐, 엑셀 범위는 모드가 정한다)
    sort: 'qty',
    from: TODAY.slice(0, 4) + '-01-01',
    to: TODAY,
    groups: [],        // 선택한 상품군 (국내도서 / eBook …)
    cats: [],          // 선택한 분야(대분류)
    tags: [],          // 선택한 상품태그
    refine: '',        // 결과 내 재검색어
    page: 1,
    pageSize: 20,
    view: null         // 마지막 집계 결과
  };

  const hasJudge = () => S.judgedQuery === S.query && Object.keys(S.judged).length > 0;
  const verdictOf = id => (S.judged[id] ? S.judged[id].verdict : 'relevant');
  const isIrrel = id => hasJudge() && verdictOf(id) === 'excluded';

  /* ===================== 집계 ===================== */

  /* 비교 구간 — 1년 이하면 전년 동기, 그보다 길면 직전 동일 길이 기간.
     화면 표에서는 뺐지만 엑셀에는 남는다 (기사에 쓰이는 숫자라 파일에는 있어야 한다). */
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

  /* 상세 조건은 AI 판별보다 **앞에** 적용된다.
     오탐은 분야로 뭉치므로(인공관절=의학, 인공위성=공학, 인공 낙원=소설)
     분야를 먼저 좁히면 판별·검수 대상이 통째로 줄어든다. */
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
    const cmp = comparePeriod();
    const cur = KS_MOCK.stats(S.items, S.from, S.to);
    const base = KS_MOCK.stats(S.items, cmp.from, cmp.to);

    const mk = it => ({
      item: it,
      qty: cur[it.itemId].qty,
      amount: cur[it.itemId].amount,
      baseQty: base[it.itemId].qty,
      baseAmount: base[it.itemId].amount,
      /* 비교 구간 판매량이 0이면 비율이 성립하지 않으므로 '신규'로 구분한다 */
      growth: base[it.itemId].qty ? (cur[it.itemId].qty - base[it.itemId].qty) / base[it.itemId].qty : null
    });

    /* 상세 조건을 통과한 전건을 현재 정렬로 세워 번호를 매긴다.
       '무관 숨기기'는 표시 옵션일 뿐이라 번호에는 영향을 주지 않는다. */
    const allRows = scoped.map(mk).sort(SORTS[S.sort].cmp);
    allRows.forEach((r, i) => { r.rank = i + 1; });

    const rows = S.hideIrrel && hasJudge()
      ? allRows.filter(r => !isIrrel(r.item.itemId)) : allRows;

    const irrel = hasJudge() ? scoped.filter(it => isIrrel(it.itemId)).length : 0;
    const low = hasJudge() ? scoped.filter(it => !isIrrel(it.itemId) &&
      S.judged[it.itemId] && S.judged[it.itemId].confidence < 0.7).length : 0;

    S.view = { allRows, rows, scoped, cur, base, cmp, irrel, low, span: diffDays(S.from, S.to) + 1 };
    return S.view;
  }

  /* 점유율은 "이 파일에 담긴 상품 안에서의 비중"이다 — 내보내는 집합을 모수로 계산한다.
     정렬축과 반드시 함께 움직여야 한다. 판매량으로 순위를 매기면서 매출 점유율을
     보여주면 1위의 점유율이 2위보다 낮게 나온다. */
  function withShare(list) {
    const k = rankKey();
    const total = list.reduce((a, r) => a + r[k], 0);
    return list.map((r, i) => Object.assign({}, r, {
      exportRank: i + 1,
      share: total ? r[k] / total : 0
    }));
  }

  /* ===================== 렌더 ===================== */
  function render() {
    if (!S.items.length) return;
    const v = compute();
    renderFacets();
    renderResultHead(v);
    renderAiResult(v);
    renderTable(v);
    $('#resultArea').classList.remove('hidden');
  }

  function renderResultHead(v) {
    $('#resCount').textContent = nf(v.rows.length) + '종';
    const p = ['검색 ' + nf(S.items.length) + '종'];
    if (hasFilter()) p.push('상세 조건 적용 ' + nf(v.scoped.length) + '종');
    if (hasJudge() && S.hideIrrel && v.irrel) p.push('무관 ' + nf(v.irrel) + '종 숨김');
    p.push('기간 ' + S.from + ' ~ ' + S.to);
    $('#resDesc').textContent = p.join(' · ');
    $('#thRank').textContent = SORTS[S.sort].rank ? '순위' : '번호';
    $('#thRel').classList.toggle('hidden', !hasJudge());
  }

  function renderAiResult(v) {
    const box = $('#aiResult');
    if (S.judging) {
      box.classList.remove('hidden');
      $('#aiSummary').innerHTML =
        '<span class="ks-judging"><span class="spin"></span>검색어 &ldquo;' + esc(S.query) + '&rdquo;와의 관련성을 판별하는 중… ' +
        '<b>' + nf(v.scoped.length) + '종</b></span>';
      $('#aiMeta').textContent = 'batch 1 request';
      return;
    }
    if (!hasJudge()) { box.classList.add('hidden'); return; }

    box.classList.remove('hidden');
    const rel = v.scoped.length - v.irrel;
    $('#aiSummary').innerHTML =
      '검수 대상 <b>' + nf(v.scoped.length) + '종</b> 중 ' +
      '<b class="ok">관련 ' + nf(rel) + '종</b> · <b class="no">무관 ' + nf(v.irrel) + '종</b>' +
      (v.low ? ' · <span class="badge badge-warning">검토 필요 ' + nf(v.low) + '종</span>' : '') +
      ' &nbsp;<span class="ks-ai-note">엑셀에는 무관 ' + nf(v.irrel) + '종이 빠집니다</span>';
    $('#aiMeta').textContent = S.judgeCached ? 'cache hit · 0ms' : 'batch 1 request';
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
        '<input type="checkbox" data-kind="' + kind + '" value="' + esc(val) + '"' +
          (sel.indexOf(val) >= 0 ? ' checked' : '') + ' />' +
        '<span class="ks-facet-name">' + esc(name) + '</span>' +
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

  /* 판별을 돌렸어도 체크를 끄고 내려받으면 파일에는 반영하지 않는다.
     그래서 화면 문구(hasJudge)와 파일 문구(useAi)를 인자로 갈라 쓴다. */
  const judgeDesc = (v, on) => !on
    ? '미적용 — 검색 결과 전건'
    : '적용 (관련 ' + (v.scoped.length - v.irrel) + '종 / 무관 ' + v.irrel + '종' +
      (v.low ? ', 검토 필요 ' + v.low + '종' : '') + ')';

  /* 엑셀 '산출 조건' 시트용 — 조건을 항목·내용 표로 편다.
     화면에는 더 이상 두지 않는다. 조회 중에는 좌측 조건·상단 요약을 보면 되고,
     이 기록이 필요한 시점은 파일이 외부로 나간 뒤이기 때문이다. */
  function snapshotRows(v, exported, useAi) {
    return [
      ['키워드', S.query],
      ['조회 기간', S.from + ' ~ ' + S.to],
      ['대상', groupDesc()],
      ['검색 결과', S.items.length + '종'],
      ['상세 조건', filterDesc()],
      ['상세 조건 적용 후', v.scoped.length + '종'],
      ['AI 관련성 판별', judgeDesc(v, useAi)],
      ['파일에 담긴 상품', exported + '종'],
      ['상품 정렬', SORTS[S.sort].label],
      ['매출 기준', '판매량 × 판매가 (부가 할인·쿠폰 미반영)'],
      ['비교 구간', v.cmp.from + ' ~ ' + v.cmp.to + ' (' + v.cmp.label + ')'],
      ['내보내기 범위', '대외 제공용 — 무관 판정 상품 제외, 사내 정보 미포함'],
      ['추출 일시', new Date().toLocaleString('ko-KR')]
    ];
  }

  /* 검색 키워드와 일치하는 태그는 강조 — 이 상품이 왜 검색에 걸렸는지 바로 보인다 */
  function tagsHtml(tags) {
    if (!tags || !tags.length) return '<span class="ks-no-tag">태그 없음</span>';
    return '<div class="ks-tags">' + tags.map(t =>
      '<span class="ks-tag' + (t === S.query ? ' match' : '') + '">' + esc(t) + '</span>').join('') + '</div>';
  }

  function relCell(id) {
    const j = S.judged[id];
    if (!j) return '<td class="ks-c-center ks-col-rel"><span class="ks-rel none">—</span></td>';
    const bad = j.verdict === 'excluded';
    const low = !bad && j.confidence < 0.7;
    return '<td class="ks-c-center ks-col-rel" title="' + esc(j.reason || '') + '">' +
      '<span class="ks-rel ' + (bad ? 'no' : 'ok') + '">' + (bad ? '무관' : '관련') + '</span>' +
      (low ? '<span class="ks-rel-low">검토 필요</span>' : '') +
      '<span class="ks-rel-conf">' + (j.confidence != null ? j.confidence.toFixed(2) : '—') + '</span>' +
    '</td>';
  }

  function rowHtml(r) {
    const it = r.item;
    const bad = isIrrel(it.itemId);
    const j = S.judged[it.itemId] || {};
    return '<tr data-id="' + it.itemId + '"' + (bad ? ' class="ks-irrel"' : '') + '>' +
      '<td class="ks-rank ks-c-center ks-col-no ' + (r.rank === 1 ? 'ks-rank-1' : '') + '">' + r.rank + '</td>' +
      '<td class="ks-col-id"><a class="ks-idlink mono" href="' + it.link + '" target="_blank" rel="noopener">' + it.itemId + '</a></td>' +
      /* 부제는 별도 열이 아니라 도서명 아래에 붙인다 — 열을 하나 줄여야 표가
         노트북 폭(1280)에서도 가로 스크롤 없이 들어온다. 엑셀에는 별도 열로 나간다. */
      '<td class="ks-col-title">' +
        '<div class="ks-title">' + esc(it.title) + '</div>' +
        (it.subTitle ? '<div class="ks-subtitle">' + esc(it.subTitle) + '</div>' : '') +
        '<div class="ks-sub">' + esc(it.author) + ' · ' + esc(it.publisher) + '</div>' +
        (bad && j.reason ? '<div class="ks-reason">' + esc(j.reason) + '</div>' : '') +
      '</td>' +
      '<td class="ks-col-tags">' + tagsHtml(it.hashtags) + '</td>' +
      '<td class="ks-num ks-col-date">' + it.publishDate + '</td>' +
      '<td class="ks-num ks-c-right ks-col-price">' + nf(it.salePrice) + '</td>' +
      '<td class="ks-num ks-c-right ks-col-qty"><b>' + nf(r.qty) + '</b></td>' +
      '<td class="ks-num ks-c-right ks-col-amt">' + nf(r.amount) + '</td>' +
      (hasJudge() ? relCell(it.itemId) : '') +
    '</tr>';
  }

  function renderTable(v) {
    const all = v.rows;
    $$('.ks-th-sort').forEach(th => th.classList.toggle('on', th.dataset.sort === S.sort));

    /* 페이징은 표시 단위일 뿐 — 순위·점유율은 이미 전체 집합으로 계산돼 있다 */
    const pages = Math.max(1, Math.ceil(all.length / S.pageSize));
    if (S.page > pages) S.page = pages;
    const start = (S.page - 1) * S.pageSize;
    const rows = all.slice(start, start + S.pageSize);
    const cols = hasJudge() ? 9 : 8;

    $('#tbody').innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : '<tr><td colspan="' + cols + '" class="ks-empty-row">조건에 맞는 상품이 없습니다.</td></tr>';

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

  /* 내보내는 파일은 대외 제공용 한 종류다. 사내 정보(전시분류·판매상태·AI 판정 과정·
     공급률)는 넣지 않고, 무관 판정 상품도 뺀다 — 어떤 책을 왜 뺐는지는 우리 내부
     판단이라 외부로 나가면 안 된다. 판정 근거는 화면 `관련성` 열에서 확인한다. */
  const XLSX_COLS = {
    common: [
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
    ]
  };

  function exportXlsx() {
    const v = S.view;
    /* 체크를 끈 채 내려받으면 판별 결과가 있어도 파일에는 반영하지 않는다 —
       가이드에 "해제하면 검색 결과 전건이 그대로"라고 적어 둔 그대로 동작해야 한다. */
    const useAi = $('#aiJudge').checked && hasJudge();
    const shareLabel = (rankKey() === 'amount' ? '매출' : '판매량') + ' 점유율(%)';
    const rankLabel = SORTS[S.sort].rank ? '순위' : '번호';

    /* 무관 판정 상품을 뺀다. 판별을 돌리지 않았으면 뺄 근거가 없으므로 전건. */
    const src = withShare(
      useAi ? v.allRows.filter(r => !isIrrel(r.item.itemId)) : v.allRows
    );

    /* 빈 파일이 나가는 걸 막는다 — 조건이 과하게 좁거나 전부 무관으로 판정된 경우다 */
    if (!src.length) {
      toast('내보낼 상품이 없습니다. 상세 조건이나 AI 판별 결과를 확인하세요.');
      return;
    }

    const cmpCols = [
      [v.cmp.label + ' 판매량', 14, r => r.baseQty],
      ['증감률(%)', 10, r => r.growth === null ? '신규' : Number((r.growth * 100).toFixed(1))],
      [shareLabel, 12, r => Number((r.share * 100).toFixed(2))]
    ];

    const defs = [[rankLabel, 6, r => r.exportRank]].concat(XLSX_COLS.common, cmpCols);

    /* 시트를 나눈다 — 상품별 집계는 목록만 두고, 산출 조건은 별도 시트에.
       주석이 표 위에 섞여 있으면 정렬·필터·복사를 할 때마다 걸린다. */
    downloadXlsx('키워드판매_' + fileTag() + '.xlsx', [
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
        rows: snapshotRows(v, src.length, useAi)
      }
    ]);

    toast('대외 제공용 ' + src.length + '종을 내려받았습니다.' +
      (useAi && v.irrel ? ' (무관 ' + v.irrel + '종 제외)' : ''));
  }

  /* 다운로드 — 체크박스가 켜져 있으면 판별을 먼저 끝내고 파일을 만든다.
     이미 판별한 뒤 상세 조건을 넓혀 새 상품이 들어왔다면 그 상품만 추가로 판별한다.
     판별되지 않은 상품은 기본값이 '관련'이라, 그냥 두면 검수 없이 대외 파일에 실린다. */
  function handleDownload() {
    if (!S.view) return;
    const pending = $('#aiJudge').checked
      ? S.view.scoped.filter(it => !S.judged[it.itemId]) : [];
    if (!pending.length) { exportXlsx(); return; }

    const btn = $('#btnXlsx');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> 관련성 판별 중…';
    S.judging = true;
    S.judgedQuery = S.query;
    render();

    KS_MOCK.judge(S.query, pending)
      .then(res => {
        res.rows.forEach(r => { if (r) S.judged[r.itemId] = r; });
        S.judgeCached = res.cached;
      })
      .catch(err => {
        console.error('AI 관련성 판별 실패', err);
        if (!Object.keys(S.judged).length) S.judgedQuery = '';
        toast('관련성 판별에 실패해 검색 결과 전건으로 내보냅니다.');
      })
      .then(() => {
        S.judging = false;
        btn.disabled = false;
        btn.innerHTML = label;
        S.page = 1;
        render();
        exportXlsx();
      });
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
    $('#aiKw').textContent = query;
    $('#errBox').classList.add('hidden');
    $('#resultArea').classList.add('hidden');
    $('#skeleton').classList.remove('hidden');

    /* 검색이 바뀌면 이전 판별 결과는 버린다 — 키워드가 다르면 판정도 다르다 */
    S.judged = {}; S.judgedQuery = ''; S.judging = false;
    S.hideIrrel = false;
    $('#hideIrrel').checked = false;
    S.page = 1;
    S.groups = []; S.cats = []; S.tags = []; S.refine = '';
    $('#refine').value = '';

    KS_MOCK.search(query, {})
      .then(res => {
        S.items = res.data.data.items;
        $('#skeleton').classList.add('hidden');
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

    $('#dFrom').addEventListener('change', e => { S.from = e.target.value; S.page = 1; render(); });
    $('#dTo').addEventListener('change', e => { S.to = e.target.value; S.page = 1; render(); });

    $('#quick').addEventListener('click', e => {
      const b = e.target.closest('[data-preset]');
      if (!b) return;
      const p = b.dataset.preset;
      S.to = TODAY;
      S.from = p === 'ytd' ? TODAY.slice(0, 4) + '-01-01' : shiftYear(TODAY, -Number(p.replace('y', '')));
      $('#dFrom').value = S.from;
      $('#dTo').value = S.to;
      $$('#quick .chip').forEach(c => c.classList.toggle('on', c === b));
      S.page = 1;
      render();
    });

    const setSort = key => {
      if (!SORTS[key]) return;
      S.sort = key;
      $('#sortSel').value = key;
      S.page = 1;
      render();
    };
    $('#sortSel').addEventListener('change', e => setSort(e.target.value));
    $$('.ks-th-sort').forEach(th => th.addEventListener('click', () => setSort(th.dataset.sort)));

    $('#hideIrrel').addEventListener('change', e => {
      S.hideIrrel = e.target.checked;
      S.page = 1;
      render();
    });

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

    $('#btnXlsx').addEventListener('click', handleDownload);

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
    $('#sortSel').value = S.sort;
    /* 목업 키워드 안내는 데이터에서 만든다 — 키워드를 늘려도 문구가 어긋나지 않는다 */
    $('#errHint').innerHTML = '목업 키워드는 <b>' + KEYWORDS.join(' · ') + '</b> ' +
      KEYWORDS.length + '종입니다. 키워드를 바꿔 다시 검색해 보세요.';
    $('#quick .chip[data-preset="ytd"]').classList.add('on');   // 기본 기간이 '올해'다
    bind();
    doSearch('필사');   // 오탐 시연 키워드로 시작
  });

  window.KS_MOCK = KS_MOCK;   // 콘솔에서 응답 형태를 확인할 수 있게 노출
})();
