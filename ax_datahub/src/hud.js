// ============================================================
// hud.js — 스캐너 HUD와 조준 리티클
//
// "데이터를 찾는다"는 감각을 담당한다.
//   · 우상단 패널: 지금 무엇을 스캔 중이고 몇 건을 찾았는지
//   · 리티클: 화면 안에서 대상 위로 이동해 고정된다
// ============================================================

/* global gsap */

const nf = new Intl.NumberFormat('ko-KR');

export function createHud() {
  const led = document.getElementById('hud-led');
  const mode = document.getElementById('hud-mode');
  const target = document.getElementById('hud-target');
  const bar = document.getElementById('hud-bar');
  const count = document.getElementById('hud-count');
  const reticle = document.getElementById('reticle');
  const tag = document.getElementById('reticle-tag');

  const counter = { v: 0 };
  let countTw = null;
  let scanTw = null;
  let lockTw = null;

  return {
    /**
     * 새 스캔을 시작한다.
     * @param {{mode:string, target:string, count:number}} scan
     * @param {number} rate 재생 배속 (애니메이션 속도를 맞춘다)
     */
    scan(scan, rate = 1) {
      mode.textContent = scan.mode;
      target.textContent = scan.target;

      // 스캔 진행 바 — 0에서 100%까지 차오른다
      scanTw?.kill();
      scanTw = gsap.fromTo(bar, { width: '0%' },
        { width: '100%', duration: 2.6, ease: 'power1.inOut' });
      scanTw.timeScale(rate);

      // 찾아낸 레코드 수가 올라간다
      countTw?.kill();
      countTw = gsap.to(counter, {
        v: scan.count,
        duration: 2.4,
        ease: 'power2.out',
        onUpdate: () => { count.textContent = nf.format(Math.round(counter.v)); },
      });
      countTw.timeScale(rate);

      // LED 점멸 속도로 상태를 구분
      led.style.animationDuration = scan.mode === 'COMPLETE' ? '3s' : '0.9s';
    },

    /**
     * 리티클을 화면 위치에 고정한다.
     * @param {{x:number, y:number, size:number, tag:string}|null} lock 화면 비율(%)
     */
    lockOn(lock, rate = 1) {
      lockTw?.kill();
      if (!lock) {
        tag.textContent = '';   // 이전 대상 이름이 남지 않게
        lockTw = gsap.to(reticle, { opacity: 0, duration: 0.4 });
        lockTw.timeScale(rate);
        return;
      }
      tag.textContent = lock.tag;
      reticle.style.width = `${lock.size}px`;
      reticle.style.height = `${lock.size}px`;
      reticle.style.margin = `${-lock.size / 2}px 0 0 ${-lock.size / 2}px`;

      lockTw = gsap.timeline();
      lockTw.set(reticle, { left: `${lock.x}%`, top: `${lock.y}%` });
      // 밖에서 조여들며 잠기는 느낌
      lockTw.fromTo(reticle,
        { opacity: 0, scale: 1.6 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' });
      lockTw.to(reticle, { scale: 1.04, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      lockTw.timeScale(rate);
    },

    /** 되감기 등으로 상태를 되돌릴 때 */
    reset() {
      counter.v = 0;
      count.textContent = '0';
      bar.style.width = '0%';
    },
  };
}
