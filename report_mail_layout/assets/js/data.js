/* =========================================================
   리포트 발송 메일 레이아웃 관리 — POC 목업 데이터
   · 모든 데이터는 목업이며 API 호출은 하지 않는다.
   · SAMPLE_BODIES / 스냅샷 HTML 안의 인라인 hex 색상은 의도적이다.
     메일 클라이언트는 CSS 변수를 지원하지 않으므로 실제 서비스
     (AiBookDetectReportService 등)도 동일하게 인라인 스타일을 쓴다.
   ========================================================= */

/* ---------------- 기준 시각 ---------------- */
const TODAY = '2026-09-07';
const NOW_LABEL = '2026-09-07 13:20';

/* ---------------- 헤더 강조색 팔레트 ----------------
   실제 구현에서는 report_mail_layout.header_accent 에 키를 저장하고
   서버 합성기가 hex 로 바꾼다. 본문 표에는 적용되지 않는다.        */
const ACCENTS = [
  { key: 'slate', hex: '#3f4753', label: '그레이' },
  { key: 'blue', hex: '#2563eb', label: '블루' },
  { key: 'red', hex: '#d6304a', label: '레드' },
  { key: 'amber', hex: '#b26a00', label: '앰버' },
  { key: 'violet', hex: '#6d3bd6', label: '바이올렛' }
];

/* ---------------- 치환 변수 목록 (편집기 상단 칩) ---------------- */
const VARS = [
  { k: 'jobName', d: '작업명' },
  { k: 'baseDate', d: '기준일 (yyyy-MM-dd)' },
  { k: 'yyyy', d: '연' },
  { k: 'MM', d: '월(2자리)' },
  { k: 'dd', d: '일(2자리)' },
  { k: 'M', d: '월' },
  { k: 'D', d: '일' },
  { k: 'period', d: '집계 기간' },
  { k: 'rowCount', d: '본문 행 수' },
  { k: 'sentAt', d: '발송 시각' },
  { k: 'siteUrl', d: 'AX-Labs 화면 링크' }
];

/* =========================================================
   공용 레이아웃 (report.report_mail_layout)
   ========================================================= */
const LAYOUTS = [
  {
    id: 1,
    name: '기본 리포트',
    desc: '정기 업무 리포트용 표준 껍데기. 담백한 헤더와 자동 발송 안내 푸터만 둔다.',
    isDefault: true,
    subjectTpl: '[업무] {{M}}월 {{D}}일 {{jobName}}',
    fromName: 'AX-Labs_레포트',
    fromAddress: 'ax-labs-report@yes24.com',
    headerTitleTpl: '{{jobName}}',
    headerSubtitleTpl: '{{baseDate}} 기준 · 총 {{rowCount}}건',
    headerLogo: true,
    headerAccent: 'slate',
    introBlocks: [],
    outroBlocks: [
      { type: 'cta', label: 'AX-Labs에서 상세 보기', url: '{{siteUrl}}' }
    ],
    footerTextTpl: '본 메일은 AX-Labs 리포트 스케줄러가 {{sentAt}}에 자동 발송했습니다. 회신하지 마세요.',
    footerContact: '문의 · AX개발팀 ax-labs@yes24.com',
    footerUnsub: false
  },
  {
    id: 2,
    name: '알림 · 경보',
    desc: '즉시 조치가 필요한 알림용. 빨간 강조 헤더와 "확인 후 처리" 콜아웃이 기본으로 붙는다.',
    isDefault: false,
    subjectTpl: '[AX-Labs] {{jobName}} — {{rowCount}}건',
    fromName: 'AX-Labs 알림',
    fromAddress: 'ax-labs@yes24.com',
    headerTitleTpl: '{{jobName}}',
    headerSubtitleTpl: '{{sentAt}} 감지 · 확인이 필요합니다',
    headerLogo: true,
    headerAccent: 'red',
    introBlocks: [
      { type: 'callout', tone: 'danger', text: '아래 건은 담당자 확인이 필요합니다. 처리 후 AX-Labs 화면에서 상태를 갱신해 주세요.' }
    ],
    outroBlocks: [
      { type: 'cta', label: '지금 확인하기', url: '{{siteUrl}}' }
    ],
    footerTextTpl: '알림 주기·수신자 변경은 리포트 스케줄 관리 화면에서 조정할 수 있습니다.',
    footerContact: '문의 · AX개발팀 ax-labs@yes24.com',
    footerUnsub: true
  },
  {
    id: 3,
    name: '주간 · 월간 요약',
    desc: '경영진·조직장 배포용. 파란 헤더에 기간 표기를 크게 잡고 인사말과 CTA를 함께 둔다.',
    isDefault: false,
    subjectTpl: '[{{jobName}}] {{period}}',
    fromName: 'AX-Labs_레포트',
    fromAddress: 'ax-labs-report@yes24.com',
    headerTitleTpl: '{{jobName}}',
    headerSubtitleTpl: '{{period}} · {{rowCount}}개 항목',
    headerLogo: true,
    headerAccent: 'blue',
    introBlocks: [
      { type: 'text', text: '안녕하세요. {{period}} AX-Labs 집계 결과를 공유드립니다.' }
    ],
    outroBlocks: [
      { type: 'text', text: '수치 정의와 원본 데이터는 AX-Labs 화면에서 확인하실 수 있습니다.' },
      { type: 'cta', label: '대시보드 열기', url: '{{siteUrl}}' }
    ],
    footerTextTpl: '본 메일은 AX-Labs 리포트 스케줄러가 {{sentAt}}에 자동 발송했습니다.',
    footerContact: '문의 · AX개발팀 ax-labs@yes24.com',
    footerUnsub: false
  }
];

