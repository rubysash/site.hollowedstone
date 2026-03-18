// Surakarta -- help overlay
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
  if (!_helpVisible && overlay) { overlay.remove(); return; }
  if (_helpVisible && !overlay) {
    overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.innerHTML = `
      <div class="help-panel">
        <div class="help-header"><h2>How to Play</h2><button class="help-close" onclick="document.getElementById('help-overlay').remove()">&times;</button></div>
        <div class="help-body">
          <h3>Goal</h3>
          <p>Capture all 12 of your opponent's pieces.</p>
          <h3>Regular Move</h3>
          <p>Move one piece <strong>one step</strong> in any direction (horizontal, vertical, or diagonal) to an adjacent empty intersection.</p>
          <h3>Capture (Loop Move)</h3>
          <p>To capture, a piece travels along grid lines and through <strong>at least one corner loop arc</strong>, then lands on an opponent's piece. The entire path must be empty except the target.</p>
          <ul>
            <li>The piece enters a loop from a grid line, follows the curved arc, and exits onto a perpendicular grid line.</li>
            <li>It can pass through multiple loops in one capture.</li>
            <li>Captures are <strong>optional</strong>. You are never forced to capture.</li>
            <li>You <strong>cannot</strong> capture without using a loop. Straight-line captures are not allowed.</li>
          </ul>
          <h3>The Loops</h3>
          <p>There are 8 loop arcs (4 inner, 4 outer) at the four corners. Inner loops (blue) connect the 2nd points from each corner. Outer loops (red) connect the 3rd points.</p>
          <h3>Controls</h3>
          <ul>
            <li>Click a piece to select it and see valid moves.</li>
            <li>Green markers show regular moves and capture targets.</li>
            <li>Click a target to move or capture.</li>
            <li>Press <strong>?</strong> or <strong>H</strong> for help.</li>
          </ul>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
}
