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

/* 보류·제외 사유 (사업부서 확정안) */
const HOLD_REASONS = ['출판사 회신 대기', '신규 공급 계약 진행', '기타'];
const DROP_REASONS = ['이미 eBook 출간 예정', '경쟁사 단독 선출간', '제작 불가 (판권 이슈)', 'eBook 제작 부적합', '기타'];

/* ---------- 우선순위 산정 ----------
   조건 가중치: 초도 발주량 상위 > 당일 발주량 급증 > 최근 7일 판매량 상위
                > 주목할 신상품 상위 > 베스트셀러·셀럽 작가 > 예약판매
   점수 = 최상위 조건 가중치 + (나머지 조건 가중치 합 × 0.4) + 반응 강도 보너스(최대 20)
   → 여러 조건을 동시 충족하거나 발주·판매 반응이 큰 상품이 위로 올라온다.
------------------------------------ */
const RULE_WEIGHT = { R1: 60, R2: 50, R3: 42, R5: 32, R6: 24, R4: 14 };
const MD_DAILY_LIMIT = 10;   // MD 1인당 하루 추천 상한. 초과분은 다음 영업일로 이월

/* ---------- 종이책 관리분류 → eBook 담당 MD 매핑 ----------
   운영자가 화면에서 수정할 수 있는 매핑 테이블을 전제로 한다.
   코드에 고정하지 않고 EBOOK_MD_MAPPING 테이블에서 읽어오는 구조.
------------------------------------------------------------ */
const MD_MAP = [
  { cd: '001001', nm: '수험서 자격증', md: '설재희' },
  { cd: '001002', nm: 'IT 모바일', md: '김혜연' },
  { cd: '001003', nm: '중고등학습서', md: '김효인' },
  { cd: '001004', nm: '대학교재', md: '설재희' },
  { cd: '001005', nm: '유아', md: '김효인' },
  { cd: '001006', nm: '국내문학', md: '김영원' },
  { cd: '001007', nm: '종교', md: '김효인' },
  { cd: '001008', nm: '만화/라이트노벨', md: '이민정/곽수진' },
  { cd: '001009', nm: '사회 정치', md: '김효인' },
  { cd: '001010', nm: '잡지', md: '김영원' },
  { cd: '001011', nm: '국어 외국어 사전', md: '김혜연' },
  { cd: '001012', nm: '여행', md: '김영원' },
  { cd: '001013', nm: '경제 경영', md: '김혜연' },
  { cd: '001014', nm: '인문', md: '김효인' },
  { cd: '001015', nm: '역사', md: '김효인' },
  { cd: '001016', nm: '예술', md: '김영원' },
  { cd: '001017', nm: '가정 살림', md: '김영원' },
  { cd: '001019', nm: '청소년', md: '김효인' },
  { cd: '001020', nm: '자연과학', md: '김효인' },
  { cd: '001022', nm: '자기계발', md: '김혜연' },
  { cd: '001023', nm: '건강 취미', md: '김영원' },
  { cd: '001026', nm: '해외문학', md: '김효인' },
  { cd: '001027', nm: '어린이', md: '김효인' },
  { cd: '001029', nm: '초등학습서', md: '김효인' },
  { cd: '001033', nm: '소설/시/희곡', md: '김영원' },
  { cd: '001034', nm: '에세이', md: '김영원' },
  { cd: '00103?', nm: '문학', md: '김영원', tbd: true }   // 첨부 이미지에서 분류코드가 잘려 확인 필요
];
const MD_BY_CD = Object.fromEntries(MD_MAP.map(m => [m.cd, m.md]));
const NM_BY_CD = Object.fromEntries(MD_MAP.map(m => [m.cd, m.nm]));

// 표지 이미지: 기본 경로는 XL(798x1200)이라 목록에는 과함 → 목록용 L(266x400) 사용
const IMG_URL = no => `https://image.yes24.com/goods/${no}/L`;
const GOODS_URL = no => `https://www.yes24.com/product/goods/${no}`;

