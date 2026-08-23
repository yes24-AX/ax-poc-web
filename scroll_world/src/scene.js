// ============================================================
// scene.js — 하나의 긴 월드(5개 존)를 절차적으로 구축
//   Scene1 우주(z≈0) → Scene2 DataHub(z≈-100) → Scene3 LLM Core(z≈-180)
//   → Scene4 Factory(z≈-260) → Scene5 Workspace(z≈-340)
// 모든 지오메트리는 기본 도형 + 캔버스 텍스처로만 구성 (외부 에셋 없음)
// ============================================================
import * as THREE from 'three';
import {
  createStarField,
  createNebula,
  createDust,
  createFlowParticles,
  makeSoftCircleTexture,
} from './particles.js';

// 각 존의 중심 z 좌표 — camera.js / lights.js / scroll.js가 함께 사용
export const ZONE = {
  SPACE: 0,
  HUB: -100,
  CORE: -180,
  FACTORY: -260,
  WORK: -340,
};

const softTex = makeSoftCircleTexture(128);

/* ------------------------------------------------------------
 * 캔버스 텍스처 헬퍼
 * ---------------------------------------------------------- */

/** 라벨 스프라이트(Prompt/Vector/SQL...) — 항상 카메라를 바라본다 */
function makeLabelSprite(text, accent = '#8f6bff') {
  const w = 256;
  const h = 112;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 반투명 패널 + 테두리 글로우
  ctx.fillStyle = 'rgba(10, 16, 38, 0.85)';
  roundRect(ctx, 6, 6, w - 12, h - 12, 18);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  roundRect(ctx, 6, 6, w - 12, h - 12, 18);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eef2ff';
  ctx.font = '700 40px "Segoe UI", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.4, 1.5, 1);
  return sprite;
}

