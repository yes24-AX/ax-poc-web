/* =========================================================
   eBook 이벤트 데일리 성과 리포트 — POC
   샘플 데이터로 선정 로직(백분위 → 하위 30% → TOP 5)을 실제로 계산한다.
   기준일(전일) = 2026-09-17
   ========================================================= */

const BASE_DATE = '2026-09-17';

/* ---------------------------------------------------------
   샘플 데이터
   rev/ord/uv/nb : 전일 실적
   aRev/aOrd/aUv/aNb : 비교 기준 기간의 일평균 (운영 7일 이상 = 최근 7일,
                        3~6일 = 시작일~전일). aRev 0 = 비교 데이터 없음(오픈 당일)
   --------------------------------------------------------- */
const EVENTS = [
  { id: 'EV24091', n: '9월 로맨스 신작 릴레이',      f: '로맨스',        md: '이지은', s: '2026-09-01', rev: 11450000, ord: 1880, uv: 28600, nb: 402, aRev: 8900000, aOrd: 1520, aUv: 25400, aNb: 355 },
  { id: 'EV24102', n: '전자책 단독 선출간 기획전',    f: '소설',          md: '박서준', s: '2026-09-05', rev:  8640000, ord: 1120, uv: 19800, nb: 265, aRev: 7950000, aOrd: 1060, aUv: 18900, aNb: 240 },
  { id: 'EV23887', n: '가을 에세이 북페어',           f: '에세이',        md: '김하늘', s: '2026-08-28', rev:  2140000, ord:  420, uv: 11300, nb:  88, aRev: 2380000, aOrd:  455, aUv: 11900, aNb:  96 },
  { id: 'EV24140', n: '경제경영 베스트 반값',         f: '경제경영',      md: '최우식', s: '2026-09-10', rev:  3860000, ord:  640, uv: 14200, nb: 141, aRev: 3420000, aOrd:  580, aUv: 13100, aNb: 128 },
  { id: 'EV24118', n: '자기계발 루틴 챌린지',         f: '자기계발',      md: '김하늘', s: '2026-09-08', rev:  1720000, ord:  310, uv: 12800, nb:  74, aRev: 1880000, aOrd:  336, aUv: 13400, aNb:  82 },
  { id: 'EV23801', n: '판타지 완결작 정주행',         f: '판타지',        md: '정유미', s: '2026-08-20', rev:  4520000, ord:  980, uv: 16700, nb: 112, aRev: 4180000, aOrd:  900, aUv: 15900, aNb: 105 },
  { id: 'EV24177', n: '라이트노벨 신간 3종 세트',     f: '만화/라노벨',   md: '정유미', s: '2026-09-14', rev:  6240000, ord: 1640, uv: 22900, nb: 198, aRev: 5700000, aOrd: 1490, aUv: 21600, aNb: 186 },
  { id: 'EV24156', n: 'IT 개발서 30% 쿠폰',           f: 'IT',            md: '최우식', s: '2026-09-12', rev:  2560000, ord:  330, uv:  6400, nb:  58, aRev: 2310000, aOrd:  298, aUv:  6050, aNb:  54 },
  { id: 'EV24095', n: '인문 고전 다시 읽기',          f: '인문',          md: '박서준', s: '2026-09-02', rev:   690000, ord:   95, uv:  8900, nb:  18, aRev:  820000, aOrd:  112, aUv:  9400, aNb:  22 },
  { id: 'EV23412', n: '어린이 전자책 여름방학',       f: '어린이/청소년', md: '이지은', s: '2026-07-25', rev:   180000, ord:   42, uv:  3900, nb:   9, aRev:  240000, aOrd:   55, aUv:  4600, aNb:  12 },
  { id: 'EV24182', n: '크레마클럽 신규 가입 이벤트',  f: '종합',          md: '김하늘', s: '2026-09-15', rev:  9720000, ord: 1510, uv: 33400, nb: 890, aRev: 6400000, aOrd: 1020, aUv: 24800, aNb: 612 },
  { id: 'EV24190', n: '추석 연휴 몰아보기 팩',        f: '종합',          md: '최우식', s: '2026-09-16', rev: 14820000, ord: 2140, uv: 41200, nb: 612, aRev: 9800000, aOrd: 1430, aUv: 29600, aNb: 430 },
  { id: 'EV24108', n: '미스터리·스릴러 특별전',       f: '소설',          md: '박서준', s: '2026-09-06', rev:  1980000, ord:  366, uv:  9700, nb:  71, aRev: 2050000, aOrd:  380, aUv:  9900, aNb:  76 },
  { id: 'EV24149', n: '웹소설 원작 드라마 특집',      f: '로맨스',        md: '이지은', s: '2026-09-11', rev:  5120000, ord: 1180, uv: 19400, nb: 233, aRev: 2600000, aOrd:  610, aUv: 12800, aNb: 141 },
  { id: 'EV23902', n: '직장인 재테크 가이드',         f: '경제경영',      md: '최우식', s: '2026-08-30', rev:   980000, ord:  143, uv:  7600, nb:  26, aRev: 1120000, aOrd:  162, aUv:  8100, aNb:  31 },
  { id: 'EV24126', n: '과학 교양 큐레이션',           f: '인문',          md: '박서준', s: '2026-09-09', rev:   480000, ord:   66, uv:  5100, nb:  12, aRev:  610000, aOrd:   82, aUv:  5600, aNb:  16 },
  { id: 'EV24168', n: '힐링 그림에세이',              f: '에세이',        md: '김하늘', s: '2026-09-13', rev:  3260000, ord:  520, uv: 11900, nb:  96, aRev: 1480000, aOrd:  250, aUv:  7400, aNb:  52 },
  { id: 'EV23776', n: '무협 레전드 복간',             f: '판타지',        md: '정유미', s: '2026-08-18', rev:   330000, ord:   47, uv:  3100, nb:   5, aRev:  410000, aOrd:   58, aUv:  3500, aNb:   7 },
  { id: 'EV24099', n: '영어원서 입문 챌린지',         f: '외국어',        md: '최우식', s: '2026-09-03', rev:   210000, ord:   28, uv:  2400, nb:   6, aRev:  265000, aOrd:   34, aUv:  2700, aNb:   8 },
  { id: 'EV24113', n: '만화 단행본 100원 딜',         f: '만화/라노벨',   md: '정유미', s: '2026-09-07', rev:  7980000, ord: 3420, uv: 46700, nb: 520, aRev: 8600000, aOrd: 3680, aUv: 48200, aNb: 556 },
  { id: 'EV24101', n: '청소년 진로 필독서',           f: '어린이/청소년', md: '이지은', s: '2026-09-04', rev:   260000, ord:   33, uv:  4200, nb:   7, aRev:  310000, aOrd:   40, aUv:  4400, aNb:   9 },
  { id: 'EV23855', n: '심리학 스테디셀러',            f: '인문',          md: '박서준', s: '2026-08-26', rev:   420000, ord:   61, uv:  9800, nb:  11, aRev:  520000, aOrd:   72, aUv: 10400, aNb:  14 },
  { id: 'EV24185', n: '요리·살림 실용서전',           f: '실용',          md: '김하늘', s: '2026-09-15', rev:   620000, ord:   88, uv:  4900, nb:  19, aRev:  700000, aOrd:   96, aUv:  5200, aNb:  21 },
  { id: 'EV24193', n: 'SF 거장 컬렉션',               f: '판타지',        md: '정유미', s: '2026-09-16', rev:  4180000, ord:  690, uv: 13600, nb: 128, aRev: 1250000, aOrd:  215, aUv:  6300, aNb:  44 },
  { id: 'EV24201', n: '북토크 연계 신간전',           f: '소설',          md: '박서준', s: '2026-09-17', rev:  1340000, ord:  210, uv:  7200, nb:  48, aRev:       0, aOrd:    0, aUv:     0, aNb:   0 },
  { id: 'EV24202', n: '취업 자소서 완성',             f: '자기계발',      md: '김하늘', s: '2026-09-17', rev:   760000, ord:  118, uv:  5400, nb:  33, aRev:       0, aOrd:    0, aUv:     0, aNb:   0 },
  { id: 'EV23830', n: '여행 에세이 랜선여행',         f: '에세이',        md: '이지은', s: '2026-08-22', rev:   540000, ord:   78, uv: 12600, nb:  16, aRev:  680000, aOrd:   96, aUv: 13100, aNb:  21 },
  { id: 'EV24172', n: '재테크 유튜버 신작',           f: '경제경영',      md: '최우식', s: '2026-09-13', rev:  2980000, ord:  430, uv:  9200, nb:  78, aRev: 1900000, aOrd:  288, aUv:  7100, aNb:  56 },
  { id: 'EV24139', n: '고전문학 무료 체험',           f: '소설',          md: '박서준', s: '2026-09-10', rev:  1180000, ord:  260, uv: 10400, nb:  42, aRev: 1260000, aOrd:  274, aUv: 10800, aNb:  46 },
  { id: 'EV23891', n: '데이터 분석 입문서전',         f: 'IT',            md: '최우식', s: '2026-08-29', rev:  1620000, ord:  205, uv:  5300, nb:  35, aRev: 1540000, aOrd:  196, aUv:  5150, aNb:  33 }
];

