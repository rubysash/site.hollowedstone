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

// ─── Adaptive polling with burst + exponential backoff ───
//
// Burst mode (1s):    triggered when you make a move or opponent's move arrives
//                     lasts 10 seconds then settles to normal rate
// Waiting (3s):       opponent's turn, waiting for their move
// My turn (8s):       your turn — you know your own state, slow poll
// Backoff:            no changes → doubles: 6s, 12s, 24s, 48s, 60s cap
// Full stop:          after ~4 min of no changes, shows resume overlay
// Tab hidden:         jumps to 30s, continues backoff
// Any interaction:    resets to current base rate
//
// Cost estimate:
//   Active volley (both moving fast): ~2400 req/hr per game (burst 1s)
//   Thinking time: ~600 req/hr per game (8s + 3s)
//   Idle/forgotten: 0 after ~4 min
//   10 concurrent games, mixed: ~10k-15k req/hr → 100k lasts 7-10 hrs

const POLL_BURST = 1000;     // 1s — burst after move (snappy response)
const POLL_WAITING = 3000;   // 3s — opponent's turn, normal waiting
const POLL_MY_TURN = 8000;   // 8s — your turn, you know your state
const POLL_MAX = 60000;      // 60s — cap before full stop
const BURST_DURATION = 10000; // 10s of burst mode after an event
const BACKOFF_MULTIPLIER = 2;
const MAX_BACKOFF_STEPS = 6;

let _basePollRate = POLL_WAITING;
let _currentPollRate = POLL_WAITING;
let _backoffSteps = 0;
let _paused = false;
let _stopped = false;
let _pollTimeout = null;
let _burstUntil = 0;  // timestamp when burst mode ends
let _nextPollAt = 0;  // timestamp of next scheduled poll
let _countdownInterval = null;

export function pollState(callback) {
  _onStateUpdate = callback;
  _lastSeq = 0;
  _paused = false;
  _stopped = false;
  _backoffSteps = 0;
  _burstUntil = 0;
  doPoll();
  _startActivityWatch();
}

// Call after making a move — triggers burst polling for fast opponent response
export function triggerBurst() {
  _burstUntil = Date.now() + BURST_DURATION;
  _backoffSteps = 0;
  _currentPollRate = POLL_BURST;
  // Reschedule immediately at burst rate
  if (_pollTimeout) clearTimeout(_pollTimeout);
  if (!_paused && !_stopped) _scheduleNext();
}

function _scheduleNext() {
  if (_pollTimeout) clearTimeout(_pollTimeout);
  if (_paused || _stopped) {
    _updatePollDisplay();
    return;
  }
  _nextPollAt = Date.now() + _currentPollRate;
  _pollTimeout = setTimeout(doPoll, _currentPollRate);
  _startCountdown();
}

// ─── Poll countdown display ───

function _startCountdown() {
  if (_countdownInterval) clearInterval(_countdownInterval);
  _updatePollDisplay();
  _countdownInterval = setInterval(_updatePollDisplay, 250);
}

function _updatePollDisplay() {
  const el = document.getElementById('poll-status');
  if (!el) return;

  if (_stopped) {
    el.textContent = 'Game over — polling stopped';
    if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
    return;
  }
  if (_paused) {
    el.textContent = 'Paused — click anywhere to reconnect';
    if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
    return;
  }

  const remaining = Math.max(0, Math.ceil((_nextPollAt - Date.now()) / 1000));
  const rate = (_currentPollRate / 1000).toFixed(1);
  const mode = Date.now() < _burstUntil ? 'burst'
    : _isIdle ? 'idle'
    : _currentPollRate <= POLL_WAITING ? 'active'
    : 'thinking';

  el.textContent = `Sync in ${remaining}s (${rate}s ${mode})`;
}

function _effectiveRate() {
  // If in burst window, use burst rate
  if (Date.now() < _burstUntil) return POLL_BURST;
  return _basePollRate;
}

