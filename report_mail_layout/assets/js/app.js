/* =========================================================
   리포트 발송 메일 레이아웃 관리 — POC
   · 모든 데이터는 목업이며 네트워크 호출은 하지 않는다.
   · composeMail() 은 실제 구현의 IReportMailComposer.Compose() 와
     1:1 대응하도록 작성했다 (SPEC.md 참고).
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* =========================================================
   레이아웃 필드 정의 — 편집 폼과 오버라이드 판정의 단일 출처
   ========================================================= */
const SECTIONS = [
  { no: 1, title: '제목 · 발신자' },
  { no: 2, title: '헤더' },
  { no: 3, title: '본문 앞 문구 블록' },
  { no: 4, title: '본문 뒤 문구 블록' },
  { no: 5, title: '푸터' }
];

const FIELDS = [
  { sec: 1, key: 'subjectTpl', label: '메일 제목', kind: 'text', hint: '메일함에 노출되는 제목. 변수 사용 가능.' },
  { sec: 1, key: 'fromName', label: '발신자 표시명', kind: 'text' },
  { sec: 1, key: 'fromAddress', label: '발신자 주소', kind: 'text', hint: '리포트는 ax-labs-report@, 알림은 ax-labs@ 를 쓰는 것이 현재 관례입니다.' },
  { sec: 2, key: 'headerTitleTpl', label: '헤더 타이틀', kind: 'text' },
  { sec: 2, key: 'headerSubtitleTpl', label: '헤더 부제', kind: 'text' },
  { sec: 2, key: 'headerLogo', label: 'AX LABS 로고 표시', kind: 'bool' },
  { sec: 2, key: 'headerAccent', label: '헤더 강조색', kind: 'accent', hint: '헤더 상단 바와 CTA 버튼에만 적용됩니다. 본문 표 색상은 각 리포트가 그대로 유지합니다.' },
  { sec: 3, key: 'introBlocks', label: '본문 앞 블록', kind: 'blocks' },
  { sec: 4, key: 'outroBlocks', label: '본문 뒤 블록', kind: 'blocks' },
  { sec: 5, key: 'footerTextTpl', label: '푸터 문구', kind: 'textarea' },
  { sec: 5, key: 'footerContact', label: '문의처', kind: 'text' },
  { sec: 5, key: 'footerUnsub', label: '수신거부 링크 표시', kind: 'bool' }
];

const FIELD_LABEL = {};
FIELDS.forEach(f => { FIELD_LABEL[f.key] = f.label; });

/* =========================================================
   합성기 — 서버 IReportMailComposer.Compose() 와 동일한 순서
   ========================================================= */

