// Amazons -- help overlay

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
          <p>Claim territory by restricting your opponent's movement. The player who makes the last move wins.</p>

          <h3>Two-Part Turn</h3>
          <p>Each turn consists of two steps:</p>
          <ul>
            <li><strong>Move an Amazon</strong> -- slide one of your 4 amazons any number of squares in a straight line (horizontal, vertical, or diagonal), like a chess queen. You cannot jump over pieces or arrows.</li>
            <li><strong>Shoot an Arrow</strong> -- the amazon you just moved fires an arrow along a queen's path. The arrow lands on an empty square and permanently blocks it.</li>
          </ul>

          <h3>Amazons</h3>
          <p>Each player has 4 amazons. They move like chess queens: any number of squares in a straight line (horizontal, vertical, or diagonal). They cannot jump over other pieces or arrows.</p>

          <h3>Arrows</h3>
          <p>After moving, your amazon shoots an arrow along any queen path from its new position. The arrow permanently occupies that square. No piece can move through or land on an arrow.</p>

          <h3>Winning</h3>
          <ul>
            <li>If your opponent cannot move any amazon on their turn, you win.</li>
            <li>Territory control is key -- use arrows to wall off sections of the board.</li>
          </ul>

          <h3>Strategy Tips</h3>
          <ul>
            <li>Try to claim large open areas for your amazons while boxing in your opponent.</li>
            <li>Arrows are permanent -- place them carefully to restrict the opponent without limiting yourself.</li>
            <li>The center of the board is valuable early on.</li>
          </ul>

          <h3>Controls</h3>
          <ul>
            <li>Click an amazon to select it (purple ring).</li>
            <li>Click a highlighted square to move the amazon.</li>
            <li>After moving, click a highlighted square to shoot an arrow.</li>
            <li>Press <strong>?</strong> or <strong>H</strong> to toggle this help.</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
