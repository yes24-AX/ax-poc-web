/* AI 사이트 관제 — 페이지 상태·상단 영역·목록·드로어 */
(function () {
  const M = window.SM_MOCK;
  const SEV = window.SMDetail.SEV;
  const SEV_ORDER = { critical: 0, warning: 1, collect: 2, recovered: 3 };
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('ko-KR');

  const state = { scenario: 'normal', seg: 'action', site: '', sort: 'sev', selectedId: null, tab: 'evidence' };

  const SEGS = [
    { key: 'action', label: '대응 필요', test: (i) => i.open && !i.ack && i.kind !== 'collect', hot: true },
    { key: 'service', label: '서비스 이상', test: (i) => i.open && i.kind !== 'collect' },
    { key: 'collect', label: '수집 경고', test: (i) => i.kind === 'collect' },
    { key: 'recovered', label: '복구', test: (i) => i.sev === 'recovered' },
    { key: 'all', label: '전체', test: () => true }
  ];

  const incidents = () => (state.scenario === 'empty' ? M.incidents.filter((i) => !i.open) : M.incidents);
  const statusKey = () => (state.scenario === 'stale' ? 'stale' : 'normal');

  /* B. 수집 상태 */
  function renderStatus() {
    const s = M.status[statusKey()];
    const el = $('statusStrip');
    el.classList.toggle('stale', !s.fresh);
    const badge = s.fresh
      ? '<span class="status-badge status-selling">자동 관제 가동</span>'
      : '<span class="status-badge status-low">수집 상태 확인 필요</span>';
    const item = (k, v) => `<span class="sm-strip-item"><span class="k">${k}</span><span class="v">${v}</span></span>`;
    el.innerHTML = `
      ${badge}
      ${item('최근 수집', `${s.window} <span class="sm-muted">· ${s.windowAgo}</span>`)}
      ${item('AI 분석', `${s.lastAi.split(' ')[0]} <span class="sm-muted">· 다음 ${s.nextAi}</span>`)}
      ${s.fresh ? '' : '<span class="sm-strip-note">구간 종료가 <b>20분 이상</b> 지났습니다. 사건이 없어도 정상으로 간주하지 마세요.</span>'}
      <details class="sm-strip-more">
        <summary>수집 설정</summary>
        <dl>
          <div><dt>수집 주기</dt><dd>1분 호출 · 5분 구간 · 지연 3분</dd></div>
          <div><dt>마지막 AI 슬롯</dt><dd>${s.lastAi}</dd></div>
          <div><dt>통보</dt><dd>${s.notify}</dd></div>
          <div><dt>원본 IP 신뢰</dt><dd>${s.trustMode}</dd></div>
          <div><dt>화면 갱신</dt><dd>저장된 결과 조회 · 새로고침 시 갱신</dd></div>
        </dl>
      </details>`;
  }

  /* C. 최근 구간 건수 */
  function renderKpis() {
    const k = M.kpi[statusKey()];
    const sites = [['PC', k.pc], ['모바일', k.mob], ['이벤트', k.event]];
    const known = sites.filter(([, v]) => v != null);
    const total = known.reduce((a, [, v]) => a + v, 0);
    const partial = known.length < sites.length;
    const val = (v, unit) => (v == null ? '<div class="v unknown">확인 불가</div>' : `<div class="v">${fmt(v)}<span class="unit">${unit}</span></div>`);
    const openCnt = incidents().filter((i) => i.open && i.kind !== 'collect');
    const crit = openCnt.filter((i) => i.sev === 'critical').length;
    $('kpis').innerHTML = `
      <div class="sm-kpi">
        <div class="k">최근 5분 집계한 WAS 로그 <span class="sm-tip" title="ES 요청 수 합계이며 관제 DB로 복사한 행 수가 아닙니다">?</span></div>
        <div class="v">${fmt(total)}<span class="unit">건</span>${partial ? ' <span class="badge badge-warning" style="vertical-align:middle">부분 합계</span>' : ''}</div>
        <div class="sm-site-split">${sites.map(([n, v]) => `<div class="${v == null ? 'miss' : ''}">${n}<b>${v == null ? '미확인' : fmt(v)}</b></div>`).join('')}</div>
      </div>
      <div class="sm-kpi"><div class="k">열린 사건</div><div class="v">${openCnt.length}<span class="unit">건</span></div><div class="s">긴급 ${crit} · 주의 ${openCnt.length - crit}</div></div>
      <div class="sm-kpi">
        <div class="k">오류 로그 <span class="sm-tip" title="최신 수집 구간의 오류 총수 · WAS 요청 합계에 더하지 않습니다">?</span></div>
        <div class="sm-site-split sm-split-2">
          <div class="${k.front == null ? 'miss' : ''}">프론트<b>${k.front == null ? '확인 불가' : fmt(k.front)}</b></div>
          <div class="${k.datahub == null ? 'miss' : ''}">Datahub<b>${k.datahub == null ? '확인 불가' : fmt(k.datahub)}</b></div>
        </div>
      </div>
      <div class="sm-kpi"><div class="k">Googlebot 표방 <span class="sm-tip" title="사이트별 표방 요청 합계 · 검증 표본 수와 다르며 WAS 합계에 더하지 않습니다">?</span></div>${val(k.googlebot, '건')}</div>`;
  }

  /* D. 사건 목록 */
  function filtered() {
    const seg = SEGS.find((s) => s.key === state.seg);
    let list = incidents().filter(seg.test).filter((i) => !state.site || i.site === state.site);
    list = list.slice().sort((a, b) =>
      state.sort === 'sev' ? SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || b.lastEval.localeCompare(a.lastEval) : b.lastEval.localeCompare(a.lastEval));
    return list;
  }

  function renderSegs() {
    $('segTabs').innerHTML = SEGS.map((s) => {
      const c = incidents().filter(s.test).length;
      return `<button role="tab" data-seg="${s.key}" class="${s.key === state.seg ? 'active' : ''}">${s.label}<span class="cnt ${s.hot && c ? 'hot' : ''}">${c}</span></button>`;
    }).join('');
  }

  function renderList() {
    const list = filtered();
    if (!list.find((i) => i.id === state.selectedId)) state.selectedId = list[0] ? list[0].id : null;
    $('listCount').textContent = `${list.length}건`;
    const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    $('incidentList').innerHTML = list.length
      ? list.map((i) => `
        <li><button class="sm-item sm-sev-${i.sev} ${i.id === state.selectedId ? 'active' : ''}" data-id="${i.id}">
          <div class="sm-item-top"><span class="sm-sev sm-sev-${i.sev}">${SEV[i.sev]}</span><span class="sm-site">${i.site}</span><span class="sm-item-time">${i.lastEval}</span></div>
          <div class="sm-item-title">${i.title}</div>
          <div class="sm-item-foot"><span class="sm-item-metric">${i.metric}</span>
            ${i.ack ? `<span class="sm-ack">${check}${i.ack.by}</span>` : '<span class="sm-ack no">미확인</span>'}</div>
        </button></li>`).join('')
      : `<li class="empty" style="padding:48px 12px"><h2>해당 분류의 사건이 없습니다</h2><p>${state.scenario === 'stale' ? '수집이 지연된 상태이므로 정상으로 간주하지 마세요.' : '다른 분류를 확인하세요.'}</p></li>`;
  }

  /* E. 사건 상세 */
  function renderDetail() {
    const inc = incidents().find((i) => i.id === state.selectedId);
    $('detail').innerHTML = window.SMDetail.render(inc, state.tab, M.runs);
  }

  function renderAll() { renderStatus(); renderKpis(); renderSegs(); renderList(); renderDetail(); }

  /* F. 판정 기준 드로어 */
  function renderGuide() {
    const rules = [
      ['WAS 5xx', '요청 100건↑, 오류율 2%↑ 주의 / 5%↑ 긴급', '분모는 전체 요청(Googlebot 포함)'],
      ['WAS 지연', 'p95 3,000ms↑ 주의 / 8,000ms↑ 긴급', '유효 표본 기준'],
      ['수집 품질', '연결 실패·상태 코드 누락·APM 표본 누락', '장애 확정과 별개'],
      ['지속 404', '연속 3개 5분 구간 각각 요청≥100, 404≥100, 오류율≥20%', '현재 모바일 /Goods/Review/ 경로'],
      ['분산 404 패턴', '지속 404 + 고유 IP/오류≥70% + 고유 URL/오류≥70% + 최다 IP 비중≤5%', '공격 확정 아님'],
      ['오류 메시지 다수', '프론트·Datahub 5분 10건↑ 주의 / 100건↑ 긴급', '오류율 산정 안 함'],
      ['Googlebot 대역 불일치', '공식 대역 유효 + 표본 불일치 10건↑', '원본 IP 신뢰 미확인 별도 표시']
    ];
    $('guideDrawer').innerHTML = `
      <div class="sm-drawer-head"><h2>판정 기준 · 사용 순서</h2><button class="btn btn-ghost btn-icon btn-sm" id="closeGuide" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
      <div class="sm-drawer-body">
        <h3>담당자 사용 순서</h3>
        <ol>
          <li>최근 수집 구간과 사이트별 건수 확인 — 미확인·오래된 수집은 정상으로 간주하지 않음</li>
          <li>서비스 이상과 수집 경고를 구분하고 사건 선택</li>
          <li>오류율·건수·추이, 해외 비중, IP/URL 분산도와 검증 범위를 함께 읽기</li>
          <li>AI 분석 구간과 최신 근거 구간이 같은지 확인</li>
          <li>Kibana·Jennifer·Datahub 오류 로그에서 원문과 업무 영향 확인</li>
          <li>확인 내용과 다음 조치 기록 — 실제 복구는 후속 유효 구간으로 판정</li>
        </ol>
        <h3>탐지 기준 (현재 설정값)</h3>
        <div class="sm-table-wrap" style="border:1px solid var(--border);border-radius:var(--radius)"><table class="sm-table"><thead><tr><th>항목</th><th>사건 판단 기준</th><th>해석</th></tr></thead>
          <tbody>${rules.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>
        <h3>복구 · 통보</h3>
        <ol>
          <li>연속 2개 유효 구간에서 기준 미만이면 복구 — 불완전 데이터는 판단 보류, 연속 횟수 초기화</li>
          <li>신규·심각도 상승·복구 시 통보 기록 생성 (같은 사건·버전·종류는 1건)</li>
          <li>현재 통보는 초안 저장 중심 — 로컬 관제 모드는 메일 발송 꺼짐</li>
        </ol>
      </div>`;
  }
  const toggleGuide = (open) => { $('guideDrawer').classList.toggle('hidden', !open); $('guideBackdrop').classList.toggle('hidden', !open); };

  /* events */
  $('segTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-seg]'); if (!b) return; state.seg = b.dataset.seg; renderSegs(); renderList(); renderDetail(); });
  $('incidentList').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; state.selectedId = b.dataset.id; state.tab = 'evidence'; renderList(); renderDetail(); });
  $('siteFilter').addEventListener('change', (e) => { state.site = e.target.value; renderList(); renderDetail(); });
  $('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
  $('scenarioSelect').addEventListener('change', (e) => { state.scenario = e.target.value; state.selectedId = null; renderAll(); });
  $('reloadBtn').addEventListener('click', renderAll);
  $('detail').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { state.tab = t.dataset.tab; renderDetail(); return; }
    if (e.target.closest('a[href="#"]')) e.preventDefault();
    if (e.target.closest('#ackSave')) $('ackSaved').classList.remove('hidden');
  });
  $('detail').addEventListener('input', (e) => { if (e.target.id === 'ackNote') $('ackLen').textContent = e.target.value.length.toLocaleString('ko-KR'); });
  $('openGuide').addEventListener('click', () => toggleGuide(true));
  $('guideBackdrop').addEventListener('click', () => toggleGuide(false));
  $('guideDrawer').addEventListener('click', (e) => { if (e.target.closest('#closeGuide')) toggleGuide(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleGuide(false); });
  $('regionToggle').addEventListener('change', (e) => document.body.classList.toggle('show-regions', e.target.checked));
  $('themeToggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    $('iconMoon').classList.toggle('hidden', dark);
    $('iconSun').classList.toggle('hidden', !dark);
  });

  renderGuide();
  renderAll();
})();
