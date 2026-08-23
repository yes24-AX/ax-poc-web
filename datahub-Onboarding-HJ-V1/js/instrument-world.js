import { MOTION, PHASES, START_POSES, sampleCamera } from './instrument-config.js?v=1.0.3';

const instances = new WeakMap();
const clamp = value => Math.max(0, Math.min(1, value));

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}

class PrecisionField {
  constructor(canvas, compact) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.compact = compact;
    const random = seeded(42017);
    const count = compact ? MOTION.compactParticleCount : MOTION.particleCount;
    this.marks = Array.from({ length: count }, (_, index) => ({
      angle: random() * Math.PI * 2,
      radius: 0.08 + Math.pow(random(), 0.62) * 1.05,
      depth: random(),
      size: 0.45 + random() * 1.4,
      warm: index % 19 === 0,
      square: index % 5 === 0
    }));
    this.lastProgress = -1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MOTION.maxDpr);
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lastProgress = -1;
  }

  draw(progress) {
    if (Math.abs(progress - this.lastProgress) < 0.00005) return;
    this.lastProgress = progress;
    const ctx = this.context;
    const width = this.width;
    const height = this.height;
    const centerX = width * (0.5 + Math.sin(progress * Math.PI * 1.4) * 0.006);
    const centerY = height * (0.49 + Math.cos(progress * Math.PI * 1.15) * 0.005);
    const far = Math.max(width, height);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 1;

    for (let index = 0; index < 11; index += 1) {
      const phase = ((progress * 2.4 + index / 11) % 1 + 1) % 1;
      const radius = phase * far * 0.76;
      const alpha = (1 - phase) * 0.10;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 0.49, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(93,139,205,${alpha})`;
      ctx.stroke();
    }

    const rayCount = this.compact ? 12 : 24;
    for (let index = 0; index < rayCount; index += 1) {
      const angle = index / rayCount * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * 55, centerY + Math.sin(angle) * 26);
      ctx.lineTo(centerX + Math.cos(angle) * far, centerY + Math.sin(angle) * far * 0.5);
      ctx.strokeStyle = 'rgba(102,132,176,.045)';
      ctx.stroke();
    }

    for (const mark of this.marks) {
      let depth = (mark.depth - progress * 1.72) % 1;
      if (depth < 0) depth += 1;
      const perspective = 1 / (0.16 + depth * 1.5);
      const x = centerX + Math.cos(mark.angle) * mark.radius * width * 0.34 * perspective;
      const y = centerY + Math.sin(mark.angle) * mark.radius * height * 0.28 * perspective;
      if (x < -25 || x > width + 25 || y < -25 || y > height + 25) continue;
      const alpha = Math.min(0.72, 0.08 + (1 - depth) * 0.45);
      const color = mark.warm ? `rgba(210,172,108,${alpha})` : `rgba(111,165,228,${alpha})`;
      const size = Math.max(0.6, mark.size * (1 - depth) * 2.2);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (mark.square) {
        ctx.strokeRect(x - size, y - size, size * 2, size * 2);
      } else {
        ctx.fillRect(x, y, Math.max(0.7, size * 1.8), Math.max(0.6, size * 0.42));
      }
    }

    ctx.beginPath();
    ctx.moveTo(centerX - 25, centerY);
    ctx.lineTo(centerX + 25, centerY);
    ctx.moveTo(centerX, centerY - 12);
    ctx.lineTo(centerX, centerY + 12);
    ctx.strokeStyle = 'rgba(173,202,239,.3)';
    ctx.stroke();
    ctx.restore();
  }
}

class DataInstrument {
  constructor(root) {
    this.root = root;
    this.gsap = window.gsap;
    this.ScrollTrigger = window.ScrollTrigger;
    if (!this.gsap || !this.ScrollTrigger) throw new Error('The Data Instrument requires GSAP and ScrollTrigger');
    this.gsap.registerPlugin(this.ScrollTrigger);
    this.gsap.config({ force3D: true, nullTargetWarn: false, autoSleep: 60 });

    this.pin = this.query('[data-pin]');
    this.viewport = this.query('[data-viewport]');
    this.camera = this.query('[data-camera]');
    this.world = this.query('[data-world]');
    this.canvas = this.query('[data-field]');
    this.records = this.all('[data-record]');
    this.trajectories = this.all('[data-trajectory]');
    this.pulses = this.all('[data-pulse]');
    this.gate = this.query('[data-gate]');
    this.rings = this.all('[data-ring]');
    this.relations = this.all('[data-relation]');
    this.schema = this.query('[data-schema]');
    this.schemaColumns = this.all('.schema-column');
    this.schemaCells = this.all('.schema-cell');
    this.schemaLines = this.all('[data-schema-line]');
    this.analysis = this.query('[data-analysis]');
    this.metrics = this.all('.metric-instrument');
    this.metricDials = this.all('.metric-dial');
    this.trendLine = this.query('[data-trend-line]');
    this.trendArea = this.query('[data-trend-area]');
    this.trendPoints = this.all('[data-trend-points] circle');
    this.reports = this.all('[data-reports] article');
    this.kimi = this.query('[data-kimi]');
    this.dashboard = this.query('[data-dashboard]');
    this.dashboardBlueprint = this.query('[data-dashboard-blueprint]');
    this.dashboardCapture = this.query('[data-dashboard-capture]');
    this.dashboardImage = this.query('[data-dashboard-capture] img');
    this.captureScan = this.query('[data-capture-scan]');
    this.dashboardCta = this.query('[data-dashboard-cta]');
    this.dockReticle = this.query('[data-dock-reticle]');
    this.copies = this.all('[data-copy]');
    this.railSteps = this.all('[data-rail-step]');
    this.progressBar = this.query('[data-progress]');
    this.coordinate = this.query('[data-coordinate]');
    this.phase = this.query('[data-phase]');
    this.scrollCue = this.query('[data-scroll-cue]');
    this.compact = matchMedia(`(max-width:${MOTION.compactBreakpoint}px), (pointer:coarse)`).matches;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.field = new PrecisionField(this.canvas, this.compact);
    this.last = { phase: '', rail: -1, docking: false, docked: false, coordinate: '' };
    this.viewportWidth = innerWidth;
    this.onResize = this.handleResize.bind(this);
  }

  query(selector) {
    const element = this.root.querySelector(selector);
    if (!element) throw new Error(`Missing required element: ${selector}`);
    return element;
  }

  all(selector) { return [...this.root.querySelectorAll(selector)]; }

  init() {
    this.prepare();
    this.render(0);
    addEventListener('resize', this.onResize, { passive: true });
    if (this.reduced) {
      this.showReduced();
      return;
    }
    this.createTimeline();
  }

  preparePath(path) {
    const length = Math.max(1, path.getTotalLength());
    path.dataset.length = String(length);
    this.gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
    return length;
  }

  prepare() {
    const g = this.gsap;
    this.trajectoryLengths = this.trajectories.map(path => this.preparePath(path));
    this.relationLengths = this.relations.map(path => this.preparePath(path));
    this.schemaLineLengths = this.schemaLines.map(path => this.preparePath(path));
    this.trendLength = this.preparePath(this.trendLine);
    this.trendPoints.forEach(point => g.set(point, { scale: 0, transformOrigin: '50% 50%' }));

    const widthFactor = this.compact ? 760 : 960;
    const heightFactor = this.compact ? 520 : 620;
    this.records.forEach((record, index) => {
      const [x, y, z] = START_POSES[index];
      g.set(record, {
        xPercent: -50,
        yPercent: -50,
        x: x * widthFactor,
        y: y * heightFactor,
        z,
        rotationX: (index % 3 - 1) * 2.4,
        rotationY: (index % 2 ? -1 : 1) * (2.8 + index * 0.18),
        scale: this.compact ? 0.8 : 0.9,
        autoAlpha: index > 6 && this.compact ? 0.12 : 0.88
      });
    });

    g.set(this.gate, { z: -2320, scale: 0.62, rotationX: 0, rotationY: 0, autoAlpha: 0 });
    g.set(this.rings, { autoAlpha: 0.08, scale: 0.82, transformOrigin: '50% 50%' });
    g.set(this.schema, { z: -3780, scale: 0.78, rotationY: -2.5, autoAlpha: 0 });
    g.set(this.schemaColumns, { clipPath: 'inset(0 0 100% 0)', autoAlpha: 0.5 });
    g.set(this.schemaCells, { scaleX: 0.55, transformOrigin: '0 50%' });
    g.set(this.analysis, { z: -5050, scale: 0.8, rotationY: 2.2, autoAlpha: 0 });
    g.set(this.metrics, { y: 24, autoAlpha: 0 });
    g.set(this.metricDials, { rotation: -48, scale: 0.72 });
    g.set(this.trendArea, { autoAlpha: 0 });
    g.set(this.reports, { x: 32, autoAlpha: 0 });
    g.set(this.kimi, { xPercent: -50, yPercent: -50, x: this.compact ? 0 : 325, y: -54, scale: 0.9, autoAlpha: 0 });
    g.set(this.dockReticle, { xPercent: -50, yPercent: -50, scale: 0.24, rotation: 0.4, autoAlpha: 0 });
    g.set(this.dashboard, { xPercent: -50, yPercent: -50, scale: 0.055, clipPath: 'circle(2.5% at 50% 50%)', autoAlpha: 0 });
    g.set(this.dashboardCapture, { autoAlpha: 0, clipPath: 'inset(0 100% 0 0)' });
    g.set(this.dashboardImage, { scale: 1.025 });
    g.set(this.captureScan, { xPercent: 0, autoAlpha: 0 });
    g.set(this.dashboardCta, { y: 8, autoAlpha: 0 });
    g.set(this.copies, { y: 24, autoAlpha: 0 });
    g.set(this.copies[0], { y: 0, autoAlpha: 1 });
    g.set(this.scrollCue, { autoAlpha: 1 });

    this.setWorldZ = g.quickSetter(this.world, 'z', 'px');
    this.setCameraX = g.quickSetter(this.camera, 'x', 'px');
    this.setCameraY = g.quickSetter(this.camera, 'y', 'px');
    this.setCameraPitch = g.quickSetter(this.camera, 'rotationX', 'deg');
    this.setCameraYaw = g.quickSetter(this.camera, 'rotationY', 'deg');
    this.setCameraRoll = g.quickSetter(this.camera, 'rotationZ', 'deg');
    this.setProgress = g.quickSetter(this.progressBar, 'scaleX');
  }

  createTimeline() {
    const g = this.gsap;
    const endDistance = () => this.compact
      ? `+=${Math.max(MOTION.compactMinimumScrollPixels, Math.round(innerHeight * MOTION.compactScrollViewports))}`
      : `+=${Math.max(MOTION.minimumScrollPixels, Math.round(innerHeight * MOTION.scrollViewports))}`;
    let timeline;
    timeline = g.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => this.render(timeline.progress()),
      scrollTrigger: {
        id: 'data-instrument-master',
        trigger: this.root,
        start: 'top top',
        end: endDistance,
        pin: this.pin,
        pinSpacing: true,
        scrub: MOTION.scrubSeconds,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    this.timeline = timeline;
    const clock = { progress: 0 };
    timeline.to(clock, { progress: 1, duration: 100 }, 0);

    timeline.to(this.trajectories, { strokeDashoffset: 0, duration: 22, stagger: 0.12 }, 2)
      .to(this.trajectories, { opacity: 0.17, duration: 20 }, 26)
      .to(this.pulses, { autoAlpha: 0.28, duration: 12 }, 31);

    timeline.to(this.records, {
      x: index => (index - 4) * 104,
      y: index => Math.sin(index * 1.7) * 82,
      z: index => -2260 - index * 5,
      rotationX: 0,
      rotationY: 0,
      scale: this.compact ? 0.54 : 0.62,
      autoAlpha: 1,
      duration: 22,
      stagger: 0.06
    }, 8);

    timeline.to(this.gate, { autoAlpha: 1, scale: 0.9, duration: 16 }, 12)
      .to(this.rings, { autoAlpha: 1, scale: 1, duration: 12, stagger: 0.3 }, 14)
      .to(this.rings[0], { rotation: 13, duration: 24 }, 15)
      .to(this.rings[1], { rotation: -18, duration: 24 }, 15)
      .to(this.rings[2], { rotation: 9, duration: 24 }, 15)
      .to(this.relations, { strokeDashoffset: 0, duration: 16, stagger: 0.15 }, 17);

    timeline.to(this.records, {
      x: index => -520 + index * 130,
      y: -44,
      z: index => -3715 - (index % 3) * 6,
      scale: this.compact ? 0.31 : 0.36,
      autoAlpha: 0.78,
      duration: 22,
      stagger: 0.035
    }, 29)
      .to(this.gate, { autoAlpha: 0, scale: 1.18, duration: 14 }, 34)
      .to(this.schema, { autoAlpha: 1, scale: 0.94, rotationY: 0, duration: 17 }, 34)
      .to(this.schemaColumns, { clipPath: 'inset(0 0 0% 0)', autoAlpha: 1, duration: 15, stagger: 0.08 }, 37)
      .to(this.schemaCells, { scaleX: 1, duration: 14, stagger: 0.008 }, 39)
      .to(this.schemaLines, { strokeDashoffset: 0, duration: 17, stagger: 0.025 }, 41);

    timeline.to(this.records, {
      x: index => -475 + (index % 3) * 475,
      y: index => -205 + Math.floor(index / 3) * 194,
      z: index => -4970 - index * 4,
      scale: this.compact ? 0.24 : 0.28,
      autoAlpha: 0.26,
      duration: 19,
      stagger: 0.025
    }, 53)
      .to(this.schema, { autoAlpha: 0, scale: 1.08, duration: 10 }, 55)
      .to(this.analysis, { autoAlpha: 1, scale: 0.95, rotationY: 0, duration: 12 }, 54)
      .to(this.metrics, { y: 0, autoAlpha: 1, duration: 10, stagger: 0.18 }, 58)
      .to(this.metricDials, { rotation: 0, scale: 1, duration: 11, stagger: 0.12 }, 59)
      .to(this.trendLine, { strokeDashoffset: 0, duration: 14 }, 59)
      .to(this.trendArea, { autoAlpha: 1, duration: 11 }, 61)
      .to(this.trendPoints, { scale: 1, duration: 9, stagger: 0.08 }, 61)
      .to(this.reports, { x: 0, autoAlpha: 1, duration: 11, stagger: 0.22 }, 60);

    timeline.to(this.kimi, { autoAlpha: 1, scale: 1, duration: 2.2 }, 68)
      .to(this.kimi, { autoAlpha: 0, x: this.compact ? 22 : 430, scale: 0.84, duration: 1.6 }, 74.4);

    timeline.to(this.records, {
      x: index => [-430, -140, 150, 440, -430, -140, 150, 440, 0][index],
      y: index => index < 4 ? -205 : index < 8 ? 40 : 242,
      z: index => -6340 - index * 2,
      scale: this.compact ? 0.14 : 0.19,
      autoAlpha: 0.42,
      duration: 19,
      stagger: 0.02
    }, 72)
      .to(this.analysis, { autoAlpha: 0, scale: 1.11, duration: 10 }, 73)
      .to(this.dockReticle, { autoAlpha: 1, scale: 0.94, rotation: 0, duration: 11 }, 74)
      .to(this.dashboard, { autoAlpha: 1, duration: 1.5 }, 78)
      .to(this.dashboard, { scale: 1, clipPath: 'circle(100% at 50% 50%)', duration: 16, ease: 'power1.in' }, 79)
      .to(this.dockReticle, { autoAlpha: 0, scale: 1.55, duration: 14 }, 82)
      .to(this.records, { autoAlpha: 0, scale: 0.12, duration: 10, stagger: 0.01 }, 86)
      .to(this.dashboardCapture, { autoAlpha: 1, clipPath: 'inset(0 0% 0 0)', duration: 8 }, 91)
      .to(this.dashboardImage, { scale: 1, duration: 8 }, 91)
      .to(this.captureScan, { autoAlpha: 1, xPercent: 980, duration: 6 }, 91)
      .to(this.dashboardBlueprint, { autoAlpha: 0.03, duration: 6 }, 93)
      .to(this.captureScan, { autoAlpha: 0, duration: 1.5 }, 97.5)
      .to(this.dashboardCta, { autoAlpha: 1, y: 0, duration: 3 }, 96);

    timeline.to(this.copies[0], { autoAlpha: 0, y: -18, duration: 3 }, 14)
      .to(this.copies[1], { autoAlpha: 1, y: 0, duration: 3 }, 18)
      .to(this.copies[1], { autoAlpha: 0, y: -18, duration: 3 }, 30)
      .to(this.copies[2], { autoAlpha: 1, y: 0, duration: 3 }, 35)
      .to(this.copies[2], { autoAlpha: 0, y: -18, duration: 3 }, 49)
      .to(this.copies[3], { autoAlpha: 1, y: 0, duration: 3 }, 54)
      .to(this.copies[3], { autoAlpha: 0, y: -18, duration: 2.5 }, 65.5)
      .to(this.copies[4], { autoAlpha: 1, y: 0, duration: 3 }, 76)
      .to(this.copies[4], { autoAlpha: 0, y: -18, duration: 3 }, 88)
      .to(this.scrollCue, { autoAlpha: 0, duration: 5 }, 72);

    requestAnimationFrame(() => requestAnimationFrame(() => this.ScrollTrigger.refresh()));
  }

  updatePulses(progress) {
    this.pulses.forEach((pulse, index) => {
      const path = this.trajectories[index];
      const length = this.trajectoryLengths[index];
      const local = ((progress * (1.35 + index * 0.035) + index / this.pulses.length) % 1 + 1) % 1;
      const point = path.getPointAtLength(length * local);
      pulse.setAttribute('cx', point.x.toFixed(1));
      pulse.setAttribute('cy', point.y.toFixed(1));
    });
  }

  render(progress) {
    const p = clamp(progress);
    const camera = sampleCamera(p);
    this.setWorldZ?.(MOTION.cameraDepth * p);
    this.setCameraX?.(camera.x);
    this.setCameraY?.(camera.y);
    this.setCameraPitch?.(camera.pitch);
    this.setCameraYaw?.(camera.yaw);
    this.setCameraRoll?.(camera.roll);
    this.setProgress?.(p);
    this.field.draw(p);
    this.updatePulses(p);

    const coordinate = (p * 100).toFixed(1).padStart(5, '0');
    if (coordinate !== this.last.coordinate) {
      this.coordinate.textContent = coordinate;
      this.last.coordinate = coordinate;
    }

    let phaseLabel = PHASES[0][1];
    for (const phase of PHASES) if (p >= phase[0]) phaseLabel = phase[1];
    if (phaseLabel !== this.last.phase) {
      this.phase.textContent = phaseLabel;
      this.last.phase = phaseLabel;
    }

    const rail = p < 0.18 ? 0 : p < 0.38 ? 1 : p < 0.57 ? 2 : p < 0.78 ? 3 : 4;
    if (rail !== this.last.rail) {
      this.railSteps.forEach((step, index) => step.classList.toggle('active', index === rail));
      this.last.rail = rail;
    }

    const docking = p >= 0.76;
    const docked = p >= 0.965;
    if (docking !== this.last.docking) {
      this.root.classList.toggle('is-docking', docking);
      this.last.docking = docking;
    }
    if (docked !== this.last.docked) {
      this.root.classList.toggle('is-docked', docked);
      this.last.docked = docked;
    }
  }

  showReduced() {
    this.root.classList.add('is-reduced', 'is-docked');
    this.gsap.set(this.dashboard, { xPercent: -50, yPercent: -50, scale: 1, autoAlpha: 1, clipPath: 'inset(0)' });
    this.gsap.set(this.dashboardCapture, { autoAlpha: 1, clipPath: 'inset(0)' });
    this.gsap.set(this.dashboardImage, { scale: 1 });
    this.gsap.set(this.dashboardCta, { autoAlpha: 1, y: 0 });
    this.progressBar.style.transform = 'scaleX(1)';
    this.coordinate.textContent = '100.0';
    this.phase.textContent = 'DATAHUB · LIVE WORKSPACE';
  }

  handleResize() {
    const widthChanged = Math.abs(innerWidth - this.viewportWidth) > 2;
    if (this.compact && !widthChanged) return;
    this.viewportWidth = innerWidth;
    this.field.resize();
    requestAnimationFrame(() => requestAnimationFrame(() => this.ScrollTrigger.refresh()));
  }

  destroy() {
    this.timeline?.scrollTrigger?.kill(true);
    this.timeline?.kill();
    this.gsap.killTweensOf(this.root.querySelectorAll('*'));
    removeEventListener('resize', this.onResize);
  }
}

export async function initialize(root) {
  instances.get(root)?.destroy();
  await document.fonts.ready;
  const instance = new DataInstrument(root);
  instances.set(root, instance);
  instance.init();
}

export function destroy(root) {
  instances.get(root)?.destroy();
  instances.delete(root);
}
