// Lines of Action -- help overlay

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
          <h2>How to Play</h2>
          <button class="help-close" onclick="document.getElementById('help-overlay').remove()">&times;</button>
        </div>
        <div class="help-body">
          <h3>Goal</h3>
          <p>Connect all your remaining pieces into a single contiguous group. Pieces are connected horizontally, vertically, or diagonally.</p>

          <h3>Movement</h3>
          <p>On your turn, move one piece in a straight line (horizontal, vertical, or diagonal). The piece moves <strong>exactly as many squares</strong> as there are pieces (yours and your opponent's) on that line.</p>
          <p>Count all pieces on the entire row, column, or diagonal the piece would travel along. That count is the exact distance it must move.</p>

          <h3>Jumping</h3>
          <ul>
            <li>You <strong>can</strong> jump over your own pieces.</li>
            <li>You <strong>cannot</strong> jump over enemy pieces. They block your path.</li>
          </ul>

          <h3>Capture</h3>
          <p>Land on an enemy piece to capture and remove it permanently. Captures are not mandatory.</p>
          <p><strong>Warning:</strong> Capturing reduces your opponent's piece count, making it easier for them to connect. Capture with care.</p>

          <h3>Winning</h3>
          <ul>
            <li>All your pieces form one connected group = you win.</li>
            <li>Reduced to a single piece = you win (one piece is connected).</li>
            <li>If both players connect on the same move, the moving player wins.</li>
            <li>If your opponent has no legal moves, you win.</li>
          </ul>

          <h3>Draws</h3>
          <ul>
            <li>Threefold repetition of the same position.</li>
            <li>100 moves with no capture (configurable).</li>
          </ul>

          <h3>Controls</h3>
          <ul>
            <li>Click a piece to select it and see valid moves.</li>
            <li>Click a highlighted square to move.</li>
            <li>Click the selected piece again to deselect.</li>
            <li>Press <strong>?</strong> or <strong>H</strong> to toggle this help.</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
