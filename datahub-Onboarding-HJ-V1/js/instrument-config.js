export const MOTION = Object.freeze({
  cameraDepth: 6480,
  scrollViewports: 10.5,
  minimumScrollPixels: 7800,
  compactScrollViewports: 7,
  compactMinimumScrollPixels: 5200,
  scrubSeconds: 0.18,
  compactBreakpoint: 900,
  particleCount: 240,
  compactParticleCount: 72,
  maxDpr: 1.45
});

export const CAMERA = Object.freeze([
  { p: 0, x: 0, y: 0, yaw: 0, pitch: 0, roll: 0 },
  { p: 0.16, x: -28, y: 12, yaw: 1.1, pitch: -0.35, roll: -0.18 },
  { p: 0.33, x: 14, y: -8, yaw: -0.65, pitch: 0.2, roll: 0.12 },
  { p: 0.50, x: 0, y: 0, yaw: 0, pitch: 0, roll: 0 },
  { p: 0.68, x: 22, y: -10, yaw: -0.9, pitch: 0.28, roll: 0.12 },
  { p: 0.80, x: 0, y: 0, yaw: 0, pitch: 0, roll: 0 },
  { p: 1, x: 0, y: 0, yaw: 0, pitch: 0, roll: 0 }
]);

export const PHASES = Object.freeze([
  [0, 'UNALIGNED INPUT'],
  [0.16, 'REFERENCE CALIBRATION'],
  [0.34, 'RELATION RESOLUTION'],
  [0.50, 'CONNECTED SCHEMA'],
  [0.61, 'ANALYTIC ASSEMBLY'],
  [0.68, 'KIMI · EVIDENCE'],
  [0.76, 'WORKSPACE RESOLVE'],
  [0.92, 'DATAHUB · LIVE WORKSPACE']
]);

export const START_POSES = Object.freeze([
  [-0.38, -0.28, -380], [0.02, -0.37, -540], [0.38, -0.24, -720],
  [-0.45, 0.01, -900], [0.43, 0.04, -1080], [-0.34, 0.28, -1260],
  [0.01, 0.35, -1440], [0.34, 0.28, -1620], [0.30, -0.02, -1800]
]);

export const RECORD_COLORS = Object.freeze([
  '#668cff', '#62c6d9', '#d1a65f', '#62b899', '#7aa8de',
  '#a88bbd', '#8997c8', '#7394b8', '#b99a64'
]);

export function sampleCamera(progress) {
  let index = 0;
  while (index < CAMERA.length - 2 && progress > CAMERA[index + 1].p) index += 1;
  const from = CAMERA[index];
  const to = CAMERA[index + 1];
  const raw = Math.max(0, Math.min(1, (progress - from.p) / Math.max(0.0001, to.p - from.p)));
  const eased = raw * raw * (3 - 2 * raw);
  const mix = key => from[key] + (to[key] - from[key]) * eased;
  return { x: mix('x'), y: mix('y'), yaw: mix('yaw'), pitch: mix('pitch'), roll: mix('roll') };
}
