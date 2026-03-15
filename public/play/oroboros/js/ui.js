// UI controller — modals, status, panels

import { getRoleInfo, getPlayerName, getTerm, getRandomLore, getObjective, getCenterInfo, getTheme } from './themes.js';
import { getPlayerRoleIds } from './shared/constants.js';
import { getBasePath } from './net.js';

// ─── DOM Helpers ───

function $(sel) { return document.querySelector(sel); }
function show(el) { if (typeof el === 'string') el = $(el); if (el) el.style.display = ''; }
function hide(el) { if (typeof el === 'string') el = $(el); if (el) el.style.display = 'none'; }
function text(sel, t) { const el = $(sel); if (el) el.textContent = t; }

// Track current lore so we don't re-roll every poll tick
let _currentLorePhase = null;
let _currentLoreText = '';
let _wasMyTurn = false;
const _originalTitle = document.title;

// ─── Turn Indicator ───

export function setTurnIndicator(isMyTurn, phaseChanged) {
  const bar = $('.status-bar');
  if (!bar) return;

  bar.classList.toggle('your-turn', isMyTurn);
  bar.classList.toggle('opponent-turn', !isMyTurn);

  // Flash when turn switches TO you
  if (isMyTurn && !_wasMyTurn) {
    bar.classList.remove('turn-flash');
    void bar.offsetWidth; // force reflow
    bar.classList.add('turn-flash');
  }
  _wasMyTurn = isMyTurn;

  // Update browser tab title
  document.title = isMyTurn ? '>> YOUR TURN << | Ouroboros' : _originalTitle;

  // Update player panels
  document.querySelectorAll('.player-panel').forEach(p => p.classList.remove('you-active'));
  if (isMyTurn) {
    const myPanel = $('.player-panel.you');
    if (myPanel) myPanel.classList.add('you-active');
  }
}

// ─── Status Bar (objective header) ───

export function setStatus(msg) {
  text('.status-bar .turn-info', msg);
}

// ─── Lore Callout ───

export function setLore(phaseKey) {
  const loreEl = $('.lore-callout');
  if (!loreEl) return;

  // Only re-roll lore when the phase/event changes
  if (phaseKey !== _currentLorePhase) {
    _currentLorePhase = phaseKey;
    _currentLoreText = getRandomLore(phaseKey);
  }

  if (_currentLoreText) {
    loreEl.textContent = _currentLoreText;
    loreEl.style.display = '';
  } else {
    loreEl.style.display = 'none';
  }
}

// Force a new random lore (e.g., on capture events)
export function flashLore(phaseKey) {
  _currentLorePhase = phaseKey;
  _currentLoreText = getRandomLore(phaseKey);
  const loreEl = $('.lore-callout');
  if (!loreEl || !_currentLoreText) return;
  loreEl.textContent = _currentLoreText;
  loreEl.style.display = '';
  loreEl.classList.remove('lore-flash');
  void loreEl.offsetWidth; // force reflow
  loreEl.classList.add('lore-flash');
}

// ─── Player Panels ───

export function updatePlayerPanels(state, myPlayer) {
  for (const p of ['p1', 'p2']) {
    const panel = $(`.player-panel.${p}`);
    if (!panel) continue;

    const isActive = state.turn?.player === p;
    panel.classList.toggle('active', isActive);
    panel.classList.toggle('you', p === myPlayer);

    const nameEl = panel.querySelector('.player-name');
    if (nameEl) {
      const you = p === myPlayer ? ' (You)' : '';
      nameEl.textContent = getPlayerName(p) + you;
    }

    const scoreEl = panel.querySelector('.score');
    if (scoreEl) scoreEl.textContent = state.players[p].score;

    // Holding area
    const holdingEl = panel.querySelector('.holding-area');
    if (holdingEl) {
      holdingEl.innerHTML = '';
      const holding = state.players[p].holding || [];
      const canRestore = p === myPlayer && state.turn?.player === myPlayer && holding.length > 0;
      for (const s of holding) {
        const roleInfo = getRoleInfo(s.role);
        if (!roleInfo) continue;
        const div = document.createElement('div');
        div.className = 'holding-stone';
        if (!canRestore) {
          div.classList.add('not-interactive');
        } else {
          div.classList.add('restorable');
        }
        div.style.background = roleInfo.color;
        div.style.borderColor = roleInfo.strokeColor;
        div.textContent = roleInfo.symbol;
        div.dataset.role = s.role;
        holdingEl.appendChild(div);
      }
      // Show restore hint arrow when it's your turn and you have captured stones
      const hintEl = panel.querySelector('.holding-hint');
      if (hintEl) {
        if (canRestore) {
          hintEl.style.display = '';
          hintEl.classList.add('holding-hint-flash');
        } else {
          hintEl.style.display = 'none';
          hintEl.classList.remove('holding-hint-flash');
        }
      }
    }
  }
}