/* ---------- 오늘의 추천 후보 (실제 YES24 상품) ---------- */
const CANDIDATES = [
  {
    no: '195042981', title: '그랬다고 적었다', author: '김애란', pub: '문학동네', catCd: '001034',
    reasons: [{ c: 'R1', v: '3,200부' }, { c: 'R3', v: '6위' }, { c: 'R6', v: '전작 40만부' }],
    metrics: { init: '3,200부', today: '480부', w7: '4,120부', rank: '판매 6위', state: '판매중', prev: '전작 최고 40.0만부' }
  },
  {
    no: '195252787', title: '서리꽃 세트', author: '조정래', pub: '해냄', catCd: '001033',
    reasons: [{ c: 'R1', v: '2,700부' }, { c: 'R4', v: '예약판매' }, { c: 'R6', v: '전작 100만부' }],
    metrics: { init: '2,700부', today: '610부', w7: '—', rank: '—', state: '예약판매', prev: '전작 최고 100.0만부' }
  },
  {
    no: '167466420', title: '2026 큰별쌤 최태성의 별별한국사 한국사능력검정시험 심화(1,2,3급) 상', author: '최태성', pub: '이투스북', catCd: '001001',
    reasons: [{ c: 'R1', v: '3,600부' }, { c: 'R2', v: '520부' }],
    metrics: { init: '3,600부', today: '520부', w7: '2,240부', rank: '—', state: '판매중', prev: '시리즈 누적 80만부' }
  },
  {
    no: '192474512', title: '세네카, 오늘을 빼앗기고 있는 당신에게', author: '루키우스 안나이우스 세네카 · 하와이 대저택 편역', pub: '논픽션', catCd: '001014',
    reasons: [{ c: 'R1', v: '1,540부' }, { c: 'R3', v: '22위' }],
    metrics: { init: '1,540부', today: '320부', w7: '2,860부', rank: '판매 22위', state: '판매중', prev: '전작 최고 12.0만부' }
  },
  {
    no: '194332699', title: '2027 공단기 소방단기 써니 행정법총론 핵심집약', author: '박준철', pub: '공단기(에스티유니타스)', catCd: '001001',
    reasons: [{ c: 'R1', v: '4,200부' }],
    metrics: { init: '4,200부', today: '260부', w7: '1,180부', rank: '—', state: '판매중', prev: '개정판 누적 22만부' }
  },
  {
    no: '125557465', title: '하루 한 장 나의 어휘력을 위한 필사 노트', author: '유선경', pub: '위즈덤하우스', catCd: '001014',
    reasons: [{ c: 'R3', v: '28위' }, { c: 'R6', v: '전작 30만부' }],
    metrics: { init: '890부', today: '270부', w7: '2,410부', rank: '판매 28위', state: '판매중', prev: '전작 최고 30.0만부' }
  },
  {
    no: '195224858', title: '처음 읽는 그리스 로마 신화 15', author: '최설희 글 · 한현동 그림', pub: '미래엔아이세움', catCd: '001027',
    reasons: [{ c: 'R1', v: '2,300부' }],
    metrics: { init: '2,300부', today: '190부', w7: '1,020부', rank: '—', state: '판매중', prev: '시리즈 누적 210만부' }
  },
  {
    no: '195026262', title: '찌니주의보', author: '정지아', pub: '창비', catCd: '001033',
    reasons: [{ c: 'R3', v: '14위' }, { c: 'R6', v: '전작 18만부' }],
    metrics: { init: '1,120부', today: '240부', w7: '3,050부', rank: '판매 14위', state: '판매중', prev: '전작 최고 18.0만부' }
  },
  {
    no: '194171309', title: '나는 왜 네 말이 힘들까', author: '박재연', pub: '한빛라이프', catCd: '001014',
    reasons: [{ c: 'R2', v: '410부' }, { c: 'R6', v: '전작 15만부' }],
    metrics: { init: '760부', today: '410부', w7: '1,340부', rank: '—', state: '판매중', prev: '전작 최고 15.0만부' }
  },
  {
    no: '195224904', title: '처음 읽는 삼국지 5', author: '이문열 글 · 한현동 그림', pub: '미래엔아이세움', catCd: '001027',
    reasons: [{ c: 'R1', v: '1,900부' }, { c: 'R2', v: '280부' }],
    metrics: { init: '1,900부', today: '280부', w7: '870부', rank: '—', state: '판매중', prev: '시리즈 누적 150만부' }
  },
  {
    no: '8759796', title: '모순', author: '양귀자', pub: '쓰다', catCd: '001033',
    reasons: [{ c: 'R3', v: '3위' }],
    metrics: { init: '640부', today: '180부', w7: '5,240부', rank: '판매 3위', state: '판매중', prev: '누적 100만부 이상' }
  },
  {
    no: '194511329', title: '오뒷세이아', author: '호메로스 저 · 김헌 역', pub: '을유문화사', catCd: '001014',
    reasons: [{ c: 'R1', v: '980부' }, { c: 'R5', v: '56위' }],
    metrics: { init: '980부', today: '150부', w7: '620부', rank: '신상품 56위', state: '판매중', prev: '전작 최고 4.6만부' }
  },
  {
    no: '145242086', title: '오디세이아', author: '호메로스 저 · 박문재 역', pub: '현대지성', catCd: '001014',
    reasons: [{ c: 'R3', v: '35위' }],
    metrics: { init: '520부', today: '130부', w7: '1,780부', rank: '판매 35위', state: '판매중', prev: '전작 최고 8.2만부' }
  },
  {
    no: '124235834', title: '수족관', author: '유래혁', pub: '포스터샵', catCd: '001033',
    reasons: [{ c: 'R5', v: '88위' }],
    metrics: { init: '380부', today: '95부', w7: '540부', rank: '신상품 88위', state: '판매중', prev: '전작 없음' }
  },
  {
    no: '161401496', title: '니체의 초월자', author: '프리드리히 니체 저 · 김철 편역', pub: '히읏', catCd: '001014',
    reasons: [{ c: 'R5', v: '72위' }],
    metrics: { init: '460부', today: '120부', w7: '780부', rank: '신상품 72위', state: '판매중', prev: '전작 최고 2.4만부' }
  },
  {
    no: '161523831', title: '하루 한 장 나의 표현력을 위한 필사 노트', author: '유선경', pub: '위즈덤하우스', catCd: '001014',
    reasons: [{ c: 'R5', v: '94위' }],
    metrics: { init: '410부', today: '105부', w7: '660부', rank: '신상품 94위', state: '판매중', prev: '전작 최고 30.0만부' }
  },
  {
    no: '125085536', title: '쇼펜하우어 인생수업 (30만 부 기념 개정증보판)', author: '아르투어 쇼펜하우어', pub: '하이스트', catCd: '001014',
    reasons: [{ c: 'R4', v: '예약판매' }, { c: 'R6', v: '전작 30만부' }],
    metrics: { init: '820부', today: '140부', w7: '—', rank: '—', state: '예약판매', prev: '전작 최고 30.0만부' }
  },
  {
    no: '194182112', title: '문해내공', author: '신종호 · 김윤정', pub: '상상스퀘어', catCd: '001014',
    reasons: [{ c: 'R5', v: '103위' }],
    metrics: { init: '350부', today: '90부', w7: '470부', rank: '신상품 103위', state: '판매중', prev: '전작 최고 3.8만부' }
  },
  {
    no: '194300887', title: '독성 인간', author: '리앤 텐 브링크', pub: '웅진지식하우스', catCd: '001014',
    reasons: [{ c: 'R4', v: '예약판매' }],
    metrics: { init: '330부', today: '75부', w7: '—', rank: '—', state: '예약판매', prev: '전작 없음' }
  },
  {
    no: '108442920', title: '김헌의 그리스 로마 신화', author: '김헌', pub: '을유문화사', catCd: '001014',
    reasons: [{ c: 'R4', v: '예약판매' }],
    metrics: { init: '290부', today: '60부', w7: '—', rank: '—', state: '예약판매', prev: '전작 최고 5.1만부' }
  }
];

