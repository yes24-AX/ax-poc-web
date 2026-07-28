// ============================================================
// camera.js — 카메라 생성 + 여정 경로(스플라인) 정의
// 섹션 점프 없이, CatmullRom 스플라인 위를 스크롤 진행도(0~1)에 따라
// 연속적으로 이동한다. 시선(lookAt)도 별도 스플라인으로 부드럽게 보간.
// ============================================================
import * as THREE from 'three';

/**
 * 카메라 이동 경로 웨이포인트
 * z 기준: 우주(60→0) → DataHub(-100) → LLM Core(-180) → Factory(-260) → Workspace(-340)
 */
const POSITION_WAYPOINTS = [
  new THREE.Vector3(0, 3, 58),      // 출발 — 깊은 우주
  new THREE.Vector3(0, 4, 24),      // 성운 사이 통과
  new THREE.Vector3(2, 6, -18),     // 우주 → 도시 접근
  new THREE.Vector3(8, 9, -72),     // DataHub 진입(우측 상공)
  new THREE.Vector3(-6, 8, -106),   // DataHub 관통(좌측으로 스윙)
  new THREE.Vector3(-2, 9, -146),   // 코어를 향해 상승
  new THREE.Vector3(9, 12, -178),   // LLM Core 측면 통과(반선회)
  new THREE.Vector3(0, 12, -206),   // 코어 뒤로 빠져나감
  new THREE.Vector3(-7, 6, -240),   // 공장 진입(하강)
  new THREE.Vector3(1, 5, -266),    // 컨베이어 옆 통과
  new THREE.Vector3(5, 7, -300),    // 공장 → 워크스페이스 전환
  new THREE.Vector3(0, 7.5, -324),  // 밝은 공간 진입
  new THREE.Vector3(0, 8, -334),    // 도착 — 대시보드 한가운데
];

/** 시선 목표 웨이포인트 — 각 구간에서 봐야 할 대상을 향한다 */
const LOOKAT_WAYPOINTS = [
  new THREE.Vector3(0, 2, 0),       // 우주 중심
  new THREE.Vector3(0, 4, -40),     // 앞쪽 별들
  new THREE.Vector3(0, 7, -80),     // 다가오는 도시
  new THREE.Vector3(-2, 7, -105),   // 타워 사이
  new THREE.Vector3(2, 8, -140),    // 데이터 흐름
  new THREE.Vector3(0, 10, -180),   // LLM 코어
  new THREE.Vector3(0, 10, -180),   // 코어 주시(측면 통과 동안 고정)
  new THREE.Vector3(0, 9, -238),    // 공장 방향
  new THREE.Vector3(0, 4, -262),    // 컨베이어
  new THREE.Vector3(-4, 6, -278),   // 로봇/기어
  new THREE.Vector3(0, 7, -320),    // 밝은 빛
  new THREE.Vector3(0, 7.5, -344),  // 대시보드 군
  new THREE.Vector3(0, 8, -350),    // 최종 시선
];

/**
 * 카메라 리그 생성
 * @param {number} aspect 초기 종횡비
 */
export function createCameraRig(aspect) {
  const camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 700);

  // centripetal 파라미터화 — 급커브에서도 오버슈트가 적어 카메라 경로에 적합
  const posCurve = new THREE.CatmullRomCurve3(POSITION_WAYPOINTS, false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(LOOKAT_WAYPOINTS, false, 'centripetal');

  // 매 프레임 재사용하는 임시 벡터 (GC 방지)
  const _pos = new THREE.Vector3();
  const _look = new THREE.Vector3();

  camera.position.copy(POSITION_WAYPOINTS[0]);
  camera.lookAt(LOOKAT_WAYPOINTS[0]);

  return {
    camera,

    /**
     * 스크롤 진행도에 따라 카메라 배치
     * @param {number} progress 0~1 스크롤 진행도 (스크럽 완화가 적용된 값)
     * @param {number} time 경과 시간(초) — 미세한 흔들림용
     * @param {{x:number, y:number}} pointer 마우스 패럴랙스(-1~1)
     */
    update(progress, time, pointer) {
      const p = THREE.MathUtils.clamp(progress, 0, 1);

      // getPointAt = 호 길이 기준 보간 → 구간별 속도가 일정하다
      posCurve.getPointAt(p, _pos);
      lookCurve.getPointAt(p, _look);

      // 아주 미세한 부유감 (멀미 방지 수준으로 작게)
      _pos.y += Math.sin(time * 0.6) * 0.12;
      _pos.x += Math.cos(time * 0.45) * 0.1;

      camera.position.copy(_pos);

      // 마우스 패럴랙스 — 시선 목표를 살짝 밀어준다
      _look.x += pointer.x * 2.2;
      _look.y += pointer.y * 1.2;
      camera.lookAt(_look);

      // 경로 곡률에 맞춘 은은한 롤(기울임) — 비행하는 느낌
      camera.rotateZ(Math.sin(p * Math.PI * 6) * 0.018);
    },
  };
}
