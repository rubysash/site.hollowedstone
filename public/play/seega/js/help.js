// Seega -- help overlay

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
          <h2>How to Play Seega</h2>
          <button class="help-close" onclick="document.getElementById('help-overlay').remove()">&times;</button>
        </div>
        <div class="help-body">
          <h3>Overview</h3>
          <p>Seega is an ancient Egyptian custodian-capture strategy game played on a 5x5 grid. Each player has 12 pieces. The goal is to capture all of your opponent's pieces or block them from moving.</p>

          <h3>Placement Phase</h3>
          <ul>
            <li>Players alternate placing <strong>2 pieces per turn</strong> onto empty squares.</li>
            <li>The <strong>center square (c3)</strong> must remain empty during placement.</li>
            <li>Player 1 (Dark) places first.</li>
            <li>Placement continues until all 24 pieces are on the board.</li>
          </ul>

          <h3>Movement Phase</h3>
          <ul>
            <li>Player 2 (Light) moves first.</li>
            <li><strong>First move:</strong> Player 2's first move must be to the center square.</li>
            <li>On each turn, move one piece <strong>one step orthogonally</strong> (up, down, left, or right) to an adjacent empty square.</li>
            <li>No diagonal movement.</li>
          </ul>

          <h3>Custodian Capture</h3>
          <ul>
            <li>When you move a piece so that an opponent's piece is <strong>sandwiched</strong> between two of your pieces (orthogonally), the sandwiched piece is captured and removed.</li>
            <li>Multiple captures can occur in a single move if several pieces are sandwiched.</li>
            <li>Captures are <strong>not mandatory</strong>.</li>
          </ul>

          <h3>Center Square</h3>
          <ul>
            <li>The center square (c3, marked with a gold border) is a <strong>safe zone</strong>.</li>
            <li>A piece on the center square <strong>cannot be captured</strong>.</li>
          </ul>

          <h3>Winning</h3>
          <ul>
            <li><strong>Elimination:</strong> Capture all opponent pieces.</li>
            <li><strong>Blocked:</strong> If your opponent has no legal moves, you win.</li>
            <li><strong>Move limit:</strong> After a set number of moves without captures, the player with more pieces wins (or draw if tied).</li>
          </ul>

          <h3>Controls</h3>
          <ul>
            <li><strong>Placement:</strong> Click an empty square to place a piece.</li>
            <li><strong>Movement:</strong> Click a piece to select, then click an adjacent empty square to move.</li>
            <li>Click the selected piece again to deselect.</li>
            <li>Press <strong>?</strong> or <strong>H</strong> to toggle this help.</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
