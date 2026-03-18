// Abalone -- help overlay

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
        <div class="help-header">
          <h2>How to Play</h2>
          <button class="help-close" onclick="document.getElementById('help-overlay').remove()">&times;</button>
        </div>
        <div class="help-body">
          <h3>Goal</h3>
          <p>Push <strong>6</strong> of your opponent's marbles off the edge of the board.</p>

          <h3>Selecting Marbles</h3>
          <p>Click one of your marbles to select it. Click an adjacent friendly marble to add it to the group (up to 3 in a line). Click a selected marble to deselect it.</p>

          <h3>Moving</h3>
          <p>After selecting 1-3 marbles, direction arrows appear around the group. Click an arrow to move.</p>
          <ul>
            <li><strong>Inline:</strong> Move along the line of your group. Can push opponents.</li>
            <li><strong>Broadside:</strong> Move sideways (perpendicular to the line). Cannot push.</li>
          </ul>

          <h3>Pushing (Sumito)</h3>
          <p>When moving inline, you can push opponent marbles if you have more marbles in the line:</p>
          <ul>
            <li>2 of yours can push 1 opponent</li>
            <li>3 of yours can push 1 or 2 opponents</li>
            <li>Equal groups cannot push each other</li>
            <li>A group of 3 opponent marbles cannot be pushed</li>
          </ul>

          <h3>Elimination</h3>
          <p>A marble pushed off the board edge is permanently eliminated. First to push 6 off wins.</p>

          <h3>Controls</h3>
          <ul>
            <li>Click marble to select/deselect</li>
            <li>Click adjacent friendly marble to extend group</li>
            <li>Click direction arrow to move</li>
            <li>Press <strong>?</strong> or <strong>H</strong> for help</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}
