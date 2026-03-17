// Nine Men's Morris — UI layer
// Status display, player panels, overlays, move log

const $ = sel => document.querySelector(sel);
const show = el => { if (el) el.style.display = ''; };
const hide = el => { if (el) el.style.display = 'none'; };
const text = (sel, t) => { const e = $(sel); if (e) e.textContent = t; };

// ─── Turn Indicator ───

let _prevMyTurn = null;

export function setTurnIndicator(isMyTurn, phaseChanged) {
  const bar = $('.status-bar');
  if (!bar) return;

  bar.classList.toggle('your-turn', isMyTurn);
  bar.classList.toggle('opponent-turn', !isMyTurn);

  if (isMyTurn && _prevMyTurn === false) {
    bar.classList.add('turn-flash');
    setTimeout(() => bar.classList.remove('turn-flash'), 800);
  }
  _prevMyTurn = isMyTurn;

  document.title = isMyTurn
    ? ">> YOUR TURN << | 9 Men's Morris"
    : "9 Men's Morris";

  // Active player panel
  const panels = document.querySelectorAll('.player-panel');
  panels.forEach(p => p.classList.remove('you-active'));
  if (isMyTurn) {
    const myPanel = $(`.player-panel.you`);
    if (myPanel) myPanel.classList.add('you-active');
  }
}

export function setStatus(msg) {
  text('.turn-info', msg);
}

// ─── Player Panels ───

export function updatePlayerPanels(state, myPlayer, theme) {
  for (const pid of ['p1', 'p2']) {
    const panel = $(`.player-panel[data-player="${pid}"]`);
    if (!panel) continue;

    const p = state.players[pid];
    const isMe = pid === myPlayer;
    const isActive = state.turn.player === pid;

    panel.classList.toggle('active', isActive);
    panel.classList.toggle('you', isMe);

    const nameEl = panel.querySelector('.player-name');
    if (nameEl) {
      const name = theme.players[pid].title;
      nameEl.textContent = isMe ? `${name} (You)` : name;
    }

    // Piece counts
    const handEl = panel.querySelector('.pieces-in-hand');
    if (handEl) handEl.textContent = p.piecesInHand;

    const boardEl = panel.querySelector('.pieces-on-board');
    if (boardEl) boardEl.textContent = p.piecesOnBoard;

    const lostEl = panel.querySelector('.pieces-lost');
    if (lostEl) lostEl.textContent = p.piecesLost;

    // Piece indicator dots
    const dotsEl = panel.querySelector('.piece-dots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      const pInfo = theme.players[pid];
      for (let i = 0; i < p.piecesInHand; i++) {
        const dot = document.createElement('span');
        dot.className = 'piece-dot';
        dot.style.background = pInfo.pieceColor;
        dot.style.borderColor = pInfo.strokeColor;
        dotsEl.appendChild(dot);
      }
    }
  }
}

// ─── Move Log ───

let _logDiv = null;

export function addLogEntries(entries, theme) {
  if (!_logDiv) _logDiv = $('.move-log');
  if (!_logDiv) return;

  for (const e of entries) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const pName = theme.players[e.player]?.title || e.player;

    switch (e.action) {
      case 'place':
        div.textContent = `${pName} places at ${e.node}`;
        break;
      case 'mill':
        div.textContent = `${pName} forms a mill!`;
        div.classList.add('log-mill');
        break;
      case 'remove':
        div.textContent = `${pName} removes piece at ${e.node}`;
        div.classList.add('log-remove');
        break;
      case 'move':
        div.textContent = `${pName} moves ${e.from} → ${e.to}`;
        break;
      case 'win':
        div.textContent = `${theme.players[e.winner]?.title || e.winner} wins! (${e.reason})`;
        div.classList.add('log-win');
        break;
      case 'draw':
        div.textContent = `Game drawn (${e.reason})`;
        div.classList.add('log-draw');
        break;
      default:
        div.textContent = JSON.stringify(e);
    }
    _logDiv.appendChild(div);
  }
  _logDiv.scrollTop = _logDiv.scrollHeight;
}

// ─── Overlays ───

export function showOverlay(html) {
  hideOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'setup-overlay';
  overlay.innerHTML = `<div class="overlay-card">${html}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function hideOverlay() {
  const existing = $('.setup-overlay');
  if (existing) existing.remove();
}

export function showWaiting(accessCode) {
  showOverlay(`
    <h2>Waiting for Opponent</h2>
    <p>Share this code:</p>
    <div class="code-display" onclick="navigator.clipboard.writeText('${accessCode}')" title="Click to copy">
      ${accessCode}
    </div>
    <p class="code-hint">Click to copy</p>
    <div class="waiting-pulse">Waiting...</div>
  `);
}

export function showGameOver(result, theme) {
  const isWin = result.winner !== null;
  const title = isWin
    ? `${theme.players[result.winner]?.title || result.winner} Wins!`
    : 'Draw!';
  const reason = result.reason === 'pieces' ? 'Opponent has fewer than 3 pieces'
    : result.reason === 'blocked' ? 'Opponent has no legal moves'
    : result.reason === 'move_limit' ? `No captures in ${result.finalScore} moves`
    : result.reason === 'repetition' ? 'Threefold repetition'
    : result.reason === 'abandon' ? 'Opponent left the game'
    : '';

  showOverlay(`
    <h2>${title}</h2>
    <p>${reason}</p>
    <div style="margin-top:1.5rem;">
      <a href="/play/nine-mens-morris/" class="btn">New Game</a>
    </div>
  `);
}

export function showAbandoned(result, theme) {
  const winner = result.winner ? (theme.players[result.winner]?.title || result.winner) : 'Nobody';
  showOverlay(`
    <h2>Game Abandoned</h2>
    <p>${result.abandonedBy ? 'Your opponent left.' : 'You forfeited.'}</p>
    <p>${winner} wins by default.</p>
    <div style="margin-top:1.5rem;">
      <a href="/play/nine-mens-morris/" class="btn">New Game</a>
    </div>
  `);
}
