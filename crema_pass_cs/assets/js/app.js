/* =========================================================
   크레마클럽 이용권 폐기/환불 CS 조회 — POC
   · 조회 전용 (데이터 변경 없음). 모든 데이터는 목업.
   ========================================================= */

const TODAY = '2026.09.01';

/* ---------------- 목업 데이터 ---------------- */
const CASES = [
  {
    cs: 'CS-20260901-0142', csAt: '2026-09-01 09:12', channel: '1:1 문의',
    intent: '크레마클럽 > 이용권 폐기·환불', conf: 0.96,
    member: { id: 'yehy**23', no: '21847362', name: '김O수', joined: '2019.03.11', club: '미구독', device: '크레마 그랑데 (2024.05 등록)' },
    inquiry: '사은품으로 받은 크레마클럽 이용권을 실수로 등록했습니다. <b>한 권도 안 봤는데</b> 폐기하고 다시 받을 수 있을까요?',
    checks: [
      '사은품 이용권으로 결제 금액이 없어 환불 대상 금액은 없습니다. 재발급(폐기 후 재지급) 여부 확인 필요.',
      '최근 6개월 내 동일 유형 요청 이력 없음.'
    ],
    passes: [{
      no: 'CRM-2608-8821-4417', name: '크레마클럽 사은품 이용권 (1개월)', type: '사은품',
      route: '크레마 단말 구매 사은품', orderNo: 'Y2026-0812-3391', amount: 0,
      issued: '2026.08.20', registered: true, registeredAt: '2026.08.28',
      statusKind: 'using', startAt: '2026.08.28', endAt: '2026.09.27',
      downloads: []
    }]
  },
  {
    cs: 'CS-20260901-0138', csAt: '2026-09-01 08:47', channel: '고객센터 전화',
    intent: '크레마클럽 > 이용권 폐기·환불', conf: 0.93,
    member: { id: 'leej**01', no: '19023774', name: '이O진', joined: '2016.07.22', club: '구독 중', device: '크레마 모티프 (2023.11 등록)' },
    inquiry: '크레마클럽 프로모션 이용권을 등록했는데 생각보다 볼 책이 없네요. <b>환불 가능한가요?</b>',
    checks: [
      '등록 후 다운로드 이력이 확인되어 원칙상 환불 불가 안내 대상입니다.',
      '다운로드 도서 반납(회수) 여부와 무관하게 이용 이력은 유지됩니다.'
    ],
    passes: [{
      no: 'CRM-2607-5540-1182', name: '크레마클럽 1개월 프로모션 이용권', type: '프로모션',
      route: '7월 여름 프로모션 응모', orderNo: '—', amount: 0,
      issued: '2026.06.29', registered: true, registeredAt: '2026.07.02',
      statusKind: 'using', startAt: '2026.07.02', endAt: '2026.10.01',
      downloads: [
        { title: '불편한 편의점', at: '2026.07.02 21:14', device: '크레마 모티프', itemNo: '117289331' },
        { title: '아주 희미한 빛으로도', at: '2026.07.04 08:02', device: 'YES24 eBook 앱 (iOS)', itemNo: '116447021' },
        { title: '물고기는 존재하지 않는다', at: '2026.07.11 23:40', device: '크레마 모티프', itemNo: '105228741' },
        { title: '기분을 관리하면 인생이 관리된다', at: '2026.08.02 19:27', device: '크레마 모티프', itemNo: '121003884' }
      ]
    }]
  },
  {
    cs: 'CS-20260901-0151', csAt: '2026-09-01 10:33', channel: '1:1 문의',
    intent: '크레마클럽 > 이용권 폐기·환불', conf: 0.98,
    member: { id: 'park**77', no: '20558914', name: '박O민', joined: '2021.01.09', club: '미구독', device: '등록 단말 없음' },
    inquiry: '크레마클럽 3개월 이용권을 구매했는데 <b>아직 등록 안 했습니다.</b> 취소하고 환불받고 싶어요.',
    checks: [
      '유상 구매 건으로 결제수단(신용카드) 원거래 취소 처리가 필요합니다.',
      '이용권 미등록 상태이므로 폐기 후 환불 진행에 제약이 없습니다.'
    ],
    passes: [{
      no: 'CRM-2608-9903-7741', name: '크레마클럽 3개월 이용권', type: '구매',
      route: 'YES24 eBook 스토어 구매', orderNo: 'Y2026-0829-8812', amount: 27000,
      issued: '2026.08.29', registered: false, registeredAt: null,
      statusKind: 'unused', startAt: null, endAt: '2027.02.28',
      downloads: []
    }]
  },
  {
    cs: 'CS-20260901-0147', csAt: '2026-09-01 09:58', channel: '1:1 문의',
    intent: '크레마클럽 > 이용권 폐기·환불', conf: 0.91,
    member: { id: 'choi**05', no: '17720043', name: '최O영', joined: '2014.05.30', club: '미구독', device: '크레마 카르타G (2019.08 등록)' },
    inquiry: '작년에 받은 이용권을 못 썼는데 지금이라도 <b>환불이나 기간 연장</b>이 될까요?',
    checks: [
      '유효기간 만료 건으로 환불·연장 모두 불가 안내 대상입니다.',
      '고객 요청 시 만료 사유(등록 후 미사용)와 만료일 안내가 필요합니다.'
    ],
    passes: [{
      no: 'CRM-2512-3320-6650', name: '크레마클럽 사은품 이용권 (1개월)', type: '사은품',
      route: '연말 이벤트 지급', orderNo: '—', amount: 0,
      issued: '2025.12.01', registered: true, registeredAt: '2025.12.10',
      statusKind: 'expired', startAt: '2025.12.10', endAt: '2026.01.09',
      downloads: []
    }]
  },
  {
    cs: 'CS-20260901-0155', csAt: '2026-09-01 11:20', channel: '1:1 문의',
    intent: '크레마클럽 > 이용권 폐기·환불', conf: 0.88,
    member: { id: 'jung**a9', no: '22913388', name: '정O아', joined: '2022.09.14', club: '구독 중', device: '크레마 그랑데 (2025.02 등록)' },
    inquiry: '이용권 <b>두 장</b>이 있는데 하나만 쓰고 나머지는 환불하고 싶어요. 어떻게 되나요?',
    checks: [
      '보유 이용권 2건 중 1건만 환불 요청으로, 대상 이용권 특정이 필요합니다.',
      '등록된 이용권은 다운로드 이력이 있어 환불 불가, 미등록 이용권은 폐기·환불 가능합니다.'
    ],
    passes: [
      {
        no: 'CRM-2607-1177-2093', name: '크레마클럽 1개월 이용권', type: '구매',
        route: 'YES24 eBook 스토어 구매', orderNo: 'Y2026-0705-4410', amount: 9900,
        issued: '2026.07.05', registered: true, registeredAt: '2026.07.05',
        statusKind: 'using', startAt: '2026.07.05', endAt: '2026.10.04',
        downloads: [
          { title: '나는 메트로폴리탄 미술관의 경비원입니다', at: '2026.07.06 12:31', device: '크레마 그랑데', itemNo: '118840112' },
          { title: '어떻게 살 것인가', at: '2026.08.19 22:05', device: '크레마 그랑데', itemNo: '107773412' }
        ]
      },
      {
        no: 'CRM-2608-4462-8810', name: '크레마클럽 1개월 이용권', type: '구매',
        route: 'YES24 eBook 스토어 구매', orderNo: 'Y2026-0821-6602', amount: 9900,
        issued: '2026.08.21', registered: false, registeredAt: null,
        statusKind: 'unused', startAt: null, endAt: '2027.02.20',
        downloads: []
      }
    ]
  }
];

