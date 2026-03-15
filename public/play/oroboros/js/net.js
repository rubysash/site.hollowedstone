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

// ─── Polling with exponential backoff on inactivity ───
//
// Active play:  2s or 5s (adaptive)
// No activity:  doubles each cycle → 4s, 8s, 16s, 32s, 60s (cap)
// After max:    stops entirely, shows resume overlay
// Any interaction: instantly resets to fast polling
//
// Tab hidden:   jumps straight to 30s, continues backoff from there

const POLL_FAST = 2000;     // 2s — waiting for opponent
const POLL_MY_TURN = 5000;  // 5s — it's your turn
const POLL_MAX = 60000;     // 60s — cap before full stop
const BACKOFF_MULTIPLIER = 2;
const MAX_BACKOFF_STEPS = 6; // after 6 doublings from max base, stop entirely

let _basePollRate = POLL_FAST;  // set by setPollRate (turn-aware)
let _currentPollRate = POLL_FAST;
let _backoffSteps = 0;
let _paused = false;
let _stopped = false; // permanent stop (game over)
let _pollTimeout = null;

export function pollState(callback) {
  _onStateUpdate = callback;
  _lastSeq = 0;
  _paused = false;
  _stopped = false;
  _backoffSteps = 0;
  doPoll();
  _startActivityWatch();
}

function _scheduleNext() {
  if (_pollTimeout) clearTimeout(_pollTimeout);
  if (_paused || _stopped) return;
  _pollTimeout = setTimeout(doPoll, _currentPollRate);
}

function _applyBackoff() {
  // Double the current rate, capped at POLL_MAX
  _currentPollRate = Math.min(_currentPollRate * BACKOFF_MULTIPLIER, POLL_MAX);
  _backoffSteps++;

  // After enough steps at max rate, stop entirely
  if (_currentPollRate >= POLL_MAX && _backoffSteps >= MAX_BACKOFF_STEPS) {
    _pauseForIdle();
  }
}

function _resetToActive() {
  _backoffSteps = 0;
  _currentPollRate = _basePollRate;
  _hideIdleOverlay();
  if (_paused && !_stopped) {
    _paused = false;
    doPoll(); // immediate refresh
  }
}

export function setPollRate(isMyTurn) {
  _basePollRate = isMyTurn ? POLL_MY_TURN : POLL_FAST;
  // Only reset current rate if we're in active mode (not backed off)
  if (_backoffSteps === 0) {
    _currentPollRate = _basePollRate;
  }
}

export function stopPolling() {
  _stopped = true;
  _paused = true;
  if (_pollTimeout) { clearTimeout(_pollTimeout); _pollTimeout = null; }
  _removeActivityWatch();
}

function _pauseForIdle() {
  if (_paused) return;
  _paused = true;
  if (_pollTimeout) { clearTimeout(_pollTimeout); _pollTimeout = null; }
  _showIdleOverlay();
}

async function doPoll() {
  if (_paused || _stopped) return;
  try {
    const data = await api(`/api/state?since=${_lastSeq}`, 'GET');
    if (data.error) { _scheduleNext(); return; }

    const hadNewData = data.log && data.log.length > 0;
    if (hadNewData) {
      _lastSeq = data.log[data.log.length - 1].seq;
      // New data from server = something happened, reset backoff
      _backoffSteps = 0;
      _currentPollRate = _basePollRate;
    } else {
      // No new data — back off
      _applyBackoff();
    }

    if (_onStateUpdate) _onStateUpdate(data);
  } catch (e) {
    _applyBackoff();
  }
  _scheduleNext();
}

// ─── Activity detection — any interaction resets to fast polling ───

const _activityEvents = ['click', 'keydown', 'touchstart'];

function _startActivityWatch() {
  _activityEvents.forEach(evt => document.addEventListener(evt, _onActivity, { passive: true }));
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

function _removeActivityWatch() {
  _activityEvents.forEach(evt => document.removeEventListener(evt, _onActivity));
  document.removeEventListener('visibilitychange', _onVisibilityChange);
}

function _onActivity() {
  _resetToActive();
  _scheduleNext();
}

function _onVisibilityChange() {
  if (document.hidden) {
    // Tab hidden — jump to slow polling immediately
    if (!_paused && !_stopped) {
      _currentPollRate = Math.max(_currentPollRate, 30000);
      _scheduleNext();
    }
  } else {
    // Tab visible — reset if paused, otherwise refresh immediately
    if (_paused && !_stopped) {
      _resetToActive();
      _scheduleNext();
    } else if (!_stopped) {
      _resetToActive();
      doPoll();
    }
  }
}

// ─── Idle overlay ───

function _showIdleOverlay() {
  if (document.getElementById('idle-overlay')) return;
  const div = document.createElement('div');
  div.id = 'idle-overlay';
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:200;';
  div.innerHTML = `
    <div style="text-align:center;color:#e0e0e0;font-family:sans-serif;">
      <div style="font-size:1.4rem;margin-bottom:0.8rem;">Connection Paused</div>
      <div style="color:#8888aa;margin-bottom:1.5rem;font-size:0.95rem;">Click anywhere or press any key to reconnect.</div>
    </div>`;
  document.body.appendChild(div);
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
