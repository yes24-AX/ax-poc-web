// ============================================================
// camera.js — CSS 3D 카메라 리그
//
// CSS에는 카메라가 없으므로 월드 전체에 카메라의 "역변환"을 적용한다.
//   world.transform = rotateX(-rx) rotateY(-ry) translate3d(-x, -y, -z)
// 웨이포인트 사이는 smoothstep 보간 → 웨이포인트 통과가 부드럽다.
// 카메라의 월드 z는 뎁스 포그 계산에 그대로 쓰인다.
// ============================================================

/**
 * 카메라 여정 웨이포인트
 * p: 스크롤 진행도 / x,y,z: 월드 좌표(px, y는 아래가 +) / ry,rx: 시선 회전(도)
 *
 * 주요 지점 — 히어로 -300 · 마커 -2000/-4700/-8000/-10300
 *            DataHub -3000 · Core -6000 · Factory -9000 · Workspace -12000
 */
const KEYFRAMES = [
  { p: 0.00, x: 0,   y: -30, z: 900,    ry: 0,   rx: 0 },  // 출발 — 워드마크를 정면으로
  { p: 0.08, x: 0,   y: -30, z: 300,    ry: 0,   rx: 0 },  // 워드마크가 화면을 채운다
  { p: 0.14, x: 20,  y: -25, z: -240,   ry: -1,  rx: 0 },  // 히어로 워드마크 통과
  { p: 0.20, x: 60,  y: -10, z: -1250,  ry: -3,  rx: 0 },
  { p: 0.26, x: 0,   y: 0,   z: -2150,  ry: 2,   rx: 0 },  // 01 DATA 통과
  { p: 0.31, x: -90, y: 10,  z: -2680,  ry: 5,   rx: 0 },  // DataHub 진입
  { p: 0.37, x: 80,  y: 20,  z: -3380,  ry: -4,  rx: 0 },  // DataHub 관통
  { p: 0.43, x: 0,   y: 0,   z: -4100,  ry: 0,   rx: 0 },
  { p: 0.48, x: 0,   y: -20, z: -4820,  ry: 0,   rx: 0 },  // 02 INTELLIGENCE 통과
  // 코어는 정면 충돌이 아니라 크게 우회하며 스쳐야 규모가 읽힌다
  { p: 0.53, x: 60,  y: -40, z: -5150,  ry: -3,  rx: 0 },  // 원경
  { p: 0.58, x: 240, y: -50, z: -5450,  ry: -9,  rx: 0 },  // 접근
  { p: 0.63, x: 460, y: -40, z: -5800,  ry: -16, rx: 0 },  // 코어 우측을 스침
  { p: 0.67, x: 220, y: -20, z: -6350,  ry: 8,   rx: 0 },  // 통과
  { p: 0.71, x: 0,   y: 0,   z: -7250,  ry: 0,   rx: 0 },
  { p: 0.75, x: 0,   y: -10, z: -7950,  ry: 0,   rx: 0 },  // 03 AUTOMATION 통과
  // 공장은 볼거리가 많아 통과 속도를 늦춘다(진행도 대비 z 변화량 축소)
  { p: 0.79, x: -80, y: -60, z: -8420,  ry: 4,   rx: 2 },  // 공장 진입(살짝 내려봄)
  { p: 0.84, x: -10, y: -50, z: -8820,  ry: 1,   rx: 1 },  // 컨베이어 옆을 천천히
  { p: 0.89, x: 70,  y: -30, z: -9300,  ry: -3,  rx: 0 },  // 공장 관통
  { p: 0.93, x: 0,   y: -20, z: -10000, ry: 0,   rx: 0 },
  { p: 0.96, x: 0,   y: -20, z: -10650, ry: 0,   rx: 0 },  // 04 WORKSPACE 통과
  { p: 1.00, x: 0,   y: -20, z: -11100, ry: 0,   rx: 0 },  // 도착 — 대시보드 한가운데
];

const lerp = (a, b, t) => a + (b - a) * t;

/** 진행도 p에서의 카메라 상태 (구간 내 smoothstep 가감속) */
function sample(p) {
  const c = Math.min(1, Math.max(0, p));
  let a = KEYFRAMES[0];
  let b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (c >= KEYFRAMES[i].p && c <= KEYFRAMES[i + 1].p) {
      a = KEYFRAMES[i];
      b = KEYFRAMES[i + 1];
      break;
    }
  }
  const t = a === b ? 0 : (c - a.p) / (b.p - a.p);
  const s = t * t * (3 - 2 * t);
  return {
    x: lerp(a.x, b.x, s),
    y: lerp(a.y, b.y, s),
    z: lerp(a.z, b.z, s),
    ry: lerp(a.ry, b.ry, s),
    rx: lerp(a.rx, b.rx, s),
  };
}

/**
 * @param {HTMLElement} worldEl #world
 */
export function createCameraRig(worldEl) {
  let lastTransform = '';

  const rig = {
    z: KEYFRAMES[0].z, // 포그가 참조하는 현재 카메라 월드 z

    /**
     * @param {number} progress 스크롤 진행도(0~1, scrub 완화 적용)
     * @param {number} time 경과 시간(초)
     * @param {{x:number, y:number}} pointer 마우스 패럴랙스(-1~1)
     */
    update(progress, time, pointer) {
      const k = sample(progress);

      // 아주 미세한 부유 + 마우스 패럴랙스 (멀미가 나지 않을 정도로만)
      const x = k.x + Math.cos(time * 0.4) * 7;
      const y = k.y + Math.sin(time * 0.53) * 8;
      const ry = k.ry + pointer.x * 2.2;
      const rx = k.rx - pointer.y * 1.5;

      rig.z = k.z;

      const t =
        `rotateX(${(-rx).toFixed(2)}deg) rotateY(${(-ry).toFixed(2)}deg) ` +
        `translate3d(${(-x).toFixed(1)}px, ${(-y).toFixed(1)}px, ${(-k.z).toFixed(1)}px)`;

      if (t !== lastTransform) {
        worldEl.style.transform = t;
        lastTransform = t;
      }
    },
  };

  return rig;
}
