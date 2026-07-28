// ============================================================
// world.js — 데이터센터 건설
//
// 카메라가 지나갈 하나의 긴 복도를 세운다.
//   복도(랙·바닥·천장) → MSTR 랙 → 세션 경로 → 통합 코어
//   → 퍼널 게이트 → 대시보드 홀
// 모든 오브젝트는 fog에 등록되어 거리에 따라 나타나고 사라진다.
// ============================================================

import { ZONE, HALL, SIGNS, DATA_RACKS, HOPS, GATES, BOARDS, BOARDS_MOBILE } from './data.js';

const rand = (a, b) => a + Math.random() * (b - a);

let fog = null;
let quality = { mobile: false };

/* ------------------------------------------------------------
 * 배치 헬퍼
 * ---------------------------------------------------------- */

/**
 * .place 래퍼가 월드 좌표를, 내부 요소가 외형/애니메이션을 담당한다.
 * 둘을 나눠야 CSS 애니메이션의 transform과 배치가 충돌하지 않는다.
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
  if (w != null) { el.style.width = `${w}px`; el.style.marginLeft = `${-w / 2}px`; }
  if (h != null) { el.style.height = `${h}px`; el.style.marginTop = `${-h / 2}px`; }

  wrap.appendChild(el);
  parent.appendChild(wrap);
  if (fog) fog.register(wrap, z, fogOpts);
  return el;
}

/** 6면 중 필요한 면만 만드는 입체 박스 */
function box(parent, opt) {
  const {
    w = 100, h = 100, d = 100,
    face = '#10161f', edge = 'rgba(255,255,255,0.07)',
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
  const made = {};
  for (const f of faces) {
    const i = document.createElement('i');
    i.className = `${axis[f]} ${f}`;
    el.appendChild(i);
    made[f] = i;
  }
  return { el, faces: made };
}

function zone(world, id) {
  const z = document.createElement('div');
  z.id = id;
  z.style.cssText = 'position:absolute;left:0;top:0;transform-style:preserve-3d';
  world.appendChild(z);
  return z;
}

/* ------------------------------------------------------------
 * 복도 — 바닥 / 천장 조명 / 서버 랙
 * ---------------------------------------------------------- */
function buildCorridor(world) {
  const g = zone(world, 'z-corridor');
  const FLOOR_FOG = { nearOut: -1100, nearIn: -700, farIn: 1500, farOut: 2700 };

  // 바닥 — 조각으로 나눠야 포그가 구간별로 먹는다
  for (let z = 600; z > -12200; z -= 1600) {
    place(g, 'floor', {
      y: HALL.floorY, z: z - 800, rx: 90,
      w: 1000, h: 1600,
      fogOpts: FLOOR_FOG,
    });
    // 복도 중앙 유도선
    place(g, 'aisle', {
      y: HALL.floorY - 2, z: z - 800, rx: 90,
      w: 90, h: 1600,
      fogOpts: FLOOR_FOG,
    });
  }

  // 천장 조명 — 규칙적인 리듬이 복도의 깊이를 만든다
  for (let z = 500; z > -12000; z -= 520) {
    place(g, 'ceil-light', {
      y: HALL.ceilY, z, rx: 90,
      w: 240, h: 46,
      fogOpts: { nearOut: -300, nearIn: 120, farIn: 1600, farOut: 2900 },
    });
  }

  // 서버 랙 — 데이터 랙 자리는 비워 둔다
  const taken = DATA_RACKS.map((r) => ({ z: r.z, side: r.side }));
  for (let z = HALL.rackFrom; z > HALL.rackTo; z -= HALL.rackStep) {
    for (const side of [-1, 1]) {
      if (taken.some((t) => t.side === side && Math.abs(t.z - z) < 240)) continue;
      makeRack(g, {
        z: z + rand(-30, 30),
        side,
        h: rand(400, 470),
        led: side < 0 ? '#38bdf8' : '#2dd4bf',
      });
    }
  }
}

/**
 * 서버 랙 한 대.
 * rotateY(±90)로 세워 전면이 복도 중앙을 향하게 한다.
 */
function makeRack(parent, { z, side, h = 440, led = '#38bdf8', hot = null }) {
  const { el, faces } = box(parent, {
    x: side * HALL.wallX,
    y: HALL.floorY - h / 2,
    z,
    ry: side < 0 ? 90 : -90,
    w: 200, h, d: 150,
    face: 'linear-gradient(180deg, #101823 0%, #070c14 100%)',
    edge: 'rgba(120, 170, 230, 0.16)',
    cls: hot ? 'rack is-hot' : 'rack',
    fogOpts: { nearOut: -60, nearIn: 200, farIn: 1500, farOut: 2700 },
  });

  const front = faces.front;
  front.classList.add('rack-face');

  const leds = document.createElement('span');
  leds.className = 'rack-leds';
  leds.style.setProperty('--led', hot ? hot.color : led);
  leds.style.animationDelay = `${rand(-3, 0)}s`;
  front.appendChild(leds);

  if (hot) {
    el.style.setProperty('--hot', hot.color);
    const glow = document.createElement('span');
    glow.className = 'rack-glow';
    front.appendChild(glow);

    const tag = document.createElement('span');
    tag.className = 'rack-tag';
    tag.textContent = hot.tag;
    front.appendChild(tag);
  }
  return el;
}

/* ------------------------------------------------------------
 * 01 MSTR — 데이터를 꺼내는 랙 + 떠오르는 데이터 큐브
 * ---------------------------------------------------------- */
function buildMstr(world) {
  const g = zone(world, 'z-mstr');

  for (const r of DATA_RACKS) {
    makeRack(g, { z: r.z, side: r.side, h: 470, hot: { tag: r.tag, color: 'var(--c-mstr)' } });
  }

  // 랙에서 빠져나와 복도를 떠도는 데이터 큐브
  for (let i = 0; i < 14; i++) {
    const s = rand(26, 46);
    box(g, {
      x: rand(-200, 200),
      y: rand(-180, 180),
      z: rand(-2050, -3500),
      w: s, h: s, d: s,
      faces: ['front', 'back', 'left', 'right', 'top'],
      face: 'rgba(37, 99, 235, 0.5)',
      edge: 'rgba(147, 197, 253, 0.9)',
      cls: 'cube-spin',
      fogOpts: { nearOut: 20, nearIn: 180, farIn: 1300, farOut: 2300 },
    }).el.style.animationDuration = `${rand(6, 12)}s`;
  }
}

/* ------------------------------------------------------------
 * 02 클릭스트림 — 공중에 떠오르는 세션 경로
 * ---------------------------------------------------------- */
function buildClickstream(world) {
  const g = zone(world, 'z-click');
  const HOP_FOG = { nearOut: -40, nearIn: 220, farIn: 1300, farOut: 2400 };

  // 지그재그로 배치해 카메라가 그 아래를 통과한다
  const pts = HOPS.map((name, i) => ({
    name,
    x: (i % 2 === 0 ? -1 : 1) * rand(90, 170),
    y: -140 - (i % 3) * 26,
    z: -4780 + i * 195,
  }));

  // 연결선 — xz 평면에서의 방향으로 회전시킨다
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const deg = (Math.atan2(-dz, dx) * 180) / Math.PI;
    place(g, 'hop-link', {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: (a.z + b.z) / 2,
      ry: deg,
      w: len,
      fogOpts: HOP_FOG,
    });
  }

  pts.forEach((p, i) => {
    const hop = place(g, 'hop', { x: p.x, y: p.y, z: p.z, fogOpts: HOP_FOG });
    hop.textContent = `${i + 1}. ${p.name}`;
  });
}

