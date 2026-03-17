// Nine Men's Morris — game controller
// Ties together net, board, UI, and engine

import { initNet, getPlayer, getAccessCode, pollState, stopPolling,
         sendPlace, sendMove, sendRemove, sendLeave, setPollRate, triggerBurst,
         saveSession, loadSession } from './net.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected,
         showValidTargets, hideValidTargets, clearHighlights, highlightRemovable } from './board.js';
import { setTurnIndicator, setStatus, updatePlayerPanels, addLogEntries,
         showWaiting, showGameOver, showAbandoned, hideOverlay } from './ui.js';
import { initHelp } from './help.js';
import { getValidMoves, getSelectableStones, getValidPlacements, getRemovablePieces } from './shared/engine.js';
import { PHASE, ACTION } from './shared/constants.js';

let _theme = null;
let _state = null;
let _prevPhase = null;
let _selectedNode = null;
let _lastLogSeq = 0;

// ─── Start ───

export async function startGame() {
  const params = new URLSearchParams(window.location.search);
  let code = params.get('code');
  let player = params.get('player');
  let token = params.get('token');

  // Try session recovery
  if (code) {
    const session = loadSession(code);
    if (session) {
      player = player || session.player;
      token = token || session.token;
    }
  }

  if (!code || !token || !player) {
    window.location.href = '/play/nine-mens-morris/';
    return;
  }

  // Save session
  saveSession(code, player, token);

  // Load theme
  try {
    const resp = await fetch('/play/nine-mens-morris/themes/neutral.json');
    _theme = await resp.json();
  } catch (e) {
    console.error('Failed to load theme:', e);
    return;
  }

  // Display access code
  const codeEl = document.querySelector('.access-code');
  if (codeEl) {
    codeEl.textContent = code;
    codeEl.title = 'Click to copy';
    codeEl.addEventListener('click', () => navigator.clipboard.writeText(code));
  }

  // Init modules
  initNet(code, token, player);
  initBoard(document.querySelector('.board-svg'), onNodeClick);
  initHelp();

  // Start polling
  pollState(onStateUpdate);
}

// ─── State Update Handler ───

function onStateUpdate(state) {
  _state = state;
  const me = state.you;
  const phaseChanged = _prevPhase !== state.phase;
  _prevPhase = state.phase;

  // Update board
  const lastMove = getLastMove(state);
  updateBoard(state.board, _theme, lastMove);

  // Update player panels
  updatePlayerPanels(state, me, _theme);

  // Process new log entries (filter by sequence to prevent duplicates)
  if (state.log && state.log.length > 0) {
    const newEntries = state.log.filter(e => e.seq > _lastLogSeq);
    if (newEntries.length > 0) {
      _lastLogSeq = newEntries[newEntries.length - 1].seq;
      addLogEntries(newEntries, _theme);
    }
  }

  const isMyTurn = state.turn.player === me;
  setPollRate(isMyTurn);
  setTurnIndicator(isMyTurn, phaseChanged);

  // Handle overlays based on phase
  if (phaseChanged) hideOverlay();

  switch (state.phase) {
    case PHASE.WAITING:
      showWaiting(state.accessCode);
      break;

    case PHASE.PLACING:
      handlePlacingPhase(state, me, isMyTurn);
      break;

    case PHASE.PLAYING:
      handlePlayingPhase(state, me, isMyTurn);
      break;

    case PHASE.FINISHED:
      clearHighlights();
      if (state.result) {
        if (state.result.reason === 'abandon') {
          showAbandoned(state.result, _theme);
        } else {
          showGameOver(state.result, _theme);
        }
      }
      stopPolling();
      break;

    case 'abandoned':
      clearHighlights();
      showAbandoned(state.result || { winner: null, reason: 'abandon' }, _theme);
      stopPolling();
      break;
  }
}

// ─── Phase Handlers ───

function handlePlacingPhase(state, me, isMyTurn) {
  clearHighlights();
  _selectedNode = null;

  if (state.turn.action === ACTION.REMOVE && isMyTurn) {
    setStatus('You formed a mill! Remove an opponent piece.');
    const opponent = me === 'p1' ? 'p2' : 'p1';
    const removable = getRemovablePieces(state, opponent);
    highlightRemovable(removable);
    return;
  }

  if (isMyTurn) {
    setStatus(_theme.objectives.placing);
    const placements = getValidPlacements(state);
    highlightSelectable(placements);
  } else {
    setStatus(_theme.objectives.placing_wait);
  }
}

