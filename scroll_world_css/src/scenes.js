// ============================================================
// scenes.js — AX LABS 월드 구축 (CSS 3D / WebGL 미사용)
//
// 월드는 z축을 따라 이어진 하나의 긴 공간이다.
//   Hero(-900) → [01 DATA](-2000) → DataHub(-3000)
//   → [02 INTELLIGENCE](-5000) → LLM Core(-6000)
//   → [03 AUTOMATION](-8000) → Factory(-9000)
//   → [04 WORKSPACE](-11000) → Workspace(-12000)
//
// 모든 오브젝트는 fog에 등록되어 카메라 거리에 따라 나타나고 사라진다.
// ============================================================

export const ZONE = {
  HERO: -300,
  HUB: -3000,
  CORE: -6000,
  FACTORY: -9000,
  WORK: -12000,
};

/** 챕터 마커(공간을 통과하는 대형 타이포) 위치 */
const MARKS = [
  { z: -2000, num: '01', word: 'DATA', color: 'var(--a-hub)' },
  { z: -4700, num: '02', word: 'INTELLIGENCE', color: 'var(--a-core)' },
  { z: -8000, num: '03', word: 'AUTOMATION', color: 'var(--a-auto)' },
  { z: -10300, num: '04', word: 'WORKSPACE', color: 'var(--a-work)', solid: true },
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// createWorld 실행 중에만 유효한 포그 핸들
let fog = null;

/* ------------------------------------------------------------
 * 배치 헬퍼
 * ---------------------------------------------------------- */

/**
 * 월드에 요소를 배치한다.
 * .place 래퍼가 좌표 변환을, 내부 요소가 외형/애니메이션을 담당해
 * CSS transform 애니메이션과 배치가 충돌하지 않는다.
 * @returns {HTMLElement} 내부 요소
 */
function place(parent, cls, opt = {}) {
  const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, w, h, fogOpts } = opt;

  const wrap = document.createElement('div');
  wrap.className = 'place';
  let t = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`;
  if (ry) t += ` rotateY(${ry}deg)`;
  if (rx) t += ` rotateX(${rx}deg)`;
  if (rz) t += ` rotateZ(${rz}deg)`;
  wrap.style.transform = t;

  const el = document.createElement('div');
  el.className = cls;
  if (w != null) {
    el.style.width = `${w}px`;
    el.style.marginLeft = `${-w / 2}px`;
  }
  if (h != null) {
    el.style.height = `${h}px`;
    el.style.marginTop = `${-h / 2}px`;
  }

  wrap.appendChild(el);
  parent.appendChild(wrap);
  if (fog) fog.register(wrap, z, fogOpts);
  return el;
}

/**
 * 진짜 입체 박스(6면 중 필요한 면만) 생성.
 * 면마다 밝기를 달리해 위쪽에 광원이 있는 것처럼 보이게 한다.
 * @returns {{el: HTMLElement, front: HTMLElement}}
 */
function box(parent, opt) {
  const {
    w = 100, h = 100, d = 100,
    face = '#1b2434', edge = 'rgba(255,255,255,0.09)',
    faces = ['front', 'left', 'right', 'top'],
    cls = '',
    ...rest
  } = opt;

  const el = place(parent, `box ${cls}`.trim(), rest);
  el.style.setProperty('--w', `${w}px`);
  el.style.setProperty('--h', `${h}px`);
  el.style.setProperty('--d', `${d}px`);
  el.style.setProperty('--face', face);
  el.style.setProperty('--edge', edge);

  const axis = { front: 'fz', back: 'fz', left: 'fx', right: 'fx', top: 'fy' };
  let front = null;
  for (const f of faces) {
    const i = document.createElement('i');
    i.className = `${axis[f]} ${f}`;
    el.appendChild(i);
    if (f === 'front') front = i;
  }
  return { el, front };
}

/** 존 컨테이너 */
function zone(world, id) {
  const z = document.createElement('div');
  z.className = 'zone';
  z.id = id;
  z.style.cssText = 'position:absolute;left:0;top:0;transform-style:preserve-3d';
  world.appendChild(z);
  return z;
}

/* ------------------------------------------------------------
 * Hero — AX LABS 워드마크
 * ---------------------------------------------------------- */
function buildHero(world) {
  const g = zone(world, 'z-hero');

  // 워드마크는 카메라가 통과하기 직전까지만 또렷하게 (nearIn을 넉넉히)
  const hero = place(g, 'hero-mark', {
    y: -40,
    z: ZONE.HERO,
    fogOpts: { nearOut: 120, nearIn: 620, farIn: 2600, farOut: 3800 },
  });
  hero.innerHTML =
    '<div class="title">AX LABS</div>' +
    '<div class="sub">EXPERIENCE THE SHIFT</div>';

  // 워드마크 뒤를 받치는 은은한 광원
  const glow = place(g, 'glow is-breathe', { y: -40, z: ZONE.HERO - 380, w: 1500, h: 1500 });
  glow.style.setProperty('--g1', 'rgba(70, 92, 190, 0.34)');
  glow.style.setProperty('--g2', 'rgba(40, 52, 130, 0.12)');

  // 깊이감을 만드는 원거리 글로우 2개
  [[-520, -180, -1900, 900], [460, 120, -2500, 1150]].forEach(([x, y, z, s]) => {
    const gl = place(g, 'glow', { x, y, z, w: s, h: s });
    gl.style.setProperty('--g1', 'rgba(58, 66, 150, 0.26)');
    gl.style.setProperty('--g2', 'rgba(30, 40, 100, 0.1)');
  });
}

/* ------------------------------------------------------------
 * 챕터 마커 — 공간을 통과하는 대형 타이포그래피
 * ---------------------------------------------------------- */
function buildMarks(world) {
  const g = zone(world, 'z-marks');
  for (const m of MARKS) {
    const el = place(g, 'chapter-mark', {
      y: -20,
      z: m.z,
      fogOpts: { nearOut: 90, nearIn: 700, farIn: 2200, farOut: 3400 },
    });
    el.style.setProperty('--c', m.color);
    el.innerHTML =
      `<span class="num">${m.num}</span>` +
      `<span class="word${m.solid ? ' is-solid' : ''}">${m.word}</span>`;
  }
}

/* ------------------------------------------------------------
 * 01 — AX DataHub
 * ---------------------------------------------------------- */
function buildDataHub(world, quality) {
  const g = zone(world, 'z-hub');
  const Z = ZONE.HUB;
  const FLOOR_Y = 300;

  // 바닥 그리드 (수평면). 바닥은 코앞에서도 사라지면 안 되므로 nearOut을 음수로
  place(g, 'floor', {
    y: FLOOR_Y, z: Z, rx: 90, w: 4600, h: 3400,
    fogOpts: { nearOut: -1400, nearIn: -900, farIn: 2400, farOut: 3600 },
  });

  // 서버 타워 — 중앙 통로를 만드는 두 줄 배치
  const towerCount = quality.mobile ? 8 : 12;
  for (let i = 0; i < towerCount; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const h = rand(260, 520);
    const w = rand(90, 140);
    const d = rand(90, 140);
    const { front } = box(g, {
      x: side * rand(230, 620),
      y: FLOOR_Y - h / 2,
      z: Z + rand(-620, 620),
      ry: rand(-10, 10),
      w, h, d,
      face: 'linear-gradient(180deg, #142236 0%, #08111e 100%)',
      edge: 'rgba(52, 211, 255, 0.28)',
    });

    // 앞면에 서버 랙 슬릿 + 상단 표시등
    const slit = document.createElement('span');
    slit.className = 'tower-lights';
    slit.style.cssText = 'position:absolute;inset:10px 12px';
    front.appendChild(slit);

    const cap = document.createElement('span');
    cap.className = 'tower-cap';
    cap.style.cssText = 'position:absolute;top:9px;right:9px;width:6px;height:6px';
    cap.style.animationDelay = `${rand(-2.6, 0)}s`;
    front.appendChild(cap);
  }

  // 떠다니는 데이터 큐브 (6면 입체 + Y축 자전)
  const cubeCount = quality.mobile ? 4 : 6;
  for (let i = 0; i < cubeCount; i++) {
    const s = rand(34, 52);
    const { el } = box(g, {
      x: rand(-460, 460),
      y: rand(-40, 190),
      z: Z + rand(-560, 560),
      w: s, h: s, d: s,
      faces: ['front', 'back', 'left', 'right', 'top'],
      face: 'rgba(24, 86, 130, 0.62)',
      edge: 'rgba(120, 230, 255, 0.85)',
      cls: 'spin-y',
    });
    el.style.animationDuration = `${rand(7, 13)}s`;
    el.style.animationDelay = `${rand(-10, 0)}s`;
  }

  // 데이터 빔 — 타워 사이를 흐르는 라인
  const beamCount = quality.mobile ? 3 : 5;
  for (let i = 0; i < beamCount; i++) {
    const b = place(g, 'data-beam', {
      x: rand(-260, 260),
      y: rand(-20, 170),
      z: Z + rand(-520, 520),
      ry: rand(-26, 26),
      w: rand(360, 680),
    });
    b.style.animationDelay = `${rand(-1.3, 0)}s`;
  }

  // 존 전체를 감싸는 시안 광원
  const gl = place(g, 'glow', { y: 60, z: Z - 200, w: 2000, h: 1400 });
  gl.style.setProperty('--g1', 'rgba(20, 120, 180, 0.26)');
  gl.style.setProperty('--g2', 'rgba(12, 70, 120, 0.1)');
}

/* ------------------------------------------------------------
 * 02 — LLM Core
 * ---------------------------------------------------------- */
function buildCore(world) {
  const g = zone(world, 'z-core');
  const Z = ZONE.CORE;
  const CY = -30;

  // 코어는 "거대한" 인상이 핵심이라 크게 잡고,
  // 스쳐 지나가는 순간에도 흐려지지 않도록 근거리 포그를 늦춘다.
  const CORE_FOG = { nearOut: -420, nearIn: 120 };

  // 코어를 감싸는 헤일로
  const halo = place(g, 'glow is-breathe', { y: CY, z: Z - 60, w: 2600, h: 2600, fogOpts: CORE_FOG });
  halo.style.setProperty('--g1', 'rgba(157, 123, 255, 0.4)');
  halo.style.setProperty('--g2', 'rgba(96, 62, 200, 0.14)');

  // 코어 오브
  place(g, 'core-orb', { y: CY, z: Z, w: 620, h: 620, fogOpts: CORE_FOG });

  // 기울어진 회전 링
  const r1 = place(g, 'core-ring', { y: CY, z: Z, w: 1100, h: 1100, fogOpts: CORE_FOG });
  r1.style.setProperty('--tilt', '76deg');
  r1.style.animationDuration = '18s';

  const r2 = place(g, 'core-ring is-thick', { y: CY, z: Z, w: 1450, h: 1450, fogOpts: CORE_FOG });
  r2.style.setProperty('--tilt', '66deg');
  r2.style.animationDuration = '27s';
  r2.style.animationDirection = 'reverse';

  // 공전하는 지식 요소
  const items = [
    { text: 'Prompt', color: '#5ec8ff' },
    { text: 'Vector', color: '#9d7bff' },
    { text: 'SQL', color: '#4ee2a8' },
    { text: 'API', color: '#ffab4d' },
    { text: 'Docs', color: '#ff7aa8' },
  ];

  items.forEach((item, i) => {
    const pivot = place(g, 'orbit', { y: CY + rand(-180, 180), z: Z, fogOpts: CORE_FOG });
    const dur = 20 + i * 5;
    const delay = `${-(dur / items.length) * i}s`;
    pivot.style.animationDuration = `${dur}s`;
    pivot.style.animationDelay = delay;

    // 팔(반지름) → 역회전(빌보드) → 라벨
    const arm = document.createElement('div');
    arm.className = 'orbit-arm';
    // 오브(반지름 310)와 링(550/725) 사이 궤도
    arm.style.transform = `translate3d(${620 + (i % 3) * 90}px, 0, 0)`;

    const counter = document.createElement('div');
    counter.className = 'orbit-counter';
    counter.style.animationDuration = `${dur}s`;
    counter.style.animationDelay = delay;

    const pill = document.createElement('div');
    pill.className = 'orbit-pill';
    pill.style.setProperty('--c', item.color);
    pill.textContent = item.text;

    const dot = document.createElement('div');
    dot.className = 'orbit-dot';
    dot.style.cssText = 'width:8px;height:8px;top:44px';
    dot.style.setProperty('--c', item.color);

    counter.append(pill, dot);
    arm.appendChild(counter);
    pivot.appendChild(arm);
  });
}

/* ------------------------------------------------------------
 * 03 — Automation Factory
 * ---------------------------------------------------------- */

/** SVG 기어 path (사각 이빨 + 중앙 축 구멍) */
function gearPath(r, teeth) {
  const outer = r;
  const inner = r * 0.79;
  const hub = r * 0.26;
  const step = (Math.PI * 2) / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    [
      [Math.cos(a) * outer, Math.sin(a) * outer],
      [Math.cos(a + step * 0.4) * outer, Math.sin(a + step * 0.4) * outer],
      [Math.cos(a + step * 0.5) * inner, Math.sin(a + step * 0.5) * inner],
      [Math.cos(a + step * 0.9) * inner, Math.sin(a + step * 0.9) * inner],
    ].forEach(([x, y], k) => {
      d += `${i === 0 && k === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
  }
  d += 'Z';
  d += `M${hub},0A${hub},${hub} 0 1,0 ${-hub},0A${hub},${hub} 0 1,0 ${hub},0Z`;
  return d;
}

