import { createCA } from 'https://cdn.jsdelivr.net/gh/distillpub/post--growing-ca@a12c7efa541b5770043a8d5470bffeacfd7b0435/public/ca.js';

const canvas = document.getElementById('nca-canvas');
const loadingEl = document.getElementById('nca-loading');
const statusEl = document.getElementById('nca-status');
const playBtn = document.getElementById('nca-play-btn');
const stepBtn = document.getElementById('nca-step-btn');
const resetBtn = document.getElementById('nca-reset-btn');
const damageBtn = document.getElementById('nca-damage-btn');
const stepValue = document.getElementById('nca-step-value');
const fpsValue = document.getElementById('nca-fps-value');
const modelValue = document.getElementById('nca-model-value');
const targetSelect = document.getElementById('nca-target');
const experimentSelect = document.getElementById('nca-experiment');
const modelNote = document.getElementById('nca-model-note');
const speedRange = document.getElementById('nca-speed');
const speedValue = document.getElementById('nca-speed-value');
const brushRange = document.getElementById('nca-brush');
const brushValue = document.getElementById('nca-brush-value');
const angleRange = document.getElementById('nca-angle');
const angleValue = document.getElementById('nca-angle-value');
const visSelect = document.getElementById('nca-vis-mode');

const MODEL_ROOT = 'https://cdn.jsdelivr.net/gh/distillpub/post--growing-ca@a12c7efa541b5770043a8d5470bffeacfd7b0435/public/webgl_models8';
const GRID_W = 96;
const GRID_H = 96;
const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4];
const SPEED_LABELS = ['0.1×', '0.25×', '0.5×', '1×', '2×', '4×'];
const EXP_LABELS = { ex1: '生长', ex2: '稳定', ex3: '再生' };
const EXP_NOTES = {
  ex1: '生长模型只学习“从 seed 长到目标”。它通常能快速形成图案，但长期运行后可能漂移或退化。',
  ex2: '稳定模型使用状态池训练，使目标图案更接近稳定吸引子，长成后能维持更久。',
  ex3: '再生模型在训练时反复接受随机损伤，因此学到的目标更接近稳定吸引子；挖掉一部分后通常能够重新组织。'
};

let demo = null;
let gl = null;
let running = true;
let loading = true;
let activePointer = false;
let lastGridPoint = null;
let stepBudget = 0;
let lastFrameTime = performance.now();
let lastStatusUpdate = 0;
let loadToken = 0;

function setStatus(text) {
  statusEl.textContent = text || '';
}

function setLoading(text, isError = false) {
  loadingEl.textContent = text;
  loadingEl.classList.toggle('is-error', isError);
  loadingEl.classList.toggle('is-hidden', !text && !isError);
}

function syncControls() {
  playBtn.textContent = running ? '暂停' : '播放';
  playBtn.classList.toggle('is-active', running);
  playBtn.classList.toggle('primary', !running);
  const speedIndex = Number(speedRange.value) || 0;
  speedValue.textContent = SPEED_LABELS[speedIndex];
  brushValue.textContent = `${brushRange.value} cells`;
  angleValue.textContent = `${angleRange.value}°`;
  modelValue.textContent = `${EXP_LABELS[experimentSelect.value]} · ${targetSelect.value}`;
  modelNote.textContent = EXP_NOTES[experimentSelect.value];
}

function canvasToGrid(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = Math.floor((clientX - rect.left) / rect.width * GRID_W);
  const y = Math.floor((clientY - rect.top) / rect.height * GRID_H);
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
  return [x, y];
}

function drawNow() {
  if (!demo || !gl) return;
  globalThis.twgl.bindFramebufferInfo(gl);
  demo.draw(visSelect.value);
}

function updateCounters(force = false) {
  if (!demo) return;
  const now = performance.now();
  if (!force && now - lastStatusUpdate < 120) return;
  lastStatusUpdate = now;
  stepValue.textContent = demo.getStepCount().toLocaleString();
  fpsValue.textContent = demo.fps() ? `${demo.fps()} step/s` : '—';
}

function resetModel() {
  if (!demo) return;
  demo.reset();
  stepBudget = 0;
  updateCounters(true);
  drawNow();
  setStatus('已回到单个中心 seed。继续播放即可重新生长。');
}

function damageAt(x, y, radius = Number(brushRange.value)) {
  if (!demo) return;
  demo.paint(x, y, radius, 'clear');
  drawNow();
}

function plantSeed(x, y) {
  if (!demo) return;
  demo.paint(x, y, 1, 'seed');
  drawNow();
  setStatus(`已在 (${x}, ${y}) 植入一个新 seed。`);
}

