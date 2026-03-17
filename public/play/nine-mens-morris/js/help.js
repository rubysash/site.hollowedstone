// Nine Men's Morris — help overlay

let _visible = false;

export function initHelp() {
  document.addEventListener('keydown', e => {
    if (e.key === '?' || e.key === 'h') toggleHelp();
    if (e.key === 'Escape' && _visible) toggleHelp();
  });
}

export function toggleHelp() {
  _visible = !_visible;
  let overlay = document.getElementById('help-overlay');

  if (!_visible) {
    if (overlay) overlay.style.display = 'none';
    return;
  }

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.innerHTML = `
      <div class="help-panel">
        <div class="help-header">
          <h2>How to Play</h2>
          <button class="help-close" onclick="document.getElementById('help-overlay').style.display='none'">&times;</button>
        </div>
        <div class="help-body">
          <h3>Overview</h3>
          <p>9 Men's Morris is a classic strategy game for two players. Each player has <strong>9 pieces</strong>.
          The goal is to reduce your opponent to fewer than 3 pieces or block all their pieces so they cannot move.</p>

          <h3>Phase 1 — Placement</h3>
          <p>Players take turns placing one piece at a time on any empty intersection.
          This continues until all 18 pieces (9 per player) have been placed.</p>

          <h3>Phase 2 — Movement</h3>
          <p>Players take turns sliding one of their pieces along a line to an adjacent empty intersection.
          Pieces can only move to directly connected points — no jumping.</p>

          <h3>Flying</h3>
          <p>When a player is reduced to exactly <strong>3 pieces</strong>, that player may "fly" —
          move a piece to <strong>any</strong> empty intersection, not just adjacent ones.</p>

          <h3>Mills</h3>
          <p>A <strong>mill</strong> is three of your pieces in a row along any line on the board.
          There are 16 possible mills (4 per square + 4 cross-ring lines).</p>
          <p>When you form a mill, you must <strong>remove one opponent piece</strong> from the board.
          You cannot remove a piece that is part of an opponent's mill, unless all their pieces are in mills.</p>
          <p>You can open and close the same mill repeatedly — each time it is re-formed, you remove a piece.</p>

          <h3>Winning</h3>
          <ul>
            <li>Reduce your opponent to <strong>fewer than 3 pieces</strong></li>
            <li>Block all opponent pieces so they have <strong>no legal moves</strong></li>
          </ul>

          <h3>Draws</h3>
          <ul>
            <li>50 moves with no captures</li>
            <li>Threefold repetition of the same position</li>
          </ul>

          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><strong>?</strong> or <strong>H</strong> — Toggle this help</li>
            <li><strong>Esc</strong> — Close help</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
  _visible = true;
}
