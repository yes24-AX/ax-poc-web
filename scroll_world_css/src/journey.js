// ============================================================
// journey.js — 자동 재생 여정 (스크롤 대신 시간이 카메라를 움직인다)
//
// 두 개의 타임라인으로 구성된다.
//   master : 길이 1짜리 "진행도 공간" 타임라인.
//            position === 진행도(0~1). 캡션·환경색이 여기에 매달려 있다.
//   auto   : 실제 재생 헤드. 시간에 따라 head.p를 움직이고
//            매 프레임 master.progress(head.p)로 반영한다.
//
// auto를 따로 두는 이유는 완급 때문이다. 진행도를 시간에 대해 일정하게
// 흘리면 관광버스처럼 밋밋해진다. 씬으로 "이동"할 때는 빠르게,
// 씬에 "머무를" 때는 아주 느리게 흐르도록 구간을 나눈다.
// ============================================================

/* global gsap */

// 렌더 루프(main.js)가 읽어가는 공유 상태
export const journeyState = { progress: 0 };

/**
 * 씬 구성 — 각 씬은 [진입 이동] + [머무르며 천천히 흐르기] 두 구간을 갖는다.
 *   in / inDur   : 이 씬의 시작 진행도, 거기까지 이동하는 데 걸리는 시간(초)
 *   out / outDur : 머무는 동안 서서히 흘러갈 끝 진행도와 그 시간(초)
 * 머무는 구간은 캡션이 떠 있는 진행도 범위와 맞춰져 있다.
 */
const SCENES = [
  { key: 'intro',   in: 0.020, inDur: 1.0, out: 0.075, outDur: 2.8 },
  { key: 'hub',     in: 0.290, inDur: 4.2, out: 0.405, outDur: 3.6 },
  { key: 'core',    in: 0.525, inDur: 3.2, out: 0.665, outDur: 4.0 },
  { key: 'factory', in: 0.780, inDur: 3.6, out: 0.905, outDur: 3.8 },
  { key: 'work',    in: 0.955, inDur: 2.4, out: 1.000, outDur: 2.6 },
];

/** 선택 가능한 재생 배속. 총 재생 시간 = 기본 길이 ÷ 배속 */
const RATES = [0.5, 0.75, 1, 1.5, 2];
const RATE_STORE_KEY = 'ax-labs-journey-rate';

/** 챕터 인디케이터가 활성화되는 진행도 구간 */
const CHAPTER_RANGES = [
  [0, 0.22], [0.22, 0.46], [0.46, 0.72], [0.72, 0.93], [0.93, 1.001],
];

/**
 * 환경 키프레임
 *   bg: 배경색 / tint·a: 대기 비네트 색과 강도
 *   accent: 씬 액센트 / fg: 고정 UI 글자색
 */
const ENV = [
  { p: 0.00, bg: '#05070f', tint: '#0b1330', a: 0.5,  accent: '#7aa2ff', fg: '#e8eefc' },
  { p: 0.18, bg: '#05070f', tint: '#0b1330', a: 0.48, accent: '#7aa2ff', fg: '#e8eefc' },
  { p: 0.30, bg: '#03101a', tint: '#07364d', a: 0.5,  accent: '#34d3ff', fg: '#e8eefc' },
  { p: 0.40, bg: '#040e1c', tint: '#0a2b4a', a: 0.5,  accent: '#34d3ff', fg: '#e8eefc' },
  { p: 0.52, bg: '#08061c', tint: '#2a1656', a: 0.52, accent: '#9d7bff', fg: '#e8eefc' },
  { p: 0.62, bg: '#0a0722', tint: '#33195f', a: 0.5,  accent: '#9d7bff', fg: '#e8eefc' },
  { p: 0.74, bg: '#120c06', tint: '#43260e', a: 0.5,  accent: '#ffab4d', fg: '#e8eefc' },
  { p: 0.86, bg: '#16100a', tint: '#54331a', a: 0.46, accent: '#ffab4d', fg: '#e8eefc' },
  { p: 0.93, bg: '#8fa6c8', tint: '#dce8fa', a: 0.42, accent: '#8fb4ff', fg: '#9fb4d4' },
  { p: 1.00, bg: '#f4f7fc', tint: '#ffffff', a: 0.6,  accent: '#2f6bff', fg: '#16233d' },
];