// ─── Move Log ───

export function addLogEntries(entries) {
  const log = $('.move-log');
  if (!log) return;

  const theme = getTheme();
  for (const e of entries) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = formatLogEntry(e, theme);
    log.appendChild(div);
  }
  log.scrollTop = log.scrollHeight;
}

function formatLogEntry(entry, theme) {
  const pName = theme?.players[entry.player]?.name || entry.player;
  const roleInfo = getRoleInfo(entry.role);
  const roleName = roleInfo?.name || entry.role || '';

  switch (entry.action) {
    case 'split':
      return `${pName} chose their forces.`;
    case 'place':
      return `${pName} places ${roleName} at ${entry.to}.`;
    case 'move':
      return `${pName} moves ${roleName}: ${entry.from} -> ${entry.to}.`;
    case 'displace': {
      const captured = getRoleInfo(entry.extra?.displaced);
      return `${pName}'s ${roleName} ${getTerm('displace')}s ${captured?.name || '?'} at ${entry.to}! (Score: ${entry.extra?.score})`;
    }
    case 'restore':
      return `${pName} ${getTerm('restore')}s ${roleName} to ${entry.to}.`;
    default:
      return `${pName}: ${entry.action}`;
  }
}

// ─── Setup Overlays ───

export function showWaiting(accessCode) {
  showOverlay(`
    <h2>Waiting for Opponent</h2>
    <p>Share this access code:</p>
    <div class="access-code" onclick="navigator.clipboard.writeText('${accessCode}')">${accessCode}</div>
    <p class="waiting-pulse" style="margin-top:1rem;">Waiting for Player 2 to join...</p>
  `);
}

export function showSplitChoice(player, theme, onChoice) {
  const roles = getPlayerRoleIds(player, theme);
  const r1 = getRoleInfo(roles[0]);
  const r2 = getRoleInfo(roles[1]);

  showOverlay(`
    <h2>Choose Your Forces</h2>
    <p>Pick your ratio — your opponent won't see your choice until stones are placed.</p>
    <div class="split-choice">
      <div class="split-option" data-count="3">
        <div class="count">3 ${r1.symbol}</div>
        <div class="label">${r1.name}</div>
        <div class="count" style="margin-top:0.3rem">2 ${r2.symbol}</div>
        <div class="label">${r2.name}</div>
      </div>
      <div class="split-option" data-count="2">
        <div class="count">2 ${r1.symbol}</div>
        <div class="label">${r1.name}</div>
        <div class="count" style="margin-top:0.3rem">3 ${r2.symbol}</div>
        <div class="label">${r2.name}</div>
      </div>
    </div>
  `);

  document.querySelectorAll('.split-option').forEach(el => {
    el.addEventListener('click', () => onChoice(parseInt(el.dataset.count)));
  });
}

export function showWaitingForSplit() {
  showOverlay(`
    <h2>Forces Chosen</h2>
    <p class="waiting-pulse">Waiting for opponent to choose their forces...</p>
  `);
}

export function showPlacementInstructions(player, isMyTurn) {
  const obj = getObjective('placing');
  if (isMyTurn) {
    setStatus(obj || 'Place a stone on your starting edge.');
  } else {
    setStatus('Opponent is placing a stone...');
  }
  setLore('placing');
}

