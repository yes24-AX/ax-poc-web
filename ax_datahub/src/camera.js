// ============================================================
// camera.js — CSS 3D 카메라
//
// CSS에는 카메라가 없으므로 월드 전체에 카메라의 "역변환"을 건다.
//   world.transform = rotateX(-rx) rotateY(-ry) translate3d(-x, -y, -z)
// 웨이포인트 사이는 smoothstep으로 보간해 복도를 매끄럽게 지나간다.
// ============================================================

/**
 * 여정 웨이포인트
 * 주요 지점 — 표지 -1800 / -3800 / -5900 / -8100 / -10500
 *            MSTR 랙 -2150~-3410 · 세션경로 -4400 · 통합코어 -6500
 *            퍼널 게이트 -8600~-9800 · 대시보드 홀 -11350~-11680
 */
const KEYFRAMES = [
  { p: 0.00, x: 0,    y: -20, z: 700,    ry: 0,   rx: 0 },   // 복도 앞
  { p: 0.06, x: 0,    y: -15, z: 200,    ry: 0,   rx: 0 },
  { p: 0.13, x: 0,    y: 0,   z: -900,   ry: 0,   rx: 0 },   // 복도 진입
  { p: 0.19, x: 0,    y: 0,   z: -1720,  ry: 0,   rx: 0 },   // 01 MSTR 표지 통과
  { p: 0.25, x: -80,  y: 0,   z: -2180,  ry: 9,   rx: 0 },   // 좌측 랙(매출)을 스침
  { p: 0.31, x: 80,   y: 0,   z: -2600,  ry: -9,  rx: 0 },   // 우측 랙(재고)
  { p: 0.36, x: -70,  y: 0,   z: -3020,  ry: 8,   rx: 0 },   // 좌측 랙(발주)
  { p: 0.41, x: 60,   y: 0,   z: -3440,  ry: -7,  rx: 0 },   // 우측 랙(상품권)
  { p: 0.46, x: 0,    y: 0,   z: -3760,  ry: 0,   rx: 0 },   // 02 CLICKSTREAM 표지
  { p: 0.53, x: 0,    y: -40, z: -4380,  ry: 0,   rx: 2 },   // 세션 경로 아래를 지남
  { p: 0.59, x: 0,    y: 0,   z: -5060,  ry: 0,   rx: 0 },
  { p: 0.64, x: 0,    y: 0,   z: -5860,  ry: 0,   rx: 0 },   // 03 UNIFY 표지
  { p: 0.70, x: 190,  y: -30, z: -6420,  ry: -13, rx: 0 },   // 통합 코어 옆을 스침
  { p: 0.75, x: 40,   y: 0,   z: -7000,  ry: 5,   rx: 0 },
  { p: 0.80, x: 0,    y: 0,   z: -8060,  ry: 0,   rx: 0 },   // 04 PERFORMANCE 표지
  { p: 0.87, x: 0,    y: 0,   z: -9300,  ry: 0,   rx: 0 },   // 퍼널 게이트 관통
  { p: 0.92, x: 0,    y: 0,   z: -10050, ry: 0,   rx: 0 },
  { p: 0.96, x: 0,    y: -10, z: -10460, ry: 0,   rx: 0 },   // 05 DASHBOARD 표지
  { p: 1.00, x: 0,    y: -10, z: -11000, ry: 0,   rx: 0 },   // 대시보드 홀 도착
];

const lerp = (a, b, t) => a + (b - a) * t;

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
  const s = t * t * (3 - 2 * t); // 구간 내 가감속
  return {
    x: lerp(a.x, b.x, s),
    y: lerp(a.y, b.y, s),
    z: lerp(a.z, b.z, s),
    ry: lerp(a.ry, b.ry, s),
    rx: lerp(a.rx, b.rx, s),
  };
}

export function createCamera(worldEl) {
  let lastT = '';

  const rig = {
    z: KEYFRAMES[0].z, // 포그가 참조한다

    /**
     * @param {number} progress 0~1
     * @param {number} time 경과 시간(초) — 미세한 흔들림
     * @param {{x:number,y:number}} pointer 마우스 패럴랙스(-1~1)
     */
    update(progress, time, pointer) {
      const k = sample(progress);

      // 걸어 들어가는 듯한 아주 작은 흔들림
      const x = k.x + Math.cos(time * 0.7) * 6;
      const y = k.y + Math.sin(time * 0.9) * 7;
      const ry = k.ry + pointer.x * 2.4;
      const rx = k.rx - pointer.y * 1.6;

      rig.z = k.z;

      const t =
        `rotateX(${(-rx).toFixed(2)}deg) rotateY(${(-ry).toFixed(2)}deg) ` +
        `translate3d(${(-x).toFixed(1)}px, ${(-y).toFixed(1)}px, ${(-k.z).toFixed(1)}px)`;

      if (t !== lastT) {
        worldEl.style.transform = t;
        lastT = t;
      }
    },
  };

  return rig;
}
