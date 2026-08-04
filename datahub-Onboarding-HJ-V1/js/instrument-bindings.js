import { INSTRUMENT_CONTENT } from './instrument-data.js?v=1.0.3';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attributes = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};

function bindRecords(root, records) {
  const elements = [...root.querySelectorAll('[data-record]')];
  if (elements.length !== records.length) throw new Error(`records: expected ${records.length}, received ${elements.length}`);
  records.forEach((record, index) => {
    const element = elements[index];
    element.dataset.id = record.id;
    element.dataset.kind = record.kind;
    element.style.setProperty('--record-accent', record.accent);
    element.querySelector('.specimen-no').textContent = String(index + 1).padStart(2, '0');
    element.querySelector('.specimen-kind small').textContent = record.code;
    element.querySelector('.specimen-kind b').textContent = record.label;
    element.querySelector('.specimen-value strong').textContent = record.primary;
    element.querySelector('.specimen-value span').textContent = record.secondary;
    element.querySelector('.specimen-value').setAttribute('title', `${record.label} · ${record.primary} · ${record.secondary}`);
  });
}

function bindTrajectories(root, records) {
  const lines = root.querySelector('[data-trajectory-lines]');
  const pulses = root.querySelector('[data-trajectory-pulses]');
  lines.replaceChildren();
  pulses.replaceChildren();
  const starts = [[-80, 154], [30, 304], [-40, 486], [72, 724], [260, 910], [1630, 138], [1710, 310], [1660, 610], [1410, 936]];
  records.forEach((record, index) => {
    const [x, y] = starts[index];
    const endX = 800 + (index - 4) * 10;
    const endY = 450 + (index % 3 - 1) * 18;
    const controlX = index < 5 ? 420 + index * 38 : 1180 - (index - 5) * 44;
    const path = svg('path', {
      d: `M${x} ${y} C${controlX} ${y - 80 + index * 18} ${endX - (index < 5 ? 190 : -190)} ${endY + (index - 4) * 22} ${endX} ${endY}`,
      class: index === 2 || index === 8 ? 'trajectory-gold' : '',
      'data-trajectory': '',
      style: `--trajectory:${record.accent}`
    });
    lines.append(path);
    const pulse = svg('circle', { r: index % 3 === 0 ? 3.2 : 2.2, class: 'trajectory-pulse', 'data-pulse': '' });
    pulse.style.setProperty('--pulse', record.accent);
    pulses.append(pulse);
  });
}

