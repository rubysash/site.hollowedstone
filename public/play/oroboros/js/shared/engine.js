// Game engine — full rules implementation
// Used by both server (authoritative) and client (UI hints)

import {
  hexKey, parseHexKey, getRing, isAdjacent, isMoveTowardCenter,
  isCenter, getNeighbors, getAdjacencyMap, getEdge, isOnEdge,
  P1_EDGE, P2_EDGE
} from './board-data.js';

import {
  WIN_SCORE, NORMAL_MOVES, CENTER_MOVES, KO_MEMORY,
  BEATS, PHASE, TURN_PHASE, canBeat, ownsRole, getPlayerRoleIds
} from './constants.js';

// ─── Game Creation ───

export function createGame(accessCode, theme) {
  return {
    id: `game:${accessCode}`,
    accessCode,
    theme: theme.id,
    themeData: theme,
    phase: PHASE.WAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    players: {
      p1: { token: null, name: theme.players.p1.name, split: null, score: 0, holding: [] },
      p2: { token: null, name: theme.players.p2.name, split: null, score: 0, holding: [] }
    },

    board: {},    // hexKey -> { id, owner, role }
    stoneSeq: 0, // counter for stone IDs
    requests: 0, // total API requests for this game (polls + actions)

    turn: {
      player: 'p1',
      movesLeft: 0,
      movesThisTurn: [],
      displacementsThisTurn: 0,
      turnPhase: TURN_PHASE.NORMAL
    },

    koHistory: {},  // stoneId -> [hexKey, hexKey] (most recent first)

    setup: {
      p1SplitChosen: false,
      p2SplitChosen: false,
      placementTurn: 'p1',
      p1Placed: 0,
      p2Placed: 0
    },

    log: [],
    logSeq: 0,
    result: null
  };
}

// ─── Setup: Split Selection ───

export function chooseSplit(state, player, roleACount) {
  // roleACount is how many of their first role (role1 for p1, role2 for p2)
  // must be 2 or 3 (the other role gets 5 - roleACount)
  if (state.phase !== PHASE.SPLITS && state.phase !== PHASE.WAITING) {
    return { error: 'Not in split selection phase' };
  }
  if (roleACount !== 2 && roleACount !== 3) {
    return { error: 'Must choose 2 or 3' };
  }

  const setupKey = player === 'p1' ? 'p1SplitChosen' : 'p2SplitChosen';
  if (state.setup[setupKey]) {
    return { error: 'Split already chosen' };
  }

  const theme = state.themeData;
  const [roleA, roleB] = getPlayerRoleIds(player, theme);
  state.players[player].split = { [roleA]: roleACount, [roleB]: 5 - roleACount };
  state.setup[setupKey] = true;

  addLog(state, player, 'split', null, null, null, { split: state.players[player].split });

  // Both chosen? Move to placement
  if (state.setup.p1SplitChosen && state.setup.p2SplitChosen) {
    state.phase = PHASE.PLACING;
    state.setup.placementTurn = 'p1';
  } else {
    state.phase = PHASE.SPLITS;
  }

  state.updatedAt = new Date().toISOString();
  return { ok: true };
}

// ─── Setup: Stone Placement ───

