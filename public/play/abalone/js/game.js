// Abalone -- game controller

import { initNet, pollState, stopPolling, sendMove, sendLeave,
         setPollRate, saveSession, loadSession } from './net.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected,
         highlightExtendable, showDirectionArrows, clearHighlights } from './board.js';
import { setTurnIndicator, setStatus, updatePlayerPanels, addLogEntries,
         showWaiting, showGameOver, showAbandoned, hideOverlay } from './ui.js';
import { initHelp } from './help.js';
import { getSelectableMarbles, getExtendableNeighbors, getValidDirections } from './shared/engine.js';
import { PHASE } from './shared/constants.js';

let _theme = null;
let _state = null;
let _prevPhase = null;
let _selectedMarbles = [];

// --- Start ---

export async function startGame() {
  const params = new URLSearchParams(window.location.search);
  let code = params.get('code');
  let player = params.get('player');
  let token = params.get('token');

  if (code) {
    const session = loadSession(code);
    if (session) {
      player = player || session.player;
      token = token || session.token;
    }
  }

  if (!code || !token || !player) {
    window.location.href = '/play/abalone/';
    return;
  }

  saveSession(code, player, token);

  try {
    const resp = await fetch('/play/abalone/themes/neutral.json');
    _theme = await resp.json();
  } catch (e) {
    console.error('Failed to load theme:', e);
    return;
  }

  const codeEl = document.querySelector('.access-code');
  if (codeEl) {
    codeEl.textContent = code;
    codeEl.title = 'Click to copy';
    codeEl.addEventListener('click', () => navigator.clipboard.writeText(code));
  }

  initNet(code, token, player);
  initBoard(document.querySelector('.board-svg'), onNodeClick);
  initHelp();

  pollState(onStateUpdate);
}

// --- State Update ---

function onStateUpdate(state) {
  _state = state;
  const me = state.you;
  const phaseChanged = _prevPhase !== state.phase;
  _prevPhase = state.phase;

  updateBoard(state.board, _theme);
  updatePlayerPanels(state, me, _theme);

  if (state.log && state.log.length > 0) {
    addLogEntries(state.log, _theme);
  }

  const isMyTurn = state.turn.player === me;
  setPollRate(isMyTurn);
  setTurnIndicator(isMyTurn);

  if (phaseChanged) hideOverlay();

  switch (state.phase) {
    case PHASE.WAITING:
      showWaiting(state.accessCode);
      break;

    case PHASE.PLAYING:
      handlePlayingPhase(state, me, isMyTurn);
      break;

    case PHASE.FINISHED:
      clearHighlights();
      _selectedMarbles = [];
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
      _selectedMarbles = [];
      showAbandoned(state.result || { winner: null, reason: 'abandon' }, _theme);
      stopPolling();
      break;
  }
}

// --- Phase Handler ---

function handlePlayingPhase(state, me, isMyTurn) {
  if (isMyTurn) {
    // Preserve selection across polls
    if (_selectedMarbles.length > 0) {
      const allValid = _selectedMarbles.every(m => state.board[m] === me);
      if (allValid) {
        showSelectionState(state, me);
        return;
      }
    }

    _selectedMarbles = [];
    clearHighlights();
    setStatus(_theme.objectives.playing);
    const selectable = getSelectableMarbles(state, me);
    highlightSelectable(selectable);
  } else {
    clearHighlights();
    _selectedMarbles = [];
    setStatus(_theme.objectives.playing_wait);
  }
}

function showSelectionState(state, me) {
  clearHighlights();
  highlightSelected(_selectedMarbles);

  const validDirs = getValidDirections(state, me, _selectedMarbles);
  const extendable = getExtendableNeighbors(state, me, _selectedMarbles);

  if (extendable.length > 0) {
    highlightExtendable(extendable);
  }

  if (validDirs.length > 0) {
    showDirectionArrows(_selectedMarbles, validDirs, (dir) => {
      executeMove(dir);
    });
    setStatus(`${_selectedMarbles.length} marble${_selectedMarbles.length > 1 ? 's' : ''} selected. Pick a direction.`);
  } else if (extendable.length > 0) {
    setStatus('Select more marbles or pick a different group.');
  } else {
    setStatus('No valid moves for this group. Select different marbles.');
  }
}

async function executeMove(direction) {
  const result = await sendMove(_selectedMarbles, direction);
  if (result.error) {
    setStatus(`Error: ${result.error}`);
  }
  _selectedMarbles = [];
}

// --- Node Click ---

function onNodeClick(node) {
  if (!_state) return;
  const me = _state.you;
  if (_state.turn.player !== me) return;
  if (_state.phase !== PHASE.PLAYING) return;

  const owner = _state.board[node];

  // Click on own marble
  if (owner === me) {
    if (_selectedMarbles.includes(node)) {
      // Deselect this marble
      _selectedMarbles = _selectedMarbles.filter(m => m !== node);
      if (_selectedMarbles.length === 0) {
        clearHighlights();
        setStatus(_theme.objectives.playing);
        highlightSelectable(getSelectableMarbles(_state, me));
      } else {
        showSelectionState(_state, me);
      }
      return;
    }

    // Try to add to selection
    if (_selectedMarbles.length === 0) {
      _selectedMarbles = [node];
      showSelectionState(_state, me);
      return;
    }

    // Check if this marble can extend the current group
    const extendable = getExtendableNeighbors(_state, me, _selectedMarbles);
    if (extendable.includes(node)) {
      _selectedMarbles.push(node);
      showSelectionState(_state, me);
      return;
    }

    // Start a new selection with this marble
    _selectedMarbles = [node];
    showSelectionState(_state, me);
    return;
  }

  // Click on empty space or opponent marble: deselect
  if (_selectedMarbles.length > 0) {
    _selectedMarbles = [];
    clearHighlights();
    setStatus(_theme.objectives.playing);
    highlightSelectable(getSelectableMarbles(_state, me));
  }
}

// --- Leave Game ---

export async function leaveGame() {
  if (!confirm('Are you sure you want to leave? This will forfeit the game.')) return;
  await sendLeave();
  stopPolling();
  window.location.href = '/play/abalone/';
}