/* 관리분류 기준 담당 MD 자동 배정 + 분류명 채우기 */
CANDIDATES.forEach(c => {
  c.cat = NM_BY_CD[c.catCd] || '미분류';
  c.md = MD_BY_CD[c.catCd] || null;          // 매핑이 없으면 미배정
});

/* 숫자 파싱: '1,420부' → 1420, '—' → 0 */
function qty(s) {
  const n = String(s || '').replace(/[^0-9]/g, '');
  return n ? parseInt(n, 10) : 0;
}

/* 반응 강도 보너스 (0~20) */
function intensityBonus(m) {
  const init = qty(m.init), today = qty(m.today), w7 = qty(m.w7);
  let b = 0;
  if (init >= 3000) b += 8; else if (init >= 2000) b += 6; else if (init >= 1000) b += 4; else if (init >= 500) b += 2;
  if (today >= 500) b += 6; else if (today >= 300) b += 4; else if (today >= 150) b += 2;
  if (w7 >= 3000) b += 6; else if (w7 >= 2000) b += 4; else if (w7 >= 1000) b += 2;
  return b;
}

/* 우선순위 점수·순위·MD별 상한 적용 */
function applyPriority() {
  CANDIDATES.forEach(c => {
    const ws = c.reasons.map(r => RULE_WEIGHT[r.c]).sort((a, b) => b - a);
    const base = ws[0] + ws.slice(1).reduce((a, b) => a + b, 0) * 0.4;
    c.score = Math.round(base + intensityBonus(c.metrics));
    c.topRule = c.reasons.slice().sort((a, b) => RULE_WEIGHT[b.c] - RULE_WEIGHT[a.c])[0].c;
    c.grade = c.score >= 90 ? 'high' : c.score >= 62 ? 'mid' : 'low';
  });
  CANDIDATES.sort((a, b) => b.score - a.score || a.no.localeCompare(b.no));
  CANDIDATES.forEach((c, i) => { c.rank = i + 1; });

  // MD별 우선순위 TOP N만 오늘 발송, 초과분은 다음 영업일로 이월
  const seen = {};
  CANDIDATES.forEach(c => {
    seen[c.md] = (seen[c.md] || 0) + 1;
    c.mdRank = seen[c.md];
    c.carry = c.mdRank > MD_DAILY_LIMIT;
  });
}
applyPriority();

