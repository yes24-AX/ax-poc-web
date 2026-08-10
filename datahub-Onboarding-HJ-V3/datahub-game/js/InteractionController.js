export class InteractionController {
  constructor(manager) {
    this.m = manager;
    this.fragments = 0;
    this.initCursor();
    this.initWake();
    this.initTokens();
    this.initLineage();
    this.initTrust();
    this.initCharge();
    this.initLandscape();
    this.initFinal();
  }

  initCursor() {
    window.addEventListener('pointermove', event => gsap.to('.cursor-light', { x: event.clientX, y: event.clientY, duration: .45, ease: 'power2.out' }));
  }

  initWake() {
    const signal = document.querySelector('.signal');
    const wake = () => {
      if (signal.classList.contains('done')) return;
      signal.classList.add('found', 'done');
      document.querySelector('#entity').textContent = '매출 변화';
      document.querySelector('#wakeCopy').textContent = '답을 찾으려면, 서로 다른 근거를 연결해야 합니다.';
      gsap.to('.signal i', { scale: 2.4, duration: .35, yoyo: true, repeat: 1 });
      this.m.complete(0, 8);
    };
    signal.addEventListener('click', wake);
    signal.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') wake(); });
  }

  drag(element, onDrop) {
    let startX; let startY; let offsetX = 0; let offsetY = 0; let active = false;
    element.addEventListener('pointerdown', event => {
      active = true; startX = event.clientX - offsetX; startY = event.clientY - offsetY;
      element.setPointerCapture(event.pointerId); element.classList.add('dragging');
    });
    element.addEventListener('pointermove', event => {
      if (!active) return;
      offsetX = event.clientX - startX; offsetY = event.clientY - startY;
      gsap.set(element, { x: offsetX, y: offsetY });
    });
    const finish = event => {
      if (!active) return;
      active = false; element.classList.remove('dragging');
      onDrop?.(element, event, { reset: () => { offsetX = offsetY = 0; gsap.to(element, { x: 0, y: 0, duration: .35 }); } });
    };
    element.addEventListener('pointerup', finish);
    element.addEventListener('pointercancel', () => {
      if (!active) return;
      active = false; element.classList.remove('dragging'); offsetX = offsetY = 0;
      gsap.to(element, { x: 0, y: 0, duration: .25 });
    });
  }

  overlaps(first, second) {
    const a = first.getBoundingClientRect(); const b = second.getBoundingClientRect();
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  initTokens() {
    const zone = document.querySelector('.dropzone');
    document.querySelectorAll('.token').forEach(token => {
      const absorb = element => {
        if (element.disabled) return;
        element.disabled = true; this.fragments += 1;
        gsap.to(element, { left: '50%', top: '47%', x: 0, y: 0, scale: .1, opacity: 0, duration: .45, ease: 'power3.in', onComplete: () => element.remove() });
        gsap.fromTo('.core i', { scale: 1 }, { scale: 1.5, duration: .25, yoyo: true, repeat: 1 });
        if (this.fragments === 5) {
          document.querySelector('#entity').textContent = '근거 흐름';
          gsap.to('.core', { opacity: .16, scale: .78, duration: .45 });
          this.m.flash('SOURCES CONNECTED · 관심 → 반응 → 구매 → 결과');
          setTimeout(() => this.m.complete(1, 26), 850);
        }
      };
      this.drag(token, (element, event, drag) => { if (!this.overlaps(element, zone)) return drag.reset(); absorb(element); });
      token.addEventListener('click', () => absorb(token));
    });
  }

  initLineage() {
    const cards = [...document.querySelectorAll('.business-card')];
    const svg = document.querySelector('.binding-svg'); const group = document.querySelector('.binding-lines');
    const status = document.querySelector('.binding-status span'); const bar = document.querySelector('.binding-status i');
    const order = ['campaign', 'reader', 'product', 'order', 'sales']; let step = 0; let previous = null;
    const point = element => { const rect = element.getBoundingClientRect(); const frame = svg.getBoundingClientRect(); return { x: rect.left + rect.width / 2 - frame.left, y: rect.top + rect.height / 2 - frame.top }; };
    const connect = card => {
      if (card.dataset.dataset !== order[step]) {
        gsap.fromTo(card, { x: 0 }, { x: 7, duration: .06, yoyo: true, repeat: 5 });
        this.m.flash('빛나는 카드부터 순서대로 선택해 주세요'); return;
      }
      card.classList.remove('next'); card.classList.add('connected'); card.querySelector('em').textContent = 'CONNECTED';
      if (previous) {
        const a = point(previous); const b = point(card); const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'binding-line'); path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x + (b.x - a.x) * .45} ${a.y}, ${b.x - (b.x - a.x) * .45} ${b.y}, ${b.x} ${b.y}`);
        group.append(path); gsap.to(path, { strokeDashoffset: 0, duration: .65, ease: 'power2.out' });
      }
      previous = card; step += 1; status.textContent = `${step} / 5 DATA CONNECTED`; bar.style.width = `${step * 20}%`;
      if (step < 5) cards.find(item => item.dataset.dataset === order[step]).classList.add('next');
      else {
        this.m.flash('CONNECTED FLOW · 관심 → 반응 → 상품 → 구매 → 결과');
        setTimeout(() => this.m.complete(2, 66), 1600);
      }
    };
    cards.forEach(card => card.addEventListener('click', () => connect(card)));
  }

  initTrust() {
    document.querySelector('.exit.bad').addEventListener('click', () => {
      gsap.fromTo('.exit.bad', { x: 0 }, { x: 8, duration: .06, yoyo: true, repeat: 5 });
      this.m.flash('ERROR · 기준과 최신성을 확인할 수 없는 파일입니다.', 'error');
    });
    document.querySelector('.exit.good').addEventListener('click', () => {
      gsap.to('.exit.good', { borderColor: '#b8ff5b', boxShadow: '0 0 45px rgba(184,255,91,.14)', scale: 1.03, duration: .4 });
      this.m.flash('STANDARD SELECTED · 전사 공식 지표를 기준으로 선택했습니다.');
      setTimeout(() => this.m.complete(3, 76), 1350);
    });
  }

  initCharge() {
    const button = document.querySelector('.charger'); let start = 0; let frame;
    const reveal = () => {
      if (button.classList.contains('done')) return;
      cancelAnimationFrame(frame); button.classList.add('done'); button.style.setProperty('--charge', '100%');
      gsap.to('.network', { rotation: 18, scale: 1.35, duration: 1.1, ease: 'power3.inOut' }); this.m.complete(4, 91);
    };
    const tick = () => {
      const progress = Math.min(100, (performance.now() - start) / 10); button.style.setProperty('--charge', `${progress}%`);
      if (progress >= 100) reveal(); else frame = requestAnimationFrame(tick);
    };
    button.addEventListener('pointerdown', event => {
      if (button.classList.contains('done')) return;
      start = performance.now(); button.setPointerCapture(event.pointerId); frame = requestAnimationFrame(tick);
    });
    button.addEventListener('pointerup', () => { if (!button.classList.contains('done')) { cancelAnimationFrame(frame); button.style.setProperty('--charge', '0%'); } });
    button.addEventListener('reveal:pattern', reveal);
  }

  initLandscape() {
    const zone = document.querySelector('.data-domains');
    const hub = zone.querySelector('.landscape-hub');
    const coverage = hub.querySelector('em'); const bar = hub.querySelector('i');
    const question = hub.querySelector('b'); const chips = hub.querySelector('.coverage-chips');
    const nodes = [...zone.querySelectorAll('.domain-node')];
    let mapped = 0;
    const evidence = {
      marketing: '유입의 변화', crema: '읽기와 콘텐츠 반응', sarak: '독자의 목소리',
      b2x: '구매 유형', clickstream: '관심 키워드', pd: '실행할 상품', bookstore: '출고 · 취소 · 반품'
    };
    const map = node => {
      if (node.classList.contains('mapped')) return;
      node.classList.add('mapped'); mapped += 1;
      gsap.to(node, { opacity: 0, scale: .3, duration: .35, ease: 'power3.in', onComplete: () => node.remove() });
      gsap.fromTo(hub, { boxShadow: '0 0 0 rgba(184,255,91,0)' }, { boxShadow: '0 0 60px rgba(184,255,91,.3)', duration: .28, yoyo: true, repeat: 1 });
      const percent = Math.round(mapped / nodes.length * 100);
      coverage.textContent = `${percent}%`; bar.style.width = `${percent}%`;
      this.m.flash(`EVIDENCE CONNECTED · ${evidence[node.dataset.domain]} 근거 연결`);
      const chip = document.createElement('span'); chip.textContent = evidence[node.dataset.domain]; chips.append(chip); gsap.from(chip, { opacity: 0, scale: .7, duration: .3 });
      if (mapped === nodes.length) {
        question.innerHTML = '매출 변화의 원인과 다음 실행의<br>근거가 모였습니다.';
        gsap.to('.silos', { scale: 1.85, rotationX: 55, duration: 1.1, ease: 'power3.inOut' });
        setTimeout(() => this.m.complete(5, 97), 1450);
      }
    };
    nodes.forEach(node => {
      node.addEventListener('pointerdown', () => hub.classList.add('drop-ready'));
      this.drag(node, (element, event, drag) => {
        hub.classList.remove('drop-ready');
        if (!this.overlaps(element, hub)) return drag.reset();
        map(element);
      });
      node.addEventListener('pointercancel', () => hub.classList.remove('drop-ready'));
      node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') map(node); });
    });
    zone.addEventListener('reveal:landscape', () => {
      nodes.forEach((node, index) => setTimeout(() => map(node), index * 160));
    });
  }

  initFinal() {}
}