function handlePlayingPhase(state, me, isMyTurn) {
  if (state.turn.action === ACTION.REMOVE && isMyTurn) {
    clearHighlights();
    _selectedNode = null;
    setStatus('You formed a mill! Remove an opponent piece.');
    const opponent = me === 'p1' ? 'p2' : 'p1';
    const removable = getRemovablePieces(state, opponent);
    highlightRemovable(removable);
    return;
  }

  if (isMyTurn) {
    // Preserve active selection across poll updates
    if (_selectedNode && state.board[_selectedNode] === me) {
      const moves = getValidMoves(state, me, _selectedNode);
      if (moves.length > 0) {
        clearHighlights();
        highlightSelected(_selectedNode);
        showValidTargets(moves);
        return;
      }
    }
    // No valid selection — show selectable pieces
    _selectedNode = null;
    clearHighlights();
    const p = state.players[me];
    const canFly = state.settings.flying && p.piecesOnBoard <= 3;
    setStatus(canFly ? _theme.objectives.playing_fly : _theme.objectives.playing);
    const selectable = getSelectableStones(state, me);
    highlightSelectable(selectable);
  } else {
    clearHighlights();
    _selectedNode = null;
    setStatus(_theme.objectives.playing_wait);
  }
}

// ─── Node Click Handler ───

async function onNodeClick(node) {
  if (!_state) return;
  const me = _state.you;
  const isMyTurn = _state.turn.player === me;
  if (!isMyTurn) return;

  // REMOVAL sub-phase — pick an opponent piece
  if (_state.turn.action === ACTION.REMOVE) {
    const opponent = me === 'p1' ? 'p2' : 'p1';
    const removable = getRemovablePieces(_state, opponent);
    if (removable.includes(node)) {
      const result = await sendRemove(node);
      if (result.error) {
        setStatus(`Error: ${result.error}`);
      }
    }
    return;
  }

  // PLACEMENT phase — place on empty node
  if (_state.phase === PHASE.PLACING) {
    if (_state.board[node] === null) {
      const result = await sendPlace(node);
      if (result.error) {
        setStatus(`Error: ${result.error}`);
      }
    }
    return;
  }

  // PLAYING phase — select and move
  if (_state.phase === PHASE.PLAYING) {
    // If a stone is already selected...
    if (_selectedNode) {
      // Clicking the same stone — deselect
      if (node === _selectedNode) {
        _selectedNode = null;
        clearHighlights();
        const selectable = getSelectableStones(_state, me);
        highlightSelectable(selectable);
        return;
      }

      // Clicking a valid target — make the move
      const validTargets = getValidMoves(_state, me, _selectedNode);
      if (validTargets.includes(node)) {
        const result = await sendMove(_selectedNode, node);
        if (result.error) {
          setStatus(`Error: ${result.error}`);
        }
        _selectedNode = null;
        return;
      }

      // Clicking another of your stones — reselect
      if (_state.board[node] === me) {
        const moves = getValidMoves(_state, me, node);
        if (moves.length > 0) {
          _selectedNode = node;
          clearHighlights();
          highlightSelected(node);
          showValidTargets(moves);
          return;
        }
      }

      // Clicking anything else — deselect
      _selectedNode = null;
      clearHighlights();
      const selectable = getSelectableStones(_state, me);
      highlightSelectable(selectable);
      return;
    }

    // No stone selected — try to select one
    if (_state.board[node] === me) {
      const moves = getValidMoves(_state, me, node);
      if (moves.length > 0) {
        _selectedNode = node;
        clearHighlights();
        highlightSelected(node);
        showValidTargets(moves);
      }
    }
  }
}

// ─── Leave Game ───

export async function leaveGame() {
  if (!confirm('Are you sure you want to leave? This will forfeit the game.')) return;
  await sendLeave();
  stopPolling();
  window.location.href = '/play/nine-mens-morris/';
}

// ─── Helpers ───

function getLastMove(state) {
  if (!state.log || state.log.length === 0) return null;
  // Find the last place/move entry
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i];
    if (e.action === 'place' || e.action === 'move') return e;
  }
  return null;
}