/** {{key}} 치환. 정의되지 않은 변수는 원문을 남겨 치환 실패를 눈에 띄게 한다. */
function applyVars(tpl, vars) {
  return String(tpl == null ? '' : tpl).replace(/\{\{(\w+)\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m);
}

/** 공용 레이아웃 + 메일별 오버라이드 → 실제 적용값 */
function effective(layout, override) {
  const out = {};
  FIELDS.forEach(f => {
    out[f.key] = Object.prototype.hasOwnProperty.call(override || {}, f.key)
      ? override[f.key] : layout[f.key];
  });
  return out;
}

function accentHex(key) {
  const a = ACCENTS.find(x => x.key === key);
  return a ? a.hex : '#3f4753';
}

/** CTA URL 화이트리스트 — https 만 허용 */
function safeUrl(u) {
  const v = String(u || '').trim();
  return /^https:\/\//i.test(v) ? v : '#';
}

const TONE = {
  info: { line: '#2563eb', bg: '#eef4ff' },
  warn: { line: '#b26a00', bg: '#fff7e8' },
  danger: { line: '#d6304a', bg: '#fdeef1' }
};

function renderBlocks(blocks, vars, accent) {
  if (!blocks || !blocks.length) return '';
  let s = '';
  blocks.forEach(b => {
    if (b.type === 'text') {
      s += '<p style="margin:0 0 10px;font-size:13.5px;line-height:1.75;color:#1a1d23;">' +
        esc(applyVars(b.text, vars)) + '</p>';
    } else if (b.type === 'callout') {
      const t = TONE[b.tone] || TONE.info;
      s += '<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;"><tr>' +
        '<td style="padding:11px 14px;background:' + t.bg + ';border-left:3px solid ' + t.line +
        ';border-radius:0 4px 4px 0;font-size:13px;line-height:1.7;color:#1a1d23;">' +
        esc(applyVars(b.text, vars)) + '</td></tr></table>';
    } else if (b.type === 'cta') {
      s += '<table cellpadding="0" cellspacing="0" style="margin:14px 0;"><tr>' +
        '<td style="background:' + accent + ';border-radius:6px;">' +
        '<a href="' + esc(safeUrl(applyVars(b.url, vars))) + '" ' +
        'style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;">' +
        esc(applyVars(b.label, vars)) + '</a></td></tr></table>';
    }
  });
  return s;
}

/**
 * 메일 합성. 서버 구현과 동일한 순서:
 *   헤더 → intro 블록 → bodyHtml(리포트 서비스 산출물, 그대로) → outro 블록 → 푸터
 */
function composeMail(layout, override, vars, bodyHtml) {
  const e = effective(layout, override);
  const accent = accentHex(e.headerAccent);
  const subject = applyVars(e.subjectTpl, vars);

  const logo = e.headerLogo
    ? '<div style="margin-bottom:9px;"><span style="display:inline-block;background:' + accent +
      ';color:#ffffff;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:4px;letter-spacing:0.06em;">AX LABS</span></div>'
    : '';

  const title = applyVars(e.headerTitleTpl, vars);
  const subtitle = applyVars(e.headerSubtitleTpl, vars);

  let html = '';
  html += '<div style="margin:0;padding:0;background:#f0f2f5;">';
  html += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:18px 0;">';
  html += '<tr><td align="center" style="padding:0 12px;">';
  html += '<table cellpadding="0" cellspacing="0" style="width:100%;max-width:840px;background:#ffffff;' +
    'border:1px solid #e2e6ec;border-radius:8px;overflow:hidden;' +
    'font-family:\'Malgun Gothic\',AppleSDGothicNeo,sans-serif;font-size:14px;color:#1a1d23;line-height:1.6;">';

  /* 헤더 */
  html += '<tr><td style="padding:20px 24px 17px;border-top:4px solid ' + accent + ';border-bottom:1px solid #e2e6ec;">' +
    logo +
    (title ? '<div style="font-size:19px;font-weight:700;letter-spacing:-0.01em;">' + esc(title) + '</div>' : '') +
    (subtitle ? '<div style="margin-top:5px;font-size:12.5px;color:#6b7280;">' + esc(subtitle) + '</div>' : '') +
    '</td></tr>';

  /* 본문 앞 블록 */
  const intro = renderBlocks(e.introBlocks, vars, accent);
  if (intro) html += '<tr><td style="padding:18px 24px 0;">' + intro + '</td></tr>';

  /* 리포트 본문 — 각 서비스의 BuildHtml 결과를 그대로 삽입 */
  html += '<tr><td style="padding:18px 24px;">' + (bodyHtml || '') + '</td></tr>';

  /* 본문 뒤 블록 */
  const outro = renderBlocks(e.outroBlocks, vars, accent);
  if (outro) html += '<tr><td style="padding:0 24px 18px;">' + outro + '</td></tr>';

  /* 푸터 */
  const foot = applyVars(e.footerTextTpl, vars);
  const contact = applyVars(e.footerContact, vars);
  let footInner = '';
  if (foot) footInner += esc(foot);
  if (contact) footInner += (footInner ? '<br />' : '') + esc(contact);
  if (e.footerUnsub) {
    footInner += (footInner ? '<br />' : '') +
      '<a href="' + esc(safeUrl(applyVars('{{siteUrl}}', vars))) + '" style="color:#6b7280;">수신 거부 · 수신자 설정</a>';
  }
  if (footInner) {
    html += '<tr><td style="padding:14px 24px;background:#f4f6f9;border-top:1px solid #e2e6ec;' +
      'font-size:11.5px;color:#6b7280;line-height:1.75;">' + footInner + '</td></tr>';
  }

  html += '</table></td></tr></table></div>';

  return { subject, html, fromName: e.fromName, fromAddress: e.fromAddress };
}

/* =========================================================
   변수 컨텍스트
   ========================================================= */
function buildVars(sched, dateStr, sentAtLabel) {
  const d = (dateStr || TODAY).slice(0, 10);
  const p = d.split('-');
  return {
    jobName: sched.name,
    baseDate: d,
    yyyy: p[0], MM: p[1], dd: p[2],
    M: String(parseInt(p[1], 10)), D: String(parseInt(p[2], 10)),
    period: sched.vars.period,
    rowCount: sched.vars.rowCount,
    sentAt: sentAtLabel || NOW_LABEL,
    siteUrl: sched.vars.siteUrl
  };
}

function bodyOf(sched) {
  if (!sched.bodyKey) return NO_BODY_NOTICE;
  return SAMPLE_BODIES[sched.bodyKey] || NO_BODY_NOTICE;
}

function layoutById(id) {
  return LAYOUTS.find(l => l.id === id) || LAYOUTS[0];
}

/* =========================================================
   상태
   ========================================================= */
const state = {
  view: 'list',
  q: '',
  filter: 'all',
  layFilter: 0,          // 0 = 전체
  schedId: null,
  draftLayoutId: null,
  draftOverride: null,   // 편집 중 사본
  bodySrc: 'sample',
  snapIdx: 0,
  vp: 'desktop',
  compare: false,
  openSec: { 1: true, 2: false, 3: false, 4: false, 5: false }
};

/* =========================================================
   VIEW ① 목록
   ========================================================= */
function overrideCount(s) { return Object.keys(s.override || {}).length; }

function fmtBadge(f) {
  if (f === 'PROCESS') return '<span class="badge badge-secondary">처리 잡</span>';
  if (f === 'GENERATE') return '<span class="badge badge-secondary">페이지 생성</span>';
  if (f === 'PDF') return '<span class="badge badge-secondary">PDF</span>';
  return '<span class="badge badge-primary">HTML</span>';
}

function renderStats() {
  $('#stTotal').textContent = SCHEDULES.length;
  $('#stActive').textContent = SCHEDULES.filter(s => s.active).length;
  $('#stLayouts').textContent = LAYOUTS.length;
  $('#stOverride').textContent = SCHEDULES.filter(s => overrideCount(s) > 0).length;
}

function renderChips() {
  const wrap = $('#layChips');
  let h = '<button class="chip' + (state.layFilter === 0 ? ' on' : '') + '" data-lay="0">모든 레이아웃</button>';
  LAYOUTS.forEach(l => {
    const n = SCHEDULES.filter(s => s.layoutId === l.id).length;
    h += '<button class="chip' + (state.layFilter === l.id ? ' on' : '') + '" data-lay="' + l.id + '">' +
      esc(l.name) + ' · ' + n + '</button>';
  });
  wrap.innerHTML = h;
  $$('#layChips .chip').forEach(b => b.addEventListener('click', () => {
    state.layFilter = parseInt(b.dataset.lay, 10);
    renderChips(); renderList();
  }));
}

function filteredSchedules() {
  const q = state.q.trim().toLowerCase();
  return SCHEDULES.filter(s => {
    if (q && !(s.name.toLowerCase().includes(q) || s.endpoint.toLowerCase().includes(q))) return false;
    if (state.filter === 'active' && !s.active) return false;
    if (state.filter === 'override' && overrideCount(s) === 0) return false;
    if (state.layFilter && s.layoutId !== state.layFilter) return false;
    return true;
  });
}

function renderList() {
  const rows = filteredSchedules();
  const tb = $('#schedTbl tbody');
  $('#schedTbl').classList.toggle('hidden', rows.length === 0);
  $('#listEmpty').classList.toggle('hidden', rows.length !== 0);

  tb.innerHTML = rows.map(s => {
    const lay = layoutById(s.layoutId);
    const oc = overrideCount(s);
    const ovr = oc ? ' <span class="pill">개별 ' + oc + '</span>' : '';
    const last = s.lastRun
      ? '<span class="badge badge-' + (s.lastStatus === 'SUCCESS' ? 'success' : 'danger') + '">' + s.lastStatus + '</span>' +
        '<div class="mono" style="font-size:11px;color:var(--muted-foreground);margin-top:3px;">' + s.lastRun + '</div>'
      : '<span class="dim">–</span>';
    return '<tr class="clickable" data-id="' + s.id + '">' +
      '<td class="num">' + s.id + '</td>' +
      '<td class="col-name"><b>' + esc(s.name) + '</b></td>' +
      '<td class="dim col-cron">' + esc(s.cron) + '</td>' +
      '<td>' + fmtBadge(s.format) + '</td>' +
      '<td class="' + (s.active ? 'rs-on' : 'rs-off') + '">' + (s.active ? 'ON' : 'OFF') + '</td>' +
      '<td><span class="ep-link">' + esc(s.endpoint) + '</span></td>' +
      '<td class="nowrap"><span class="badge badge-secondary">' + esc(lay.name) + '</span>' + ovr + '</td>' +
      '<td class="nowrap">' + last + '</td>' +
      '<td><div class="row-acts">' +
        '<button class="btn btn-primary btn-sm" data-act="edit" data-id="' + s.id + '">레이아웃</button>' +
        '<button class="btn btn-outline btn-sm" data-act="preview" data-id="' + s.id + '">미리보기</button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  tb.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    openEditor(parseInt(b.dataset.id, 10), b.dataset.act === 'preview');
  }));
  tb.querySelectorAll('tr.clickable').forEach(tr => tr.addEventListener('click', () =>
    openEditor(parseInt(tr.dataset.id, 10), false)));
}

/* =========================================================
   VIEW ② 편집기
   ========================================================= */
function currentSched() { return SCHEDULES.find(s => s.id === state.schedId); }

function openEditor(id, previewOnly) {
  const s = SCHEDULES.find(x => x.id === id);
  if (!s) return;
  state.schedId = id;
  state.draftLayoutId = s.layoutId;
  state.draftOverride = JSON.parse(JSON.stringify(s.override || {}));
  state.bodySrc = previewOnly && RUN_SNAPSHOTS[id] ? 'snapshot' : 'sample';
  state.snapIdx = 0;
  state.compare = false;
  switchView('editor');

  $('#edName').textContent = s.name;
  $('#edMeta').textContent = s.endpoint + '  ·  ' + s.cron + '  ·  ' + s.format;
  $('#edLayoutSel').innerHTML = LAYOUTS.map(l =>
    '<option value="' + l.id + '"' + (l.id === s.layoutId ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('');

  const snaps = RUN_SNAPSHOTS[id] || [];
  $('#snapSel').innerHTML = snaps.length
    ? snaps.map((sn, i) => '<option value="' + i + '">' + sn.runAt + ' 발송본</option>').join('')
    : '<option value="-1">보존된 발송본 없음</option>';

  $$('#segBody button').forEach(b => {
    b.classList.toggle('on', b.dataset.src === state.bodySrc);
    if (b.dataset.src === 'snapshot') b.disabled = snaps.length === 0;
  });
  $('#snapSel').style.display = state.bodySrc === 'snapshot' ? '' : 'none';
  $$('#segVp button').forEach(b => b.classList.toggle('on', b.dataset.vp === 'desktop'));
  state.vp = 'desktop';

  renderForm();
  renderPreview();
}

function isOverridden(key) {
  return Object.prototype.hasOwnProperty.call(state.draftOverride, key);
}

function effValue(key) {
  const lay = layoutById(state.draftLayoutId);
  return isOverridden(key) ? state.draftOverride[key] : lay[key];
}

const ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function fieldHtml(f) {
  const ov = isOverridden(f.key);
  const v = effValue(f.key);
  let control = '';

  if (f.kind === 'text') {
    control = '<input class="fld" type="text" data-fkey="' + f.key + '" value="' + esc(v) + '" />';
  } else if (f.kind === 'textarea') {
    control = '<textarea class="fld" rows="2" data-fkey="' + f.key + '">' + esc(v) + '</textarea>';
  } else if (f.kind === 'bool') {
    control = '<button class="toggle' + (v ? ' on' : '') + '" data-fbool="' + f.key + '" ' +
      'aria-label="' + esc(f.label) + '"><span class="knob"></span></button>';
  } else if (f.kind === 'accent') {
    control = '<div class="swatches">' + ACCENTS.map(a =>
      '<button class="swatch' + (a.key === v ? ' on' : '') + '" data-faccent="' + a.key + '" ' +
      'title="' + esc(a.label) + '" style="background:' + a.hex + ';"></button>').join('') + '</div>';
  } else if (f.kind === 'blocks') {
    control = blocksHtml(f.key, v || []);
  }

  const resolved = (f.kind === 'text' || f.kind === 'textarea')
    ? '<div class="fld-resolved" data-rkey="' + f.key + '"></div>' : '';

  return '<div class="fldrow' + (ov ? ' overridden' : '') + '" data-row="' + f.key + '">' +
    '<div class="fldrow-head">' +
      '<div class="fldrow-label">' + esc(f.label) + (ov ? '<span class="ovr-mark">개별</span>' : '') + '</div>' +
      '<label class="ovr-switch"><span>' + (ov ? '이 메일 전용' : '공용 값') + '</span>' +
        '<button class="toggle' + (ov ? ' on' : '') + '" data-ovr="' + f.key + '" ' +
        'aria-label="개별 오버라이드"><span class="knob"></span></button></label>' +
    '</div>' +
    control +
    (f.hint ? '<div class="fld-hint mt10">' + esc(f.hint) + '</div>' : '') +
    resolved +
    '</div>';
}

function blocksHtml(key, blocks) {
  let h = '<div class="blk-list">';
  if (!blocks.length) {
    h += '<div class="blk-empty">블록이 없습니다. 아래에서 추가하세요.</div>';
  }
  blocks.forEach((b, i) => {
    const kindLabel = b.type === 'text' ? '문구' : b.type === 'callout' ? '콜아웃' : 'CTA 버튼';
    h += '<div class="blk">' +
      '<div class="blk-head">' +
        '<span class="blk-kind k-' + b.type + '">' + kindLabel + '</span>' +
        '<span class="blk-spacer"></span>' +
        '<div class="blk-acts">' +
          '<button class="blk-btn" data-bmove="up" data-bk="' + key + '" data-bi="' + i + '"' + (i === 0 ? ' disabled' : '') + ' title="위로">' + ICON_UP + '</button>' +
          '<button class="blk-btn" data-bmove="down" data-bk="' + key + '" data-bi="' + i + '"' + (i === blocks.length - 1 ? ' disabled' : '') + ' title="아래로">' + ICON_DOWN + '</button>' +
          '<button class="blk-btn danger" data-bdel="1" data-bk="' + key + '" data-bi="' + i + '" title="삭제">' + ICON_X + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="blk-body">';

    if (b.type === 'cta') {
      h += '<input class="fld" type="text" placeholder="버튼 문구" data-bfield="label" data-bk="' + key + '" data-bi="' + i + '" value="' + esc(b.label) + '" />';
      h += '<input class="fld mono" type="text" placeholder="https://..." data-bfield="url" data-bk="' + key + '" data-bi="' + i + '" value="' + esc(b.url) + '" />';
      h += '<div class="fld-hint">https:// 로 시작하지 않는 주소는 발송 시 링크가 제거됩니다.</div>';
    } else {
      h += '<textarea class="fld" rows="2" placeholder="문구를 입력하세요" data-bfield="text" data-bk="' + key + '" data-bi="' + i + '">' + esc(b.text) + '</textarea>';
      if (b.type === 'callout') {
        h += '<div class="tone-row"><span class="fld-hint">강조</span><div class="seg seg-sm">' +
          ['info', 'warn', 'danger'].map(t =>
            '<button class="' + (b.tone === t ? 'on' : '') + '" data-btone="' + t + '" data-bk="' + key + '" data-bi="' + i + '">' +
            (t === 'info' ? '정보' : t === 'warn' ? '주의' : '경고') + '</button>').join('') +
          '</div></div>';
      }
    }
    h += '</div></div>';
  });
  h += '</div>';
  h += '<div class="blk-add">' +
    '<button class="btn btn-outline btn-sm" data-badd="text" data-bk="' + key + '">+ 문구</button>' +
    '<button class="btn btn-outline btn-sm" data-badd="callout" data-bk="' + key + '">+ 콜아웃</button>' +
    '<button class="btn btn-outline btn-sm" data-badd="cta" data-bk="' + key + '">+ CTA 버튼</button>' +
    '</div>';
  return h;
}

function renderForm() {
  const wrap = $('#accWrap');
  wrap.innerHTML = SECTIONS.map(sec => {
    const fs = FIELDS.filter(f => f.sec === sec.no);
    const ovN = fs.filter(f => isOverridden(f.key)).length;
    return '<div class="acc' + (state.openSec[sec.no] ? ' open' : '') + '" data-sec="' + sec.no + '">' +
      '<button class="acc-head" data-acc="' + sec.no + '">' +
        '<span class="acc-no">' + sec.no + '</span>' +
        '<span class="acc-title">' + esc(sec.title) + '</span>' +
        (ovN ? '<span class="pill">개별 ' + ovN + '</span>' : '') +
        '<svg class="acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</button>' +
      '<div class="acc-body">' + fs.map(fieldHtml).join('') + '</div>' +
      '</div>';
  }).join('');

  bindForm();
  refreshResolved();
  refreshDirty();
}

/** 오버라이드로 전환할 때 현재 공용값을 그대로 복사해 둔다(값이 튀지 않도록). */
function setOverride(key, on) {
  if (on) {
    const lay = layoutById(state.draftLayoutId);
    const v = lay[key];
    state.draftOverride[key] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
  } else {
    delete state.draftOverride[key];
  }
}

function writeValue(key, val) {
  if (!isOverridden(key)) setOverride(key, true);
  state.draftOverride[key] = val;
}

function blocksOf(key) {
  const v = effValue(key) || [];
  return isOverridden(key) ? v : JSON.parse(JSON.stringify(v));
}

function mutateBlocks(key, fn) {
  const arr = blocksOf(key);
  fn(arr);
  writeValue(key, arr);
  renderForm();
  renderPreview();
}

function bindForm() {
  /* 아코디언 */
  $$('#accWrap [data-acc]').forEach(b => b.addEventListener('click', () => {
    const n = parseInt(b.dataset.acc, 10);
    state.openSec[n] = !state.openSec[n];
    b.parentElement.classList.toggle('open', state.openSec[n]);
  }));

  /* 오버라이드 토글 */
  $$('#accWrap [data-ovr]').forEach(b => b.addEventListener('click', () => {
    setOverride(b.dataset.ovr, !isOverridden(b.dataset.ovr));
    renderForm();
    renderPreview();
  }));

  /* 텍스트 입력 — 폼을 다시 그리지 않아 커서가 유지된다 */
  $$('#accWrap [data-fkey]').forEach(el => el.addEventListener('input', () => {
    writeValue(el.dataset.fkey, el.value);
    markOverriddenRow(el.dataset.fkey);
    refreshResolved();
    refreshDirty();
    schedulePreview();
  }));

  /* 불리언 토글 */
  $$('#accWrap [data-fbool]').forEach(b => b.addEventListener('click', () => {
    writeValue(b.dataset.fbool, !effValue(b.dataset.fbool));
    renderForm();
    renderPreview();
  }));

  /* 강조색 */
  $$('#accWrap [data-faccent]').forEach(b => b.addEventListener('click', () => {
    writeValue('headerAccent', b.dataset.faccent);
    renderForm();
    renderPreview();
  }));

  /* 블록 조작 */
  $$('#accWrap [data-badd]').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.badd;
    const nb = t === 'cta'
      ? { type: 'cta', label: '자세히 보기', url: '{{siteUrl}}' }
      : t === 'callout'
        ? { type: 'callout', tone: 'info', text: '' }
        : { type: 'text', text: '' };
    mutateBlocks(b.dataset.bk, arr => arr.push(nb));
  }));

  $$('#accWrap [data-bdel]').forEach(b => b.addEventListener('click', () =>
    mutateBlocks(b.dataset.bk, arr => arr.splice(parseInt(b.dataset.bi, 10), 1))));

  $$('#accWrap [data-bmove]').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.bi, 10);
    const j = b.dataset.bmove === 'up' ? i - 1 : i + 1;
    mutateBlocks(b.dataset.bk, arr => {
      if (j < 0 || j >= arr.length) return;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    });
  }));

  $$('#accWrap [data-bfield]').forEach(el => el.addEventListener('input', () => {
    const key = el.dataset.bk, i = parseInt(el.dataset.bi, 10);
    const arr = blocksOf(key);
    arr[i][el.dataset.bfield] = el.value;
    writeValue(key, arr);
    markOverriddenRow(key);
    refreshDirty();
    schedulePreview();
  }));

  $$('#accWrap [data-btone]').forEach(b => b.addEventListener('click', () => {
    const i = parseInt(b.dataset.bi, 10);
    mutateBlocks(b.dataset.bk, arr => { arr[i].tone = b.dataset.btone; });
  }));
}

