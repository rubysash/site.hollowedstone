// Game controller — ties board, UI, and networking together

import {
  initNet, getPlayer, getAccessCode, getBasePath, pollState, stopPolling, setPollRate,
  triggerBurst, sendSetup, sendMove, saveSession, loadSession, joinGame
} from './net.js';
import { loadTheme, getTheme, getRoleInfo, getObjective } from './themes.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected, showValidTargets, clearHighlights } from './board.js';
import {
  setStatus, setLore, flashLore, updatePlayerPanels, addLogEntries, showWaiting,
  showSplitChoice, showWaitingForSplit, showPlacementInstructions,
  showFreeMove, showGameOver, hideOverlay, showStonePicker
} from './ui.js';
import { getValidMoves, getSelectableStones } from './shared/engine.js';
import { hexKey, parseHexKey, isOnEdge, getEdge } from './shared/board-data.js';
import { getPlayerRoleIds, PHASE } from './shared/constants.js';

let _state = null;
let _selectedHex = null;
let _selectedRole = null; // for placement and restoration
let _lastLogSeq = 0;
let _placementRole = null;

export async function startGame() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) { location.href = getBasePath() + '/'; return; }

  // Try to recover session from URL params first (token in URL), then localStorage
  let session = loadSession(code);
  const urlToken = params.get('token');
  const urlPlayer = params.get('player');
  if (!session && urlToken && urlPlayer) {
    // Session from URL — save it to localStorage for future use
    saveSession(code, urlPlayer, urlToken);
    session = { player: urlPlayer, token: urlToken };
  }

  if (!session) {
    // No session — try to auto-join as Player 2
    session = await tryAutoJoin(code);
    if (!session) return; // tryAutoJoin shows its own UI on failure
  }

  // Strip token from URL bar so it can't be accidentally shared
  if (urlToken) {
    history.replaceState(null, '', `${getBasePath()}/game?code=${code}`);
  }

  // Init networking
  initNet(code, session.token, session.player);

  // Show access code
  const codeEl = document.querySelector('.access-code');
  if (codeEl) codeEl.textContent = code;

  // Init board
  const svg = document.querySelector('svg.board');
  initBoard(svg, onHexClick);

  // Start polling
  pollState(onStateUpdate);
}

