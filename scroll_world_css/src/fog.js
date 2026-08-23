// ============================================================
// fog.js — 카메라 거리 기반 뎁스 포그
//
// CSS 3D에는 포그가 없어서 오브젝트가 멀리서도 또렷하게 보이고,
// 카메라 뒤로 넘어가면 뒤집혀 보이는 등 "가짜 3D" 티가 난다.
// 여기서는 매 프레임 각 오브젝트의 카메라 기준 깊이를 계산해
//   · 먼 곳    → 서서히 사라짐(공기 원근)
//   · 코앞/뒤편 → 사라짐(통과하는 느낌 + 뒤집힘 방지)
// 로 처리한다. 이 한 가지가 입체감을 가장 크게 끌어올린다.
// ============================================================

/** 기본 포그 파라미터 (px 단위, 월드 좌표계) */
const DEFAULTS = {
  nearOut: 40,   // 이보다 가까우면(또는 뒤에 있으면) 완전히 사라짐
  nearIn: 340,   // 여기까지 오면서 서서히 사라짐
  farIn: 2100,   // 여기부터 옅어지기 시작
  farOut: 3400,  // 이보다 멀면 완전히 사라짐
};

export function createFog() {
  /** @type {{el: HTMLElement, z: number, o: object, last: number, hidden: boolean}[]} */
  const items = [];

  return {
    /**
     * 포그 대상 등록
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

    /**
     * 카메라 z에 맞춰 전체 갱신
     * @param {number} camZ 카메라의 월드 z
     */
    update(camZ) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const o = it.o;
        // 카메라는 -z 방향을 본다 → depth가 양수면 카메라 앞
        const depth = camZ - it.z;

        let a;
        if (depth <= o.nearOut || depth >= o.farOut) {
          a = 0;
        } else if (depth < o.nearIn) {
          a = (depth - o.nearOut) / (o.nearIn - o.nearOut);
        } else if (depth > o.farIn) {
          a = 1 - (depth - o.farIn) / (o.farOut - o.farIn);
        } else {
          a = 1;
        }

        // 미세 변화는 건너뛰어 불필요한 스타일 갱신을 막는다
        if (Math.abs(a - it.last) < 0.015) continue;
        it.last = a;

        // 완전히 투명하면 렌더링에서 제외(소프트웨어 렌더링 성능에 유리)
        const shouldHide = a <= 0.01;
        if (shouldHide !== it.hidden) {
          it.el.style.visibility = shouldHide ? 'hidden' : 'visible';
          it.hidden = shouldHide;
        }
        if (!shouldHide) it.el.style.opacity = a.toFixed(3);
      }
    },
  };
}
