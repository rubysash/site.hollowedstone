// Help popup — renders full themed rules

import { getTheme, getRoleInfo, getPlayerName, getTerm, getCenterInfo } from './themes.js';
import { getPlayerRoleIds } from './shared/constants.js';

let _open = false;

export function toggleHelp() {
  _open ? closeHelp() : openHelp();
}

export function openHelp() {
  if (_open) return;
  _open = true;

  const theme = getTheme();
  if (!theme) return;

  const r1 = theme.roles.role1;
  const r2 = theme.roles.role2;
  const r3 = theme.roles.role3;
  const r4 = theme.roles.role4;
  const center = getCenterInfo();
  const t = (k) => getTerm(k);
  const p1Roles = getPlayerRoleIds('p1', theme);
  const p2Roles = getPlayerRoleIds('p2', theme);
  const p1r1 = getRoleInfo(p1Roles[0]);
  const p1r2 = getRoleInfo(p1Roles[1]);
  const p2r1 = getRoleInfo(p2Roles[0]);
  const p2r2 = getRoleInfo(p2Roles[1]);

  const overlay = document.createElement('div');
  overlay.id = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-panel">
      <div class="help-header">
        <h2>${theme.name} — Rules</h2>
        <button class="help-close" onclick="document.getElementById('help-overlay').remove()">&times;</button>
      </div>
      <div class="help-body">

        <h3>The Cycle</h3>
        <p>Four forces form a closed loop. Each beats exactly one other:</p>
        <div class="help-cycle">
          <div><span class="help-dot" style="background:${r1.color}"></span> <strong>${r1.name}</strong> ${r1.beatsLabel}</div>
          <div><span class="help-dot" style="background:${r2.color}"></span> <strong>${r2.name}</strong> ${r2.beatsLabel}</div>
          <div><span class="help-dot" style="background:${r3.color}"></span> <strong>${r3.name}</strong> ${r3.beatsLabel}</div>
          <div><span class="help-dot" style="background:${r4.color}"></span> <strong>${r4.name}</strong> ${r4.beatsLabel}</div>
        </div>

        <h3>Players</h3>
        <p>
          <strong>${getPlayerName('p1')}</strong>:
          <span class="help-dot" style="background:${p1r1.color}"></span> ${p1r1.name} +
          <span class="help-dot" style="background:${p1r2.color}"></span> ${p1r2.name}
          <br>
          <strong>${getPlayerName('p2')}</strong>:
          <span class="help-dot" style="background:${p2r1.color}"></span> ${p2r1.name} +
          <span class="help-dot" style="background:${p2r2.color}"></span> ${p2r2.name}
        </p>
        <p>Your two forces do not beat each other — you can never ${t('displace')} your own stones.</p>

        <h3>Setup</h3>
        <ul>
          <li>Each player has <strong>5 stones</strong> — secretly choose a 3+2 split between your two forces.</li>
          <li>Take turns placing stones on your starting edge (top or bottom row).</li>
          <li>${getPlayerName('p2')} gets one free move before ${getPlayerName('p1')}'s first turn.</li>
        </ul>

        <h3>Your Turn</h3>
        <ul>
          <li><strong>2 moves</strong> per turn. Each move = one stone, one step to an adjacent hex.</li>
          <li>Holding ${center.name} = <strong>3 moves</strong> per turn (that stone is locked).</li>
        </ul>

        <h3>${t('partnership')}</h3>
        <p>A stone may only advance <strong>toward center</strong> if it starts adjacent to at least one friendly stone. Isolated stones can only move sideways or away from center.</p>

        <h3>${t('displace')}</h3>
        <ul>
          <li>Move onto a hex occupied by an enemy stone your force beats in the cycle.</li>
          <li>The ${t('displace')}d stone goes to ${t('holding')}.</li>
          <li><strong>Restoration:</strong> Spend 1 move to return any held stone to an empty hex on your starting edge.</li>
          <li>Nothing is permanently lost.</li>
        </ul>

        <h3>Ko Rule</h3>
        <p>A stone may not return to a hex it occupied 2 or fewer moves ago.</p>

        <h3>${center.name}</h3>
        <table class="help-table">
          <tr><th>State</th><th>Moves</th><th>${t('partnership')}</th><th>${t('displace')}</th></tr>
          <tr><td>Normal (empty)</td><td>2</td><td>Required</td><td>Cycle applies</td></tr>
          <tr><td>You hold ${center.name}</td><td>3 (locked)</td><td>Required</td><td>Any force at center</td></tr>
          <tr><td>Opponent holds</td><td>2</td><td>Suspended</td><td>Max 1 per turn</td></tr>
        </table>
        <ul>
          <li>The stone on ${center.name} can ${t('displace')} any adjacent enemy regardless of cycle.</li>
          <li>Any adjacent enemy can ${t('displace')} it regardless of cycle.</li>
          <li>It cannot leave voluntarily.</li>
        </ul>

        <h3>${t('berserker')}</h3>
        <p>When your opponent holds ${center.name}, ${t('partnership')} is <strong>suspended entirely</strong>. You get 2 free moves. Only 1 may be a ${t('displace')}.</p>

        <h3>Winning</h3>
        <p>First to <strong>5 ${t('displace')} points</strong> wins. Every ${t('displace')} = 1 point.</p>

      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeHelp();
  });

  document.body.appendChild(overlay);
}

export function closeHelp() {
  _open = false;
  const el = document.getElementById('help-overlay');
  if (el) el.remove();
}

// Keyboard shortcut: ? or h to toggle
document.addEventListener('keydown', (e) => {
  if (e.key === '?' || (e.key === 'h' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT')) {
    toggleHelp();
  }
  if (e.key === 'Escape' && _open) {
    closeHelp();
  }
});