/* =========================================================
   발송 메일(스케줄) — report.report_schedule
   layoutId + override(키 단위 부분 오버라이드)
   ========================================================= */
const SCHEDULES = [
  {
    id: 24, name: 'AI 추정 전자책 일별 리스트', cron: '매일 08:10', cronRaw: '10 8 * * *',
    format: 'HTML', active: false, endpoint: 'api/reports/ai-book-detect', lastRun: null, lastStatus: null,
    bodyKey: 'aiBookDetect', layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '41', siteUrl: 'https://ax-labs.yes24.com/AiBookDetect' },
    override: {
      subjectTpl: '[업무] {{M}}월 {{D}}일 AI 추정 전자책 리스트',
      outroBlocks: [
        { type: 'callout', tone: 'info', text: '① 은 정산처 번호 규칙으로 확정된 건이라 검수 없이 영업프로그램에서 AI 활용 Y 반영 대상입니다. ② 는 AI가 문맥 판정한 결과이므로 검수 후 반영하고, ③ 은 AI가 판단을 유보했거나 호출이 실패한 건입니다.' },
        { type: 'cta', label: 'AI 추정 전자책 화면에서 검수하기', url: '{{siteUrl}}' }
      ]
    }
  },
  {
    id: 23, name: '알라딘 신간 미등록 모니터링', cron: '평일 15:50', cronRaw: '50 15 * * 1-5',
    format: 'HTML', active: true, endpoint: 'api/reports/aladin-newbook', lastRun: '2026-09-04 15:50', lastStatus: 'SUCCESS',
    bodyKey: 'aladinNewbook', layoutId: 1,
    vars: { period: '2026-09-04', rowCount: '18', siteUrl: 'https://ax-labs.yes24.com/AladinNewBook' },
    override: { subjectTpl: '[업무] {{M}}월 {{D}}일 알라딘 모니터링' }
  },
  {
    id: 22, name: '크레마클럽 이용권 처리 완료 회신', cron: '평일 09:00, 09:30, 10:00, 10:30 외 16회', cronRaw: '0,30 9-17 * * 1-5',
    format: 'HTML', active: false, endpoint: 'api/reports/crema-voucher-cs-alert', lastRun: '2026-08-31 14:30', lastStatus: 'SUCCESS',
    bodyKey: 'cremaVoucher', layoutId: 2,
    vars: { period: '2026-08-31', rowCount: '6', siteUrl: 'https://ax-labs.yes24.com/CremaVoucherCs' },
    override: {
      introBlocks: [
        { type: 'text', text: 'CS 처리가 완료되어 회신 대상으로 넘어온 건입니다. 고객 안내 문구는 아래 표의 "처리 결과" 열을 그대로 사용해 주세요.' }
      ]
    }
  },
  {
    id: 21, name: '크레마클럽 이용권 문의 알림', cron: '평일 09:00, 09:30, 10:00, 10:30 외 16회', cronRaw: '0,30 9-17 * * 1-5',
    format: 'HTML', active: false, endpoint: 'api/reports/crema-voucher-alert', lastRun: '2026-08-31 14:30', lastStatus: 'SUCCESS',
    bodyKey: 'cremaVoucher', layoutId: 2,
    vars: { period: '2026-08-31', rowCount: '6', siteUrl: 'https://ax-labs.yes24.com/CremaVoucher' },
    override: { subjectTpl: '[AX-Labs] 크레마클럽 이용권 문의 신규 {{rowCount}}건' }
  },
  {
    id: 20, name: '월간 AX 통계 리포트', cron: '매월 첫 번째 월요일 08:00', cronRaw: '0 8 1-7 * 1',
    format: 'HTML', active: true, endpoint: 'api/reports/access-log-v2', lastRun: '2026-09-07 08:00', lastStatus: 'SUCCESS',
    bodyKey: 'accessLogV2', layoutId: 3,
    vars: { period: '2026-08-01 ~ 2026-08-31', rowCount: '12', siteUrl: 'https://ax-labs.yes24.com/AccessStats' },
    override: {
      headerTitleTpl: 'AX-Labs 접속 통계 리포트 V2',
      outroBlocks: [
        { type: 'text', text: '본부별 상세와 활동 점수 리더보드는 대시보드에서 기간을 바꿔 조회할 수 있습니다.' },
        { type: 'cta', label: '월간 통계 대시보드 열기', url: '{{siteUrl}}' }
      ]
    }
  },
  {
    id: 19, name: '주간 AX 통계 리포트', cron: '매주 월요일 09:00', cronRaw: '0 9 * * 1',
    format: 'HTML', active: false, endpoint: 'api/reports/access-log-v2', lastRun: null, lastStatus: null,
    bodyKey: 'accessLogV2', layoutId: 3,
    vars: { period: '2026-08-31 ~ 2026-09-06', rowCount: '12', siteUrl: 'https://ax-labs.yes24.com/AccessStats' },
    override: {}
  },
  {
    id: 18, name: '서비스 헬스 경보 다이제스트', cron: '15분마다', cronRaw: '*/15 * * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/labs-health-alert', lastRun: '2026-09-07 12:45', lastStatus: 'SUCCESS',
    bodyKey: 'healthAlert', layoutId: 2,
    vars: { period: '최근 15분', rowCount: '3', siteUrl: 'https://ax-labs.yes24.com/HealthMonitor' },
    override: {
      subjectTpl: '[경보] {{jobName}} — 이상 {{rowCount}}건',
      footerTextTpl: '15분 주기 자동 점검 결과입니다. 동일 경보가 3회 연속 감지되면 담당자에게 별도 호출이 발생합니다.'
    }
  },
  {
    id: 17, name: '크롤러 센티널 개편 의심 알림', cron: '매일 07:30', cronRaw: '30 7 * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/crawl-sentinel', lastRun: '2026-09-07 07:30', lastStatus: 'SUCCESS',
    bodyKey: 'crawlSentinel', layoutId: 2,
    vars: { period: '2026-09-06', rowCount: '2', siteUrl: 'https://ax-labs.yes24.com/CrawlSentinel' },
    override: {}
  },
  {
    id: 16, name: '경쟁사 전자책 베스트 미등록 알림', cron: '매일 10:00', cronRaw: '0 10 * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/ebookbest-alert', lastRun: '2026-09-07 10:00', lastStatus: 'SUCCESS',
    bodyKey: 'aladinNewbook', layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '23', siteUrl: 'https://ax-labs.yes24.com/EbookBest' },
    override: {}
  },
  {
    id: 15, name: '작가 부고 알림 메일', cron: '매일 09:30', cronRaw: '30 9 * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/deceased-author', lastRun: '2026-09-07 09:30', lastStatus: 'SUCCESS',
    bodyKey: 'deceasedAuthor', layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '2', siteUrl: 'https://ax-labs.yes24.com/DeceasedAuthor' },
    override: {
      introBlocks: [
        { type: 'callout', tone: 'warn', text: '기획전·홍보 노출 검토 전 반드시 유족·출판사 확인을 거쳐 주세요. 본 목록은 공개 뉴스 기반 자동 수집 결과입니다.' }
      ]
    }
  },
  {
    id: 14, name: '앱 리뷰 감정·이슈유형 분류', cron: '매일 2시간마다 30분', cronRaw: '30 */2 * * *',
    format: 'PROCESS', active: true, endpoint: 'api/reports/app-review-classify-sweep', lastRun: '2026-09-07 12:30', lastStatus: 'SUCCESS',
    bodyKey: null, layoutId: 1,
    vars: { period: '2026-09-07', rowCount: '0', siteUrl: 'https://ax-labs.yes24.com/AppReview' },
    override: {}
  },
  {
    id: 13, name: '[TEST] 앱 리뷰 현황 - 티켓', cron: '매주 월요일 08:00', cronRaw: '0 8 * * 1',
    format: 'HTML', active: false, endpoint: 'api/reports/app-review-status', lastRun: '2026-07-27 08:00', lastStatus: 'SUCCESS',
    bodyKey: 'appReviewStatus', layoutId: 3,
    vars: { period: '2026-07-20 ~ 2026-07-26', rowCount: '9', siteUrl: 'https://ax-labs.yes24.com/AppReview' },
    override: {}
  },
  {
    id: 12, name: '앱 리뷰 주간 리포트 (PDF)', cron: '매주 월요일 08:30', cronRaw: '30 8 * * 1',
    format: 'PDF', active: true, endpoint: 'api/reports/app-review', lastRun: '2026-09-07 08:30', lastStatus: 'SUCCESS',
    bodyKey: 'appReviewStatus', layoutId: 3,
    vars: { period: '2026-08-31 ~ 2026-09-06', rowCount: '9', siteUrl: 'https://ax-labs.yes24.com/AppReview' },
    override: {}
  },
  {
    id: 11, name: '경쟁사 앱 평점 모니터링', cron: '매일 11:00', cronRaw: '0 11 * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/competitor-app-rating', lastRun: '2026-09-07 11:00', lastStatus: 'SUCCESS',
    bodyKey: 'competitorRating', layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '5', siteUrl: 'https://ax-labs.yes24.com/CompetitorApp' },
    override: {}
  },
  {
    id: 10, name: 'YES24 일간 요약 페이지 생성', cron: '매일 06:30', cronRaw: '30 6 * * *',
    format: 'GENERATE', active: true, endpoint: 'api/reports/daily-yes24-summary', lastRun: '2026-09-07 06:30', lastStatus: 'SUCCESS',
    bodyKey: null, layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '0', siteUrl: 'https://ax-labs.yes24.com/DailySummary' },
    override: {}
  },
  {
    id: 9, name: '데일리 인사이트 브리핑', cron: '매일 07:00', cronRaw: '0 7 * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/daily-insight', lastRun: '2026-09-07 07:00', lastStatus: 'SUCCESS',
    bodyKey: 'dailyInsight', layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '7', siteUrl: 'https://ax-labs.yes24.com/DailyInsight' },
    override: {}
  },
  {
    id: 8, name: '문의 VOC 주간 리포트', cron: '매주 금요일 16:00', cronRaw: '0 16 * * 5',
    format: 'HTML', active: true, endpoint: 'api/reports/inquiry-voc', lastRun: '2026-09-05 16:00', lastStatus: 'SUCCESS',
    bodyKey: 'inquiryVoc', layoutId: 3,
    vars: { period: '2026-08-31 ~ 2026-09-05', rowCount: '14', siteUrl: 'https://ax-labs.yes24.com/InquiryVoc' },
    override: {}
  },
  {
    id: 7, name: '접속 통계 리포트 (V1)', cron: '매주 월요일 09:00', cronRaw: '0 9 * * 1',
    format: 'HTML', active: false, endpoint: 'api/reports/access-log', lastRun: '2026-05-12 09:00', lastStatus: 'SUCCESS',
    bodyKey: 'accessLogV2', layoutId: 1,
    vars: { period: '2026-05-05 ~ 2026-05-11', rowCount: '12', siteUrl: 'https://ax-labs.yes24.com/AccessStats' },
    override: {}
  },
  {
    id: 6, name: '앱 리뷰 현황 일간', cron: '매일 09:00', cronRaw: '0 9 * * *',
    format: 'HTML', active: true, endpoint: 'api/reports/app-review-status', lastRun: '2026-09-07 09:00', lastStatus: 'SUCCESS',
    bodyKey: 'appReviewStatus', layoutId: 1,
    vars: { period: '2026-09-06', rowCount: '9', siteUrl: 'https://ax-labs.yes24.com/AppReview' },
    override: {}
  },
  {
    id: 5, name: '[TEST] 알라딘 신간 모니터링', cron: '매일 16:30', cronRaw: '30 16 * * *',
    format: 'HTML', active: false, endpoint: 'api/reports/aladin-newbook', lastRun: '2026-06-18 16:30', lastStatus: 'FAIL',
    bodyKey: 'aladinNewbook', layoutId: 1,
    vars: { period: '2026-06-17', rowCount: '18', siteUrl: 'https://ax-labs.yes24.com/AladinNewBook' },
    override: {}
  },
  {
    id: 4, name: '서비스 헬스 일간 요약', cron: '매일 08:00', cronRaw: '0 8 * * *',
    format: 'HTML', active: false, endpoint: 'api/reports/labs-health-alert', lastRun: '2026-08-12 08:00', lastStatus: 'SUCCESS',
    bodyKey: 'healthAlert', layoutId: 2,
    vars: { period: '2026-08-11', rowCount: '3', siteUrl: 'https://ax-labs.yes24.com/HealthMonitor' },
    override: {}
  },
  {
    id: 3, name: '작가 부고 알림 (주간)', cron: '매주 목요일 10:00', cronRaw: '0 10 * * 4',
    format: 'HTML', active: false, endpoint: 'api/reports/deceased-author', lastRun: null, lastStatus: null,
    bodyKey: 'deceasedAuthor', layoutId: 3,
    vars: { period: '2026-08-31 ~ 2026-09-06', rowCount: '2', siteUrl: 'https://ax-labs.yes24.com/DeceasedAuthor' },
    override: {}
  },
  {
    id: 2, name: '[TEST] 접속 통계 V2', cron: '매일 23:00', cronRaw: '0 23 * * *',
    format: 'HTML', active: false, endpoint: 'api/reports/access-log-v2', lastRun: '2026-04-02 23:00', lastStatus: 'SUCCESS',
    bodyKey: 'accessLogV2', layoutId: 1,
    vars: { period: '2026-04-01', rowCount: '12', siteUrl: 'https://ax-labs.yes24.com/AccessStats' },
    override: {}
  },
  {
    id: 1, name: '[TEST] 데일리 인사이트', cron: '매일 07:30', cronRaw: '30 7 * * *',
    format: 'HTML', active: false, endpoint: 'api/reports/daily-insight', lastRun: '2026-03-11 07:30', lastStatus: 'FAIL',
    bodyKey: 'dailyInsight', layoutId: 1,
    vars: { period: '2026-03-10', rowCount: '7', siteUrl: 'https://ax-labs.yes24.com/DailyInsight' },
    override: {}
  }
];

