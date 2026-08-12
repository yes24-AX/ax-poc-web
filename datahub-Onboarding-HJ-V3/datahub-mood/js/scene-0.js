const scene = document.querySelector('.scene');
const browser = document.querySelector('.browser');
const message = document.querySelector('.message');
const nextHint = document.querySelector('.next-hint');
const signalScene = document.querySelector('.signal-scene');
const peopleScene = document.querySelector('.people-scene');
const businessScene = document.querySelector('.business-scene');
const datahubScene = document.querySelector('.datahub-scene');
const datahubCapture = document.querySelector('.datahub-ui-capture');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function render() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const scrollUnits = scrollY / innerHeight;
  const sceneOneStart = 1.50;
  const sceneTwoStart = 3.81;
  const sceneThreeStart = 6.42;
  const sceneFourStart = 8.15;
  const progress = clamp(scrollUnits / 1.32);
  const signalProgress = clamp((scrollUnits - sceneOneStart) / 2.16);
  const peopleProgress = clamp(((scrollUnits - sceneTwoStart) / 2.59) * .90, 0, .90);
  const peopleEntry = peopleProgress / .90;
  const businessProgress = clamp(((scrollUnits - sceneThreeStart) / 1.50) * .90, 0, .90);
  const datahubProgress = clamp((scrollUnits - sceneFourStart) / 2.16);
  const flattenProgress = clamp((datahubProgress - .42) / .36);
  const businessNear = Math.min(1, businessProgress / .60);
  const businessWide = clamp((businessProgress - .60) / .30);
  const businessScale = businessProgress <= .60
    ? 1.04 + businessNear * .06
    : 1.10 - businessWide * .17;
  const businessX = businessProgress <= .60
    ? -48 - businessNear * 2
    : -50 + businessWide;
  const businessY = -49 - Math.min(1, businessProgress / .60) * .7;
  document.documentElement.style.setProperty('--progress', progress.toFixed(3));
  document.documentElement.style.setProperty('--signal-progress', signalProgress.toFixed(3));
  document.documentElement.style.setProperty('--signal-shift', `${(-29 - signalProgress * 21).toFixed(2)}%`);
  document.documentElement.style.setProperty('--signal-rotate', `${(4 - signalProgress * 4).toFixed(2)}deg`);
  document.documentElement.style.setProperty('--signal-scale', (.94 - signalProgress * .36).toFixed(3));
  document.documentElement.style.setProperty('--reality-scale', (1.02 - signalProgress * .035).toFixed(3));
  document.documentElement.style.setProperty('--people-progress', peopleProgress.toFixed(3));
  document.documentElement.style.setProperty('--people-entry', peopleEntry.toFixed(3));
  document.documentElement.style.setProperty('--people-monitor-y', `${(-peopleEntry * 52).toFixed(2)}%`);
  document.documentElement.style.setProperty('--people-table-y', `${(104 - peopleEntry * 51).toFixed(2)}%`);
  document.documentElement.style.setProperty('--people-monitor-opacity', clamp(1 - peopleEntry * 2.15).toFixed(3));
  document.documentElement.style.setProperty('--business-progress', businessProgress.toFixed(3));
  document.documentElement.style.setProperty('--business-scale', businessScale.toFixed(3));
  document.documentElement.style.setProperty('--business-x', `${businessX.toFixed(2)}%`);
  document.documentElement.style.setProperty('--business-y', `${businessY.toFixed(2)}%`);
  document.documentElement.style.setProperty('--business-spread', businessWide.toFixed(3));
  document.documentElement.style.setProperty('--scene-four-progress', datahubProgress.toFixed(3));
  document.documentElement.style.setProperty('--flatten-progress', flattenProgress.toFixed(3));

  scene.classList.toggle('started', progress > .025);

  // Each trace belongs to a different service surface. Timing reveals them;
  // there is no connector, numbering, or single-user path between them.
  browser.classList.toggle('show-discovery', progress >= .20);
  browser.classList.toggle('show-content', progress >= .45);
  browser.classList.toggle('show-review', progress >= .68);

  const fieldOn = progress >= .82;
  browser.classList.toggle('reveal-field', fieldOn);
  scene.classList.toggle('field-on', fieldOn);

  const messageOn = progress >= .88;
  scene.classList.toggle('message-on', messageOn);
  message.classList.toggle('show', messageOn);
  nextHint.classList.toggle('show', progress >= .91);

  const signalActive = scrollUnits >= sceneOneStart;
  scene.classList.toggle('scene-one-active', signalActive);
  signalScene.classList.toggle('active', signalActive);
  signalScene.classList.toggle('show-campaign', signalProgress >= .04);
  signalScene.classList.toggle('leave-campaign', signalProgress >= .30);
  signalScene.classList.toggle('show-content-page', signalProgress >= .30);
  signalScene.classList.toggle('show-content', signalProgress >= .34);
  signalScene.classList.toggle('leave-content', signalProgress >= .60);
  signalScene.classList.toggle('show-product-page', signalProgress >= .60);
  signalScene.classList.toggle('show-product', signalProgress >= .64);
  signalScene.classList.toggle('leave-product', signalProgress >= .90);
  signalScene.classList.toggle('service-wide', signalProgress >= .90);
  signalScene.classList.toggle('surfaces-fading', signalProgress >= .90);
  signalScene.classList.toggle('signals-settled', signalProgress >= .92);
  signalScene.classList.toggle('conclusion-on', signalProgress >= .94);

  const peopleActive = peopleProgress > 0;
  scene.classList.toggle('scene-two-active', peopleActive);
  peopleScene.classList.toggle('active', peopleActive);
  peopleScene.classList.toggle('show-mark', peopleProgress >= .22);
  peopleScene.classList.toggle('show-materials', peopleProgress >= .008);
  peopleScene.classList.toggle('show-details', peopleProgress >= .14);
  peopleScene.classList.toggle('show-context', peopleProgress >= .46);
  peopleScene.classList.toggle('show-landscape', peopleProgress >= .72);
  peopleScene.classList.toggle('show-conclusion', peopleProgress >= .80);

  const businessActive = businessProgress > 0;
  scene.classList.toggle('scene-three-active', businessActive);
  businessScene.classList.toggle('active', businessActive);
  businessScene.classList.toggle('show-depth', businessProgress >= .06);
  businessScene.classList.toggle('show-work', businessProgress >= .22);
  businessScene.classList.toggle('focus-surface', businessProgress >= .44);
  businessScene.classList.toggle('business-wide', businessProgress >= .64);
  businessScene.classList.toggle('final-focus', businessProgress >= .82);
  businessScene.classList.toggle('show-conclusion', businessProgress >= .80);
  businessScene.classList.toggle('show-mark', businessProgress >= .88);

  const datahubActive = datahubProgress > 0;
  scene.classList.toggle('scene-four-active', datahubActive);
  scene.classList.toggle('scene-four-questioning', datahubProgress >= .08);
  scene.classList.toggle('scene-four-observing', datahubProgress >= .30);
  scene.classList.toggle('scene-four-flattening', datahubProgress >= .42);
  scene.classList.toggle('scene-four-shell', datahubProgress >= .93);
  datahubScene.classList.toggle('active', datahubActive);
  datahubScene.classList.toggle('show-question', datahubProgress >= .16);
  datahubScene.classList.toggle('observe-data', datahubProgress >= .30);
  datahubScene.classList.toggle('flattening', datahubProgress >= .42);
  datahubScene.classList.toggle('shell-forming', datahubProgress >= .78);
  datahubScene.classList.toggle('shell-complete', datahubProgress >= .93);
  datahubScene.classList.toggle('show-mark', datahubProgress >= .95);
  datahubScene.classList.toggle('show-conclusion', datahubProgress >= .985);
}

addEventListener('scroll', render, { passive: true });
addEventListener('resize', render);
render();

if (datahubCapture) {
  const shell = datahubCapture.closest('.datahub-ui-shell');
  const syncCaptureState = () => shell.classList.toggle('has-capture', datahubCapture.complete && datahubCapture.naturalWidth > 0);
  datahubCapture.addEventListener('load', syncCaptureState);
  datahubCapture.addEventListener('error', syncCaptureState);
  syncCaptureState();
}
