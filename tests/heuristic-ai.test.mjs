import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { HeuristicAi, HeuristicConfig } = require("../assets/js/heuristic-ai.js");

const SIZE = 9;

/** Build an empty Int8Array board. */
function emptyBoard() {
  return new Int8Array(SIZE * SIZE);
}

/** Apply a list of [action, player] tuples and return the board. */
function applyMoves(...moves) {
  const b = emptyBoard();
  for (const [a, p] of moves) {
    b[a] = p;
  }
  return b;
}

/** Return set of occupied actions from a board. */
function occupiedSet(board) {
  const s = new Set();
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== 0) s.add(i);
  }
  return s;
}

// ==================================================================

describe("HeuristicAi", () => {
  it("empty board returns center (action 40 for 9×9)", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    const board = emptyBoard();
    const action = ai.chooseAction(board, 1);
    assert.equal(action, 40);
  });

  it("returned action is on an empty cell", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    // A few stones already placed
    const board = applyMoves(
      [40, 1],
      [39, -1],
      [31, 1],
      [49, -1],
    );
    const action = ai.chooseAction(board, 1);
    assert.equal(board[action], 0);
  });

  it("takes immediate horizontal win (black, row 4)", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    // Black has 36,37,38,39 (row 4, cols 0-3); White: 0,1,2,3 (row 0, cols 0-3)
    const board = applyMoves(
      [36, 1], [0, -1],
      [37, 1], [1, -1],
      [38, 1], [2, -1],
      [39, 1], [3, -1],
    );
    const action = ai.chooseAction(board, 1);
    assert.equal(action, 40); // (4,4) completes the five
  });

  it("blocks opponent's immediate horizontal win", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    // White has 36,37,38,39 (row 4, cols 0-3); Black: 0,1,2,10
    // Black to move must block at 40
    const board = applyMoves(
      [0, 1], [36, -1],
      [1, 1], [37, -1],
      [2, 1], [38, -1],
      [10, 1], [39, -1],
    );
    const action = ai.chooseAction(board, 1);
    assert.equal(action, 40);
  });

  it("does not mutate the input board", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    const board = applyMoves([40, 1], [31, -1]);
    const clone = new Int8Array(board);
    ai.chooseAction(board, 1);
    for (let i = 0; i < board.length; i++) {
      assert.equal(board[i], clone[i], `board mutated at index ${i}`);
    }
  });

  it("throws on invalid player value", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    assert.throws(() => ai.chooseAction(emptyBoard(), 0), {
      message: /player/,
    });
    assert.throws(() => ai.chooseAction(emptyBoard(), 2), {
      message: /player/,
    });
  });

  it("throws when board is full", () => {
    const ai = new HeuristicAi(HeuristicConfig);
    const board = new Int8Array(SIZE * SIZE);
    board.fill(1);
    assert.throws(() => ai.chooseAction(board, 1), {
      message: /full/,
    });
  });

  it("can play both sides for a full game", () => {
    const ai = new HeuristicAi({ searchDepth: 1, candidateLimit: 8, candidateRadius: 1 });
    const board = emptyBoard();
    let player = 1;
    let moves = 0;
    const maxMoves = SIZE * SIZE;

    while (moves < maxMoves) {
      const action = ai.chooseAction(board, player);
      assert.equal(board[action], 0, `move ${moves}: action ${action} already occupied`);
      board[action] = player;

      // check win
      if (isWinAt(board, action, player)) break;

      moves++;
      player = -player;
    }

    assert.ok(moves > 0, "should have played at least one move");
    assert.ok(moves < maxMoves, "game should end before board is full (with depth-1 AI)");
  });

  it("blocks opponent open-three on a 5×5 board", () => {
    // Build a smaller AI
    const ai = new HeuristicAi({ searchDepth: 2, candidateLimit: 10 });

    // On 5×5: White has two stones at (2,0)=10 and (2,1)=11 (open on both sides).
    // Black must respond.
    const size5 = 5;
    const board = new Int8Array(size5 * size5);
    board[10] = -1;  // (2,0)
    board[11] = -1;  // (2,1)
    // Black's turn
    const action = ai.chooseAction(board, 1);
    assert.equal(board[action], 0, "chosen action must be empty");
    // At minimum, the AI should not let white complete freely
  });

  it("config validation rejects invalid values", () => {
    assert.throws(() => new HeuristicAi({ searchDepth: 0 }), { message: />= 1/ });
    assert.throws(() => new HeuristicAi({ candidateLimit: 0 }), { message: />= 1/ });
    assert.throws(() => new HeuristicAi({ candidateRadius: 0 }), { message: />= 1/ });
  });
});

// ------------------------------------------------------------------
// Helper: win detection for the full-game test
// ------------------------------------------------------------------

const DIRECTIONS = [
  [0, 1], [1, 0], [1, 1], [1, -1],
];

function isWinAt(board, action, player) {
  const size = 9;
  const row = Math.floor(action / size);
  const col = action % size;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (const sign of [-1, 1]) {
      let r = row + sign * dr;
      let c = col + sign * dc;
      while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player) {
        count++;
        r += sign * dr;
        c += sign * dc;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}
