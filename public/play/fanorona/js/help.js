// Fanorona — help overlay

let _helpEl = null;

export function initHelp() {
  document.addEventListener('keydown', e => {
    if (e.key === '?' || e.key === 'h') toggleHelp();
    if (e.key === 'Escape' && _helpEl) toggleHelp();
  });
}

export function toggleHelp() {
  if (_helpEl) { _helpEl.remove(); _helpEl = null; return; }

  _helpEl = document.createElement('div');
  _helpEl.id = 'help-overlay';
  _helpEl.innerHTML = `
    <div class="help-panel">
      <div class="help-header">
        <h2>How to Play Fanorona</h2>
        <button class="help-close" onclick="import('./help.js').then(m=>m.toggleHelp())">&times;</button>
      </div>
      <div class="help-body">
        <h3>Overview</h3>
        <p>Fanorona is a traditional Malagasy strategy game for two players. Each player has <strong>22 pieces</strong> on a 5&times;9 grid. The goal is to <strong>capture all opponent pieces</strong> or leave them with no legal move.</p>

        <h3>Movement</h3>
        <ul>
          <li>Pieces move <strong>one step</strong> along any line (horizontal, vertical, or diagonal where available) to an adjacent empty intersection.</li>
          <li><strong>Diagonal lines</strong> exist only on certain intersections (checkerboard pattern).</li>
        </ul>

        <h3>Capture by Approach</h3>
        <p>Move your piece <strong>toward</strong> an enemy piece. All enemy pieces in an unbroken line beyond your landing point (in the direction of movement) are captured.</p>

        <h3>Capture by Withdrawal</h3>
        <p>Move your piece <strong>away from</strong> an enemy piece. All enemy pieces in an unbroken line from your original position (opposite to direction of movement) are captured.</p>

        <h3>Mandatory Capture</h3>
        <p>If any capture exists on the board, <strong>you must capture</strong>. Non-capturing moves (paika) are only allowed when no capture is possible.</p>

        <h3>Chain Captures</h3>
        <ul>
          <li>After capturing, if the same piece can capture again, it <strong>must continue</strong>.</li>
          <li>The piece must <strong>change direction</strong> with each step.</li>
          <li>The piece <strong>cannot revisit</strong> an intersection during the chain.</li>
          <li>You may <strong>voluntarily stop</strong> a chain early using the "End Chain" button.</li>
        </ul>

        <h3>Winning</h3>
        <ul>
          <li>Capture all opponent pieces, or</li>
          <li>Leave the opponent with no legal move.</li>
        </ul>

        <h3>Draws</h3>
        <ul>
          <li>No capture in 50 moves.</li>
          <li>Threefold position repetition.</li>
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(_helpEl);
}
