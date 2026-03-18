// Tablut -- game controller

import { initNet, pollState, stopPolling, sendMove, sendLeave,
         setPollRate, saveSession, loadSession } from './net.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected,
         showValidTargets, clearHighlights } from './board.js';
import { setTurnIndicator, setStatus, updatePlayerPanels, addLogEntries,
         showWaiting, showGameOver, showAbandoned, hideOverlay } from './ui.js';
import { initHelp } from './help.js';
import { getLegalMoves, getSelectablePieces } from './shared/engine.js';
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

  if (!code || !token || !player) { window.location.href = '/play/tablut/'; return; }
  saveSession(code, player, token);

  try {
    const resp = await fetch('/play/tablut/themes/neutral.json');
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
    case PHASE.WAITING:
      showWaiting(state.accessCode);
      break;
    case PHASE.PLAYING:
      handlePlayingPhase(state, me, isMyTurn);
      break;
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
    // Preserve selection across polls
    if (_selectedNode) {
      const piece = state.board[_selectedNode];
      const owns = (me === 'p1' && piece === 'p1') || (me === 'p2' && (piece === 'p2' || piece === 'king'));
      if (owns) {
        const moves = getLegalMoves(state, me, _selectedNode);
        if (moves.length > 0) {
          clearHighlights();
          highlightSelected(_selectedNode);
          showValidTargets(moves);
          return;
        }
      }
    }

    _selectedNode = null;
    clearHighlights();

    // Show threat status
    let statusMsg = _theme.objectives.playing;
    if (state.turn.threat === 'tuichi') statusMsg = 'Tuichi! King has 2+ escape routes!';
    else if (state.turn.threat === 'raichi') statusMsg = 'Raichi! King has an escape route.';
    setStatus(statusMsg);

    const selectable = getSelectablePieces(state, me);
    highlightSelectable(selectable);
  } else {
    clearHighlights();
    _selectedNode = null;
    let waitMsg = _theme.objectives.playing_wait;
    if (state.turn.threat === 'tuichi') waitMsg = 'Tuichi! King has 2+ escape routes!';
    else if (state.turn.threat === 'raichi') waitMsg = 'Raichi! King threatens escape.';
    setStatus(waitMsg);
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

    const targets = getLegalMoves(_state, me, _selectedNode);
    if (targets.includes(node)) {
      const result = await sendMove(_selectedNode, node);
      if (result.error) setStatus(`Error: ${result.error}`);
      _selectedNode = null;
      return;
    }

    // Reselect another own piece
    const piece = _state.board[node];
    const owns = (me === 'p1' && piece === 'p1') || (me === 'p2' && (piece === 'p2' || piece === 'king'));
    if (owns) {
      const moves = getLegalMoves(_state, me, node);
      if (moves.length > 0) {
        _selectedNode = node;
        clearHighlights();
        highlightSelected(node);
        showValidTargets(moves);
        return;
      }
    }

    _selectedNode = null;
    clearHighlights();
    highlightSelectable(getSelectablePieces(_state, me));
    return;
  }

  // No selection: try to select
  const piece = _state.board[node];
  const owns = (me === 'p1' && piece === 'p1') || (me === 'p2' && (piece === 'p2' || piece === 'king'));
  if (owns) {
    const moves = getLegalMoves(_state, me, node);
    if (moves.length > 0) {
      _selectedNode = node;
      clearHighlights();
      highlightSelected(node);
      showValidTargets(moves);
    }
  }
}

export async function leaveGame() {
  if (!confirm('Are you sure you want to leave? This will forfeit the game.')) return;
  await sendLeave();
  stopPolling();
  window.location.href = '/play/tablut/';
}