/** 폼을 다시 그리지 않고 "개별" 표시만 갱신 */
function markOverriddenRow(key) {
  const row = $('#accWrap [data-row="' + key + '"]');
  if (!row || row.classList.contains('overridden')) return;
  row.classList.add('overridden');
  const label = $('.fldrow-label', row);
  if (label && !$('.ovr-mark', label)) {
    const m = document.createElement('span');
    m.className = 'ovr-mark';
    m.textContent = '개별';
    label.appendChild(m);
  }
  const sw = $('.ovr-switch', row);
  if (sw) { $('span', sw).textContent = '이 메일 전용'; $('.toggle', sw).classList.add('on'); }
}

function refreshResolved() {
  const s = currentSched();
  if (!s) return;
  const vars = previewVars();
  $$('#accWrap [data-rkey]').forEach(el => {
    const raw = String(effValue(el.dataset.rkey) || '');
    if (!raw.trim()) {
      el.classList.remove('hidden');
      el.innerHTML = '<i>비어 있음 — 이 영역은 메일에서 생략됩니다.</i>';
      return;
    }
    /* 변수가 없으면 원문과 같아 보여줄 이유가 없다 */
    if (!/\{\{\w+\}\}/.test(raw)) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = '치환 결과 · <b>' + esc(applyVars(raw, vars)) + '</b>';
  });
}