/* ------------------------------------------------------------
 * 03 통합 — 복도 한가운데의 조인 코어
 * ---------------------------------------------------------- */
function buildUnify(world) {
  const g = zone(world, 'z-unify');
  const Z = ZONE.UNIFY;
  const CORE_FOG = { nearOut: -420, nearIn: 140, farIn: 1600, farOut: 2800 };

  const halo = place(g, 'halo', { y: -20, z: Z - 40, w: 1300, h: 1300, fogOpts: CORE_FOG });
  halo.style.setProperty('--g1', 'rgba(20, 184, 166, 0.34)');
  halo.style.setProperty('--g2', 'rgba(13, 120, 110, 0.1)');

  place(g, 'pillar', { y: -20, z: Z, w: 300, h: 300, fogOpts: CORE_FOG });

  const r1 = place(g, 'ring', { y: -20, z: Z, w: 560, h: 560, fogOpts: CORE_FOG });
  r1.style.setProperty('--rc', 'rgba(94, 234, 212, 0.6)');
  r1.style.setProperty('--tilt', '74deg');
  r1.style.animationDuration = '16s';

  const r2 = place(g, 'ring', { y: -20, z: Z, w: 760, h: 760, fogOpts: CORE_FOG });
  r2.style.setProperty('--rc', 'rgba(94, 234, 212, 0.3)');
  r2.style.setProperty('--tilt', '62deg');
  r2.style.animationDuration = '25s';
  r2.style.animationDirection = 'reverse';

  // 코어로 빨려드는 세 갈래 스트림 표식
  [['GA4', -220, '#14b8a6'], ['CLICKSTREAM', 0, '#a855f7'], ['SALES', 220, '#3b82f6']].forEach(
    ([name, x, color], i) => {
      const pill = place(g, 'hop', { x, y: 150, z: Z + 320 - i * 40, fogOpts: CORE_FOG });
      pill.textContent = name;
      pill.style.borderColor = color;
      pill.style.boxShadow = `0 0 20px ${color}55`;
    }
  );
}