export function placeStone(state, player, q, r, role) {
  if (state.phase !== PHASE.PLACING) {
    return { error: 'Not in placement phase' };
  }
  if (state.setup.placementTurn !== player) {
    return { error: 'Not your turn to place' };
  }

  const theme = state.themeData;
  if (!ownsRole(player, role, theme)) {
    return { error: 'You do not control that role' };
  }

  // Check role count against split
  const split = state.players[player].split;
  const placedOfRole = Object.values(state.board)
    .filter(s => s.owner === player && s.role === role).length;
  if (placedOfRole >= (split[role] || 0)) {
    return { error: `Already placed all ${split[role]} ${role} stones` };
  }

  // Must be on player's edge
  if (!isOnEdge(q, r, player)) {
    return { error: 'Must place on your starting edge' };
  }

  // Must be empty
  const key = hexKey(q, r);
  if (state.board[key]) {
    return { error: 'Hex is occupied' };
  }

  // Place stone
  const stoneId = `${player}_${state.stoneSeq++}`;
  state.board[key] = { id: stoneId, owner: player, role };

  const placedKey = player === 'p1' ? 'p1Placed' : 'p2Placed';
  state.setup[placedKey]++;

  addLog(state, player, 'place', null, key, role, null);

  // Alternate placement turns
  const otherPlayer = player === 'p1' ? 'p2' : 'p1';
  const otherPlacedKey = otherPlayer === 'p1' ? 'p1Placed' : 'p2Placed';

  if (state.setup.p1Placed >= 5 && state.setup.p2Placed >= 5) {
    // All placed, P2 gets free move
    state.phase = PHASE.FREE_MOVE;
    state.turn = {
      player: 'p2',
      movesLeft: 1,
      movesThisTurn: [],
      displacementsThisTurn: 0,
      turnPhase: TURN_PHASE.NORMAL
    };
  } else {
    // Strict alternation: P1, P2, P1, P2, ...
    state.setup.placementTurn = otherPlayer;
  }

  state.updatedAt = new Date().toISOString();
  return { ok: true };
}

// ─── Gameplay: Move / Displace / Restore ───

export function makeMove(state, player, fromKey, toKey, restoreRole) {
  if (state.phase !== PHASE.PLAY && state.phase !== PHASE.FREE_MOVE) {
    return { error: 'Game is not in play phase' };
  }
  if (state.turn.player !== player) {
    return { error: 'Not your turn' };
  }
  if (state.turn.movesLeft <= 0) {
    return { error: 'No moves left this turn' };
  }

  const theme = state.themeData;
  const isRestore = fromKey === 'holding';

  // ─── Restoration ───
  if (isRestore) {
    return doRestore(state, player, toKey, restoreRole, theme);
  }

  // ─── Normal move or displacement ───
  const from = parseHexKey(fromKey);
  const to = parseHexKey(toKey);
  const stone = state.board[fromKey];

  if (!stone) return { error: 'No stone at origin' };
  if (stone.owner !== player) return { error: 'Not your stone' };
  if (isCenter(from.q, from.r)) return { error: 'Center stone is locked' };
  if (!isAdjacent(from.q, from.r, to.q, to.r)) return { error: 'Not adjacent' };

  // Ko check
  const stoneKo = state.koHistory[stone.id] || [];
  if (stoneKo.includes(toKey)) {
    return { error: 'Ko rule: cannot return to recent position' };
  }

  const target = state.board[toKey];

  if (target) {
    // Displacement attempt
    if (target.owner === player) return { error: 'Cannot displace your own stone' };

    // Berserker: max 1 displacement per turn
    if (state.turn.turnPhase === TURN_PHASE.BERSERKER && state.turn.displacementsThisTurn >= 1) {
      return { error: 'Berserker turn: only 1 capture allowed' };
    }

    // Check displacement legality
    const onCenter = isCenter(to.q, to.r);
    const attackerOnCenter = isCenter(from.q, from.r); // shouldn't happen (locked), but safety
    if (!onCenter && !attackerOnCenter && !canBeat(stone.role, target.role)) {
      return { error: `${stone.role} cannot displace ${target.role}` };
    }

    // Displacement succeeds
    const opponent = player === 'p1' ? 'p2' : 'p1';
    state.players[opponent].holding.push({ id: target.id, role: target.role });
    state.players[player].score++;
    state.turn.displacementsThisTurn++;

    delete state.board[toKey];
    // Clear Ko history for displaced stone
    delete state.koHistory[target.id];

    addLog(state, player, 'displace', fromKey, toKey, stone.role, { displaced: target.role, score: state.players[player].score });

    // Check win
    if (state.players[player].score >= WIN_SCORE) {
      state.result = {
        winner: player,
        reason: 'score',
        finalScore: [state.players.p1.score, state.players.p2.score]
      };
      state.phase = PHASE.FINISHED;
    }
  } else {
    // Normal move — partnership check
    if (state.turn.turnPhase !== TURN_PHASE.BERSERKER) {
      if (isMoveTowardCenter(from.q, from.r, to.q, to.r)) {
        if (!hasAdjacentFriendly(state, from.q, from.r, player)) {
          return { error: 'Shield wall: must be adjacent to a friendly stone to advance' };
        }
      }
    }

    addLog(state, player, 'move', fromKey, toKey, stone.role, null);
  }

  // Move the stone
  updateKoHistory(state, stone.id, fromKey);
  state.board[toKey] = stone;
  delete state.board[fromKey];

  state.turn.movesThisTurn.push({ from: fromKey, to: toKey });
  state.turn.movesLeft--;

  // End of turn?
  if (state.turn.movesLeft <= 0 && state.phase !== PHASE.FINISHED) {
    endTurn(state);
  }

  state.updatedAt = new Date().toISOString();
  return { ok: true };
}