function refreshDirty() {
  const s = currentSched();
  if (!s) return;
  const changed = JSON.stringify(state.draftOverride) !== JSON.stringify(s.override || {})
    || state.draftLayoutId !== s.layoutId;
  const n = Object.keys(state.draftOverride).length;
  $('#edDirty').innerHTML = changed
    ? '<b style="color:var(--warning);">저장되지 않은 변경</b> · 개별 오버라이드 ' + n + '개'
    : '변경 사항 없음 · 개별 오버라이드 ' + n + '개';
}

/* ---------- 미리보기 ---------- */
function previewVars() {
  const s = currentSched();
  if (state.bodySrc === 'snapshot') {
    const sn = (RUN_SNAPSHOTS[s.id] || [])[state.snapIdx];
    if (sn) return buildVars(s, sn.runAt, sn.runAt);
  }
  return buildVars(s, TODAY, NOW_LABEL);
}

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 150);
}

let lastComposed = null;

/**
 * srcdoc 는 same-origin 이라 내용 높이를 잴 수 있다.
 * 메일 전체가 한눈에 보이도록 프레임을 늘린다(내부 스크롤 방지).
 */
function fitFrame(frame, html, max) {
  frame.onload = () => {
    try {
      const d = frame.contentDocument;
      const h = Math.max(
        d.documentElement.scrollHeight,
        d.body ? d.body.scrollHeight : 0
      );
      frame.style.height = Math.min(Math.max(h + 4, 320), max || 1400) + 'px';
    } catch (err) {
      frame.style.height = '620px';   /* 접근이 막히면 기본 높이 유지 */
    }
  };
  frame.srcdoc = html;
}