/* ------------------------------------------------------------
 * 04 성과 — 카메라가 통과하는 퍼널 게이트
 * ---------------------------------------------------------- */
function buildFunnel(world) {
  const g = zone(world, 'z-perf');

  GATES.forEach((gate) => {
    const el = place(g, 'gate', {
      z: gate.z,
      w: gate.w, h: gate.h,
      fogOpts: { nearOut: -140, nearIn: 260, farIn: 1500, farOut: 2600 },
    });
    el.style.setProperty('--gc', 'var(--c-perf)');
    el.innerHTML =
      `<span class="gate-label">${gate.label}</span>` +
      `<span class="gate-val">${gate.val}</span>`;
  });
}

/* ------------------------------------------------------------
 * 05 대시보드 홀 — 밝은 공간에 떠 있는 패널
 * ---------------------------------------------------------- */
function buildDashHall(world) {
  const g = zone(world, 'z-dash');
  const Z = ZONE.DASH;

  // 홀을 밝히는 큰 광원
  const glow = place(g, 'halo', {
    y: 0, z: Z - 500, w: 2600, h: 2000,
    fogOpts: { nearOut: -900, nearIn: -300, farIn: 2200, farOut: 3400 },
  });
  glow.style.setProperty('--g1', 'rgba(255, 255, 255, 0.72)');
  glow.style.setProperty('--g2', 'rgba(206, 226, 255, 0.28)');

  BOARDS.forEach((b0, i) => {
    // 내용은 그대로 두고 좌표만 화면 크기에 맞춘다
    const b = quality.mobile ? { ...b0, ...BOARDS_MOBILE[i] } : b0;
    const el = place(g, `board${b.alert ? ' is-alert' : ''}`, {
      x: b.x, y: b.y, z: b.z, ry: b.ry,
      w: 320, h: b.alert ? 210 : 216,
      fogOpts: { nearOut: 40, nearIn: 220, farIn: 1400, farOut: 2400 },
    });
    el.style.animationDelay = `${-i * 1.3}s`;

    const bars = b.bars
      ? `<div class="board-bars">${Array.from({ length: 9 },
          () => `<i style="height:${(rand(28, 100)) | 0}%"></i>`).join('')}</div>`
      : '<div class="board-alert"><s>ALERT</s><span>주문 전환율이 평소 범위를 42% 초과 · 09:40</span></div>';

    el.innerHTML =
      `<div class="board-h"><b>${b.title}</b><span>${b.note}</span></div>` +
      `<div class="board-v">${b.value}${b.delta ? `<em>${b.delta}</em>` : ''}</div>` +
      bars;
  });
}

/* ------------------------------------------------------------
 * 구역 표지 — 카메라가 통과하는 대형 타이포
 * ---------------------------------------------------------- */
function buildSigns(world) {
  const g = zone(world, 'z-signs');
  for (const s of SIGNS) {
    const el = place(g, 'sign', {
      y: -30, z: s.z,
      fogOpts: { nearOut: 60, nearIn: 560, farIn: 1500, farOut: 2600 },
    });
    el.style.setProperty('--sc', s.color);
    el.innerHTML =
      `<span class="sign-no">${s.no}</span>` +
      `<span class="sign-word">${s.word}</span>` +
      `<span class="sign-sub">${s.sub}</span>`;
  }
}

/* ------------------------------------------------------------
 * 조립
 * ---------------------------------------------------------- */
export function buildWorld(worldEl, fogInstance, qualityFlags = { mobile: false }) {
  fog = fogInstance;
  quality = qualityFlags;
  buildCorridor(worldEl);
  buildMstr(worldEl);
  buildClickstream(worldEl);
  buildUnify(worldEl);
  buildFunnel(worldEl);
  buildDashHall(worldEl);
  buildSigns(worldEl);
  fog = null;

  return {
    hotRacks: [...worldEl.querySelectorAll('.rack.is-hot')],
  };
}
