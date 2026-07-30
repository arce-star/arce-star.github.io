/**
 * Heuristic Gomoku AI — pure JavaScript, no neural network, no DOM, no ONNX.
 *
 * Loaded as a classic <script> in the browser.
 * Attaches `HeuristicAi` and `HeuristicConfig` to `window`.
 *
 * Usage:
 *   const ai = new HeuristicAi(HeuristicConfig);
 *   const action = ai.chooseAction(board, currentPlayer);
 *
 * ``board`` is an Int8Array (or typed array) of length boardSize².
 * ``currentPlayer`` is 1 (black) or -1 (white).
 * Returns a **number** action index (row * boardSize + col).
 * Does **not** mutate the input board.
 */
(function (global) {
  "use strict";

  var HeuristicConfig = Object.freeze({
    candidateRadius: 2,
    candidateLimit: 12,
    searchDepth: 2,
    centerBonus: 8,
  });

  var DIRECTIONS = Object.freeze([
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]);

  var PATTERN = Object.freeze({
    five:        1000000,
    openFour:     100000,
    closedFour:    12000,
    openThree:      8000,
    closedThree:    1000,
    openTwo:         300,
    closedTwo:        80,
    single:           10,
  });

  // -----------------------------------------------------------------------
  // Public class
  // -----------------------------------------------------------------------

  function HeuristicAi(config) {
    config = config || {};
    this._radius = config.candidateRadius != null ? config.candidateRadius : HeuristicConfig.candidateRadius;
    this._limit  = config.candidateLimit  != null ? config.candidateLimit  : HeuristicConfig.candidateLimit;
    this._depth  = config.searchDepth    != null ? config.searchDepth    : HeuristicConfig.searchDepth;
    this._bonus  = config.centerBonus    != null ? config.centerBonus    : HeuristicConfig.centerBonus;
    if (this._radius < 1 || this._limit < 1 || this._depth < 1) {
      throw new Error("HeuristicAi config values must be >= 1");
    }
  }

  HeuristicAi.prototype.chooseAction = function (board, player) {
    var size = boardSize(board);
    if (player !== 1 && player !== -1) {
      throw new Error("player must be 1 or -1");
    }

    var legal = legalActions(board, size);
    if (legal.length === 0) {
      throw new Error("no legal actions — board is full");
    }

    // empty board → center
    var hasStone = false;
    for (var i = 0; i < board.length; i++) {
      if (board[i] !== 0) { hasStone = true; break; }
    }
    if (!hasStone) {
      var c = Math.floor(size / 2);
      return c * size + c;
    }

    var copy = new Int8Array(board);

    // 1) immediate win
    var win = findImmediateWin(copy, size, player, legal);
    if (win !== null) return win;

    // 2) block opponent's immediate win
    var block = findImmediateWin(copy, size, -player, legal);
    if (block !== null) return block;

    // 3) candidate generation + ordered search
    var candidates = candidateActions(copy, size, legal, this._radius);
    var ordered = orderedActions(copy, size, player, candidates, this._limit, this._bonus);

    var bestAction = ordered[0];
    var bestScore = -Infinity;
    var alpha = -Infinity;
    var beta = Infinity;
    var depth = this._depth;
    var limit = this._limit;
    var radius = this._radius;
    var bonus = this._bonus;

    for (var j = 0; j < ordered.length; j++) {
      var a = ordered[j];
      copy[a] = player;
      var score = -negamax(copy, size, -player, depth - 1, -beta, -alpha, radius, limit, bonus);
      copy[a] = 0;
      if (score > bestScore) { bestScore = score; bestAction = a; }
      if (bestScore > alpha) alpha = bestScore;
    }

    return bestAction;
  };

  function boardSize(board) {
    var s = Math.round(Math.sqrt(board.length));
    if (s * s !== board.length) throw new Error("board length must be a perfect square");
    return s;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  function legalActions(board, size) {
    var out = [];
    for (var i = 0; i < board.length; i++) {
      if (board[i] === 0) out.push(i);
    }
    return out;
  }

  function findImmediateWin(board, size, player, legal) {
    for (var i = 0; i < legal.length; i++) {
      var a = legal[i];
      board[a] = player;
      if (isWinAt(board, size, a, player)) { board[a] = 0; return a; }
      board[a] = 0;
    }
    return null;
  }

  function isWinAt(board, size, action, player) {
    var row = Math.floor(action / size);
    var col = action % size;
    for (var d = 0; d < DIRECTIONS.length; d++) {
      var dr = DIRECTIONS[d][0];
      var dc = DIRECTIONS[d][1];
      var count = 1;
      for (var sIdx = 0; sIdx < 2; sIdx++) {
        var sign = sIdx === 0 ? -1 : 1;
        var r = row + sign * dr;
        var c = col + sign * dc;
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

  function candidateActions(board, size, legal, radius) {
    var legalSet = new Set();
    for (var i = 0; i < legal.length; i++) legalSet.add(legal[i]);
    var candidates = new Set();

    for (var a = 0; a < board.length; a++) {
      if (board[a] === 0) continue;
      var row = Math.floor(a / size);
      var col = a % size;
      for (var dr = -radius; dr <= radius; dr++) {
        for (var dc = -radius; dc <= radius; dc++) {
          var nr = row + dr;
          var nc = col + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            var idx = nr * size + nc;
            if (legalSet.has(idx)) candidates.add(idx);
          }
        }
      }
    }

    var result = [];
    candidates.forEach(function (v) { result.push(v); });
    if (result.length > 0) { result.sort(function (x, y) { return x - y; }); return result; }
    return legal.slice();
  }

  function orderedActions(board, size, player, actions, limit, centerBonus) {
    var scored = [];
    for (var i = 0; i < actions.length; i++) {
      var a = actions[i];
      var off = moveScore(board, size, a, player, centerBonus);
      var def = moveScore(board, size, a, -player, centerBonus);
      scored.push({ action: a, score: off + Math.floor(def * 0.9) });
    }
    scored.sort(function (x, y) { return y.score - x.score || x.action - y.action; });
    var out = [];
    for (var j = 0; j < limit && j < scored.length; j++) out.push(scored[j].action);
    return out;
  }

  function moveScore(board, size, action, player, centerBonus) {
    if (board[action] !== 0) return -PATTERN.five;
    board[action] = player;
    if (isWinAt(board, size, action, player)) { board[action] = 0; return PATTERN.five; }
    var score = pointPattern(board, size, action, player);
    var center = (size - 1) / 2;
    var row = Math.floor(action / size);
    var col = action % size;
    var dist = Math.abs(row - center) + Math.abs(col - center);
    score += Math.floor(Math.max(0, size - dist) * centerBonus);
    board[action] = 0;
    return score;
  }

  function pointPattern(board, size, action, player) {
    var row = Math.floor(action / size);
    var col = action % size;
    var total = 0;
    for (var d = 0; d < DIRECTIONS.length; d++) {
      var info = lineInfo(board, size, row, col, player, DIRECTIONS[d][0], DIRECTIONS[d][1]);
      total += lineScore(info[0], info[1]);
    }
    return total;
  }

  function lineInfo(board, size, row, col, player, dr, dc) {
    var length = 1;
    var openEnds = 0;
    for (var sIdx = 0; sIdx < 2; sIdx++) {
      var sign = sIdx === 0 ? -1 : 1;
      var r = row + sign * dr;
      var c = col + sign * dc;
      while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player) {
        length++;
        r += sign * dr;
        c += sign * dc;
      }
      if (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === 0) openEnds++;
    }
    return [length, openEnds];
  }

  function lineScore(length, openEnds) {
    if (length >= 5) return PATTERN.five;
    if (length === 4) {
      if (openEnds === 2) return PATTERN.openFour;
      if (openEnds === 1) return PATTERN.closedFour;
      return 0;
    }
    if (length === 3) {
      if (openEnds === 2) return PATTERN.openThree;
      if (openEnds === 1) return PATTERN.closedThree;
      return 0;
    }
    if (length === 2) {
      if (openEnds === 2) return PATTERN.openTwo;
      if (openEnds === 1) return PATTERN.closedTwo;
      return 0;
    }
    if (length === 1) return PATTERN.single;
    return 0;
  }

  // -----------------------------------------------------------------------
  // Negamax + alpha-beta
  // -----------------------------------------------------------------------

  function negamax(board, size, player, depth, alpha, beta, radius, limit, centerBonus) {
    var legal = legalActions(board, size);
    if (legal.length === 0) return 0;

    var win = findImmediateWin(board, size, player, legal);
    if (win !== null) return PATTERN.five;
    var block = findImmediateWin(board, size, -player, legal);
    if (block !== null) return -PATTERN.five;

    if (depth <= 0) return evaluateBoard(board, size, player);

    var candidates = candidateActions(board, size, legal, radius);
    var ordered = orderedActions(board, size, player, candidates, limit, centerBonus);

    var best = -Infinity;
    for (var i = 0; i < ordered.length; i++) {
      var a = ordered[i];
      board[a] = player;
      var score = -negamax(board, size, -player, depth - 1, -beta, -alpha, radius, limit, centerBonus);
      board[a] = 0;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function evaluateBoard(board, size, player) {
    return scorePlayer(board, size, player) - scorePlayer(board, size, -player);
  }

  function scorePlayer(board, size, player) {
    var score = 0;
    for (var row = 0; row < size; row++) {
      for (var col = 0; col < size; col++) {
        if (board[row * size + col] !== player) continue;
        for (var d = 0; d < DIRECTIONS.length; d++) {
          var dr = DIRECTIONS[d][0];
          var dc = DIRECTIONS[d][1];
          var pr = row - dr;
          var pc = col - dc;
          if (pr >= 0 && pr < size && pc >= 0 && pc < size && board[pr * size + pc] === player) continue;
          var info = lineInfo(board, size, row, col, player, dr, dc);
          score += lineScore(info[0], info[1]);
        }
      }
    }
    return score;
  }

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------

  global.HeuristicConfig = HeuristicConfig;
  global.HeuristicAi = HeuristicAi;

  // Node / ES module compatibility — attach to module.exports if available
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { HeuristicConfig: HeuristicConfig, HeuristicAi: HeuristicAi };
  }
})(typeof window !== "undefined" ? window : globalThis);
