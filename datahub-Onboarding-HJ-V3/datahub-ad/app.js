(() => {
  const root = document.documentElement;
  const journey = document.querySelector('.journey');
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const range = (p, a, b) => clamp((p - a) / (b - a));

  let ticking = false;
  const render = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(scrollY / max) : 0;
    const intro = range(p, 0, .15);
    const service = range(p, .19, .39);
    const work = range(p, .40, .60);
    const wide = range(p, .62, .79);
    const hub = range(p, .81, .97);

    root.style.setProperty('--p', p.toFixed(4));
    root.style.setProperty('--intro', intro.toFixed(4));
    root.style.setProperty('--service', service.toFixed(4));
    root.style.setProperty('--work', work.toFixed(4));
    root.style.setProperty('--wide', wide.toFixed(4));
    root.style.setProperty('--hub', hub.toFixed(4));
    journey.classList.toggle('light-open', intro > .995);
    ticking = false;
  };

  addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }, { passive: true });
  addEventListener('resize', render);
  history.scrollRestoration = 'manual';
  render();
})();
