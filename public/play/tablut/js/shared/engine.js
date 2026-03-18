// Tablut -- authoritative game engine

import { ALL_NODES, ADJACENCY, DIRECTIONS, fileIndex, rankIndex, nodeAt,
         getReachable, getInitialBoard, isHostile } from './board-data.js';
import { BOARD_SIZE, THRONE, CORNERS, PHASE } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'tablut',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'Attackers', title: 'Attackers', captured: 0 },
      p2: { token: null, ip: null, name: 'Defenders', title: 'Defenders', captured: 0 }
    },
    board: getInitialBoard(),
    turn: { player: 'p1' }, // Attackers move first
    settings: {
      drawByRepetition: true,
      kingArmed: false,
      edgeEscape: false
    },
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

  const piece = state.board[from];
  if (!piece) return { error: 'No piece there' };

  // Check ownership
  const isKing = piece === 'king';
  if (player === 'p1' && piece !== 'p1') return { error: 'Not your piece' };
  if (player === 'p2' && piece !== 'p2' && piece !== 'king') return { error: 'Not your piece' };

  // Check the move is valid (rook movement, no jumping, restricted squares)
  const reachable = getReachable(state.board, from, isKing);
  if (!reachable.includes(to)) return { error: 'Cannot move there' };

  const opponent = player === 'p1' ? 'p2' : 'p1';

  // Execute the move
  state.board[from] = null;
  state.board[to] = piece;
  state.updatedAt = new Date().toISOString();

  // Check for king escape (defender win)
  if (isKing && CORNERS.includes(to)) {
    addLog(state, { action: 'move', player, from, to, piece: 'king' });
    declareWinner(state, 'p2', 'escape');
    return { ok: true, finished: true };
  }

  // Edge escape variant
  if (isKing && state.settings.edgeEscape) {
    const fi = fileIndex(to);
    const ri = rankIndex(to);
    if (fi === 0 || fi === 8 || ri === 0 || ri === 8) {
      addLog(state, { action: 'move', player, from, to, piece: 'king' });
      declareWinner(state, 'p2', 'escape');
      return { ok: true, finished: true };
    }
  }

  // Check for captures
  const captured = findCaptures(state, to, player);
  for (const cap of captured) {
    const wasPiece = state.board[cap];
    state.board[cap] = null;
    state.players[player].captured++;

    // King captured = attacker wins
    if (wasPiece === 'king') {
      addLog(state, { action: 'move', player, from, to, piece, captured: captured.slice() });
      declareWinner(state, 'p1', 'king_captured');
      return { ok: true, finished: true };
    }
  }

  addLog(state, {
    action: 'move', player, from, to, piece,
    captured: captured.length > 0 ? captured.slice() : undefined
  });

  // Switch turn
  state.turn.player = opponent;

  // Check if opponent has any legal moves
  if (!hasAnyLegalMove(state, opponent)) {
    // No legal moves = draw
    state.phase = PHASE.FINISHED;
    state.result = { winner: null, reason: 'stalemate',
      finalScore: [state.players.p1.captured, state.players.p2.captured] };
    addLog(state, { action: 'draw', reason: 'stalemate' });
    return { ok: true, finished: true };
  }

  // Check repetition draw
  recordPosition(state);
  const drawResult = checkDrawConditions(state);
  if (drawResult) {
    state.phase = PHASE.FINISHED;
    state.result = drawResult;
    addLog(state, { action: 'draw', reason: drawResult.reason });
    return { ok: true, finished: true };
  }

  // Detect raichi/tuichi (king threat status) for UI
  const threats = countKingEscapeRoutes(state);
  if (threats >= 2) {
    state.turn.threat = 'tuichi';
  } else if (threats === 1) {
    state.turn.threat = 'raichi';
  } else {
    state.turn.threat = null;
  }

  return { ok: true };
}

// --- Capture Detection ---

function findCaptures(state, movedTo, player) {
  const captured = [];
  const board = state.board;
  const fi = fileIndex(movedTo);
  const ri = rankIndex(movedTo);

  for (const [df, dr] of DIRECTIONS) {
    const adjNode = nodeAt(fi + df, ri + dr);
    if (!adjNode) continue;
    const adjPiece = board[adjNode];
    if (!adjPiece) continue;

    // Is the adjacent piece an enemy?
    const isEnemy = isEnemyOf(adjPiece, player);
    if (!isEnemy) continue;

    // Special king capture rules
    if (adjPiece === 'king') {
      if (isKingCaptured(state, adjNode, player)) {
        captured.push(adjNode);
      }
      continue;
    }

    // Standard custodian capture: check the square on the other side
    const behindNode = nodeAt(fi + df * 2, ri + dr * 2);
    if (!behindNode) continue;

    const behindPiece = board[behindNode];
    const behindIsFriendly = isFriendlyTo(behindPiece, player, state.settings.kingArmed);
    const behindIsHostile = isHostile(behindNode, board);

    if (behindIsFriendly || behindIsHostile) {
      captured.push(adjNode);
    }
  }

  return captured;
}

