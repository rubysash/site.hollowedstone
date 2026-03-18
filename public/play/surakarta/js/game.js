// Surakarta -- game controller

import { initNet, pollState, stopPolling, sendMove, sendLeave,
         setPollRate, saveSession, loadSession } from './net.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected,
         showValidTargets, clearHighlights } from './board.js';
import { setTurnIndicator, setStatus, updatePlayerPanels, addLogEntries,
         showWaiting, showGameOver, showAbandoned, hideOverlay } from './ui.js';
import { initHelp } from './help.js';
import { getAllMoves, getSelectablePieces } from './shared/engine.js';
import { PHASE } from './shared/constants.js';

let _theme = null;
let _state = null;
let _prevPhase = null;
let _selectedNode = null;

export async function startGame() {
  const params = new URLSearchParams(window.location.search);
  let code = params.get('code');
  let player = params.get('player');
  let token = params.get('token');

  if (code) {
    const session = loadSession(code);
    if (session) { player = player || session.player; token = token || session.token; }
  }
  if (!code || !token || !player) { window.location.href = '/play/surakarta/'; return; }
  saveSession(code, player, token);

  try {
    const resp = await fetch('/play/surakarta/themes/neutral.json');
    _theme = await resp.json();
  } catch (e) { console.error('Failed to load theme:', e); return; }

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

function onStateUpdate(state) {
  _state = state;
  const me = state.you;
  const phaseChanged = _prevPhase !== state.phase;
  _prevPhase = state.phase;

  updateBoard(state.board, _theme);
  updatePlayerPanels(state, me, _theme);

  if (state.log && state.log.length > 0) addLogEntries(state.log, _theme);

  const isMyTurn = state.turn.player === me;
  setPollRate(isMyTurn);
  setTurnIndicator(isMyTurn);
  if (phaseChanged) hideOverlay();

  switch (state.phase) {
    case PHASE.WAITING: showWaiting(state.accessCode); break;
    case PHASE.PLAYING: handlePlayingPhase(state, me, isMyTurn); break;
    case PHASE.FINISHED:
      clearHighlights();
      if (state.result) {
        if (state.result.reason === 'abandon') showAbandoned(state.result, _theme);
        else showGameOver(state.result, _theme);
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

function handlePlayingPhase(state, me, isMyTurn) {
  if (isMyTurn) {
    if (_selectedNode && state.board[_selectedNode] === me) {
      const moves = getAllMoves(state, me, _selectedNode);
      const allTargets = [...moves.regular, ...moves.captures];
      if (allTargets.length > 0) {
        clearHighlights();
        highlightSelected(_selectedNode);
        showValidTargets(allTargets);
        return;
      }
    }
    _selectedNode = null;
    clearHighlights();
    setStatus(_theme.objectives.playing);
    highlightSelectable(getSelectablePieces(state, me));
  } else {
    clearHighlights();
    _selectedNode = null;
    setStatus(_theme.objectives.playing_wait);
  }
}

async function onNodeClick(node) {
  if (!_state) return;
  const me = _state.you;
  if (_state.turn.player !== me) return;
  if (_state.phase !== PHASE.PLAYING) return;

  if (_selectedNode) {
    if (node === _selectedNode) {
      _selectedNode = null;
      clearHighlights();
      highlightSelectable(getSelectablePieces(_state, me));
      return;
    }

    const moves = getAllMoves(_state, me, _selectedNode);
    const allTargets = [...moves.regular, ...moves.captures];
    if (allTargets.includes(node)) {
      const result = await sendMove(_selectedNode, node);
      if (result.error) setStatus(`Error: ${result.error}`);
      _selectedNode = null;
      return;
    }

    if (_state.board[node] === me) {
      const m = getAllMoves(_state, me, node);
      if (m.regular.length > 0 || m.captures.length > 0) {
        _selectedNode = node;
        clearHighlights();
        highlightSelected(node);
        showValidTargets([...m.regular, ...m.captures]);
        return;
      }
    }

    _selectedNode = null;
    clearHighlights();
    highlightSelectable(getSelectablePieces(_state, me));
    return;
  }

  if (_state.board[node] === me) {
    const moves = getAllMoves(_state, me, node);
    if (moves.regular.length > 0 || moves.captures.length > 0) {
      _selectedNode = node;
      clearHighlights();
      highlightSelected(node);
      showValidTargets([...moves.regular, ...moves.captures]);
    }
  }
}

export async function leaveGame() {
  if (!confirm('Are you sure you want to leave? This will forfeit the game.')) return;
  await sendLeave();
  stopPolling();
  window.location.href = '/play/surakarta/';
}
