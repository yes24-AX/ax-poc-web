/* =========================================================
   eBook 단독 선출간 후보 추천 — POC 프로토타입 스크립트
   (샘플 데이터 기반. 실제 구현은 datahub 배치 + DB 연동)
   ========================================================= */

/* ---------- 추천 조건 정의 ---------- */
const REASONS = {
  R1: { no: '①', label: '초도 발주량 상위', cls: 'rsn-r1' },
  R2: { no: '②', label: '당일 발주량 급증', cls: 'rsn-r2' },
  R3: { no: '③', label: '최근 7일 판매 TOP 50', cls: 'rsn-r3' },
  R4: { no: '④', label: '예약판매', cls: 'rsn-r4' },
  R5: { no: '⑤', label: '주목할 신상품 TOP 120', cls: 'rsn-r5' },
  R6: { no: '⑥', label: '베스트셀러·셀럽 작가', cls: 'rsn-r6' }
};

const DROP_REASONS = ['판권 이슈(전자책 계약 불가)', '이미 타사 선출간', '출판사 정책상 불가', 'eBook 수요 낮음', '이미 eBook 계약 진행 중', '기타'];
const HOLD_REASONS = ['종이책 판매 추이 관망', '출판사 회신 대기', '경쟁사 동향 확인 필요', '분기 예산 소진', '기타'];

/* ---------- 오늘의 추천 후보 (샘플 12종) ---------- */
const CANDIDATES = [
  {
    no: '148203911', emoji: '📕', title: '내일의 나를 만드는 아침 30분', author: '정하윤', pub: '위즈덤하우스',
    cat: '자기계발', md: '김도현',
    reasons: [{ c: 'R1', v: '1,420부' }, { c: 'R5', v: '12위' }],
    metrics: { init: '1,420부', today: '310부', w7: '—', rank: '신상품 12위', state: '판매중', prev: '전작 최고 4.2만부' }
  },
  {
    no: '148199044', emoji: '📘', title: '흐린 날의 산책', author: '김보라', pub: '문학동네',
    cat: '소설', md: '이수진',
    reasons: [{ c: 'R3', v: '18위' }, { c: 'R6', v: '전작 12만부' }],
    metrics: { init: '860부', today: '240부', w7: '2,180부', rank: '판매 18위', state: '판매중', prev: '전작 최고 12.0만부' }
  },
  {
    no: '148214520', emoji: '📗', title: '요즘 부모의 문해력 수업', author: '최은영', pub: '길벗',
    cat: '가정/육아', md: '박서준',
    reasons: [{ c: 'R2', v: '520부' }],
    metrics: { init: '340부', today: '520부', w7: '910부', rank: '—', state: '판매중', prev: '전작 최고 1.8만부' }
  },
  {
    no: '148220117', emoji: '📙', title: '나의 첫 인공지능 수업', author: '한지훈', pub: '한빛미디어',
    cat: 'IT/컴퓨터', md: '김도현',
    reasons: [{ c: 'R1', v: '1,150부' }, { c: 'R3', v: '31위' }, { c: 'R5', v: '7위' }],
    metrics: { init: '1,150부', today: '180부', w7: '1,740부', rank: '판매 31위 · 신상품 7위', state: '판매중', prev: '전작 최고 3.1만부' }
  },
  {
    no: '148187765', emoji: '📓', title: '미술관 옆 심리학', author: '서지우', pub: '북라이프',
    cat: '인문', md: '이수진',
    reasons: [{ c: 'R4', v: '예약판매' }, { c: 'R6', v: '방송 출연' }],
    metrics: { init: '720부', today: '90부', w7: '—', rank: '—', state: '예약판매', prev: '전작 최고 6.5만부' }
  },
  {
    no: '148231008', emoji: '📔', title: '작은 가게의 큰 브랜딩', author: '오세훈', pub: '쌤앤파커스',
    cat: '경제경영', md: '박서준',
    reasons: [{ c: 'R5', v: '44위' }],
    metrics: { init: '480부', today: '120부', w7: '640부', rank: '신상품 44위', state: '판매중', prev: '전작 최고 0.9만부' }
  },
  {
    no: '148176392', emoji: '📕', title: '해 지는 쪽으로', author: '윤태경', pub: '창비',
    cat: '소설', md: '이수진',
    reasons: [{ c: 'R3', v: '9위' }, { c: 'R1', v: '2,050부' }, { c: 'R6', v: '문학상 수상' }],
    metrics: { init: '2,050부', today: '460부', w7: '3,920부', rank: '판매 9위', state: '판매중', prev: '전작 최고 22.0만부' }
  },
  {
    no: '148240571', emoji: '📘', title: '하루 10분 필사 명상', author: '류지원', pub: '수오서재',
    cat: '에세이', md: '김도현',
    reasons: [{ c: 'R2', v: '380부' }, { c: 'R5', v: '61위' }],
    metrics: { init: '260부', today: '380부', w7: '520부', rank: '신상품 61위', state: '판매중', prev: '전작 없음' }
  },
  {
    no: '148209833', emoji: '📗', title: '중학 수학 개념 뿌시기 2026', author: '강민석', pub: '동아출판',
    cat: '중고등참고서', md: '박서준',
    reasons: [{ c: 'R1', v: '3,400부' }],
    metrics: { init: '3,400부', today: '210부', w7: '1,120부', rank: '—', state: '판매중', prev: '시리즈 누적 15만부' }
  },
  {
    no: '148245100', emoji: '📙', title: '셀럽의 식탁', author: '정다인', pub: '레시피팩토리',
    cat: '요리', md: '김도현',
    reasons: [{ c: 'R4', v: '예약판매' }, { c: 'R6', v: '유튜브 82만' }],
    metrics: { init: '1,800부', today: '640부', w7: '—', rank: '—', state: '예약판매', prev: '전작 최고 8.4만부' }
  },
  {
    no: '148193277', emoji: '📓', title: '퇴근 후 30분 재테크', author: '남기훈', pub: 'page2',
    cat: '경제경영', md: '박서준',
    reasons: [{ c: 'R3', v: '42위' }],
    metrics: { init: '640부', today: '150부', w7: '1,380부', rank: '판매 42위', state: '판매중', prev: '전작 최고 2.7만부' }
  },
  {
    no: '148252644', emoji: '📔', title: '고양이는 언제나 옳다', author: '임소연', pub: 'arte',
    cat: '에세이', md: '이수진',
    reasons: [{ c: 'R5', v: '103위' }, { c: 'R2', v: '190부' }],
    metrics: { init: '300부', today: '190부', w7: '410부', rank: '신상품 103위', state: '판매중', prev: '전작 최고 1.2만부' }
  }
];