/** 대시보드 패널 텍스처 — 타입별로 간단한 차트를 그린다 */
function makeDashboardTexture(type = 0) {
  const w = 512;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 패널 배경 (밝은 워크스페이스에 맞는 화이트 카드)
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 60, 120, 0.15)';
  ctx.lineWidth = 3;
  roundRect(ctx, 2, 2, w - 4, h - 4, 20);
  ctx.stroke();

  // 타이틀 바
  ctx.fillStyle = '#22345c';
  ctx.font = '700 26px "Segoe UI", "Malgun Gothic", sans-serif';
  const titles = ['Revenue Insight', 'AX Pipeline', 'Task Automation', 'LLM Usage'];
  ctx.fillText(titles[type % titles.length], 28, 44);
  ctx.fillStyle = '#4a90ff';
  ctx.fillRect(28, 58, 60, 5);

  const colors = ['#4a90ff', '#8f6bff', '#22c58b', '#ff9a3c'];

  if (type % 3 === 0) {
    // 막대 차트
    for (let i = 0; i < 8; i++) {
      const bh = 40 + Math.random() * 150;
      ctx.fillStyle = colors[i % colors.length];
      roundRect(ctx, 36 + i * 58, h - 40 - bh, 34, bh, 6);
      ctx.fill();
    }
  } else if (type % 3 === 1) {
    // 라인 차트
    ctx.strokeStyle = '#8f6bff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = 30 + (i / 10) * (w - 60);
      const y = h - 60 - Math.abs(Math.sin(i * 1.1 + type)) * 140 - Math.random() * 20;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(74, 144, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = 30 + (i / 10) * (w - 60);
      const y = h - 50 - Math.abs(Math.cos(i * 0.9)) * 100;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else {
    // 도넛 + KPI
    ctx.lineWidth = 30;
    let start = -Math.PI / 2;
    const ratios = [0.42, 0.3, 0.18, 0.1];
    ratios.forEach((r, i) => {
      ctx.strokeStyle = colors[i];
      ctx.beginPath();
      ctx.arc(140, 190, 80, start, start + r * Math.PI * 2 - 0.06);
      ctx.stroke();
      start += r * Math.PI * 2;
    });
    ctx.fillStyle = '#22345c';
    ctx.font = '800 44px "Segoe UI", sans-serif';
    ctx.fillText('87%', 300, 160);
    ctx.font = '400 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#6b7ea3';
    ctx.fillText('Automation Rate', 300, 195);
    ctx.fillStyle = '#22c58b';
    ctx.font = '700 26px "Segoe UI", sans-serif';
    ctx.fillText('▲ 12.4%', 300, 240);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 기어 메시 — 이빨 달린 폴리곤을 Extrude */
function makeGearMesh(radius = 2, teeth = 10, depth = 0.5, color = '#93a4bd') {
  const outer = radius;
  const inner = radius * 0.78;
  const step = (Math.PI * 2) / teeth;
  const shape = new THREE.Shape();

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [Math.cos(a) * outer, Math.sin(a) * outer],
      [Math.cos(a + step * 0.4) * outer, Math.sin(a + step * 0.4) * outer],
      [Math.cos(a + step * 0.5) * inner, Math.sin(a + step * 0.5) * inner],
      [Math.cos(a + step * 0.9) * inner, Math.sin(a + step * 0.9) * inner],
    ];
    pts.forEach(([x, y], k) => {
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();

  // 중앙 축 구멍
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.22, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.center();
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.85,
    roughness: 0.35,
    emissive: '#1a2333',
    emissiveIntensity: 0.4,
  });
  return new THREE.Mesh(geo, mat);
}

/* ------------------------------------------------------------
 * 존 빌더들
 * ---------------------------------------------------------- */

/** Scene 2 — AX DataHub : 서버 타워 / 데이터 큐브 / 빛나는 선 / 데이터 흐름 */
function buildDataHub(quality) {
  const group = new THREE.Group();
  group.name = 'dataHub';
  group.position.z = ZONE.HUB;

  // 바닥 그리드 (미래 도시 감성)
  const grid = new THREE.GridHelper(90, 45, '#1e6f9e', '#0c2b44');
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  group.add(grid);

  // 서버 타워 — 카메라 통로(중앙) 양옆에 배치
  const towerMat = new THREE.MeshStandardMaterial({
    color: '#0b1d30',
    metalness: 0.6,
    roughness: 0.5,
    emissive: '#0a3350',
    emissiveIntensity: 0.5,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: '#35c8ff',
    transparent: true,
    opacity: 0.8,
  });

  const towers = [];
  const towerCount = quality.mobile ? 16 : 26;
  for (let i = 0; i < towerCount; i++) {
    const wdt = 2 + Math.random() * 2.5;
    const hgt = 6 + Math.random() * 16;
    const geo = new THREE.BoxGeometry(wdt, hgt, wdt);
    const mesh = new THREE.Mesh(geo, towerMat);

    const side = i % 2 === 0 ? 1 : -1;
    mesh.position.set(
      side * (7 + Math.random() * 22),
      hgt / 2,
      (Math.random() - 0.5) * 70
    );
    group.add(mesh);

    // 타워 윤곽선 글로우
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    edges.position.copy(mesh.position);
    group.add(edges);
    towers.push(mesh);
  }

  // 떠다니는 데이터 큐브
  const cubeMat = new THREE.MeshStandardMaterial({
    color: '#0e2f4a',
    emissive: '#2fb8ff',
    emissiveIntensity: 1.4,
    metalness: 0.3,
    roughness: 0.4,
  });
  const cubeGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const cubes = [];
  const cubeCount = quality.mobile ? 18 : 32;
  for (let i = 0; i < cubeCount; i++) {
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(
      (Math.random() - 0.5) * 50,
      3 + Math.random() * 14,
      (Math.random() - 0.5) * 66
    );
    cube.userData = {
      baseY: cube.position.y,
      phase: Math.random() * Math.PI * 2,
      spin: 0.3 + Math.random() * 0.7,
    };
    cubes.push(cube);
    group.add(cube);
  }

  // 타워 상공을 잇는 빛나는 데이터 라인 + 흐름 파티클
  const curves = [];
  const lineMat = new THREE.LineBasicMaterial({
    color: '#2fa8e0',
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  });
  const lineCount = quality.mobile ? 8 : 14;
  for (let i = 0; i < lineCount; i++) {
    const a = towers[(Math.random() * towers.length) | 0];
    const b = towers[(Math.random() * towers.length) | 0];
    if (a === b) continue;

    // 타워 position.y = 높이/2 이므로, y*2가 곧 타워 꼭대기
    const start = a.position.clone();
    start.y = a.position.y * 2;
    const end = b.position.clone();
    end.y = b.position.y * 2;
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 4 + Math.random() * 6;

    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    curves.push(curve);

    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
    group.add(new THREE.Line(lineGeo, lineMat));
  }

  const flow = createFlowParticles(curves, quality.mobile ? 5 : 8, '#6fe0ff');
  group.add(flow.points);

  return { group, cubes, flow };
}

/** Scene 3 — LLM Core : 중앙 AI 코어 + 공전하는 지식 오브젝트 */
function buildLLMCore(quality) {
  const group = new THREE.Group();
  group.name = 'llmCore';
  group.position.set(0, 10, ZONE.CORE);

  // 코어 본체 (저폴리 구 + 발광)
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4, 1),
    new THREE.MeshStandardMaterial({
      color: '#2a1650',
      emissive: '#8f4bff',
      emissiveIntensity: 1.6,
      metalness: 0.2,
      roughness: 0.3,
      flatShading: true,
    })
  );
  group.add(core);

  // 외곽 와이어프레임 셸
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(5.4, 1),
    new THREE.MeshBasicMaterial({
      color: '#b489ff',
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(shell);

  // 중심 글로우 스프라이트 (블룸을 도와주는 가짜 광원)
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softTex,
      color: '#a06bff',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  glow.scale.set(22, 22, 1);
  group.add(glow);

  // 회전 링 2개
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#7f5bff',
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(8, 0.06, 8, 80), ringMat);
  ring1.rotation.x = Math.PI / 2.4;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.05, 8, 80), ringMat);
  ring2.rotation.x = Math.PI / 1.8;
  ring2.rotation.y = Math.PI / 5;
  group.add(ring1, ring2);

  // 공전하는 지식 오브젝트 (문서/Prompt/Vector/SQL/API)
  const labels = [
    { text: 'Prompt', color: '#46c8ff' },
    { text: 'Vector', color: '#8f6bff' },
    { text: 'SQL', color: '#22c58b' },
    { text: 'API', color: '#ff9a3c' },
    { text: 'Docs', color: '#ff6b9d' },
  ];
  const orbiters = [];
  labels.forEach((item, i) => {
    // pivot을 회전시켜 공전을 구현
    const pivot = new THREE.Group();
    const radius = 9 + (i % 3) * 1.6;
    const sprite = makeLabelSprite(item.text, item.color);
    sprite.position.x = radius;

    // 라벨 아래 작은 발광 큐브 (문서 느낌)
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: item.color })
    );
    chip.position.set(radius, -1.2, 0);

    pivot.add(sprite, chip);
    pivot.rotation.y = (i / labels.length) * Math.PI * 2;
    pivot.rotation.x = (Math.random() - 0.5) * 0.35; // 궤도 기울기
    pivot.userData = { speed: 0.12 + i * 0.035 };
    orbiters.push(pivot);
    group.add(pivot);
  });

  return { group, core, shell, ring1, ring2, orbiters, glow };
}