function renderPreview() {
  const s = currentSched();
  if (!s) return;
  const lay = layoutById(state.draftLayoutId);
  const vars = previewVars();
  const body = bodyOf(s);

  let composed, note = '';
  if (state.bodySrc === 'snapshot') {
    /* 발송본은 그때의 레이아웃으로 얼어 있다 — 편집 내용이 반영되지 않는다.
       실제 구현에서는 report_schedule_run_artifact.rendered_html 을 그대로 읽는다. */
    const sn = (RUN_SNAPSHOTS[s.id] || [])[state.snapIdx];
    const frozenOverride = Object.assign({}, s.override || {}, sn ? sn.patch : {});
    composed = composeMail(lay, frozenOverride, vars, body);
    note = '발송본 (편집 내용 미적용)';
  } else {
    composed = composeMail(lay, state.draftOverride, vars, body);
    note = state.bodySrc === 'live' ? '실데이터 dry-run' : '샘플 본문';
  }
  lastComposed = composed;

  $('#mailSubject').textContent = composed.subject || '(제목 없음)';
  $('#mailFrom').textContent = (composed.fromName || '(발신자명 없음)') + ' <' + (composed.fromAddress || '-') + '>';
  const recip = state.bodySrc === 'snapshot'
    ? ((RUN_SNAPSHOTS[s.id] || [])[state.snapIdx] || {}).recipients
    : null;
  $('#mailTo').textContent = recip ? '받는사람 ' + recip + '명' : '받는사람 · 스케줄 수신자';
  $('#mailWhen').textContent = vars.sentAt + ' · ' + note;

  fitFrame($('#mailFrame'), composed.html, 1500);
  $('#frameWrap').classList.toggle('vp-mobile', state.vp === 'mobile');

  if (state.compare) renderCompare(lay, vars, body);
  refreshResolved();
}

