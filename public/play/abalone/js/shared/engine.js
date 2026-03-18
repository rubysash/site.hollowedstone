// Abalone -- authoritative game engine

import { ALL_NODES, DIRECTIONS, getNeighbor, getDirectionBetween, getGroupAxis,
         orderGroup, oppositeDir, getInitialBoard } from './board-data.js';
import { MARBLES_PER_PLAYER, ELIMINATION_TARGET, DEFAULT_MOVE_LIMIT, MAX_GROUP_SIZE, PHASE } from './constants.js';

// --- Game Creation ---

export function createGame(accessCode) {
  return {
    id: accessCode,
    accessCode,
    game: 'abalone',
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: {
      p1: { token: null, ip: null, name: 'Black', title: 'Black', eliminated: 0 },
      p2: { token: null, ip: null, name: 'White', title: 'White', eliminated: 0 }
    },
    board: getInitialBoard(),
    turn: { player: 'p1' },
    settings: {
      drawByRepetition: true,
      moveLimit: DEFAULT_MOVE_LIMIT
    },
    movesSinceElimination: 0,
    positionHistory: {},
    log: [],
    logSeq: 0,
    result: null,
    requests: 0
  };
}

// --- Main Move Function ---
// marbles: array of 1-3 node labels
// direction: direction index 0-5

export function makeMove(state, player, marbles, direction) {
  if (state.phase !== PHASE.PLAYING) return { error: 'Not in playing phase' };
  if (state.turn.player !== player) return { error: 'Not your turn' };

  // Validate marbles
  if (!Array.isArray(marbles) || marbles.length < 1 || marbles.length > MAX_GROUP_SIZE) {
    return { error: 'Must move 1 to 3 marbles' };
  }
  for (const m of marbles) {
    if (!ALL_NODES.includes(m)) return { error: `Invalid node: ${m}` };
    if (state.board[m] !== player) return { error: `Not your marble: ${m}` };
  }
  if (new Set(marbles).size !== marbles.length) return { error: 'Duplicate marbles' };

  // Validate direction
  if (direction < 0 || direction > 5) return { error: 'Invalid direction' };

  // Validate group alignment
  if (marbles.length > 1) {
    const axis = getGroupAxis(marbles);
    if (axis === null) return { error: 'Marbles are not aligned in a line' };
  }

  const opponent = player === 'p1' ? 'p2' : 'p1';
  const ordered = orderGroup(marbles);

  // Determine inline vs broadside
  let isInline = false;
  if (marbles.length === 1) {
    isInline = true;
  } else {
    // Group axis direction
    const axisDir = getDirectionBetween(ordered[0], ordered[1]);
    const axisOpposite = oppositeDir(axisDir);
    isInline = (direction === axisDir || direction === axisOpposite);
  }

  if (isInline) {
    return executeInlineMove(state, player, opponent, ordered, direction);
  } else {
    return executeBroadsideMove(state, player, ordered, direction);
  }
}

// --- Inline Move ---

function executeInlineMove(state, player, opponent, ordered, direction) {
  // Find the lead marble (front of the group in the movement direction)
  const lead = getLeadMarble(ordered, direction);
  const ahead = getNeighbor(lead, direction);

  // Simple slide: space ahead is empty and on-board
  if (ahead && state.board[ahead] === null) {
    return doInlineSlide(state, player, ordered, direction);
  }

  // Space ahead is off-board with nothing to push
  if (!ahead) {
    return { error: 'Cannot move off the board' };
  }

  // Space ahead has a friendly marble
  if (state.board[ahead] === player) {
    return { error: 'Blocked by your own marble' };
  }

  // Space ahead has an opponent marble: attempt Sumito
  return executeSumito(state, player, opponent, ordered, direction, ahead);
}

function getLeadMarble(ordered, direction) {
  if (ordered.length === 1) return ordered[0];
  // Check if the direction goes from first to last or last to first
  const dirFromFirst = getDirectionBetween(ordered[0], ordered[1]);
  if (dirFromFirst === direction) {
    return ordered[ordered.length - 1]; // moving in the axis direction, last is lead
  }
  return ordered[0]; // moving opposite, first is lead
}

function doInlineSlide(state, player, ordered, direction) {
  // Move marbles: start from the lead end to avoid overwriting
  const dirFromFirst = ordered.length > 1 ? getDirectionBetween(ordered[0], ordered[1]) : direction;
  const movingForward = (dirFromFirst === direction);

  // Clear all current positions
  for (const m of ordered) state.board[m] = null;
  // Place in new positions
  for (const m of ordered) {
    const dest = getNeighbor(m, direction);
    state.board[dest] = player;
  }

  state.movesSinceElimination++;
  state.updatedAt = new Date().toISOString();

  addLog(state, {
    action: 'move', player,
    marbles: ordered.slice(),
    direction,
    type: 'inline'
  });

  return finishTurn(state, player);
}

