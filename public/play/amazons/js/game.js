// Amazons -- game controller

import { initNet, pollState, stopPolling, sendMove, sendShoot, sendLeave,
         setPollRate, triggerBurst, saveSession, loadSession } from './net.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected,
         showValidTargets, clearHighlights } from './board.js';
import { setTurnIndicator, setStatus, updatePlayerPanels, addLogEntries,
         showWaiting, showGameOver, showAbandoned, hideOverlay } from './ui.js';
import { initHelp } from './help.js';
import { moveAmazon, shootArrow, getSelectableAmazons, getAmazonMoves, getArrowTargets } from './shared/engine.js';
import { PHASE, ACTION } from './shared/constants.js';

let _theme = null;
let _state = null;
let _prevPhase = null;
let _selectedNode = null;

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
    window.location.href = '/play/amazons/';
    return;
  }

  saveSession(code, player, token);

  try {
    const resp = await fetch('/play/amazons/themes/neutral.json');
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

// --- Phase Handler ---

function handlePlayingPhase(state, me, isMyTurn) {
  if (!isMyTurn) {
    clearHighlights();
    _selectedNode = null;
    setStatus(_theme.objectives.playing_wait);
    return;
  }

  const action = state.turn.action;

  if (action === ACTION.SHOOT) {
    // Shoot phase: highlight the amazon that just moved, show arrow targets
    clearHighlights();
    _selectedNode = null;
    setStatus(_theme.objectives.playing_shoot);
    const amazon = state.turn.amazon;
    if (amazon) {
      highlightSelected(amazon);
      const targets = getArrowTargets(state);
      showValidTargets(targets);
    }
    return;
  }

  // Move phase: select an amazon, show its moves
  // Preserve selection across polls
  if (_selectedNode && state.board[_selectedNode] === me) {
    const moves = getAmazonMoves(state, me, _selectedNode);
    if (moves.length > 0) {
      clearHighlights();
      highlightSelected(_selectedNode);
      showValidTargets(moves);
      return;
    }
  }

  _selectedNode = null;
  clearHighlights();
  setStatus(_theme.objectives.playing_move);
  const selectable = getSelectableAmazons(state, me);
  highlightSelectable(selectable);
}

// --- Node Click ---

async function onNodeClick(node) {
  if (!_state) return;
  const me = _state.you;
  if (_state.turn.player !== me) return;
  if (_state.phase !== PHASE.PLAYING) return;

  const action = _state.turn.action;

  // Shoot phase: click a valid arrow target
  if (action === ACTION.SHOOT) {
    const targets = getArrowTargets(_state);
    if (targets.includes(node)) {
      const result = await sendShoot(node);
      if (result.error) setStatus(`Error: ${result.error}`);
    }
    return;
  }

  // Move phase
  if (_selectedNode) {
    // Click same amazon: deselect
    if (node === _selectedNode) {
      _selectedNode = null;
      clearHighlights();
      const selectable = getSelectableAmazons(_state, me);
      highlightSelectable(selectable);
      return;
    }

    // Click a valid target: move
    const targets = getAmazonMoves(_state, me, _selectedNode);
    if (targets.includes(node)) {
      const result = await sendMove(_selectedNode, node);
      if (result.error) setStatus(`Error: ${result.error}`);
      _selectedNode = null;
      return;
    }

    // Click another amazon: reselect
    if (_state.board[node] === me) {
      const moves = getAmazonMoves(_state, me, node);
      if (moves.length > 0) {
        _selectedNode = node;
        clearHighlights();
        highlightSelected(node);
        showValidTargets(moves);
        return;
      }
    }

    // Click anything else: deselect
    _selectedNode = null;
    clearHighlights();
    const selectable = getSelectableAmazons(_state, me);
    highlightSelectable(selectable);
    return;
  }

  // No amazon selected: try to select
  if (_state.board[node] === me) {
    const moves = getAmazonMoves(_state, me, node);
    if (moves.length > 0) {
      _selectedNode = node;
      clearHighlights();
      highlightSelected(node);
      showValidTargets(moves);
    }
  }
}

// --- Leave Game ---

export async function leaveGame() {
  if (!confirm('Are you sure you want to leave? This will forfeit the game.')) return;
  await sendLeave();
  stopPolling();
  window.location.href = '/play/amazons/';
}