/* ---- 색 보간 (외부 라이브러리 없이) ---- */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}
const lerp = (a, b, t) => a + (b - a) * t;

function sampleEnv(p) {
  let a = ENV[0];
  let b = ENV[ENV.length - 1];
  for (let i = 0; i < ENV.length - 1; i++) {
    if (p >= ENV[i].p && p <= ENV[i + 1].p) {
      a = ENV[i];
      b = ENV[i + 1];
      break;
    }
  }
  const t = a === b ? 0 : (p - a.p) / (b.p - a.p);
  return {
    bg: mix(a.bg, b.bg, t),
    tint: mix(a.tint, b.tint, t),
    a: lerp(a.a, b.a, t),
    accent: mix(a.accent, b.accent, t),
    fg: mix(a.fg, b.fg, t),
  };
}

const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function initJourney() {
  const root = document.documentElement;
  const atmosphere = document.getElementById('atmosphere');
  const progressTrack = document.getElementById('progress-track');
  const progressFill = document.getElementById('progress-fill');
  const playBtn = document.getElementById('play-toggle');
  const timeLabel = document.getElementById('time-label');
  const replayBtn = document.getElementById('replay');
  const speedBtn = document.getElementById('speed-toggle');
  const speedLabel = document.getElementById('speed-label');
  const speedMenu = document.getElementById('speed-menu');
  const chapters = [...document.querySelectorAll('.chapter')];

  let activeChapter = -1;
  let isLight = false;
  let rate = 1;

  /* ---------- 진행도 → 화면 ---------- */
  function applyEnvironment(p) {
    const env = sampleEnv(p);

    document.body.style.backgroundColor = `rgb(${env.bg.join(', ')})`;
    // 화면 가장자리로 갈수록 짙어지는 대기 → 포그처럼 공간을 감싼다
    atmosphere.style.background =
      `radial-gradient(ellipse at 50% 52%, transparent 30%, ` +
      `rgba(${env.tint.join(', ')}, ${env.a.toFixed(3)}) 100%)`;

    // 액센트/글자색을 CSS 변수로 흘려 UI 전체가 함께 반응하게 한다
    root.style.setProperty('--accent', `rgb(${env.accent.join(', ')})`);
    root.style.setProperty('--nav-fg', `rgb(${env.fg.join(', ')})`);

    // 밝은 워크스페이스 구간에서는 UI 패널의 명암을 뒤집는다
    const light = p > 0.9;
    if (light !== isLight) {
      document.body.classList.toggle('is-light', light);
      isLight = light;
    }

    progressFill.style.width = `${(p * 100).toFixed(2)}%`;

    // 챕터 인디케이터
    let idx = CHAPTER_RANGES.findIndex(([lo, hi]) => p >= lo && p < hi);
    if (idx < 0) idx = CHAPTER_RANGES.length - 1;
    if (idx !== activeChapter) {
      chapters.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      activeChapter = idx;
    }
  }

  /* ---------- master : 진행도 공간 (position === 진행도) ---------- */
  const master = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

  master.to(journeyState, {
    progress: 1,
    duration: 1,
    onUpdate: () => applyEnvironment(journeyState.progress),
  }, 0);

  const IN = { autoAlpha: 1, y: 0, duration: 0.045, ease: 'power2.out' };
  const OUT = { autoAlpha: 0, y: -30, duration: 0.045, ease: 'power2.in' };
  const FROM = { autoAlpha: 0, y: 30 };

  master.to('#cap-intro', OUT, 0.09);

  master.fromTo('#cap-hub', FROM, IN, 0.29);
  master.to('#cap-hub', OUT, 0.41);

  master.fromTo('#cap-core', FROM, IN, 0.53);
  master.to('#cap-core', OUT, 0.66);

  master.fromTo('#cap-factory', FROM, IN, 0.785);
  master.to('#cap-factory', OUT, 0.90);

  // 04 WORKSPACE 대형 타이포가 지나간 뒤에 등장해야 겹치지 않는다
  master.fromTo('#finale',
    { autoAlpha: 0, y: 26 },
    { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' },
    0.96
  );

  /* ---------- auto : 재생 헤드 ---------- */
  const head = { p: 0 };
  // 진행도 ↔ 재생 시간 변환용 구간표 (탐색에 사용)
  const segments = [];
  const chapterTimes = [];

  const auto = gsap.timeline({
    paused: true,
    onUpdate: () => {
      master.progress(head.p);
      updateTimeLabel();
    },
    onComplete: () => setPlayIcon('replay'),
  });

  /** auto.time()은 타임라인 자체 시간이므로, 실제 경과 초는 배속으로 나눈 값이다 */
  function updateTimeLabel() {
    timeLabel.textContent = `${mmss(auto.time() / rate)} / ${mmss(auto.duration() / rate)}`;
  }

  // 챕터 클릭 시 도착 직전(LEAD_IN초 전)으로 보내면, 뚝 끊기지 않고
  // 짧게 미끄러져 들어가면서 바로 그 씬에 도착한다.
  const LEAD_IN = 1.2;

  let t = 0;
  let prevP = 0;
  for (const s of SCENES) {
    auto.to(head, { p: s.in, duration: s.inDur, ease: 'power1.inOut' }, t);
    segments.push({ t0: t, t1: t + s.inDur, p0: prevP, p1: s.in });
    t += s.inDur;

    chapterTimes.push(Math.max(0, t - LEAD_IN)); // 이 씬에 도착하는 시각

    auto.to(head, { p: s.out, duration: s.outDur, ease: 'none' }, t);
    segments.push({ t0: t, t1: t + s.outDur, p0: s.in, p1: s.out });
    t += s.outDur;

    prevP = s.out;
  }

  /** 진행도 → 재생 시간 (구간 내부는 선형 근사 — 탐색 용도로 충분) */
  function timeForProgress(p) {
    for (const seg of segments) {
      if (p >= seg.p0 && p <= seg.p1) {
        const k = seg.p1 === seg.p0 ? 0 : (p - seg.p0) / (seg.p1 - seg.p0);
        return seg.t0 + k * (seg.t1 - seg.t0);
      }
    }
    return p <= 0 ? 0 : auto.duration();
  }

  /* ---------- 재생 컨트롤 ---------- */
  function setPlayIcon(mode) {
    // mode: 'play' | 'pause' | 'replay'
    playBtn.dataset.mode = mode;
    playBtn.setAttribute(
      'aria-label',
      mode === 'pause' ? '일시정지' : mode === 'replay' ? '다시 보기' : '재생'
    );
  }

  function play() {
    if (auto.progress() >= 1) auto.restart();
    else auto.play();
    setPlayIcon('pause');
  }

  function pause() {
    auto.pause();
    setPlayIcon('play');
  }

  function toggle() {
    auto.paused() || auto.progress() >= 1 ? play() : pause();
  }

  /** 특정 진행도로 이동 (재생 상태는 유지) */
  function seekTo(p) {
    const wasPlaying = !auto.paused() && auto.progress() < 1;
    auto.pause();
    auto.time(timeForProgress(Math.min(1, Math.max(0, p))));
    if (wasPlaying) play();
    else setPlayIcon('play');
  }

  playBtn.addEventListener('click', toggle);

  replayBtn?.addEventListener('click', () => {
    auto.restart();
    setPlayIcon('pause');
  });

  /* ---------- 재생 시간(배속) ---------- */

  // 메뉴 항목은 실제 타임라인 길이로 만들어, SCENES를 손봐도 표기가 어긋나지 않는다
  const rateButtons = RATES.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitemradio');
    b.dataset.rate = String(r);
    b.innerHTML = `<span>${r}×</span><em>${mmss(auto.duration() / r)}</em>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      applyRate(r);
      closeSpeedMenu();
    });
    speedMenu.appendChild(b);
    return b;
  });

  function applyRate(r) {
    rate = r;
    auto.timeScale(r); // 진행 곡선은 그대로 두고 흐르는 속도만 바꾼다
    speedLabel.textContent = `${r}×`;
    rateButtons.forEach((b) => {
      const on = parseFloat(b.dataset.rate) === r;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    updateTimeLabel();
    try {
      localStorage.setItem(RATE_STORE_KEY, String(r));
    } catch {
      /* 저장 불가 환경(프라이빗 모드 등)에서는 이번 세션에만 적용 */
    }
  }

  function openSpeedMenu() {
    speedMenu.classList.add('is-open');
    speedBtn.setAttribute('aria-expanded', 'true');
  }
  function closeSpeedMenu() {
    speedMenu.classList.remove('is-open');
    speedBtn.setAttribute('aria-expanded', 'false');
  }

  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu.classList.contains('is-open') ? closeSpeedMenu() : openSpeedMenu();
  });
  document.addEventListener('click', closeSpeedMenu);

  /** 현재 배속에서 step칸 이동 */
  function stepRate(step) {
    const i = RATES.indexOf(rate);
    applyRate(RATES[Math.min(RATES.length - 1, Math.max(0, i + step))]);
  }

  // 진행바 클릭 → 해당 지점으로 탐색
  progressTrack.addEventListener('click', (e) => {
    const rect = progressTrack.getBoundingClientRect();
    if (rect.width <= 0) return; // 레이아웃 전이면 무시 (0으로 나누는 것 방지)
    seekTo((e.clientX - rect.left) / rect.width);
  });

  // 챕터 클릭 → 그 씬의 접근 구간부터 재생
  chapters.forEach((c, i) => {
    c.addEventListener('click', () => {
      auto.pause();
      auto.time(chapterTimes[i]);
      play();
    });
  });

  // 키보드: Space 재생/정지, ←/→ 이전·다음 챕터, [ ] 배속
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      closeSpeedMenu();
    } else if (e.code === 'Space') {
      e.preventDefault();
      toggle();
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.code === 'ArrowRight' ? 1 : -1;
      const i = Math.min(chapterTimes.length - 1, Math.max(0, activeChapter + dir));
      auto.pause();
      auto.time(chapterTimes[i]);
      play();
    } else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
      e.preventDefault();
      stepRate(e.code === 'BracketRight' ? 1 : -1);
    }
  });

  // 탭이 가려지면 멈춘다 (돌아왔을 때 여정이 훌쩍 지나가 있지 않도록)
  let pausedByHide = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!auto.paused() && auto.progress() < 1) {
        pausedByHide = true;
        pause();
      }
    } else if (pausedByHide) {
      pausedByHide = false;
      play();
    }
  });

  /* ---------- 시작 ---------- */
  applyEnvironment(0);
  master.progress(0);

  // 지난 방문에서 고른 배속을 복원
  let savedRate = 1;
  try {
    const v = parseFloat(localStorage.getItem(RATE_STORE_KEY));
    if (RATES.includes(v)) savedRate = v;
  } catch {
    /* 접근 불가 시 기본값 */
  }
  applyRate(savedRate);
  setPlayIcon('pause');

  // 진입 페이드가 끝난 뒤 자연스럽게 출발
  gsap.delayedCall(0.7, () => {
    if (!pausedByHide) auto.play();
  });

  return { auto, master, seekTo, play, pause };
}
