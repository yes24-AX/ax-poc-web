export class SceneManager {
  constructor() {
    this.scenes = [...document.querySelectorAll('.scene')];
    this.titles = ['QUESTION', 'SOURCES', 'CONNECT', 'STANDARD', 'PATTERN', 'LANDSCAPE', 'DATAHUB'];
    this.guides = [
      ['질문을 시작하세요', '중앙의 WHY? 신호를 찾아 클릭하세요.'],
      ['근거 데이터를 모으세요', '캠페인, 독자, 상품, 주문·배송, 매출 데이터를 질문에 모으세요.'],
      ['질문에 필요한 데이터를 연결하세요', '빛나는 카드부터 관심 → 반응 → 상품 → 구매 → 결과 순서로 연결하세요.'],
      ['회사의 공식 기준을 선택하세요', '개인 파일과 공식 지표의 담당자, 업데이트 시간, 산정 기준을 비교하세요.'],
      ['패턴을 발견하세요', '중앙 버튼을 길게 눌러 연결된 데이터가 만든 패턴을 확인하세요.'],
      ['질문의 근거를 완성하세요', '각 데이터 카드를 중앙 DROP EVIDENCE HERE 영역으로 드래그해, 판단에 필요한 근거를 완성하세요.'],
      ['DataHub에서 답을 확인하세요', '연결한 근거가 하나의 판단으로 정리됩니다.'],
    ];
    this.current = 0;
    this.unlocked = 0;
    this.requested = 0;
    document.querySelector('#skipStep').addEventListener('click', () => this.skip());
  }

  request(index) {
    this.requested = index;
    this.show(Math.min(index, this.unlocked));
    document.querySelector('.gate').style.opacity = index > this.unlocked ? 1 : 0;
  }

  show(index) {
    if (index === this.current && this.scenes[index].classList.contains('active')) { this.updateGuide(index); return; }
    const old = this.scenes[this.current];
    const next = this.scenes[index];
    gsap.to(old, { opacity: 0, scale: .94, duration: .45, ease: 'power2.inOut', onComplete: () => old.classList.remove('active') });
    next.classList.add('active');
    gsap.fromTo(next, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: .7, ease: 'power3.out' });
    this.current = index;
    document.querySelector('#sceneNumber').textContent = `${String(index + 1).padStart(2, '0')} / 07`;
    document.querySelector('#sceneTitle').textContent = this.titles[index];
    this.updateGuide(index);
    if (index === 6 && !this.finalRevealed) {
      this.finalRevealed = true;
      setTimeout(() => this.revealFinal(), 550);
    }
  }

  complete(scene, context) {
    if (scene !== this.unlocked) return;
    this.skipInProgress = false;
    document.querySelector('#skipStep').disabled = true;
    this.unlocked = Math.min(6, scene + 1);
    this.setContext(context);
    document.querySelector('.gate').style.opacity = 0;
    this.flash(scene === 5 ? 'EVIDENCE COMPLETE · 7개 데이터 근거가 연결되었습니다' : 'ACTION COMPLETE · 다음 구간이 열렸습니다');
    gsap.to('.walls i', { boxShadow: '0 0 18px rgba(184,255,91,.55)', duration: .18, yoyo: true, repeat: 1 });
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const nextTop = ((scene + 1) + .08) * scrollRange / 7;
    // PATTERN (scene 4) just revealed its signals + conclusion on a fade-in — give the reader time to
    // actually take it in before auto-scrolling away, instead of the standard hand-off delay.
    const delay = scene === 4 ? 3200 : 1100;
    setTimeout(() => window.scrollTo({ top: nextTop, behavior: 'smooth' }), delay);
  }

  setContext(value) {
    document.querySelector('#context').textContent = `${String(value).padStart(2, '0')}%`;
    gsap.to('.telemetry .meter i', { height: `${value}%`, duration: .7, ease: 'power2.out' });
  }

  revealFinal() {
    if (this.finalPlaying) return;
    this.finalPlaying = true;
    this.setContext(100);
    gsap.timeline()
      .set('.ui-shell', { opacity: .22, scale: 1, filter: 'brightness(.72)' })
      .set('.answer-flash', { autoAlpha: 0, scale: .82 })
      .to('.answer-flash', { autoAlpha: .78, scale: 1, duration: .35, ease: 'sine.out' })
      .to('.ui-shell', { opacity: .7, filter: 'brightness(1.08)', duration: .65, ease: 'sine.inOut' }, '<')
      .to('.answer-flash', { autoAlpha: 0, scale: 1.35, duration: .8, ease: 'sine.out' })
      .to('.final-message', { autoAlpha: 1, duration: .55, ease: 'sine.out' }, '-=.52')
      .from('.answer-summary', { opacity: 0, y: 18, duration: .6, ease: 'power3.out' }, '-=.18')
      .from('.final-next, #goDatahub', { opacity: 0, y: 10, duration: .4, stagger: .12, ease: 'power2.out' }, '-=.25');
  }

  updateGuide(index) {
    const [title, body] = this.guides[index];
    document.querySelector('#guideStep').textContent = `STEP ${index + 1} / 7`;
    document.querySelector('#guideTitle').textContent = title;
    document.querySelector('#guideBody').textContent = body;
    document.querySelector('#guideProgress').style.width = `${(index + 1) * (100 / 7)}%`;
    document.querySelector('.guide').style.display = 'block';
    const skip = document.querySelector('#skipStep');
    skip.style.display = index === 6 ? 'none' : '';
    skip.disabled = index < this.unlocked || index === 6 || Boolean(this.skipInProgress);
  }

  flash(message, tone = 'default') {
    const el = document.createElement('div');
    el.className = `action-flash${tone === 'error' ? ' action-flash--error' : ''}`;
    el.textContent = message;
    document.body.append(el);
    gsap.fromTo(el, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .25, onComplete: () => gsap.to(el, { opacity: 0, y: -8, duration: .35, delay: .8, onComplete: () => el.remove() }) });
  }

  skip() {
    if (this.skipInProgress || this.current !== this.unlocked || this.current === 6) return;
    this.skipInProgress = true;
    document.querySelector('#skipStep').disabled = true;
    if (this.current === 0) return document.querySelector('.signal').click();
    if (this.current === 1) return document.querySelectorAll('.token:not(:disabled)').forEach((token, i) => setTimeout(() => token.click(), i * 150));
    if (this.current === 2) return document.querySelectorAll('.business-card:not(.connected)').forEach((card, i) => setTimeout(() => card.click(), i * 220));
    if (this.current === 3) return document.querySelector('.exit.good').click();
    if (this.current === 4) { const charger = document.querySelector('.charger'); if (!charger.classList.contains('done')) charger.dispatchEvent(new Event('reveal:pattern')); return; }
    if (this.current === 5) { document.querySelector('.data-domains').dispatchEvent(new Event('reveal:landscape')); return; }
    if (this.current === 6) this.revealFinal();
  }
}