const TODAY_LIST = () => CANDIDATES.filter(c => !c.carry);
const CARRY_LIST = () => CANDIDATES.filter(c => c.carry);

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

const MDS = ['김효인', '김영원', '설재희', '김혜연'];
const CURRENT_MD = '김효인';   // 로그인 사용자 (프로토타입 고정)
const TODAY_STR = '2026-08-27';
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
      ? `<div class="act-note"><b>${st === 'go' ? '섭외' : st === 'hold' ? '보류' : '제외'}</b>${c.note ? ' · ' + c.note : ''}<br />${CURRENT_MD} · 2026-08-27</div>`
      : `<div class="act-note">검토 대기 · 담당 <b>${c.md || '미배정'}</b></div>`;
    const gradeTxt = { high: '최우선', mid: '높음', low: '보통' }[c.grade];
    return `
    <article class="cand ${st ? 'done' : ''} ${c.carry ? 'carry' : ''}" data-no="${c.no}">
      <div class="cand-lead prio-${c.carry ? 'carry' : c.grade}">
        <a class="cand-cover" href="${GOODS_URL(c.no)}" target="_blank" rel="noopener" title="${c.title}">
          <img src="${IMG_URL(c.no)}" alt="${c.title} 표지" loading="lazy"
               onerror="this.classList.add('no-img');this.removeAttribute('src')" />
          <span class="prio-chip" title="우선순위 점수 ${c.score}점 · 담당 ${c.md || '미배정'}">${c.carry ? '이월' : '#' + c.mdRank}</span>
        </a>
        <span class="prio-grade">${c.carry ? '다음 회차' : gradeTxt}</span>
      </div>
      <div class="cand-body">
        <div class="cand-topline">
          <span class="goods-no">${c.no}</span>
          <span class="pill" title="관리분류 ${c.catCd}">${c.cat}</span>
          ${c.metrics.state === '예약판매' ? '<span class="status-badge status-low">예약판매</span>' : '<span class="status-badge status-selling">판매중</span>'}
          ${c.carry ? '<span class="badge badge-warning">다음 영업일 이월</span>' : ''}
        </div>
        <a class="cand-title" href="${GOODS_URL(c.no)}" target="_blank" rel="noopener">${c.title}</a>
        <div class="cand-sub">${c.author} · ${c.pub}</div>
        <div class="cand-reasons">${c.reasons.map(r => reasonHtml(r.c, r.v)).join('')}</div>
      </div>
      <div class="cand-act">
        <div class="act-row">
          <button class="act-btn ${st === 'go' ? 'on-go' : ''}" data-act="go">섭외</button>
          <button class="act-btn ${st === 'hold' ? 'on-hold' : ''}" data-act="hold">보류</button>
          <button class="act-btn ${st === 'drop' ? 'on-drop' : ''}" data-act="drop">제외</button>
        </div>
        ${noteHtml}
        <div class="act-links">
          <a href="${GOODS_URL(c.no)}" target="_blank" rel="noopener">상품 상세에서 세부 지표 보기</a>
        </div>
      </div>
    </article>`;
  }).join('');

  $('#candList').classList.toggle('hidden', list.length === 0);
  $('#candEmpty').classList.toggle('hidden', list.length !== 0);
  updateKpi();
}

