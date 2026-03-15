// Theme loader

let _currentTheme = null;

export async function loadTheme(themeId) {
  const resp = await fetch(`/play/oroboros/themes/${themeId}.json`);
  _currentTheme = await resp.json();

  // Load theme CSS
  let link = document.getElementById('theme-css');
  if (!link) {
    link = document.createElement('link');
    link.id = 'theme-css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = _currentTheme.cssFile;

  return _currentTheme;
}

export function getTheme() {
  return _currentTheme;
}

export function getRoleInfo(roleId) {
  if (!_currentTheme) return null;
  for (const key of Object.keys(_currentTheme.roles)) {
    if (_currentTheme.roles[key].id === roleId) {
      return _currentTheme.roles[key];
    }
  }
  return null;
}

export function getPlayerName(player) {
  if (!_currentTheme) return player;
  return _currentTheme.players[player]?.name || player;
}

export function getTerm(key) {
  if (!_currentTheme) return key;
  return _currentTheme.terms[key] || key;
}

// Get a random lore quote for a given phase/event key
export function getRandomLore(key) {
  if (!_currentTheme?.lore) return '';
  const pool = _currentTheme.lore[key];
  if (!pool || !Array.isArray(pool) || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

// Get the objective text for a given phase key
export function getObjective(key) {
  if (!_currentTheme?.objectives) return '';
  return _currentTheme.objectives[key] || '';
}

export function getCenterInfo() {
  if (!_currentTheme) return { name: 'Center', color: '#6a0dad', symbol: '*' };
  return _currentTheme.center;
}