function renderCompare(lay, vars, body) {
  const a = composeMail(lay, {}, vars, body);
  const b = composeMail(lay, state.draftOverride, vars, body);
  $('#cmpSubjA').textContent = a.subject || '(제목 없음)';
  $('#cmpSubjB').textContent = b.subject || '(제목 없음)';
  fitFrame($('#cmpFrameA'), a.html, 900);
  fitFrame($('#cmpFrameB'), b.html, 900);

  const keys = Object.keys(state.draftOverride);
  $('#diffList').innerHTML = keys.length
    ? keys.map(k => '<span class="diff-chip">' + esc(FIELD_LABEL[k] || k) + '</span>').join('')
    : '<span class="fld-hint">덮어쓴 항목이 없습니다 — 두 화면이 동일합니다.</span>';
}

/* =========================================================
   VIEW ③ 라이브러리
   ========================================================= */
function thumbHtml(layout) {
  const fake = {
    name: '리포트 제목',
    vars: { period: '2026-09-01 ~ 2026-09-07', rowCount: '41', siteUrl: 'https://ax-labs.yes24.com/' },
    bodyKey: 'aiBookDetect'
  };
  return composeMail(layout, {}, buildVars(fake, TODAY, NOW_LABEL), SAMPLE_BODIES.aiBookDetect).html;
}

