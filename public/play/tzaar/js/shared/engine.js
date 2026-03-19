// TZAAR -- authoritative game engine

import { ALL_NODES, getReachableTargets, getRandomSetup, getEmptyBoard } from './board-data.js';
import { PHASE, PIECE_TYPES } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'tzaar',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'White', title: 'White', captured: 0 },
      p2: { token: null, ip: null, name: 'Black', title: 'Black', captured: 0 }
    },
    board: getRandomSetup(),
    turn: {
      player: 'p1',
      actionNum: 1,    // 1 = first action (mandatory capture), 2 = second action
      firstTurn: true   // white's first turn: only 1 action
    },
    log: [],
    logSeq: 0,
    result: null,
    requests: 0
  };
}

// --- Main Move Function ---
// Handles both capture and stacking (determined by target owner)

export function makeMove(state, player, from, to) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };

  if (!ALL_NODES.includes(from) || !ALL_NODES.includes(to)) return { error: 'Invalid node' };

  const piece = state.board[from];
  if (!piece || piece.owner !== player) return { error: 'Not your piece' };

  const target = state.board[to];
  if (!target) return { error: 'Must land on an occupied space' };

  // Verify the target is reachable in a straight line
  const reachable = getReachableTargets(state.board, from);
  if (!reachable.includes(to)) return { error: 'Cannot reach that space' };

  const opponent = player === 'p1' ? 'p2' : 'p1';

  if (target.owner === opponent) {
    // CAPTURE
    if (state.turn.actionNum === 2) {
      // Second action: capture is optional but valid
    }
    return executeCapture(state, player, opponent, from, to);
  }

  if (target.owner === player) {
    // STACK
    if (state.turn.actionNum === 1) {
      return { error: 'First action must be a capture' };
    }
    return executeStack(state, player, from, to);
  }

  return { error: 'Invalid target' };
}

// --- Pass (end turn after first action) ---

export function passTurn(state, player) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (state.turn.actionNum !== 2) return { error: 'Cannot pass on first action' };

  addLog(state, { action: 'pass', player });
  return endTurn(state, player);
}

// --- Capture ---

function executeCapture(state, player, opponent, from, to) {
  const attacker = state.board[from];
  const defender = state.board[to];

  // Stack height check
  if (attacker.height < defender.height) {
    return { error: `Cannot capture: your stack (${attacker.height}) is shorter than target (${defender.height})` };
  }

  // Execute capture
  state.board[from] = null;
  state.board[to] = attacker; // attacker moves to target position
  state.players[player].captured++;
  state.updatedAt = new Date().toISOString();

  addLog(state, {
    action: 'capture', player, from, to,
    pieceType: attacker.type,
    capturedType: defender.type,
    capturedHeight: defender.height
  });

  // Check if opponent lost (missing a type)
  if (isMissingType(state.board, opponent)) {
    declareWinner(state, player, 'type_eliminated');
    return { ok: true, finished: true };
  }

  return advanceAction(state, player);
}

// --- Stack ---

function executeStack(state, player, from, to) {
  const mover = state.board[from];
  const base = state.board[to];

  // Stack: mover goes on top of base
  state.board[from] = null;
  state.board[to] = {
    owner: player,
    type: mover.type, // top piece determines type
    height: mover.height + base.height
  };
  state.updatedAt = new Date().toISOString();

  addLog(state, {
    action: 'stack', player, from, to,
    topType: mover.type,
    newHeight: mover.height + base.height
  });

  return advanceAction(state, player);
}

// --- Turn Management ---

function advanceAction(state, player) {
  if (state.turn.actionNum === 1) {
    if (state.turn.firstTurn) {
      // White's first turn: only 1 action
      return endTurn(state, player);
    }
    // Move to second action
    state.turn.actionNum = 2;
    return { ok: true };
  }

  // After second action, end turn
  return endTurn(state, player);
}

function endTurn(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';

  state.turn.player = opponent;
  state.turn.actionNum = 1;
  state.turn.firstTurn = false;

  // Check if opponent has lost (missing a type)
  if (isMissingType(state.board, opponent)) {
    declareWinner(state, player, 'type_eliminated');
    return { ok: true, finished: true };
  }

  // Check if opponent can make a mandatory capture
  if (!canCapture(state.board, opponent)) {
    declareWinner(state, player, 'no_capture');
    return { ok: true, finished: true };
  }

  return { ok: true };
}

// --- Checks ---

function isMissingType(board, player) {
  const typesFound = new Set();
  for (const id of ALL_NODES) {
    const piece = board[id];
    if (piece && piece.owner === player) {
      typesFound.add(piece.type);
    }
  }
  for (const type of PIECE_TYPES) {
    if (!typesFound.has(type)) return true;
  }
  return false;
}

function canCapture(board, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  for (const id of ALL_NODES) {
    const piece = board[id];
    if (!piece || piece.owner !== player) continue;

    const targets = getReachableTargets(board, id);
    for (const t of targets) {
      const target = board[t];
      if (target && target.owner === opponent && piece.height >= target.height) {
        return true;
      }
    }
  }
  return false;
}

// --- Legal Move Queries (for UI) ---

export function getSelectablePieces(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const selectable = [];

  for (const id of ALL_NODES) {
    const piece = state.board[id];
    if (!piece || piece.owner !== player) continue;

    const targets = getReachableTargets(state.board, id);
    const hasTarget = targets.some(t => {
      const tp = state.board[t];
      if (!tp) return false;
      if (state.turn.actionNum === 1) {
        // First action: must capture
        return tp.owner === opponent && piece.height >= tp.height;
      }
      // Second action: can capture or stack
      return (tp.owner === opponent && piece.height >= tp.height) || tp.owner === player;
    });

    if (hasTarget) selectable.push(id);
  }
  return selectable;
}

export function getLegalTargets(state, player, from) {
  const piece = state.board[from];
  if (!piece || piece.owner !== player) return [];
  const opponent = player === 'p1' ? 'p2' : 'p1';

  const targets = getReachableTargets(state.board, from);
  return targets.filter(t => {
    const tp = state.board[t];
    if (!tp) return false;
    if (state.turn.actionNum === 1) {
      return tp.owner === opponent && piece.height >= tp.height;
    }
    return (tp.owner === opponent && piece.height >= tp.height) || tp.owner === player;
  });
}

// --- Win ---

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