/* ---------------------------------------------------------
   권장 액션 (요구사항 5. 개선 필요 사유 → 권장 액션)
   --------------------------------------------------------- */
const ACTION_MAP = {
  rev: {
    label: '매출 하위', short: '매출',
    steps: [
      'UV와 구매전환율을 우선 확인',
      'UV가 낮으면 유입 확대, 구매전환율이 낮으면 이벤트 기획 개선',
      '둘 다 낮으면 혜택·카피·상품 구성을 포함한 이벤트 전면 개편'
    ]
  },
  cvr: {
    label: '구매전환율 하위', short: '전환율',
    steps: [
      '혜택 경쟁력 점검 — 타 이벤트 대비 할인·적립이 충분한가',
      '헤드카피 → 상품 큐레이션 → CTA 순으로 개선',
      "유입은 있는데 구매가 없으면 '구매할 이유'가 명확한지부터 확인"
    ]
  },
  uv: {
    label: 'UV 하위', short: 'UV',
    steps: [
      '내부 핵심 구좌 노출 확대',
      'CRM / 푸시 발송 대상 추가',
      '배너·카피 교체 후 검색·SNS 등 외부 유입 확대'
    ]
  },
  nb: {
    label: '신규 구매 고객 하위', short: '신규고객',
    steps: [
      '첫 구매 전용 혜택 적용 여부 검토',
      '신규 고객에게 소구할 상품·카피 구성 강화',
      '검색 · SNS 등 신규 고객 유입 채널 확대'
    ]
  }
};

