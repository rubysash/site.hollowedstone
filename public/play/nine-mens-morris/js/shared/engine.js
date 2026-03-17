// Nine Men's Morris — authoritative game engine
// Used by both server (validation) and client (UI hints)

import { ALL_NODES, ADJACENCY, isAdjacent, checkMill, isInMill } from './board-data.js';
import { PIECES_PER_PLAYER, MIN_PIECES_TO_PLAY, DRAW_MOVE_LIMIT, PHASE, ACTION } from './constants.js';

// ─── Game Creation ───

export function createGame(accessCode) {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;

  return {
    id: accessCode,
    accessCode,
    game: 'nine-mens-morris',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, lastSeen: null, piecesInHand: PIECES_PER_PLAYER, piecesOnBoard: 0, piecesLost: 0 },
      p2: { token: null, ip: null, lastSeen: null, piecesInHand: PIECES_PER_PLAYER, piecesOnBoard: 0, piecesLost: 0 }
    },
    board,
    turn: {
      player: 'p1',
      action: ACTION.PLACE
    },
    settings: {
      flying: true,
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

// ─── Placement Phase ───

export function placePiece(state, player, node) {
  if (state.phase !== PHASE.PLACING) return { error: 'Not in placement phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (state.turn.action !== ACTION.PLACE) return { error: 'You must remove an opponent piece first' };
  if (!ALL_NODES.includes(node)) return { error: 'Invalid node' };
  if (state.board[node] !== null) return { error: 'Node is occupied' };

  const p = state.players[player];
  if (p.piecesInHand <= 0) return { error: 'No pieces left to place' };

  // Place the piece
  state.board[node] = player;
  p.piecesInHand--;
  p.piecesOnBoard++;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'place', player, node });

  // Check if this forms a mill
  if (checkMill(state.board, node, player)) {
    // Check if opponent has any removable pieces
    const opponent = player === 'p1' ? 'p2' : 'p1';
    const removable = getRemovablePieces(state, opponent);
    if (removable.length > 0) {
      state.turn.action = ACTION.REMOVE;
      addLog(state, { action: 'mill', player, node });
      return { ok: true, mill: true };
    }
    // No removable pieces — skip removal
  }

  // End turn
  return endPlacementTurn(state, player);
}

function endPlacementTurn(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.turn.action = ACTION.PLACE;

  // Check if both players have placed all pieces
  if (state.players.p1.piecesInHand === 0 && state.players.p2.piecesInHand === 0) {
    state.phase = PHASE.PLAYING;
    state.turn.player = opponent;
    state.turn.action = ACTION.MOVE;
    // Record position for repetition tracking
    recordPosition(state);
    // Check if the next player can move
    if (!hasLegalMoves(state, opponent)) {
      declareWinner(state, player, 'blocked');
    }
    return { ok: true, phaseChange: true };
  }

  state.turn.player = opponent;
  return { ok: true };
}

// ─── Movement Phase ───

export function makeMove(state, player, from, to) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (state.turn.action !== ACTION.MOVE) return { error: 'You must remove an opponent piece first' };
  if (!ALL_NODES.includes(from) || !ALL_NODES.includes(to)) return { error: 'Invalid node' };
  if (state.board[from] !== player) return { error: 'Not your piece' };
  if (state.board[to] !== null) return { error: 'Target node is occupied' };

  const p = state.players[player];
  const canFly = state.settings.flying && p.piecesOnBoard <= MIN_PIECES_TO_PLAY;

  if (!canFly && !isAdjacent(from, to)) {
    return { error: 'Target is not adjacent (flying not allowed)' };
  }

  // Execute the move
  state.board[from] = null;
  state.board[to] = player;
  state.movesSinceCapture++;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'move', player, from, to });

  // Check if this forms a mill
  if (checkMill(state.board, to, player)) {
    const opponent = player === 'p1' ? 'p2' : 'p1';
    const removable = getRemovablePieces(state, opponent);
    if (removable.length > 0) {
      state.turn.action = ACTION.REMOVE;
      addLog(state, { action: 'mill', player, node: to });
      return { ok: true, mill: true };
    }
  }

  return endMoveTurn(state, player);
}

function endMoveTurn(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.turn.player = opponent;
  state.turn.action = ACTION.MOVE;

  // Record position for repetition tracking
  recordPosition(state);

  // Check draw conditions
  const drawResult = checkDrawConditions(state);
  if (drawResult) {
    state.phase = PHASE.FINISHED;
    state.result = drawResult;
    addLog(state, { action: 'draw', reason: drawResult.reason });
    return { ok: true, finished: true };
  }

  // Check if opponent can move
  if (!hasLegalMoves(state, opponent)) {
    declareWinner(state, player, 'blocked');
    return { ok: true, finished: true };
  }

  return { ok: true };
}