/* =========================================================
   본문 샘플 — 각 리포트 서비스의 BuildHtml 결과를 본뜬 HTML
   실제 구현에서는 이 자리에 api/reports/* dry-run 응답이 들어온다.
   ========================================================= */
const TD = 'padding:6px 7px;border-bottom:1px solid #eef1f5;vertical-align:top;';
const TH = 'text-align:left;padding:6px 7px;border-bottom:1px solid #e2e6ec;font-weight:600;white-space:nowrap;';

function sumBox(inner) {
  return '<div style="margin-bottom:14px;padding:10px 12px;border:1px solid #e2e6ec;border-radius:6px;">' + inner + '</div>';
}
function secHead(title, count, accent) {
  return '<h3 style="font-size:14px;margin:18px 0 8px;padding-left:8px;border-left:4px solid ' + accent + ';">' +
    title + ' <span style="color:#6b7280;font-weight:normal;">(' + count + '건)</span></h3>';
}
function tbl(heads, rows) {
  let s = '<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f4f6f9;">';
  heads.forEach(h => { s += '<th style="' + TH + '">' + h + '</th>'; });
  s += '</tr></thead><tbody>';
  rows.forEach(r => {
    s += '<tr>';
    r.forEach(c => { s += '<td style="' + TD + '">' + c + '</td>'; });
    s += '</tr>';
  });
  return s + '</tbody></table>';
}

