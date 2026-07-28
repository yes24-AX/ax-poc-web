// ============================================================
// particles.js — Canvas 2D 별 필드 + 성운 (WebGL 미사용)
//
// 별을 화면 중심 기준 극좌표로 두고, 스크롤 속도에 비례해 바깥으로
// 흘려보낸다. 빠르게 스크롤할수록 점 → 속도선으로 변해 전진감을 만든다.
// 밝은 Workspace 구간에서는 자연스럽게 사라진다.
// ============================================================

const PALETTE = ['#ffffff', '#cfe0ff', '#a9c4ff', '#ffe9c8'];

/** 성운 덩어리 — 매 프레임 그라데이션 3개만 그려 저비용 유지 */
const NEBULAE = [
  { x: 0.22, y: 0.28, r: 0.62, rgb: '58, 68, 150' },
  { x: 0.78, y: 0.64, r: 0.7, rgb: '30, 74, 150' },
  { x: 0.56, y: 0.14, r: 0.48, rgb: '92, 58, 148' },
];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{mobile: boolean}} quality
 */
export function createStarField(canvas, quality) {
  const ctx = canvas.getContext('2d');
  const COUNT = quality.mobile ? 110 : 220;

  let W = 0;
  let H = 0;
  let stars = [];
  let lastProgress = 0;
  let smoothWarp = 0;

  function resize() {
    // DPR 1 고정 — GPU 가속이 없는 환경에서도 가볍게 유지
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawn(fresh) {
    return {
      angle: Math.random() * Math.PI * 2,
      // fresh = 화면 중앙 근처에서 새로 태어남
      dist: fresh ? Math.random() * 0.08 : Math.random(),
      depth: 0.3 + Math.random() * 0.7, // 클수록 앞쪽(빠르게 흐름)
      size: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      color: PALETTE[(Math.random() * PALETTE.length) | 0],
    };
  }

  resize();
  stars = Array.from({ length: COUNT }, () => spawn(false));
  window.addEventListener('resize', resize);

  return {
    /**
     * @param {number} t 경과 시간(초)
     * @param {number} dt 프레임 델타(초)
     * @param {number} progress 스크롤 진행도(0~1)
     */
    draw(t, dt, progress) {
      if (W === 0) resize();
      ctx.clearRect(0, 0, W, H);

      // 밝은 워크스페이스에 다가가면 밤하늘을 걷어낸다
      const fade = 1 - smoothstep(progress, 0.84, 0.95);
      if (fade <= 0.01) {
        lastProgress = progress;
        return;
      }

      // 진행 속도 → 워프 강도. 자동 재생은 진행도 변화가 완만하므로
      // 계수를 크게 잡아, 씬 사이를 "이동"할 때만 별이 선으로 늘어나고
      // 씬에 "머무를" 때는 점으로 남도록 임계값(0.3) 근처에서 갈린다.
      const velocity = Math.abs(progress - lastProgress) / Math.max(dt, 0.001);
      lastProgress = progress;
      smoothWarp += (Math.min(velocity * 8, 1.3) - smoothWarp) * Math.min(1, dt * 6);
      const warp = smoothWarp;

      // ---- 성운 ----
      ctx.globalAlpha = 0.55 * fade;
      for (const n of NEBULAE) {
        const cx = n.x * W + Math.sin(t * 0.045 + n.r * 9) * 34;
        const cy = n.y * H + Math.cos(t * 0.035 + n.r * 7) * 24;
        const rad = n.r * Math.min(W, H);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0, `rgba(${n.rgb}, 0.3)`);
        grad.addColorStop(0.55, `rgba(${n.rgb}, 0.09)`);
        grad.addColorStop(1, `rgba(${n.rgb}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      }

      // ---- 별 ----
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.hypot(cx, cy);
      const streaking = warp > 0.3;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // 기본 드리프트 + 워프. 앞쪽(depth 큰) 별이 더 빨리 흐른다
        s.dist += (0.012 + warp * 0.5) * s.depth * dt;
        if (s.dist > 1.05) stars[i] = spawn(true);

        const r = s.dist * maxR;
        const x = cx + Math.cos(s.angle) * r;
        const y = cy + Math.sin(s.angle) * r;

        // 중심에서 멀수록 또렷 + 반짝임
        const twinkle = 0.6 + Math.sin(t * 1.8 + s.phase) * 0.4;
        ctx.globalAlpha = fade * twinkle * Math.min(1, 0.2 + s.dist * 1.4);

        if (streaking) {
          const len = warp * 26 * s.depth;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(s.angle) * len, y + Math.sin(s.angle) * len);
          ctx.stroke();
        } else {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(x, y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    },
  };
}

function smoothstep(x, e0, e1) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