/* ---------------- 판정 규칙 ---------------- */
const RULES = [
  { code: 'R1', cond: '미등록 (발급만 된 상태)', verdict: '폐기·환불 가능', level: 'good', guide: '유상 구매 건이면 원거래 취소, 무상 지급 건이면 이용권 회수만 진행' },
  { code: 'R2', cond: '등록됨 + 다운로드 이력 0건 + 등록 후 7일 이내', verdict: '예외 환불 검토 가능', level: 'good', guide: '실사용 이력이 없어 예외 처리 대상. 담당자 승인 후 진행' },
  { code: 'R3', cond: '등록됨 + 다운로드 이력 0건 + 등록 후 7일 초과', verdict: '예외 환불 검토 필요', level: 'warn', guide: '사용 이력은 없으나 기간이 경과. 잔여 기간·지급 경로 확인 후 판단' },
  { code: 'R4', cond: '등록됨 + 다운로드 이력 1건 이상', verdict: '환불 불가', level: 'bad', guide: '이용 개시로 간주. 다운로드 목록을 근거로 불가 안내' },
  { code: 'R5', cond: '유효기간 만료', verdict: '환불·연장 불가', level: 'bad', guide: '만료일과 만료 사유를 안내' },
  { code: 'R6', cond: '이미 폐기 처리됨', verdict: '처리 완료 건', level: 'bad', guide: '폐기 일시와 처리자 확인 후 중복 요청 안내' }
];

