// Fanorona — authoritative game engine
// Used by both server (validation) and client (UI hints)

import { ALL_NODES, ADJACENCY, parseNode, nodeId, getDirection, dirKey, getLine, getInitialBoard, isAdjacent } from './board-data.js';
import { PIECES_PER_PLAYER, DRAW_MOVE_LIMIT, PHASE } from './constants.js';

// ─── Game Creation ───

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'fanorona',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'Black', title: 'Black', piecesLeft: PIECES_PER_PLAYER, captured: 0 },
      p2: { token: null, ip: null, name: 'White', title: 'White', piecesLeft: PIECES_PER_PLAYER, captured: 0 }
    },
    board: getInitialBoard(),
    turn: {
      player: 'p2', // White moves first
      // Chain capture state
      chain: null    // null = fresh turn, or { piece, lastDir, visited, capturesMade }
    },
    settings: {
      drawByRepetition: true,
      moveLimit: DRAW_MOVE_LIMIT
    },
    movesSinceCapture: 0,
    positionHistory: {},
    log: [],
    logSeq: 0,
    result: null,
    requests: 0
  };
}

// ─── Main Move Function ───
// from: source node, to: target node, captureType: 'approach' | 'withdrawal' | null

export function makeMove(state, player, from, to, captureType) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };

  // Validate basic move
  if (!ALL_NODES.includes(from) || !ALL_NODES.includes(to)) return { error: 'Invalid node' };
  if (state.board[from] !== player) return { error: 'Not your piece' };
  if (state.board[to] !== null) return { error: 'Target is occupied' };
  if (!isAdjacent(from, to)) return { error: 'Target is not adjacent' };

  const dir = getDirection(from, to);
  if (!dir) return { error: 'Invalid direction' };
  const [dc, dr] = dir;

  const chain = state.turn.chain;
  const opponent = player === 'p1' ? 'p2' : 'p1';

  // If mid-chain, validate chain rules
  if (chain) {
    if (from !== chain.piece) return { error: 'Must continue with the same piece' };
    if (dirKey(dc, dr) === chain.lastDir) return { error: 'Must change direction' };
    if (chain.visited.includes(to)) return { error: 'Cannot revisit a point in the same chain' };
  }

  // Determine what can be captured
  const approachCaptures = getApproachCaptures(state.board, to, dc, dr, opponent);
  const withdrawalCaptures = getWithdrawalCaptures(state.board, from, dc, dr, opponent);
  const hasApproach = approachCaptures.length > 0;
  const hasWithdrawal = withdrawalCaptures.length > 0;

  // If mid-chain, a capture MUST happen (otherwise chain should have been ended)
  if (chain && !hasApproach && !hasWithdrawal) {
    return { error: 'No capture available in this direction' };
  }

  // Check if ANY capture exists on the board for this player (mandatory capture rule)
  if (!chain) {
    const anyCapture = hasAnyCaptureOnBoard(state, player);

    if (anyCapture && !hasApproach && !hasWithdrawal) {
      return { error: 'A capture is available — you must capture' };
    }

    if (!anyCapture && (hasApproach || hasWithdrawal)) {
      // Shouldn't happen, but handle gracefully
    }

    // Paika move (no captures available anywhere)
    if (!anyCapture) {
      return executePaika(state, player, from, to, dc, dr);
    }
  }

  // A capture move — determine type
  if (hasApproach && hasWithdrawal) {
    if (!captureType) return { error: 'Both approach and withdrawal possible — specify captureType' };
    if (captureType !== 'approach' && captureType !== 'withdrawal') return { error: 'Invalid captureType' };
  } else if (hasApproach) {
    captureType = 'approach';
  } else if (hasWithdrawal) {
    captureType = 'withdrawal';
  } else {
    return { error: 'No capture available' };
  }

  return executeCapture(state, player, from, to, dc, dr, captureType, approachCaptures, withdrawalCaptures);
}

// ─── End Chain (voluntary stop) ───

export function endChain(state, player) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (!state.turn.chain) return { error: 'No chain in progress' };

  addLog(state, { action: 'end_chain', player });
  return endTurn(state, player);
}