const METRICS = [
  { key: 'rev', label: '일평균 매출',   fmt: v => fmtWon(v) + '원' },
  { key: 'cvr', label: '구매전환율',    fmt: v => v.toFixed(2) + '%' },
  { key: 'uv',  label: 'UV',            fmt: v => fmtNum(Math.round(v)) },
  { key: 'nb',  label: '신규 구매 고객', fmt: v => fmtNum(Math.round(v)) + '명' }
];

const LOWER_PCT = 30;   // 하위 30%
const MIN_DAYS  = 3;    // 운영 3일 이상만 평가

/* 현재 조회 결과 — 드로어에서 이벤트를 id로 찾을 때 쓴다 */
const STATE = { baseDate: BASE_DATE, poolSize: 0, byId: {}, rank: { bad: {}, grow: {}, rev: {} } };

/* ---------------------------------------------------------
   유틸
   --------------------------------------------------------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function fmtNum(v) { return v.toLocaleString('ko-KR'); }
function fmtWon(v) { return Math.round(v).toLocaleString('ko-KR'); }
function fmtMoneyShort(v) {
  v = Math.round(v);
  if (v >= 100000000) {
    const eok = Math.floor(v / 100000000);
    const man = Math.round((v % 100000000) / 10000);
    return man ? `${eok}억 ${fmtNum(man)}만` : `${eok}억`;
  }
  if (v >= 10000) return fmtNum(Math.round(v / 10000)) + '만';
  return fmtNum(v);
}
function dayDiff(from, to) {
  return Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000);
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* 오름차순 백분위 — 값이 작을수록 0에 가깝다 */
function percentileMap(list, valueOf) {
  const sorted = [...list].sort((a, b) => valueOf(a) - valueOf(b));
  const n = sorted.length;
  const map = new Map();
  sorted.forEach((item, i) => {
    map.set(item.id, n <= 1 ? 50 : (i / (n - 1)) * 100);
  });
  return map;
}

/* ---------------------------------------------------------
   집계
   --------------------------------------------------------- */
function buildReport(baseDate, filterField, filterMd) {
  // 1) 집계 대상 — 진행 중 + (POC에서는 분야/담당자 필터가 비교 모집단이 된다)
  const running = EVENTS.filter(e =>
    (!filterField || e.f === filterField) && (!filterMd || e.md === filterMd)
  ).map(e => {
    const days = dayDiff(e.s, baseDate) + 1;              // 운영일차 D+n
    const cvr  = e.uv ? (e.ord / e.uv) * 100 : 0;         // 전일 구매전환율
    const aCvr = e.aUv ? (e.aOrd / e.aUv) * 100 : 0;      // 비교 기준 구매전환율
    const hasBase = e.aRev > 0;
    return {
      ...e, days, cvr, aCvr, hasBase,
      growth: hasBase ? ((e.rev - e.aRev) / e.aRev) * 100 : null
    };
  });

  // 2) 운영 3일 이상만 평가 대상
  const evaluable = running.filter(e => e.days >= MIN_DAYS && e.hasBase);
  const excluded  = running.filter(e => !(e.days >= MIN_DAYS && e.hasBase));

  // 3) 지표별 백분위 산출
  const pct = {
    rev: percentileMap(evaluable, e => e.aRev),
    cvr: percentileMap(evaluable, e => e.aCvr),
    uv:  percentileMap(evaluable, e => e.aUv),
    nb:  percentileMap(evaluable, e => e.aNb)
  };
  evaluable.forEach(e => {
    e.pct = { rev: pct.rev.get(e.id), cvr: pct.cvr.get(e.id), uv: pct.uv.get(e.id), nb: pct.nb.get(e.id) };
    e.low = Object.keys(e.pct).filter(k => e.pct[k] <= LOWER_PCT);
    e.lowScore = (e.pct.rev + e.pct.cvr + e.pct.uv + e.pct.nb) / 4;
  });

  // 4) 하위 30% 지표가 2개 이상 → 개선 필요, 부진 정도가 큰 순
  const badCandidates = evaluable
    .filter(e => e.low.length >= 2)
    .sort((a, b) => a.lowScore - b.lowScore);
  const badTop = badCandidates.slice(0, 5);

  // 5) 전일 성장 TOP 5 — 비교 데이터가 있고, 일평균 매출 하위 30%는 제외
  const growthPool = running.filter(e => e.hasBase);
  const growthRevPct = percentileMap(growthPool, e => e.aRev);
  const growTop = growthPool
    .filter(e => growthRevPct.get(e.id) > LOWER_PCT)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 5);

  // 6) 전일 매출 TOP 5
  const revTop = [...running].sort((a, b) => b.rev - a.rev).slice(0, 5);

  return { running, evaluable, excluded, badCandidates, badTop, growTop, revTop };
}

/* ---------------------------------------------------------
   렌더 — 공통 셀
   --------------------------------------------------------- */