CANDIDATES.forEach(c => { c.status = null; c.note = null; });

/* ---------- 이력 샘플 생성 ---------- */
const HIST_BASE = [
  ['모래의 시간', '배수현', '민음사', '소설', ['R3', 'R6']],
  ['부의 알고리즘', '조성일', '다산북스', '경제경영', ['R1', 'R5']],
  ['초등 어휘력의 힘', '문가영', '비상교육', '유아/아동', ['R1']],
  ['비 오는 날의 서점', '김한결', '북폴리오', '소설', ['R5']],
  ['면역의 과학', '이재현', '사이언스북스', '과학', ['R3']],
  ['혼자 여행 교토', '박다솜', '트래블코드', '여행', ['R4']],
  ['일잘러의 문서 정리법', '신유진', '더퀘스트', '자기계발', ['R2', 'R5']],
  ['우리는 왜 잠드는가', '황정民'.replace('民', '민'), '알에이치코리아', '과학', ['R3', 'R6']],
  ['다시, 클래식', '정우성', '아트북스', '예술', ['R4']],
  ['엄마의 첫 영어', '서하늘', '길벗이지톡', '외국어', ['R1', 'R2']],
  ['조선의 뒷골목', '한도경', '푸른역사', '역사', ['R5']],
  ['마음의 근력', '유지호', '위즈덤하우스', '자기계발', ['R3', 'R5', 'R6']],
  ['식물과 함께 사는 법', '노유리', '한겨레출판', '취미', ['R4']],
  ['데이터로 보는 소비', '김태윤', '인플루엔셜', '경제경영', ['R1']],
  ['밤의 도서관', '최지안', '문학과지성사', '소설', ['R3']],
  ['수능 국어 독해의 정석', '오현우', '메가스터디', '중고등참고서', ['R1']],
  ['아이의 그림책 시간', '이수아', '창비', '가정/육아', ['R5']],
  ['백년의 레시피', '강예린', '북하우스', '요리', ['R6']],
  ['우주를 걷다', '정한별', '동아시아', '과학', ['R5', 'R2']],
  ['퇴사 없이 사이드잡', '권도윤', '리더스북', '경제경영', ['R2']],
  ['한 문장의 힘', '민서영', '유유', '인문', ['R3']],
  ['달리기의 계절', '윤재하', '북라이프', '건강', ['R4', 'R5']],
  ['처음 배우는 파이썬', '조민기', '한빛미디어', 'IT/컴퓨터', ['R1', 'R3']],
  ['그날의 온도', '서지훈', '은행나무', '소설', ['R6']]
];

