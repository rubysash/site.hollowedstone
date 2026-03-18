// Lines of Action -- authoritative game engine

import { ALL_NODES, ADJACENCY, DIRECTIONS, getDirection, getDestination,
         countPiecesOnLine, getSquaresBetween, getInitialBoard } from './board-data.js';
import { PIECES_PER_PLAYER, DRAW_MOVE_LIMIT, PHASE } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'lines-of-action',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'Black', title: 'Black', captured: 0, piecesLeft: PIECES_PER_PLAYER },
      p2: { token: null, ip: null, name: 'White', title: 'White', captured: 0, piecesLeft: PIECES_PER_PLAYER }
    },
    board: getInitialBoard(),
    turn: { player: 'p1' },
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

// --- Main Move Function ---

export function makeMove(state, player, from, to) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };

  if (!ALL_NODES.includes(from) || !ALL_NODES.includes(to)) return { error: 'Invalid square' };
  if (state.board[from] !== player) return { error: 'Not your piece' };
  if (from === to) return { error: 'Must move to a different square' };

  const dir = getDirection(from, to);
  if (!dir) return { error: 'Not a valid line (must be horizontal, vertical, or diagonal)' };
  const [dFile, dRank, dist] = dir;

  // Count all pieces on the full line through 'from' in this direction
  const lineCount = countPiecesOnLine(state.board, from, dFile, dRank);
  if (dist !== lineCount) {
    return { error: `Must move exactly ${lineCount} squares on this line (tried ${dist})` };
  }

  const opponent = player === 'p1' ? 'p2' : 'p1';

  // Check for enemy blockers in the path
  const between = getSquaresBetween(from, to);
  for (const sq of between) {
    if (state.board[sq] === opponent) {
      return { error: 'Cannot jump over enemy pieces' };
    }
  }

  // Check destination
  if (state.board[to] === player) return { error: 'Cannot land on your own piece' };

  // Execute the move
  const isCapture = state.board[to] === opponent;
  state.board[from] = null;
  state.board[to] = player;

  if (isCapture) {
    state.players[player].captured++;
    state.players[opponent].piecesLeft--;
    state.movesSinceCapture = 0;
  } else {
    state.movesSinceCapture++;
  }

  state.updatedAt = new Date().toISOString();

  addLog(state, {
    action: 'move', player, from, to,
    capture: isCapture || undefined
  });

  // Check win: single piece remaining = that player wins
  if (state.players[opponent].piecesLeft === 1) {
    declareWinner(state, opponent, 'connected');
    return { ok: true, finished: true };
  }
  if (state.players[player].piecesLeft === 1) {
    declareWinner(state, player, 'connected');
    return { ok: true, finished: true };
  }

  // Check win: connectivity
  const playerConnected = isConnected(state.board, player);
  const opponentConnected = isConnected(state.board, opponent);

  if (playerConnected && opponentConnected) {
    // Simultaneous: moving player wins
    declareWinner(state, player, 'connected');
    return { ok: true, finished: true };
  }
  if (playerConnected) {
    declareWinner(state, player, 'connected');
    return { ok: true, finished: true };
  }
  if (opponentConnected) {
    declareWinner(state, opponent, 'connected');
    return { ok: true, finished: true };
  }

  // Switch turn
  state.turn.player = opponent;

  // Check if opponent has legal moves
  if (!hasAnyLegalMove(state, opponent)) {
    declareWinner(state, player, 'blocked');
    return { ok: true, finished: true };
  }

  // Record position and check draws
  recordPosition(state);
  const drawResult = checkDrawConditions(state);
  if (drawResult) {
    state.phase = PHASE.FINISHED;
    state.result = drawResult;
    addLog(state, { action: 'draw', reason: drawResult.reason });
    return { ok: true, finished: true };
  }

  return { ok: true };
}

// --- Connectivity Check (flood-fill with 8-connectivity) ---

export function isConnected(board, player) {
  const pieces = ALL_NODES.filter(n => board[n] === player);
  if (pieces.length <= 1) return true;

  const visited = new Set();
  const queue = [pieces[0]];
  visited.add(pieces[0]);

  while (queue.length > 0) {
    const node = queue.shift();
    for (const neighbor of ADJACENCY[node]) {
      if (!visited.has(neighbor) && board[neighbor] === player) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size === pieces.length;
}

// --- Legal Move Queries (for UI) ---

export function getLegalMoves(state, player, from) {
  if (state.board[from] !== player) return [];
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const moves = [];

  for (const [dFile, dRank] of DIRECTIONS) {
    const lineCount = countPiecesOnLine(state.board, from, dFile, dRank);
    const dest = getDestination(from, dFile, dRank, lineCount);
    if (!dest) continue;
    if (state.board[dest] === player) continue;

    // Check for enemy blockers in path
    let blocked = false;
    for (let i = 1; i < lineCount; i++) {
      const sq = getDestination(from, dFile, dRank, i);
      if (sq && state.board[sq] === opponent) { blocked = true; break; }
    }
    if (blocked) continue;

    moves.push(dest);
  }
  return moves;
}

export function getSelectablePieces(state, player) {
  const selectable = [];
  for (const node of ALL_NODES) {
    if (state.board[node] !== player) continue;
    if (getLegalMoves(state, player, node).length > 0) {
      selectable.push(node);
    }
  }
  return selectable;
}

function hasAnyLegalMove(state, player) {
  for (const node of ALL_NODES) {
    if (state.board[node] !== player) continue;
    if (getLegalMoves(state, player, node).length > 0) return true;
  }
  return false;
}

// --- Draw Detection ---

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

// --- Win / End ---

function declareWinner(state, winner, reason) {
  state.phase = PHASE.FINISHED;
  state.result = {
    winner, reason,
    finalScore: [state.players.p1.captured, state.players.p2.captured]
  };
  addLog(state, { action: 'win', winner, reason });
}

// --- Logging ---

function addLog(state, entry) {
  state.logSeq++;
  entry.seq = state.logSeq;
  entry.ts = new Date().toISOString();
  state.log.push(entry);
}

// --- Sanitization ---

export function sanitizeForPlayer(state, player) {
  const copy = JSON.parse(JSON.stringify(state));
  delete copy.players.p1.token;
  delete copy.players.p2.token;
  delete copy.players.p1.ip;
  delete copy.players.p2.ip;
  return copy;
}