// ─── Internal: Execute Paika ───

function executePaika(state, player, from, to, dc, dr) {
  state.board[from] = null;
  state.board[to] = player;
  state.movesSinceCapture++;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'move', player, from, to, type: 'paika' });

  return endTurn(state, player);
}

// ─── Internal: Execute Capture ───

function executeCapture(state, player, from, to, dc, dr, captureType, approachCaptures, withdrawalCaptures) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const captured = captureType === 'approach' ? approachCaptures : withdrawalCaptures;

  // Move the piece
  state.board[from] = null;
  state.board[to] = player;

  // Remove captured pieces
  for (const node of captured) {
    state.board[node] = null;
  }
  state.players[opponent].piecesLeft -= captured.length;
  state.players[player].captured += captured.length;
  state.movesSinceCapture = 0;
  state.updatedAt = new Date().toISOString();

  // Update chain state
  const chain = state.turn.chain || { piece: from, lastDir: null, visited: [from], capturesMade: 0 };
  chain.piece = to;
  chain.lastDir = dirKey(dc, dr);
  chain.visited.push(to);
  chain.capturesMade += captured.length;
  state.turn.chain = chain;

  addLog(state, {
    action: 'capture', player, from, to,
    type: captureType, captured: captured.slice()
  });

  // Check for win
  if (state.players[opponent].piecesLeft <= 0) {
    declareWinner(state, player, 'pieces');
    return { ok: true, finished: true };
  }

  // Check if chain can continue
  const canContinue = getChainContinuations(state, player, to, chain).length > 0;

  if (canContinue) {
    // Player can choose to continue or stop
    return { ok: true, chainActive: true };
  }

  // Chain ends automatically
  return endTurn(state, player);
}

// ─── Internal: End Turn ───

function endTurn(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.turn.player = opponent;
  state.turn.chain = null;

  recordPosition(state);

  // Check draw conditions
  const drawResult = checkDrawConditions(state);
  if (drawResult) {
    state.phase = PHASE.FINISHED;
    state.result = drawResult;
    addLog(state, { action: 'draw', reason: drawResult.reason });
    return { ok: true, finished: true };
  }

  // Check if opponent has any legal move
  if (!hasAnyLegalMove(state, opponent)) {
    declareWinner(state, player, 'blocked');
    return { ok: true, finished: true };
  }

  return { ok: true };
}

// ─── Capture Detection ───

function getApproachCaptures(board, landingNode, dc, dr, opponent) {
  // After moving to landingNode in direction [dc,dr], check the line beyond in the same direction
  const line = getLine(landingNode, dc, dr);
  const captured = [];
  for (const node of line) {
    if (board[node] !== opponent) break;
    captured.push(node);
  }
  return captured;
}

function getWithdrawalCaptures(board, originNode, dc, dr, opponent) {
  // Moving away from originNode in direction [dc,dr], check the line behind (opposite direction)
  const line = getLine(originNode, -dc, -dr);
  const captured = [];
  for (const node of line) {
    if (board[node] !== opponent) break;
    captured.push(node);
  }
  return captured;
}

// ─── Legal Move Queries (for UI) ───

export function hasAnyCaptureOnBoard(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';

  for (const from of ALL_NODES) {
    if (state.board[from] !== player) continue;
    for (const to of ADJACENCY[from]) {
      if (state.board[to] !== null) continue;
      const dir = getDirection(from, to);
      if (!dir) continue;
      const [dc, dr] = dir;
      if (getApproachCaptures(state.board, to, dc, dr, opponent).length > 0) return true;
      if (getWithdrawalCaptures(state.board, from, dc, dr, opponent).length > 0) return true;
    }
  }
  return false;
}

export function getChainContinuations(state, player, from, chain) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const moves = [];

  for (const to of ADJACENCY[from]) {
    if (state.board[to] !== null) continue;
    if (chain.visited.includes(to)) continue;

    const dir = getDirection(from, to);
    if (!dir) continue;
    const [dc, dr] = dir;

    // Must change direction
    if (dirKey(dc, dr) === chain.lastDir) continue;

    const approach = getApproachCaptures(state.board, to, dc, dr, opponent);
    const withdrawal = getWithdrawalCaptures(state.board, from, dc, dr, opponent);

    if (approach.length > 0 || withdrawal.length > 0) {
      moves.push({ to, approach: approach.length, withdrawal: withdrawal.length });
    }
  }
  return moves;
}