function doRestore(state, player, toKey, restoreRole, theme) {
  const holding = state.players[player].holding;
  if (holding.length === 0) {
    return { error: 'No stones in holding' };
  }

  // Find stone of requested role in holding
  const idx = holding.findIndex(s => s.role === restoreRole);
  if (idx === -1) {
    return { error: `No ${restoreRole} stone in holding` };
  }

  const to = parseHexKey(toKey);
  if (!isOnEdge(to.q, to.r, player)) {
    return { error: 'Must restore to your starting edge' };
  }
  if (state.board[toKey]) {
    return { error: 'Hex is occupied' };
  }

  // Restore
  const restored = holding.splice(idx, 1)[0];
  state.board[toKey] = { id: restored.id, owner: player, role: restored.role };

  addLog(state, player, 'restore', 'holding', toKey, restored.role, null);

  state.turn.movesThisTurn.push({ from: 'holding', to: toKey });
  state.turn.movesLeft--;

  if (state.turn.movesLeft <= 0 && state.phase !== PHASE.FINISHED) {
    endTurn(state);
  }

  state.updatedAt = new Date().toISOString();
  return { ok: true };
}

// ─── Turn Management ───

function endTurn(state) {
  if (state.phase === PHASE.FREE_MOVE) {
    // Free move done, start real play
    state.phase = PHASE.PLAY;
    state.turn = buildTurn(state, 'p1');
    return;
  }

  const nextPlayer = state.turn.player === 'p1' ? 'p2' : 'p1';
  state.turn = buildTurn(state, nextPlayer);
}

function buildTurn(state, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';

  // Does this player hold center?
  const centerStone = state.board[hexKey(0, 0)];
  const playerHoldsCenter = centerStone && centerStone.owner === player;
  const opponentHoldsCenter = centerStone && centerStone.owner === opponent;

  let movesLeft = NORMAL_MOVES;
  let turnPhase = TURN_PHASE.NORMAL;

  if (playerHoldsCenter) {
    movesLeft = CENTER_MOVES;
    turnPhase = TURN_PHASE.HOLDING;
  } else if (opponentHoldsCenter) {
    turnPhase = TURN_PHASE.BERSERKER;
  }

  return {
    player,
    movesLeft,
    movesThisTurn: [],
    displacementsThisTurn: 0,
    turnPhase
  };
}

// ─── Helpers ───

function hasAdjacentFriendly(state, q, r, player) {
  const neighbors = getNeighbors(q, r);
  return neighbors.some(n => {
    const stone = state.board[hexKey(n.q, n.r)];
    return stone && stone.owner === player;
  });
}

