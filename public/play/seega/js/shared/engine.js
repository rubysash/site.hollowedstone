// Seega -- authoritative game engine

import { ALL_NODES, ADJACENCY, DIRECTIONS, fileIndex, rankIndex, nodeAt,
         getInitialBoard } from './board-data.js';
import { PIECES_PER_PLAYER, PIECES_PER_PLACEMENT_TURN, DEFAULT_MOVE_LIMIT,
         CENTER, PHASE, ACTION } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'seega',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'Dark', title: 'Dark', captured: 0, piecesLeft: PIECES_PER_PLAYER, placed: 0 },
      p2: { token: null, ip: null, name: 'Light', title: 'Light', captured: 0, piecesLeft: PIECES_PER_PLAYER, placed: 0 }
    },
    board: getInitialBoard(),
    turn: { player: 'p1', action: ACTION.PLACE, placedThisTurn: 0 },
    settings: {
      moveLimit: DEFAULT_MOVE_LIMIT,
      drawByRepetition: true
    },
    movesSinceCapture: 0,
    positionHistory: {},
    firstMoveMade: false,
    log: [],
    logSeq: 0,
    result: null,
    requests: 0
  };
}

// --- Placement Phase ---

export function placePiece(state, player, node) {
  if (state.phase !== PHASE.PLACING) return { error: 'Not in placement phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (!ALL_NODES.includes(node)) return { error: 'Invalid square' };
  if (node === CENTER) return { error: 'Cannot place on the center square' };
  if (state.board[node] !== null) return { error: 'Square is occupied' };

  state.board[node] = player;
  state.players[player].placed++;
  state.turn.placedThisTurn++;
  state.updatedAt = new Date().toISOString();

  addLog(state, { action: 'place', player, node });

  // Check if this player has placed 2 this turn
  if (state.turn.placedThisTurn >= PIECES_PER_PLACEMENT_TURN) {
    const opponent = player === 'p1' ? 'p2' : 'p1';
    state.turn.placedThisTurn = 0;

    // Check if all pieces are placed
    const totalPlaced = state.players.p1.placed + state.players.p2.placed;
    if (totalPlaced >= PIECES_PER_PLAYER * 2) {
      // Transition to movement phase. Player 2 moves first.
      state.phase = PHASE.PLAYING;
      state.turn.player = 'p2';
      state.turn.action = ACTION.MOVE;
      state.firstMoveMade = false;
    } else {
      state.turn.player = opponent;
    }
  }

  return { ok: true };
}

// --- Movement Phase ---

export function makeMove(state, player, from, to) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in movement phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };
  if (!ALL_NODES.includes(from) || !ALL_NODES.includes(to)) return { error: 'Invalid square' };
  if (state.board[from] !== player) return { error: 'Not your piece' };
  if (!ADJACENCY[from].includes(to)) return { error: 'Not adjacent (one step orthogonal only)' };
  if (state.board[to] !== null) return { error: 'Target is occupied' };

  // First move of movement phase: p2 must move to center
  if (!state.firstMoveMade) {
    if (to !== CENTER) return { error: 'First move must be to the center square' };
    state.firstMoveMade = true;
  }

  const opponent = player === 'p1' ? 'p2' : 'p1';

  // Execute the move
  state.board[from] = null;
  state.board[to] = player;
  state.updatedAt = new Date().toISOString();

  // Check for captures
  const captured = findCaptures(state.board, to, player, opponent);
  for (const cap of captured) {
    state.board[cap] = null;
    state.players[player].captured++;
    state.players[opponent].piecesLeft--;
  }

  if (captured.length > 0) {
    state.movesSinceCapture = 0;
  } else {
    state.movesSinceCapture++;
  }

  addLog(state, {
    action: 'move', player, from, to,
    captured: captured.length > 0 ? captured.slice() : undefined
  });

  // Check win: all opponent pieces captured
  if (state.players[opponent].piecesLeft <= 0) {
    declareWinner(state, player, 'elimination');
    return { ok: true, finished: true };
  }

  // Switch turn
  state.turn.player = opponent;

  // Check if opponent has any legal moves
  if (!hasAnyLegalMove(state, opponent)) {
    declareWinner(state, player, 'blocked');
    return { ok: true, finished: true };
  }

  // Check draw conditions
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

// --- Capture Detection ---

function findCaptures(board, movedTo, player, opponent) {
  const captured = [];
  const fi = fileIndex(movedTo);
  const ri = rankIndex(movedTo);

  for (const [df, dr] of DIRECTIONS) {
    const adjNode = nodeAt(fi + df, ri + dr);
    if (!adjNode) continue;
    if (board[adjNode] !== opponent) continue;
    if (adjNode === CENTER) continue; // center square is safe

    // Check the square beyond the opponent piece
    const beyondNode = nodeAt(fi + df * 2, ri + dr * 2);
    if (!beyondNode) continue;
    if (board[beyondNode] === player) {
      captured.push(adjNode);
    }
  }

  return captured;
}

// --- Legal Move Queries (for UI) ---

export function getValidPlacements(state) {
  if (state.phase !== PHASE.PLACING) return [];
  return ALL_NODES.filter(n => n !== CENTER && state.board[n] === null);
}

export function getLegalMoves(state, player, from) {
  if (state.board[from] !== player) return [];
  const moves = ADJACENCY[from].filter(n => state.board[n] === null);

  // First move constraint: must go to center
  if (!state.firstMoveMade && player === 'p2') {
    return moves.filter(n => n === CENTER);
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
    if (ADJACENCY[node].some(n => state.board[n] === null)) return true;
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
  // Move limit: after N moves with no capture, player with more pieces wins
  if (state.settings.moveLimit && state.movesSinceCapture >= state.settings.moveLimit) {
    const p1 = state.players.p1.piecesLeft;
    const p2 = state.players.p2.piecesLeft;
    if (p1 > p2) {
      return { winner: 'p1', reason: 'move_limit',
        finalScore: [state.players.p1.captured, state.players.p2.captured] };
    } else if (p2 > p1) {
      return { winner: 'p2', reason: 'move_limit',
        finalScore: [state.players.p1.captured, state.players.p2.captured] };
    }
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
