import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

const html = read('index.html');
const css = read('css/instrument.css');
const world = read('js/instrument-world.js');
const config = read('js/instrument-config.js');
const data = read('js/instrument-data.js');
const bindings = read('js/instrument-bindings.js');
const combined = [html, css, world, config, data, bindings].join('\n');

assert.equal((html.match(/class="data-specimen" data-record/g) || []).length, 9, 'nine persistent business records are required');
assert.equal((world.match(/scrollTrigger\s*:/g) || []).length, 1, 'exactly one ScrollTrigger config is allowed');
assert.match(world, /id:\s*'data-instrument-master'/, 'master trigger must be named');
assert.match(world, /scrub:\s*MOTION\.scrubSeconds/, 'master trigger must use configured scrub smoothing');
assert.match(world, /timeline\.to\(clock,\s*\{ progress: 1, duration: 100 \}, 0\)/, 'one deterministic 0–100 master clock is required');
assert.match(world, /this\.setWorldZ\?\.\(MOTION\.cameraDepth \* p\)/, 'scroll progress must drive camera depth');
assert.match(config, /scrubSeconds:\s*0\.18/, 'approved smooth scrub value must be retained');
assert.match(config, /cameraDepth:\s*6480/, 'continuous forward camera depth must be explicit');
assert.match(config, /compactScrollViewports:\s*7/, 'compact mode must use a shorter journey');
assert.match(world, /this\.kimi, \{ autoAlpha: 1[\s\S]*?\}, 68\)/, 'Kimi must enter at 68%');
assert.match(world, /this\.kimi, \{ autoAlpha: 0[\s\S]*?\}, 74\.4\)/, 'Kimi must leave before 76%');
assert.match(html, /assets\/datahub-dashboard\.png/, 'actual Dashboard capture dock must exist');
assert.match(data, /dataHubUrl:\s*''/, 'DataHub destination must remain configurable');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'reduced motion fallback is required');
assert.match(world, /compactParticleCount/, 'compact rendering path is required');
assert.doesNotMatch(world, /setInterval|requestAnimationFrame\s*\([^)]*draw/i, 'independent animation loops are forbidden');
assert.doesNotMatch(combined, /<video|THREE\.|three\.js/i, 'video and Three.js are not used in this build');

for (const forbidden of ['광화문점', '서울 종로구', '오늘 ₩2,840,000']) {
  assert.equal(combined.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
}

for (const required of ['상품', '주문', '매출', '재고', '회원', '출판사', '저자', '책방', '지역']) {
  assert.equal(data.includes(required), true, `business data missing: ${required}`);
}

console.log('Data Instrument contract: PASS');
