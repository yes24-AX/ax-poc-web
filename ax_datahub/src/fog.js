// ============================================================
// fog.js — 카메라 거리 기반 뎁스 포그
//
// CSS 3D에는 포그가 없어서 멀리 있는 랙도 또렷하게 보이고,
// 카메라 뒤로 넘어간 요소는 뒤집혀 보인다. 매 프레임 각 오브젝트의
// 카메라 기준 깊이를 계산해
//   · 먼 곳    → 어둠 속에서 서서히 나타남 (복도의 깊이감)
//   · 코앞/뒤편 → 사라짐 (지나쳤다는 느낌 + 뒤집힘 방지)
// 로 처리한다. 투명도 0인 요소는 렌더링에서 빠지므로 컬링도 겸한다.
// ============================================================

const DEFAULTS = {
  nearOut: 30,   // 이보다 가깝거나 뒤에 있으면 사라짐
  nearIn: 260,   // 여기까지 오면서 서서히 사라짐
  farIn: 1500,   // 여기부터 옅어지기 시작
  farOut: 2700,  // 이보다 멀면 보이지 않음
};

export function createFog() {
  const items = [];

  return {
    /**
     * @param {HTMLElement} el 대상(보통 .place 래퍼)
     * @param {number} z 월드 z 좌표
     * @param {object} [opts] DEFAULTS 일부 덮어쓰기
     */
    register(el, z, opts) {
      items.push({
        el,
        z,
        o: opts ? { ...DEFAULTS, ...opts } : DEFAULTS,
        last: -1,
        hidden: false,
      });
    },

    /** @param {number} camZ 카메라의 월드 z */
    update(camZ) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const o = it.o;
        const depth = camZ - it.z; // 양수면 카메라 앞

        let a;
        if (depth <= o.nearOut || depth >= o.farOut) a = 0;
        else if (depth < o.nearIn) a = (depth - o.nearOut) / (o.nearIn - o.nearOut);
        else if (depth > o.farIn) a = 1 - (depth - o.farIn) / (o.farOut - o.farIn);
        else a = 1;

        if (Math.abs(a - it.last) < 0.015) continue;
        it.last = a;

        const hide = a <= 0.01;
        if (hide !== it.hidden) {
          it.el.style.visibility = hide ? 'hidden' : 'visible';
          it.hidden = hide;
        }
        if (!hide) it.el.style.opacity = a.toFixed(3);
      }
    },

    get size() { return items.length; },
  };
}
