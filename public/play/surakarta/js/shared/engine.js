// Surakarta -- authoritative game engine

import { ALL_NODES, ADJACENCY, getCaptureTargets, getInitialBoard } from './board-data.js';
import { PIECES_PER_PLAYER, DEFAULT_MOVE_LIMIT, PHASE } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'surakarta',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'Dark', title: 'Dark', captured: 0, piecesLeft: PIECES_PER_PLAYER },
      p2: { token: null, ip: null, name: 'Light', title: 'Light', captured: 0, piecesLeft: PIECES_PER_PLAYER }
    },
    board: getInitialBoard(),
    turn: { player: 'p1' },
    settings: {
      moveLimit: DEFAULT_MOVE_LIMIT,
      drawByRepetition: true
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

  const opponent = player === 'p1' ? 'p2' : 'p1';

  // Check if this is a capture (loop-based) or a regular move (one step)
  const captureTargets = getCaptureTargets(state.board, from, player);
  const isCapture = captureTargets.includes(to);

  if (isCapture) {
    return executeCapture(state, player, opponent, from, to);
  }

  // Regular move: must be adjacent and empty
  if (!ADJACENCY[from].includes(to)) return { error: 'Not adjacent (regular moves are one step)' };
  if (state.board[to] !== null) return { error: 'Target is occupied' };

  return executeRegularMove(state, player, from, to);
}

function executeRegularMove(state, player, from, to) {
  state.board[from] = null;
  state.board[to] = player;
  state.movesSinceCapture++;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'move', player, from, to });

  return finishTurn(state, player);
}

function executeCapture(state, player, opponent, from, to) {
  state.board[from] = null;
  state.board[to] = player;
  state.players[player].captured++;
  state.players[opponent].piecesLeft--;
  state.movesSinceCapture = 0;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'capture', player, from, to });

  // Check win
  if (state.players[opponent].piecesLeft <= 0) {
    declareWinner(state, player, 'elimination');
    return { ok: true, finished: true };
  }

  return finishTurn(state, player);
}

function finishTurn(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.turn.player = opponent;

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

// --- Legal Move Queries (for UI) ---

export function getRegularMoves(state, player, from) {
  if (state.board[from] !== player) return [];
  return ADJACENCY[from].filter(n => state.board[n] === null);
}

export function getCaptureMoves(state, player, from) {
  if (state.board[from] !== player) return [];
  return getCaptureTargets(state.board, from, player);
}

export function getAllMoves(state, player, from) {
  return {
    regular: getRegularMoves(state, player, from),
    captures: getCaptureMoves(state, player, from)
  };
}

export function getSelectablePieces(state, player) {
  const selectable = [];
  for (const node of ALL_NODES) {
    if (state.board[node] !== player) continue;
    const moves = getAllMoves(state, player, node);
    if (moves.regular.length > 0 || moves.captures.length > 0) {
      selectable.push(node);
    }
  }
  return selectable;
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