function buildFactory(world, quality) {
  const g = zone(world, 'z-factory');
  const Z = ZONE.FACTORY;
  const FLOOR_Y = 300;

  // 따뜻한 톤의 바닥
  const floor = place(g, 'floor', {
    y: FLOOR_Y, z: Z, rx: 90, w: 4600, h: 3000,
    fogOpts: { nearOut: -1400, nearIn: -900, farIn: 2400, farOut: 3600 },
  });
  floor.style.setProperty('--line', 'rgba(255, 171, 77, 0.16)');
  floor.style.backgroundColor = 'rgba(26, 18, 10, 0.55)';

  // 컨베이어 프레임(입체) + 움직이는 벨트 표면
  box(g, {
    y: FLOOR_Y - 90, z: Z + 90,
    w: 1000, h: 90, d: 220,
    face: 'linear-gradient(180deg, #2b2620, #17130f)',
    edge: 'rgba(255, 171, 77, 0.24)',
  });
  place(g, 'belt-surface', { y: FLOOR_Y - 136, z: Z + 90, rx: 90, w: 1000, h: 200 });

  // 벨트 위 화물 (입체 박스가 흘러간다)
  const cargoColors = ['#ffab4d', '#34d3ff', '#4ee2a8', '#9d7bff', '#ffd76a'];
  const cargoCount = quality.mobile ? 3 : 5;
  for (let i = 0; i < cargoCount; i++) {
    const c = pick(cargoColors);
    const { el } = box(g, {
      y: FLOOR_Y - 170, z: Z + 90,
      w: 56, h: 56, d: 56,
      faces: ['front', 'left', 'right', 'top'],
      face: c,
      edge: 'rgba(0,0,0,0.18)',
    });
    // 배치는 .place가, 이동은 .box가 담당 → 충돌 없음
    el.style.animation = `cargo-run ${7}s linear infinite`;
    el.style.animationDelay = `${-(7 / cargoCount) * i}s`;
  }

  // 맞물린 기어 (반지름이 작을수록 빠르게)
  [
    { r: 92, teeth: 12, x: -540, y: -110, cls: 'is-spin' },
    { r: 62, teeth: 9, x: -394, y: -48, cls: 'is-spin-rev' },
    { r: 45, teeth: 8, x: -298, y: -120, cls: 'is-spin' },
  ].forEach((s) => {
    const holder = place(g, `gear ${s.cls}`, {
      x: s.x, y: s.y, z: Z - 300, w: s.r * 2, h: s.r * 2,
    });
    holder.innerHTML =
      `<svg width="${s.r * 2}" height="${s.r * 2}" viewBox="${-s.r} ${-s.r} ${s.r * 2} ${s.r * 2}">` +
      `<path fill-rule="evenodd" d="${gearPath(s.r, s.teeth)}"/></svg>`;
  });

  // 로봇 팔 2기 (어깨 → 팔꿈치 계층 회전)
  [
    { x: -400, z: Z + 320, delay: 0, flip: false },
    { x: 400, z: Z - 60, delay: -1.9, flip: true },
  ].forEach((r) => {
    const robot = place(g, 'robot', { x: r.x, y: FLOOR_Y - 150, z: r.z, w: 260, h: 300 });
    robot.innerHTML = `
      <div class="robot-seg" style="left:50%;margin-left:-56px;bottom:0;width:112px;height:26px"></div>
      <div class="robot-seg" style="left:50%;margin-left:-17px;bottom:22px;width:34px;height:112px"></div>
      <div class="robot-shoulder" style="left:50%;bottom:132px;width:0;height:0">
        <div class="robot-seg" style="left:0;top:-11px;width:118px;height:22px"></div>
        <div class="robot-elbow" style="left:112px;top:0;width:0;height:0">
          <div class="robot-seg" style="left:0;top:-8px;width:94px;height:16px"></div>
          <div class="robot-hand" style="left:92px;top:-10px;width:20px;height:20px"></div>
        </div>
      </div>`;
    robot.querySelectorAll('.robot-shoulder, .robot-elbow').forEach((j) => {
      j.style.animationDelay = `${r.delay}s`;
    });
    if (r.flip) robot.style.transform = 'scaleX(-1)';
  });

  // 공중 워크플로 파이프라인
  place(g, 'flow-rail', { y: -230, z: Z - 80, w: 660 });
  [-300, -150, 0, 150, 300].forEach((x, i) => {
    const n = place(g, 'flow-node', {
      x, y: -230 + Math.sin(i * 1.5) * 30, z: Z - 80, w: 14, h: 14,
    });
    n.style.animationDelay = `${i * 0.5}s`;
  });

  // 통로를 따라 놓인 적재 팔레트 — 공장 구간의 z 폭을 넓혀
  // 카메라가 지나는 동안 볼거리가 끊기지 않게 한다
  const pallets = quality.mobile ? 4 : 7;
  for (let i = 0; i < pallets; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const h = rand(70, 150);
    box(g, {
      x: side * rand(560, 880),
      y: FLOOR_Y - h / 2,
      z: Z + rand(-800, 800),
      ry: rand(-20, 20),
      w: rand(110, 170), h, d: rand(110, 170),
      face: 'linear-gradient(180deg, #3b2f21, #211a12)',
      edge: 'rgba(255, 171, 77, 0.2)',
    });
  }

  // 작업등 느낌의 따뜻한 광원
  const gl = place(g, 'glow', { y: 40, z: Z - 160, w: 2100, h: 1300 });
  gl.style.setProperty('--g1', 'rgba(190, 110, 30, 0.24)');
  gl.style.setProperty('--g2', 'rgba(120, 66, 16, 0.09)');
}

