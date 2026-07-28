// ============================================================
// story.js — 자동 재생 여정과 컨트롤
//
// 두 겹의 타임라인.
//   master : 길이 1짜리 "진행도 공간" (position === 진행도)
//   auto   : 실제 재생 헤드. 구역으로 "이동"할 때는 빠르게,
//            구역에 "머무를" 때는 느리게 흐르도록 완급을 만든다.
//
// 장면 상태(문구·색·HUD·랙 점등)는 콜백이 아니라 현재 진행도에서
// 매번 다시 계산해 적용한다. 구간을 건너뛰어도 어긋나지 않는다.
// ============================================================

/* global gsap */
import { ACTS } from './data.js';

export const journeyState = { progress: 0 };

const RATES = [0.5, 0.75, 1, 1.5, 2];
const DEFAULT_RATE = 1.5;
// 저장 키에 버전을 달아 둔다. 기본 배속을 바꿀 때 키를 올리면
// 예전에 저장된 값 때문에 새 기본값이 묻히지 않는다.
const RATE_KEY = 'ax-datahub-rate-v2';

/**
 * 각 장면이 차지하는 진행도 구간.
 * 진입 이동(in)은 빠르게, 머무는 구간(dwell)은 느리게.
 */
const BEATS = [
  { p: 0.030, inDur: 1.2, out: 0.105, outDur: 2.8 },  // 진입
  { p: 0.230, inDur: 3.4, out: 0.420, outDur: 4.6 },  // MSTR (랙 4개를 지나는 동안)
  { p: 0.485, inDur: 2.6, out: 0.575, outDur: 3.6 },  // 클릭스트림
  { p: 0.645, inDur: 2.6, out: 0.740, outDur: 3.6 },  // 통합
  { p: 0.805, inDur: 2.6, out: 0.905, outDur: 4.0 },  // 성과(게이트 통과)
  { p: 0.960, inDur: 2.6, out: 1.000, outDur: 4.2 },  // 대시보드
];

/** 공기(포그) 색 키프레임 */
const AIR = [
  { p: 0.00, bg: '#05080f', tint: '#0a1b2e', a: 0.62, fg: '#e6edf9' },
  { p: 0.16, bg: '#05080f', tint: '#0a1b2e', a: 0.6,  fg: '#e6edf9' },
  { p: 0.30, bg: '#050b18', tint: '#0d2247', a: 0.6,  fg: '#e6edf9' },
  { p: 0.50, bg: '#0a0618', tint: '#2a1247', a: 0.6,  fg: '#e6edf9' },
  { p: 0.68, bg: '#04120f', tint: '#0b3b34', a: 0.6,  fg: '#e6edf9' },
  { p: 0.82, bg: '#120c04', tint: '#48300c', a: 0.58, fg: '#e6edf9' },
  { p: 0.92, bg: '#7d90ad', tint: '#d3e2f6', a: 0.44, fg: '#9db2cf' },
  { p: 1.00, bg: '#eef4fc', tint: '#ffffff', a: 0.6,  fg: '#14203a' },
];

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return A.map((v, i) => Math.round(v + (B[i] - v) * t));
};
const lerp = (a, b, t) => a + (b - a) * t;

function sampleAir(p) {
  let a = AIR[0];
  let b = AIR[AIR.length - 1];
  for (let i = 0; i < AIR.length - 1; i++) {
    if (p >= AIR[i].p && p <= AIR[i + 1].p) { a = AIR[i]; b = AIR[i + 1]; break; }
  }
  const t = a === b ? 0 : (p - a.p) / (b.p - a.p);
  return {
    bg: mix(a.bg, b.bg, t),
    tint: mix(a.tint, b.tint, t),
    a: lerp(a.a, b.a, t),
    fg: mix(a.fg, b.fg, t),
  };
}