function renderLibrary() {
  const grid = $('#layGrid');
  grid.innerHTML = LAYOUTS.map(l => {
    const used = SCHEDULES.filter(s => s.layoutId === l.id);
    const ovr = used.filter(s => overrideCount(s) > 0).length;
    return '<div class="card lay-card">' +
      '<div class="card-content">' +
        '<div class="lay-thumb"><iframe sandbox="allow-same-origin" title="' + esc(l.name) + ' 미리보기" data-thumb="' + l.id + '"></iframe>' +
          '<div class="lay-thumb-mask" data-open="' + l.id + '"></div></div>' +
        '<div class="lay-name">' + esc(l.name) +
          (l.isDefault ? ' <span class="badge badge-success">기본</span>' : '') + '</div>' +
        '<div class="lay-desc">' + esc(l.desc) + '</div>' +
        '<div class="lay-meta"><span class="src-tag">layout_id=' + l.id + '</span>' +
          '<span>사용 중 ' + used.length + '개</span><span>개별 수정 ' + ovr + '개</span></div>' +
        '<div class="lay-acts">' +
          '<button class="btn btn-outline btn-sm" data-open="' + l.id + '">이 레이아웃 쓰는 메일 보기</button>' +
          '<button class="btn btn-ghost btn-sm" data-dup="' + l.id + '">복제</button>' +
        '</div>' +
      '</div></div>';
  }).join('') +
    '<button class="lay-new" id="btnNewLayout">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '새 레이아웃 만들기</button>';

  LAYOUTS.forEach(l => {
    const f = $('#layGrid [data-thumb="' + l.id + '"]');
    if (f) f.srcdoc = thumbHtml(l);
  });

  $$('#layGrid [data-open]').forEach(b => b.addEventListener('click', () => {
    state.layFilter = parseInt(b.dataset.open, 10);
    switchView('list');
    renderChips(); renderList();
  }));
  $$('#layGrid [data-dup]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    toast('레이아웃을 복제했습니다. (프로토타입 — 저장되지 않습니다)');
  }));
  $('#btnNewLayout').addEventListener('click', () =>
    toast('새 레이아웃 생성은 프로토타입 범위 밖입니다.'));

  /* 사용 현황 표 */
  $('#usageTbl tbody').innerHTML = LAYOUTS.map(l => {
    const used = SCHEDULES.filter(s => s.layoutId === l.id);
    const ovrList = used.filter(s => overrideCount(s) > 0);
    const keys = Array.from(new Set(ovrList.flatMap(s => Object.keys(s.override))));
    return '<tr>' +
      '<td><b>' + esc(l.name) + '</b>' + (l.isDefault ? ' <span class="badge badge-success">기본</span>' : '') + '</td>' +
      '<td class="num">' + used.length + '</td>' +
      '<td class="num">' + ovrList.length + '</td>' +
      '<td>' + (keys.length
        ? keys.map(k => '<span class="pill">' + esc(FIELD_LABEL[k] || k) + '</span>').join(' ')
        : '<span class="dim">–</span>') + '</td>' +
      '</tr>';
  }).join('');
}

/* =========================================================
   뷰 전환
   ========================================================= */
const VIEW_META = {
  list: { title: '발송 메일 레이아웃', sub: '리포트 메일의 제목·헤더·안내문구·푸터를 발송 전에 관리하고 미리봅니다.' },
  editor: { title: '레이아웃 편집', sub: '왼쪽에서 껍데기를 고치면 오른쪽에 실제 발송될 메일이 그대로 합성됩니다.' },
  library: { title: '레이아웃 라이브러리', sub: '여러 메일이 공유하는 공용 껍데기를 관리합니다.' }
};

