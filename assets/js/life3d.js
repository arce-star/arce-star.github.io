import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const view = document.getElementById('life3d-view');
const playBtn = document.getElementById('play-btn');
const stepBtn = document.getElementById('step-btn');
const clearBtn = document.getElementById('clear-btn');
const randomBtn = document.getElementById('random-btn');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');
const densityRange = document.getElementById('density-range');
const densityValue = document.getElementById('density-value');
const gridSizeSelect = document.getElementById('grid-size');
const boundarySelect = document.getElementById('boundary-mode');
const opacityRange = document.getElementById('opacity-range');
const opacityValue = document.getElementById('opacity-value');
const layerRange = document.getElementById('layer-range');
const layerValue = document.getElementById('layer-value');
const editSliceToggle = document.getElementById('edit-slice-toggle');
const autoRotateToggle = document.getElementById('auto-rotate-toggle');
const generationEl = document.getElementById('generation-value');
const populationEl = document.getElementById('population-value');
const ruleReadout = document.getElementById('rule-readout');
const statusEl = document.getElementById('life-status');
const modeEl = document.getElementById('mode-value');
const birthContainer = document.getElementById('birth-rule-numbers');
const surviveContainer = document.getElementById('survive-rule-numbers');
const sliceLabel = document.getElementById('slice-label');

let size = Number(gridSizeSelect.value) || 20;
let grid = new Uint8Array(size ** 3);
let nextGrid = new Uint8Array(size ** 3);
let generation = 0;
let running = false;
let gps = Number(speedRange.value) || 8;
let density = Number(densityRange.value) / 100 || 0.1;
let wrapEdges = boundarySelect.value === 'wrap';
let selectedLayer = Math.floor(size / 2);
let birth = new Set([6]);
let survive = new Set([5, 6, 7]);
let accumulator = 0;
let lastTime = performance.now();
let autoRotate = autoRotateToggle.checked;
let editSlice = editSliceToggle.checked;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0xbdbdbd, 1.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
keyLight.position.set(7, 10, 12);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-10, -4, -7);
scene.add(fillLight);

let cellMesh = null;
let boxLines = null;
let slicePlane = null;
let sliceGrid = null;
let cubeGeometry = null;
let cubeMaterial = null;

const matrixDummy = new THREE.Object3D();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

let yaw = Math.PI / 4;
let pitch = 1.02;
let distance = size * 1.85;
let pointerDown = false;
let pointerDragged = false;
let pointerStartX = 0;
let pointerStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const index3 = (x, y, z) => x + y * size + z * size * size;

function population() {
  let count = 0;
  for (let i = 0; i < grid.length; i++) count += grid[i];
  return count;
}

function setStatus(text) {
  statusEl.textContent = text || '';
}

function updateStats() {
  generationEl.textContent = generation.toLocaleString();
  populationEl.textContent = population().toLocaleString();
  modeEl.textContent = editSlice ? `切片编辑 Z=${selectedLayer}` : '观察';
  sliceLabel.textContent = `编辑层 Z = ${selectedLayer}`;
}

function formatRule(set) {
  return [...set].sort((a, b) => a - b).join(',');
}

function updateRuleUI() {
  ruleReadout.textContent = `B{${formatRule(birth)}}/S{${formatRule(survive)}}`;
  document.querySelectorAll('.rule-number-3d').forEach((btn) => {
    const n = Number(btn.dataset.n);
    const set = btn.dataset.kind === 'birth' ? birth : survive;
    btn.classList.toggle('is-on', set.has(n));
  });
}

function buildRuleButtons(container, kind) {
  container.innerHTML = '';
  for (let n = 0; n <= 26; n++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rule-number rule-number-3d';
    btn.dataset.kind = kind;
    btn.dataset.n = String(n);
    btn.textContent = String(n);
    btn.title = `${kind === 'birth' ? 'Birth' : 'Survival'} with ${n} neighbors`;
    btn.addEventListener('click', () => {
      const target = kind === 'birth' ? birth : survive;
      if (target.has(n)) target.delete(n); else target.add(n);
      updateRuleUI();
      setStatus(`规则已更新为 ${ruleReadout.textContent}。`);
    });
    container.appendChild(btn);
  }
}

function disposeObject(obj) {
  if (!obj) return;
  scene.remove(obj);
  obj.geometry?.dispose?.();
  if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
  else obj.material?.dispose?.();
}

