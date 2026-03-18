// Tablut -- help overlay
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
          <h3>Asymmetric Game</h3>
          <p><strong>Attackers</strong> (16 dark pieces) try to capture the King. <strong>Defenders</strong> (8 light pieces + 1 gold King) try to escort the King to a corner.</p>

          <h3>Movement</h3>
          <p>All pieces move like a rook in chess: any number of empty squares horizontally or vertically. No diagonal movement. No jumping.</p>
          <p>Only the King may land on the <strong>throne</strong> (center) or <strong>corner</strong> squares.</p>

          <h3>Capture</h3>
          <p>Sandwich an enemy piece between two of yours along a line to capture it. The throne (when empty) and corners count as capturing pieces.</p>
          <p>A single move can capture multiple pieces in different directions.</p>

          <h3>Capturing the King</h3>
          <ul>
            <li><strong>On the throne:</strong> Surround on all 4 sides with attackers.</li>
            <li><strong>Next to the throne:</strong> Surround on 3 sides (throne counts as 4th).</li>
            <li><strong>Elsewhere:</strong> Sandwich between 2 attackers like a normal piece.</li>
          </ul>
          <p>The King cannot capture. It is unarmed.</p>

          <h3>Winning</h3>
          <ul>
            <li><strong>Defenders win</strong> when the King reaches any corner square.</li>
            <li><strong>Attackers win</strong> when the King is captured.</li>
          </ul>

          <h3>Raichi / Tuichi</h3>
          <p><strong>Raichi:</strong> King has 1 clear path to a corner (like "check").</p>
          <p><strong>Tuichi:</strong> King has 2+ paths to corners (usually unstoppable).</p>

          <h3>Controls</h3>
          <ul>
            <li>Click a piece to select, click a square to move.</li>
            <li>Press <strong>?</strong> or <strong>H</strong> for help.</li>
          </ul>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
}