function updateKpi() {
  const today = TODAY_LIST();
  const carry = CARRY_LIST();
  const total = today.length;
  const done = today.filter(c => c.status).length;
  const go = today.filter(c => c.status === 'go').length;
  const hold = today.filter(c => c.status === 'hold').length;
  const drop = today.filter(c => c.status === 'drop').length;
  $('#kpiTotal').innerHTML = total + '<span class="unit">종</span>';
  $('#kpiDone').innerHTML = done + '<span class="unit">종</span>';
  $('#kpiDoneBar').style.width = (total ? (done / total * 100) : 0) + '%';
  $('#kpiGo').innerHTML = go + '<span class="unit">종</span>';
  $('#fcAll').textContent = total;
  $('#fcTodo').textContent = total - done;
  $('#fcGo').textContent = go;
  $('#fcHold').textContent = hold;
  $('#fcDrop').textContent = drop;
  $('#fcCarry').textContent = carry.length;

  // MD별 배분 현황 (상한 대비)
  const byMd = {};
  CANDIDATES.forEach(c => {
    byMd[c.md] = byMd[c.md] || { sent: 0, carry: 0 };
    byMd[c.md][c.carry ? 'carry' : 'sent']++;
  });
  $('#mdQuota').innerHTML = Object.keys(byMd).sort().map(md => {
    const q = byMd[md];
    const full = q.sent >= MD_DAILY_LIMIT;
    return `<span class="quota ${full ? 'full' : ''}">
      <b>${md}</b> ${q.sent}/${MD_DAILY_LIMIT}${q.carry ? ` <i>이월 ${q.carry}</i>` : ''}</span>`;
  }).join('');
}

/* ---------- 메일 ---------- */
function renderMail() {
  const list = TODAY_LIST();
  $('#mailRows').innerHTML = list.map(c => `
    <tr>
      <td class="num">${c.mdRank}</td>
      <td class="mono"><a href="${GOODS_URL(c.no)}" target="_blank" rel="noopener">${c.no}</a></td>
      <td>
        <div class="td-title"><a href="${GOODS_URL(c.no)}" target="_blank" rel="noopener">${c.title}</a></div>
        <div class="td-sub">${c.author} · ${c.pub} · ${c.cat}</div>
      </td>
      <td><div class="reason-inline">${c.reasons.map(r => reasonHtml(r.c, '')).join('')}</div></td>
      <td class="nowrap">${c.md || '미배정'}</td>
    </tr>`).join('');
  $('#mailCount').textContent = list.length;
  $('#mailCarry').textContent = CARRY_LIST().length;
  $('#mailSubject').textContent = `[eBook 선출간] 8/27(목) 단독 선출간 후보 ${list.length}종`;
}