function makeSliceGridGeometry(n) {
  const vertices = [];
  const min = -n / 2;
  const max = n / 2;
  for (let i = 0; i <= n; i++) {
    const p = min + i;
    vertices.push(p, min, 0, p, max, 0);
    vertices.push(min, p, 0, max, p, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function rebuildSceneObjects() {
  disposeObject(cellMesh);
  disposeObject(boxLines);
  disposeObject(slicePlane);
  disposeObject(sliceGrid);
  cubeGeometry?.dispose?.();
  cubeMaterial?.dispose?.();

  cubeGeometry = new THREE.BoxGeometry(0.82, 0.82, 0.82);
  cubeMaterial = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.72,
    metalness: 0,
    transparent: true,
    opacity: Number(opacityRange.value) / 100,
    depthWrite: Number(opacityRange.value) >= 62
  });
  cellMesh = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, size ** 3);
  cellMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cellMesh.count = 0;
  scene.add(cellMesh);

  const boxGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
  const boxMaterial = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.72 });
  boxLines = new THREE.LineSegments(boxGeometry, boxMaterial);
  scene.add(boxLines);

  const planeGeometry = new THREE.PlaneGeometry(size, size);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: editSlice ? 0.055 : 0,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  slicePlane = new THREE.Mesh(planeGeometry, planeMaterial);
  scene.add(slicePlane);

  const gridGeometry = makeSliceGridGeometry(size);
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xa8a8a8,
    transparent: true,
    opacity: editSlice ? 0.42 : 0,
    depthWrite: false
  });
  sliceGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
  scene.add(sliceGrid);

  updateSliceObjects();
  updateInstances();
}

function updateSliceObjects() {
  const z = selectedLayer - (size - 1) / 2;
  if (slicePlane) {
    slicePlane.position.z = z;
    slicePlane.visible = editSlice;
    slicePlane.material.opacity = editSlice ? 0.055 : 0;
  }
  if (sliceGrid) {
    sliceGrid.position.z = z + 0.006;
    sliceGrid.visible = editSlice;
    sliceGrid.material.opacity = editSlice ? 0.42 : 0;
  }
  updateStats();
}

function updateInstances() {
  if (!cellMesh) return;
  const center = (size - 1) / 2;
  let instance = 0;
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!grid[index3(x, y, z)]) continue;
        matrixDummy.position.set(x - center, y - center, z - center);
        matrixDummy.rotation.set(0, 0, 0);
        matrixDummy.scale.setScalar(1);
        matrixDummy.updateMatrix();
        cellMesh.setMatrixAt(instance++, matrixDummy.matrix);
      }
    }
  }
  cellMesh.count = instance;
  cellMesh.instanceMatrix.needsUpdate = true;
  updateStats();
}

function setCameraPreset(name) {
  if (name === 'front') {
    yaw = Math.PI / 2;
    pitch = Math.PI / 2;
  } else if (name === 'top') {
    yaw = Math.PI / 4;
    pitch = 0.08;
  } else {
    yaw = Math.PI / 4;
    pitch = 1.02;
  }
  distance = Math.max(size * 1.72, 20);
  updateCamera();
}

function updateCamera() {
  pitch = clamp(pitch, 0.08, Math.PI - 0.08);
  distance = clamp(distance, Math.max(8, size * 0.72), size * 4.5);
  const sinPitch = Math.sin(pitch);
  camera.position.set(
    distance * sinPitch * Math.cos(yaw),
    distance * Math.cos(pitch),
    distance * sinPitch * Math.sin(yaw)
  );
  camera.lookAt(0, 0, 0);
}

function resizeRenderer() {
  const rect = view.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(360, Math.round(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function neighborCount(x, y, z) {
  let count = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        let nz = z + dz;
        if (wrapEdges) {
          nx = (nx + size) % size;
          ny = (ny + size) % size;
          nz = (nz + size) % size;
        } else if (nx < 0 || nx >= size || ny < 0 || ny >= size || nz < 0 || nz >= size) {
          continue;
        }
        count += grid[index3(nx, ny, nz)];
      }
    }
  }
  return count;
}

function step() {
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = index3(x, y, z);
        const neighbors = neighborCount(x, y, z);
        nextGrid[i] = grid[i] ? (survive.has(neighbors) ? 1 : 0) : (birth.has(neighbors) ? 1 : 0);
      }
    }
  }
  const tmp = grid;
  grid = nextGrid;
  nextGrid = tmp;
  generation++;
  updateInstances();
}

function stop() {
  running = false;
  accumulator = 0;
  updatePlayButton();
}

