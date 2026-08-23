// ============================================================
// animation.js — 월드 상시(idle) 애니메이션
// 스크롤과 무관하게 세계가 항상 살아 움직이게 한다.
// main.js의 렌더 루프에서 매 프레임 호출된다.
// ============================================================

/**
 * 월드 오브젝트들의 프레임 업데이트
 * @param {object} world  createWorld()가 반환한 참조 묶음
 * @param {number} t      경과 시간(초)
 * @param {number} dt     프레임 델타(초)
 */
export function updateWorld(world, t, dt) {
  /* ---------- Scene 1 : 우주 ---------- */
  // 별과 성운은 아주 천천히 회전 (거대한 스케일 느낌)
  world.stars.rotation.y += dt * 0.004;
  world.nebula.rotation.y -= dt * 0.006;
  world.nebula.rotation.z += dt * 0.002;

  /* ---------- Scene 2 : AX DataHub ---------- */
  // 데이터 큐브 부유 + 자전
  for (const cube of world.dataHub.cubes) {
    const u = cube.userData;
    cube.position.y = u.baseY + Math.sin(t * 0.8 + u.phase) * 0.6;
    cube.rotation.x += dt * u.spin;
    cube.rotation.y += dt * u.spin * 0.7;
  }
  // 라인을 따라 흐르는 데이터 파티클
  world.dataHub.flow.update(t);

  /* ---------- Scene 3 : LLM Core ---------- */
  const core = world.llmCore;
  core.core.rotation.y += dt * 0.25;
  core.core.rotation.x += dt * 0.08;
  core.shell.rotation.y -= dt * 0.12;
  core.shell.rotation.z += dt * 0.05;
  core.ring1.rotation.z += dt * 0.3;
  core.ring2.rotation.z -= dt * 0.22;

  // 코어 맥동 (심장 박동처럼)
  const pulse = 1 + Math.sin(t * 1.6) * 0.06;
  core.core.scale.setScalar(pulse);
  core.glow.material.opacity = 0.45 + Math.sin(t * 1.6) * 0.12;

  // 지식 오브젝트 공전
  for (const pivot of core.orbiters) {
    pivot.rotation.y += dt * pivot.userData.speed;
  }

  /* ---------- Scene 4 : Automation Factory ---------- */
  const factory = world.factory;

  // 화물 박스 — 컨베이어 길이(34)를 순환
  for (const cargo of factory.cargos) {
    const x = ((cargo.userData.offset + t * 3.2) % 34) - 17;
    cargo.position.x = x;
    // 벨트 양 끝에서 스르륵 나타나고 사라지게
    const edge = Math.min(1, (17 - Math.abs(x)) / 2.5);
    cargo.scale.setScalar(Math.max(0.001, edge));
  }

  // 벨트 발광 스트라이프 이동
  for (const s of factory.stripes) {
    s.position.x = ((s.userData.offset + t * 3.2) % 36) - 18;
  }

  // 로봇 팔 관절 회전 (어깨/팔꿈치 위상차)
  for (const robot of factory.robots) {
    const { shoulder, elbow, phase } = robot.userData;
    shoulder.rotation.z = Math.sin(t * 1.1 + phase) * 0.45 - 0.25;
    elbow.rotation.z = Math.sin(t * 1.4 + phase + 1.2) * 0.55;
  }

  // 기어 회전 (반지름 반비례 → 맞물린 느낌)
  for (const gear of factory.gears) {
    gear.rotation.z += dt * gear.userData.dir * gear.userData.speed;
  }

  // 워크플로 노드 순차 펄스
  for (const node of factory.nodes) {
    const s = 1 + Math.max(0, Math.sin(t * 2 - node.userData.phase)) * 0.5;
    node.scale.setScalar(s);
  }

  /* ---------- Scene 5 : Workspace ---------- */
  for (const panel of world.workspace.dashboards) {
    const u = panel.userData;
    panel.position.y = u.baseY + Math.sin(t * 0.7 + u.phase) * 0.35;
  }
  world.workspace.sparks.rotation.y += dt * 0.015;
}