const MDS = ['김도현', '이수진', '박서준'];
const HISTORY = [];
(function buildHistory() {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483647; return seed / 2147483647; };
  const base = new Date(2026, 7, 26); // 2026-08-26
  HIST_BASE.forEach((b, i) => {
    const d = new Date(base); d.setDate(d.getDate() - Math.floor(i * 2.6) - 1);
    const r = rnd();
    let status = 'drop', note = DROP_REASONS[Math.floor(rnd() * DROP_REASONS.length)];
    if (r > 0.72) { status = 'go'; note = ''; }
    else if (r > 0.52) { status = 'hold'; note = HOLD_REASONS[Math.floor(rnd() * HOLD_REASONS.length)]; }
    if (i % 9 === 4) { status = 'none'; note = ''; }
    const rev = new Date(d); rev.setDate(rev.getDate() + 1 + Math.floor(rnd() * 4));
    let deal = '—';
    if (status === 'go') { const g = rnd(); deal = g > 0.62 ? '성사' : (g > 0.28 ? '진행중' : '실패'); }
    HISTORY.push({
      date: fmt(d), no: String(148100000 + i * 3719), title: b[0], author: b[1], pub: b[2], cat: b[3],
      reasons: b[4], md: MDS[i % 3], status, note,
      review: status === 'none' ? '' : fmt(rev),
      deal,
      snap: {
        init: (300 + Math.floor(rnd() * 2600)).toLocaleString() + '부',
        today: (60 + Math.floor(rnd() * 500)) + '부',
        w7: (200 + Math.floor(rnd() * 3200)).toLocaleString() + '부'
      }
    });
  });
})();