/** Scene 4 — Automation Factory : 컨베이어 / 로봇 팔 / 기어 / 워크플로 */
function buildFactory(quality) {
  const group = new THREE.Group();
  group.name = 'factory';
  group.position.z = ZONE.FACTORY;

  // 어두운 금속 바닥
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 80),
    new THREE.MeshStandardMaterial({ color: '#171310', metalness: 0.4, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // ---- 컨베이어 벨트 ----
  const beltMat = new THREE.MeshStandardMaterial({
    color: '#2a2622',
    metalness: 0.7,
    roughness: 0.5,
  });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(34, 0.7, 3.4), beltMat);
  belt.position.set(0, 1.6, 4);
  group.add(belt);

  // 벨트 다리
  const legGeo = new THREE.BoxGeometry(0.4, 1.4, 0.4);
  for (let i = -3; i <= 3; i++) {
    const legL = new THREE.Mesh(legGeo, beltMat);
    legL.position.set(i * 5, 0.7, 4 - 1.4);
    const legR = legL.clone();
    legR.position.z = 4 + 1.4;
    group.add(legL, legR);
  }

  // 벨트 위 발광 스트라이프 (움직이는 느낌 강조)
  const stripeMat = new THREE.MeshBasicMaterial({ color: '#ffb057' });
  const stripes = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 3.0), stripeMat);
    s.position.set(-17 + i * 4.5, 2.0, 4);
    s.userData = { offset: i * 4.5 };
    stripes.push(s);
    group.add(s);
  }

  // 컨베이어 위를 흐르는 화물 박스
  const cargoColors = ['#ff9a3c', '#46c8ff', '#22c58b', '#8f6bff'];
  const cargos = [];
  const cargoCount = quality.mobile ? 5 : 7;
  for (let i = 0; i < cargoCount; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshStandardMaterial({
        color: cargoColors[i % cargoColors.length],
        emissive: cargoColors[i % cargoColors.length],
        emissiveIntensity: 0.35,
        metalness: 0.2,
        roughness: 0.6,
      })
    );
    c.position.set(0, 2.7, 4);
    c.userData = { offset: (i / cargoCount) * 34 };
    cargos.push(c);
    group.add(c);
  }

  // ---- 로봇 팔 2기 (base → arm → forearm 계층 구조) ----
  const robotMat = new THREE.MeshStandardMaterial({
    color: '#c8d2e0',
    metalness: 0.75,
    roughness: 0.35,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: '#ff9a3c',
    emissive: '#ff7a1a',
    emissiveIntensity: 0.7,
  });

  function makeRobot(x, z, phase) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.8, 16), robotMat);
    base.position.y = 0.4;
    root.add(base);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.7), robotMat);
    pillar.position.y = 2;
    root.add(pillar);

    // 어깨 관절 (여기서 회전)
    const shoulder = new THREE.Group();
    shoulder.position.y = 3.2;
    root.add(shoulder);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 0.5), robotMat);
    arm.position.x = 1.4;
    shoulder.add(arm);

    // 팔꿈치 관절
    const elbow = new THREE.Group();
    elbow.position.x = 2.8;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.4), robotMat);
    forearm.position.x = 1.1;
    elbow.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), jointMat);
    hand.position.x = 2.2;
    elbow.add(hand);

    root.userData = { shoulder, elbow, phase };
    return root;
  }

  const robots = [makeRobot(-6, 8.5, 0), makeRobot(6, -0.5, Math.PI * 0.7)];
  robots[1].rotation.y = Math.PI; // 반대편에서 벨트를 향하도록
  robots.forEach((r) => group.add(r));

  // ---- 벽면 기어 세트 (서로 맞물려 반대 방향 회전) ----
  const gears = [];
  const gearSpecs = [
    { r: 2.6, teeth: 12, x: -13, y: 7, dir: 1 },
    { r: 1.8, teeth: 9, x: -8.9, y: 8.6, dir: -1 },
    { r: 1.3, teeth: 8, x: -6.1, y: 6.6, dir: 1 },
  ];
  gearSpecs.forEach((g) => {
    const gear = makeGearMesh(g.r, g.teeth, 0.5);
    gear.position.set(g.x, g.y, -10);
    gear.userData = { dir: g.dir, speed: 2.4 / g.r }; // 반지름 반비례 속도(맞물림 느낌)
    gears.push(gear);
    group.add(gear);
  });

  // ---- 공중 워크플로 노드 (파이프라인 단계 표시) ----
  const nodeMat = () =>
    new THREE.MeshBasicMaterial({ color: '#ffc46b', transparent: true, opacity: 0.9 });
  const nodes = [];
  const nodePos = [];
  for (let i = 0; i < 5; i++) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), nodeMat());
    n.position.set(-12 + i * 6, 10 + Math.sin(i * 1.4) * 1.5, -2);
    n.userData = { phase: i * 0.9 };
    nodes.push(n);
    nodePos.push(n.position.clone());
    group.add(n);
  }
  const nodeLineGeo = new THREE.BufferGeometry().setFromPoints(nodePos);
  group.add(
    new THREE.Line(
      nodeLineGeo,
      new THREE.LineBasicMaterial({
        color: '#ffb057',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      })
    )
  );

  return { group, cargos, stripes, robots, gears, nodes };
}