function commonCells(e) {
  const growth = e.growth === null
    ? '<td class="num"><span class="delta flat"></span></td>'
    : `<td class="num"><span class="delta ${e.growth > 0.5 ? 'up' : e.growth < -0.5 ? 'down' : 'flat'}">${e.growth > 0 ? '+' : ''}${e.growth.toFixed(1)}%</span></td>`;
  return `
    <td class="nowrap">${esc(e.md)}</td>
    <td class="nowrap">${esc(e.f)}</td>
    <td>
      <div class="ev-name">
        <span class="txt" title="${esc(e.n)} — 클릭 시 이벤트 상세" data-ev="${esc(e.id)}">${esc(e.n)}</span>
        <a class="ev-link" href="#" title="이벤트 랜딩 바로가기 (${esc(e.id)})" aria-label="이벤트 랜딩 바로가기" data-link="1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
      <div class="ev-sub">${esc(e.id)} · 비교 일평균 ${e.hasBase ? fmtWon(e.aRev) + '원' : '비교 데이터 없음'}</div>
    </td>
    <td class="dday">D+${e.days}</td>
    <td class="num rev">${fmtWon(e.rev)}</td>
    <td class="num">${fmtNum(e.ord)}</td>
    <td class="num">${fmtNum(e.uv)}</td>
    <td class="num">${fmtNum(e.nb)}</td>
    <td class="num">${e.cvr.toFixed(2)}%</td>
    ${growth}`;
}

function rankCell(i) {
  return `<td><span class="rank-badge ${i === 0 ? 'r1' : ''}">${i + 1}</span></td>`;
}

/* ---------------------------------------------------------
   렌더 — 개선 필요 TOP 5
   --------------------------------------------------------- */
function renderBad(list) {
  const tb = $('#tbodyBad');
  const empty = $('#emptyBad');
  $('#badgeBad').textContent = list.length + '건';

  tb.closest('.tbl-wrap').classList.toggle('hidden', !list.length);
  if (!list.length) {
    tb.innerHTML = '';
    empty.innerHTML = emptyBox('개선이 필요한 이벤트가 없습니다', '선택한 조건에서 4개 지표 중 2개 이상이 하위 30%인 이벤트가 없습니다.');
    return;
  }
  empty.innerHTML = '';

  tb.innerHTML = list.map((e, i) => `
    <tr class="data-row" data-idx="${i}">
      ${rankCell(i)}
      ${commonCells(e)}
      <td>
        <div class="reasons">${e.low.map(k => `<span class="reason-chip" title="${ACTION_MAP[k].label}">${ACTION_MAP[k].short}</span>`).join('')}</div>
      </td>
      <td>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </td>
    </tr>
    <tr class="detail-row hidden" data-detail="${i}">
      <td colspan="13">${detailPanel(e)}</td>
    </tr>`).join('');

  tb.querySelectorAll('.data-row').forEach(tr => {
    tr.addEventListener('click', ev => {
      // 바로가기 링크·이벤트명(상세 드로어)은 행 펼침과 분리한다
      if (ev.target.closest('[data-link]')) { ev.preventDefault(); return; }
      if (ev.target.closest('[data-ev]')) return;
      const detail = tb.querySelector(`[data-detail="${tr.dataset.idx}"]`);
      const open = detail.classList.toggle('hidden');
      tr.classList.toggle('open', !open);
    });
  });
}

function detailPanel(e) {
  const bars = METRICS.map(m => {
    const p = e.pct[m.key];
    const isLow = p <= LOWER_PCT;
    const raw = m.key === 'rev' ? e.aRev : m.key === 'cvr' ? e.aCvr : m.key === 'uv' ? e.aUv : e.aNb;
    return `
      <div class="pct-row">
        <span class="k">${m.label}</span>
        <span class="raw">${m.fmt(raw)}</span>
        <span class="pct-track"><span class="pct-fill ${isLow ? 'low' : ''}" style="width:${Math.max(p, 3).toFixed(0)}%"></span></span>
        <span class="v ${isLow ? 'low' : ''}">하위 ${p.toFixed(0)}%</span>
      </div>`;
  }).join('');

  const actions = e.low.map(k => `
    <li>
      <div class="action-cause">${ACTION_MAP[k].label}</div>
      <ul class="action-steps">
        ${ACTION_MAP[k].steps.map((s, i) => `<li><span class="n">${i + 1}</span>${esc(s)}</li>`).join('')}
      </ul>
    </li>`).join('');

  return `
    <div class="detail-panel">
      <div class="detail-block">
        <h5>지표별 백분위 — 비교 기준 ${e.days >= 7 ? '최근 7일' : '시작일~전일'} 일평균</h5>
        ${bars}
        <div class="pct-legend">막대가 짧을수록 전체 진행 이벤트 대비 부진합니다. 붉은 막대가 하위 30% 해당 지표입니다.</div>
      </div>
      <div class="detail-block">
        <h5>권장 액션</h5>
        <ul class="action-list">${actions}</ul>
        <button type="button" class="detail-more" data-ev="${esc(e.id)}">
          이벤트 상세 보기 (추이 · 전체 지표)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>
    </div>`;
}

/* ---------------------------------------------------------
   렌더 — 성장 / 매출 TOP 5
   --------------------------------------------------------- */
function renderPlain(list, tbodyId, emptyId, badgeId, emptyTitle, emptyDesc) {
  const tb = $(tbodyId);
  $(badgeId).textContent = list.length + '건';
  tb.closest('.tbl-wrap').classList.toggle('hidden', !list.length);
  if (!list.length) {
    tb.innerHTML = '';
    $(emptyId).innerHTML = emptyBox(emptyTitle, emptyDesc);
    return;
  }
  $(emptyId).innerHTML = '';
  tb.innerHTML = list.map((e, i) => `<tr class="data-row">${rankCell(i)}${commonCells(e)}</tr>`).join('');
  tb.querySelectorAll('[data-link]').forEach(a => a.addEventListener('click', ev => ev.preventDefault()));
}