function fmt(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* ---------- 조건별 성과 (리포트) ---------- */
const PERF = [
  { c: 'R1', rec: 84, go: 22, deal: 11 },
  { c: 'R2', rec: 46, go: 13, deal: 6 },
  { c: 'R3', rec: 50, go: 27, deal: 18 },
  { c: 'R4', rec: 62, go: 9, deal: 4 },
  { c: 'R5', rec: 97, go: 26, deal: 12 },
  { c: 'R6', rec: 38, go: 21, deal: 14 }
];

/* ---------- 추천 조건 가이드 (읽기 전용) ---------- */
const RULES = [
  { c: 'R1', name: '초도 발주량 상위', thres: '800부 이상', desc: '신간 초도 발주 수량이 기준 이상인 상품. 취소 수량은 차감하지 않고 발주 수량 원본을 기준으로 합니다.', src: '영업프로그램 > 발주/반출 > 발주현황조회' },
  { c: 'R2', name: '당일 발주량 급증', thres: '100부 이상', desc: '초도 발주 여부와 무관하게 당일 발주 수량이 기준 이상인 상품. 추가 발주로 판매 반응이 빠르게 나타나는 상품을 포착합니다.', src: '영업프로그램 > 발주/반출 > 발주현황조회' },
  { c: 'R3', name: '최근 7일 판매량 상위', thres: 'TOP 50', desc: '최근 7일 국내도서 판매량 상위 50위 상품. 신간 여부와 무관하게 적용합니다.', src: '판매 집계 테이블 (일별 판매량 7일 누계)' },
  { c: 'R4', name: '예약판매 상품', thres: '전체', desc: '판매상태가 예약판매인 상품 전체. 최초 예약판매 등록분과 재고 부족으로 전환된 분을 모두 포함합니다.', src: '상품 마스터 > 판매상태 코드' },
  { c: 'R5', name: '주목할 신상품 상위', thres: 'TOP 120', desc: '닷컴 주목할 신상품(국내도서) 판매량순 상위 120위 상품.', src: '닷컴 > 주목할 신상품 > 국내도서 > 판매량순' },
  { c: 'R6', name: '베스트셀러·셀럽 작가', thres: '전작 3만부', desc: '동일 저자의 이전 종이책 최고 판매량이 기준 이상인 신작, 또는 셀럽 저자 태그가 부여된 상품. 저자 식별은 저자코드 기준이며, 셀럽 태그는 별도 관리 목록을 사용합니다.', src: '저자별 판매 이력 + 셀럽 저자 관리 목록' }
];

/* =========================================================
   렌더링
   ========================================================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function reasonHtml(code, val) {
  const r = REASONS[code];
  return `<span class="rsn ${r.cls}">${r.no} ${r.label}${val ? `<span class="rv">${val}</span>` : ''}</span>`;
}

let filterStatus = 'all';

function renderCandidates() {
  const list = currentCandidates();

  $('#candList').innerHTML = list.map(c => {
    const st = c.status;
    const noteHtml = st
      ? `<div class="act-note"><b>${st === 'go' ? '섭외' : st === 'hold' ? '보류' : '제외'}</b>${c.note ? ' · ' + c.note : ''}<br />김도현 · 2026-08-27</div>`
      : `<div class="act-note">검토 대기 · 담당 <b>${c.md}</b></div>`;
    return `
    <article class="cand ${st ? 'done' : ''}" data-no="${c.no}">
      <div class="cand-cover">${c.emoji}</div>
      <div class="cand-body">
        <div class="cand-topline">
          <span class="goods-no">${c.no}</span>
          <span class="pill">${c.cat}</span>
          ${c.metrics.state === '예약판매' ? '<span class="status-badge status-low">예약판매</span>' : '<span class="status-badge status-selling">판매중</span>'}
        </div>
        <div class="cand-title">${c.title}</div>
        <div class="cand-sub">${c.author} · ${c.pub}</div>
        <div class="cand-reasons">${c.reasons.map(r => reasonHtml(r.c, r.v)).join('')}</div>
        <div class="cand-metrics">
          <span class="metric"><span class="mk">초도 발주</span><span class="mv">${c.metrics.init}</span></span>
          <span class="metric"><span class="mk">당일 발주</span><span class="mv">${c.metrics.today}</span></span>
          <span class="metric"><span class="mk">7일 판매</span><span class="mv">${c.metrics.w7}</span></span>
          <span class="metric"><span class="mk">순위</span><span class="mv">${c.metrics.rank}</span></span>
          <span class="metric"><span class="mk">작가 이력</span><span class="mv">${c.metrics.prev}</span></span>
        </div>
      </div>
      <div class="cand-act">
        <div class="act-row">
          <button class="act-btn ${st === 'go' ? 'on-go' : ''}" data-act="go">섭외</button>
          <button class="act-btn ${st === 'hold' ? 'on-hold' : ''}" data-act="hold">보류</button>
          <button class="act-btn ${st === 'drop' ? 'on-drop' : ''}" data-act="drop">제외</button>
        </div>
        ${noteHtml}
        <div class="act-links">
          <a href="#" onclick="return false">상품 상세</a>
          <a href="#" onclick="return false">발주 현황</a>
        </div>
      </div>
    </article>`;
  }).join('');

  $('#candList').classList.toggle('hidden', list.length === 0);
  $('#candEmpty').classList.toggle('hidden', list.length !== 0);
  updateKpi();
}

function updateKpi() {
  const total = CANDIDATES.length;
  const done = CANDIDATES.filter(c => c.status).length;
  const go = CANDIDATES.filter(c => c.status === 'go').length;
  const hold = CANDIDATES.filter(c => c.status === 'hold').length;
  const drop = CANDIDATES.filter(c => c.status === 'drop').length;
  $('#kpiTotal').innerHTML = total + '<span class="unit">종</span>';
  $('#kpiDone').innerHTML = done + '<span class="unit">종</span>';
  $('#kpiDoneBar').style.width = (total ? (done / total * 100) : 0) + '%';
  $('#kpiGo').innerHTML = go + '<span class="unit">종</span>';
  $('#fcAll').textContent = total;
  $('#fcTodo').textContent = total - done;
  $('#fcGo').textContent = go;
  $('#fcHold').textContent = hold;
  $('#fcDrop').textContent = drop;
}

/* ---------- 메일 ---------- */
function renderMail() {
  $('#mailRows').innerHTML = CANDIDATES.map(c => `
    <tr>
      <td class="mono">${c.no}</td>
      <td>
        <div class="td-title">${c.title}</div>
        <div class="td-sub">${c.author} · ${c.pub}</div>
      </td>
      <td><div class="reason-inline">${c.reasons.map(r => reasonHtml(r.c, '')).join('')}</div></td>
    </tr>`).join('');
  $('#mailCount').textContent = CANDIDATES.length;
  $('#mailSubject').textContent = `[eBook 선출간] 8/27(목) 단독 선출간 후보 ${CANDIDATES.length}종`;
}

/* ---------- 이력 ---------- */
const STATUS_BADGE = {
  go: '<span class="badge badge-success">섭외</span>',
  hold: '<span class="badge badge-warning">보류</span>',
  drop: '<span class="badge badge-danger">제외</span>',
  none: '<span class="no-badge">미검토</span>'
};
const DEAL_BADGE = {
  '성사': '<span class="badge badge-primary">선출간 성사</span>',
  '진행중': '<span class="badge badge-secondary">섭외 진행중</span>',
  '실패': '<span class="badge badge-secondary">섭외 실패</span>',
  '—': '<span style="color:var(--muted-foreground)">—</span>'
};

function renderHistory() {
  const q = $('#hSearch').value.trim();
  const st = $('#hStatus').value;
  const rs = $('#hReason').value;
  const rows = HISTORY.filter(h => {
    if (q && !(h.title.includes(q) || h.no.includes(q) || h.pub.includes(q) || h.author.includes(q))) return false;
    if (st && h.status !== st) return false;
    if (rs && !h.reasons.includes(rs)) return false;
    return true;
  });
  $('#hCount').textContent = rows.length + '건';
  $('#hRows').innerHTML = rows.map(h => `
    <tr>
      <td class="mono nowrap">${h.date}</td>
      <td class="mono nowrap">${h.no}</td>
      <td>
        <div class="td-title">${h.title}</div>
        <div class="td-sub">${h.author} · ${h.pub} · ${h.cat}</div>
      </td>
      <td><div class="reason-inline">${h.reasons.map(r => reasonHtml(r, '')).join('')}</div></td>
      <td class="mono nowrap">초도 ${h.snap.init} · 7일 ${h.snap.w7}</td>
      <td>${h.md}</td>
      <td>${STATUS_BADGE[h.status]}</td>
      <td><div style="font-size:12px">${h.note || '—'}</div><div class="td-sub mono">${h.review || ''}</div></td>
      <td>${DEAL_BADGE[h.deal]}</td>
    </tr>`).join('');
}

/* ---------- 리포트: 조건별 성과 ---------- */
function renderPerf() {
  const max = Math.max(...PERF.map(p => p.deal / p.rec));
  $('#perfRows').innerHTML = PERF.map(p => {
    const conv = (p.go / p.rec * 100);
    const hit = (p.deal / p.rec * 100);
    const grade = hit >= 25 ? '<span class="badge badge-success">유지·확대</span>'
      : hit >= 12 ? '<span class="badge badge-secondary">유지</span>'
        : '<span class="badge badge-danger">기준 재검토</span>';
    return `
    <tr>
      <td>${reasonHtml(p.c, '')}</td>
      <td class="num">${p.rec}</td>
      <td class="num">${p.go}</td>
      <td class="num">${conv.toFixed(1)}%</td>
      <td class="num">${p.deal}</td>
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          <div class="hitbar" style="flex:1"><i style="width:${(hit / max / 100 * 100).toFixed(1)}%"></i></div>
          <b class="mono" style="font-size:12px">${hit.toFixed(1)}%</b>
        </div>
      </td>
      <td>${grade}</td>
    </tr>`;
  }).join('');
}

/* ---------- 추천 조건 가이드 ---------- */
function renderGuide() {
  $('#guideRows').innerHTML = RULES.map(r => `
    <div class="guide-item">
      <div class="guide-item-top">
        <span class="guide-no">${REASONS[r.c].no}</span>
        <span class="guide-item-name">${r.name}</span>
        <span class="guide-thres">${r.thres}</span>
      </div>
      <div class="guide-item-desc">${r.desc}</div>
      <div class="guide-item-src">${r.src}</div>
    </div>`).join('');
}

/* =========================================================
   인터랙션
   ========================================================= */

/* 판단 입력 모달 */
let modalTarget = null, modalAct = null, modalPick = null;

function openModal(no, act) {
  const c = CANDIDATES.find(x => x.no === no);
  modalTarget = c; modalAct = act; modalPick = null;
  $('#modalTitle').textContent = act === 'drop' ? '제외 사유 입력' : '보류 사유 입력';
  $('#modalDesc').innerHTML = `<b>${c.title}</b> · ${c.author} · ${c.pub}`;
  const list = act === 'drop' ? DROP_REASONS : HOLD_REASONS;
  $('#reasonChips').innerHTML = list.map(r => `<button class="rchip" data-r="${r}">${r}</button>`).join('');
  $('#reasonMemo').value = '';
  $('#modalErr').classList.remove('show');
  $('#modalBack').classList.add('open');
}
function closeModal() { $('#modalBack').classList.remove('open'); modalTarget = null; }

$('#reasonChips').addEventListener('click', e => {
  const b = e.target.closest('.rchip'); if (!b) return;
  $$('#reasonChips .rchip').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); modalPick = b.dataset.r;
  $('#modalErr').classList.remove('show');
});
$('#modalCancel').addEventListener('click', closeModal);
$('#modalBack').addEventListener('click', e => { if (e.target.id === 'modalBack') closeModal(); });
$('#modalSave').addEventListener('click', () => {
  if (!modalPick) { $('#modalErr').classList.add('show'); return; }
  const memo = $('#reasonMemo').value.trim();
  modalTarget.status = modalAct;
  modalTarget.note = modalPick + (memo ? ` — ${memo}` : '');
  toast(`${modalAct === 'drop' ? '제외' : '보류'}로 저장했습니다.`);
  closeModal();
  renderCandidates();
});

