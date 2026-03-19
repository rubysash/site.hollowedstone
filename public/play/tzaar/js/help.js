// TZAAR -- help overlay

let _helpVisible = false;

export function initHelp() {
  document.addEventListener('keydown', e => {
    if (e.key === '?' || e.key === 'h' || e.key === 'H') toggleHelp();
    if (e.key === 'Escape' && _helpVisible) toggleHelp();
  });
}

export function toggleHelp() {
  _helpVisible = !_helpVisible;
  let overlay = document.getElementById('help-overlay');

  if (!_helpVisible && overlay) {
    overlay.remove();
    return;
  }

  if (_helpVisible && !overlay) {
    overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.innerHTML = `
      <div class="help-panel">
        <div class="help-header">
          <h2>How to Play TZAAR</h2>
          <button class="help-close" onclick="document.getElementById('help-overlay').remove()">&times;</button>
        </div>
        <div class="help-body">
          <h3>Overview</h3>
          <p>TZAAR is a two-player strategy game from the GIPF Project. Each player controls 30 pieces of three types on a hex board with 60 spaces and a center hole.</p>

          <h3>Piece Types</h3>
          <ul>
            <li><strong>Tzaar (T)</strong> -- 6 per player. The most important type.</li>
            <li><strong>Tzarra (Z)</strong> -- 9 per player.</li>
            <li><strong>Tott (t)</strong> -- 15 per player. The most numerous.</li>
          </ul>

          <h3>Setup</h3>
          <p>All 60 pieces (30 White, 30 Black) are randomly placed on the 60 spaces. The center is always empty (a hole).</p>

          <h3>Two-Action Turns</h3>
          <p>Each turn consists of <strong>two actions</strong>:</p>
          <ul>
            <li><strong>Action 1 (required):</strong> You must <strong>capture</strong> an opponent's piece.</li>
            <li><strong>Action 2 (choose one):</strong> Capture another opponent piece, <strong>stack</strong> one of your pieces onto another, or <strong>pass</strong>.</li>
          </ul>
          <p><strong>Exception:</strong> White's very first turn is only 1 action (a single capture).</p>

          <h3>Movement</h3>
          <p>Pieces move in a straight line along any of the 6 hex directions. A piece slides until it hits the <strong>first occupied space</strong> in that direction. You cannot jump over pieces or cross the center hole.</p>

          <h3>Capturing</h3>
          <p>Move your piece onto an opponent's piece to capture it. Your piece (or stack) must be <strong>at least as tall</strong> as the target. Captured pieces are removed from the game.</p>

          <h3>Stacking</h3>
          <p>Move one of your pieces onto another of your pieces. The moving piece goes on top, and the stack height increases. Stacking makes pieces harder to capture and extends their reach. The <strong>top piece's type</strong> determines the stack's type.</p>

          <h3>Losing Conditions</h3>
          <p>You lose if:</p>
          <ul>
            <li>You have <strong>no pieces of one type</strong> left on the board (all your Tzaar, Tzarra, or Tott are gone).</li>
            <li>You <strong>cannot make a capture</strong> on your first action.</li>
          </ul>

          <h3>Controls</h3>
          <ul>
            <li>Click a piece to select it and see valid targets.</li>
            <li>Click a highlighted target to capture or stack.</li>
            <li>Click the selected piece again to deselect.</li>
            <li>Click <strong>Pass</strong> during your second action to end your turn.</li>
            <li>Press <strong>?</strong> or <strong>H</strong> to toggle this help.</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