/* ---------- 이력 ---------- */
function historyRows() {
  const q = $('#hSearch').value.trim();
  const st = $('#hStatus').value;
  const rs = $('#hReason').value;
  const md = $('#hMd').value;
  return HISTORY.filter(h => {
    if (q && !(h.title.includes(q) || h.no.includes(q) || h.pub.includes(q) || h.author.includes(q))) return false;
    if (st && h.status !== st) return false;
    if (rs && !h.reasons.includes(rs)) return false;
    if (md && h.md !== md) return false;
    return true;
  });
}

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
  const rows = historyRows();
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
['#hSearch', '#hStatus', '#hReason', '#hPeriod', '#hMd'].forEach(s => {
  $(s).addEventListener('input', renderHistory);
  $(s).addEventListener('change', renderHistory);
});

/* 뷰 전환 */
const VIEW_META = {
  today: ['오늘의 추천 후보', '2026-08-27(목) 오전 10:00 자동 추출 · eBook 미등록 종이책 중 신규로 조건을 충족한 상품입니다.'],
  mail: ['일일 추천 메일', '영업일 오전 10시에 eBook팀으로 자동 발송되는 후보 메일의 실제 발송 형태입니다.'],
  history: ['추천·검토 이력', '추천 시점의 지표와 MD 판단을 함께 적재해, 추후 조건별 적중률 분석의 기반으로 활용합니다.'],
  report: ['추천 성과 리포트', '추천 → 섭외 → 선출간 성사까지의 전환을 조건별로 추적해 추출 기준을 고도화합니다.'],
  mdmap: ['담당 MD 매핑', '종이책 관리분류별 eBook 담당 MD를 관리합니다. 담당이 바뀌면 이 화면에서만 수정하면 됩니다.']
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
    // '이월' 탭에서만 이월 대기 건을 보여준다
    if (filterStatus === 'carry') { if (!c.carry) return false; }
    else if (c.carry) return false;
    if (filterStatus === 'todo' && c.status) return false;
    if (['go', 'hold', 'drop'].includes(filterStatus) && c.status !== filterStatus) return false;
    if (fr && !c.reasons.some(r => r.c === fr)) return false;
    if (fm && c.md !== fm) return false;
    return true;
  });
}

$('#btnXlsx').addEventListener('click', () => {
  const rows = currentCandidates().map(c => [
    '2026-08-27', c.carry ? '이월' : c.mdRank, c.score, c.no, c.title, c.author, c.pub, c.catCd, c.cat,
    reasonText(c.reasons.map(r => r.c)),
    c.metrics.init, c.metrics.today, c.metrics.w7, c.metrics.rank, c.metrics.prev,
    c.md, c.status ? STATUS_TXT[c.status] : '미검토', c.note || ''
  ]);
  downloadXlsx('eBook_선출간_추천후보_20260827.xlsx', {
    name: '추천후보',
    cols: [11, 8, 8, 11, 40, 20, 16, 10, 14, 40, 11, 11, 11, 22, 20, 9, 9, 36],
    header: ['추천일', 'MD내 순위', '우선순위 점수', '상품번호', '도서명', '저자', '출판사', '관리분류코드', '관리분류', '추천 사유',
      '초도 발주', '당일 발주', '7일 판매', '순위', '작가 이력',
      '담당 MD', 'MD 판단', '보류/제외 사유'],
    rows
  });
  toast(`추천 후보 ${rows.length}건을 엑셀로 내려받았습니다.`);
});

