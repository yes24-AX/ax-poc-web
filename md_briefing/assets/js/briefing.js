/* =============================================
   상품 브리핑 for MD — Render Logic (POC)
   ax-labs UI · 차트 색상은 테마 토큰(CSS 변수) 사용
   ============================================= */

const $ = (sel, el = document) => el.querySelector(sel);
const won = (n) => n.toLocaleString("ko-KR");
const num = (n) => n.toLocaleString("ko-KR");

/* ---------- SVG 차트 헬퍼 (색상은 CSS 클래스로 → 다크모드 대응) ---------- */

// 그룹 막대차트: 이번주 vs 전주
function barChart(labels, cur, prev) {
  const W = 640, H = 210, padL = 8, padR = 8, padT = 14, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(...cur, ...prev) * 1.15;
  const n = labels.length;
  const groupW = iw / n;
  const barW = Math.min(13, groupW * 0.32);
  const y = (v) => padT + ih - (v / max) * ih;

  let bars = "";
  for (let i = 0; i < n; i++) {
    const cx = padL + groupW * i + groupW / 2;
    const x1 = cx - barW - 1, x2 = cx + 1;
    const isLast3 = i >= n - 3;
    bars += `<rect class="bar-prev" x="${x2}" y="${y(prev[i])}" width="${barW}" height="${padT + ih - y(prev[i])}" rx="2.5"/>`;
    bars += `<rect class="${isLast3 ? "bar-alert" : "bar-cur"}" x="${x1}" y="${y(cur[i])}" width="${barW}" height="${padT + ih - y(cur[i])}" rx="2.5"/>`;
    if (i % 2 === 0 || i === n - 1) {
      bars += `<text class="chart-label" x="${cx}" y="${H - 7}" text-anchor="middle">${labels[i].slice(-5)}</text>`;
    }
  }
  const base = `<line class="chart-axis" x1="${padL}" y1="${padT + ih}" x2="${W - padR}" y2="${padT + ih}"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${base}${bars}</svg>`;
}

// 라인차트. invert=true → 값이 작을수록 위(순위용). colorClass: 'line-primary' | 'line-amber'
function lineChart(labels, values, opts = {}) {
  const W = 560, H = 158, padL = 14, padR = 14, padT = 18, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const invert = opts.invert;
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const n = values.length;
  const cls = opts.colorClass || "line-primary";
  const x = (i) => padL + (iw * i) / (n - 1);
  const y = (v) => {
    const t = (v - min) / range;
    return invert ? padT + t * ih : padT + (1 - t) * ih;
  };
  let path = "", dots = "", lbls = "";
  for (let i = 0; i < n; i++) {
    path += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(values[i]).toFixed(1) + " ";
    const isLast = i === n - 1;
    dots += `<circle class="chart-dot ${cls} ${isLast ? "dot-fill" : ""}" cx="${x(i)}" cy="${y(values[i])}" r="${isLast ? 4.5 : 3}"/>`;
    if (i % Math.ceil(n / 6) === 0 || isLast) {
      lbls += `<text class="chart-label" x="${x(i)}" y="${H - 5}" text-anchor="middle">${labels[i]}</text>`;
    }
    lbls += `<text class="chart-val ${cls}" x="${x(i)}" y="${y(values[i]) - 9}" text-anchor="middle">${opts.fmt ? opts.fmt(values[i]) : values[i]}</text>`;
  }
  const area = `<path class="chart-area ${cls}" d="${path} L ${x(n - 1)} ${padT + ih} L ${x(0)} ${padT + ih} Z"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">${area}<path class="chart-line ${cls}" d="${path}"/>${dots}${lbls}</svg>`;
}