const SOURCES = [
  { item: '이용권 종류 / 이용권 번호', src: '크레마클럽 이용권 마스터', note: '이용권 유형(사은품·프로모션·구매) 코드 매핑 필요' },
  { item: '이용권 등록 여부 / 등록일', src: '크레마클럽 이용권 등록 이력', note: '미등록 건은 등록일 NULL' },
  { item: '이용 상태 / 사용 개시일 / 만료일', src: '크레마클럽 이용권 상태', note: '미등록·사용·만료·폐기 4개 상태로 정규화' },
  { item: '도서 다운로드 이력', src: '크레마클럽 대출·다운로드 로그', note: '이용권 번호 기준 조인 가능 여부 확인 필요 (핵심 확인 사항)' },
  { item: '회원 기본 정보 / 구독 상태', src: 'YES24 회원 · 크레마클럽 구독', note: '개인정보 마스킹 후 표기' },
  { item: '결제·주문 정보', src: 'eBook 주문', note: '유상 구매 건 환불 시 원거래 확인용' },
  { item: 'CS 문의 원문 / 문의 분류', src: 'CS 접수 · AI 문의 분류', note: '분류 결과가 대상 문의일 때만 자동 조회 트리거' }
];

/* ---------------- 유틸 ---------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const toDate = s => { const [y, m, d] = s.split('.').map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const STATUS_LABEL = { unused: '미등록', using: '사용', expired: '만료', discarded: '폐기' };
const STATUS_CLASS = { unused: 'status-low', using: 'status-selling', expired: 'status-soldout', discarded: 'status-soldout' };

/* 이용권 1건에 대한 자동 판정 */
function judge(p) {
  if (p.statusKind === 'discarded') return { code: 'R6', level: 'bad', title: '처리 완료 건 (이미 폐기)', reason: '이미 폐기 처리된 이용권입니다.' };
  if (p.statusKind === 'expired') return { code: 'R5', level: 'bad', title: '환불·연장 불가 (유효기간 만료)', reason: '유효기간이 ' + p.endAt + '에 만료되었습니다.' };
  if (!p.registered) return { code: 'R1', level: 'good', title: '폐기·환불 가능', reason: '등록 전 상태로 사용 이력이 없습니다.' };
  if (p.downloads.length > 0) return { code: 'R4', level: 'bad', title: '환불 불가 (다운로드 이력 있음)', reason: '등록 후 ' + p.downloads.length + '건의 도서 다운로드 이력이 확인됩니다.' };
  const d = daysBetween(p.registeredAt, TODAY);
  if (d <= 7) return { code: 'R2', level: 'good', title: '예외 환불 검토 가능', reason: '등록 후 ' + d + '일 경과했으나 도서 다운로드 이력이 없습니다.' };
  return { code: 'R3', level: 'warn', title: '예외 환불 검토 필요', reason: '다운로드 이력은 없으나 등록 후 ' + d + '일이 경과했습니다.' };
}

const VERDICT_ICON = {
  good: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  bad: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
};