/* 후보 카드 판단 버튼 */
$('#candList').addEventListener('click', e => {
  const btn = e.target.closest('.act-btn'); if (!btn) return;
  const no = e.target.closest('.cand').dataset.no;
  const act = btn.dataset.act;
  const c = CANDIDATES.find(x => x.no === no);
  if (c.status === act) { c.status = null; c.note = null; renderCandidates(); toast('판단을 취소했습니다.'); return; }
  if (act === 'go') { c.status = 'go'; c.note = null; renderCandidates(); toast('섭외 대상으로 저장했습니다.'); return; }
  openModal(no, act);
});

/* 필터 */
$('#filterSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('#filterSeg button').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); filterStatus = b.dataset.f; renderCandidates();
});
$('#filterReason').addEventListener('change', renderCandidates);
$('#filterMd').addEventListener('change', renderCandidates);
['#hSearch', '#hStatus', '#hReason', '#hPeriod'].forEach(s => {
  $(s).addEventListener('input', renderHistory);
  $(s).addEventListener('change', renderHistory);
});

/* 뷰 전환 */
const VIEW_META = {
  today: ['오늘의 추천 후보', '2026-08-27(목) 오전 10:00 자동 추출 · eBook 미등록 종이책 중 신규로 조건을 충족한 상품입니다.'],
  mail: ['일일 추천 메일', '영업일 오전 10시에 eBook팀으로 자동 발송되는 후보 메일의 실제 발송 형태입니다.'],
  history: ['추천·검토 이력', '추천 시점의 지표와 MD 판단을 함께 적재해, 추후 조건별 적중률 분석의 기반으로 활용합니다.'],
  report: ['추천 성과 리포트', '추천 → 섭외 → 선출간 성사까지의 전환을 조건별로 추적해 추출 기준을 고도화합니다.']
};
function switchView(v) {
  $$('.view').forEach(s => s.classList.remove('active'));
  $('#view-' + v).classList.add('active');
  $$('.nav-item-btn[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  $('#pageTitle').textContent = VIEW_META[v][0];
  $('#pageSubtitle').textContent = VIEW_META[v][1];
  $('#crumb').textContent = VIEW_META[v][0];
  window.scrollTo({ top: 0 });
}
$$('.nav-item-btn[data-view]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchView(a.dataset.view); });
});
$('#btnGoReview').addEventListener('click', () => switchView('today'));
$('#mailCta').addEventListener('click', e => { e.preventDefault(); switchView('today'); });
$('#btnTestMail').addEventListener('click', () => toast('테스트 메일을 발송했습니다. (프로토타입)'));
/* 엑셀 내려받기 */
const STATUS_TXT = { go: '섭외', hold: '보류', drop: '제외', none: '미검토' };
const reasonText = codes => codes.map(c => `${REASONS[c].no} ${REASONS[c].label}`).join(' / ');