function _applyBackoff() {
  _currentPollRate = Math.min(_currentPollRate * BACKOFF_MULTIPLIER, POLL_MAX);
  _backoffSteps++;
  if (_currentPollRate >= POLL_MAX && _backoffSteps >= MAX_BACKOFF_STEPS) {
    _pauseForIdle();
  }
}

function _resetToActive() {
  _backoffSteps = 0;
  _currentPollRate = _effectiveRate();
  _hideIdleOverlay();
  if (_paused && !_stopped) {
    _paused = false;
    doPoll();
  }
}

export function setPollRate(isMyTurn) {
  _basePollRate = isMyTurn ? POLL_MY_TURN : POLL_WAITING;
  if (_backoffSteps === 0) {
    _currentPollRate = _effectiveRate();
  }
}

export function stopPolling() {
  _stopped = true;
  _paused = true;
  if (_pollTimeout) { clearTimeout(_pollTimeout); _pollTimeout = null; }
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
  _removeActivityWatch();
  _updatePollDisplay();
}

function _pauseForIdle() {
  if (_paused) return;
  _paused = true;
  if (_pollTimeout) { clearTimeout(_pollTimeout); _pollTimeout = null; }
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
  _showIdleOverlay();
  _updatePollDisplay();
}

async function doPoll() {
  if (_paused || _stopped) return;
  try {
    const data = await api(`/api/state?since=${_lastSeq}`, 'GET');
    if (data.error) { _scheduleNext(); return; }

    const hadNewData = data.log && data.log.length > 0;
    if (hadNewData) {
      _lastSeq = data.log[data.log.length - 1].seq;
      // New data! Enter burst mode — opponent just acted, they may act again soon
      _burstUntil = Date.now() + BURST_DURATION;
      _backoffSteps = 0;
      _currentPollRate = POLL_BURST;
    } else if (Date.now() >= _burstUntil) {
      // Burst expired, settle to base rate (no backoff — that's driven by activity watcher)
      _currentPollRate = _basePollRate;
    }

    if (_onStateUpdate) _onStateUpdate(data);
  } catch (e) {
    // Network error — stay at current rate, don't backoff
  }
  _scheduleNext();
}

// ─── Activity detection ───
// Backoff only happens here (no clicks/keys) — NOT from server returning no data.
// Active play always polls at the base rate. Backoff = user walked away.

const _activityEvents = ['click', 'keydown', 'touchstart'];
const IDLE_START = 60000;  // 60s no interaction → start backoff
let _idleTimer = null;
let _isIdle = false;

function _startActivityWatch() {
  _activityEvents.forEach(evt => document.addEventListener(evt, _onActivity, { passive: true }));
  document.addEventListener('visibilitychange', _onVisibilityChange);
  _resetIdleTimer();
}

function _removeActivityWatch() {
  _activityEvents.forEach(evt => document.removeEventListener(evt, _onActivity));
  document.removeEventListener('visibilitychange', _onVisibilityChange);
  if (_idleTimer) clearTimeout(_idleTimer);
}

function _resetIdleTimer() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _isIdle = false;
  _idleTimer = setTimeout(() => { _isIdle = true; _startBackoff(); }, IDLE_START);
}

function _startBackoff() {
  // Begin exponential backoff from current rate
  _applyBackoff();
  _scheduleNext();
}

function _onActivity() {
  _resetIdleTimer();
  _resetToActive();
  _scheduleNext();
}

function _onVisibilityChange() {
  if (document.hidden) {
    // Tab hidden — slow down but don't stop immediately
    // Use 10s instead of 30s so returning feels less stale
    if (!_paused && !_stopped) {
      _currentPollRate = 10000;
      _isIdle = true;
      _scheduleNext();
    }
  } else {
    // Tab visible again — immediate poll + burst for instant catch-up
    _resetIdleTimer();
    if (_paused && !_stopped) {
      _resetToActive();
    }
    if (!_stopped) {
      _backoffSteps = 0;
      _burstUntil = Date.now() + BURST_DURATION;
      _currentPollRate = POLL_BURST;
      _paused = false;
      _hideIdleOverlay();
      doPoll(); // instant refresh
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

export async function sendLeave() {
  return api('/api/leave', 'POST', {});
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
