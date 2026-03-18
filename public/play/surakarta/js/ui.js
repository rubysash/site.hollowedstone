// Surakarta -- UI layer
const $ = sel => document.querySelector(sel);
const text = (sel, t) => { const e = $(sel); if (e) e.textContent = t; };
let _prevMyTurn = null, _logDiv = null, _lastLogSeq = 0;

export function setTurnIndicator(isMyTurn) {
  const bar = $('.status-bar'); if (!bar) return;
  bar.classList.toggle('your-turn', isMyTurn);
  bar.classList.toggle('opponent-turn', !isMyTurn);
  if (isMyTurn && _prevMyTurn === false) { bar.classList.add('turn-flash'); setTimeout(() => bar.classList.remove('turn-flash'), 800); }
  _prevMyTurn = isMyTurn;
  document.title = isMyTurn ? '>> YOUR TURN << | Surakarta' : 'Surakarta';
  const panels = document.querySelectorAll('.player-panel');
  panels.forEach(p => p.classList.remove('you-active'));
  if (isMyTurn) { const myPanel = $(`.player-panel.you`); if (myPanel) myPanel.classList.add('you-active'); }
}

export function setStatus(msg) { text('.turn-info', msg); }

export function updatePlayerPanels(state, myPlayer, theme) {
  for (const pid of ['p1', 'p2']) {
    const panel = $(`.player-panel[data-player="${pid}"]`); if (!panel) continue;
    const p = state.players[pid];
    const isMe = pid === myPlayer;
    const isActive = state.turn.player === pid;
    panel.classList.toggle('active', isActive);
    panel.classList.toggle('you', isMe);
    const nameEl = panel.querySelector('.player-name');
    if (nameEl) { const name = theme.players[pid].title; nameEl.textContent = isMe ? `${name} (You)` : name; }
    const piecesEl = panel.querySelector('.pieces-left');
    if (piecesEl) piecesEl.textContent = p.piecesLeft;
    const capturedEl = panel.querySelector('.pieces-captured');
    if (capturedEl) capturedEl.textContent = p.captured;
  }
}

export function addLogEntries(entries, theme) {
  if (!_logDiv) _logDiv = $('.move-log'); if (!_logDiv) return;
  const newEntries = entries.filter(e => e.seq > _lastLogSeq);
  if (newEntries.length === 0) return;
  _lastLogSeq = newEntries[newEntries.length - 1].seq;
  for (const e of newEntries) {
    const div = document.createElement('div'); div.className = 'log-entry';
    const pName = theme.players[e.player]?.title || e.player;
    switch (e.action) {
      case 'move': div.textContent = `${pName} ${e.from} \u2192 ${e.to}`; break;
      case 'capture': div.textContent = `${pName} ${e.from} \u2192 ${e.to} (loop capture)`; div.classList.add('log-capture'); break;
      case 'win': div.textContent = `${theme.players[e.winner]?.title || e.winner} wins!`; div.classList.add('log-win'); break;
      case 'draw': div.textContent = `Draw (${e.reason})`; div.classList.add('log-draw'); break;
      default: div.textContent = JSON.stringify(e);
    }
    _logDiv.appendChild(div);
  }
  _logDiv.scrollTop = _logDiv.scrollHeight;
}

export function showOverlay(html) { hideOverlay(); const o = document.createElement('div'); o.className = 'setup-overlay'; o.innerHTML = `<div class="overlay-card">${html}</div>`; document.body.appendChild(o); }
export function hideOverlay() { const e = $('.setup-overlay'); if (e) e.remove(); }

export function showWaiting(accessCode) {
  showOverlay(`<h2>Waiting for Opponent</h2><p>Share this code:</p><div class="code-display" onclick="navigator.clipboard.writeText('${accessCode}')" title="Click to copy">${accessCode}</div><p class="code-hint">Click to copy</p><div class="waiting-pulse">Waiting...</div>`);
}

export function showGameOver(result, theme) {
  const isWin = result.winner !== null;
  const title = isWin ? `${theme.players[result.winner]?.title || result.winner} Wins!` : 'Draw!';
  const reason = result.reason === 'elimination' ? 'All opponent pieces captured'
    : result.reason === 'move_limit' ? 'Move limit reached' : result.reason === 'repetition' ? 'Threefold repetition' : '';
  showOverlay(`<h2>${title}</h2><p>${reason}</p><div style="margin-top:1.5rem;"><a href="/play/surakarta/" class="btn">New Game</a></div>`);
}

export function showAbandoned(result, theme) {
  const winner = result.winner ? (theme.players[result.winner]?.title || result.winner) : 'Nobody';
  showOverlay(`<h2>Game Abandoned</h2><p>${result.abandonedBy ? 'Your opponent left.' : 'You forfeited.'}</p><p>${winner} wins by default.</p><div style="margin-top:1.5rem;"><a href="/play/surakarta/" class="btn">New Game</a></div>`);
}
