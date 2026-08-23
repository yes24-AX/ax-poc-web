// ============================================================
// main.js — 엔트리 포인트
// 데이터센터를 세우고, 카메라를 복도에 넣고, 여정을 재생한다.
// WebGL을 쓰지 않고 CSS 3D + GSAP만 사용한다.
// ============================================================

/* global gsap */
import { buildWorld } from './world.js';
import { createCamera } from './camera.js';
import { createFog } from './fog.js';
import { createHud } from './hud.js';
import { createStory, journeyState } from './story.js';

/* ---- 0. 성능 등급 ----
   숨겨진 탭·iframe에서 로드되면 innerWidth가 0으로 잡혀 모바일로 오판하고
   그 상태가 굳어버린다. 여러 지표 중 가장 큰 값을 신뢰한다. */
const vw = Math.max(
  window.innerWidth || 0,
  document.documentElement.clientWidth || 0,
  window.screen?.width || 0
);
const quality = {
  mobile: window.matchMedia('(pointer: coarse)').matches || (vw > 0 && vw < 900),
};

/* ---- 1. 월드 ---- */
const worldEl = document.getElementById('world');
const fog = createFog();
const world = buildWorld(worldEl, fog, quality);

/* ---- 2. 카메라 / HUD / 이야기 ---- */
const camera = createCamera(worldEl);
const hud = createHud();
const story = createStory({ hud, world });

/* ---- 3. 마우스 패럴랙스 (데스크톱 전용) ---- */
const pointer = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
if (!quality.mobile) {
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
}

/* ---- 4. 렌더 루프 ----
   GSAP ticker에 얹어 rAF 루프를 하나로 유지한다.
   루프가 하는 일은 카메라 역변환과 포그 갱신 둘뿐이고,
   랙 LED·큐브 회전·링 회전은 CSS 키프레임이 처리한다. */
gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(deltaMs / 1000, 0.05);
  pointer.x += (target.x - pointer.x) * Math.min(1, dt * 3);
  pointer.y += (target.y - pointer.y) * Math.min(1, dt * 3);

  camera.update(journeyState.progress, time, pointer);
  fog.update(camera.z);
});

/* ---- 5. 시작 ----
   폰트가 늦거나 막힌 망에서도 화면이 떠야 하므로 타임아웃을 함께 건다. */
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  camera.update(0, 0, pointer);
  fog.update(camera.z);
  story.start();
  document.body.classList.add('is-ready');
}

document.fonts?.ready.then(boot);
setTimeout(boot, 1200);