function currentCandidates() {
  const fr = $('#filterReason').value, fm = $('#filterMd').value;
  return CANDIDATES.filter(c => {
    if (filterStatus === 'todo' && c.status) return false;
    if (['go', 'hold', 'drop'].includes(filterStatus) && c.status !== filterStatus) return false;
    if (fr && !c.reasons.some(r => r.c === fr)) return false;
    if (fm && c.md !== fm) return false;
    return true;
  });
}

$('#btnXlsx').addEventListener('click', () => {
  const rows = currentCandidates().map(c => [
    '2026-08-27', c.no, c.title, c.author, c.pub, c.cat,
    reasonText(c.reasons.map(r => r.c)),
    c.metrics.init, c.metrics.today, c.metrics.w7, c.metrics.rank, c.metrics.prev,
    c.md, c.status ? STATUS_TXT[c.status] : '미검토', c.note || ''
  ]);
  downloadXlsx('eBook_선출간_추천후보_20260827.xlsx', {
    name: '추천후보',
    cols: [11, 11, 34, 12, 14, 12, 40, 11, 11, 11, 22, 20, 9, 9, 36],
    header: ['추천일', '상품번호', '도서명', '저자', '출판사', '분야', '추천 사유',
      '초도 발주', '당일 발주', '7일 판매', '순위', '작가 이력',
      '담당 MD', 'MD 판단', '보류/제외 사유'],
    rows
  });
  toast(`추천 후보 ${rows.length}건을 엑셀로 내려받았습니다.`);
});