function updateKoHistory(state, stoneId, fromKey) {
  if (!state.koHistory[stoneId]) {
    state.koHistory[stoneId] = [];
  }
  state.koHistory[stoneId].unshift(fromKey);
  if (state.koHistory[stoneId].length > KO_MEMORY) {
    state.koHistory[stoneId].pop();
  }
}

function addLog(state, player, action, from, to, role, extra) {
  state.logSeq++;
  state.log.push({
    seq: state.logSeq,
    player,
    action,
    from,
    to,
    role,
    extra,
    timestamp: new Date().toISOString()
  });
}

// ─── Valid Moves (for client UI) ───

export function getValidMoves(state, player, fromKey) {
  if (state.turn.player !== player || state.turn.movesLeft <= 0) return [];
  if (state.phase !== PHASE.PLAY && state.phase !== PHASE.FREE_MOVE) return [];

  const theme = state.themeData;

  // Restoration moves
  if (fromKey === 'holding') {
    const edge = getEdge(player);
    return edge
      .filter(h => !state.board[hexKey(h.q, h.r)])
      .map(h => hexKey(h.q, h.r));
  }

  const from = parseHexKey(fromKey);
  const stone = state.board[fromKey];
  if (!stone || stone.owner !== player) return [];
  if (isCenter(from.q, from.r)) return []; // locked

  const neighbors = getNeighbors(from.q, from.r);
  const valid = [];

  for (const n of neighbors) {
    const nKey = hexKey(n.q, n.r);
    const target = state.board[nKey];

    // Ko check
    const stoneKo = state.koHistory[stone.id] || [];
    if (stoneKo.includes(nKey)) continue;

    if (target) {
      // Displacement?
      if (target.owner === player) continue; // friendly
      if (state.turn.turnPhase === TURN_PHASE.BERSERKER && state.turn.displacementsThisTurn >= 1) continue;

      const onCenter = isCenter(n.q, n.r);
      if (!onCenter && !isCenter(from.q, from.r) && !canBeat(stone.role, target.role)) continue;

      valid.push(nKey);
    } else {
      // Empty hex — partnership check
      if (state.turn.turnPhase !== TURN_PHASE.BERSERKER) {
        if (isMoveTowardCenter(from.q, from.r, n.q, n.r)) {
          if (!hasAdjacentFriendly(state, from.q, from.r, player)) continue;
        }
      }
      valid.push(nKey);
    }
  }

  return valid;
}

export function getSelectableStones(state, player) {
  if (state.turn.player !== player || state.turn.movesLeft <= 0) return [];
  if (state.phase !== PHASE.PLAY && state.phase !== PHASE.FREE_MOVE) return [];

  const selectable = [];

  // Board stones
  for (const [key, stone] of Object.entries(state.board)) {
    if (stone.owner !== player) continue;
    if (isCenter(parseHexKey(key).q, parseHexKey(key).r)) continue; // locked
    if (getValidMoves(state, player, key).length > 0) {
      selectable.push(key);
    }
  }

  // Holding stones (restoration)
  if (state.players[player].holding.length > 0) {
    const edgeMoves = getValidMoves(state, player, 'holding');
    if (edgeMoves.length > 0) {
      selectable.push('holding');
    }
  }

  return selectable;
}

// ─── State sanitization (hide opponent's secret info) ───

export function sanitizeForPlayer(state, player) {
  const copy = JSON.parse(JSON.stringify(state));

  // Remove tokens
  delete copy.players.p1.token;
  delete copy.players.p2.token;

  // During splits, hide opponent's split
  if (copy.phase === PHASE.SPLITS || copy.phase === PHASE.WAITING) {
    const opponent = player === 'p1' ? 'p2' : 'p1';
    if (copy.players[opponent].split) {
      copy.players[opponent].split = 'chosen';
    }
    // Also hide split log entries
    copy.log = copy.log.filter(e => !(e.action === 'split' && e.player !== player));
  }

  // Remove themeData from response (client loads it separately)
  delete copy.themeData;

  return copy;
}