function isKingCaptured(state, kingNode, attackingPlayer) {
  // Only attackers (p1) can capture the king
  if (attackingPlayer !== 'p1') return false;

  const board = state.board;
  const fi = fileIndex(kingNode);
  const ri = rankIndex(kingNode);

  // King on throne: must be surrounded on all 4 sides by attackers
  if (kingNode === THRONE) {
    for (const [df, dr] of DIRECTIONS) {
      const adj = nodeAt(fi + df, ri + dr);
      if (!adj || board[adj] !== 'p1') return false;
    }
    return true;
  }

  // King adjacent to throne: must be surrounded on 3 non-throne sides by attackers,
  // and the throne side counts as hostile (if empty)
  const adjToThrone = ADJACENCY[kingNode].includes(THRONE);
  if (adjToThrone) {
    for (const [df, dr] of DIRECTIONS) {
      const adj = nodeAt(fi + df, ri + dr);
      if (!adj) return false; // should not happen on a 9x9 board interior
      if (adj === THRONE) {
        // Throne acts as 4th side (hostile when empty)
        if (board[adj] !== null && board[adj] !== 'p1') return false;
        continue;
      }
      if (board[adj] !== 'p1') return false;
    }
    return true;
  }

  // King elsewhere: standard custodian capture (2 attackers on opposite sides)
  // Check if the move that just happened creates a sandwich
  for (const [df, dr] of DIRECTIONS) {
    const side1 = nodeAt(fi + df, ri + dr);
    const side2 = nodeAt(fi - df, ri - dr);
    if (!side1 || !side2) continue;
    const s1 = board[side1];
    const s2 = board[side2];
    const s1ok = s1 === 'p1' || isHostile(side1, board);
    const s2ok = s2 === 'p1' || isHostile(side2, board);
    if (s1ok && s2ok) return true;
  }
  return false;
}

function isEnemyOf(piece, player) {
  if (player === 'p1') return piece === 'p2' || piece === 'king';
  if (player === 'p2') return piece === 'p1';
  return false;
}

function isFriendlyTo(piece, player, kingArmed) {
  if (player === 'p1') return piece === 'p1';
  if (player === 'p2') {
    if (piece === 'p2') return true;
    if (piece === 'king' && kingArmed) return true;
  }
  return false;
}

// --- King Escape Routes (Raichi/Tuichi detection) ---

function countKingEscapeRoutes(state) {
  // Find the king
  let kingNode = null;
  for (const node of ALL_NODES) {
    if (state.board[node] === 'king') { kingNode = node; break; }
  }
  if (!kingNode) return 0;

  const targets = state.settings.edgeEscape ? getEdgeSquares() : CORNERS;
  const reachable = getReachable(state.board, kingNode, true);
  let routes = 0;
  for (const t of targets) {
    if (reachable.includes(t)) routes++;
  }
  return routes;
}

function getEdgeSquares() {
  const edges = [];
  for (const node of ALL_NODES) {
    const fi = fileIndex(node);
    const ri = rankIndex(node);
    if (fi === 0 || fi === 8 || ri === 0 || ri === 8) edges.push(node);
  }
  return edges;
}

// --- Legal Move Queries (for UI) ---

export function getLegalMoves(state, player, from) {
  const piece = state.board[from];
  if (!piece) return [];
  if (player === 'p1' && piece !== 'p1') return [];
  if (player === 'p2' && piece !== 'p2' && piece !== 'king') return [];
  return getReachable(state.board, from, piece === 'king');
}

export function getSelectablePieces(state, player) {
  const selectable = [];
  for (const node of ALL_NODES) {
    const piece = state.board[node];
    if (!piece) continue;
    if (player === 'p1' && piece !== 'p1') continue;
    if (player === 'p2' && piece !== 'p2' && piece !== 'king') continue;
    if (getReachable(state.board, node, piece === 'king').length > 0) {
      selectable.push(node);
    }
  }
  return selectable;
}

function hasAnyLegalMove(state, player) {
  for (const node of ALL_NODES) {
    const piece = state.board[node];
    if (!piece) continue;
    if (player === 'p1' && piece !== 'p1') continue;
    if (player === 'p2' && piece !== 'p2' && piece !== 'king') continue;
    if (getReachable(state.board, node, piece === 'king').length > 0) return true;
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
