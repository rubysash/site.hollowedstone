// Network layer — API calls + polling

// Base path for this game — all API and navigation paths use this
const BASE = '/play/oroboros';

let _accessCode = null;
let _token = null;
let _player = null;
let _pollInterval = null;
let _lastSeq = 0;
let _onStateUpdate = null;

export function getBasePath() { return BASE; }

export function initNet(accessCode, token, player) {
  _accessCode = accessCode;
  _token = token;
  _player = player;
}

export function getPlayer() { return _player; }
export function getAccessCode() { return _accessCode; }

async function api(path, method, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    body.accessCode = _accessCode;
    body.token = _token;
    opts.body = JSON.stringify(body);
  }
  const url = method === 'GET'
    ? `${BASE}${path}${path.includes('?') ? '&' : '?'}game=${_accessCode}&token=${_token}`
    : `${BASE}${path}`;
  const resp = await fetch(url, opts);
  return resp.json();
}

export async function createGame(theme) {
  const resp = await fetch(`${BASE}/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme })
  });
  return resp.json();
}

export async function joinGame(accessCode) {
  const resp = await fetch(`${BASE}/api/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode })
  });
  return resp.json();
}

// ─── Polling with adaptive rate + inactivity timeout ───

const POLL_FAST = 2000;       // 2s — waiting for opponent's move
const POLL_SLOW = 5000;       // 5s — it's your turn
const POLL_BACKGROUND = 30000; // 30s — tab hidden
const IDLE_TIMEOUT = 90000;    // 90s no interaction → pause
const HIDDEN_TIMEOUT = 120000; // 2min tab hidden → full stop

let _currentPollRate = POLL_FAST;
let _paused = false;
let _idleTimer = null;
let _hiddenTimer = null;
let _lastActivity = Date.now();

export function pollState(callback) {
  _onStateUpdate = callback;
  _lastSeq = 0;
  _paused = false;
  doPoll(); // immediate first poll
  _schedulePoll();
  _startIdleWatch();
}

function _schedulePoll() {
  if (_pollInterval) clearInterval(_pollInterval);
  if (_paused) return;
  _pollInterval = setInterval(doPoll, _currentPollRate);
}

export function setPollRate(isMyTurn) {
  const newRate = isMyTurn ? POLL_SLOW : POLL_FAST;
  if (newRate !== _currentPollRate && !_paused) {
    _currentPollRate = newRate;
    _schedulePoll();
  }
}

export function stopPolling() {
  _paused = true;
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
  if (_hiddenTimer) { clearTimeout(_hiddenTimer); _hiddenTimer = null; }
  _removeIdleWatch();
}

// Pause polling and show reconnect overlay
function _pauseForIdle() {
  if (_paused) return;
  _paused = true;
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  _showIdleOverlay();
}

// Resume polling after user interaction
export function resumePolling() {
  if (!_paused || !_onStateUpdate) return;
  _paused = false;
  _hideIdleOverlay();
  _lastActivity = Date.now();
  doPoll(); // immediate refresh
  _schedulePoll();
  _resetIdleTimer();
}

async function doPoll() {
  if (_paused) return;
  try {
    const data = await api(`/api/state?since=${_lastSeq}`, 'GET');
    if (data.error) return;
    if (data.log && data.log.length > 0) {
      _lastSeq = data.log[data.log.length - 1].seq;
    }
    if (_onStateUpdate) _onStateUpdate(data);
  } catch (e) {
    // Network error — silent retry on next interval
  }
}

// ─── Idle detection ───

function _startIdleWatch() {
  _activityEvents.forEach(evt => document.addEventListener(evt, _onActivity, { passive: true }));
  document.addEventListener('visibilitychange', _onVisibilityChange);
  _resetIdleTimer();
}

function _removeIdleWatch() {
  _activityEvents.forEach(evt => document.removeEventListener(evt, _onActivity));
  document.removeEventListener('visibilitychange', _onVisibilityChange);
}

const _activityEvents = ['click', 'keydown', 'touchstart', 'mousemove'];

function _onActivity() {
  _lastActivity = Date.now();
  if (_paused) {
    resumePolling();
  } else {
    _resetIdleTimer();
  }
}

function _resetIdleTimer() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    if (!_paused) _pauseForIdle();
  }, IDLE_TIMEOUT);
}

function _onVisibilityChange() {
  if (document.hidden) {
    // Tab hidden — slow down immediately, full stop after 2 min
    if (!_paused) {
      _currentPollRate = POLL_BACKGROUND;
      _schedulePoll();
      _hiddenTimer = setTimeout(() => {
        if (document.hidden && !_paused) _pauseForIdle();
      }, HIDDEN_TIMEOUT);
    }
  } else {
    // Tab visible again
    if (_hiddenTimer) { clearTimeout(_hiddenTimer); _hiddenTimer = null; }
    if (_paused) {
      resumePolling();
    } else {
      // Restore normal rate and poll immediately
      _currentPollRate = POLL_FAST;
      _schedulePoll();
      doPoll();
    }
  }
}

// ─── Idle overlay UI ───

function _showIdleOverlay() {
  if (document.getElementById('idle-overlay')) return;
  const div = document.createElement('div');
  div.id = 'idle-overlay';
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:200;';
  div.innerHTML = `
    <div style="text-align:center;color:#e0e0e0;font-family:sans-serif;">
      <div style="font-size:1.4rem;margin-bottom:0.8rem;">Connection Paused</div>
      <div style="color:#8888aa;margin-bottom:1.5rem;font-size:0.95rem;">Polling stopped to save resources.</div>
      <button id="idle-resume-btn" style="background:#6a0dad;color:white;border:none;border-radius:6px;padding:0.7rem 2rem;font-size:1.1rem;cursor:pointer;">Resume Game</button>
    </div>`;
  document.body.appendChild(div);
  document.getElementById('idle-resume-btn').addEventListener('click', resumePolling);
}

function _hideIdleOverlay() {
  const el = document.getElementById('idle-overlay');
  if (el) el.remove();
}

export async function sendSetup(action, extra) {
  return api('/api/setup', 'POST', { action, ...extra });
}

export async function sendMove(from, to, restoreRole) {
  return api('/api/move', 'POST', { from, to, restoreRole });
}

export async function fetchReplay(accessCode) {
  const resp = await fetch(`${BASE}/api/replay/${accessCode}`);
  return resp.json();
}

// Persistence via localStorage
export function saveSession(accessCode, player, token) {
  localStorage.setItem(`ouroboros_${accessCode}`, JSON.stringify({ player, token }));
}

export function loadSession(accessCode) {
  const raw = localStorage.getItem(`ouroboros_${accessCode}`);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession(accessCode) {
  localStorage.removeItem(`ouroboros_${accessCode}`);
}
