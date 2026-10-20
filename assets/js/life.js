(() => {
  'use strict';

  const canvas = document.getElementById('life-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const canvasWrap = document.querySelector('.life-canvas-wrap');

  const playBtn = document.getElementById('play-btn');
  const stepBtn = document.getElementById('step-btn');
  const clearBtn = document.getElementById('clear-btn');
  const randomBtn = document.getElementById('random-btn');
  const centerPatternBtn = document.getElementById('center-pattern-btn');
  const speedRange = document.getElementById('speed-range');
  const speedValue = document.getElementById('speed-value');
  const densityRange = document.getElementById('density-range');
  const densityValue = document.getElementById('density-value');
  const gridSelect = document.getElementById('grid-size');
  const boundarySelect = document.getElementById('boundary-mode');
  const generationEl = document.getElementById('generation-value');
  const populationEl = document.getElementById('population-value');
  const ruleReadout = document.getElementById('rule-readout');
  const statusEl = document.getElementById('life-status');
  const modeEl = document.getElementById('mode-value');

  let cols = 120;
  let rows = 75;
  let grid = new Uint8Array(cols * rows);
  let nextGrid = new Uint8Array(cols * rows);
  let generation = 0;
  let running = false;
  let gps = Number(speedRange.value) || 10;
  let accumulator = 0;
  let lastTime = performance.now();
  let drawWidth = 1;
  let drawHeight = 1;
  let hoverCell = null;
  let pointerDown = false;
  let paintValue = 1;
  let lastPaintIndex = -1;
  let activePattern = null;
  let wrapEdges = boundarySelect.value === 'wrap';
  let birth = new Set([3]);
  let survive = new Set([2, 3]);

  const parsePattern = (rowsText) => {
    const cells = [];
    rowsText.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === 'O' || ch === '1' || ch === '#') cells.push([x, y]);
      });
    });
    return cells;
  };

  const PATTERNS = {
    glider: {
      label: '滑翔机 Glider',
      cells: parsePattern(['.O.', '..O', 'OOO'])
    },
    blinker: {
      label: '闪烁子 Blinker',
      cells: parsePattern(['OOO'])
    },
    lwss: {
      label: '轻型飞船 LWSS',
      cells: parsePattern(['.O..O', 'O....', 'O...O', 'OOOO.'])
    },
    rpentomino: {
      label: 'R-五连块',
      cells: parsePattern(['.OO', 'OO.', '.O.'])
    },
    acorn: {
      label: '橡果 Acorn',
      cells: parsePattern(['.O.....', '...O...', 'OO..OOO'])
    },
    diehard: {
      label: '顽强者 Diehard',
      cells: parsePattern(['......O.', 'OO......', '.O...OOO'])
    },
    pulsar: {
      label: '脉冲星 Pulsar',
      cells: parsePattern([
        '..OOO...OOO..',
        '.............',
        'O....O.O....O',
        'O....O.O....O',
        'O....O.O....O',
        '..OOO...OOO..',
        '.............',
        '..OOO...OOO..',
        'O....O.O....O',
        'O....O.O....O',
        'O....O.O....O',
        '.............',
        '..OOO...OOO..'
      ])
    },
    gun: {
      label: '高斯帕滑翔机枪',
      cells: [
        [0,4],[0,5],[1,4],[1,5],
        [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],
        [14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
        [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],
        [24,0],[24,1],[24,5],[24,6],
        [34,2],[34,3],[35,2],[35,3]
      ]
    }
  };

  const idx = (x, y) => y * cols + x;

  function population() {
    let n = 0;
    for (let i = 0; i < grid.length; i++) n += grid[i];
    return n;
  }

  function updateStats() {
    generationEl.textContent = generation.toLocaleString();
    populationEl.textContent = population().toLocaleString();
  }

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  function updatePlayButton() {
    playBtn.textContent = running ? '暂停' : '播放';
    playBtn.classList.toggle('primary', !running);
    playBtn.classList.toggle('is-active', running);
  }

  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    drawWidth = Math.max(320, rect.width || 900);
    drawHeight = drawWidth * rows / cols;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.height = `${drawHeight}px`;
    canvas.width = Math.round(drawWidth * dpr);
    canvas.height = Math.round(drawHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    render();
  }

  function render() {
    const cellW = drawWidth / cols;
    const cellH = drawHeight / rows;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, drawWidth, drawHeight);

    ctx.fillStyle = '#050505';
    for (let y = 0; y < rows; y++) {
      const offset = y * cols;
      for (let x = 0; x < cols; x++) {
        if (!grid[offset + x]) continue;
        ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW + 0.15), Math.ceil(cellH + 0.15));
      }
    }

    if (Math.min(cellW, cellH) >= 5) {
      ctx.beginPath();
      ctx.strokeStyle = '#e4e4e4';
      ctx.lineWidth = 0.55;
      for (let x = 1; x < cols; x++) {
        const px = x * cellW;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, drawHeight);
      }
      for (let y = 1; y < rows; y++) {
        const py = y * cellH;
        ctx.moveTo(0, py);
        ctx.lineTo(drawWidth, py);
      }
      ctx.stroke();
    }

    if (hoverCell && activePattern) {
      const pattern = PATTERNS[activePattern];
      ctx.save();
      ctx.fillStyle = '#050505';
      ctx.globalAlpha = 0.22;
      pattern.cells.forEach(([dx, dy]) => {
        const x = hoverCell.x + dx;
        const y = hoverCell.y + dy;
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW + 0.15), Math.ceil(cellH + 0.15));
        }
      });
      ctx.restore();
    } else if (hoverCell) {
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        hoverCell.x * cellW + 0.5,
        hoverCell.y * cellH + 0.5,
        Math.max(1, cellW - 1),
        Math.max(1, cellH - 1)
      );
    }
  }

  function neighborCount(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        let ny = y + dy;
        if (wrapEdges) {
          nx = (nx + cols) % cols;
          ny = (ny + rows) % rows;
        } else if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
          continue;
        }
        count += grid[idx(nx, ny)];
      }
    }
    return count;
  }

  function step() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        const n = neighborCount(x, y);
        nextGrid[i] = grid[i] ? (survive.has(n) ? 1 : 0) : (birth.has(n) ? 1 : 0);
      }
    }
    const tmp = grid;
    grid = nextGrid;
    nextGrid = tmp;
    generation++;
    updateStats();
    render();
  }

  function stop() {
    running = false;
    accumulator = 0;
    updatePlayButton();
  }

  function clearBoard() {
    stop();
    grid.fill(0);
    nextGrid.fill(0);
    generation = 0;
    updateStats();
    render();
    setStatus('棋盘已清空。点击或拖动即可绘制活细胞。');
  }

  function randomize() {
    stop();
    const density = Number(densityRange.value) / 100;
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < density ? 1 : 0;
    generation = 0;
    updateStats();
    render();
    setStatus(`已随机填充 ${(density * 100).toFixed(0)}% 的格点。`);
  }

  function patternBounds(cells) {
    let maxX = 0;
    let maxY = 0;
    cells.forEach(([x, y]) => {
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    return { width: maxX + 1, height: maxY + 1 };
  }

  function stampPattern(name, originX, originY, clearFirst = false) {
    const pattern = PATTERNS[name];
    if (!pattern) return;
    if (clearFirst) {
      grid.fill(0);
      nextGrid.fill(0);
      generation = 0;
    }
    pattern.cells.forEach(([dx, dy]) => {
      const x = originX + dx;
      const y = originY + dy;
      if (x >= 0 && x < cols && y >= 0 && y < rows) grid[idx(x, y)] = 1;
    });
    updateStats();
    render();
  }

  function placePatternCentered(name, clearFirst = false) {
    if (!name || !PATTERNS[name]) return;
    const bounds = patternBounds(PATTERNS[name].cells);
    const x = Math.floor((cols - bounds.width) / 2);
    const y = Math.floor((rows - bounds.height) / 2);
    stampPattern(name, x, y, clearFirst);
    setStatus(`${PATTERNS[name].label} 已放置在中央。`);
  }

  function selectPattern(name) {
    activePattern = activePattern === name ? null : name;
    document.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.pattern === activePattern);
    });
    centerPatternBtn.disabled = !activePattern;
    modeEl.textContent = activePattern ? `图案：${PATTERNS[activePattern].label}` : '绘制';
    setStatus(activePattern
      ? `已选择 ${PATTERNS[activePattern].label}：在棋盘上点击即可放置；按 Esc 返回绘制模式。`
      : '绘制模式：左键点击/拖动改变格子，Shift 或右键擦除。');
    render();
  }

  function getCellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / rect.width * cols);
    const y = Math.floor((event.clientY - rect.top) / rect.height * rows);
    if (x < 0 || x >= cols || y < 0 || y >= rows) return null;
    return { x, y };
  }

  function paintCell(cell) {
    if (!cell) return;
    const i = idx(cell.x, cell.y);
    if (i === lastPaintIndex) return;
    grid[i] = paintValue;
    lastPaintIndex = i;
    updateStats();
    render();
  }

  canvas.addEventListener('pointerdown', (event) => {
    const cell = getCellFromEvent(event);
    if (!cell) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    hoverCell = cell;

    if (activePattern && event.button !== 2 && !event.shiftKey) {
      stampPattern(activePattern, cell.x, cell.y, false);
      setStatus(`${PATTERNS[activePattern].label} 已放置。可继续点击放置更多。`);
      return;
    }

    pointerDown = true;
    lastPaintIndex = -1;
    const i = idx(cell.x, cell.y);
    paintValue = (event.button === 2 || event.shiftKey) ? 0 : (grid[i] ? 0 : 1);
    paintCell(cell);
  });

  canvas.addEventListener('pointermove', (event) => {
    hoverCell = getCellFromEvent(event);
    if (pointerDown && !activePattern) paintCell(hoverCell);
    else render();
  });

  const endPointer = () => {
    pointerDown = false;
    lastPaintIndex = -1;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    hoverCell = null;
    endPointer();
    render();
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

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

  centerPatternBtn.addEventListener('click', () => {
    if (!activePattern) return;
    placePatternCentered(activePattern, false);
  });

  speedRange.addEventListener('input', () => {
    gps = Number(speedRange.value);
    speedValue.textContent = `${gps} 代/秒`;
    accumulator = 0;
    if (running) setStatus(`运行中：${gps} 代/秒。`);
  });

  densityRange.addEventListener('input', () => {
    densityValue.textContent = `${densityRange.value}%`;
  });

  gridSelect.addEventListener('change', () => {
    const [newCols, newRows] = gridSelect.value.split('x').map(Number);
    cols = newCols;
    rows = newRows;
    grid = new Uint8Array(cols * rows);
    nextGrid = new Uint8Array(cols * rows);
    generation = 0;
    stop();
    updateStats();
    resizeCanvas();
    setStatus(`棋盘已调整为 ${cols} × ${rows}。`);
  });

  boundarySelect.addEventListener('change', () => {
    wrapEdges = boundarySelect.value === 'wrap';
    setStatus(wrapEdges ? '边界模式：环面。上下、左右边缘彼此连接。' : '边界模式：有限边界。棋盘外视为死细胞。');
  });

  document.querySelectorAll('.pattern-btn').forEach(btn => {
    btn.addEventListener('click', () => selectPattern(btn.dataset.pattern));
  });

  function ruleString() {
    const b = [...birth].sort((a, b) => a - b).join('');
    const s = [...survive].sort((a, b) => a - b).join('');
    return `B${b}/S${s}`;
  }

  function syncRuleUI() {
    ruleReadout.textContent = ruleString();
    document.querySelectorAll('.rule-number').forEach(btn => {
      const n = Number(btn.dataset.n);
      const set = btn.dataset.kind === 'birth' ? birth : survive;
      btn.classList.toggle('is-on', set.has(n));
      btn.setAttribute('aria-pressed', set.has(n) ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.rule-number').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.n);
      const set = btn.dataset.kind === 'birth' ? birth : survive;
      if (set.has(n)) set.delete(n); else set.add(n);
      syncRuleUI();
      setStatus(`规则已修改为 ${ruleString()}。`);
    });
  });

  function parseRule(rule) {
    const match = /^B([0-8]*)\/S([0-8]*)$/i.exec(rule.trim());
    if (!match) return false;
    birth = new Set([...match[1]].map(Number));
    survive = new Set([...match[2]].map(Number));
    syncRuleUI();
    return true;
  }

  document.querySelectorAll('.rule-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      if (parseRule(btn.dataset.rule)) setStatus(`${btn.textContent.trim()}：${ruleString()}。`);
    });
  });

  window.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (event.code === 'Space') {
      event.preventDefault();
      playBtn.click();
    } else if (event.key === '.' || event.key === 'ArrowRight') {
      event.preventDefault();
      stepBtn.click();
    } else if (event.key.toLowerCase() === 'c') {
      clearBoard();
    } else if (event.key.toLowerCase() === 'r') {
      randomize();
    } else if (event.key === 'Escape') {
      if (activePattern) selectPattern(activePattern);
    }
  });

  function animationLoop(now) {
    const elapsed = Math.min(250, now - lastTime);
    lastTime = now;
    if (running) {
      accumulator += elapsed;
      const interval = 1000 / gps;
      let safety = 0;
      while (accumulator >= interval && safety < 12) {
        step();
        accumulator -= interval;
        safety++;
      }
    }
    requestAnimationFrame(animationLoop);
  }

  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(canvasWrap);

  syncRuleUI();
  speedValue.textContent = `${gps} 代/秒`;
  densityValue.textContent = `${densityRange.value}%`;
  updatePlayButton();

  // A recognizable default state: Gosper glider gun, paused for editing.
  placePatternCentered('gun', true);
  modeEl.textContent = '绘制';
  setStatus('默认放置：高斯帕滑翔机枪。可直接播放、清空、随机，或选择其他经典图案。');
  resizeCanvas();
  requestAnimationFrame(animationLoop);
})();
