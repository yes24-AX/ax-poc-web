// ============================================================
// main.js — 엔트리 포인트 (WebGL 미사용)
//
// 월드 구축(DOM) → 스크롤 연동 → 렌더 루프.
// 렌더 루프가 하는 일은 세 가지뿐이다.
//   1) 카메라 역변환 갱신   2) 뎁스 포그 갱신   3) 배경 별 그리기
// 오브젝트 상시 애니메이션(공전·컨베이어·기어)은 CSS 키프레임이
// 브라우저 네이티브로 처리하므로 JS 부담이 거의 없다.
// ============================================================
import { createWorld } from './scenes.js';
import { createCameraRig } from './camera.js';
import { createStarField } from './particles.js';
import { createFog } from './fog.js';
import { initJourney, journeyState } from './journey.js';

/* global gsap */

/* ---- 0. 성능 등급 ----
   숨겨진 탭·iframe에서 로드되면 innerWidth가 0으로 잡혀 모바일로 오판하고,
   그 상태가 그대로 굳어버린다. 여러 지표 중 가장 큰 값을 신뢰한다. */
const viewportWidth = Math.max(
  window.innerWidth || 0,
  document.documentElement.clientWidth || 0,
  window.screen?.width || 0
);

const quality = {
  mobile:
    window.matchMedia('(pointer: coarse)').matches ||
    (viewportWidth > 0 && viewportWidth < 900),
};

/* ---- 1. 월드 구축 + 포그 등록 ---- */
const worldEl = document.getElementById('world');
const fog = createFog();
createWorld(worldEl, quality, fog);

/* ---- 2. 카메라 / 배경 ---- */
const rig = createCameraRig(worldEl);
const starField = createStarField(document.getElementById('space-canvas'), quality);

/* ---- 3. 자동 재생 여정 ---- */
initJourney();

/* ---- 4. 마우스 패럴랙스 (데스크톱 전용) ---- */
const pointer = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
if (!quality.mobile) {
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
}

/* ---- 5. 렌더 루프 ----
   GSAP ticker에 얹는다. ScrollTrigger가 이미 돌리는 프레임 루프를
   그대로 쓰므로 rAF 루프가 하나로 줄고, 스크롤 진행도와 카메라가
   같은 프레임에 갱신되어 어긋남이 없다. */
function tick(time, deltaMs) {
  const dt = Math.min(deltaMs / 1000, 0.05); // 탭 복귀 시 점프 방지

  pointer.x += (target.x - pointer.x) * Math.min(1, dt * 3);
  pointer.y += (target.y - pointer.y) * Math.min(1, dt * 3);

  rig.update(journeyState.progress, time, pointer);
  fog.update(rig.z);                          // 카메라 거리 기반 포그 + 컬링
  starField.draw(time, dt, journeyState.progress);
}

gsap.ticker.add(tick);

/* ---- 6. 진입 페이드 인 ---- */
// 첫 포그/카메라 계산이 끝난 뒤 보여줘야 깜빡임이 없다
rig.update(0, 0, pointer);
fog.update(rig.z);
document.body.classList.add('is-ready');
