/* AI 사이트 관제 — 사건 상세(E 영역) 렌더링
   밀도 원칙: 판단에 필요한 수치·경고만 본문에 두고, 해석 주의사항은 탭 하단 접이식 한 곳으로 모은다. */
(function () {
  const SEV = { critical: '긴급', warning: '주의', collect: '수집 경고', recovered: '복구' };
  const fmt = (n) => (n === null || n === undefined ? null : Number(n).toLocaleString('ko-KR'));
  const na = '<span class="v na">확인 불가</span>';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = {
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
  };

  const sevTag = (sev) => `<span class="sm-sev sm-sev-${sev}">${SEV[sev]}</span>`;
  const warn = (text) => `<div class="sm-caveat warn">${text}</div>`;
  const notesFold = (notes) => notes.length
    ? `<details class="sm-fold sm-notes"><summary>해석 시 주의사항<span class="meta">${notes.length}개</span></summary>
        <div class="sm-fold-body"><ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul></div></details>`
    : '';

  function head(inc) {
    const L = inc.links;
    const links = [
      [L.kibana, 'Kibana 요청 로그'], [L.errOnly, '오류 로그만 보기'], [L.front, '프론트 오류 Kibana'],
      [L.jennifer, '같은 시간 Jennifer'], [L.datahub, 'AX Datahub 오류 로그']
    ].filter(([on]) => on);
    const noJennifer = inc.site === 'EVENT' ? '<span class="sm-jump-note">Jennifer 도메인 미설정</span>' : '';
    return `
      <div class="sm-detail-head">
        <div class="sm-detail-tags">
          ${sevTag(inc.sev)}<span class="sm-site">${inc.site}</span><span class="sm-rule">${inc.rule}</span>
          <span class="sm-rule mono sm-id">${inc.id}</span>
        </div>
        <h2 class="sm-detail-title">${inc.title}</h2>
        <dl class="sm-detail-meta">
          <div><dt>근거 구간</dt><dd>${inc.window}</dd></div>
          <div><dt>탐지</dt><dd>${inc.firstDetected} → ${inc.lastEval}</dd></div>
          <div><dt>담당자</dt><dd>${inc.ack ? inc.ack.by : '<span class="sm-ack no">미확인</span>'}</dd></div>
        </dl>
        <div class="sm-jump" data-region="E-1. 원본 로그 이동">
          ${links.map(([, label]) => `<a class="btn btn-outline btn-sm" href="#">${ico.ext}${label}</a>`).join('')}
          ${noJennifer}
        </div>
      </div>`;
  }

  function tabs(inc, active) {
    const aiWarn = inc.ai && (inc.ai.stale || inc.ai.status === '실패');
    const t = [['evidence', '근거'], ['ai', 'AI 판단'], ['action', '담당자 기록'], ['history', '이력']];
    return `<div class="sm-tabs" role="tablist" data-region="E-2. 상세 탭">${t.map(([k, l]) =>
      `<button role="tab" data-tab="${k}" class="${k === active ? 'active' : ''}">${l}${k === 'ai' && aiWarn ? '<span class="dot-warn" title="분석 시점 불일치 또는 실패"></span>' : ''}${k === 'action' && !inc.ack ? '<span class="dot-warn" title="담당자 미확인"></span>' : ''}</button>`).join('')}</div>`;
  }

  /* ---------- 근거 탭 ---------- */
  function metrics(b, inc) {
    const cell = (k, v) => `<div class="sm-metric"><div class="k">${k}</div>${v}</div>`;
    return `<div class="sm-metrics">
      ${cell('전체 요청', b.requests != null ? `<div class="v">${fmt(b.requests)}</div>` : na)}
      ${cell(b.errLabel, b.errors != null ? `<div class="v">${fmt(b.errors)}</div>` : na)}
      ${cell('오류율', b.rate != null ? `<div class="v ${inc.kind !== 'latency' && inc.sev !== 'recovered' ? 'hot' : ''}">${b.rate}<small>%</small></div>` : na)}
      ${cell('p95 응답시간', b.p95 != null ? `<div class="v ${inc.kind === 'latency' && inc.sev !== 'recovered' ? 'hot' : ''}">${fmt(b.p95)}<small>ms</small></div>` : na)}
    </div>`;
  }

  function routeBlock(r, notes) {
    const rows = r.windows.map((w) => {
      const e = (w.e404 / w.req) * 100;
      return `<div class="sm-bar-row"><span class="t">${w.t}</span><div class="sm-bar"><span class="err" style="width:${e}%"></span><span class="ok" style="width:${100 - e}%"></span></div><span class="r">${e.toFixed(1)}%</span></div>`;
    }).join('');
    const tbl = r.windows.map((w) => `<tr><td class="mono">${w.t}</td><td class="num">${fmt(w.req)}</td><td class="num">${fmt(w.e404)}</td><td class="num">${fmt(w.req - w.e404)}</td><td class="num">${((w.e404 / w.req) * 100).toFixed(1)}%</td></tr>`).join('');
    const b = r.behavior;
    const errTotal = r.windows.reduce((a, w) => a + w.e404, 0);
    const pct = (v) => Math.round((v / errTotal) * 100);
    notes.push('지속 404 조건: 연속 3개 5분 구간 각각 요청 100건↑, 404 100건↑, 오류율 20%↑');
    notes.push('"404 외 요청"에는 다른 상태 코드도 포함되며 모두 성공 요청이라는 뜻은 아닙니다.');
    notes.push('고유 IP·URL 수는 Elasticsearch cardinality 근삿값입니다.');
    notes.push('Chrome 표방은 User-Agent 분류일 뿐 실제 사람·정상 브라우저의 증거가 아닙니다. 리퍼러 없음은 빈 값·"-"·필드 없음을 포함합니다.');
    notes.push('분산 404 패턴은 공격 확정이 아닙니다. 원문 URL·UA는 Kibana에서 확인하세요.');
    return `
      <div class="sm-block" data-region="E-3b. 경로 오류 추이">
        <div class="sm-block-title">구간별 404 추이</div>
        <div class="sm-bars">${rows}</div>
        <div class="sm-legend"><span><i class="err"></i>404 오류</span><span><i class="ok"></i>404 외 요청</span>
          <details class="sm-inline-fold"><summary>건수 표</summary>
            <div class="sm-table-wrap"><table class="sm-table"><thead><tr><th>구간</th><th class="num">전체 요청</th><th class="num">404</th><th class="num">404 외</th><th class="num">오류율</th></tr></thead><tbody>${tbl}</tbody></table></div>
          </details>
        </div>
      </div>
      <div class="sm-block" data-region="E-3c. 요청 행동">
        <div class="sm-block-title">요청 분산도<span class="hint">분산 패턴 기준 대비</span></div>
        <div class="sm-facts">
          <div class="sm-fact"><div class="k">고유 로그 IP</div><div class="v">${fmt(b.uniqueIp)}</div><div class="n">오류 대비 ${pct(b.uniqueIp)}% · 기준 70%↑</div></div>
          <div class="sm-fact"><div class="k">오류 URL 수</div><div class="v">${fmt(b.urls)}</div><div class="n">오류 대비 ${pct(b.urls)}% · 기준 70%↑</div></div>
          <div class="sm-fact"><div class="k">한 IP 최대 오류</div><div class="v">${fmt(b.maxIpErr)}</div><div class="n">비중 ${((b.maxIpErr / errTotal) * 100).toFixed(1)}% · 기준 5%↓</div></div>
        </div>
        <div class="sm-subfacts">
          <span>Chrome 표방 오류 <b>${fmt(b.chrome)}</b></span>
          <span>리퍼러 없는 오류 <b>${fmt(b.noRef)}</b></span>
        </div>
        ${b.ipRankOk ? '' : warn('IP 순위 집계가 불완전하여 분산 패턴 판정 정확도가 낮습니다.')}
      </div>`;
  }

  function geoBlock(g, notes) {
    if (!g) return '';
    const t = g.kr + g.ov + g.un;
    const p = (v) => ((v / t) * 100).toFixed(1);
    notes.push('GeoIP 수치는 고유 IP 수가 아니라 오류 요청 수입니다. 프록시·VPN 영향으로 실제 위치와 다를 수 있으며, 해외 비중 분모에 국가 미확인이 포함됩니다.');
    return `<div class="sm-block" data-region="E-3d. 국내·해외 GeoIP">
      <div class="sm-block-title">오류 요청 GeoIP</div>
      <div class="sm-geo"><span class="kr" style="width:${p(g.kr)}%"></span><span class="ov" style="width:${p(g.ov)}%"></span><span class="un" style="width:${p(g.un)}%"></span></div>
      <div class="sm-geo-legend">
        <span><i style="background:var(--info)"></i>국내 <b>${fmt(g.kr)}</b></span>
        <span><i style="background:var(--violet)"></i>해외 <b>${fmt(g.ov)}</b> (${p(g.ov)}%)</span>
        <span><i style="background:var(--muted-foreground);opacity:.3"></i>미확인 <b>${fmt(g.un)}</b></span>
      </div>
    </div>`;
  }

  function apmBlock(inc, notes) {
    if (inc.kind !== 'was5xx' && inc.kind !== 'latency' && inc.kind !== 'route404') return '';
    if (!inc.apm) return `<div class="sm-block">${warn('이 사이트는 Jennifer 도메인이 설정되지 않아 APM 보조 근거가 없습니다.')}</div>`;
    notes.push('Jennifer 수치는 같은 구간 service_time 평균이며 전체 서버를 대표하지 않습니다.');
    return `<div class="sm-block" data-region="E-3e. APM 보조 근거">
      <div class="sm-subfacts sm-subfacts-lead"><span>Jennifer 평균 응답시간 <b>${fmt(inc.apm.avgMs)}ms</b></span><span>도메인 ${inc.apm.domain}</span></div>
    </div>`;
  }

  function streamBlock(s, notes) {
    const pats = s.patterns.map((p, i) => `
      <details class="sm-pattern"><summary><span class="rank">${i + 1}</span><span class="msg">${esc(p.msg)}</span><span class="cnt">${p.cnt}</span></summary>
        <pre>${esc(p.stack || '(스택 없음 — 메시지만 수집됨)')}</pre></details>`).join('');
    notes.push('오류 스트림에는 전체 요청 분모가 없어 오류율·p95를 표시하지 않습니다.');
    notes.push('패턴은 숫자·GUID를 정규화해 해시로 묶은 것이며, 건수는 최근 표본 안의 횟수입니다. 전체 빈도·최초 등장·원인 확정을 뜻하지 않습니다.');
    notes.push('메시지는 500자, 스택은 2,000자로 제한되며 마스킹이 모든 개인정보 제거를 보장하지 않습니다.');
    return `
      <div class="sm-block">
        <div class="sm-metrics sm-metrics-3">
          <div class="sm-metric"><div class="k">구간 전체 오류</div><div class="v hot">${fmt(s.total)}</div></div>
          <div class="sm-metric"><div class="k">최근 표본</div><div class="v">${fmt(s.sample)}</div></div>
          <div class="sm-metric"><div class="k">스택 포함 표본</div><div class="v">${fmt(s.withStack)}</div></div>
        </div>
      </div>
      <div class="sm-block" data-region="E-3f. 메시지·스택 패턴">
        <div class="sm-block-title">표본 내 상위 패턴<span class="hint">표본 ${s.sample}건 중 횟수</span></div>
        <div class="sm-patterns">${pats}</div>
      </div>`;
  }

  function botBlock(b, notes) {
    notes.push(`표방 요청 전체(${fmt(b.declared)})는 검증 표본 수와 다릅니다. 공식 대역 갱신 ${b.rangeUpdated}, 24시간 캐시.`);
    notes.push('표본에서 불일치가 없다는 이유만으로 전체를 정상으로 판단하거나 복구하지 않습니다.');
    return `<div class="sm-block" data-region="E-3g. Googlebot 검증">
      <div class="sm-metrics">
        <div class="sm-metric"><div class="k">검증 표본</div><div class="v">${fmt(b.sample)}</div></div>
        <div class="sm-metric"><div class="k">공식 대역 일치</div><div class="v">${fmt(b.match)}</div></div>
        <div class="sm-metric"><div class="k">불일치 <small>기준 10↑</small></div><div class="v hot">${fmt(b.mismatch)}</div></div>
        <div class="sm-metric"><div class="k">유효 IP 없음</div><div class="v">${fmt(b.noIp)}</div></div>
      </div>
      <div class="sm-subfacts"><span>표방 요청 전체 <b>${fmt(b.declared)}</b></span><span>신뢰 원본 IP 기준 <b>${b.trusted == null ? '확인 불가' : fmt(b.trusted)}</b></span></div>
    </div>
    <div class="sm-block">${warn(`원본 IP 신뢰 모드가 <b>${b.mode}</b>입니다. 프록시·CDN 경유 시 로그 IP가 실제 요청자와 다를 수 있습니다.`)}</div>`;
  }

  function collectBlock(c, notes) {
    const rows = c.issues.map((x) => `<tr><td>${x.src}</td><td>${x.state === '정상' ? '<span class="badge badge-success">정상</span>' : `<span class="badge badge-warning">${x.state}</span>`}</td><td>${x.detail}</td></tr>`).join('');
    notes.push('수집 경고는 사이트 장애 확정이 아닙니다. 불완전한 구간은 판단 보류로 처리되며 복구 연속 횟수가 초기화됩니다.');
    return `<div class="sm-block" data-region="E-3h. 수집 품질">
      <div class="sm-block-title">출처별 수집 상태</div>
      <div class="sm-table-wrap sm-boxed"><table class="sm-table"><thead><tr><th>출처</th><th>상태</th><th>내용</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }

  function evidence(inc) {
    const notes = [];
    let h = '';
    if (inc.base) {
      notes.push("누락된 값은 0으로 대체하지 않고 '확인 불가'로 표시합니다. 최초 탐지는 평가 구간 종료 시각으로, 실제 첫 오류 시각과 다를 수 있습니다.");
      h += `<div class="sm-block" data-region="E-3a. 기본 지표">${metrics(inc.base, inc)}</div>`;
    }
    if (inc.route) h += routeBlock(inc.route, notes);
    if (inc.stream) h += streamBlock(inc.stream, notes);
    if (inc.bot) h += botBlock(inc.bot, notes);
    if (inc.collect) h += collectBlock(inc.collect, notes);
    h += geoBlock(inc.geo, notes);
    h += apmBlock(inc, notes);
    return h + notesFold(notes);
  }

  /* ---------- AI 판단 탭 ---------- */
  const aiHead = (meta) => `<div class="ai-brief-top"></div>
    <div class="ai-brief-head"><span class="ai-badge"><span class="dot"></span>AI</span><h2>AI 판단</h2><span class="ai-brief-meta">${meta}</span></div>`;

  function ai(inc) {
    const a = inc.ai;
    if (!a || a.status === '대기') {
      return `<div class="ai-brief">${aiHead(a ? a.analyzedAt : '')}
        <div class="ai-brief-body"><div class="ai-thinking"><span class="spin"></span>분석 대기 중</div>
          <p class="sm-muted">15분 주기 슬롯에서 열린 사건을 최대 5건씩 분석합니다.</p></div></div>`;
    }
    if (a.status === '실패') {
      return `<div class="ai-brief">${aiHead(a.analyzedAt)}
        <div class="ai-brief-body"><span class="ai-verdict bad">분석 실패</span>
          <p class="sm-muted">${a.error}. 규칙 사건 상태는 그대로 유지되므로 근거 탭의 판정을 기준으로 확인하세요.</p></div></div>`;
    }
    const list = (arr, num) => `<ul class="ai-list">${arr.map((x, i) => `<li>${num ? `<span class="num">${i + 1}</span>` : ''}${x}</li>`).join('')}</ul>`;
    const vLabel = { bad: '즉시 확인 필요', warn: '주의 관찰', good: '복구 확인' }[a.verdict];
    return `
      ${a.stale ? `<div class="sm-block">${warn(`AI 근거 구간(<b>${a.window}</b>)이 최신 평가(<b>${inc.lastEval}</b>)와 다릅니다. 최신 수치는 근거 탭을 보세요.`)}</div>` : ''}
      <div class="ai-brief" data-region="E-4. AI 판단">
        ${aiHead(`근거 구간 ${a.window} · ${a.status}`)}
        <div class="ai-brief-body">
          <span class="ai-verdict ${a.verdict}">${vLabel}</span>
          <div class="ai-summary">${a.summary}</div>
          <div class="sm-ai-grid">
            <div class="ai-col actions"><div class="ai-col-title">권고 조치</div>${list(a.actions, true)}</div>
            <div class="ai-col hypo"><div class="ai-col-title">원인 가설 <span class="badge badge-secondary">검토 대상</span></div>${list(a.hypotheses)}</div>
          </div>
          <details class="sm-fold"><summary>영향 · 분석 한계<span class="meta">한계 ${a.limits.length}개</span></summary>
            <div class="sm-fold-body">
              <div class="sm-impact"><div><div class="h ok">확인된 영향</div>${a.impactKnown}</div><div><div class="h unk">확인할 수 없는 영향</div>${a.impactUnknown}</div></div>
              <div class="sm-block-title" style="margin-top:14px">분석 한계</div>
              <ul class="sm-plain-list">${a.limits.map((x) => `<li>${x}</li>`).join('')}</ul>
            </div>
          </details>
        </div>
      </div>`;
  }

  /* ---------- 담당자 기록 탭 ---------- */
  function action(inc) {
    const k = inc.ack || {};
    return `<div class="sm-block" data-region="E-5. 담당자 기록">
      <div class="sm-form">
        <label for="ackBy">확인자</label><input class="sm-input" id="ackBy" value="${esc(k.by || '홍길동')}" />
        <label for="ackAt">확인 시각</label><input class="sm-input" id="ackAt" value="${esc(k.at ? '2026-09-15 ' + k.at : '2026-09-15 17:13')}" />
        <label for="ackNote">조치 내용</label>
        <div><textarea class="sm-textarea" id="ackNote" maxlength="2000" placeholder="원본 로그에서 확인한 내용과 다음 조치를 기록합니다.">${esc(k.note || '')}</textarea>
          <div class="sm-counter"><span id="ackLen">${(k.note || '').length}</span> / 2,000자</div></div>
        <div class="sm-form-actions"><button class="btn btn-primary btn-sm" id="ackSave">${inc.ack ? '기록 수정' : '확인 기록 저장'}</button><span class="saved hidden" id="ackSaved">저장됨 (목업)</span>
          <span class="sm-muted" style="margin-left:auto">확인 기록은 복구 판정을 바꾸지 않습니다</span></div>
      </div>
    </div>`;
  }

  /* ---------- 이력 탭 ---------- */
  function history(inc, runs) {
    const tl = inc.timeline.map((x) => `<li class="sm-sev-${x.sev}"><div class="t">${x.at}</div><div class="d">${x.text}</div></li>`).join('');
    const nt = inc.notices.length ? inc.notices.map((n) => `<tr><td class="mono">${n.at}</td><td>${sevTag(n.sev)} ${n.type}</td><td><span class="badge badge-secondary">${n.status}</span></td></tr>`).join('') : '<tr><td colspan="3" style="color:var(--muted-foreground)">통보 기록 없음</td></tr>';
    const rn = runs.map((r) => `<tr><td>${r.kind}</td><td class="mono">${r.window}</td><td>${r.status === '성공' ? '<span class="badge badge-success">성공</span>' : `<span class="badge badge-warning">${r.status}</span>`}</td><td>${r.result}</td></tr>`).join('');
    const json = JSON.stringify({ incidentId: inc.id, site: inc.site, rule: inc.rule, severity: inc.sev, window: inc.window, base: inc.base, route: inc.route, geo: inc.geo, bot: inc.bot }, null, 2);
    return `
      <div class="sm-block" data-region="E-6a. 사건 타임라인"><ul class="sm-timeline">${tl}</ul></div>
      <div class="sm-block" data-region="E-6b. 보조 이력">
        <details class="sm-fold"><summary>통보 기록<span class="meta">${inc.notices.length}건</span></summary>
          <div class="sm-fold-body sm-table-wrap"><table class="sm-table"><thead><tr><th>시각</th><th>종류</th><th>발송 상태</th></tr></thead><tbody>${nt}</tbody></table></div></details>
        <details class="sm-fold"><summary>원본 집계 JSON<span class="meta">관제 근거 · WAS 원문 아님</span></summary><div class="sm-fold-body"><pre class="sm-json">${esc(json)}</pre></div></details>
        <details class="sm-fold"><summary>AI 분석 당시 근거<span class="meta">${inc.ai && inc.ai.window ? '구간 ' + inc.ai.window : '없음'}</span></summary><div class="sm-fold-body"><pre class="sm-json">${esc(JSON.stringify({ window: inc.ai && inc.ai.window, excluded: ['오류 메시지·스택', '개별 IP', '상품 URL', 'UA 원문', '리퍼러', '담당자 메모'] }, null, 2))}</pre></div></details>
        <details class="sm-fold"><summary>최근 자동 실행<span class="meta">${runs.length}건</span></summary>
          <div class="sm-fold-body sm-table-wrap"><table class="sm-table"><thead><tr><th>종류</th><th>구간</th><th>상태</th><th>결과</th></tr></thead><tbody>${rn}</tbody></table></div></details>
      </div>`;
  }

  window.SMDetail = {
    render(inc, tab, runs) {
      if (!inc) {
        return `<div class="empty"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          <h2>선택된 사건이 없습니다</h2><p>왼쪽 목록에서 사건을 선택하세요.</p></div>`;
      }
      const body = { evidence: () => evidence(inc), ai: () => ai(inc), action: () => action(inc), history: () => history(inc, runs) }[tab]();
      return head(inc) + tabs(inc, tab) + `<div class="sm-tab-body" data-region="E-3. 탭 본문">${body}</div>`;
    },
    SEV
  };
})();