function deltaEl(pct, invert = false) {
  const good = invert ? pct < 0 : pct > 0;
  const cls = pct === 0 ? "flat" : good ? "up" : "down";
  const arrow = pct === 0 ? "→" : pct > 0 ? "▲" : "▼";
  return `<span class="delta ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
}

/* ---------- 메인 렌더 ---------- */

let currentData = null; // "다시 생성" 등 AI 패널 재렌더링 시 참조

function renderBriefing(d) {
  currentData = d;
  $("#emptyState").classList.add("hidden");
  $("#briefing").classList.remove("hidden");
  $("#sp2").classList.add("active");

  renderHero(d.basic);
  renderSales(d.sales, d.rank);
  renderInventory(d.inventory);
  renderReview(d.review);
  renderEvents(d.events);
  renderAux(d.aux);
  renderSeries(d.seriesWorks);
  renderPositioning(d.positioning);

  renderAILoading();
  setTimeout(() => { renderAI(d.ai, d.aiHistory); $("#sp3").classList.add("active"); }, 1600);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHero(b) {
  const statusCls = { selling: "status-selling", low: "status-low", soldout: "status-soldout" }[b.status];
  $("#goodsNoBadge").textContent = "상품번호 " + b.goodsNo;
  $("#hero").innerHTML = `
    <div class="product-layout">
      <div class="product-cover">
        <img src="${b.cover}" alt="${b.title}" onerror="this.style.display='none';this.parentNode.textContent='📚'">
      </div>
      <div class="product-meta-area">
        <div class="product-cat">${b.category}</div>
        <h2 class="product-h2">${b.title}</h2>
        <p class="product-author">${b.author} · ${b.publisher}</p>
        <div class="product-pills">
          <span class="status-badge ${statusCls}">${b.statusLabel}</span>
          <span class="pill pill-md">담당 ${b.md} · ${b.mdTeam}</span>
          <span class="pill">한국소설</span>
        </div>
        <div class="product-dl">
          <div class="dl-row"><dt>상품번호</dt><dd class="mono">${b.goodsNo}</dd></div>
          <div class="dl-row"><dt>담당 MD</dt><dd class="md-hl">${b.md}</dd></div>
          <div class="dl-row"><dt>출판사</dt><dd>${b.publisher}</dd></div>
        </div>
        <div class="price-box">
          <span class="price-sale">${won(b.priceSale)}원</span>
          <span class="price-dc">${b.dcRate}%</span>
          <span class="price-list">${won(b.priceList)}원</span>
          <span class="price-point">적립 <b>${won(b.point)}원</b> (${b.pointRate}%)</span>
        </div>
      </div>
    </div>`;
}

function renderAILoading() {
  $("#aiBrief").innerHTML = `
    <div class="ai-brief-top"></div>
    <div class="ai-brief-head">
      <span class="ai-badge"><span class="dot"></span>AI 브리핑</span>
      <h2>상품 현황 자동 분석</h2>
    </div>
    <div class="ai-brief-body">
      <div class="ai-thinking"><span class="spin"></span>판매·재고·리뷰 데이터를 종합 분석하고 있습니다…</div>
      <div class="shimmer sk" style="width:92%"></div>
      <div class="shimmer sk" style="width:83%"></div>
      <div class="shimmer sk" style="width:64%"></div>
    </div>`;
}

const AI_MODELS = [
  { id: "claude-opus-4-8", name: "Opus 4.8", hint: "가장 정교함" },
  { id: "claude-sonnet-5", name: "Sonnet 5", hint: "빠르고 균형적" },
  { id: "claude-haiku-4-5", name: "Haiku 4.5", hint: "가장 빠름" },
];
const VERDICT_LABEL = { warn: "⚠️", good: "✅", bad: "🚨" };
const VERDICT_RANK = { good: 2, warn: 1, bad: 0 }; // 클수록 양호 → 이력 비교(상향/하향 판단)에 사용

function urgencyCls(u) { return u >= 80 ? "high" : u >= 50 ? "mid" : "low"; }

// "2026-07-07 09:12" → 3분 뒤 시각으로 (재생성 연출용, 실제 시계 대신 문자열 파싱)
function bumpTimestamp(ts) {
  const m = ts.match(/(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/);
  if (!m) return ts;
  const [, d, h, mi] = m;
  const nextMi = String((parseInt(mi, 10) + 3) % 60).padStart(2, "0");
  return `${d} ${h}:${nextMi}`;
}

function renderAI(ai, history) {
  const vCls = { warn: "warn", good: "good", bad: "bad" }[ai.verdict.level];
  const vIco = VERDICT_LABEL[ai.verdict.level];

  const problems = ai.problems.map(p =>
    `<li>${p.text}<span class="sev ${p.sev}">${p.sev === "high" ? "높음" : "중간"}</span></li>`).join("");

  // 긴급도 기준 재정렬 — AI가 우선순위를 판단해 순서를 정한다는 것을 그대로 보여준다.
  const sortedActions = ai.actions.slice().sort((a, b) => b.urgency - a.urgency);
  const actions = sortedActions.map((a, i) =>
    `<li><span class="num">${i + 1}</span>${a.text} <span class="owner">— ${a.owner}</span><span class="urgency urgency-${urgencyCls(a.urgency)}">긴급도 ${a.urgency}</span></li>`).join("");

  // 지난 브리핑 이력 (오래된 → 최근, 마지막이 현재)
  const hist = history || [];
  const histRows = hist.map((h, i) => `
    <div class="hist-row ${i === hist.length - 1 ? "hist-current" : ""}">
      <span class="hist-date mono">${h.date}</span>
      <span class="ai-verdict-mini ${h.verdict}">${VERDICT_LABEL[h.verdict]} ${h.label.split(" — ")[0]}</span>
      <span class="hist-note">${i === hist.length - 1 ? "현재 · " : ""}${h.note}</span>
    </div>`).join("");

  let changeBadge = "";
  if (hist.length >= 2) {
    const cur = hist[hist.length - 1], prev = hist[hist.length - 2];
    const rc = VERDICT_RANK[cur.verdict], rp = VERDICT_RANK[prev.verdict];
    const cls = rc < rp ? "down" : rc > rp ? "up" : "flat";
    const arrow = rc < rp ? "▼" : rc > rp ? "▲" : "−";
    const txt = rc < rp ? "지난주 대비 하향 조정" : rc > rp ? "지난주 대비 상향 조정" : "지난주와 동일";
    changeBadge = `<span class="delta ${cls}" style="margin-left:10px">${arrow} ${txt}</span>`;
  }

  const modelPicks = AI_MODELS.map(m => `
    <label class="model-pick"><input type="radio" name="aiModel" value="${m.id}" ${m.id === ai.model ? "checked" : ""}><span>${m.name}</span><small>${m.hint}</small></label>`).join("");

  $("#aiBrief").innerHTML = `
    <div class="ai-brief-top"></div>
    <div class="ai-brief-head">
      <span class="ai-badge"><span class="dot"></span>AI 브리핑</span>
      <h2>상품 현황 자동 분석</h2>
      <span class="ai-brief-meta">${ai.model} · ${ai.generatedAt}</span>
      <button class="btn btn-outline btn-sm ai-regen-btn" id="aiRegenBtn" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        다시 생성
      </button>
    </div>
    <div class="ai-regen-panel hidden" id="aiRegenPanel">
      <div class="regen-row">
        <span class="regen-label">모델 선택</span>
        <div class="model-pick-row">${modelPicks}</div>
      </div>
      <div class="regen-row">
        <label class="reason-toggle"><input type="checkbox" id="aiReasonToggle" checked /><span class="switch"></span>심층 추론 (느리지만 더 정확)</label>
        <button class="btn btn-primary btn-sm" id="aiRegenConfirm" type="button">다시 생성하기</button>
      </div>
    </div>
    <div class="ai-brief-body">
      ${hist.length ? `
      <button class="ai-history-toggle" id="aiHistoryToggle" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        지난 브리핑 이력 보기 (${hist.length})
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="ai-history hidden" id="aiHistoryPanel">${histRows}</div>` : ""}
      <div class="ai-verdict ${vCls}">${vIco} ${ai.verdict.text}${changeBadge}</div>
      <p class="ai-summary">${ai.summary}</p>
      <div class="ai-cols">
        <div class="ai-col problems">
          <div class="ai-col-title">🔍 도출된 문제점</div>
          <ul class="ai-list">${problems}</ul>
        </div>
        <div class="ai-col actions">
          <div class="ai-col-title">✅ 액션 아이템 <span style="font-weight:500;color:var(--muted-foreground);font-size:11px">(긴급도순)</span></div>
          <ul class="ai-list">${actions}</ul>
        </div>
      </div>
    </div>`;
}

/* ---------- AI 판단 근거(evidence) 팝오버 ---------- */

let evidencePopoverEl = null;
function closeEvidencePopover() {
  if (evidencePopoverEl) { evidencePopoverEl.remove(); evidencePopoverEl = null; }
}
function showEvidencePopover(el) {
  closeEvidencePopover();
  const ev = el.getAttribute("data-ev");
  const target = el.getAttribute("data-target");
  const pop = document.createElement("div");
  pop.className = "evidence-popover";
  pop.innerHTML = `
    <div class="ev-pop-title">근거 데이터</div>
    <div class="ev-pop-body">${ev}</div>
    ${target ? `<button class="ev-pop-link" type="button">해당 섹션 보기 ↓</button>` : ""}`;
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect();
  const left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 16);
  pop.style.left = Math.max(8, left) + "px";
  pop.style.top = (window.scrollY + r.bottom + 6) + "px";
  evidencePopoverEl = pop;
  if (target) {
    pop.querySelector(".ev-pop-link").addEventListener("click", () => {
      closeEvidencePopover();
      const t = document.querySelector(target);
      if (t) {
        t.scrollIntoView({ behavior: "smooth", block: "start" });
        t.classList.add("flash-highlight");
        setTimeout(() => t.classList.remove("flash-highlight"), 1200);
      }
    });
  }
  pop.addEventListener("click", (e) => e.stopPropagation());
}

/* ---------- 저자/시리즈 연계 판매 ---------- */

function renderSeries(sw) {
  const trendCls = (t) => t === "up" ? "up" : t === "down" ? "down" : "flat";
  const trendArrow = (t) => t === "up" ? "▲" : t === "down" ? "▼" : "−";
  const rows = sw.items.map(it => `
    <div class="row">
      <div class="row-main">
        <img class="mini-cover" src="${it.cover}" alt="" onerror="this.style.visibility='hidden'" />
        <div>
          <div class="row-title">${it.title} <span class="pill" style="margin-left:6px">${it.tag}</span></div>
          <div class="row-desc">종합 순위 ${it.rank}위</div>
        </div>
      </div>
      <span class="delta ${trendCls(it.trend)}">${trendArrow(it.trend)} ${Math.abs(it.trendPct)}%</span>
    </div>`).join("");
  $("#seriesSection").innerHTML = `
    <div class="card">
      <div class="card-header card-header-col">
        <h3 class="card-title">${sw.authorLabel}</h3>
        <p class="card-description">최근 7일 판매 추세 기준</p>
      </div>
      <div class="card-content">
        <div class="row-list">${rows}</div>
        <p class="hint-text hint-ai">💡 <b>AI 제안</b> — ${sw.aiNote}</p>
      </div>
    </div>`;
}

/* ---------- 팀/카테고리 평균 대비 포지셔닝 ---------- */

function renderPositioning(p) {
  const topPct = 100 - p.categoryPercentile.percentile;
  const rows = p.vsAvg.map(m => {
    const diffPct = Math.round(((m.value - m.avg) / m.avg) * 100);
    return `<div class="row">
      <div class="row-main">
        <div>
          <div class="row-title">${m.label}</div>
          <div class="row-desc">이 상품 ${m.value}${m.unit} · 카테고리 평균 ${m.avg}${m.unit}</div>
        </div>
      </div>
      ${deltaEl(diffPct)}
    </div>`;
  }).join("");

  $("#posSection").innerHTML = `
    <div class="grid grid-2">
      ${statCard("담당 포트폴리오 내 순위", `${p.mdPortfolio.rank}<span class="unit">위 / ${p.mdPortfolio.total}종</span>`, p.mdPortfolio.basis)}
      ${statCard("카테고리 내 위치", `상위 <span class="unit">${topPct}%</span>`, `활성 카탈로그 ${p.categoryPercentile.total}종 중 ${p.categoryPercentile.rank}위`)}
    </div>
    <div class="card" style="margin-top:12px">
      <div class="card-header card-header-col">
        <h3 class="card-title">카테고리 평균 대비</h3>
        <p class="card-description">한국소설 카테고리 평균과 비교한 핵심 지표</p>
      </div>
      <div class="card-content"><div class="row-list">${rows}</div></div>
    </div>`;
}

function statCard(title, numHtml, subHtml, aiTag) {
  return `<div class="stat-card">
    <div class="stat-head"><h4>${title}</h4>${aiTag ? `<span class="badge badge-primary" style="font-size:10px">${aiTag}</span>` : ""}</div>
    <div class="stat-num">${numHtml}</div>
    ${subHtml ? `<div class="stat-sub">${subHtml}</div>` : ""}
  </div>`;
}

function renderSales(s, r) {
  const avgDelta = Math.round(((s.avg7 - s.avg7Prev) / s.avg7Prev) * 100);
  const swDelta = Math.round(((s.sameWeekday.current - s.sameWeekday.prev) / s.sameWeekday.prev) * 100);
  const rankDelta = r.current - r.value[r.value.length - 2];

  $("#salesSection").innerHTML = `
    <div class="grid grid-4">
      ${statCard("최근 14일 매출", `${won(s.revenue)}<span class="unit">원</span>`, `주문 ${num(s.orders)}건`)}
      ${statCard("최근 7일 평균 판매", `${s.avg7}<span class="unit">부/일</span>`, `직전 7일 ${s.avg7Prev}부 · ${deltaEl(avgDelta)}`)}
      ${statCard("취소 / 반품", `${s.cancel}<span class="unit">/ ${s.refund}건</span>`, `취소율 ${(s.cancel / s.orders * 100).toFixed(1)}%`)}
      ${statCard(`전주 동일요일(${s.sameWeekday.label})`, `${s.sameWeekday.current}<span class="unit">부</span>`, `전주 ${s.sameWeekday.prev}부 · ${deltaEl(swDelta)}`)}
    </div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="chart-card">
        <div class="stat-head"><h4>일자별 판매수량 (이번주 vs 전주)</h4></div>
        <div class="chart-wrap">${barChart(s.days, s.qty, s.prevWeekQty)}</div>
        <div class="chart-legend">
          <span><i style="background:var(--foreground)"></i>이번 기간</span>
          <span><i style="background:var(--destructive)"></i>최근 3일(급감)</span>
          <span><i style="background:color-mix(in oklch,var(--muted-foreground) 30%,transparent)"></i>전주 동일구간</span>
        </div>
      </div>
      <div class="chart-card">
        <div class="stat-head"><h4>베스트셀러 순위 변화</h4><span class="pill">${r.category}</span></div>
        <div class="chart-wrap">${lineChart(r.days, r.value, { invert: true, colorClass: "line-primary", fmt: (v) => v + "위" })}</div>
        <div class="chart-legend">
          <span>현재 <b>${r.current}위</b></span>
          <span>최고 <b>${r.best}위</b></span>
          <span>${rankDelta > 0 ? `<span class="delta down">▼ ${rankDelta}단계 하락</span>` : `<span class="delta up">▲ 상승</span>`}</span>
        </div>
      </div>
    </div>`;
}

function renderInventory(inv) {
  const daysLeft = inv.predictSelloutDays;
  const riskCls = daysLeft <= inv.leadTime ? "neg" : "pos";
  const pct = Math.min(100, Math.round((daysLeft / inv.leadTime) * 100));
  $("#invSection").innerHTML = `
    <div class="grid grid-3">
      ${statCard("현재 재고", `${num(inv.current)}<span class="unit">부</span>`, `입고 예정 ${inv.inbound}부`)}
      ${statCard("최근 판매속도", `${inv.velocity}<span class="unit">부/일</span>`, "최근 7일 기준")}
      <div class="stat-card">
        <div class="stat-head"><h4>예상 소진일</h4><span class="badge badge-primary" style="font-size:10px">AI 예측</span></div>
        <div class="stat-num danger">D-${daysLeft}<span class="unit">· ${inv.predictSelloutDate}</span></div>
        <div class="stat-sub">발주 리드타임 ${inv.leadTime}일 · <b style="color:var(--destructive)">${inv.risk}</b></div>
        <div class="bar-track"><div class="bar-fill ${riskCls}" style="width:${pct}%"></div></div>
      </div>
    </div>`;
}

function renderReview(rv) {
  const ratingDelta = Math.round(((rv.ratingNow - rv.ratingPrev) / rv.ratingPrev) * 100);
  const negDelta = rv.negRatio - rv.negRatioPrev;
  const full = Math.round(rv.ratingNow / 2);
  const stars = "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  const kw = rv.keywords.map(k => `<span class="kw">${k.word}<span class="cnt">${k.cnt}</span></span>`).join("");
  $("#reviewSection").innerHTML = `
    <div class="grid grid-4">
      ${statCard("현재 평점", `${rv.ratingNow}<span class="unit">/ 10</span>`, `<span class="stars">${stars}</span> · ${deltaEl(ratingDelta)}`)}
      ${statCard("리뷰 수", `${rv.count7}<span class="unit">/ 7일</span>`, `최근 30일 ${rv.count30}건`)}
      <div class="stat-card">
        <div class="stat-head"><h4>부정 리뷰 비율</h4><span class="badge badge-primary" style="font-size:10px">AI 분류</span></div>
        <div class="stat-num danger">${rv.negRatio}<span class="unit">%</span></div>
        <div class="stat-sub">이전 ${rv.negRatioPrev}% · ${deltaEl(negDelta, true)}</div>
      </div>
      ${statCard("7일 vs 30일 평점", `${rv.compare.rating7} <span class="unit">vs ${rv.compare.rating30}</span>`, `부정비율 7일 ${rv.compare.neg7}% / 30일 ${rv.compare.neg30}%`)}
    </div>
    <div class="grid grid-2" style="margin-top:12px">
      <div class="chart-card">
        <div class="stat-head"><h4>최근 평점 추이</h4></div>
        <div class="chart-wrap">${lineChart(rv.trend.map((_, i) => "W" + (i + 1)), rv.trend, { colorClass: "line-amber", fmt: (v) => v.toFixed(1) })}</div>
      </div>
      <div class="chart-card">
        <div class="stat-head"><h4>핵심 불만 키워드</h4><span class="badge badge-primary" style="font-size:10px">AI 추출</span></div>
        <div class="kw-wrap">${kw}</div>
        <p class="hint-text">최근 30일 부정 리뷰에서 추출한 상위 키워드입니다. <b>파본·배송</b> 관련 언급이 집중되어 품질/물류 점검이 필요합니다.</p>
      </div>
    </div>`;
}

function renderEvents(events) {
  const rows = events.map(e => {
    const tagCls = e.type === "coupon" ? "badge-success" : e.type === "gift" ? "badge-warning" : "badge-secondary";
    return `<div class="row">
      <div class="row-main">
        <span class="badge ${tagCls}">${e.tag}</span>
        <div>
          <div class="row-title">${e.name}</div>
          <div class="row-desc">${e.period}${e.stock ? " · " + e.stock : ""}</div>
        </div>
      </div>
      ${e.live ? '<span class="badge badge-danger">진행중</span>' : '<span class="badge badge-secondary">예정</span>'}
    </div>`;
  }).join("");
  $("#eventSection").innerHTML = `
    <div class="card">
      <div class="card-content">
        <div class="row-list">${rows}</div>
      </div>
    </div>`;
}

function renderAux(a) {
  const item = (k, v, unit, delta, invert) => `
    <div class="aux">
      <div class="k">${k}</div>
      <div class="v">${v}<small>${unit || ""}</small></div>
      <div class="d">${deltaEl(delta, invert)}</div>
    </div>`;
  $("#auxSection").innerHTML = `
    <div class="aux-grid">
      ${item("상품상세 PV", num(a.pv), "", a.pvDelta)}
      ${item("전환율(CVR)", a.cvr, "%", Math.round((a.cvr - a.cvrAvg) / a.cvrAvg * 100))}
      ${item("장바구니 수", num(a.cart), "", a.cartDelta)}
      ${item("검색 노출 수", num(a.searchImp), "", a.searchDelta)}
      ${item("관련 CS 문의", a.cs, "건", a.csDelta, true)}
    </div>
    <p class="hint-text" style="padding-left:2px">전환율 ${a.cvr}%는 카테고리 평균 ${a.cvrAvg}% 대비 낮으며, CS 문의가 <b>+${a.csDelta}%</b> 급증했습니다.</p>`;
}

/* ---------- 조회 ---------- */

function showNotice(msg) { const el = $("#notice"); el.textContent = msg; el.classList.remove("hidden"); }
function clearNotice() { $("#notice").classList.add("hidden"); }

function lookup(no) {
  if (!no) { showNotice("상품번호를 입력해 주세요. (샘플: 147560984)"); return; }
  const data = MOCK_BRIEFINGS[no];
  if (!data) { showNotice(`상품번호 ${no} 는 POC 목업 데이터에 없습니다. 샘플: 147560984`); return; }
  clearNotice();
  renderBriefing(data);
}

/* ---------- 다크모드 ---------- */
function toggleDark() {
  const dark = document.documentElement.classList.toggle("dark");
  $("#iconMoon").classList.toggle("hidden", dark);
  $("#iconSun").classList.toggle("hidden", !dark);
}

document.addEventListener("DOMContentLoaded", () => {
  const input = $("#goodsInput");
  $("#lookupBtn").addEventListener("click", () => lookup(input.value.trim()));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") lookup(input.value.trim()); });
  $("#themeToggle").addEventListener("click", toggleDark);

  const chipWrap = $("#sampleChips");
  SAMPLE_GOODS.forEach(g => {
    const c = document.createElement("button");
    c.className = "chip";
    c.textContent = `${g.no} · ${g.name}`;
    c.addEventListener("click", () => { input.value = g.no; lookup(g.no); });
    chipWrap.appendChild(c);
  });
});

/* ---------- AI 패널 위임 이벤트 (다시 생성 / 이력 토글 / 근거 팝오버) ----------
   #aiBrief 내부 콘텐츠는 renderAI() 호출마다 innerHTML로 통째로 교체되므로,
   버튼마다 매번 리스너를 새로 붙이는 대신 document 레벨 위임으로 한 번만 등록한다. */
document.addEventListener("click", (e) => {
  if (e.target.closest("#aiRegenBtn")) {
    $("#aiRegenPanel")?.classList.toggle("hidden");
    return;
  }
  if (e.target.closest("#aiRegenConfirm")) {
    if (!currentData) return;
    const modelSel = document.querySelector('input[name="aiModel"]:checked')?.value || currentData.ai.model;
    $("#aiRegenPanel")?.classList.add("hidden");
    renderAILoading();
    setTimeout(() => {
      const updatedAi = Object.assign({}, currentData.ai, {
        model: modelSel,
        generatedAt: bumpTimestamp(currentData.ai.generatedAt),
      });
      renderAI(updatedAi, currentData.aiHistory);
    }, 1400);
    return;
  }
  const historyBtn = e.target.closest("#aiHistoryToggle");
  if (historyBtn) {
    historyBtn.classList.toggle("open");
    $("#aiHistoryPanel")?.classList.toggle("hidden");
    return;
  }
  const evEl = e.target.closest(".ai-evidence");
  if (evEl) {
    e.preventDefault();
    showEvidencePopover(evEl);
    return;
  }
  if (!e.target.closest(".evidence-popover")) closeEvidencePopover();
});
