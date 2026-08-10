(() => {
  const root = document.documentElement;
  const chapter = document.querySelector('#chapter');
  const clamp = n => Math.max(0, Math.min(1, n));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  let raf = 0;

  const draw = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max ? clamp(scrollY / max) : 0;
    const values = {
      '--p': p,
      '--intro': range(p, 0, .10),
      '--question': range(p, .07, .19),
      '--type-time': range(p, .085, .105),
      '--type-book': range(p, .105, .128),
      '--type-interest': range(p, .128, .153),
      '--layers': range(p, .18, .37),
      '--lift-question': range(p, .185, .225),
      '--lift-context': range(p, .215, .265),
      '--lift-data': range(p, .255, .315),
      '--lift-views': range(p, .295, .355),
      '--views': range(p, .38, .55),
      '--field': range(p, .56, .70),
      '--workset': range(p, .71, .84),
      '--resolve': range(p, .85, .98)
    };
    Object.entries(values).forEach(([key, value]) => root.style.setProperty(key, value.toFixed(4)));
    document.querySelector('.experience').dataset.viewFocus =
      p < .315 ? 'product' : p < .335 ? 'content' : p < .352 ? 'sales' : 'reaction';
    chapter.textContent = p < .18 ? '질문에서 관점까지' : p < .38 ? '01 · 데이터의 층위' : p < .56 ? '02 · 서로 다른 관점' : p < .71 ? '03 · 업무의 질문' : p < .85 ? '04 · 질문에서 탐색으로' : '05 · DATAHUB';
    raf = 0;
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(draw); }, {passive:true});
  addEventListener('resize', draw);
  history.scrollRestoration = 'manual';
  draw();
})();
