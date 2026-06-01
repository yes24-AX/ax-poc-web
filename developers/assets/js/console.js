/* YES24 Developers — console.html
   Mock dashboard interactions: reveal key, copy, simulated chart */
(function () {
  'use strict';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function setupRevealAndCopy() {
    $$('.key-row').forEach(function (row) {
      var valEl = row.querySelector('.key-val');
      var revealBtn = row.querySelector('[data-action="reveal"]');
      var copyBtn = row.querySelector('[data-action="copy"]');
      if (!valEl) return;
      var raw = valEl.getAttribute('data-key') || '';
      var masked = raw.slice(0, 14) + '••••••••••••••••' + raw.slice(-4);
      valEl.textContent = masked;
      if (revealBtn) {
        revealBtn.addEventListener('click', function () {
          var shown = valEl.getAttribute('data-shown') === '1';
          if (shown) {
            valEl.textContent = masked;
            valEl.setAttribute('data-shown', '0');
            revealBtn.textContent = '표시';
          } else {
            valEl.textContent = raw;
            valEl.setAttribute('data-shown', '1');
            revealBtn.textContent = '숨김';
          }
        });
      }
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(raw).then(function () {
              copyBtn.textContent = '복사됨';
              setTimeout(function () { copyBtn.textContent = '복사'; }, 1400);
            });
          }
        });
      }
    });
  }

  // Draw a simple SVG mini chart for daily usage
  function drawChart() {
    var svg = $('#usageChart');
    if (!svg) return;
    var w = 720, h = 220;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    // Mock data: last 14 days hourly average
    var data = [820, 940, 1020, 1100, 980, 1230, 1380, 1290, 1410, 1520, 1480, 1610, 1750, 1690];
    var max = Math.max.apply(null, data) * 1.15;
    var padL = 36, padR = 12, padT = 16, padB = 28;
    var W = w - padL - padR;
    var H = h - padT - padB;
    var step = W / (data.length - 1);

    var ns = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // grid lines
    for (var i = 0; i <= 4; i++) {
      var y = padT + (H / 4) * i;
      var line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', padL); line.setAttribute('x2', w - padR);
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('stroke', '#E5E7EB'); line.setAttribute('stroke-dasharray', '3 4');
      svg.appendChild(line);
      var lbl = document.createElementNS(ns, 'text');
      lbl.setAttribute('x', padL - 6);
      lbl.setAttribute('y', y + 4);
      lbl.setAttribute('text-anchor', 'end');
      lbl.setAttribute('font-size', '10');
      lbl.setAttribute('fill', '#9CA3AF');
      lbl.textContent = Math.round(max - (max / 4) * i).toLocaleString();
      svg.appendChild(lbl);
    }

    // area path
    var pts = data.map(function (v, idx) {
      var x = padL + step * idx;
      var y = padT + H - (v / max) * H;
      return [x, y];
    });
    var area = 'M ' + padL + ' ' + (padT + H) + ' ';
    pts.forEach(function (p) { area += 'L ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' '; });
    area += 'L ' + (w - padR) + ' ' + (padT + H) + ' Z';
    var areaEl = document.createElementNS(ns, 'path');
    areaEl.setAttribute('d', area);
    areaEl.setAttribute('fill', 'rgba(14,73,141,0.10)');
    svg.appendChild(areaEl);

    // line
    var line = 'M ' + pts[0][0] + ' ' + pts[0][1] + ' ';
    for (var j = 1; j < pts.length; j++) line += 'L ' + pts[j][0] + ' ' + pts[j][1] + ' ';
    var lineEl = document.createElementNS(ns, 'path');
    lineEl.setAttribute('d', line);
    lineEl.setAttribute('fill', 'none');
    lineEl.setAttribute('stroke', '#0E498D');
    lineEl.setAttribute('stroke-width', '2.5');
    lineEl.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(lineEl);

    // points
    pts.forEach(function (p) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]);
      c.setAttribute('r', '3.2'); c.setAttribute('fill', '#fff');
      c.setAttribute('stroke', '#0E498D'); c.setAttribute('stroke-width', '2');
      svg.appendChild(c);
    });

    // x-axis labels (every 2nd)
    for (var k = 0; k < data.length; k += 2) {
      var t = document.createElementNS(ns, 'text');
      t.setAttribute('x', padL + step * k);
      t.setAttribute('y', h - 8);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', '10');
      t.setAttribute('fill', '#9CA3AF');
      var d = new Date(); d.setDate(d.getDate() - (data.length - 1 - k));
      t.textContent = (d.getMonth() + 1) + '/' + d.getDate();
      svg.appendChild(t);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupRevealAndCopy();
    drawChart();
  });
})();
