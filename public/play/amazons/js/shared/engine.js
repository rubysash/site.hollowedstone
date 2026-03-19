// Amazons -- authoritative game engine

import { ALL_NODES, getQueenReachable, getInitialBoard } from './board-data.js';
import { PHASE, ACTION } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'amazons',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'White', title: 'White' },
      p2: { token: null, ip: null, name: 'Black', title: 'Black' }
    },
    board: getInitialBoard(),
    turn: { player: 'p1', action: ACTION.MOVE, amazon: null },
    arrowCount: 0,
    log: [],
    logSeq: 0,
    result: null,
    requests: 0
  };
}

// --- Move Amazon ---

export function moveAmazon(state, player, from, to) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (state.turn.action !== ACTION.MOVE) return { error: 'Must shoot an arrow first' };

  if (!ALL_NODES.includes(from) || !ALL_NODES.includes(to)) return { error: 'Invalid square' };
  if (state.board[from] !== player) return { error: 'Not your amazon' };

  const reachable = getQueenReachable(state.board, from);
  if (!reachable.includes(to)) return { error: 'Cannot move there' };

  // Execute
  state.board[from] = null;
  state.board[to] = player;
  state.turn.action = ACTION.SHOOT;
  state.turn.amazon = to;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'move', player, from, to });

  return { ok: true, needsShoot: true };
}

// --- Shoot Arrow ---

export function shootArrow(state, player, target) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (state.turn.action !== ACTION.SHOOT) return { error: 'Must move an amazon first' };

  if (!ALL_NODES.includes(target)) return { error: 'Invalid square' };

  const amazon = state.turn.amazon;
  const reachable = getQueenReachable(state.board, amazon);
  if (!reachable.includes(target)) return { error: 'Cannot shoot there' };

  // Place arrow
  state.board[target] = 'arrow';
  state.arrowCount++;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'shoot', player, from: amazon, target });

  // Switch turn
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.turn.player = opponent;
  state.turn.action = ACTION.MOVE;
  state.turn.amazon = null;

  // Check if opponent can move any amazon
  if (!hasAnyLegalMove(state, opponent)) {
    declareWinner(state, player, 'blocked');
    return { ok: true, finished: true };
  }

  return { ok: true };
}

// --- Legal Move Queries ---

export function getSelectableAmazons(state, player) {
  if (state.turn.action !== ACTION.MOVE) return [];
  const selectable = [];
  for (const node of ALL_NODES) {
    if (state.board[node] !== player) continue;
    if (getQueenReachable(state.board, node).length > 0) {
      selectable.push(node);
    }
  }
  return selectable;
}

export function getAmazonMoves(state, player, from) {
  if (state.board[from] !== player) return [];
  return getQueenReachable(state.board, from);
}

export function getArrowTargets(state) {
  if (state.turn.action !== ACTION.SHOOT || !state.turn.amazon) return [];
  return getQueenReachable(state.board, state.turn.amazon);
}

function hasAnyLegalMove(state, player) {
  for (const node of ALL_NODES) {
    if (state.board[node] !== player) continue;
    if (getQueenReachable(state.board, node).length > 0) return true;
  }
  return false;
}

// --- Win ---

function declareWinner(state, winner, reason) {
  state.phase = PHASE.FINISHED;
  state.result = { winner, reason, arrowCount: state.arrowCount };
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
