/* AI 사이트 관제 — 목업 데이터
   기준 시각 2026-09-15 17:13 KST · 기본 수집 구간 17:05~17:10 (지연 3분 반영, 시작 포함·종료 제외)
   실제 구현에서는 AX_DATAHUB tSiteMonitoringRun / Incident / Notice 조회 결과로 대체된다. */
window.SM_MOCK = {
  now: '2026-09-15 17:13',

  status: {
    normal: { enabled: true, fresh: true, window: '17:05 ~ 17:10', windowAgo: '3분 전', lastAi: '17:00 슬롯 (5건 분석)', nextAi: '17:15', notify: '초안 저장 · 메일 발송 꺼짐', trustMode: 'Unverified' },
    stale:  { enabled: true, fresh: false, window: '16:40 ~ 16:45', windowAgo: '28분 전', lastAi: '16:45 슬롯 (3건 분석)', nextAi: '17:15', notify: '초안 저장 · 메일 발송 꺼짐', trustMode: 'Unverified' }
  },

  kpi: {
    normal: { pc: 182430, mob: 241905, event: 12318, front: 184, datahub: 14, googlebot: 3920 },
    stale:  { pc: 176002, mob: null, event: 11874, front: 96, datahub: null, googlebot: 3511 }
  },

  incidents: [
    {
      id: 'INC-0915-031', site: 'MOBILE', kind: 'route404', sev: 'critical', open: true,
      rule: '지속 404 · 분산 패턴', title: '모바일 리뷰 경로 404 지속 — 분산 요청 패턴',
      sub: '/Goods/Review/ 접두 경로 · 연속 3개 구간 조건 충족',
      metric: '오류율 <b>62.4%</b> · 404 1,812건', firstDetected: '16:50', lastEval: '17:10',
      window: '16:55 ~ 17:10 (15분)',
      base: { requests: 2904, errors: 1812, errLabel: '404 오류', rate: 62.4, p95: 412 },
      route: {
        windows: [
          { t: '16:55~17:00', req: 948, e404: 571 },
          { t: '17:00~17:05', req: 972, e404: 606 },
          { t: '17:05~17:10', req: 984, e404: 635 }
        ],
        behavior: { uniqueIp: 1604, urls: 1377, maxIpErr: 38, chrome: 1740, noRef: 1698, ipRankOk: true }
      },
      geo: { kr: 214, ov: 1502, un: 96 },
      apm: { avgMs: 388, domain: '모바일 2000' },
      ai: {
        status: '완료', window: '17:10', analyzedAt: '17:15 슬롯 예정 · 직전 17:00 슬롯 분석',
        stale: true, verdict: 'bad',
        summary: '모바일 리뷰 경로에서 <b>15분간 404 비율이 60%대로 유지</b>되고 있으며, 오류가 다수 IP·다수 URL로 고르게 분산되어 있습니다. 해외 GeoIP 비중이 83%로 높습니다.',
        impactKnown: '리뷰 경로 요청의 약 62%가 404로 응답. 동일 구간 p95·Jennifer 평균 응답시간은 정상 범위.',
        impactUnknown: '실제 이용자 비중, 리뷰 화면 노출 실패 여부, 주문 전환 영향은 집계만으로 확인할 수 없음.',
        hypotheses: ['존재하지 않는 상품 번호를 순차·무작위로 조회하는 크롤링 가능성', '폐기된 리뷰 URL 형식을 참조하는 외부 링크 유입 가능성'],
        actions: ['Kibana 오류 로그에서 URL 패턴(상품번호 범위)과 User-Agent 분포 확인', '해외 대역 요청이 특정 ASN에 집중되는지 WAF 로그로 확인', '최근 리뷰 URL 규칙 변경 배포 이력 확인', '필요 시 보안 담당과 차단 정책 협의 (자동 차단 없음)'],
        limits: ['고유 IP·URL 수는 cardinality 근삿값', 'Chrome 표방은 UA 분류일 뿐 실제 브라우저 증거 아님', 'GeoIP는 프록시·VPN 영향으로 실제 위치와 다를 수 있음', '원본 IP 신뢰 모드가 Unverified']
      },
      ack: null,
      notices: [
        { at: '16:50', type: '신규', sev: 'warning', status: '초안 저장' },
        { at: '17:00', type: '악화 (주의→긴급)', sev: 'critical', status: '초안 저장' },
        { at: '17:00', type: 'AI 분석', sev: 'critical', status: '초안 저장' }
      ],
      timeline: [
        { at: '16:50', sev: 'warning', text: '사건 생성 — 지속 404 조건 충족 (주의)' },
        { at: '17:00', sev: 'critical', text: '분산 패턴 조건 추가 충족 → 긴급 상향' },
        { at: '17:00', sev: 'collect', text: 'AI 분석 완료 (근거 구간 17:00)' },
        { at: '17:10', sev: 'critical', text: '최신 근거 갱신 — 오류율 64.5%' }
      ],
      links: { kibana: true, errOnly: true, jennifer: true, front: false, datahub: false }
    },
    {
      id: 'INC-0915-034', site: 'FRONT', kind: 'errorStream', sev: 'critical', open: true,
      rule: '오류 메시지 다수 발생', title: '프론트 오류 로그 급증 — 5분 184건',
      sub: 'frontapi-errorlogs-* · ERROR/FATAL 레벨',
      metric: '5분 오류 <b>184건</b> · 기준 100건', firstDetected: '17:05', lastEval: '17:10',
      window: '17:05 ~ 17:10 (5분)',
      stream: {
        total: 184, sample: 100, withStack: 71,
        patterns: [
          { msg: 'System.TimeoutException: The operation has timed out. at CartApi.GetBenefit(#)', cnt: 38, stack: 'System.TimeoutException: The operation has timed out.\n   at Yes24.Front.Api.CartApi.GetBenefit(Int64 goodsNo)\n   at Yes24.Front.Controllers.CartController.Index()\n   ...(2,000자 제한 · 마스킹 적용)' },
          { msg: 'Object reference not set to an instance of an object. (Goods/#/Detail)', cnt: 21, stack: 'System.NullReferenceException: Object reference not set to an instance of an object.\n   at Yes24.Front.Services.GoodsService.BuildBadge(GoodsDto dto)\n   ...' },
          { msg: 'SqlException: Execution Timeout Expired. [GUID]', cnt: 17, stack: 'Microsoft.Data.SqlClient.SqlException (0x80131904): Execution Timeout Expired.\n   ...' },
          { msg: 'HttpRequestException: 503 Service Unavailable (benefit-api)', cnt: 12, stack: '' },
          { msg: 'TaskCanceledException: A task was canceled.', cnt: 7, stack: '' }
        ]
      },
      ai: {
        status: '완료', window: '17:10', analyzedAt: '17:10 슬롯', stale: false, verdict: 'bad',
        summary: '프론트 오류가 기준(100건)을 넘는 <b>184건</b> 발생했습니다. 오류 스트림에는 전체 요청 분모가 없어 오류율은 산정하지 않았습니다.',
        impactKnown: '5분 구간 프론트 오류 184건, 표본 100건 중 스택 포함 71건.',
        impactUnknown: '영향 이용자 수·페이지별 실패율·주문 영향.',
        hypotheses: ['동일 구간 혜택 조회 API 응답 지연 가능성 (집계 기준 추정)'],
        actions: ['프론트 오류 Kibana 링크에서 메시지·예외 열로 상위 패턴 원문 확인', '같은 시간 PC Jennifer에서 혜택 API 트랜잭션 응답시간 확인', '담당 API 팀에 공유 여부 판단'],
        limits: ['AI 입력에 메시지·스택 원문이 포함되지 않음 — 코드 원인 줄 특정 불가', '패턴 건수는 최근 100건 표본 내 횟수']
      },
      ack: null,
      notices: [{ at: '17:05', type: '신규 (긴급)', sev: 'critical', status: '초안 저장' }],
      timeline: [
        { at: '17:05', sev: 'critical', text: '사건 생성 — 5분 오류 131건 (긴급)' },
        { at: '17:10', sev: 'critical', text: '최신 근거 갱신 — 184건' },
        { at: '17:10', sev: 'collect', text: 'AI 분석 완료' }
      ],
      links: { kibana: false, errOnly: false, jennifer: false, front: true, datahub: false }
    },
    {
      id: 'INC-0915-029', site: 'PC', kind: 'was5xx', sev: 'warning', open: true,
      rule: 'WAS 5xx 오류율', title: 'PC WAS 5xx 오류율 주의 구간',
      sub: 'filebeat-iis-mall-* · 분모는 사이트 전체 요청 (Googlebot 포함)',
      metric: '오류율 <b>2.8%</b> · 5xx 5,108건', firstDetected: '16:35', lastEval: '17:10',
      window: '17:05 ~ 17:10 (5분)',
      base: { requests: 182430, errors: 5108, errLabel: '서버 오류(5xx)', rate: 2.8, p95: 1840 },
      geo: { kr: 4721, ov: 262, un: 125 },
      apm: { avgMs: 912, domain: 'PC 1000' },
      ai: {
        status: '완료', window: '17:00', analyzedAt: '17:00 슬롯', stale: true, verdict: 'warn',
        summary: 'PC 사이트 5xx 오류율이 <b>2%대</b>로 35분째 주의 구간에 머물러 있습니다. 해외 비중은 5%로 낮아 국내 이용자 영향 가능성이 있습니다.',
        impactKnown: '5분 기준 5xx 약 5천 건, 오류 요청의 92%가 국내 GeoIP.',
        impactUnknown: '특정 페이지·기능 편중 여부.',
        hypotheses: ['특정 서버 또는 백엔드 의존 서비스의 간헐 실패 가능성'],
        actions: ['Kibana 오류 로그만 보기에서 서버명·URL 열로 편중 확인', '같은 시간 Jennifer에서 오류 트랜잭션 확인'],
        limits: ['Jennifer 집계는 전체 서버를 대표하지 않음']
      },
      ack: { by: '김운영', at: '16:52', note: '결제 모듈 배포(16:30) 영향 여부 확인 중. 서버 3번 편중 확인되어 인프라팀 공유.' },
      notices: [{ at: '16:35', type: '신규', sev: 'warning', status: '초안 저장' }],
      timeline: [
        { at: '16:35', sev: 'warning', text: '사건 생성 — 오류율 2.1% (주의)' },
        { at: '16:52', sev: 'recovered', text: '담당자 확인 — 김운영' },
        { at: '17:10', sev: 'warning', text: '최신 근거 갱신 — 오류율 2.8%' }
      ],
      links: { kibana: true, errOnly: true, jennifer: true, front: false, datahub: false }
    },
    {
      id: 'INC-0915-027', site: 'PC', kind: 'bot', sev: 'warning', open: true,
      rule: 'Googlebot 대역 불일치', title: 'Googlebot 표방 요청 중 공식 대역 불일치 23건',
      sub: 'common-crawlers.json 대역 비교 · 최근 200건 표본',
      metric: '불일치 <b>23건</b> / 표본 200', firstDetected: '15:20', lastEval: '17:10',
      window: '17:05 ~ 17:10 (5분)',
      bot: { declared: 2140, sample: 200, match: 171, mismatch: 23, noIp: 6, trusted: null, untrusted: 200, rangeUpdated: '2026-09-15 09:02', mode: 'Unverified' },
      ai: { status: '실패', window: '17:00', analyzedAt: '17:00 슬롯', stale: true, error: 'AI 응답 형식 오류 (재시도 예정)' },
      ack: null,
      notices: [{ at: '15:20', type: '신규', sev: 'warning', status: '초안 저장' }, { at: '17:00', type: '분석 실패', sev: 'warning', status: '초안 저장' }],
      timeline: [
        { at: '15:20', sev: 'warning', text: '사건 생성 — 불일치 12건' },
        { at: '17:00', sev: 'critical', text: 'AI 분석 실패 — 규칙 사건 상태는 유지' }
      ],
      links: { kibana: true, errOnly: false, jennifer: false, front: false, datahub: false }
    },
    {
      id: 'INC-0915-033', site: 'EVENT', kind: 'latency', sev: 'warning', open: true,
      rule: 'WAS 지연 (p95)', title: '이벤트 사이트 p95 응답 지연',
      sub: 'filebeat-iis-event-* · Jennifer 도메인 미설정',
      metric: 'p95 <b>3,420ms</b> · 기준 3,000ms', firstDetected: '17:00', lastEval: '17:10',
      window: '17:05 ~ 17:10 (5분)',
      base: { requests: 12318, errors: 41, errLabel: '서버 오류(5xx)', rate: 0.33, p95: 3420 },
      geo: { kr: 38, ov: 2, un: 1 },
      apm: null,
      ai: { status: '대기', window: null, analyzedAt: '17:15 슬롯 대상' },
      ack: null,
      notices: [{ at: '17:00', type: '신규', sev: 'warning', status: '초안 저장' }],
      timeline: [{ at: '17:00', sev: 'warning', text: '사건 생성 — p95 3,180ms' }],
      links: { kibana: true, errOnly: false, jennifer: false, front: false, datahub: false }
    },
    {
      id: 'INC-0915-032', site: 'DATAHUB', kind: 'errorStream', sev: 'warning', open: true,
      rule: '오류 메시지 다수 발생', title: 'AX Datahub 오류 로그 14건',
      sub: 'AX_LOGS.dbo.tErrorLog · Regist_Datetime KST 구간',
      metric: '5분 오류 <b>14건</b> · 기준 10건', firstDetected: '17:10', lastEval: '17:10',
      window: '17:05 ~ 17:10 (5분)',
      stream: { total: 14, sample: 14, withStack: 14, patterns: [
        { msg: 'SiteMonitoringDatahubErrorClient: Kibana proxy 502 Bad Gateway', cnt: 9, stack: 'System.Net.Http.HttpRequestException: 502 (Bad Gateway)\n   at SiteMonitoringClients.QueryAsync(...)' },
        { msg: 'Hangfire: Job # failed — DbUpdateException', cnt: 5, stack: '' }
      ] },
      ai: { status: '대기', window: null, analyzedAt: '17:15 슬롯 대상' },
      ack: null,
      notices: [{ at: '17:10', type: '신규', sev: 'warning', status: '초안 저장' }],
      timeline: [{ at: '17:10', sev: 'warning', text: '사건 생성 — 14건' }],
      links: { kibana: false, errOnly: false, jennifer: false, front: false, datahub: true }
    },
    {
      id: 'INC-0915-030', site: 'MOBILE', kind: 'collect', sev: 'collect', open: true,
      rule: '수집 품질', title: '모바일 Jennifer APM 표본 누락',
      sub: '사이트 장애 확정과 별개인 수집 경고',
      metric: 'APM 표본 <b>0/5분</b>', firstDetected: '16:45', lastEval: '17:10',
      window: '17:05 ~ 17:10 (5분)',
      collect: { issues: [
        { src: 'Jennifer (모바일 2000)', state: '표본 누락', detail: 'service_time 분 단위 표본 0건' },
        { src: 'filebeat-iis-mob-*', state: '정상', detail: '요청 241,905건 · 상태 코드 누락 0' },
        { src: 'Google 공식 대역', state: '정상', detail: '09:02 갱신 · 24시간 캐시' }
      ] },
      ai: { status: '대기', window: null, analyzedAt: '수집 경고는 AI 분석 대상 아님' },
      ack: null, notices: [], timeline: [{ at: '16:45', sev: 'collect', text: '수집 경고 생성' }],
      links: { kibana: false, errOnly: false, jennifer: true, front: false, datahub: false }
    },
    {
      id: 'INC-0915-021', site: 'PC', kind: 'latency', sev: 'recovered', open: false,
      rule: 'WAS 지연 (p95)', title: 'PC p95 응답 지연 — 복구',
      sub: '연속 2개 유효 구간 기준 미만으로 복구 판정',
      metric: 'p95 <b>1,620ms</b> · 16:40 복구', firstDetected: '15:55', lastEval: '16:40',
      window: '16:35 ~ 16:40 (5분)',
      base: { requests: 171204, errors: 812, errLabel: '서버 오류(5xx)', rate: 0.47, p95: 1620 },
      geo: null, apm: { avgMs: 640, domain: 'PC 1000' },
      ai: { status: '완료', window: '16:15', analyzedAt: '16:15 슬롯', stale: true, verdict: 'good', summary: '당시 p95가 <b>8초</b>를 넘었으나 이후 기준 미만으로 회복되었습니다.', impactKnown: '15:55~16:30 PC 응답 지연.', impactUnknown: '지연 원인 서버.', hypotheses: ['캐시 서버 재기동 영향 가능성'], actions: ['복구 확인 후 사후 기록 작성'], limits: ['분석 구간이 복구 이전'] },
      ack: { by: '이서버', at: '16:48', note: '캐시 서버 재기동 후 정상화. 재발 시 인프라팀 에스컬레이션.' },
      notices: [{ at: '15:55', type: '신규', sev: 'warning', status: '초안 저장' }, { at: '16:05', type: '악화 (주의→긴급)', sev: 'critical', status: '초안 저장' }, { at: '16:40', type: '복구', sev: 'recovered', status: '초안 저장' }],
      timeline: [{ at: '15:55', sev: 'warning', text: '사건 생성' }, { at: '16:05', sev: 'critical', text: '긴급 상향 — p95 8,340ms' }, { at: '16:35', sev: 'recovered', text: '회복 관찰 1/2' }, { at: '16:40', sev: 'recovered', text: '복구 판정 (2/2)' }],
      links: { kibana: true, errOnly: false, jennifer: true, front: false, datahub: false }
    }
  ],

  runs: [
    { kind: '수집', window: '17:05~17:10', status: '성공', result: '사이트 3 · 오류 스트림 2 · 봇 표본 200' },
    { kind: '수집', window: '17:00~17:05', status: '부분', result: '모바일 APM 표본 누락' },
    { kind: 'AI 분석', window: '17:00 슬롯', status: '부분', result: '4건 완료 · 1건 실패' },
    { kind: '수집', window: '16:55~17:00', status: '성공', result: '사이트 3 · 오류 스트림 2' },
    { kind: '수집', window: '16:50~16:55', status: '성공', result: '사이트 3 · 오류 스트림 2' },
    { kind: 'AI 분석', window: '16:45 슬롯', status: '성공', result: '3건 완료' }
  ]
};