/** Scene 5 — Workspace : 밝은 공간 + 떠 있는 대시보드 */
function buildWorkspace(quality) {
  const group = new THREE.Group();
  group.name = 'workspace';
  group.position.z = ZONE.WORK;

  // 밝은 바닥 (부드러운 흰 원반)
  const floorTex = makeSoftCircleTexture(256);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(45, 48),
    new THREE.MeshBasicMaterial({
      map: floorTex,
      color: '#ffffff',
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  group.add(floor);

  // 떠 있는 대시보드 패널들 — 경로 끝을 바라보는 반원 배치
  const dashboards = [];
  const count = quality.mobile ? 5 : 7;
  for (let i = 0; i < count; i++) {
    const tex = makeDashboardTexture(i);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3.75),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false })
    );

    // 카메라가 도착하는 지점(z≈-338)을 감싸는 반원
    const angle = ((i / (count - 1)) - 0.5) * Math.PI * 0.85;
    const radius = 13 + (i % 2) * 3;
    panel.position.set(
      Math.sin(angle) * radius,
      6.5 + Math.sin(i * 2.1) * 2.5,
      -6 - Math.cos(angle) * radius * 0.55
    );
    panel.lookAt(0, 7, 8); // 카메라 도착 지점을 바라본다
    panel.userData = {
      baseY: panel.position.y,
      phase: i * 1.1,
    };
    dashboards.push(panel);
    group.add(panel);
  }

  // 공간을 채우는 밝은 입자
  const count2 = quality.mobile ? 80 : 150;
  const positions = new Float32Array(count2 * 3);
  for (let i = 0; i < count2; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = Math.random() * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.5,
      map: softTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(sparks);

  return { group, dashboards, sparks };
}

/* ------------------------------------------------------------
 * 월드 조립
 * ---------------------------------------------------------- */

/**
 * 전체 월드 생성
 * @param {THREE.Scene} scene
 * @param {{mobile: boolean}} quality 성능 등급
 * @returns 애니메이션에서 참조할 월드 오브젝트 묶음
 */
export function createWorld(scene, quality) {
  // Scene 1 — 우주
  const stars = createStarField(quality.mobile ? 1600 : 3200);
  const nebula = createNebula(quality.mobile ? 40 : 70);
  const dust = createDust(quality.mobile ? 400 : 900);
  scene.add(stars, nebula, dust);

  // Scene 2~5
  const dataHub = buildDataHub(quality);
  const llmCore = buildLLMCore(quality);
  const factory = buildFactory(quality);
  const workspace = buildWorkspace(quality);
  scene.add(dataHub.group, llmCore.group, factory.group, workspace.group);

  return { stars, nebula, dust, dataHub, llmCore, factory, workspace };
}