function emptyBox(title, desc) {
  return `
    <div class="empty in-card">
      <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <h2>${esc(title)}</h2>
      <p>${esc(desc)}</p>
    </div>`;
}

/* ---------------------------------------------------------
   렌더 — KPI · 퍼널 · 메타
   --------------------------------------------------------- */
function renderKpi(r) {
  const run = r.running;
  const totalRev = run.reduce((s, e) => s + e.rev, 0);
  const totalBase = run.reduce((s, e) => s + e.aRev, 0);
  const totalOrd = run.reduce((s, e) => s + e.ord, 0);
  const totalUv = run.reduce((s, e) => s + e.uv, 0);
  const diff = totalBase ? ((totalRev - totalBase) / totalBase) * 100 : 0;

  $('#kpiRunning').innerHTML = fmtNum(run.length) + '<span class="unit">건</span>';
  $('#kpiRunningSub').textContent = `평가 대상 ${r.evaluable.length}건 · 운영 1~2일 등 제외 ${r.excluded.length}건`;

  $('#kpiRev').innerHTML = fmtMoneyShort(totalRev) + '<span class="unit">원</span>';
  $('#kpiRevSub').textContent = `최근 일평균 합계 ${fmtMoneyShort(totalBase)}원 대비`;
  const d = $('#kpiRevDelta');
  d.className = 'delta ' + (diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat');
  d.textContent = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';

  const cvr = totalUv ? (totalOrd / totalUv) * 100 : 0;
  $('#kpiCvr').innerHTML = cvr.toFixed(2) + '<span class="unit">%</span>';
  $('#kpiCvrSub').textContent = `전일 주문 ${fmtNum(totalOrd)}건 ÷ UV ${fmtNum(totalUv)}`;

  $('#kpiBad').innerHTML = fmtNum(r.badCandidates.length) + '<span class="unit">건</span>';
  $('#kpiBadSub').textContent = `2개 이상 하위 30% · 부진 상위 ${r.badTop.length}건 노출`;
}

function renderFunnel(r) {
  const steps = [
    { k: '① 집계 대상 추출', v: r.running.length, d: '시작일 ≤ 전일 ≤ 종료일 · 상시(9999-12-31) 이벤트 제외' },
    { k: '② 운영 기간 확인', v: r.evaluable.length, d: `시작 후 3일 이상 경과 · 제외 ${r.excluded.length}건` },
    { k: '③ 지표별 백분위', v: 4, unit: '개 지표', d: '일평균 매출 · 구매전환율 · UV · 신규 구매 고객' },
    { k: '④ 하위 30% 판정', v: r.badCandidates.length, d: '4개 지표 중 2개 이상 하위 30%' },
    { k: '⑤ 최종 노출', v: r.badTop.length, d: '부진 정도가 큰 순 최대 5건', last: true }
  ];
  const arrow = `<div class="funnel-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></div>`;
  $('#funnel').innerHTML = steps.map(s => `
    <div class="funnel-step ${s.last ? 'last' : ''}">
      <div class="fs-k">${s.k}</div>
      <div class="fs-v">${fmtNum(s.v)}<span class="unit">${s.unit || '건'}</span></div>
      <div class="fs-d">${s.d}</div>
    </div>`).join(arrow);

  const ex = r.excluded;
  $('#excludedNote').innerHTML = ex.length
    ? `<b>평가 제외 ${ex.length}건</b> — ${ex.map(e => `${esc(e.n)}(D+${e.days})`).join(' · ')} : 운영 1~2일이거나 비교 가능한 과거 데이터가 없어 개선 필요 · 성장 평가에서 제외됩니다. 전일 매출 TOP 5에는 포함됩니다.`
    : '평가 제외 대상이 없습니다.';
}

/* ---------------------------------------------------------
   화면 갱신
   --------------------------------------------------------- */
function refresh() {
  const baseDate = $('#fBaseDate').value || BASE_DATE;
  const field = $('#fField').value;
  const md = $('#fMd').value;
  const r = buildReport(baseDate, field, md);

  renderKpi(r);
  renderFunnel(r);
  renderBad(r.badTop);
  renderPlain(r.growTop, '#tbodyGrow', '#emptyGrow', '#badgeGrow',
    '성장 TOP 대상 이벤트가 없습니다', '비교 가능한 과거 데이터가 있고 일평균 매출 하위 30%가 아닌 이벤트가 없습니다.');
  renderPlain(r.revTop, '#tbodyRev', '#emptyRev', '#badgeRev',
    '전일 매출이 집계된 이벤트가 없습니다', '선택한 조건에 해당하는 진행 중 이벤트가 없습니다.');

  const dt = new Date(baseDate + 'T00:00:00');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  const cond = [field || '전체 분야', md || '전체 담당자'].join(' · ');
  $('#pageSubtitle').textContent =
    `기준일 ${baseDate}(${dow}) 전일 실적 · 매일 1회 자동 집계 · ${cond} · 진행 중 이벤트 ${r.running.length}건`;
  $('#filterMeta').innerHTML =
    `<span class="badge badge-secondary">비교 모집단 ${r.evaluable.length}건</span> 백분위는 조회 조건 안의 이벤트끼리 상대 비교합니다.`;

  // 드로어가 참조할 상태 — 화면에 보이는 모든 이벤트를 id로 찾을 수 있게 둔다
  STATE.baseDate = baseDate;
  STATE.poolSize = r.evaluable.length;
  STATE.byId = {};
  r.running.forEach(e => { STATE.byId[e.id] = e; });
  STATE.rank = { bad: {}, grow: {}, rev: {} };
  r.badTop.forEach((e, i) => { STATE.rank.bad[e.id] = i + 1; });
  r.growTop.forEach((e, i) => { STATE.rank.grow[e.id] = i + 1; });
  r.revTop.forEach((e, i) => { STATE.rank.rev[e.id] = i + 1; });
}

/* ---------------------------------------------------------
   초기화
   --------------------------------------------------------- */
function initFilters() {
  const fields = [...new Set(EVENTS.map(e => e.f))].sort((a, b) => a.localeCompare(b, 'ko'));
  const mds = [...new Set(EVENTS.map(e => e.md))].sort((a, b) => a.localeCompare(b, 'ko'));
  $('#fField').insertAdjacentHTML('beforeend', fields.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  $('#fMd').insertAdjacentHTML('beforeend', mds.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join(''));
}

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  refresh();

  $('#btnSearch').addEventListener('click', refresh);
  $('#fField').addEventListener('change', refresh);
  $('#fMd').addEventListener('change', refresh);
  $('#fBaseDate').addEventListener('change', refresh);
  $('#btnReset').addEventListener('click', () => {
    $('#fBaseDate').value = BASE_DATE;
    $('#fField').value = '';
    $('#fMd').value = '';
    refresh();
  });

  // 선정 기준 안내 접기/펼치기
  const rule = $('#ruleCard');
  $('#ruleToggle').addEventListener('click', () => {
    const open = rule.classList.toggle('open');
    $('#ruleBadge').textContent = open ? '접기' : '펼치기';
  });

  // 이벤트 상세 드로어 — 이벤트명 / "이벤트 상세 보기" 버튼
  document.addEventListener('click', ev => {
    const trigger = ev.target.closest('[data-ev]');
    if (!trigger) return;
    ev.preventDefault();
    ev.stopPropagation();
    openDrawer(trigger.dataset.ev);
  });
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerCloseBtn').addEventListener('click', closeDrawer);
  $('#drawerBack').addEventListener('click', closeDrawer);
  $('#drawerLink').addEventListener('click', ev => ev.preventDefault());
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && $('#drawer').classList.contains('open')) closeDrawer();
  });

  // 다크모드 토글
  $('#themeToggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    $('#iconMoon').classList.toggle('hidden', dark);
    $('#iconSun').classList.toggle('hidden', !dark);
  });
});