function updatePlayButton() {
  playBtn.textContent = running ? '暂停' : '播放';
  playBtn.classList.toggle('primary', !running);
  playBtn.classList.toggle('is-active', running);
}

function clearBoard() {
  stop();
  grid.fill(0);
  nextGrid.fill(0);
  generation = 0;
  updateInstances();
  setStatus('空间已清空。开启切片编辑后，点击网格即可逐格修改。');
}

function randomize() {
  stop();
  density = Number(densityRange.value) / 100;
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < density ? 1 : 0;
  generation = 0;
  updateInstances();
  setStatus(`已随机填充 ${(density * 100).toFixed(0)}% 的体素。`);
}

function setCell(x, y, z, value = 1) {
  if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) return;
  grid[index3(x, y, z)] = value;
}

function applySeed(name) {
  stop();
  grid.fill(0);
  nextGrid.fill(0);
  generation = 0;
  const c = Math.floor(size / 2);
  const add = (dx, dy, dz) => setCell(c + dx, c + dy, c + dz, 1);

  if (name === 'cross') {
    [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(([x,y,z]) => add(x,y,z));
  } else if (name === 'cube') {
    for (let z = 0; z <= 1; z++) for (let y = 0; y <= 1; y++) for (let x = 0; x <= 1; x++) add(x, y, z);
  } else if (name === 'shell') {
    const r = 2;
    for (let z = -r; z <= r; z++) {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === r) add(x, y, z);
        }
      }
    }
  } else if (name === 'sphere') {
    const r2 = 2.55 ** 2;
    for (let z = -3; z <= 3; z++) {
      for (let y = -3; y <= 3; y++) {
        for (let x = -3; x <= 3; x++) {
          const d2 = x*x + y*y + z*z;
          if (d2 <= r2 && d2 >= 1.2) add(x, y, z);
        }
      }
    }
  } else if (name === 'glider-slice') {
    [[0,-1,0],[1,0,0],[-1,1,0],[0,1,0],[1,1,0]].forEach(([x,y,z]) => add(x,y,z));
  } else if (name === 'lattice') {
    for (let z = -2; z <= 2; z++) {
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          if ((x + y + z) % 2 === 0) add(x, y, z);
        }
      }
    }
  }

  updateInstances();
  setStatus(`已载入 3D 种子：${document.querySelector(`[data-seed="${name}"]`)?.textContent.trim() || name}。`);
}

function pickSliceCell(event) {
  if (!editSlice || !slicePlane) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hit = raycaster.intersectObject(slicePlane, false)[0];
  if (!hit) return null;
  const x = Math.floor(hit.point.x + size / 2);
  const y = Math.floor(hit.point.y + size / 2);
  if (x < 0 || x >= size || y < 0 || y >= size) return null;
  return { x, y, z: selectedLayer };
}

function toggleCellFromPointer(event) {
  const cell = pickSliceCell(event);
  if (!cell) return;
  const i = index3(cell.x, cell.y, cell.z);
  grid[i] = grid[i] ? 0 : 1;
  updateInstances();
  setStatus(`已${grid[i] ? '激活' : '清除'}体素 (${cell.x}, ${cell.y}, ${cell.z})。`);
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  pointerDown = true;
  pointerDragged = false;
  pointerStartX = lastPointerX = event.clientX;
  pointerStartY = lastPointerY = event.clientY;
  renderer.domElement.setPointerCapture?.(event.pointerId);
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!pointerDown) return;
  const totalDx = event.clientX - pointerStartX;
  const totalDy = event.clientY - pointerStartY;
  if (Math.hypot(totalDx, totalDy) > 4) pointerDragged = true;
  if (!pointerDragged) return;
  const dx = event.clientX - lastPointerX;
  const dy = event.clientY - lastPointerY;
  yaw -= dx * 0.008;
  pitch = clamp(pitch + dy * 0.008, 0.08, Math.PI - 0.08);
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  updateCamera();
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  pointerDown = false;
  if (!pointerDragged) toggleCellFromPointer(event);
});
renderer.domElement.addEventListener('pointercancel', () => { pointerDown = false; });
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  distance *= Math.exp(event.deltaY * 0.0012);
  updateCamera();
}, { passive: false });

playBtn.addEventListener('click', () => {
  running = !running;
  accumulator = 0;
  updatePlayButton();
  setStatus(running ? `运行中：${gps} 代/秒。` : '已暂停。');
});
stepBtn.addEventListener('click', () => {
  stop();
  step();
  setStatus('单步推进 1 代。');
});
clearBtn.addEventListener('click', clearBoard);
randomBtn.addEventListener('click', randomize);