function executeSumito(state, player, opponent, ordered, direction, firstOpponent) {
  // Count consecutive opponent marbles in the push direction
  const pushed = [];
  let current = firstOpponent;
  while (current && state.board[current] === opponent) {
    pushed.push(current);
    current = getNeighbor(current, direction);
  }

  // Check numerical superiority
  if (pushed.length >= ordered.length) {
    return { error: 'Need numerical superiority to push' };
  }

  // Check what is behind the opponent chain
  // current is now either null (off-board), empty, or another marble
  if (current && state.board[current] !== null) {
    return { error: 'Cannot push: blocked behind opponent marbles' };
  }

  // Execute the push
  const eliminated = (current === null); // pushed off the board

  // Move opponent marbles (from farthest to nearest to avoid overwrite)
  if (eliminated) {
    // Last opponent marble falls off
    const lastPushed = pushed[pushed.length - 1];
    state.board[lastPushed] = null;
    state.players[player].eliminated++;
    state.movesSinceElimination = 0;

    // Shift remaining pushed marbles
    for (let i = pushed.length - 2; i >= 0; i--) {
      const dest = getNeighbor(pushed[i], direction);
      state.board[dest] = opponent;
      state.board[pushed[i]] = null;
    }
  } else {
    // Shift all pushed marbles one step (from farthest to nearest)
    for (let i = pushed.length - 1; i >= 0; i--) {
      const dest = getNeighbor(pushed[i], direction);
      state.board[dest] = opponent;
      state.board[pushed[i]] = null;
    }
    state.movesSinceElimination++;
  }

  // Move own marbles
  for (const m of ordered) state.board[m] = null;
  for (const m of ordered) {
    const dest = getNeighbor(m, direction);
    state.board[dest] = player;
  }

  state.updatedAt = new Date().toISOString();

  addLog(state, {
    action: 'push', player,
    marbles: ordered.slice(),
    direction,
    pushed: pushed.slice(),
    eliminated: eliminated || undefined
  });

  // Check win
  if (state.players[player].eliminated >= ELIMINATION_TARGET) {
    declareWinner(state, player, 'elimination');
    return { ok: true, finished: true };
  }

  return finishTurn(state, player);
}

// --- Broadside Move ---

function executeBroadsideMove(state, player, ordered, direction) {
  // Check all destinations are empty and on-board
  for (const m of ordered) {
    const dest = getNeighbor(m, direction);
    if (!dest) return { error: 'Cannot move off the board (broadside)' };
    if (state.board[dest] !== null && !ordered.includes(dest)) {
      return { error: 'Broadside blocked: destination not empty' };
    }
  }

  // Execute: clear then place (handles case where destinations overlap with sources)
  const moves = ordered.map(m => ({ from: m, to: getNeighbor(m, direction) }));
  for (const mv of moves) state.board[mv.from] = null;
  for (const mv of moves) state.board[mv.to] = player;

  state.movesSinceElimination++;
  state.updatedAt = new Date().toISOString();

  addLog(state, {
    action: 'move', player,
    marbles: ordered.slice(),
    direction,
    type: 'broadside'
  });

  return finishTurn(state, player);
}

// --- Post-move ---

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

export function getSelectableMarbles(state, player) {
  // All marbles that belong to the player
  return ALL_NODES.filter(n => state.board[n] === player);
}

// Given selected marbles, return valid groups they can extend to
export function getExtendableNeighbors(state, player, selected) {
  if (selected.length >= MAX_GROUP_SIZE) return [];
  if (selected.length === 0) return [];

  const neighbors = new Set();
  for (const m of selected) {
    for (let d = 0; d < 6; d++) {
      const n = getNeighbor(m, d);
      if (n && state.board[n] === player && !selected.includes(n)) {
        // Check if adding this node still forms a valid line
        const test = [...selected, n];
        if (test.length <= 2 || getGroupAxis(test) !== null) {
          neighbors.add(n);
        }
      }
    }
  }
  return [...neighbors];
}

// Given a valid group, return all valid direction indices
export function getValidDirections(state, player, marbles) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const ordered = orderGroup(marbles);
  const valid = [];

  for (let dir = 0; dir < 6; dir++) {
    // Determine inline vs broadside
    let isInline = false;
    if (marbles.length === 1) {
      isInline = true;
    } else {
      const axisDir = getDirectionBetween(ordered[0], ordered[1]);
      const axisOpp = oppositeDir(axisDir);
      isInline = (dir === axisDir || dir === axisOpp);
    }

    if (isInline) {
      const lead = getLeadMarble(ordered, dir);
      const ahead = getNeighbor(lead, dir);
      if (!ahead) continue; // off-board
      if (state.board[ahead] === null) { valid.push(dir); continue; }
      if (state.board[ahead] === player) continue; // blocked by own

      // Sumito check
      const pushed = [];
      let cur = ahead;
      while (cur && state.board[cur] === opponent) {
        pushed.push(cur);
        cur = getNeighbor(cur, dir);
      }
      if (pushed.length >= ordered.length) continue; // no superiority
      if (cur && state.board[cur] !== null) continue; // blocked behind
      valid.push(dir);
    } else {
      // Broadside: all destinations must be empty and on-board
      let ok = true;
      for (const m of ordered) {
        const dest = getNeighbor(m, dir);
        if (!dest) { ok = false; break; }
        if (state.board[dest] !== null && !ordered.includes(dest)) { ok = false; break; }
      }
      if (ok) valid.push(dir);
    }
  }
  return valid;
}

// Get the destination nodes for a move (for highlighting)
export function getMoveDestinations(marbles, direction) {
  return marbles.map(m => getNeighbor(m, direction)).filter(Boolean);
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
  if (state.settings.moveLimit && state.movesSinceElimination >= state.settings.moveLimit) {
    return { winner: null, reason: 'move_limit',
      finalScore: [state.players.p1.eliminated, state.players.p2.eliminated] };
  }
  if (state.settings.drawByRepetition) {
    const key = positionKey(state);
    if ((state.positionHistory[key] || 0) >= 3) {
      return { winner: null, reason: 'repetition',
        finalScore: [state.players.p1.eliminated, state.players.p2.eliminated] };
    }
  }
  return null;
}

// --- Win / End ---

function declareWinner(state, winner, reason) {
  state.phase = PHASE.FINISHED;
  state.result = {
    winner, reason,
    finalScore: [state.players.p1.eliminated, state.players.p2.eliminated]
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
