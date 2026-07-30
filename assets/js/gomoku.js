(() => {
  "use strict";

  const BOARD_SIZE = 9;
  const ACTION_SIZE = 81;
  const MODEL_URL = "/assets/models/gomoku-9x9-iter21.onnx";
  const WASM_PATH = "/assets/vendor/";

  const boardElement = document.getElementById("board");
  const statusElement = document.getElementById("status");
  const sideElement = document.getElementById("human-side");
  const modeElement = document.getElementById("ai-mode");
  const newGameButton = document.getElementById("new-game");

  let session = null;
  let board = new Int8Array(ACTION_SIZE);
  let currentPlayer = 1;
  let humanPlayer = 1;
  let aiMode = "heuristic";            // "heuristic" | "onnx"
  let lastAction = -1;
  let gameOver = false;
  let aiThinking = false;
  let heuristicAi = null;
  let onnxLoadStarted = false;          // prevent parallel loads
  let onnxLoading = false;

  ort.env.wasm.wasmPaths = WASM_PATH;
  ort.env.wasm.numThreads = 1;

  // -------------------------------------------------------------------
  // Board helpers
  // -------------------------------------------------------------------

  function rowOf(action) {
    return Math.floor(action / BOARD_SIZE);
  }

  function colOf(action) {
    return action % BOARD_SIZE;
  }

  function coordinate(action) {
    return (
      String.fromCharCode(65 + colOf(action)) +
      String(rowOf(action) + 1)
    );
  }

  function playerName(player) {
    return player === 1 ? "黑棋" : "白棋";
  }

  // -------------------------------------------------------------------
  // DOM helpers
  // -------------------------------------------------------------------

  function createBoard() {
    boardElement.textContent = "";

    for (let action = 0; action < ACTION_SIZE; action += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "gomoku-cell";
      cell.dataset.action = String(action);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", coordinate(action));
      cell.addEventListener("click", handleHumanMove);
      boardElement.appendChild(cell);
    }
  }

  function render() {
    const cells = boardElement.children;

    for (let action = 0; action < ACTION_SIZE; action += 1) {
      const cell = cells[action];
      const player = board[action];
      cell.textContent = "";

      if (player !== 0) {
        const stone = document.createElement("span");
        stone.className =
          "stone " +
          (player === 1 ? "black" : "white") +
          (action === lastAction ? " last" : "");
        cell.appendChild(stone);
      }

      // Disable cells when game is over, AI is thinking, or not human's turn.
      // In heuristic mode we do NOT require `session` to be loaded.
      let disabled = gameOver || aiThinking || currentPlayer !== humanPlayer;
      if (!disabled) {
        disabled = player !== 0;
      }
      // ONNX mode without session: keep board disabled until model loads
      if (aiMode === "onnx" && !session) {
        disabled = true;
      }
      cell.disabled = disabled;
    }
  }

  // -------------------------------------------------------------------
  // Win detection (mirrors GomokuGame.winner)
  // -------------------------------------------------------------------

  function findWinner(action, player) {
    const row = rowOf(action);
    const col = colOf(action);
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [deltaRow, deltaCol] of directions) {
      let count = 1;

      for (const sign of [-1, 1]) {
        let checkRow = row + sign * deltaRow;
        let checkCol = col + sign * deltaCol;

        while (
          checkRow >= 0 &&
          checkRow < BOARD_SIZE &&
          checkCol >= 0 &&
          checkCol < BOARD_SIZE &&
          board[checkRow * BOARD_SIZE + checkCol] === player
        ) {
          count += 1;
          checkRow += sign * deltaRow;
          checkCol += sign * deltaCol;
        }
      }

      if (count >= 5) {
        return player;
      }
    }

    return 0;
  }

  // -------------------------------------------------------------------
  // Game state
  // -------------------------------------------------------------------

  function placeStone(action, player) {
    board[action] = player;
    lastAction = action;

    const winner = findWinner(action, player);

    if (winner !== 0) {
      gameOver = true;
      statusElement.textContent = playerName(winner) + "获胜";
    } else if (board.every((value) => value !== 0)) {
      gameOver = true;
      statusElement.textContent = "和棋";
    } else {
      currentPlayer = -currentPlayer;
    }

    render();
  }

  // -------------------------------------------------------------------
  // State encoding (ONNX mode only)
  // -------------------------------------------------------------------

  function encodeState() {
    const values = new Float32Array(3 * ACTION_SIZE);

    for (let action = 0; action < ACTION_SIZE; action += 1) {
      if (board[action] === currentPlayer) {
        values[action] = 1;
      } else if (board[action] === -currentPlayer) {
        values[ACTION_SIZE + action] = 1;
      }

      if (currentPlayer === 1) {
        values[2 * ACTION_SIZE + action] = 1;
      }
    }

    return new ort.Tensor("float32", values, [
      1,
      3,
      BOARD_SIZE,
      BOARD_SIZE,
    ]);
  }

  // -------------------------------------------------------------------
  // ONNX AI
  // -------------------------------------------------------------------

  async function chooseOnnxAction() {
    const outputs = await session.run({
      states: encodeState(),
    });
    const logits = outputs.policy_logits.data;
    let bestAction = -1;
    let bestLogit = -Infinity;

    for (let action = 0; action < ACTION_SIZE; action += 1) {
      if (board[action] === 0 && logits[action] > bestLogit) {
        bestLogit = logits[action];
        bestAction = action;
      }
    }

    if (bestAction < 0) {
      throw new Error("没有可用的合法动作");
    }

    return bestAction;
  }

  // -------------------------------------------------------------------
  // Heuristic AI
  // -------------------------------------------------------------------

  function ensureHeuristicAi() {
    if (!heuristicAi) {
      if (typeof HeuristicAi === "undefined") {
        throw new Error("HeuristicAi 模块未加载");
      }
      heuristicAi = new HeuristicAi(HeuristicConfig);
    }
    return heuristicAi;
  }

  // -------------------------------------------------------------------
  // AI dispatcher
  // -------------------------------------------------------------------

  async function chooseAiAction() {
    if (aiMode === "heuristic") {
      const ai = ensureHeuristicAi();
      return ai.chooseAction(board, currentPlayer);
    }
    // ONNX mode
    if (!session) {
      throw new Error("ONNX 模型尚未加载");
    }
    return await chooseOnnxAction();
  }

  async function runAiTurn() {
    if (gameOver || currentPlayer === humanPlayer) {
      return;
    }

    aiThinking = true;
    statusElement.textContent = "AI 正在思考...";
    render();

    // Let the DOM paint so the user sees "AI 正在思考..."
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      const player = currentPlayer;
      const action = await chooseAiAction();
      placeStone(action, player);

      if (!gameOver) {
        statusElement.textContent =
          "AI 落子 " + coordinate(action) + "，轮到你";
      }
    } catch (error) {
      gameOver = true;
      statusElement.textContent = "AI 推理失败：" + error.message;
      console.error(error);
    } finally {
      aiThinking = false;
      render();
    }
  }

  // -------------------------------------------------------------------
  // Human input
  // -------------------------------------------------------------------

  function handleHumanMove(event) {
    if (gameOver || aiThinking || currentPlayer !== humanPlayer) {
      return;
    }

    const action = Number(event.currentTarget.dataset.action);

    if (board[action] !== 0) {
      return;
    }

    placeStone(action, humanPlayer);

    if (!gameOver) {
      void runAiTurn();
    }
  }

  // -------------------------------------------------------------------
  // Game lifecycle
  // -------------------------------------------------------------------

  function startGame() {
    board = new Int8Array(ACTION_SIZE);
    currentPlayer = 1;
    humanPlayer = Number(sideElement.value);
    aiMode = modeElement ? modeElement.value : "heuristic";
    lastAction = -1;
    gameOver = false;
    aiThinking = false;

    // In heuristic mode we are always "ready".
    // In ONNX mode we show the loading / ready status.
    if (aiMode === "heuristic") {
      statusElement.textContent =
        humanPlayer === 1
          ? "启发式 AI 已就绪，你执黑棋，请落子"
          : "启发式 AI 已就绪，你执白棋，AI 先手";
    } else {
      if (session) {
        statusElement.textContent =
          humanPlayer === 1
            ? "ONNX 模型已加载，你执黑棋，请落子"
            : "ONNX 模型已加载，你执白棋，AI 先手";
      } else {
        statusElement.textContent = "ONNX 模型正在加载...";
      }
    }

    render();

    // AI first move if human chose white
    if (humanPlayer === -1) {
      if (aiMode === "heuristic" || session) {
        void runAiTurn();
      }
      // If ONNX mode and session not loaded yet, the loadModel completion
      // will trigger the first AI move.
    }
  }

  // -------------------------------------------------------------------
  // ONNX model loading (lazy — only when ONNX mode is selected)
  // -------------------------------------------------------------------

  async function loadOnnxModel() {
    if (onnxLoading || session) return;
    onnxLoading = true;
    onnxLoadStarted = true;

    statusElement.textContent = "ONNX 模型正在加载...";

    try {
      session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });

      // Only activate if ONNX mode is still selected
      if (aiMode === "onnx") {
        statusElement.textContent =
          humanPlayer === 1
            ? "ONNX 模型已加载，你执黑棋，请落子"
            : "ONNX 模型已加载，你执白棋，AI 先手";
        render();
        // AI first move if appropriate
        if (humanPlayer === -1 && !gameOver) {
          void runAiTurn();
        }
      }
    } catch (error) {
      statusElement.textContent = "模型加载失败：" + error.message;
      console.error(error);
    } finally {
      onnxLoading = false;
    }
  }

  /** Initialize ONNX model load in the background (for pre-warming). */
  function prewarmOnnx() {
    if (!onnxLoadStarted && !session) {
      void loadOnnxModel();
    }
  }

  // -------------------------------------------------------------------
  // Mode switch handler
  // -------------------------------------------------------------------

  function onModeChange() {
    const newMode = modeElement.value;
    if (newMode === aiMode) return;
    aiMode = newMode;

    // Reset the game on mode switch
    gameOver = true;  // prevent pending AI moves from corrupting the new game
    if (aiMode === "heuristic") {
      // Immediately playable — no model needed
      startGame();
    } else {
      // ONNX mode — need to load model if not already loaded
      startGame();
      if (!session) {
        void loadOnnxModel();
      }
    }
  }

  // -------------------------------------------------------------------
  // Event wiring
  // -------------------------------------------------------------------

  newGameButton.addEventListener("click", startGame);
  sideElement.addEventListener("change", startGame);
  if (modeElement) {
    modeElement.addEventListener("change", onModeChange);
  }

  // -------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------

  createBoard();

  // Default: heuristic mode — playable immediately, no model download.
  if (modeElement) {
    modeElement.value = "heuristic";
    aiMode = "heuristic";
  }

  heuristicAi = new HeuristicAi(HeuristicConfig);
  statusElement.textContent = "启发式 AI 已就绪，你执黑棋，请落子";
  render();

  // Pre-warm ONNX model in the background so switching is fast.
  prewarmOnnx();
})();