export function showFreeMove() {
  setStatus(getObjective('free_move') || 'Make your free move.');
  setLore('placing');
}

export function showGameOver(result, theme) {
  const winnerName = theme?.players[result.winner]?.name || result.winner;
  const loreLine = getRandomLore('finished');
  showOverlay(`
    <h2>${winnerName} Wins!</h2>
    <p>Final Score: ${result.finalScore[0]} - ${result.finalScore[1]}</p>
    ${loreLine ? `<p style="font-style:italic;margin-top:0.5rem;">${loreLine}</p>` : ''}
    <div class="btn-row" style="margin-top:1rem;">
      <button class="btn" onclick="location.href='${getBasePath()}/'">New Game</button>
      <button class="btn btn-secondary" onclick="location.href='${getBasePath()}/replay?code=${document.querySelector('.access-code')?.textContent || ''}'">Watch Replay</button>
    </div>
  `);
  setLore('finished');
}

export function showAbandoned(result, theme, reason) {
  const code = document.querySelector('.access-code')?.textContent || '';
  if (reason === 'opponent') {
    // Opponent left
    const msg = getObjective('opponent_left') || 'Your opponent has left the game.';
    showOverlay(`
      <h2>Opponent Left</h2>
      <p>${msg}</p>
      <p style="margin-top:0.5rem;">Final Score: ${result.finalScore[0]} - ${result.finalScore[1]}</p>
      <div class="btn-row" style="margin-top:1rem;">
        <button class="btn" onclick="location.href='${getBasePath()}/'">New Game</button>
        <button class="btn btn-secondary" onclick="location.href='${getBasePath()}/replay?code=${code}'">Watch Replay</button>
      </div>
    `);
  } else {
    // You left
    showOverlay(`
      <h2>You Left the Game</h2>
      <p>The game has been forfeited.</p>
      <div class="btn-row" style="margin-top:1rem;">
        <button class="btn" onclick="location.href='${getBasePath()}/'">New Game</button>
      </div>
    `);
  }
}

let _timeoutShown = false;
export function showOpponentTimeout(theme) {
  if (_timeoutShown) return; // only show once
  _timeoutShown = true;
  const msg = getObjective('opponent_timeout') || 'Your opponent appears to have disconnected.';
  const bar = $('.status-bar');
  if (bar) {
    // Add a warning banner above the status text
    let warning = bar.querySelector('.timeout-warning');
    if (!warning) {
      warning = document.createElement('div');
      warning.className = 'timeout-warning';
      bar.prepend(warning);
    }
    warning.textContent = msg;
  }
}

export function clearOpponentTimeout() {
  _timeoutShown = false;
  const warning = document.querySelector('.timeout-warning');
  if (warning) warning.remove();
}

export function hideOverlay() {
  const overlay = $('.setup-overlay');
  if (overlay) overlay.remove();
}

function showOverlay(html) {
  hideOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'setup-overlay';
  overlay.innerHTML = `<div class="setup-card">${html}</div>`;
  document.body.appendChild(overlay);
}

// ─── Placement stone picker ───

export function showStonePicker(player, split, placedCounts, onPick) {
  const theme = getTheme();
  const roles = getPlayerRoleIds(player, theme);

  const options = roles
    .filter(roleId => (placedCounts[roleId] || 0) < (split[roleId] || 0))
    .map(roleId => {
      const info = getRoleInfo(roleId);
      const remaining = (split[roleId] || 0) - (placedCounts[roleId] || 0);
      return { roleId, info, remaining };
    });

  if (options.length === 1) {
    // Only one option — auto-select
    onPick(options[0].roleId);
    return;
  }

  showOverlay(`
    <h2>Choose Stone to Place</h2>
    <div class="split-choice">
      ${options.map(o => `
        <div class="split-option" data-role="${o.roleId}">
          <div class="count">${o.info.symbol}</div>
          <div class="label">${o.info.name} (${o.remaining} left)</div>
        </div>
      `).join('')}
    </div>
  `);

  document.querySelectorAll('.split-option').forEach(el => {
    el.addEventListener('click', () => {
      hideOverlay();
      onPick(el.dataset.role);
    });
  });
}