/* =========================================================
   이벤트 상세 드로어
   TOP 5 어느 리스트에서든 이벤트명을 클릭하면 같은 패널이 열린다.
   (화면 이동 없음 — 닫으면 보던 자리 그대로)
   ========================================================= */

const DETAIL_DAYS = 14;   // 추이 차트 최대 일수

/* 이벤트별로 고정된 일자별 추이를 만든다 (id 해시 시드 → 새로고침해도 동일) */
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRandom(seed) {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dailySeries(e, baseDate) {
  const n = Math.min(e.days, DETAIL_DAYS);
  const rnd = seededRandom(hashSeed(e.id));
  const baseRev = e.hasBase ? e.aRev : e.rev;
  const baseOrd = e.hasBase ? e.aOrd : e.ord;
  const baseUv  = e.hasBase ? e.aUv  : e.uv;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = addDays(baseDate, -i);
    if (i === 0) {
      out.push({ day, rev: e.rev, ord: e.ord, uv: e.uv, cvr: e.cvr, last: true });
    } else {
      const f = 0.78 + rnd() * 0.44;
      const g = 0.85 + rnd() * 0.30;
      const uv = Math.max(Math.round(baseUv * g / 10) * 10, 10);
      const ord = Math.max(Math.round(baseOrd * f), 1);
      out.push({ day, rev: Math.round(baseRev * f / 1000) * 1000, ord, uv, cvr: (ord / uv) * 100 });
    }
  }
  return out;
}