async function tryAutoJoin(code) {
  // Attempt to join the game as Player 2
  try {
    const result = await joinGame(code);
    if (result.error) {
      // Game is full or doesn't exist
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:#e0e0e0;font-family:sans-serif;background:#1a1a2e;text-align:center;padding:2rem;">
          <h2>Game ${code}</h2>
          <p style="margin:1rem 0;color:#e74c3c;">${result.error}</p>
          <p style="color:#8888aa;">This game already has two players, or the code is invalid.</p>
          <p style="color:#8888aa;margin-top:0.5rem;">If you were already in this game, try the browser where you originally joined.</p>
          <a href="${getBasePath()}/" style="margin-top:1.5rem;color:#6a0dad;font-size:1.1rem;">Go to Lobby</a>
        </div>`;
      return null;
    }
    // Joined successfully
    saveSession(result.accessCode, result.player, result.token);
    return { player: result.player, token: result.token };
  } catch (e) {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;color:#e0e0e0;font-family:sans-serif;background:#1a1a2e;text-align:center;padding:2rem;">
        <h2>Connection Error</h2>
        <p style="margin:1rem 0;">Could not reach the game server.</p>
        <a href="${getBasePath()}/" style="margin-top:1rem;color:#6a0dad;">Go to Lobby</a>
      </div>`;
    return null;
  }
}

async function onStateUpdate(state) {
  // Load theme on first state
  if (!getTheme() && state.theme) {
    await loadTheme(state.theme);
    // Re-init board with theme
    const svg = document.querySelector('svg.board');
    initBoard(svg, onHexClick);
  }

  const theme = getTheme();
  const prevPhase = _state?.phase;
  _state = state;
  _state.themeData = theme; // attach for engine functions
  const me = state.you;

  // Update board visuals
  updateBoard(state.board, state.turn?.movesThisTurn);
  updatePlayerPanels(state, me);

  // Process new log entries
  if (state.log && state.log.length > 0) {
    const newEntries = state.log.filter(e => e.seq > _lastLogSeq);
    if (newEntries.length > 0) {
      addLogEntries(newEntries);
      _lastLogSeq = newEntries[newEntries.length - 1].seq;

      // Flash capture lore when a displacement happens
      for (const entry of newEntries) {
        if (entry.action === 'displace') {
          flashLore('capture');
        }
      }
    }
  }

  // Only hide overlays on phase transitions (not every poll tick)
  const phaseChanged = prevPhase !== state.phase;
  if (phaseChanged && state.phase !== PHASE.WAITING) {
    hideOverlay();
  }

  // Adaptive polling — poll fast when waiting for opponent, slow when it's our turn
  const isMyTurn = state.turn?.player === me;
  const isWaitingPhase = state.phase === PHASE.WAITING
    || (state.phase === PHASE.SPLITS && state.players[me].split)
    || (state.phase === PHASE.PLACING && state.setup?.placementTurn !== me)
    || (state.phase === PHASE.FREE_MOVE && state.turn?.player !== me)
    || (state.phase === PHASE.PLAY && !isMyTurn);
  setPollRate(!isWaitingPhase);

  // Phase-specific UI
  switch (state.phase) {
    case PHASE.WAITING:
      if (phaseChanged) showWaiting(getAccessCode());
      break;

    case PHASE.SPLITS:
      setLore('splits');
      if (!state.players[me].split) {
        if (phaseChanged) showSplitChoice(me, theme, onSplitChosen);
      } else {
        showWaitingForSplit();
      }
      break;

    case PHASE.PLACING:
      handlePlacementPhase(state, me);
      break;

    case PHASE.FREE_MOVE:
      if (me === 'p2' && state.turn.player === 'p2') {
        showFreeMove();
        showSelectableStones(state, me);
      } else {
        setStatus('Opponent is making their free move...', '');
        clearHighlights();
      }
      break;

    case PHASE.PLAY:
      handlePlayPhase(state, me);
      break;

    case PHASE.FINISHED:
      stopPolling();
      updateBoard(state.board);
      if (state.result) {
        showGameOver(state.result, theme);
      }
      break;
  }
}

// ─── Split Choice ───

async function onSplitChosen(roleACount) {
  hideOverlay();
  setStatus('Waiting for opponent...', '');
  const result = await sendSetup('split', { roleACount });
  if (result.error) {
    setStatus('Error: ' + result.error, '');
  } else {
    triggerBurst();
  }
}

// ─── Placement Phase ───

function handlePlacementPhase(state, me) {
  const isMyTurn = state.setup.placementTurn === me;
  showPlacementInstructions(me, isMyTurn);

  if (isMyTurn) {
    // Highlight my edge hexes that are empty
    const edge = getEdge(me);
    const emptyEdge = edge
      .map(h => hexKey(h.q, h.r))
      .filter(k => !state.board[k]);
    showValidTargets(emptyEdge);
  } else {
    clearHighlights();
  }
}

function getPlacedCounts(state, player) {
  const counts = {};
  for (const stone of Object.values(state.board)) {
    if (stone.owner === player) {
      counts[stone.role] = (counts[stone.role] || 0) + 1;
    }
  }
  return counts;
}

// ─── Play Phase ───

function handlePlayPhase(state, me) {
  const isMyTurn = state.turn.player === me;

  if (isMyTurn) {
    const phase = state.turn.turnPhase;
    const moves = state.turn.movesLeft;
    const movesTag = `[${moves} move${moves !== 1 ? 's' : ''} left]`;

    let objectiveKey = 'play_normal';
    let loreKey = 'play';
    if (phase === 'berserker') {
      objectiveKey = 'play_berserker';
      loreKey = 'berserker';
    } else if (phase === 'holding') {
      objectiveKey = 'play_holding';
      loreKey = 'center';
    }

    const obj = getObjective(objectiveKey);
    setStatus(`${obj} ${movesTag}`);
    setLore(loreKey);
    showSelectableStones(state, me);
  } else {
    setStatus(getObjective('play_waiting') || 'Opponent is thinking...');
    setLore('play');
    clearHighlights();
  }
}

function showSelectableStones(state, me) {
  const selectable = getSelectableStones(state, me);
  highlightSelectable(selectable);
}

// ─── Hex Click Handler ───

async function onHexClick(hexKeyStr, q, r) {
  if (!_state) return;
  const me = _state.you;

  // ── Placement phase ──
  if (_state.phase === PHASE.PLACING) {
    if (_state.setup.placementTurn !== me) return;
    if (!isOnEdge(q, r, me)) return;
    if (_state.board[hexKeyStr]) return;

    const placedCounts = getPlacedCounts(_state, me);
    const split = _state.players[me].split;

    showStonePicker(me, split, placedCounts, async (roleId) => {
      const result = await sendSetup('place', { q, r, role: roleId });
      if (result.error) setStatus('Error: ' + result.error, '');
      else triggerBurst();
    });
    return;
  }

  // ── Play / Free move phase ──
  if (_state.phase !== PHASE.PLAY && _state.phase !== PHASE.FREE_MOVE) return;
  if (_state.turn.player !== me) return;

  // If a stone is selected, check if this is a valid target
  if (_selectedHex) {
    const validMoves = getValidMoves(_state, me, _selectedHex);
    if (validMoves.includes(hexKeyStr)) {
      // Make the move
      clearHighlights();
      const restoreRole = _selectedHex === 'holding' ? _selectedRole : null;
      const result = await sendMove(_selectedHex, hexKeyStr, restoreRole);
      _selectedHex = null;
      _selectedRole = null;
      if (result.error) setStatus('Error: ' + result.error, '');
      else triggerBurst();
      return;
    }
  }

  // Select a stone
  const stone = _state.board[hexKeyStr];
  if (stone && stone.owner === me) {
    _selectedHex = hexKeyStr;
    _selectedRole = stone.role;
    highlightSelected(hexKeyStr);
    const validMoves = getValidMoves(_state, me, hexKeyStr);
    showValidTargets(validMoves);
  } else {
    // Deselect
    _selectedHex = null;
    _selectedRole = null;
    clearHighlights();
    showSelectableStones(_state, me);
  }
}

// ─── Holding Area Click Handler ───
// Called from the HTML via event delegation
export function onHoldingClick(role) {
  if (!_state) return;
  const me = _state.you;
  if (_state.turn.player !== me) return;
  if (_state.players[me].holding.length === 0) return;

  _selectedHex = 'holding';
  _selectedRole = role;
  highlightSelected(null);
  const validMoves = getValidMoves(_state, me, 'holding');
  showValidTargets(validMoves);
}

// Expose for HTML event binding
window.onHoldingClick = onHoldingClick;
