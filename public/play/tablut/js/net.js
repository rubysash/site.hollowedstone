// Tablut -- networking layer

let _code = null, _token = null, _player = null;
const BASE = '/play/tablut';
const POLL_BURST = 1000, POLL_WAITING = 3000, POLL_MY_TURN = 8000, POLL_MAX = 60000, BURST_DURATION = 10000;
let _pollTimer = null, _pollCallback = null, _lastLogSeq = 0, _currentRate = POLL_WAITING;
let _burstUntil = 0, _backoffMultiplier = 1, _lastIdleActivity = Date.now();
let _countdownTimer = null, _nextPollAt = 0, _stopped = false;

export function getPlayer() { return _player; }
export function getAccessCode() { return _code; }

export function initNet(accessCode, token, player) {
  _code = accessCode; _token = token; _player = player;
  _lastLogSeq = 0; _stopped = false; _backoffMultiplier = 1;
  _lastIdleActivity = Date.now();
  startIdleTracking();
}

export async function createGame(settings) {
  const resp = await fetch(`${BASE}/api/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: settings || {} }) });
  return resp.json();
}

export async function joinGame(accessCode) {
  const resp = await fetch(`${BASE}/api/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode }) });
  return resp.json();
}

export async function sendMove(from, to) {
  const resp = await fetch(`${BASE}/api/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: _code, token: _token, from, to }) });
  triggerBurst();
  return resp.json();
}

export async function sendLeave() {
  const resp = await fetch(`${BASE}/api/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: _code, token: _token }) });
  return resp.json();
}

export function pollState(callback) { _pollCallback = callback; _stopped = false; doPoll(); startCountdown(); }
export function stopPolling() { _stopped = true; clearTimeout(_pollTimer); clearInterval(_countdownTimer); }

async function doPoll() {
  if (_stopped) return;
  try {
    const resp = await fetch(`${BASE}/api/state?game=${_code}&token=${_token}&since=${_lastLogSeq}`);
    if (resp.ok) {
      const state = await resp.json();
      if (state && state.logSeq !== undefined) {
        const hadNew = state.log && state.log.length > 0;
        _lastLogSeq = state.logSeq;
        if (hadNew) triggerBurst();
        if (_pollCallback) _pollCallback(state);
      }
    }
  } catch (e) {}
  scheduleNext();
}

function scheduleNext() { if (_stopped) return; const rate = getEffectiveRate(); _nextPollAt = Date.now() + rate; _pollTimer = setTimeout(doPoll, rate); }

function getEffectiveRate() {
  if (Date.now() < _burstUntil) return POLL_BURST;
  const idleMs = Date.now() - _lastIdleActivity;
  if (idleMs > 60000) { _backoffMultiplier = Math.min(_backoffMultiplier * 2, POLL_MAX / _currentRate); return Math.min(_currentRate * _backoffMultiplier, POLL_MAX); }
  _backoffMultiplier = 1; return _currentRate;
}

export function setPollRate(isMyTurn) { _currentRate = isMyTurn ? POLL_MY_TURN : POLL_WAITING; }

export function triggerBurst() {
  _burstUntil = Date.now() + BURST_DURATION; _backoffMultiplier = 1;
  clearTimeout(_pollTimer);
  if (!_stopped) { _nextPollAt = Date.now() + POLL_BURST; _pollTimer = setTimeout(doPoll, POLL_BURST); }
}

function startIdleTracking() {
  const reset = () => { _lastIdleActivity = Date.now(); _backoffMultiplier = 1; };
  document.addEventListener('click', reset); document.addEventListener('keydown', reset);
  document.addEventListener('touchstart', reset);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { reset(); triggerBurst(); } });
}

function startCountdown() {
  clearInterval(_countdownTimer);
  _countdownTimer = setInterval(() => {
    const el = document.querySelector('.poll-status'); if (!el) return;
    const ms = Math.max(0, _nextPollAt - Date.now()); const s = Math.ceil(ms / 1000);
    let mode = 'active';
    if (Date.now() < _burstUntil) mode = 'burst';
    else if (_currentRate === POLL_MY_TURN) mode = 'thinking';
    else if (_backoffMultiplier > 1) mode = 'idle';
    el.textContent = `Sync in ${s}s (${mode})`;
  }, 250);
}

export function saveSession(code, player, token) { localStorage.setItem(`tablut_${code}`, JSON.stringify({ code, player, token })); }
export function loadSession(code) { try { return JSON.parse(localStorage.getItem(`tablut_${code}`)); } catch { return null; } }
