// ============================================================
// lights.js — 조명 구성
// 전역 조명(ambient/directional) + 존별 포인트 라이트.
// 존 라이트의 세기는 scroll.js가 스크롤 진행도에 따라 조절한다.
// ============================================================
import * as THREE from 'three';
import { ZONE } from './scene.js';

/**
 * 조명 생성 후 scene에 추가
 * @param {THREE.Scene} scene
 * @returns scroll.js에서 제어할 조명 참조 묶음
 */
export function createLights(scene) {
  // 전역 환경광 — 우주에서는 어둡게, 워크스페이스에서 밝게 (scroll.js가 제어)
  const ambient = new THREE.AmbientLight('#8fb0ff', 0.45);
  scene.add(ambient);

  // 태양 역할의 방향광 — 색/세기도 여정에 따라 변한다
  const directional = new THREE.DirectionalLight('#cfe0ff', 0.6);
  directional.position.set(40, 80, 30);
  scene.add(directional);

  // ---- 존별 포인트 라이트 ----
  // three r155+는 물리 단위 조명이 기본이므로 intensity를 크게 준다 (decay 감쇠 보정)
  function zoneLight(color, x, y, z, maxIntensity) {
    const light = new THREE.PointLight(color, 0, 90, 1.8);
    light.position.set(x, y, z);
    light.userData.maxIntensity = maxIntensity;
    scene.add(light);
    return light;
  }

  const zoneLights = {
    // DataHub — 시안 네온
    hub: zoneLight('#35c8ff', 0, 16, ZONE.HUB, 350),
    // LLM Core — 보라 코어광
    core: zoneLight('#a06bff', 0, 10, ZONE.CORE, 500),
    // Factory — 주황 작업등
    factory: zoneLight('#ff9a3c', 0, 12, ZONE.FACTORY, 380),
    // Workspace — 밝은 백색광
    work: zoneLight('#ffffff', 0, 14, ZONE.WORK, 600),
  };

  // 각 존 라이트가 최대로 켜지는 스크롤 진행도 중심값 (scroll.js 벨 커브에 사용)
  const zoneCenters = { hub: 0.3, core: 0.52, factory: 0.72, work: 0.93 };

  return { ambient, directional, zoneLights, zoneCenters };
}