speedRange.addEventListener('input', () => {
  gps = Number(speedRange.value);
  speedValue.textContent = `${gps} 代/秒`;
  accumulator = 0;
});
densityRange.addEventListener('input', () => {
  density = Number(densityRange.value) / 100;
  densityValue.textContent = `${densityRange.value}%`;
});
opacityRange.addEventListener('input', () => {
  const opacity = Number(opacityRange.value) / 100;
  opacityValue.textContent = `${opacityRange.value}%`;
  if (cubeMaterial) {
    cubeMaterial.opacity = opacity;
    cubeMaterial.depthWrite = opacity >= 0.62;
    cubeMaterial.needsUpdate = true;
  }
});

layerRange.addEventListener('input', () => {
  selectedLayer = Number(layerRange.value);
  layerValue.textContent = String(selectedLayer);
  updateSliceObjects();
});

editSliceToggle.addEventListener('change', () => {
  editSlice = editSliceToggle.checked;
  updateSliceObjects();
  setStatus(editSlice ? '切片编辑已开启：短按网格切换体素，拖动仍用于旋转。' : '切片编辑已关闭：当前为纯观察模式。');
});
autoRotateToggle.addEventListener('change', () => {
  autoRotate = autoRotateToggle.checked;
});

boundarySelect.addEventListener('change', () => {
  wrapEdges = boundarySelect.value === 'wrap';
  setStatus(wrapEdges ? '边界设为三维环面：六个面首尾相接。' : '边界设为有限空间：超出立方体的邻居忽略。');
});

gridSizeSelect.addEventListener('change', () => {
  stop();
  size = Number(gridSizeSelect.value);
  grid = new Uint8Array(size ** 3);
  nextGrid = new Uint8Array(size ** 3);
  generation = 0;
  selectedLayer = Math.floor(size / 2);
  layerRange.max = String(size - 1);
  layerRange.value = String(selectedLayer);
  layerValue.textContent = String(selectedLayer);
  distance = size * 1.85;
  rebuildSceneObjects();
  setCameraPreset('iso');
  applySeed('cross');
  setStatus(`空间尺寸已切换为 ${size}³。`);
});

document.querySelectorAll('[data-seed]').forEach((btn) => {
  btn.addEventListener('click', () => applySeed(btn.dataset.seed));
});

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => setCameraPreset(btn.dataset.view));
});

document.querySelectorAll('.rule-preset-3d').forEach((btn) => {
  btn.addEventListener('click', () => {
    birth = new Set((btn.dataset.birth || '').split(',').filter(Boolean).map(Number));
    survive = new Set((btn.dataset.survive || '').split(',').filter(Boolean).map(Number));
    updateRuleUI();
    setStatus(`规则已切换为 ${ruleReadout.textContent}。`);
  });
});

window.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
  if (event.code === 'Space') {
    event.preventDefault();
    playBtn.click();
  } else if (event.code === 'ArrowRight') {
    event.preventDefault();
    stepBtn.click();
  } else if (event.key.toLowerCase() === 'r') {
    randomBtn.click();
  } else if (event.key.toLowerCase() === 'c') {
    clearBtn.click();
  }
});

function animate(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;

  if (autoRotate && !pointerDown) {
    yaw += dt * 0.22;
    updateCamera();
  }

  if (running) {
    accumulator += dt;
    const interval = 1 / gps;
    let steps = 0;
    while (accumulator >= interval && steps < 4) {
      step();
      accumulator -= interval;
      steps++;
    }
    if (steps === 4) accumulator = 0;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

buildRuleButtons(birthContainer, 'birth');
buildRuleButtons(surviveContainer, 'survive');
updateRuleUI();
layerRange.max = String(size - 1);
layerRange.value = String(selectedLayer);
layerValue.textContent = String(selectedLayer);
speedValue.textContent = `${gps} 代/秒`;
densityValue.textContent = `${densityRange.value}%`;
opacityValue.textContent = `${opacityRange.value}%`;
rebuildSceneObjects();
setCameraPreset('iso');
applySeed('sphere');
updatePlayButton();
updateSliceObjects();
resizeRenderer();
setStatus('3D 模式已就绪：拖动旋转，滚轮缩放，短按当前 Z 切片切换体素。');

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(view);
requestAnimationFrame(animate);