function bindRelations(root, records) {
  const group = root.querySelector('[data-relation-paths]');
  group.replaceChildren();
  records.forEach((record, index) => {
    const angle = (-148 + index * 37) * Math.PI / 180;
    const sx = 500 + Math.cos(angle) * 470;
    const sy = 500 + Math.sin(angle) * 470;
    const mx = 500 + Math.cos(angle) * (260 + (index % 3) * 22);
    const my = 500 + Math.sin(angle) * (260 + (index % 3) * 22);
    const ex = 500 + Math.cos(angle) * 106;
    const ey = 500 + Math.sin(angle) * 106;
    const path = svg('path', {
      d: `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
      style: `--relation:${record.accent}`,
      'data-relation': ''
    });
    group.append(path);
  });
}

function bindSchema(root, records, rows) {
  const columns = root.querySelector('[data-schema-columns]');
  columns.replaceChildren(...records.map((record, recordIndex) => {
    const column = document.createElement('article');
    column.className = 'schema-column';
    column.style.setProperty('--column-accent', record.accent);
    column.innerHTML = `<header><small>${String(recordIndex + 1).padStart(2, '0')}</small><b>${record.label}</b><span>${record.code}</span></header>`;
    rows.forEach((row, rowIndex) => {
      const cell = document.createElement('i');
      cell.className = `schema-cell state-${(recordIndex + rowIndex) % 3}`;
      cell.innerHTML = `<span>${row}</span><b>${(17 + recordIndex * 11 + rowIndex * 7).toString(16).toUpperCase().padStart(2, '0')}</b>`;
      column.append(cell);
    });
    return column;
  }));

  const lineGroup = root.querySelector('[data-schema-lines]');
  lineGroup.replaceChildren();
  for (let index = 0; index < 18; index += 1) {
    const source = index % records.length;
    const target = (index * 5 + 3) % records.length;
    const x1 = 70 + source * 140;
    const x2 = 70 + target * 140;
    const y1 = 125 + (index % 6) * 63;
    const y2 = 125 + ((index * 3 + 2) % 6) * 63;
    const control = (x1 + x2) / 2;
    lineGroup.append(svg('path', {
      d: `M${x1} ${y1} C${control} ${y1} ${control} ${y2} ${x2} ${y2}`,
      style: `--schema-line:${records[source].accent}`,
      'data-schema-line': ''
    }));
  }
}

function bindMetrics(root, metrics) {
  const container = root.querySelector('[data-metrics]');
  container.replaceChildren(...metrics.map((metric, index) => {
    const article = document.createElement('article');
    article.className = 'metric-instrument';
    article.style.cssText = `--metric-accent:${metric.accent};--metric-level:${metric.level * 360}deg`;
    article.innerHTML = `<div class="metric-dial"><i></i><span>${String(index + 1).padStart(2, '0')}</span></div><div><small>${metric.label}</small><strong>${metric.value}</strong><span>${metric.unit}</span></div>`;
    return article;
  }));
}

function trendPoints(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values.map((value, index) => ({ x: 24 + index * 872 / Math.max(1, values.length - 1), y: 270 - (value - min) / range * 210 }));
}

function bindTrend(root, trend) {
  const points = trendPoints(trend.values);
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  root.querySelector('[data-trend-value]').textContent = trend.value;
  root.querySelector('[data-trend-line]').setAttribute('d', line);
  root.querySelector('[data-trend-area]').setAttribute('d', `${line} L896 294 L24 294 Z`);
  root.querySelector('[data-trend-points]').replaceChildren(...points.map(point => svg('circle', { cx: point.x, cy: point.y, r: 3 })));
}

function bindReports(root, reports) {
  root.querySelector('[data-reports]').replaceChildren(...reports.map(report => {
    const article = document.createElement('article');
    article.innerHTML = `<small>${report.code}</small><strong>${report.label}</strong><span>${report.meta}</span><i></i>`;
    return article;
  }));
}

function bindDashboard(root, dashboard) {
  root.querySelector('[data-blueprint-metrics]').replaceChildren(...dashboard.metrics.map(metric => {
    const article = document.createElement('article');
    article.innerHTML = `<small>${metric.label}</small><strong>${metric.value}</strong><i></i>`;
    return article;
  }));
  root.querySelector('[data-blueprint-line]').setAttribute('d', 'M10 94 L58 78 L106 83 L154 55 L202 61 L250 32 L310 20');
  const link = root.querySelector('[data-datahub-link]');
  link.href = dashboard.dataHubUrl || '#datahub-dashboard';
  link.toggleAttribute('aria-disabled', !dashboard.dataHubUrl);
}

export function bindInstrumentContent(root, content = INSTRUMENT_CONTENT) {
  if (!root) throw new Error('The Data Instrument root is required');
  bindRecords(root, content.records);
  bindTrajectories(root, content.records);
  bindRelations(root, content.records);
  bindSchema(root, content.records, content.schemaRows);
  bindMetrics(root, content.metrics);
  bindTrend(root, content.trend);
  bindReports(root, content.reports);
  bindDashboard(root, content.dashboard);
  root.querySelector('[data-kimi-copy]').textContent = content.kimi.copy;
  root.querySelector('[data-kimi-sources]').textContent = content.kimi.sources;
  root.querySelector('[data-connected-count]').textContent = String(content.records.length).padStart(2, '0');
  window.__DATAHUB_INSTRUMENT_CONTENT__ = content;
}