export function getLegalMoves(state, player) {
  // Returns all legal first moves for the player (not chain continuations)
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const mustCapture = hasAnyCaptureOnBoard(state, player);
  const moves = [];

  for (const from of ALL_NODES) {
    if (state.board[from] !== player) continue;
    for (const to of ADJACENCY[from]) {
      if (state.board[to] !== null) continue;
      const dir = getDirection(from, to);
      if (!dir) continue;
      const [dc, dr] = dir;

      const approach = getApproachCaptures(state.board, to, dc, dr, opponent);
      const withdrawal = getWithdrawalCaptures(state.board, from, dc, dr, opponent);
      const isCapture = approach.length > 0 || withdrawal.length > 0;

      if (mustCapture && !isCapture) continue;
      if (!mustCapture && isCapture) continue; // paika only when no captures exist

      moves.push({ from, to, approach: approach.length, withdrawal: withdrawal.length });
    }
  }
  return moves;
}

export function getSelectablePieces(state, player) {
  if (state.turn.chain) return [state.turn.chain.piece];
  const moves = getLegalMoves(state, player);
  return [...new Set(moves.map(m => m.from))];
}

export function getValidTargets(state, player, from) {
  if (state.turn.chain) {
    return getChainContinuations(state, player, from, state.turn.chain).map(m => m.to);
  }
  return getLegalMoves(state, player).filter(m => m.from === from).map(m => m.to);
}

function hasAnyLegalMove(state, player) {
  // Any piece can move to any adjacent empty node
  for (const from of ALL_NODES) {
    if (state.board[from] !== player) continue;
    for (const to of ADJACENCY[from]) {
      if (state.board[to] === null) return true;
    }
  }
  return false;
}

// ─── Capture Type Query (for UI — does a specific move need a choice?) ───

export function getCaptureInfo(state, player, from, to) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const dir = getDirection(from, to);
  if (!dir) return { approach: [], withdrawal: [] };
  const [dc, dr] = dir;
  return {
    approach: getApproachCaptures(state.board, to, dc, dr, opponent),
    withdrawal: getWithdrawalCaptures(state.board, from, dc, dr, opponent)
  };
}

// ─── Draw Detection ───

function recordPosition(state) {
  if (!state.settings.drawByRepetition) return;
  const key = positionKey(state);
  state.positionHistory[key] = (state.positionHistory[key] || 0) + 1;
}

function positionKey(state) {
  const boardStr = ALL_NODES.map(n => state.board[n] || '.').join('');
  return boardStr + ':' + state.turn.player;
}

function checkDrawConditions(state) {
  if (state.settings.moveLimit && state.movesSinceCapture >= state.settings.moveLimit) {
    return { winner: null, reason: 'move_limit',
      finalScore: [state.players.p1.captured, state.players.p2.captured] };
  }
  if (state.settings.drawByRepetition) {
    const key = positionKey(state);
    if ((state.positionHistory[key] || 0) >= 3) {
      return { winner: null, reason: 'repetition',
        finalScore: [state.players.p1.captured, state.players.p2.captured] };
    }
  }
  return null;
}

// ─── Win / End ───

function declareWinner(state, winner, reason) {
  state.phase = PHASE.FINISHED;
  state.result = {
    winner, reason,
    finalScore: [state.players.p1.captured, state.players.p2.captured]
  };
  addLog(state, { action: 'win', winner, reason });
}

// ─── Logging ───

function addLog(state, entry) {
  state.logSeq++;
  entry.seq = state.logSeq;
  entry.ts = new Date().toISOString();
  state.log.push(entry);
}

// ─── State Sanitization ───

export function sanitizeForPlayer(state, player) {
  const copy = JSON.parse(JSON.stringify(state));
  delete copy.players.p1.token;
  delete copy.players.p2.token;
  delete copy.players.p1.ip;
  delete copy.players.p2.ip;
  return copy;
}