// ─── Remove Opponent Piece (after forming a mill) ───

export function removePiece(state, player, node) {
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (state.turn.action !== ACTION.REMOVE) return { error: 'Not in removal phase' };

  const opponent = player === 'p1' ? 'p2' : 'p1';
  if (state.board[node] !== opponent) return { error: 'Not an opponent piece' };

  // Cannot remove from mill unless all opponent pieces are in mills
  const removable = getRemovablePieces(state, opponent);
  if (!removable.includes(node)) {
    return { error: 'Cannot remove a piece that is part of a mill (other pieces available)' };
  }

  // Remove the piece
  state.board[node] = null;
  state.players[opponent].piecesOnBoard--;
  state.players[opponent].piecesLost++;
  state.movesSinceCapture = 0;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'remove', player, node, victim: opponent });

  // Check win by piece count
  const oppTotal = state.players[opponent].piecesOnBoard + state.players[opponent].piecesInHand;
  if (oppTotal < MIN_PIECES_TO_PLAY && state.players[opponent].piecesInHand === 0) {
    declareWinner(state, player, 'pieces');
    return { ok: true, finished: true };
  }

  // Continue based on which phase we're in
  if (state.phase === PHASE.PLACING) {
    return endPlacementTurn(state, player);
  } else {
    return endMoveTurn(state, player);
  }
}

// ─── Validation Helpers ───

export function getRemovablePieces(state, opponent) {
  const opponentNodes = ALL_NODES.filter(n => state.board[n] === opponent);
  const nonMillNodes = opponentNodes.filter(n => !isInMill(state.board, n));
  // If all pieces are in mills, any can be removed
  return nonMillNodes.length > 0 ? nonMillNodes : opponentNodes;
}

export function getValidPlacements(state) {
  return ALL_NODES.filter(n => state.board[n] === null);
}

export function getValidMoves(state, player, from) {
  if (state.board[from] !== player) return [];
  const p = state.players[player];
  const canFly = state.settings.flying && p.piecesOnBoard <= MIN_PIECES_TO_PLAY;

  if (canFly) {
    return ALL_NODES.filter(n => state.board[n] === null);
  }
  return (ADJACENCY[from] || []).filter(n => state.board[n] === null);
}

export function getSelectableStones(state, player) {
  return ALL_NODES.filter(n => {
    if (state.board[n] !== player) return false;
    return getValidMoves(state, player, n).length > 0;
  });
}

function hasLegalMoves(state, player) {
  const p = state.players[player];
  // During placement, can always place if pieces in hand
  if (state.phase === PHASE.PLACING && p.piecesInHand > 0) return true;

  const canFly = state.settings.flying && p.piecesOnBoard <= MIN_PIECES_TO_PLAY;
  if (canFly) {
    // Can fly to any empty node
    return ALL_NODES.some(n => state.board[n] === null) &&
           ALL_NODES.some(n => state.board[n] === player);
  }
  // Check if any piece has an adjacent empty node
  return ALL_NODES.some(n => {
    if (state.board[n] !== player) return false;
    return ADJACENCY[n].some(adj => state.board[adj] === null);
  });
}

// ─── Draw Detection ───

function recordPosition(state) {
  if (!state.settings.drawByRepetition) return;
  const key = positionKey(state);
  state.positionHistory[key] = (state.positionHistory[key] || 0) + 1;
}

function positionKey(state) {
  // Board state + whose turn
  const boardStr = ALL_NODES.map(n => state.board[n] || '.').join('');
  return boardStr + ':' + state.turn.player;
}

function checkDrawConditions(state) {
  // Move limit without capture
  if (state.settings.moveLimit && state.movesSinceCapture >= state.settings.moveLimit) {
    return { winner: null, reason: 'move_limit', finalScore: [state.players.p1.piecesLost, state.players.p2.piecesLost] };
  }
  // Threefold repetition
  if (state.settings.drawByRepetition) {
    const key = positionKey(state);
    if ((state.positionHistory[key] || 0) >= 3) {
      return { winner: null, reason: 'repetition', finalScore: [state.players.p1.piecesLost, state.players.p2.piecesLost] };
    }
  }
  return null;
}

// ─── Win / End ───

function declareWinner(state, winner, reason) {
  state.phase = PHASE.FINISHED;
  state.result = {
    winner,
    reason,
    finalScore: [state.players.p1.piecesLost, state.players.p2.piecesLost]
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