const SAMPLE_BODIES = {
  aiBookDetect:
    sumBox('전일 신규 등록 <b>1,284</b>건 · 자동전환 대상 <b style="color:#d6304a;">12</b>건 · ' +
      'AI 추정 <b style="color:#b26a00;">21</b>건 · 확인 필요 <b>8</b>건<br />' +
      '<span style="color:#6b7280;font-size:12px;">키워드 후보 96건 중 AI 판정 Y 21건</span>') +
    secHead('① 자동전환 대상 — 지정 정산처/출판사 (AI 활용 Y 반영 대상)', 12, '#d6304a') +
    tbl(['상품번호', 'ebookCode', '상품명', '출판사', '정산처', '자동전환', 'AI 추정', '탐지 사유'], [
      ['<a href="#" style="color:#1a1d23;">148820371</a>', 'EB2609-0041', '생성형 AI로 쓰는 자기소개서', '북루덴스', 'AI북스', '<b style="color:#d6304a;">Y</b>', 'Y', '정산처 규칙'],
      ['<a href="#" style="color:#1a1d23;">148820402</a>', 'EB2609-0042', 'ChatGPT 실무 활용 100제', '디지털연구소', 'AI북스', '<b style="color:#d6304a;">Y</b>', 'Y', '정산처 규칙'],
      ['<a href="#" style="color:#1a1d23;">148820517</a>', 'EB2609-0047', '프롬프트 엔지니어링 입문', '테크노밸리', 'AI북스', '<b style="color:#d6304a;">Y</b>', 'Y', '출판사 규칙']
    ]) +
    secHead('② AI 추정 — 저자·상품소개 판정 (검수 후 반영)', 21, '#b26a00') +
    tbl(['상품번호', '상품명', '저자', 'AI 추정', '탐지 사유', '근거'], [
      ['<a href="#" style="color:#1a1d23;">148821004</a>', '하루 10분 영어회화 트레이닝', '김미정', 'Y', '저자 표기', '저자명에 "AI 편집부" 병기'],
      ['<a href="#" style="color:#1a1d23;">148821119</a>', '주식 차트 패턴 사전', '이도현', 'Y', '상품소개', '"AI가 분석한 3,000개 패턴" 문구'],
      ['<a href="#" style="color:#1a1d23;">148821203</a>', '초등 수학 문제집 6-2', '박서윤', 'Y', '상품소개', '"자동 생성 문항" 문구']
    ]) +
    secHead('③ 확인 필요 — 판정 유보·AI 판정 실패', 8, '#6b7280') +
    tbl(['상품번호', '상품명', '출판사', '사유'], [
      ['<a href="#" style="color:#1a1d23;">148821440</a>', '고전 문학 다시 읽기', '한울아카데미', 'LLM 호출 타임아웃'],
      ['<a href="#" style="color:#1a1d23;">148821502</a>', '나의 첫 캘리그라피', '오늘의책', '상품소개 미등록']
    ]),

  aladinNewbook:
    sumBox('알라딘 신간 <b>412</b>건 중 YES24 미등록 <b style="color:#d6304a;">18</b>건 · ' +
      '가격 불일치 <b style="color:#b26a00;">5</b>건<br />' +
      '<span style="color:#6b7280;font-size:12px;">ISBN 기준 대조 · 수집 2026-09-04 15:45</span>') +
    secHead('미등록 신간 — 즉시 등록 검토 대상', 18, '#d6304a') +
    tbl(['ISBN', '도서명', '저자', '출판사', '출간일', '알라딘가'], [
      ['9791161757', '북극에서 온 편지', '정하늘', '창비', '2026-09-03', '16,200원'],
      ['9788954699', '조용한 사람들의 힘', '문지현', '문학동네', '2026-09-03', '15,300원'],
      ['9791190090', '데이터로 읽는 도시', '강태우', '아카넷', '2026-09-02', '22,500원'],
      ['9788936438', '여름의 끝에서', '한유리', '민음사', '2026-09-02', '14,400원']
    ]),

  accessLogV2:
    sumBox('집계 기간 접속 <b>18,402</b>회 · 순 이용자 <b>412</b>명 · 전월 대비 <b style="color:#2563eb;">+12.4%</b><br />' +
      '<span style="color:#6b7280;font-size:12px;">AX 성숙도 평균 3.2 / 5.0 · 조직장 접속률 78%</span>') +
    secHead('본부별 트래픽', 6, '#2563eb') +
    tbl(['본부', '접속수', '순 이용자', '1인 평균', '전월 대비'], [
      ['콘텐츠사업본부', '5,821', '104', '56.0', '<span style="color:#2563eb;">+18.2%</span>'],
      ['플랫폼본부', '4,377', '88', '49.7', '<span style="color:#2563eb;">+9.1%</span>'],
      ['마케팅본부', '3,102', '76', '40.8', '<span style="color:#d6304a;">-3.4%</span>'],
      ['영업본부', '2,554', '71', '36.0', '<span style="color:#2563eb;">+22.6%</span>'],
      ['경영지원본부', '1,486', '48', '31.0', '<span style="color:#2563eb;">+4.8%</span>'],
      ['물류본부', '1,062', '25', '42.5', '<span style="color:#2563eb;">+31.0%</span>']
    ]) +
    secHead('활동 점수 리더보드 (상위 6팀)', 6, '#6b7280') +
    tbl(['순위', '팀', '활동 점수', '주요 활동'], [
      ['1', '전자책팀', '284', '리포트 조회 · 프롬프트 실행'],
      ['2', 'MD기획팀', '241', '콘텐츠 패키지 생성'],
      ['3', 'CS운영팀', '198', '이용권 CS 조회'],
      ['4', '데이터플랫폼팀', '176', '메트릭 카탈로그'],
      ['5', '앱개발팀', '154', '앱 리뷰 분류'],
      ['6', '광고사업팀', '131', '키워드 광고 분석']
    ]),

  cremaVoucher:
    sumBox('신규 문의 <b style="color:#d6304a;">6</b>건 · 처리 대기 <b>4</b>건 · 회신 완료 <b>2</b>건<br />' +
      '<span style="color:#6b7280;font-size:12px;">수집 구간 2026-08-31 14:00 ~ 14:30</span>') +
    secHead('이용권 폐기 · 환불 문의', 6, '#d6304a') +
    tbl(['CS번호', '접수시각', '회원', '이용권 번호', '유형', '처리 결과'], [
      ['CS-20260831-0142', '08-31 14:12', 'yehy**23', 'CRM-2608-8821-4417', '사은품', '<b style="color:#b26a00;">확인 필요</b>'],
      ['CS-20260831-0138', '08-31 14:08', 'leej**01', 'CRM-2607-5540-1182', '프로모션', '<b style="color:#d6304a;">환불 불가 안내</b>'],
      ['CS-20260831-0135', '08-31 14:02', 'parks**7', 'CRM-2608-9013-7725', '구매', '<b style="color:#2563eb;">폐기 · 환불 완료</b>']
    ]),

  healthAlert:
    sumBox('점검 대상 <b>14</b>개 · 정상 <b>11</b> · <b style="color:#d6304a;">이상 3</b><br />' +
      '<span style="color:#6b7280;font-size:12px;">최근 15분 구간 · 2026-09-07 12:45 기준</span>') +
    secHead('이상 감지', 3, '#d6304a') +
    tbl(['대상', '상태', '지표', '임계값', '지속'], [
      ['ax-labs-web (prod)', '<b style="color:#d6304a;">응답 지연</b>', 'p95 3.8s', '2.0s', '9분'],
      ['crawler-aladin', '<b style="color:#d6304a;">실패</b>', '연속 실패 4회', '3회', '22분'],
      ['report-dispatch queue', '<b style="color:#b26a00;">적체</b>', '대기 42건', '20건', '15분']
    ]),

  crawlSentinel:
    sumBox('감시 사이트 <b>8</b>곳 · 구조 변경 의심 <b style="color:#d6304a;">2</b>곳<br />' +
      '<span style="color:#6b7280;font-size:12px;">셀렉터 적중률 하락 기준 · 2026-09-06 수집분</span>') +
    secHead('개편 의심', 2, '#d6304a') +
    tbl(['사이트', '셀렉터', '적중률', '전일 대비', '수집 건수'], [
      ['알라딘 신간', '.ss_book_box .bo3', '41%', '<span style="color:#d6304a;">-52%p</span>', '171 / 412'],
      ['교보 베스트', 'ul.prod_list > li', '68%', '<span style="color:#d6304a;">-24%p</span>', '68 / 100']
    ]),

  deceasedAuthor:
    sumBox('신규 감지 <b style="color:#d6304a;">2</b>명 · 보유 도서 <b>37</b>종<br />' +
      '<span style="color:#6b7280;font-size:12px;">공개 뉴스 기반 자동 수집 · 확인 후 활용</span>') +
    secHead('신규 감지 작가', 2, '#6b7280') +
    tbl(['작가명', '작가번호', '보유 도서', '최근 판매', '출처'], [
      ['O O 수', '1102934', '21종', '2026-09-05', '연합뉴스 2026-09-06'],
      ['O 진 O', '884120', '16종', '2026-09-04', '한국일보 2026-09-06']
    ]),

  appReviewStatus:
    sumBox('신규 리뷰 <b>184</b>건 · 부정 <b style="color:#d6304a;">37</b>건 · 평균 평점 <b>3.9</b><br />' +
      '<span style="color:#6b7280;font-size:12px;">Google Play · App Store 합산</span>') +
    secHead('이슈 유형별 분포', 9, '#b26a00') +
    tbl(['이슈 유형', '건수', '비중', '평균 평점', '전주 대비'], [
      ['앱 실행 오류', '12', '32.4%', '1.4', '<span style="color:#d6304a;">+5</span>'],
      ['결제 실패', '8', '21.6%', '1.8', '<span style="color:#d6304a;">+3</span>'],
      ['배송 지연', '7', '18.9%', '2.1', '<span style="color:#2563eb;">-2</span>'],
      ['검색 품질', '5', '13.5%', '2.6', '<span style="color:#6b7280;">0</span>'],
      ['UI 불편', '5', '13.5%', '2.8', '<span style="color:#2563eb;">-1</span>']
    ]),

  competitorRating:
    sumBox('모니터링 앱 <b>5</b>종 · 평점 하락 <b style="color:#d6304a;">1</b>종<br />' +
      '<span style="color:#6b7280;font-size:12px;">Google Play 기준 · 2026-09-06 수집</span>') +
    secHead('경쟁사 앱 평점', 5, '#6b7280') +
    tbl(['앱', '평점', '리뷰수', '전일 대비', '순위'], [
      ['YES24 eBook', '4.2', '38,204', '<span style="color:#6b7280;">0.00</span>', '2'],
      ['밀리의 서재', '4.5', '52,118', '<span style="color:#2563eb;">+0.01</span>', '1'],
      ['리디북스', '4.1', '41,772', '<span style="color:#d6304a;">-0.02</span>', '3'],
      ['교보 eBook', '3.8', '19,044', '<span style="color:#6b7280;">0.00</span>', '4'],
      ['알라딘 eBook', '3.6', '11,388', '<span style="color:#2563eb;">+0.01</span>', '5']
    ]),

  dailyInsight:
    sumBox('어제 매출 <b>4.82억</b> · 전주 동요일 대비 <b style="color:#2563eb;">+7.1%</b> · 주문 <b>18,204</b>건<br />' +
      '<span style="color:#6b7280;font-size:12px;">AI 브리핑 7문단 · 2026-09-06 마감 기준</span>') +
    secHead('오늘의 인사이트', 7, '#6d3bd6') +
    '<div style="padding:10px 12px;border:1px solid #e2e6ec;border-radius:6px;font-size:13px;line-height:1.75;color:#1a1d23;">' +
    '<b>1.</b> 국내도서 신간 매대 유입이 전주 대비 14% 늘었고, 특히 에세이 카테고리가 견인했습니다.<br />' +
    '<b>2.</b> 전자책 단독 선출간 3종의 첫날 판매가 목표 대비 132%로 집계됐습니다.<br />' +
    '<b>3.</b> 모바일 앱 결제 실패 리뷰가 전일 8건 → 12건으로 증가해 확인이 필요합니다.' +
    '</div>',

  inquiryVoc:
    sumBox('문의 <b>1,204</b>건 · 주요 토픽 <b>14</b>개 · 부정 감정 비중 <b style="color:#d6304a;">18.2%</b><br />' +
      '<span style="color:#6b7280;font-size:12px;">1:1 문의 · 고객센터 상담 합산</span>') +
    secHead('토픽별 문의량 (상위 6)', 6, '#b26a00') +
    tbl(['토픽', '건수', '비중', '전주 대비', '부정 비중'], [
      ['배송 지연/누락', '284', '23.6%', '<span style="color:#d6304a;">+41</span>', '31.2%'],
      ['크레마클럽 이용권', '196', '16.3%', '<span style="color:#d6304a;">+22</span>', '24.5%'],
      ['전자책 다운로드', '154', '12.8%', '<span style="color:#2563eb;">-8</span>', '19.1%'],
      ['환불/취소', '132', '11.0%', '<span style="color:#6b7280;">+1</span>', '28.8%'],
      ['적립금/쿠폰', '118', '9.8%', '<span style="color:#2563eb;">-14</span>', '11.0%'],
      ['회원/로그인', '94', '7.8%', '<span style="color:#2563eb;">-3</span>', '14.9%']
    ])
};