$('#btnXlsx2').addEventListener('click', () => {
  const q = $('#hSearch').value.trim(), st = $('#hStatus').value, rs = $('#hReason').value;
  const rows = HISTORY.filter(h => {
    if (q && !(h.title.includes(q) || h.no.includes(q) || h.pub.includes(q) || h.author.includes(q))) return false;
    if (st && h.status !== st) return false;
    if (rs && !h.reasons.includes(rs)) return false;
    return true;
  }).map(h => [
    h.date, h.no, h.title, h.author, h.pub, h.cat,
    reasonText(h.reasons),
    h.snap.init, h.snap.today, h.snap.w7,
    h.md, STATUS_TXT[h.status], h.note || '', h.review || '', h.deal === '—' ? '' : h.deal
  ]);
  downloadXlsx('eBook_선출간_추천이력_20260827.xlsx', {
    name: '추천·검토 이력',
    cols: [11, 11, 34, 12, 14, 12, 40, 11, 11, 11, 9, 9, 30, 11, 13],
    header: ['추천일', '상품번호', '도서명', '저자', '출판사', '분야', '추천 사유',
      '초도 발주', '당일 발주', '7일 판매',
      '담당 MD', 'MD 판단', '보류/제외 사유', '검토일', '선출간 결과'],
    rows
  });
  toast(`추천 이력 ${rows.length}건을 엑셀로 내려받았습니다.`);
});

/* 조건 가이드 접기/펼치기 */
function toggleGuide() {
  const card = $('#guideCard');
  const collapsed = card.classList.toggle('collapsed');
  $('#guideToggle').setAttribute('aria-expanded', String(!collapsed));
}
$('#guideToggle').addEventListener('click', toggleGuide);
$('#guideToggle').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGuide(); }
});

/* 토스트 */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* 다크모드 */
$('#themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  $('#iconMoon').classList.toggle('hidden', dark);
  $('#iconSun').classList.toggle('hidden', !dark);
});

/* 초기화 */
(function init() {
  const mds = Array.from(new Set(CANDIDATES.map(c => c.md)));
  $('#filterMd').insertAdjacentHTML('beforeend', mds.map(m => `<option value="${m}">${m}</option>`).join(''));
  renderCandidates();
  renderMail();
  renderHistory();
  renderPerf();
  renderGuide();
})();