/* ---------- SVG 차트 (색은 전부 CSS 클래스 → 다크모드 자동 대응) ---------- */
function barChart(series, valueOf, { w = 620, h = 132, avg = null, fmt }) {
  const pad = 20, top = 16;
  const vals = series.map(valueOf);
  const max = Math.max(...vals, avg || 0) * 1.18 || 1;
  const bw = (w - 6) / series.length;
  const y = v => h - pad - (v / max) * (h - pad - top);

  const bars = series.map((d, i) => {
    const v = valueOf(d);
    const bh = Math.max(h - pad - y(v), 1.5);
    return `<rect class="${d.last ? 'bar-cur' : 'bar-prev'}" x="${(3 + i * bw + bw * 0.16).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw * 0.68).toFixed(1)}" height="${bh.toFixed(1)}" rx="2"/>`;
  }).join('');

  // 일평균 라벨은 왼쪽, 전일 값 라벨은 마지막 막대 위 — 우측에서 겹치지 않게 분리한다
  const avgY = avg ? Math.max(y(avg), 12) : 0;
  const avgLine = avg
    ? `<line class="avg-line" x1="3" y1="${avgY.toFixed(1)}" x2="${w - 3}" y2="${avgY.toFixed(1)}"/>
       <text class="avg-label" x="3" y="${(avgY - 4).toFixed(1)}" text-anchor="start">일평균 ${fmt(avg)}</text>`
    : '';

  const last = series[series.length - 1];
  const lastX = Math.min(3 + (series.length - 1) * bw + bw * 0.5, w - 14);
  const lastY = Math.max(y(valueOf(last)) - 6, 11);
  const lastLabel = `<text class="chart-val line-primary" x="${lastX.toFixed(1)}" y="${lastY.toFixed(1)}" text-anchor="middle">${fmt(valueOf(last))}</text>`;

  const ticks = series.map((d, i) => {
    if (i !== 0 && i !== series.length - 1 && i !== Math.floor((series.length - 1) / 2)) return '';
    const anchor = i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle';
    const x = i === 0 ? 3 : i === series.length - 1 ? w - 3 : 3 + i * bw + bw * 0.5;
    return `<text class="chart-label" x="${x.toFixed(1)}" y="${h - 6}" text-anchor="${anchor}">${d.day.slice(5).replace('-', '/')}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${w} ${h}" role="img">
    <line class="chart-axis" x1="0" y1="${h - pad}" x2="${w}" y2="${h - pad}"/>
    ${bars}${avgLine}${lastLabel}${ticks}
  </svg>`;
}

function lineChart(series, valueOf, { w = 300, h = 118, fmt }) {
  const pad = 20, top = 18, left = 2;
  const vals = series.map(valueOf);
  const max = Math.max(...vals) * 1.2 || 1;
  const min = Math.min(...vals) * 0.8;
  const span = (max - min) || 1;
  const px = i => left + (i / Math.max(series.length - 1, 1)) * (w - left * 2);
  const py = v => h - pad - ((v - min) / span) * (h - pad - top);

  const pts = series.map((d, i) => `${px(i).toFixed(1)},${py(valueOf(d)).toFixed(1)}`).join(' ');
  const area = `${px(0).toFixed(1)},${h - pad} ${pts} ${px(series.length - 1).toFixed(1)},${h - pad}`;
  const lastI = series.length - 1;

  return `<svg viewBox="0 0 ${w} ${h}" role="img">
    <line class="chart-axis" x1="0" y1="${h - pad}" x2="${w}" y2="${h - pad}"/>
    <polygon class="chart-area line-primary" points="${area}"/>
    <polyline class="chart-line line-primary" points="${pts}"/>
    <circle class="chart-dot dot-fill line-primary" cx="${px(lastI).toFixed(1)}" cy="${py(valueOf(series[lastI])).toFixed(1)}" r="3.2"/>
    <text class="chart-val line-primary" x="${w - 2}" y="${Math.max(py(valueOf(series[lastI])) - 8, 10).toFixed(1)}" text-anchor="end">${fmt(valueOf(series[lastI]))}</text>
    <text class="chart-label" x="2" y="${h - 6}">${series[0].day.slice(5).replace('-', '/')}</text>
    <text class="chart-label" x="${w - 2}" y="${h - 6}" text-anchor="end">${series[lastI].day.slice(5).replace('-', '/')}</text>
  </svg>`;
}

/* ---------- 드로어 렌더 ---------- */
function deltaSpan(cur, base, fmt) {
  if (!base) return '<span class="delta flat">비교 없음</span>';
  const p = ((cur - base) / base) * 100;
  const cls = p > 0.5 ? 'up' : p < -0.5 ? 'down' : 'flat';
  return `<span class="delta ${cls}">${p > 0 ? '+' : ''}${p.toFixed(1)}%</span>`;
}

function openDrawer(id) {
  const e = STATE.byId[id];
  if (!e) return;
  const series = dailySeries(e, STATE.baseDate);

  $('#drawerTitle').textContent = e.n;
  $('#drawerId').textContent = `${e.id} · ${e.s} 시작 · 기준일 ${STATE.baseDate} (D+${e.days})`;
  $('#drawerLink').title = `이벤트 랜딩 바로가기 (${e.id})`;

  const ranks = [];
  if (STATE.rank.bad[id])  ranks.push(`<span class="badge badge-danger">개선 필요 ${STATE.rank.bad[id]}위</span>`);
  if (STATE.rank.grow[id]) ranks.push(`<span class="badge badge-success">전일 성장 ${STATE.rank.grow[id]}위</span>`);
  if (STATE.rank.rev[id])  ranks.push(`<span class="badge badge-primary">전일 매출 ${STATE.rank.rev[id]}위</span>`);
  $('#drawerPills').innerHTML = `
    <span class="pill">${esc(e.f)}</span>
    <span class="pill pill-md">담당 ${esc(e.md)}</span>
    <span class="pill">운영 D+${e.days}</span>
    ${ranks.join('')}`;

  /* 전일 지표 */
  const kpi = `
    <div class="kpi-strip">
      <div class="kpi-cell"><div class="k">전일 매출</div><div class="v">${fmtWon(e.rev)}<small>원</small></div><div class="d">${deltaSpan(e.rev, e.aRev)}</div></div>
      <div class="kpi-cell"><div class="k">주문건수</div><div class="v">${fmtNum(e.ord)}</div><div class="d">${deltaSpan(e.ord, e.aOrd)}</div></div>
      <div class="kpi-cell"><div class="k">UV</div><div class="v">${fmtNum(e.uv)}</div><div class="d">${deltaSpan(e.uv, e.aUv)}</div></div>
      <div class="kpi-cell"><div class="k">신규 구매</div><div class="v">${fmtNum(e.nb)}</div><div class="d">${deltaSpan(e.nb, e.aNb)}</div></div>
      <div class="kpi-cell"><div class="k">구매전환율</div><div class="v">${e.cvr.toFixed(2)}%</div><div class="d">${deltaSpan(e.cvr, e.aCvr)}</div></div>
    </div>`;

  /* 추이 */
  const charts = `
    <div class="chart-box">
      <div class="cb-head"><span class="cb-title">일별 매출</span><span class="cb-note">최근 ${series.length}일 · 진한 막대가 전일</span></div>
      ${barChart(series, d => d.rev, { avg: e.hasBase ? e.aRev : null, fmt: v => fmtMoneyShort(v) })}
    </div>
    <div class="chart-grid">
      <div class="chart-box">
        <div class="cb-head"><span class="cb-title">일별 UV</span></div>
        ${barChart(series, d => d.uv, { w: 300, h: 118, avg: e.hasBase ? e.aUv : null, fmt: v => fmtNum(Math.round(v)) })}
      </div>
      <div class="chart-box">
        <div class="cb-head"><span class="cb-title">일별 구매전환율</span></div>
        ${lineChart(series, d => d.cvr, { fmt: v => v.toFixed(2) + '%' })}
      </div>
    </div>`;

  /* 백분위 · 판정 */
  let judge, bars = '';
  if (!e.pct) {
    judge = `<div class="verdict neutral">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <span class="body"><b>평가 제외</b> — ${e.days < MIN_DAYS ? `운영 ${e.days}일차로 시작 후 3일이 지나지 않았습니다.` : '비교 가능한 과거 데이터가 없습니다.'} 지표가 안정된 뒤 개선 필요 · 성장 평가에 포함됩니다.</span>
    </div>`;
  } else {
    bars = METRICS.map(m => {
      const p = e.pct[m.key];
      const isLow = p <= LOWER_PCT;
      const raw = m.key === 'rev' ? e.aRev : m.key === 'cvr' ? e.aCvr : m.key === 'uv' ? e.aUv : e.aNb;
      return `<div class="pct-row">
        <span class="k">${m.label}</span>
        <span class="raw">${m.fmt(raw)}</span>
        <span class="pct-track"><span class="pct-fill ${isLow ? 'low' : ''}" style="width:${Math.max(p, 3).toFixed(0)}%"></span></span>
        <span class="v ${isLow ? 'low' : ''}">하위 ${p.toFixed(0)}%</span>
      </div>`;
    }).join('');

    if (e.low.length >= 2) {
      judge = `<div class="verdict bad">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span class="body"><b>개선 필요</b> — ${e.low.map(k => ACTION_MAP[k].label).join(' · ')} (4개 중 ${e.low.length}개 지표가 하위 30%)</span>
      </div>`;
    } else if (e.low.length === 1) {
      judge = `<div class="verdict neutral">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span class="body"><b>관찰 필요</b> — ${ACTION_MAP[e.low[0]].label} 1개만 하위 30%라 개선 필요로는 분류되지 않았습니다. 하나만 더 내려가면 대상이 됩니다.</span>
      </div>`;
    } else {
      const worst = METRICS.reduce((a, b) => (e.pct[a.key] <= e.pct[b.key] ? a : b));
      judge = `<div class="verdict good">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        <span class="body"><b>개선 필요 아님</b> — 하위 30%에 걸린 지표가 없습니다. 가장 낮은 지표는 ${worst.label}(하위 ${e.pct[worst.key].toFixed(0)}%)입니다.</span>
      </div>`;
    }
  }

  const actions = (e.pct && e.low.length)
    ? `<ul class="action-list">${e.low.map(k => `
        <li>
          <div class="action-cause">${ACTION_MAP[k].label}</div>
          <ul class="action-steps">${ACTION_MAP[k].steps.map((s, i) => `<li><span class="n">${i + 1}</span>${esc(s)}</li>`).join('')}</ul>
        </li>`).join('')}</ul>`
    : '';

  $('#drawerBody').innerHTML = `
    <div class="drawer-sec">
      <h4>전일 실적<span class="hint">비교 기준 ${e.hasBase ? (e.days >= 7 ? '최근 7일' : '시작일~전일') + ' 일평균 대비' : '없음'}</span></h4>
      ${kpi}
    </div>
    <div class="drawer-sec">
      <h4>일자별 추이</h4>
      ${charts}
    </div>
    <div class="drawer-sec">
      <h4>전체 진행 이벤트 중 위치<span class="hint">비교 모집단 ${STATE.poolSize}건</span></h4>
      ${bars}
      <div style="margin-top:${bars ? '12px' : '0'}">${judge}</div>
      ${actions}
    </div>`;

  $('#drawer').classList.add('open');
  $('#drawerBack').classList.add('open');
  document.body.style.overflow = 'hidden';
  $('#drawerClose').focus();
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawerBack').classList.remove('open');
  document.body.style.overflow = '';
}
