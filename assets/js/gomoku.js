(() => {
  "use strict";

  const BOARD_SIZE = 9;
  const ACTION_SIZE = 81;
  const MODEL_URL = "/assets/models/gomoku-9x9-iter10.onnx";
  const WASM_PATH = "/assets/vendor/";

  const boardElement = document.getElementById("board");
  const statusElement = document.getElementById("status");
  const sideElement = document.getElementById("human-side");
  const newGameButton = document.getElementById("new-game");

  let session = null;
  let board = new Int8Array(ACTION_SIZE);
  let currentPlayer = 1;
  let humanPlayer = 1;
  let lastAction = -1;
  let gameOver = false;
  let aiThinking = false;

  ort.env.wasm.wasmPaths = WASM_PATH;
  ort.env.wasm.numThreads = 1;

  function rowOf(action) {
    return Math.floor(action / BOARD_SIZE);
  }

  function colOf(action) {
    return action % BOARD_SIZE;
  }

  function coordinate(action) {
    return (
      String.fromCharCode(65 + colOf(action))
      + String(rowOf(action) + 1)
    );
  }

  function playerName(player) {
    return player === 1 ? "黑棋" : "白棋";
  }

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
          "stone "
          + (player === 1 ? "black" : "white")
          + (action === lastAction ? " last" : "");
        cell.appendChild(stone);
      }

      cell.disabled =
        !session
        || gameOver
        || aiThinking
        || currentPlayer !== humanPlayer
        || player !== 0;
    }
  }

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
          checkRow >= 0
          && checkRow < BOARD_SIZE
          && checkCol >= 0
          && checkCol < BOARD_SIZE
          && board[checkRow * BOARD_SIZE + checkCol] === player
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

  function placeStone(action, player) {
    board[action] = player;
    lastAction = action;

    const winner = findWinner(action, player);

    if (winner !== 0) {
      gameOver = true;
      statusElement.textContent =
        playerName(winner) + "获胜";
    } else if (board.every((value) => value !== 0)) {
      gameOver = true;
      statusElement.textContent = "和棋";
    } else {
      currentPlayer = -currentPlayer;
    }

    render();
  }

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

    return new ort.Tensor(
      "float32",
      values,
      [1, 3, BOARD_SIZE, BOARD_SIZE]
    );
  }

  async function chooseAiAction() {
    const outputs = await session.run({
      states: encodeState(),
    });
    const logits = outputs.policy_logits.data;
    let bestAction = -1;
    let bestLogit = -Infinity;

    for (let action = 0; action < ACTION_SIZE; action += 1) {
      if (
        board[action] === 0
        && logits[action] > bestLogit
      ) {
        bestLogit = logits[action];
        bestAction = action;
      }
    }

    if (bestAction < 0) {
      throw new Error("没有可用的合法动作");
    }

    return bestAction;
  }

  async function runAiTurn() {
    if (
      !session
      || gameOver
      || currentPlayer === humanPlayer
    ) {
      return;
    }

    aiThinking = true;
    statusElement.textContent = "AI 正在思考...";
    render();

    try {
      const player = currentPlayer;
      const action = await chooseAiAction();
      placeStone(action, player);

      if (!gameOver) {
        statusElement.textContent =
          "AI 落子 "
          + coordinate(action)
          + "，轮到你";
      }
    } catch (error) {
      gameOver = true;
      statusElement.textContent =
        "AI 推理失败：" + error.message;
      console.error(error);
    } finally {
      aiThinking = false;
      render();
    }
  }

  function handleHumanMove(event) {
    if (
      !session
      || gameOver
      || aiThinking
      || currentPlayer !== humanPlayer
    ) {
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

  function startGame() {
    board = new Int8Array(ACTION_SIZE);
    currentPlayer = 1;
    humanPlayer = Number(sideElement.value);
    lastAction = -1;
    gameOver = false;
    aiThinking = false;

    statusElement.textContent =
      humanPlayer === 1
        ? "你执黑棋，请落子"
        : "你执白棋，AI 先手";

    render();

    if (humanPlayer === -1) {
      void runAiTurn();
    }
  }

  async function loadModel() {
    sideElement.disabled = true;
    newGameButton.disabled = true;

    try {
      session = await ort.InferenceSession.create(
        MODEL_URL,
        {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        }
      );

      sideElement.disabled = false;
      newGameButton.disabled = false;
      startGame();
    } catch (error) {
      statusElement.textContent =
        "模型加载失败：" + error.message;
      console.error(error);
    }
  }

  newGameButton.addEventListener("click", startGame);
  sideElement.addEventListener("change", startGame);

  createBoard();
  render();
  void loadModel();
})();