/* 메일 본문이 없는 잡(처리 잡 / 페이지 생성)에 쓰는 안내 */
const NO_BODY_NOTICE =
  '<div style="padding:14px 16px;border:1px dashed #cbd2dc;border-radius:6px;color:#6b7280;font-size:13px;line-height:1.7;">' +
  '이 작업은 메일 본문을 만들지 않습니다 (처리 잡 · 페이지 생성). ' +
  '레이아웃은 저장되지만 발송에는 사용되지 않습니다.</div>';

/* =========================================================
   발송본 스냅샷 — report.report_schedule_run_artifact
   실제 구현에서는 rendered_subject / rendered_html 을 TEXT 로 저장한다.
   POC 는 "그때의 레이아웃"을 얼려두고 부팅 시 1회 합성한다(app.js).
   ========================================================= */
const LEGACY_LAYOUT_PATCH = {
  headerSubtitleTpl: '{{baseDate}} 기준',
  outroBlocks: [],
  footerTextTpl: '본 메일은 자동 발송되었습니다.',
  footerContact: ''
};

const RUN_SNAPSHOTS = {
  24: [
    { runAt: '2026-09-05 08:10', recipients: 14, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH },
    { runAt: '2026-09-04 08:10', recipients: 14, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }
  ],
  23: [
    { runAt: '2026-09-04 15:50', recipients: 9, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH },
    { runAt: '2026-09-03 15:50', recipients: 9, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }
  ],
  22: [{ runAt: '2026-08-31 14:30', recipients: 6, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  21: [{ runAt: '2026-08-31 14:30', recipients: 6, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  20: [{ runAt: '2026-09-07 08:00', recipients: 31, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  18: [
    { runAt: '2026-09-07 12:45', recipients: 5, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH },
    { runAt: '2026-09-07 12:30', recipients: 5, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }
  ],
  17: [{ runAt: '2026-09-07 07:30', recipients: 4, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  16: [{ runAt: '2026-09-07 10:00', recipients: 11, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  15: [{ runAt: '2026-09-07 09:30', recipients: 8, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  11: [{ runAt: '2026-09-07 11:00', recipients: 6, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  9: [{ runAt: '2026-09-07 07:00', recipients: 22, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  8: [{ runAt: '2026-09-05 16:00', recipients: 17, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }],
  6: [{ runAt: '2026-09-07 09:00', recipients: 7, status: 'SUCCESS', patch: LEGACY_LAYOUT_PATCH }]
};
