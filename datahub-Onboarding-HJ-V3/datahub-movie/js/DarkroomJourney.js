import { scenes } from './scenes.js?v=2';

const clamp = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => n * n * (3 - 2 * n);

export class DarkroomJourney {
  constructor(root) {
    this.root = root;
    this.index = 0;
    this.progress = 0;
    this.busy = false;
    this.autoPlaying = false;
    this.dragging = null;
    this.dragStart = null;
    this.holdFrame = 0;
    this.holdStart = 0;
    this.gestureMoved = false;
    this.suppressClick = false;
    this.lightPosition = { x: -130, y: 0 };
    this.negatives = [...root.querySelectorAll('.negative')];
    this.bind();
    this.render();
    this.paint(0);
  }

  bind() {
    const light = this.root.querySelector('#light');
    const product = this.root.querySelector('.product');
    const dial = this.root.querySelector('#focusDial');
    const paper = this.root.querySelector('#paper');

    this.root.querySelector('#skip').addEventListener('click', () => this.auto());
    this.root.querySelector('#replay').addEventListener('click', () => location.reload());

    light.addEventListener('pointerdown', (event) => this.startDrag(event, 'light'));
    light.addEventListener('click', () => this.clickAdvance(0));
    light.addEventListener('keydown', (event) => {
      if (this.index === 0 && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        this.progress = clamp(this.progress + .25);
        this.lightPosition.x = -130 * (1 - this.progress);
        this.paint(smooth(this.progress));
        if (this.progress >= .999) this.complete();
      }
    });

    product.addEventListener('pointerdown', (event) => this.startDrag(event, 'film'));
    product.addEventListener('click', () => this.clickAdvance(1));
    dial.addEventListener('pointerdown', (event) => this.startDrag(event, 'dial'));
    dial.addEventListener('click', () => this.clickAdvance(2));
    paper.addEventListener('pointerdown', (event) => {
      if (this.index === 3) this.startDrag(event, 'scan');
      if (this.index === 4) this.startHold(event);
    });
    paper.addEventListener('click', () => {
      if (this.index === 3 || this.index === 4) this.clickAdvance(this.index);
    });

    addEventListener('pointermove', (event) => this.moveDrag(event));
    addEventListener('pointerup', () => this.endGesture());
    addEventListener('pointercancel', () => this.endGesture());

    addEventListener('keydown', (event) => {
      if (this.busy || this.autoPlaying) return;
      if (['ArrowRight', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault();
        this.progress = clamp(this.progress + .2);
        this.paint(smooth(this.progress));
        if (this.progress >= .999) this.complete();
      }
    });
  }

  startDrag(event, type) {
    if (this.busy || this.autoPlaying) return;
    if ((type === 'light' && this.index !== 0) || (type === 'film' && this.index !== 1) || (type === 'dial' && this.index !== 2) || (type === 'scan' && this.index !== 3)) return;
    event.preventDefault();
    this.dragging = type;
    this.gestureMoved = false;
    this.dragStart = { x: event.clientX, y: event.clientY, progress: this.progress, lightX: this.lightPosition.x, lightY: this.lightPosition.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    this.root.dataset.dragging = type;
  }

  moveDrag(event) {
    if (!this.dragging || !this.dragStart) return;
    if (Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y) > 8) this.gestureMoved = true;
    let next = this.dragStart.progress;
    if (this.dragging === 'light') {
      this.lightPosition.x = Math.max(-190, Math.min(190, this.dragStart.lightX + event.clientX - this.dragStart.x));
      this.lightPosition.y = Math.max(-55, Math.min(55, this.dragStart.lightY + event.clientY - this.dragStart.y));
      next = 1 - Math.min(1, Math.hypot(this.lightPosition.x, this.lightPosition.y) / 130);
    }
    if (this.dragging === 'film') next += (event.clientX - this.dragStart.x) / (innerWidth * .28) + (event.clientY - this.dragStart.y) / (innerHeight * .32);
    if (this.dragging === 'dial') next += Math.abs(event.clientX - this.dragStart.x) / Math.min(120, innerWidth * .14);
    if (this.dragging === 'scan') next += Math.max(0, this.dragStart.y - event.clientY) / Math.min(300, innerHeight * .42);
    this.progress = clamp(next);
    this.paint(smooth(this.progress));
  }

  endGesture() {
    if (!this.dragging) return;
    const type = this.dragging;
    this.suppressClick = this.gestureMoved;
    setTimeout(() => { this.suppressClick = false; }, 0);
    this.dragging = null;
    this.dragStart = null;
    delete this.root.dataset.dragging;
    const completionThreshold = type === 'light' ? .72 : .45;
    if (this.progress >= completionThreshold) {
      gsap.to(this, { progress: 1, duration: .35, ease: 'power2.out', onUpdate: () => this.paint(smooth(this.progress)), onComplete: () => this.complete() });
    } else {
      const settle = type === 'dial' ? Math.round(this.progress * 3) / 3 : this.progress;
      gsap.to(this, { progress: settle, duration: .3, onUpdate: () => this.paint(smooth(this.progress)) });
    }
  }

  startHold(event) {
    if (this.index !== 4 || this.busy || this.autoPlaying) return;
    event.preventDefault();
    this.dragging = 'hold';
    this.gestureMoved = false;
    this.holdStart = performance.now() - this.progress * 1450;
    this.root.dataset.dragging = 'hold';
    const tick = (now) => {
      if (this.dragging !== 'hold') return;
      this.progress = clamp((now - this.holdStart) / 1450);
      this.paint(smooth(this.progress));
      if (this.progress >= 1) {
        this.dragging = null;
        delete this.root.dataset.dragging;
        this.complete();
        return;
      }
      this.holdFrame = requestAnimationFrame(tick);
    };
    this.holdFrame = requestAnimationFrame(tick);
  }

  clickAdvance(expectedIndex) {
    if (this.index !== expectedIndex || this.busy || this.autoPlaying || this.suppressClick) return;
    this.autoPlaying = true;
    const clickDuration = this.index === 2 ? 3.6 : .72;
    if (this.index === 0) gsap.to(this.lightPosition, { x: 0, y: 0, duration: .72, ease: 'power2.inOut' });
    gsap.to(this, {
      progress: 1,
      duration: clickDuration,
      ease: 'power2.inOut',
      onUpdate: () => this.paint(smooth(this.progress)),
      onComplete: () => {
        this.autoPlaying = false;
        this.complete();
      }
    });
  }

  render() {
    const scene = scenes[this.index];
    this.root.dataset.step = this.index;
    this.root.dataset.phase = scene.phase;
    this.root.style.setProperty('--scene-progress', '0');
    this.root.querySelector('#count').textContent = `${String(this.index + 1).padStart(2, '0')} / 05`;
    this.root.querySelector('#chapter').textContent = scene.chapter;
    this.root.querySelector('#word').textContent = scene.word;
    this.root.querySelector('#sentence').textContent = scene.sentence;
    this.root.querySelector('#guideCode').textContent = scene.code;
    this.root.querySelector('#guideTitle').textContent = scene.guide;
    this.root.querySelector('#walkTitle').textContent = scene.walk;
    this.root.querySelector('#walkHelp').textContent = ['빛을 클릭하거나 중앙 초점점까지 드래그하세요.','상품 필름을 클릭하거나 빛 아래로 드래그하세요.','원형 다이얼을 클릭하거나 좌우로 드래그하세요.','인화지를 클릭하거나 위로 드래그하세요.','인화지를 클릭하거나 길게 눌러 현상하세요.'][this.index];
    this.negatives.forEach((item, i) => item.classList.toggle('active', this.index === 1 ? i === 0 : this.index === 2));
    gsap.to('#walk', { opacity: .88, duration: .35 });
    gsap.to('#guide', { opacity: 1, duration: .35 });
  }

  paint(p) {
    const phase = scenes[this.index].phase;
    this.root.style.setProperty('--scene-progress', p.toFixed(4));

    if (phase === 'question') {
      const lightX = this.autoPlaying ? -130 * (1 - p) : this.lightPosition.x;
      const lightY = this.autoPlaying ? 0 : this.lightPosition.y;
      gsap.set('.light-beam', { x: lightX, y: lightY, scaleX: .92 + p * .08, scaleY: .94 + p * .06, opacity: .58 + p * .34 });
      gsap.set('.paper-dot', { scale: 1 + p * 4, filter: `blur(${p * 1.2}px)` });
      gsap.set('#sentence', { opacity: .34 + p * .66, letterSpacing: `${.06 - p * .06}em` });
    }
    if (phase === 'exposure') {
      const film = this.negatives[0];
      gsap.set(film, { left: `${13 + p * 37}%`, top: `${35 + p * 15}%`, xPercent: -p * 50, yPercent: -p * 50, rotationY: 13 * (1 - p), scale: .88 + p * .08, opacity: .82 });
      gsap.set('.plate-develop', { opacity: p * .22 });
      gsap.set('.paper', { opacity: .28 + p * .18, filter: `brightness(${1 + p * .12})` });
    }
    if (phase === 'focus') {
      const stops = [0, .34, .68, 1];
      const active = Math.min(3, Math.floor(p * 3.999));
      this.root.dataset.focus = ['product', 'content', 'sales', 'order'][active];
      this.negatives.forEach((film, i) => {
        const distance = Math.abs(p - stops[i]);
        gsap.set(film, { opacity: Math.max(.08, 1 - distance * 3.1), filter: `blur(${Math.min(5, distance * 9)}px)`, z: -distance * 260, scale: .84 + Math.max(0, 1 - distance * 3) * .12 });
      });
      gsap.set('#focusDial i', { rotation: p * 285 });
      gsap.set('#field', { rotationY: (p - .5) * -5, x: (p - .5) * -3 + 'vw' });
      gsap.set('.plate-develop', { opacity: .22 + p * .28 });
    }
    if (phase === 'contact') {
      gsap.set('#field', { opacity: 1 - p * .72, z: p * -220, y: p * -35 });
      gsap.set('#paper', { rotationX: 62 - p * 38, scale: 1 + p * .18, opacity: .48 + p * .48 });
      gsap.set('.contact-sheet', { '--scan': `${p * 100}%`, opacity: .28 + p * .72 });
      gsap.set('.plate-develop', { opacity: .5 + p * .28 });
    }
    if (phase === 'develop') {
      gsap.set('#paper', { rotationX: 24 * (1 - p), y: -innerHeight * .16 * p, scale: 1.18 + p * .32, opacity: 1 });
      gsap.set('.contact-sheet', { opacity: 1 - p * .75, filter: `contrast(${1 + p * .3})` });
      gsap.set('.developed', { opacity: p, clipPath: `inset(0 ${100 - p * 100}% 0 0)` });
      gsap.set('.plate-reveal', { opacity: p * .9, scale: 1.04 - p * .04 });
      gsap.set('.gold-fix', { opacity: Math.max(0, (p - .55) * 2.3) });
    }
  }

  complete() {
    if (this.busy) return;
    this.busy = true;
    cancelAnimationFrame(this.holdFrame);
    gsap.to('#walk', { opacity: 0, duration: .25 });

    if (this.index === scenes.length - 1) {
      setTimeout(() => {
        gsap.to('#finale', { autoAlpha: 1, duration: 1.65, ease: 'power3.inOut' });
        gsap.fromTo('.datahub-shell', { scale: .74, rotationX: 11, y: 95, opacity: .18 }, { scale: 1, rotationX: 0, y: 0, opacity: 1, duration: 2.25, ease: 'power3.inOut' });
        gsap.fromTo('.datahub-actual', { opacity: 0, scale: 1.025, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 2.1, ease: 'power2.out' });
        gsap.fromTo('.final-message', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, delay: 1.35 });
        gsap.fromTo('.enter-datahub', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .8, delay: 1.9 });
      }, 950);
      return;
    }

    setTimeout(() => {
      this.index += 1;
      this.progress = 0;
      this.busy = false;
      this.render();
      this.paint(0);
      gsap.fromTo('#copy', { opacity: .12, y: 18 }, { opacity: 1, y: 0, duration: .72, ease: 'power3.out' });
    }, 420);
  }

  auto() {
    if (this.autoPlaying) return;
    this.autoPlaying = true;
    this.busy = false;
    const run = () => {
      const startedIndex = this.index;
      const from = this.progress;
      const start = performance.now();
      const tick = (now) => {
        const t = clamp((now - start) / (1800 * Math.max(.15, 1 - from)));
        this.progress = from + (1 - from) * t;
        this.paint(smooth(this.progress));
        if (t < 1) requestAnimationFrame(tick);
        else {
          this.autoPlaying = false;
          this.complete();
          if (startedIndex < scenes.length - 1) setTimeout(() => { this.autoPlaying = false; this.auto(); }, 1150);
        }
      };
      requestAnimationFrame(tick);
    };
    run();
  }
}