const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function createStory({ hud, world }) {
  const root = document.documentElement;
  const air = document.getElementById('air');
  const caption = document.getElementById('caption');
  const elEyebrow = document.getElementById('act-eyebrow');
  const elTitle = document.getElementById('act-title');
  const elBody = document.getElementById('act-body');

  const chaptersBox = document.getElementById('chapters');
  const playBtn = document.getElementById('play-toggle');
  const timeLabel = document.getElementById('time-label');
  const speedBtn = document.getElementById('speed-toggle');
  const speedLabel = document.getElementById('speed-label');
  const speedMenu = document.getElementById('speed-menu');
  const progressTrack = document.getElementById('progress-track');
  const progressFill = document.getElementById('progress-fill');

  let rate = DEFAULT_RATE;
  let actIndex = -1;
  let isBright = false;
  let captionTw = null;

  /* ---------- 챕터 ---------- */
  const chapterBtns = ACTS.map((act, i) => {
    const b = document.createElement('button');
    b.className = 'chapter';
    b.innerHTML = `<i></i><em>${act.chapter}</em>`;
    b.addEventListener('click', () => gotoAct(i));
    chaptersBox.appendChild(b);
    return b;
  });

  /* ---------- 진행도 → 화면 ---------- */
  function applyAir(p) {
    const e = sampleAir(p);
    document.body.style.backgroundColor = `rgb(${e.bg.join(', ')})`;
    air.style.background =
      `radial-gradient(ellipse at 50% 50%, transparent 8%, rgba(${e.tint.join(', ')}, ${e.a.toFixed(3)}) 78%)`;
    root.style.setProperty('--ui-fg', `rgb(${e.fg.join(', ')})`);

    const bright = p > 0.94;
    if (bright !== isBright) {
      document.body.classList.toggle('is-bright', bright);
      isBright = bright;
    }
  }

  /** 몇 번을 불러도 같은 결과가 되도록 만든다 */
  function applyAct(i) {
    const act = ACTS[i];

    elEyebrow.textContent = act.eyebrow;
    elTitle.innerHTML = act.title;
    elBody.innerHTML = act.body;

    captionTw?.kill();
    captionTw = gsap.fromTo(caption,
      { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    captionTw.timeScale(rate);

    root.style.setProperty('--accent', act.accent);

    // 이 장면에서 불이 들어오는 데이터 랙
    const on = new Set(act.hot);
    for (const rack of world.hotRacks) {
      const tag = rack.querySelector('.rack-tag')?.textContent;
      rack.classList.toggle('is-hot', on.has(tag));
    }

    hud.scan(act.scan, rate);
    hud.lockOn(act.lock, rate);

    chapterBtns.forEach((b, k) => b.classList.toggle('is-active', k === i));
  }

  /* ---------- master : 진행도 공간 ---------- */
  const master = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  master.to(journeyState, {
    progress: 1,
    duration: 1,
    onUpdate: () => applyAir(journeyState.progress),
  }, 0);

  master.fromTo('#finale',
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.965);
  master.to('#caption', { autoAlpha: 0, duration: 0.03 }, 0.955);

  /* ---------- auto : 재생 헤드 ---------- */
  const head = { p: 0 };
  const actTimes = [];
  let total = 0;
  let prevP = 0;

  const auto = gsap.timeline({
    paused: true,
    onUpdate: () => {
      master.progress(head.p);
      const i = actAt(head.p);
      if (i !== actIndex) { actIndex = i; applyAct(i); }
      progressFill.style.width = `${(auto.progress() * 100).toFixed(2)}%`;
      updateTimeLabel();
    },
    onComplete: () => setPlayIcon('replay'),
  });

  for (const b of BEATS) {
    auto.to(head, { p: b.p, duration: b.inDur, ease: 'power1.inOut' }, total);
    total += b.inDur;
    actTimes.push(Math.max(0, total - 1.0)); // 도착 직전부터 보여준다
    auto.to(head, { p: b.out, duration: b.outDur, ease: 'none' }, total);
    total += b.outDur;
    prevP = b.out;
  }

  /** 진행도 → 장면 인덱스 (구간 경계로 판정) */
  function actAt(p) {
    for (let i = BEATS.length - 1; i >= 0; i--) {
      // 그 장면으로 이동을 시작하는 지점부터 해당 장면으로 본다
      const from = i === 0 ? 0 : BEATS[i - 1].out;
      if (p >= from - 1e-6) return i;
    }
    return 0;
  }

  function updateTimeLabel() {
    timeLabel.textContent = `${mmss(auto.time() / rate)} / ${mmss(auto.duration() / rate)}`;
  }

  /* ---------- 재생 컨트롤 ---------- */
  function setPlayIcon(mode) {
    playBtn.dataset.mode = mode;
    playBtn.setAttribute('aria-label',
      mode === 'pause' ? '일시정지' : mode === 'replay' ? '다시 보기' : '재생');
  }
  function play() {
    if (auto.progress() >= 1) { hud.reset(); auto.restart(); }
    else auto.play();
    setPlayIcon('pause');
  }
  function pause() { auto.pause(); setPlayIcon('play'); }
  function toggle() { (auto.paused() || auto.progress() >= 1) ? play() : pause(); }
  function gotoAct(i) {
    const k = Math.min(ACTS.length - 1, Math.max(0, i));
    auto.pause();
    auto.time(actTimes[k]);
    play();
  }

  playBtn.addEventListener('click', toggle);

  progressTrack.addEventListener('click', (e) => {
    const r = progressTrack.getBoundingClientRect();
    if (r.width <= 0) return;
    const wasPlaying = !auto.paused() && auto.progress() < 1;
    auto.pause();
    auto.progress(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    if (wasPlaying) play(); else setPlayIcon('play');
  });

  /* ---------- 재생 시간(배속) ---------- */
  const rateButtons = RATES.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitemradio');
    b.dataset.rate = String(r);
    b.innerHTML = `<span>${r}×</span><em>${mmss(total / r)}</em>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); applyRate(r); closeMenu(); });
    speedMenu.appendChild(b);
    return b;
  });

  function applyRate(r) {
    rate = r;
    auto.timeScale(r);
    speedLabel.textContent = `${r}×`;
    rateButtons.forEach((b) => {
      const on = parseFloat(b.dataset.rate) === r;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    updateTimeLabel();
    try { localStorage.setItem(RATE_KEY, String(r)); } catch { /* 저장 불가 환경 */ }
  }

  const openMenu = () => { speedMenu.classList.add('is-open'); speedBtn.setAttribute('aria-expanded', 'true'); };
  const closeMenu = () => { speedMenu.classList.remove('is-open'); speedBtn.setAttribute('aria-expanded', 'false'); };
  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  document.addEventListener('click', closeMenu);

  function stepRate(step) {
    const i = RATES.indexOf(rate);
    applyRate(RATES[Math.min(RATES.length - 1, Math.max(0, i + step))]);
  }

  /* ---------- 키보드 ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeMenu();
    else if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); gotoAct(actIndex + 1); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); gotoAct(actIndex - 1); }
    else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
      e.preventDefault();
      stepRate(e.code === 'BracketRight' ? 1 : -1);
    }
  });

  let pausedByHide = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!auto.paused() && auto.progress() < 1) { pausedByHide = true; pause(); }
    } else if (pausedByHide) { pausedByHide = false; play(); }
  });

  /* ---------- 시작 ---------- */
  function start() {
    // 기본은 DEFAULT_RATE, 지난 방문에서 직접 고른 값이 있으면 그것을 복원
    let saved = DEFAULT_RATE;
    try {
      const v = parseFloat(localStorage.getItem(RATE_KEY));
      if (RATES.includes(v)) saved = v;
    } catch { /* 기본값 */ }
    applyRate(saved);

    applyAir(0);
    master.progress(0);
    actIndex = -1;
    applyAct(0);
    setPlayIcon('pause');
    gsap.delayedCall(0.6, () => { if (!pausedByHide) auto.play(); });
  }

  return { auto, master, start, gotoAct, total, get rate() { return rate; } };
}