$('#btnXlsx2').addEventListener('click', () => {
  const rows = historyRows().map(h => [
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

/* =========================================================
   담당 MD 매핑 관리 화면
   ========================================================= */

/* 편집 중인 사본. 저장 전까지 원본(MD_MAP)에 반영하지 않는다. */
let mapDraft = MD_MAP.map(m => ({ ...m, use: m.use !== false, upd: m.upd || '2026-08-01 · 시스템' }));
const MD_POOL = () => Array.from(new Set(mapDraft.map(m => m.md).filter(Boolean))).sort();

function mapIsDirty() {
  if (mapDraft.length !== MD_MAP.length) return true;
  return mapDraft.some((d, i) => {
    const o = MD_MAP[i];
    return !o || d.cd !== o.cd || d.nm !== o.nm || d.md !== o.md || d.use !== (o.use !== false);
  });
}

/* 관리분류 → 담당 MD 재배정 (저장 시 실행) */
function reassignMd() {
  const byCd = {}, nmByCd = {};
  MD_MAP.forEach(m => {
    nmByCd[m.cd] = m.nm;
    if (m.use !== false) byCd[m.cd] = m.md;
  });
  CANDIDATES.forEach(c => {
    c.cat = nmByCd[c.catCd] || c.cat || '미분류';
    c.md = byCd[c.catCd] || null;
  });
  applyPriority();          // 담당이 바뀌면 MD별 1일 상한도 다시 계산
}

function renderMapStats() {
  const cnt = {};
  CANDIDATES.forEach(c => { cnt[c.catCd] = (cnt[c.catCd] || 0) + 1; });
  const perMd = {};
  mapDraft.filter(m => m.use).forEach(m => {
    perMd[m.md] = perMd[m.md] || { cat: 0, reco: 0 };
    perMd[m.md].cat++;
    perMd[m.md].reco += cnt[m.cd] || 0;
  });
  const unmapped = CANDIDATES.filter(c => !c.md).length;
  const off = mapDraft.filter(m => !m.use).length;

  $('#mapStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-head"><h4>등록 분류</h4></div>
      <div class="stat-num">${mapDraft.length}<span class="unit">건</span></div>
      <div class="stat-sub">사용 중 ${mapDraft.length - off}건 · 미사용 ${off}건</div>
    </div>
    <div class="stat-card">
      <div class="stat-head"><h4>담당 MD</h4></div>
      <div class="stat-num">${Object.keys(perMd).length}<span class="unit">명</span></div>
      <div class="stat-sub">${Object.keys(perMd).sort().join(' · ') || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-head"><h4>MD당 담당 분류</h4></div>
      <div class="stat-num">${Object.keys(perMd).length ? (mapDraft.filter(m => m.use).length / Object.keys(perMd).length).toFixed(1) : 0}<span class="unit">개</span></div>
      <div class="stat-sub">${Object.entries(perMd).sort((a, b) => b[1].cat - a[1].cat).slice(0, 2).map(([k, v]) => `${k} ${v.cat}개`).join(' · ') || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-head"><h4>미배정 추천</h4>${unmapped ? '<span class="badge badge-warning">확인</span>' : ''}</div>
      <div class="stat-num ${unmapped ? 'danger' : ''}">${unmapped}<span class="unit">종</span></div>
      <div class="stat-sub">매핑이 없어 담당자가 없는 상품</div>
    </div>`;
}

function renderMapRows() {
  const q = $('#mapSearch').value.trim();
  const fm = $('#mapFilterMd').value;
  const onlyHit = $('#mapOnlyHit').checked;
  const cnt = {};
  CANDIDATES.forEach(c => { cnt[c.catCd] = (cnt[c.catCd] || 0) + 1; });
  const pool = MD_POOL();

  const rows = mapDraft
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => {
      if (q && !(m.cd.includes(q) || m.nm.includes(q))) return false;
      if (fm && m.md !== fm) return false;
      if (onlyHit && !cnt[m.cd]) return false;
      return true;
    });

  $('#mapRows').innerHTML = rows.map(({ m, i }) => `
    <tr class="${cnt[m.cd] ? 'hit' : ''} ${m.use ? '' : 'off'}" data-i="${i}">
      <td>
    
      <td><input class="cell-input" data-f="nm" value="${m.nm}" /></td>
      <td>
        <select class="cell-input" data-f="md">
          ${pool.map(p => `<option value="${p}" ${p === m.md ? 'selected' : ''}>${p}</option>`).join('')}
          ${pool.includes(m.md) ? '' : `<option value="${m.md}" selected>${m.md}</option>`}
          <option value="__new">+ 담당자 직접 입력…</option>
        </select>
      </td>
      <td>
        <label class="switch"><input type="checkbox" data-f="use" ${m.use ? 'checked' : ''} /><span class="track"></span></label>
      </td>
      <td class="num">${cnt[m.cd] ? `<span class="hit-cnt">${cnt[m.cd]}</span>` : '<span class="dim">0</span>'}</td>
      <td class="upd">${m.upd}</td>
    </tr>`).join('');

  $('#mapDirty').textContent = mapIsDirty() ? '저장하지 않은 변경 있음' : '변경 없음';
  $('#mapDirty').classList.toggle('dirty', mapIsDirty());
  $('#mapCount') && ($('#mapCount').textContent = rows.length + '건');
  renderMapStats();
}

/* 셀 편집 */
$('#mapRows').addEventListener('change', e => {
  const el = e.target.closest('[data-f]'); if (!el) return;
  const tr = el.closest('tr');
  const rec = mapDraft[+tr.dataset.i];
  const f = el.dataset.f;

  if (f === 'use') { rec.use = el.checked; }
  else if (f === 'md') {
    if (el.value === '__new') {
      const nm = prompt('담당 MD 이름을 입력하세요', rec.md || '');
      if (nm && nm.trim()) rec.md = nm.trim();
    } else rec.md = el.value;
  } else {
    rec[f] = el.value.trim();
    if (f === 'cd' && rec.cd) delete rec.tbd;
  }
  rec.upd = `${TODAY_STR} · ${CURRENT_MD}`;
  renderMapRows();
});

$('#mapAdd').addEventListener('click', () => {
  mapDraft.push({ cd: '', nm: '새 관리분류', md: MD_POOL()[0] || CURRENT_MD, use: true, upd: `${TODAY_STR} · ${CURRENT_MD}` });
  $('#mapSearch').value = ''; $('#mapFilterMd').value = ''; $('#mapOnlyHit').checked = false;
  renderMapRows();
  const rows = $$('#mapRows tr');
  rows[rows.length - 1]?.scrollIntoView({ block: 'center' });
  rows[rows.length - 1]?.querySelector('[data-f="cd"]')?.focus();
});

$('#mapReset').addEventListener('click', () => {
  mapDraft = MD_MAP.map(m => ({ ...m, use: m.use !== false, upd: m.upd || '2026-08-01 · 시스템' }));
  fillMapMdFilter();
  renderMapRows();
  toast('저장 전 상태로 되돌렸습니다.');
});

$('#mapSave').addEventListener('click', () => {
  const bad = mapDraft.find(m => !m.cd || !m.nm || !m.md);
  if (bad) { toast('분류코드 · 관리분류 · 담당 MD는 모두 입력해야 합니다.'); return; }
  const dup = mapDraft.map(m => m.cd).filter((v, i, a) => a.indexOf(v) !== i);
  if (dup.length) { toast(`분류코드가 중복됩니다: ${dup[0]}`); return; }

  MD_MAP.length = 0;
  mapDraft.forEach(m => MD_MAP.push({ ...m }));
  reassignMd();
  fillMapMdFilter();
  renderMapRows();
  renderCandidates();
  renderMail();
  toast('매핑을 저장했습니다. 다음 배치부터 적용됩니다.');
});

['#mapSearch', '#mapFilterMd', '#mapOnlyHit'].forEach(sel => {
  $(sel).addEventListener('input', renderMapRows);
  $(sel).addEventListener('change', renderMapRows);
});

function fillMapMdFilter() {
  const cur = $('#mapFilterMd').value;
  $('#mapFilterMd').innerHTML = '<option value="">담당 MD 전체</option>' +
    MD_POOL().map(m => `<option value="${m}">${m}</option>`).join('');
  $('#mapFilterMd').value = MD_POOL().includes(cur) ? cur : '';
}

$('#btnMdMap').addEventListener('click', e => {
  e.stopPropagation();          // 가이드 카드 접힘 방지
  switchView('mdmap');
});

/* 초기화 */
(function init() {
  const mds = Array.from(new Set([...CANDIDATES.map(c => c.md), ...HISTORY.map(h => h.md)])).sort();
  const opts = mds.map(m => `<option value="${m}">${m}</option>`).join('');
  $('#filterMd').insertAdjacentHTML('beforeend', opts);
  $('#hMd').insertAdjacentHTML('beforeend', opts);
  renderCandidates();
  renderMail();
  renderHistory();
  renderPerf();
  renderGuide();
  fillMapMdFilter();
  renderMapRows();
})();
