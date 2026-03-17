// Fanorona — game controller

import { initNet, getPlayer, getAccessCode, pollState, stopPolling,
         sendMove, sendEndChain, sendLeave, setPollRate, triggerBurst,
         saveSession, loadSession } from './net.js';
import { initBoard, updateBoard, highlightSelectable, highlightSelected,
         showValidTargets, hideValidTargets, clearHighlights } from './board.js';
import { setTurnIndicator, setStatus, updatePlayerPanels, addLogEntries,
         showWaiting, showGameOver, showAbandoned, hideOverlay,
         showCaptureChoice, hideCaptureChoice } from './ui.js';
import { initHelp } from './help.js';
import { getLegalMoves, getSelectablePieces, getValidTargets, getCaptureInfo,
         getChainContinuations, hasAnyCaptureOnBoard } from './shared/engine.js';
import { PHASE } from './shared/constants.js';

let _theme = null;
let _state = null;
let _prevPhase = null;
let _selectedNode = null;

// ─── Start ───

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
    window.location.href = '/play/fanorona/';
    return;
  }

  saveSession(code, player, token);

  try {
    const resp = await fetch('/play/fanorona/themes/neutral.json');
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
  initBoard(document.querySelector('.board-svg'), onNodeClick, player);
  initHelp();

  // End chain button
  const endBtn = document.getElementById('btn-end-chain');
  if (endBtn) {
    endBtn.addEventListener('click', async () => {
      const result = await sendEndChain();
      if (result.error) setStatus(`Error: ${result.error}`);
    });
    endBtn.style.display = 'none';
  }

  pollState(onStateUpdate);
}

// ─── State Update ───

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
      hideEndChainBtn();
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
      hideEndChainBtn();
      showAbandoned(state.result || { winner: null, reason: 'abandon' }, _theme);
      stopPolling();
      break;
  }
}

// ─── Phase Handler ───

function handlePlayingPhase(state, me, isMyTurn) {
  if (isMyTurn) {
    const chain = state.turn.chain;

    if (chain) {
      // Mid-chain: preserve selection on chain piece
      clearHighlights();
      highlightSelected(chain.piece);
      const continuations = getChainContinuations(state, me, chain.piece, chain);
      showValidTargets(continuations.map(m => m.to));
      setStatus(_theme.objectives.playing_chain);
      showEndChainBtn();
      _selectedNode = chain.piece;
      return;
    }

    hideEndChainBtn();

    // Preserve selection across polls
    if (_selectedNode && state.board[_selectedNode] === me) {
      const targets = getValidTargets(state, me, _selectedNode);
      if (targets.length > 0) {
        clearHighlights();
        highlightSelected(_selectedNode);
        showValidTargets(targets);
        return;
      }
    }

    _selectedNode = null;
    clearHighlights();
    const mustCapture = hasAnyCaptureOnBoard(state, me);
    setStatus(mustCapture ? _theme.objectives.playing_capture : _theme.objectives.playing_paika);
    const selectable = getSelectablePieces(state, me);
    highlightSelectable(selectable);
  } else {
    clearHighlights();
    hideEndChainBtn();
    _selectedNode = null;
    setStatus(_theme.objectives.playing_wait);
  }
}

// ─── Node Click ───

async function onNodeClick(node) {
  if (!_state) return;
  const me = _state.you;
  console.log('[click]', node, 'me=', me, 'board=', _state.board[node], 'turn=', _state.turn.player);
  if (_state.turn.player !== me) return;
  if (_state.phase !== PHASE.PLAYING) return;

  const chain = _state.turn.chain;

  // Mid-chain: click a valid continuation target
  if (chain) {
    const continuations = getChainContinuations(_state, me, chain.piece, chain);
    const target = continuations.find(m => m.to === node);
    if (!target) return;

    if (target.approach > 0 && target.withdrawal > 0) {
      const info = getCaptureInfo(_state, me, chain.piece, node);
      showCaptureChoice(info.approach, info.withdrawal, async (type) => {
        const result = await sendMove(chain.piece, node, type);
        if (result.error) setStatus(`Error: ${result.error}`);
      });
      return;
    }

    const result = await sendMove(chain.piece, node, null);
    if (result.error) setStatus(`Error: ${result.error}`);
    return;
  }

  // No chain — normal selection
  if (_selectedNode) {
    // Click same piece: deselect
    if (node === _selectedNode) {
      _selectedNode = null;
      clearHighlights();
      const selectable = getSelectablePieces(_state, me);
      highlightSelectable(selectable);
      return;
    }

    // Click a valid target: move
    const targets = getValidTargets(_state, me, _selectedNode);
    if (targets.includes(node)) {
      const info = getCaptureInfo(_state, me, _selectedNode, node);
      if (info.approach.length > 0 && info.withdrawal.length > 0) {
        showCaptureChoice(info.approach, info.withdrawal, async (type) => {
          const result = await sendMove(_selectedNode, node, type);
          if (result.error) setStatus(`Error: ${result.error}`);
          _selectedNode = null;
        });
        return;
      }

      const captureType = info.approach.length > 0 ? 'approach' : (info.withdrawal.length > 0 ? 'withdrawal' : null);
      const result = await sendMove(_selectedNode, node, captureType);
      if (result.error) setStatus(`Error: ${result.error}`);
      _selectedNode = null;
      return;
    }

    // Click another of your pieces: reselect
    if (_state.board[node] === me) {
      const selectable = getSelectablePieces(_state, me);
      if (selectable.includes(node)) {
        _selectedNode = node;
        clearHighlights();
        highlightSelected(node);
        showValidTargets(getValidTargets(_state, me, node));
        return;
      }
    }

    // Click anything else: deselect
    _selectedNode = null;
    clearHighlights();
    const selectable = getSelectablePieces(_state, me);
    highlightSelectable(selectable);
    return;
  }

  // No piece selected — try to select
  if (_state.board[node] === me) {
    const selectable = getSelectablePieces(_state, me);
    if (selectable.includes(node)) {
      _selectedNode = node;
      clearHighlights();
      highlightSelected(node);
      showValidTargets(getValidTargets(_state, me, node));
    }
  }
}

// ─── End Chain Button ───

function showEndChainBtn() {
  const btn = document.getElementById('btn-end-chain');
  if (btn) btn.style.display = '';
}

function hideEndChainBtn() {
  const btn = document.getElementById('btn-end-chain');
  if (btn) btn.style.display = 'none';
}

// ─── Leave Game ───

export async function leaveGame() {
  if (!confirm('Are you sure you want to leave? This will forfeit the game.')) return;
  await sendLeave();
  stopPolling();
  window.location.href = '/play/fanorona/';
}
