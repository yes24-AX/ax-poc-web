// ============================================================
// particles.js — 별 / 성운 / 우주 먼지 등 파티클 생성
// 모든 텍스처는 캔버스로 절차 생성 (외부 에셋 0개)
// ============================================================
import * as THREE from 'three';

/**
 * 부드러운 원형 그라데이션 텍스처 (파티클/글로우 공용)
 * @param {number} size 캔버스 한 변(px)
 */
export function makeSoftCircleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 파티클 계열이 공유하는 소프트 텍스처 (1회 생성)
const softTex = makeSoftCircleTexture(64);

/**
 * 별 필드 — 여정 전체를 감싸는 큰 구 형태로 배치
 * @param {number} count 별 개수
 */
export function createStarField(count = 3000) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#9bb8ff'),
    new THREE.Color('#ffd9a0'),
    new THREE.Color('#c9f2ff'),
  ];

  for (let i = 0; i < count; i++) {
    // 카메라 경로(z 60 ~ -360)를 감싸도록 긴 원통형 셸에 배치
    const angle = Math.random() * Math.PI * 2;
    const radius = 90 + Math.random() * 220;
    positions[i * 3 + 0] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.6;
    positions[i * 3 + 2] = 80 - Math.random() * 520;

    const c = palette[(Math.random() * palette.length) | 0];
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 1.6,
    map: softTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: false, // 별은 포그의 영향을 받지 않아야 밝은 씬 전까지 또렷하다
  });

  const stars = new THREE.Points(geo, mat);
  stars.name = 'starField';
  return stars;
}

/**
 * 성운 — 크고 옅은 컬러 파티클 덩어리 (Scene 1 주변)
 */
export function createNebula(count = 70) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [
    new THREE.Color('#3b2f8f'),
    new THREE.Color('#1f4fa8'),
    new THREE.Color('#7a3fa0'),
    new THREE.Color('#153a6b'),
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 160;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 70;
    positions[i * 3 + 2] = 40 - Math.random() * 180;

    const c = palette[(Math.random() * palette.length) | 0];
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 46,
    map: softTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: false,
  });

  const nebula = new THREE.Points(geo, mat);
  nebula.name = 'nebula';
  return nebula;
}

/**
 * 우주 먼지 — 경로 전 구간에 얇게 뿌려 이동감(패럴랙스)을 강화
 */
export function createDust(count = 900) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 70;
    positions[i * 3 + 1] = Math.random() * 30 - 4;
    positions[i * 3 + 2] = 60 - Math.random() * 440;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: '#7fb4ff',
    size: 0.35,
    map: softTex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const dust = new THREE.Points(geo, mat);
  dust.name = 'dust';
  return dust;
}

/**
 * 데이터 흐름 파티클 — 주어진 커브들을 따라 흐르는 빛 알갱이
 * animation.js가 매 프레임 update()를 호출한다.
 * @param {THREE.Curve[]} curves 흐름 경로들
 * @param {number} perCurve 커브당 파티클 수
 * @param {string|number} color 파티클 색
 */
export function createFlowParticles(curves, perCurve = 8, color = '#6fe0ff') {
  const total = curves.length * perCurve;
  const positions = new Float32Array(total * 3);
  // 각 파티클의 (커브 인덱스, 진행 오프셋, 속도)를 기억
  const meta = [];

  for (let ci = 0; ci < curves.length; ci++) {
    for (let j = 0; j < perCurve; j++) {
      meta.push({ curve: ci, offset: Math.random(), speed: 0.05 + Math.random() * 0.08 });
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color,
    size: 0.55,
    map: softTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'flowParticles';
  points.frustumCulled = false; // 위치를 매 프레임 갱신하므로 컬링 제외

  const v = new THREE.Vector3();
  return {
    points,
    /** @param {number} t 경과 시간(초) */
    update(t) {
      const pos = geo.attributes.position.array;
      for (let i = 0; i < meta.length; i++) {
        const m = meta[i];
        const u = (m.offset + t * m.speed) % 1;
        curves[m.curve].getPoint(u, v);
        pos[i * 3 + 0] = v.x;
        pos[i * 3 + 1] = v.y;
        pos[i * 3 + 2] = v.z;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