/* ---------------- 상태 ---------------- */
let state = { case: null, passIdx: 0, mode: 'member' };

/* ---------------- 결과 렌더 ---------------- */
function renderResult() {
  const c = state.case;
  const p = c.passes[state.passIdx];
  const v = judge(p);
  const dl = p.downloads;

  const facts = [
    '이용권 종류: <b>' + esc(p.name) + '</b> (' + p.type + ')',
    '등록 여부: <b>' + (p.registered ? '등록 · ' + p.registeredAt : '미등록') + '</b>',
    '이용 상태: <b>' + STATUS_LABEL[p.statusKind] + '</b>' + (p.startAt ? ' (개시 ' + p.startAt + ')' : ''),
    '다운로드 이력: <b>' + (dl.length ? dl.length + '건 (최초 ' + dl[0].at.split(' ')[0] + ')' : '없음') + '</b>',
    '유효기간: ' + (p.registered ? p.startAt + ' ~ ' + p.endAt : '등록 시 개시 · 사용기한 ' + p.endAt)
  ];

  /* --- 라이프사이클 타임라인 --- */
  const steps = [
    { label: '발급', date: p.issued, cls: 'done' },
    { label: '등록', date: p.registered ? p.registeredAt : '미등록', cls: p.registered ? 'done' : 'skip' },
    { label: '이용 개시', date: p.startAt || '—', cls: p.startAt ? 'done' : 'skip' },
    { label: '도서 다운로드', date: dl.length ? dl.length + '건' : '이력 없음', cls: dl.length ? 'alert' : 'skip' },
    { label: p.statusKind === 'expired' ? '만료' : '만료 예정', date: p.endAt, cls: p.statusKind === 'expired' ? 'alert' : '' }
  ];

  const dlRows = dl.length
    ? dl.map((d, i) => '<tr><td class="num dim">' + (i + 1) + '</td><td>' + esc(d.title) + '</td><td class="mono nowrap">' + d.at + '</td><td class="dim">' + esc(d.device) + '</td><td class="mono">' + d.itemNo + '</td></tr>').join('')
    : '<tr><td colspan="5" class="dim" style="text-align:center;padding:26px 10px">이 이용권으로 다운로드한 도서가 없습니다.</td></tr>';

  const passRows = c.passes.map((x, i) => {
    const j = judge(x);
    return '<tr class="clickable' + (i === state.passIdx ? ' on' : '') + '" data-pass="' + i + '">' +
      '<td class="mono nowrap">' + x.no + '</td>' +
      '<td>' + esc(x.name) + '</td>' +
      '<td><span class="pill">' + x.type + '</span></td>' +
      '<td class="nowrap">' + (x.registered ? x.registeredAt : '<span class="dim">미등록</span>') + '</td>' +
      '<td><span class="status-badge ' + STATUS_CLASS[x.statusKind] + '">' + STATUS_LABEL[x.statusKind] + '</span></td>' +
      '<td class="num">' + (x.downloads.length ? x.downloads.length + '건' : '<span class="dim">없음</span>') + '</td>' +
      '<td><span class="badge badge-' + (j.level === 'good' ? 'success' : j.level === 'warn' ? 'warning' : 'danger') + '">' + j.title + '</span></td>' +
      '</tr>';
  }).join('');

  const summaryText = [
    '[이용권 상태] ' + c.cs,
    '- 이용권 : ' + p.name,
    '- 이용권 번호 : ' + p.no,
    '- 이용권 등록 여부 : ' + (p.registered ? '등록 (' + p.registeredAt + ')' : '미등록'),
    '- 이용 상태 : ' + STATUS_LABEL[p.statusKind],
    '- 다운로드 이력 : ' + (dl.length ? '있음 (' + dl.length + '건)' : '없음'),
    '- 등록일 : ' + (p.registered ? p.registeredAt : '-'),
    '- 유효기간 : ' + (p.registered ? p.startAt + ' ~ ' + p.endAt : '사용기한 ' + p.endAt),
    '- 자동 판정 : ' + v.title + ' (' + v.code + ')'
  ].join('\n');

  $('#resultBox').innerHTML =
    /* ---- 고객 / 문의 ---- */
    '<div class="card mb12">' +
      '<div class="card-content">' +
        '<div class="cust-head">' +
          '<span class="cust-avatar">' + c.member.name.charAt(0) + '</span>' +
          '<div class="cust-main">' +
            '<div class="cust-name">' + c.member.name + ' <span class="pill">' + c.member.club + '</span></div>' +
            '<div class="cust-sub">' + c.member.id + ' · 회원번호 ' + c.member.no + ' · 가입 ' + c.member.joined + '</div>' +
            '<div class="product-dl" style="margin-top:12px">' +
              '<div class="dl-row"><dt>접수번호</dt><dd class="mono">' + c.cs + '</dd></div>' +
              '<div class="dl-row"><dt>접수일시</dt><dd class="mono">' + c.csAt + '</dd></div>' +
              '<div class="dl-row"><dt>채널</dt><dd>' + c.channel + '</dd></div>' +
              '<div class="dl-row"><dt>등록 단말</dt><dd>' + c.member.device + '</dd></div>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<span class="pill pill-md">AI 문의 분류</span>' +
            '<div style="font-size:13px;font-weight:700;margin-top:7px">' + c.intent + '</div>' +
            '<div style="font-size:11.5px;color:var(--muted-foreground);font-family:var(--font-mono);margin-top:2px">confidence ' + c.conf.toFixed(2) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="cs-quote" style="margin-top:14px">' + c.inquiry + '</div>' +
      '</div>' +
    '</div>' +

    /* ---- 자동 판정 ---- */
    '<div class="ai-brief">' +
      '<div class="ai-brief-top"></div>' +
      '<div class="ai-brief-head">' +
        '<span class="ai-badge"><span class="dot"></span>자동 조회 결과</span>' +
        '<h2>담당자 판단 지원 요약</h2>' +
        '<span class="ai-brief-meta">' + v.code + ' · ' + p.no + '</span>' +
      '</div>' +
      '<div class="ai-brief-body">' +
        '<div class="ai-verdict ' + v.level + '">' + VERDICT_ICON[v.level] + v.title + '</div>' +
        '<div class="ai-summary">' + esc(v.reason) + ' 아래 이용권 상태와 다운로드 이력을 확인한 뒤 <b>폐기·환불 가능 여부는 담당자가 최종 판단</b>합니다.</div>' +
        '<div class="ai-cols">' +
          '<div class="ai-col actions">' +
            '<div class="ai-col-title">조회로 확인된 사실</div>' +
            '<ul class="ai-list">' + facts.map((f, i) => '<li><span class="num">' + (i + 1) + '</span>' + f + '</li>').join('') + '</ul>' +
          '</div>' +
          '<div class="ai-col problems">' +
            '<div class="ai-col-title">담당자 확인 필요</div>' +
            '<ul class="ai-list">' + c.checks.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ---- 이용권 상태 ---- */
    '<div class="card mb12">' +
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-title">이용권 상태</div>' +
          '<div class="card-description">크레마클럽 관리프로그램 &gt; 이용권 관리 &gt; 이용권 목록과 동일 항목</div>' +
        '</div>' +
        '<span class="src-tag">crema · pass_master + pass_status</span>' +
      '</div>' +
      '<div class="card-content">' +
        '<div class="kv-grid">' +
          kv('이용권', esc(p.name) + ' <span class="pill">' + p.type + '</span>') +
          kv('이용권 번호', '<span class="mono">' + p.no + '</span>') +
          kv('등록 여부', p.registered
            ? '<span class="status-badge status-selling">등록</span><span class="sub">' + p.registeredAt + '</span>'
            : '<span class="status-badge status-low">미등록</span><span class="sub">등록 이력 없음</span>') +
          kv('이용 상태', '<span class="status-badge ' + STATUS_CLASS[p.statusKind] + '">' + STATUS_LABEL[p.statusKind] + '</span>') +
          kv('다운로드 이력', dl.length
            ? '<span class="badge badge-danger">있음 · ' + dl.length + '건</span><span class="sub">최근 ' + dl[dl.length - 1].at + '</span>'
            : '<span class="badge badge-success">없음</span><span class="sub">이용권 등록 후 다운로드 0건</span>') +
          kv('등록일', p.registered ? '<span class="mono">' + p.registeredAt + '</span>' : '<span class="sub">-</span>') +
          kv('유효기간', p.registered
            ? '<span class="mono">' + p.startAt + ' ~ ' + p.endAt + '</span>'
            : '<span class="mono">' + p.endAt + '</span> <span class="sub">까지 등록 가능</span>') +
          kv('지급/구매 경로', esc(p.route) + (p.amount ? ' <span class="sub">· ' + p.amount.toLocaleString() + '원 (' + p.orderNo + ')</span>' : ' <span class="sub">· 결제금액 없음</span>')) +
        '</div>' +

        '<div class="sub-head mt16">이용권 진행 이력</div>' +
        '<div class="tl">' + steps.map(s =>
          '<div class="tl-step ' + s.cls + '"><div class="tl-bar"></div><div class="tl-dot"></div>' +
          '<div class="tl-label">' + s.label + '</div><div class="tl-date">' + s.date + '</div></div>').join('') +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ---- 다운로드 이력 ---- */
    '<div class="card mb12">' +
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-title">이 이용권으로 다운로드한 도서</div>' +
          '<div class="card-description">환불 예외 처리 판단의 핵심 근거입니다.</div>' +
        '</div>' +
        '<span class="src-tag">crema · download_log</span>' +
      '</div>' +
      '<div class="card-content">' +
        '<div class="tbl-wrap"><table class="tbl">' +
          '<thead><tr><th style="width:44px">#</th><th>도서명</th><th style="width:150px">다운로드 일시</th><th style="width:180px">기기</th><th style="width:110px">상품번호</th></tr></thead>' +
          '<tbody>' + dlRows + '</tbody>' +
        '</table></div>' +
      '</div>' +
    '</div>' +

    /* ---- 보유 이용권 목록 ---- */
    '<div class="card mb12">' +
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-title">회원 보유 이용권 ' + c.passes.length + '건</div>' +
          '<div class="card-description">행을 클릭하면 위 상세가 해당 이용권 기준으로 바뀝니다.</div>' +
        '</div>' +
        '<span class="src-tag">crema · pass_master</span>' +
      '</div>' +
      '<div class="card-content">' +
        '<div class="tbl-wrap"><table class="tbl" id="passTbl">' +
          '<thead><tr><th style="width:170px">이용권 번호</th><th>이용권</th><th style="width:90px">유형</th><th style="width:110px">등록일</th><th style="width:100px">이용 상태</th><th style="width:90px">다운로드</th><th style="width:170px">자동 판정</th></tr></thead>' +
          '<tbody>' + passRows + '</tbody>' +
        '</table></div>' +
      '</div>' +
    '</div>' +

    /* ---- CS 답변용 요약 ---- */
    '<div class="card">' +
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-title">CS 처리 메모용 요약</div>' +
          '<div class="card-description">복사해서 상담 이력·답변 초안에 그대로 붙여 넣을 수 있습니다.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-content">' +
        '<div class="copy-box">' +
          '<button class="btn btn-outline btn-sm" id="btnCopy">복사</button>' +
          '<pre id="summaryText">' + esc(summaryText) + '</pre>' +
        '</div>' +
        '<div class="notice">조회 전용 화면입니다. 실제 폐기·환불 처리는 기존 크레마클럽 관리프로그램에서 담당자가 수행합니다.</div>' +
      '</div>' +
    '</div>';

  $$('#passTbl tbody tr.clickable').forEach(tr => tr.addEventListener('click', () => {
    state.passIdx = Number(tr.dataset.pass);
    renderResult();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  const btnCopy = $('#btnCopy');
  if (btnCopy) btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(summaryText).then(() => {
      btnCopy.textContent = '복사됨';
      setTimeout(() => { btnCopy.textContent = '복사'; }, 1500);
    });
  });
}

function kv(label, value) {
  return '<div class="kv-row"><div class="kv-label">' + label + '</div><div class="kv-value">' + value + '</div></div>';
}

/* ---------------- 조회 ---------------- */
function findCase(q) {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  return CASES.find(c =>
    c.cs.toLowerCase() === s ||
    c.member.id.toLowerCase() === s ||
    c.member.no === s ||
    c.passes.some(p => p.no.toLowerCase() === s)
  ) || null;
}

function search(q) {
  const found = findCase(q);
  $('#err').classList.add('hidden');
  if (!found) {
    $('#resultBox').classList.add('hidden');
    $('#loadingBox').classList.add('hidden');
    $('#emptyBox').classList.remove('hidden');
    $('#err').textContent = '조회 결과가 없습니다. 샘플 칩의 값으로 조회해 주세요.';
    $('#err').classList.remove('hidden');
    return;
  }
  $('#emptyBox').classList.add('hidden');
  $('#resultBox').classList.add('hidden');
  $('#loadingBox').classList.remove('hidden');

  const msgs = ['크레마클럽 이용권 정보를 조회하는 중…', '이용권 등록·사용 상태를 확인하는 중…', '도서 다운로드 이력을 확인하는 중…'];
  let i = 0;
  const t = setInterval(() => { i++; if (msgs[i]) $('#loadMsg').textContent = msgs[i]; }, 420);

  setTimeout(() => {
    clearInterval(t);
    $('#loadMsg').textContent = msgs[0];
    state.case = found;
    state.passIdx = 0;
    $('#loadingBox').classList.add('hidden');
    $('#resultBox').classList.remove('hidden');
    renderResult();
  }, 1300);
}

/* ---------------- 큐 / 기준 뷰 ---------------- */
function renderQueue() {
  const kpis = [
    { h: '오늘 접수 (폐기·환불)', n: CASES.length + 7, u: '건', s: 'AI 문의 분류 자동 선별' },
    { h: '자동 조회 완료', n: CASES.length + 7, u: '건', s: '접수 후 평균 4초 내 조회', badge: '100%' },
    { h: '담당자 판단 대기', n: 5, u: '건', s: '판정 결과 확인 후 처리 필요' },
    { h: '건당 관리자 조회 시간', n: 0, u: '분', s: '기존 평균 3분 12초 → 자동 조회', delta: "▼ 3분 12초" }
  ];
  $('#queueKpi').innerHTML = kpis.map(k =>
    '<div class="stat-card">' +
      '<div class="stat-head"><h4>' + k.h + '</h4>' + (k.badge ? '<span class="badge badge-success">' + k.badge + '</span>' : '') + '</div>' +
      '<div class="stat-num">' + k.n + '<span class="unit">' + k.u + '</span></div>' +
      '<div class="stat-sub">' + (k.delta ? '<span class="delta up">' + k.delta + '</span> ' : '') + k.s + '</div>' +
    '</div>').join('');

  $('#queueTbl').innerHTML =
    '<thead><tr><th style="width:170px">접수번호</th><th style="width:140px">접수일시</th><th style="width:150px">회원</th><th>문의 요약</th><th style="width:100px">이용권</th><th style="width:170px">자동 판정</th><th style="width:110px">상태</th></tr></thead>' +
    '<tbody>' + CASES.map(c => {
      const j = judge(c.passes[0]);
      const multi = c.passes.length > 1;
      return '<tr class="clickable" data-cs="' + c.cs + '">' +
        '<td class="mono nowrap">' + c.cs + '</td>' +
        '<td class="mono nowrap dim">' + c.csAt + '</td>' +
        '<td class="nowrap">' + c.member.name + ' <span class="dim mono" style="font-size:11.5px">' + c.member.id + '</span></td>' +
        '<td>' + c.inquiry.replace(/<\/?b>/g, '') + '</td>' +
        '<td class="num">' + c.passes.length + '건</td>' +
        '<td><span class="badge badge-' + (j.level === 'good' ? 'success' : j.level === 'warn' ? 'warning' : 'danger') + '">' + (multi ? '이용권별 상이' : j.title) + '</span></td>' +
        '<td><span class="pill">판단 대기</span></td>' +
      '</tr>';
    }).join('') + '</tbody>';

  $$('#queueTbl tbody tr').forEach(tr => tr.addEventListener('click', () => {
    setMode('cs');
    $('#q').value = tr.dataset.cs;
    switchView('lookup');
    search(tr.dataset.cs);
  }));
}

function renderRules() {
  $('#rulesTbl').innerHTML =
    '<thead><tr><th style="width:70px">규칙</th><th style="width:330px">조건</th><th style="width:180px">자동 판정</th><th>담당자 안내</th></tr></thead>' +
    '<tbody>' + RULES.map(r =>
      '<tr><td class="rule-code">' + r.code + '</td><td>' + r.cond + '</td>' +
      '<td><span class="badge badge-' + (r.level === 'good' ? 'success' : r.level === 'warn' ? 'warning' : 'danger') + '">' + r.verdict + '</span></td>' +
      '<td class="dim">' + r.guide + '</td></tr>').join('') + '</tbody>';

  $('#srcTbl').innerHTML =
    '<thead><tr><th style="width:250px">필요 항목</th><th style="width:250px">예상 소스</th><th>비고</th></tr></thead>' +
    '<tbody>' + SOURCES.map(s =>
      '<tr><td>' + s.item + '</td><td><span class="src-tag">' + s.src + '</span></td><td class="dim">' + s.note + '</td></tr>').join('') + '</tbody>';
}

/* ---------------- 뷰 전환 ---------------- */
const VIEW_META = {
  lookup: { title: '이용권 상태 조회', sub: '크레마클럽 이용권 폐기·환불 문의 접수 시, 담당자 판단에 필요한 이용권 상태와 다운로드 이력을 한 화면에서 확인합니다.' },
  queue: { title: '문의 접수 큐', sub: 'AI 문의 분류가 “크레마클럽 이용권 폐기·환불”로 판정한 건과 자동 조회 결과입니다.' },
  rules: { title: '자동 판정 기준', sub: '자동 조회 결과에 붙는 참고 판정의 규칙과, 화면 구성에 필요한 연동 데이터입니다.' }
};

function switchView(name) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  $$('.nav-item-btn[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  $('#crumb').textContent = VIEW_META[name].title;
  $('#pageTitle').textContent = VIEW_META[name].title;
  $('#pageSubtitle').textContent = VIEW_META[name].sub;
  window.scrollTo({ top: 0 });
}

const PLACEHOLDER = { member: '회원 ID 또는 회원번호', pass: '이용권 번호 (CRM-....)', cs: 'CS 접수번호 (CS-........-....)' };
const SAMPLES = {
  member: CASES.map(c => c.member.id),
  pass: CASES.map(c => c.passes[0].no),
  cs: CASES.map(c => c.cs)
};

function setMode(mode) {
  state.mode = mode;
  $$('#seg button').forEach(b => b.classList.toggle('on', b.dataset.key === mode));
  $('#q').placeholder = PLACEHOLDER[mode];
  $('#chips').innerHTML = '<span class="label">샘플</span>' +
    SAMPLES[mode].map(v => '<button class="chip" data-v="' + v + '">' + v + '</button>').join('');
  $$('#chips .chip').forEach(b => b.addEventListener('click', () => { $('#q').value = b.dataset.v; search(b.dataset.v); }));
}

/* ---------------- 초기화 ---------------- */
document.getElementById('themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  document.getElementById('iconMoon').classList.toggle('hidden', dark);
  document.getElementById('iconSun').classList.toggle('hidden', !dark);
});

$$('.nav-item-btn[data-view]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); switchView(a.dataset.view); }));
$$('#seg button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.key)));
$('#btnSearch').addEventListener('click', () => search($('#q').value));
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') search($('#q').value); });
$('#btnReset').addEventListener('click', () => {
  $('#q').value = '';
  $('#err').classList.add('hidden');
  $('#resultBox').classList.add('hidden');
  $('#loadingBox').classList.add('hidden');
  $('#emptyBox').classList.remove('hidden');
});

setMode('member');
renderQueue();
renderRules();