/* ------------------------------------------------------------
 * 통로 — 존과 존 사이를 채우는 빛 알갱이
 * 존 사이가 텅 비면 "구간이 끊긴" 느낌이 나므로, 여정 전 구간에
 * 얇게 뿌려 하나의 공간을 계속 통과하고 있다는 감각을 유지한다.
 * ---------------------------------------------------------- */
function buildCorridor(world, quality) {
  const g = zone(world, 'z-corridor');
  const count = quality.mobile ? 22 : 40;

  for (let i = 0; i < count; i++) {
    // 카메라 경로 주변을 피해 좌우로 벌려 놓는다
    const side = Math.random() < 0.5 ? -1 : 1;
    const s = rand(90, 260);
    const mote = place(g, 'glow', {
      x: side * rand(260, 1100),
      y: rand(-420, 320),
      z: rand(-600, -11200),
      w: s, h: s,
    });
    const alpha = rand(0.1, 0.26).toFixed(3);
    mote.style.setProperty('--g1', `rgba(150, 180, 255, ${alpha})`);
    mote.style.setProperty('--g2', 'rgba(90, 120, 210, 0.05)');
  }
}

/* ------------------------------------------------------------
 * 04 — AX Workspace
 * ---------------------------------------------------------- */
function buildWorkspace(world, quality) {
  const g = zone(world, 'z-work');
  const Z = ZONE.WORK;

  // 밝은 공간을 만드는 대형 광원
  const gl = place(g, 'glow', {
    y: 0, z: Z - 200, w: 3200, h: 2400,
    fogOpts: { nearOut: -1200, nearIn: -600, farIn: 2600, farOut: 4000 },
  });
  gl.style.setProperty('--g1', 'rgba(255, 255, 255, 0.72)');
  gl.style.setProperty('--g2', 'rgba(214, 230, 255, 0.3)');

  // 대시보드 카드 — 도착 지점을 감싸는 배치
  // 도착 시점(카메라 z ≈ -11100)에 화면 좌우를 감싸도록 배치.
  // 원근 축소를 감안해 가까운 카드일수록 바깥쪽으로 밀어 둔다.
  // 카드가 가까울수록 원근으로 크게 잡히므로, 앞쪽 카드일수록 바깥·위아래로
  // 더 벌려 화면 중앙(피날레 문구 자리)을 비워 둔다.
  const specs = [
    { x: -700, y: -240, z: Z + 400, ry: 22, type: 0, title: '데이터 처리량', sub: 'Today', metric: '2.4M', delta: '+18%' },
    { x: 700, y: -215, z: Z + 400, ry: -22, type: 1, title: 'LLM 응답 품질', sub: '7일 평균', metric: '94.2', delta: '+2.1' },
    { x: -820, y: 200, z: Z, ry: 16, type: 2, title: '자동화 비중', sub: '전체 업무', metric: '87%', delta: '+12%' },
    { x: 820, y: 178, z: Z, ry: -16, type: 0, title: '워크플로 실행', sub: '이번 주', metric: '1,280', delta: '+34%' },
    { x: -900, y: -20, z: Z - 500, ry: 26, type: 1, title: '문서 검색 정확도', sub: 'RAG', metric: '96.8', delta: '+3.4' },
    { x: 900, y: -48, z: Z - 500, ry: -26, type: 2, title: '팀 활성 사용자', sub: 'MAU', metric: '412', delta: '+27%' },
  ];

  // 모바일은 화각(perspective 880)과 뷰포트 폭이 달라 데스크톱 좌표를 그대로 쓰면
  // 카드가 전부 화면 밖으로 나간다 → 안쪽으로 당기고 위아래로 벌려 네 귀퉁이에 배치
  const layout = quality.mobile
    ? [
        { ...specs[0], x: -240, y: -280, z: Z },
        { ...specs[1], x: 240, y: -300, z: Z },
        { ...specs[2], x: -230, y: 250, z: Z - 400 },
        { ...specs[3], x: 230, y: 270, z: Z - 400 },
      ]
    : specs;

  layout.forEach((s, i) => {
    // 어두운 공장 구간에서 흰 카드가 미리 보이면 몰입이 깨진다 → 가시 거리를 짧게
    const card = place(g, 'dash', {
      x: s.x, y: s.y, z: s.z, ry: s.ry, w: 340, h: 232,
      fogOpts: { farIn: 1600, farOut: 2600 },
    });
    card.style.animationDelay = `${-i * 1.1}s`;

    let body;
    if (s.type === 0) {
      body = `<div class="bars">${
        Array.from({ length: 9 }, () => `<i style="height:${(rand(28, 100)) | 0}%"></i>`).join('')
      }</div>`;
    } else if (s.type === 1) {
      const pts = (seed) =>
        Array.from({ length: 12 }, (_, k) =>
          `${(k * 27).toFixed(0)},${(78 - Math.abs(Math.sin(k * 0.9 + seed)) * 62).toFixed(0)}`
        ).join(' ');
      body = `<svg class="spark" viewBox="0 0 297 92" preserveAspectRatio="none">
          <polyline points="${pts(i + 1)}"/><polyline points="${pts(i + 3)}"/></svg>`;
    } else {
      body = `<div class="donut"></div>
        <div class="legend">
          <div><s style="background:#4a86ff"></s>자동 처리</div>
          <div><s style="background:#7b5cff"></s>부분 자동</div>
          <div><s style="background:#12b981"></s>검토 필요</div>
        </div>`;
    }

    card.innerHTML =
      `<div class="dash-head"><b>${s.title}</b><span>${s.sub}</span></div>` +
      `<div class="dash-metric">${s.metric}<em>▲ ${s.delta}</em></div>` +
      `<div class="dash-body">${body}</div>`;
  });
}

/* ------------------------------------------------------------
 * 월드 조립
 * ---------------------------------------------------------- */
export function createWorld(worldEl, quality, fogInstance) {
  fog = fogInstance;
  buildCorridor(worldEl, quality);
  buildHero(worldEl);
  buildMarks(worldEl);
  buildDataHub(worldEl, quality);
  buildCore(worldEl);
  buildFactory(worldEl, quality);
  buildWorkspace(worldEl, quality);
  fog = null;
}
