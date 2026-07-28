// ============================================================
// scroll.js — GSAP ScrollTrigger 연동
// 스크롤 진행도(0~1) 하나로 카메라 / 포그 / 조명 / 블룸 / 오버레이를
// 모두 구동한다. 섹션 점프 없이 전 구간이 연속 보간된다.
// ============================================================
import * as THREE from 'three';

/* global gsap, ScrollTrigger */

// 렌더 루프(main.js)가 읽어가는 공유 상태 — scrub 완화가 적용된 진행도
export const scrollState = { progress: 0 };

/**
 * 환경 키프레임 — 진행도 지점마다의 포그/조명/블룸 상태.
 * 인접 키프레임 사이는 선형 보간된다.
 *   fog: 포그+배경색 / density: 포그 밀도
 *   amb: 환경광 세기 / ambColor: 환경광 색
 *   dir: 방향광 세기 / bloom: 블룸 강도
 */
const ENV_KEYFRAMES = [
  { p: 0.0,  fog: '#030614', density: 0.020, amb: 0.45, ambColor: '#8fb0ff', dir: 0.5, bloom: 0.9 },
  { p: 0.16, fog: '#030614', density: 0.017, amb: 0.45, ambColor: '#8fb0ff', dir: 0.5, bloom: 0.9 },
  { p: 0.26, fog: '#051622', density: 0.022, amb: 0.6,  ambColor: '#6fc2ff', dir: 0.7, bloom: 1.05 },
  { p: 0.40, fog: '#060a1c', density: 0.019, amb: 0.5,  ambColor: '#8fa0ff', dir: 0.6, bloom: 1.0 },
  { p: 0.52, fog: '#0b0620', density: 0.017, amb: 0.5,  ambColor: '#b49aff', dir: 0.5, bloom: 1.3 },
  { p: 0.64, fog: '#140c06', density: 0.020, amb: 0.55, ambColor: '#ffc9a0', dir: 0.7, bloom: 0.95 },
  { p: 0.78, fog: '#171009', density: 0.018, amb: 0.6,  ambColor: '#ffd9b8', dir: 0.8, bloom: 0.9 },
  { p: 0.88, fog: '#c7d4e8', density: 0.026, amb: 1.5,  ambColor: '#ffffff', dir: 1.1, bloom: 0.55 },
  { p: 1.0,  fog: '#e9eef7', density: 0.028, amb: 1.9,  ambColor: '#ffffff', dir: 1.2, bloom: 0.45 },
];

// 보간용 재사용 컬러 객체 (스크럽 중 매 프레임 호출되므로 할당 금지)
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _colorC = new THREE.Color();
const _colorD = new THREE.Color();

/** 키프레임 배열에서 진행도 p의 보간 상태를 구한다 */
function sampleEnv(p) {
  let a = ENV_KEYFRAMES[0];
  let b = ENV_KEYFRAMES[ENV_KEYFRAMES.length - 1];
  for (let i = 0; i < ENV_KEYFRAMES.length - 1; i++) {
    if (p >= ENV_KEYFRAMES[i].p && p <= ENV_KEYFRAMES[i + 1].p) {
      a = ENV_KEYFRAMES[i];
      b = ENV_KEYFRAMES[i + 1];
      break;
    }
  }
  const t = a === b ? 0 : (p - a.p) / (b.p - a.p);
  _colorA.set(a.fog).lerp(_colorB.set(b.fog), t);
  const lerp = (x, y) => x + (y - x) * t;
  return {
    fogColor: _colorA,
    density: lerp(a.density, b.density),
    amb: lerp(a.amb, b.amb),
    ambColor: _colorC.set(a.ambColor).lerp(_colorD.set(b.ambColor), t),
    dir: lerp(a.dir, b.dir),
    bloom: lerp(a.bloom, b.bloom),
  };
}

/** 가우시안 벨 커브 — 존 라이트가 해당 구간에서만 켜지도록 */
function bell(p, center, width = 0.14) {
  const d = (p - center) / width;
  return Math.exp(-d * d);
}

/**
 * 스크롤 연동 초기화
 * @param {object} deps { scene, lights, bloomPass }
 */
export function initScroll({ scene, lights, bloomPass }) {
  gsap.registerPlugin(ScrollTrigger);

  const progressFill = document.getElementById('progress-fill');
  const scrollHint = document.getElementById('scroll-hint');

  /** 진행도 p를 월드 환경에 반영 */
  function applyEnvironment(p) {
    const env = sampleEnv(p);

    // 포그 + 배경 동시 변경 → 공간의 공기색이 바뀌는 느낌
    scene.fog.color.copy(env.fogColor);
    scene.fog.density = env.density;
    scene.background.copy(env.fogColor);

    // 전역 조명
    lights.ambient.intensity = env.amb;
    lights.ambient.color.copy(env.ambColor);
    lights.directional.intensity = env.dir;

    // 존 라이트 — 자기 구간 근처에서만 벨 커브로 점등
    for (const [key, light] of Object.entries(lights.zoneLights)) {
      light.intensity = light.userData.maxIntensity * bell(p, lights.zoneCenters[key]);
    }

    // 블룸 강도 (모바일에서는 bloomPass가 null)
    if (bloomPass) bloomPass.strength = env.bloom;

    // UI: 진행바 / 스크롤 힌트
    progressFill.style.width = `${(p * 100).toFixed(2)}%`;
    scrollHint.classList.toggle('is-hidden', p > 0.02);
  }

  // ---- 마스터 타임라인 (scrub으로 스크롤과 동기화) ----
  // duration을 1로 두면 타임라인 position이 곧 진행도(0~1)가 된다.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#scroll-space',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.9, // 스크롤을 살짝 뒤따라오게 해 카메라 이동을 부드럽게
    },
  });

  // 핵심: 진행도 트윈. onUpdate에서 환경을 매번 갱신한다.
  tl.to(scrollState, {
    progress: 1,
    duration: 1,
    onUpdate: () => applyEnvironment(scrollState.progress),
  }, 0);

  // ---- 씬 캡션 페이드 인/아웃 (타임라인 position = 진행도) ----
  const fade = { ease: 'power2.out' };

  // Scene 1 캡션: 처음부터 보이다가 퇴장
  tl.to('#cap-space', { autoAlpha: 0, y: -36, duration: 0.05, ...fade }, 0.10);

  // Scene 2 캡션
  tl.fromTo('#cap-hub', { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.05, ...fade }, 0.23);
  tl.to('#cap-hub', { autoAlpha: 0, y: -36, duration: 0.05, ...fade }, 0.37);

  // Scene 3 캡션
  tl.fromTo('#cap-core', { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.05, ...fade }, 0.46);
  tl.to('#cap-core', { autoAlpha: 0, y: -36, duration: 0.05, ...fade }, 0.59);

  // Scene 4 캡션
  tl.fromTo('#cap-factory', { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.05, ...fade }, 0.66);
  tl.to('#cap-factory', { autoAlpha: 0, y: -36, duration: 0.05, ...fade }, 0.79);

  // 피날레: Welcome to AX Workspace
  tl.fromTo('#welcome',
    { autoAlpha: 0, scale: 0.94 },
    { autoAlpha: 1, scale: 1, duration: 0.07, ease: 'power2.out' },
    0.91
  );

  // 초기 상태 1회 반영 (스크롤 0에서도 포그/조명이 올바르도록)
  applyEnvironment(0);

  return tl;
}