async function loadModel() {
  const token = ++loadToken;
  loading = true;
  const experiment = experimentSelect.value;
  const target = targetSelect.value;
  setLoading(`正在载入 ${EXP_LABELS[experiment]}模型 ${target}…`);
  setStatus('');
  syncControls();

  try {
    const url = `${MODEL_ROOT}/${experiment}_${encodeURIComponent(target)}.json`;
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const weights = await response.json();
    if (token !== loadToken) return;

    if (!demo) {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
      if (!gl) throw new Error('当前浏览器不支持 WebGL');
      if (!globalThis.twgl) throw new Error('TWGL 依赖未载入');
      demo = createCA(gl, weights, [GRID_W, GRID_H]);
    } else {
      demo.setWeights(weights);
      demo.reset();
    }

    demo.setAngle(Number(angleRange.value));
    loading = false;
    stepBudget = 0;
    setLoading('');
    updateCounters(true);
    drawNow();
    setStatus(`${EXP_LABELS[experiment]}模型 ${target} 已载入。`);
  } catch (error) {
    console.error(error);
    loading = false;
    setLoading(`模型载入失败：${error.message}`, true);
    setStatus('需要 WebGL，并且浏览器必须能够访问 jsDelivr CDN。');
  }
}

function oneStep() {
  if (!demo || loading) return;
  demo.setAngle(Number(angleRange.value));
  demo.step();
  updateCounters(true);
  drawNow();
}

function randomDamage() {
  if (!demo || loading) return;
  const radius = Number(brushRange.value);
  const margin = Math.min(24, radius + 5);
  const x = margin + Math.random() * (GRID_W - margin * 2);
  const y = margin + Math.random() * (GRID_H - margin * 2);
  damageAt(x, y, radius);
  setStatus(`已造成半径 ${radius} 的随机损伤。继续运行观察恢复。`);
}

canvas.addEventListener('pointerdown', (event) => {
  if (!demo || loading) return;
  const p = canvasToGrid(event.clientX, event.clientY);
  if (!p) return;
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  activePointer = true;
  lastGridPoint = p;
  if (event.shiftKey) plantSeed(p[0], p[1]);
  else damageAt(p[0], p[1]);
});

canvas.addEventListener('pointermove', (event) => {
  if (!activePointer || !demo || loading || event.shiftKey) return;
  const p = canvasToGrid(event.clientX, event.clientY);
  if (!p) return;
  if (lastGridPoint && p[0] === lastGridPoint[0] && p[1] === lastGridPoint[1]) return;
  lastGridPoint = p;
  damageAt(p[0], p[1]);
});

function endPointer() {
  activePointer = false;
  lastGridPoint = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', endPointer);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

playBtn.addEventListener('click', () => {
  running = !running;
  stepBudget = 0;
  syncControls();
  setStatus(running ? '继续运行。' : '已暂停。');
});

stepBtn.addEventListener('click', () => {
  running = false;
  syncControls();
  oneStep();
  setStatus('单步推进 1 次神经元胞更新。');
});

resetBtn.addEventListener('click', resetModel);
damageBtn.addEventListener('click', randomDamage);
targetSelect.addEventListener('change', loadModel);
experimentSelect.addEventListener('change', loadModel);

speedRange.addEventListener('input', () => {
  stepBudget = 0;
  syncControls();
});
brushRange.addEventListener('input', syncControls);
angleRange.addEventListener('input', () => {
  syncControls();
  if (demo) demo.setAngle(Number(angleRange.value));
});
visSelect.addEventListener('change', () => {
  drawNow();
  setStatus(visSelect.value === 'color'
    ? '正在显示最终 RGBA 颜色。'
    : '正在显示网络内部张量的打包纹理。');
});

document.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (event.code === 'Space') {
    event.preventDefault();
    playBtn.click();
  } else if (event.code === 'ArrowRight') {
    event.preventDefault();
    stepBtn.click();
  } else if (event.key.toLowerCase() === 'r') {
    resetBtn.click();
  } else if (event.key.toLowerCase() === 'd') {
    damageBtn.click();
  }
});

function renderLoop(now) {
  const dt = Math.min(100, now - lastFrameTime);
  lastFrameTime = now;

  if (demo && running && !loading && !document.hidden) {
    const speed = SPEEDS[Number(speedRange.value)] || 1;
    stepBudget += speed * (dt / (1000 / 60));
    let steps = Math.min(8, Math.floor(stepBudget));
    stepBudget -= steps;
    while (steps-- > 0) demo.step();
    if (speed >= 1 && stepBudget < 0) stepBudget = 0;
  }

  if (demo && !loading) {
    updateCounters(false);
    drawNow();
  }
  requestAnimationFrame(renderLoop);
}

syncControls();
loadModel();
requestAnimationFrame(renderLoop);
