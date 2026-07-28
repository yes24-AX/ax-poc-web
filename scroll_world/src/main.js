// ============================================================
// main.js — 엔트리 포인트
// 렌더러/씬/카메라/조명/포스트프로세싱을 조립하고 렌더 루프를 돈다.
// 스크롤 → scrollState.progress → 카메라·환경 반영 구조.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { createWorld } from './scene.js';
import { createCameraRig } from './camera.js';
import { createLights } from './lights.js';
import { updateWorld } from './animation.js';
import { initScroll, scrollState } from './scroll.js';

/* ------------------------------------------------------------
 * 0. 성능 등급 판별 (모바일 대응)
 * ---------------------------------------------------------- */
const quality = {
  mobile:
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768,
};

/* ------------------------------------------------------------
 * 1. 렌더러
 * ---------------------------------------------------------- */
const canvas = document.getElementById('webgl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !quality.mobile, // 모바일은 AA 대신 해상도 확보
    powerPreference: 'high-performance',
  });
} catch (e) {
  // WebGL 미지원 → 폴백 메시지 노출
  document.getElementById('webgl-fallback').hidden = false;
  throw e;
}

renderer.setSize(window.innerWidth, window.innerHeight);
// DPR 상한 — 고해상도 기기에서의 픽셀 폭증 방지 (60fps 목표)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.mobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

/* ------------------------------------------------------------
 * 2. 씬 / 포그 / 월드 / 조명 / 카메라
 * ---------------------------------------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color('#030614');
// 지수 포그 — 깊이감의 핵심. 색/밀도는 scroll.js가 여정에 따라 바꾼다.
scene.fog = new THREE.FogExp2('#030614', 0.02);

const world = createWorld(scene, quality);
const lights = createLights(scene);
const rig = createCameraRig(window.innerWidth / window.innerHeight);

/* ------------------------------------------------------------
 * 3. 포스트프로세싱 (Bloom) — 모바일은 생략해 성능 확보
 * ---------------------------------------------------------- */
let composer = null;
let bloomPass = null;
if (!quality.mobile) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, rig.camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.9,  // strength — scroll.js가 씬에 따라 조절
    0.7,  // radius
    0.75  // threshold — 발광체만 번지게
  );
  composer.addPass(bloomPass);
}

/* ------------------------------------------------------------
 * 4. 스크롤 연동 (GSAP ScrollTrigger)
 * ---------------------------------------------------------- */
initScroll({ scene, lights, bloomPass });

/* ------------------------------------------------------------
 * 5. 마우스 패럴랙스 (데스크톱 전용의 가벼운 감성 효과)
 * ---------------------------------------------------------- */
const pointer = { x: 0, y: 0 };
const pointerTarget = { x: 0, y: 0 };
if (!quality.mobile) {
  window.addEventListener('pointermove', (e) => {
    pointerTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerTarget.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
}

/* ------------------------------------------------------------
 * 6. 리사이즈 대응
 * 이벤트 + 매 프레임 크기 검사 병행 — 숨겨진 패널/iframe에서 로드되어
 * 초기 크기가 0인 경우에도 표시되는 순간 올바르게 복구된다.
 * ---------------------------------------------------------- */
let lastW = 0;
let lastH = 0;

function syncSize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w === lastW && h === lastH) return;
  if (w === 0 || h === 0) return; // 아직 레이아웃 전이면 보류
  lastW = w;
  lastH = h;
  rig.camera.aspect = w / h;
  rig.camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  if (composer) {
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
  }
}

syncSize();
window.addEventListener('resize', syncSize);

/* ------------------------------------------------------------
 * 7. 렌더 루프
 * ---------------------------------------------------------- */
const clock = new THREE.Clock();

function tick() {
  syncSize(); // 크기 변화 감지 (변화 없으면 즉시 반환하는 저비용 검사)

  const dt = Math.min(clock.getDelta(), 0.05); // 탭 복귀 시 점프 방지
  const t = clock.elapsedTime;

  // 포인터 지연 추적 (부드러운 패럴랙스)
  pointer.x += (pointerTarget.x - pointer.x) * Math.min(1, dt * 3);
  pointer.y += (pointerTarget.y - pointer.y) * Math.min(1, dt * 3);

  // 스크롤 진행도(스크럽 완화 적용됨)에 따라 카메라 배치
  rig.update(scrollState.progress, t, pointer);

  // 월드 상시 애니메이션
  updateWorld(world, t, dt);

  // 렌더 (데스크톱: 블룸 포함 / 모바일: 기본 렌더)
  if (composer) composer.render();
  else renderer.render(scene, rig.camera);

  requestAnimationFrame(tick);
}

tick();

// 진입 페이드 인 — CSS 애니메이션은 rAF가 멈춘 상태에서도 안전하다
canvas.classList.add('is-ready');