function switchView(name) {
  state.view = name;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  $('#crumb').textContent = VIEW_META[name].title;
  $('#pageTitle').textContent = VIEW_META[name].title;
  $('#pageSubtitle').textContent = VIEW_META[name].sub;
  const navKey = name === 'library' ? 'library' : 'list';
  $$('.nav-item-btn').forEach(a => a.classList.toggle('active', a.dataset.view === navKey));
  if (name === 'library') renderLibrary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================================================
   변수 칩
   ========================================================= */
let lastFocused = null;

/* 폼은 renderForm() 마다 다시 그려지므로 개별 노드가 아니라 컨테이너에 위임한다.
   focusin 은 focus 와 달리 버블링한다. */
$('#accWrap').addEventListener('focusin', e => {
  if (e.target.classList && e.target.classList.contains('fld')) lastFocused = e.target;
});

/** 변수를 삽입할 입력란. 칩은 mousedown 을 preventDefault 하므로 포커스가 유지된다. */
function insertTarget() {
  const cand = [document.activeElement, lastFocused];
  for (const el of cand) {
    if (el && el.dataset && document.contains(el) && (el.dataset.fkey || el.dataset.bfield)) return el;
  }
  return null;
}

function renderVarBar() {
  $('#varBar').innerHTML = VARS.map(v =>
    '<button class="varchip" data-var="' + v.k + '" title="' + esc(v.d) + '">{{' + v.k + '}}</button>').join('');
  $$('#varBar .varchip').forEach(b => b.addEventListener('mousedown', e => {
    e.preventDefault();
    const el = insertTarget();
    if (!el) {
      toast('먼저 값을 넣을 입력란을 클릭하세요.');
      return;
    }
    const token = '{{' + b.dataset.var + '}}';
    const st = el.selectionStart == null ? el.value.length : el.selectionStart;
    const en = el.selectionEnd == null ? el.value.length : el.selectionEnd;
    el.value = el.value.slice(0, st) + token + el.value.slice(en);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    el.setSelectionRange(st + token.length, st + token.length);
  }));
}

/* =========================================================
   이벤트 바인딩
   ========================================================= */
$('#q').addEventListener('input', e => { state.q = e.target.value; renderList(); });
$$('#segFilter button').forEach(b => b.addEventListener('click', () => {
  $$('#segFilter button').forEach(x => x.classList.toggle('on', x === b));
  state.filter = b.dataset.f;
  renderList();
}));

$('#btnBackList').addEventListener('click', () => { switchView('list'); renderList(); });

$('#edLayoutSel').addEventListener('change', e => {
  state.draftLayoutId = parseInt(e.target.value, 10);
  renderForm();
  renderPreview();
});

$$('#segBody button').forEach(b => b.addEventListener('click', () => {
  if (b.disabled) return;
  $$('#segBody button').forEach(x => x.classList.toggle('on', x === b));
  state.bodySrc = b.dataset.src;
  $('#snapSel').style.display = state.bodySrc === 'snapshot' ? '' : 'none';
  if (state.bodySrc === 'live') toast('실데이터 dry-run 응답을 받아왔습니다. (프로토타입 — 샘플과 동일한 본문)');
  renderPreview();
}));

$('#snapSel').addEventListener('change', e => {
  state.snapIdx = Math.max(0, parseInt(e.target.value, 10));
  renderPreview();
});

$$('#segVp button').forEach(b => b.addEventListener('click', () => {
  $$('#segVp button').forEach(x => x.classList.toggle('on', x === b));
  state.vp = b.dataset.vp;
  $('#frameWrap').classList.toggle('vp-mobile', state.vp === 'mobile');
}));

$('#btnCompare').addEventListener('click', () => {
  state.compare = !state.compare;
  $('#cmpGrid').classList.toggle('hidden', !state.compare);
  $('#diffList').classList.toggle('hidden', !state.compare);
  $('#mailShell').classList.toggle('hidden', state.compare);
  $('#btnCompare').textContent = state.compare ? '비교 닫기' : '공용과 비교';
  renderPreview();
});

$('#btnOpenTab').addEventListener('click', () => {
  if (!lastComposed) return;
  const url = URL.createObjectURL(new Blob([lastComposed.html], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
});

$('#btnViewHtml').addEventListener('click', () => {
  if (!lastComposed) return;
  $('#htmlSrc').textContent = lastComposed.html;
  $('#htmlModal').classList.add('open');
});
$('#btnCloseHtml').addEventListener('click', () => $('#htmlModal').classList.remove('open'));
$('#htmlModal').addEventListener('click', e => {
  if (e.target === $('#htmlModal')) $('#htmlModal').classList.remove('open');
});
$('#btnCopyHtml').addEventListener('click', () => {
  navigator.clipboard.writeText($('#htmlSrc').textContent)
    .then(() => toast('HTML을 복사했습니다.'))
    .catch(() => toast('복사에 실패했습니다.'));
});

$('#btnSave').addEventListener('click', () => {
  const s = currentSched();
  s.layoutId = state.draftLayoutId;
  s.override = JSON.parse(JSON.stringify(state.draftOverride));
  renderStats(); renderChips(); renderList(); refreshDirty();
  toast('레이아웃을 저장했습니다. (프로토타입 — 새로고침하면 초기화됩니다)');
});

$('#btnResetAll').addEventListener('click', () => {
  state.draftOverride = {};
  renderForm();
  renderPreview();
  toast('공용 레이아웃 값으로 되돌렸습니다. 저장해야 반영됩니다.');
});

$('#btnTestMail').addEventListener('click', () =>
  toast('본인 계정으로 테스트 메일을 발송했습니다. (프로토타입)'));

$$('.nav-item-btn[data-view]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  switchView(a.dataset.view);
  if (a.dataset.view === 'list') renderList();
}));

$('#themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  $('#iconMoon').classList.toggle('hidden', dark);
  $('#iconSun').classList.toggle('hidden', !dark);
});

/* =========================================================
   초기 렌더
   ========================================================= */
renderStats();
renderChips();
renderList();
renderVarBar();
