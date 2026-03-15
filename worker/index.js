// Worker entry point — routes API requests, falls through to static assets
//
// Game API routes:
//   POST /play/oroboros/api/create    — create a new game
//   POST /play/oroboros/api/join      — join with access code
//   GET  /play/oroboros/api/state     — poll game state
//   POST /play/oroboros/api/setup     — split selection + stone placement
//   POST /play/oroboros/api/move      — submit a move
//   GET  /play/oroboros/api/replay/:id — full move log
//
// Admin API routes (protected by Cloudflare Access Zero Trust):
//   GET  /admin/api/games             — list all games with player IPs
//
// Everything else falls through to static assets via env.ASSETS

import { createGame, chooseSplit, placeStone, makeMove, sanitizeForPlayer } from '../public/play/oroboros/js/shared/engine.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Game API routes
    if (path.startsWith('/play/oroboros/api/')) {
      return handleApi(path, request, env);
    }

    // Admin API routes (Zero Trust handles auth before this runs)
    if (path.startsWith('/admin/api/')) {
      return handleAdminApi(path, request, env);
    }

    // Everything else → static assets
    return env.ASSETS.fetch(request);
  }
};

// ─── API Router ───

async function handleApi(path, request, env) {
  // Strip prefix for cleaner matching
  const route = path.replace('/play/oroboros/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleState(request, env);
    if (route === '/setup' && method === 'POST') return await handleSetup(request, env);
    if (route === '/move' && method === 'POST') return await handleMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleReplay(route, env);

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

// ─── Helpers ───

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function identifyPlayer(state, token) {
  if (state.players.p1.token === token) return 'p1';
  if (state.players.p2.token === token) return 'p2';
  return null;
}

async function loadThemeData(state, request, env) {
  if (state.themeData) return;
  // Fetch theme JSON from our own static assets
  const themeUrl = new URL(`/play/oroboros/themes/${state.theme}.json`, request.url);
  const resp = await env.ASSETS.fetch(themeUrl);
  if (resp.ok) {
    state.themeData = await resp.json();
  }
}

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// ─── POST /create ───

async function handleCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const themeId = body.theme || 'wyrd';

  // Load theme from static assets
  const themeUrl = new URL(`/play/oroboros/themes/${themeId}.json`, request.url);
  const themeResp = await env.ASSETS.fetch(themeUrl);
  if (!themeResp.ok) return json({ error: 'Unknown theme' }, 400);
  const theme = await themeResp.json();

  // Generate unique access code
  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createGame(accessCode, theme);
  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'waiting';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

// ─── POST /join ───

async function handleJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.players.p2.token) {
    return json({ error: 'Game already has two players. Use your existing token.' }, 400);
  }
  if (state.phase !== 'waiting') {
    return json({ error: 'Game is not accepting players' }, 400);
  }

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'splits';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

// ─── GET /state ───

async function handleState(request, env) {
  const kv = env.GAME_STATE;
  const url = new URL(request.url);
  const accessCode = url.searchParams.get('game');
  const token = url.searchParams.get('token');
  const since = parseInt(url.searchParams.get('since') || '0', 10);

  if (!accessCode || !token) return json({ error: 'Missing game or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  // Track last seen per player + request counter
  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  // Persist every 25th poll to avoid excess KV writes
  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeForPlayer(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

// ─── POST /setup ───

async function handleSetup(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, action } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  await loadThemeData(state, request, env);

  let result;
  if (action === 'split') {
    result = chooseSplit(state, player, body.roleACount);
  } else if (action === 'place') {
    result = placeStone(state, player, body.q, body.r, body.role);
  } else {
    return json({ error: 'Unknown action' }, 400);
  }

  if (result.error) return json({ error: result.error }, 400);

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  return json({ ok: true, phase: state.phase });
}

// ─── POST /move ───

async function handleMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to, restoreRole } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  await loadThemeData(state, request, env);

  const result = makeMove(state, player, from, to, restoreRole || null);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase });
}

// ─── GET /stats — public game metrics (no auth, no IPs, no tokens) ───

async function handleStats(env) {
  const kv = env.GAME_STATE;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const stats = { total: 0, thisWeek: 0, byTheme: {}, byPhase: {} };
  let cursor = null;

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      const state = JSON.parse(raw);

      stats.total++;
      const theme = state.theme || 'unknown';
      const phase = state.phase || 'unknown';

      stats.byTheme[theme] = (stats.byTheme[theme] || 0) + 1;
      stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

      if (state.createdAt && new Date(state.createdAt).getTime() > oneWeekAgo) {
        stats.thisWeek++;
      }
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json(stats);
}

// ─── POST /leave ───

async function handleLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  // Mark the game as abandoned
  if (state.phase !== 'finished') {
    state.phase = 'abandoned';
    state.result = {
      winner: player === 'p1' ? 'p2' : 'p1',
      reason: 'abandon',
      abandonedBy: player,
      finalScore: [state.players.p1.score, state.players.p2.score]
    };
    state.updatedAt = new Date().toISOString();
    await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });
  }

  return json({ ok: true });
}

// ─── GET /replay/:id ───

async function handleReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  return json({
    accessCode: state.accessCode,
    theme: state.theme,
    phase: state.phase,
    result: state.result,
    players: {
      p1: { name: state.players.p1.name, split: state.players.p1.split, score: state.players.p1.score },
      p2: { name: state.players.p2.name, split: state.players.p2.split, score: state.players.p2.score }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ─── Admin API (protected by Cloudflare Access Zero Trust) ───

async function handleAdminApi(path, request, env) {
  const route = path.replace('/admin/api', '');

  try {
    if (route === '/games') return await handleAdminGames(request, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

// GET /admin/api/games?limit=50 — list recent games with player IPs, scores, phase
async function handleAdminGames(request, env) {
  const kv = env.GAME_STATE;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  // Fetch game keys from KV (most recent keys first by insertion order)
  const games = [];
  let cursor = null;
  let fetched = 0;

  do {
    const listOpts = { prefix: 'game:', limit: Math.min(limit - fetched, 1000) };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      if (fetched >= limit) break;
      const raw = await kv.get(key.name);
      if (!raw) continue;

      const state = JSON.parse(raw);
      games.push({
        code: state.accessCode,
        theme: state.theme,
        phase: state.phase,
        created: state.createdAt,
        updated: state.updatedAt,
        p1: {
          name: state.players.p1.name,
          ip: state.players.p1.ip || 'n/a',
          score: state.players.p1.score,
          holding: state.players.p1.holding?.length || 0
        },
        p2: {
          name: state.players.p2.name,
          ip: state.players.p2.ip || 'n/a',
          score: state.players.p2.score,
          holding: state.players.p2.holding?.length || 0
        },
        moves: state.logSeq || 0,
        requests: state.requests || 0,
        result: state.result
      });
      fetched++;
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor && fetched < limit);

  // Sort newest first
  games.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  // Who accessed this admin page
  const adminEmail = request.headers.get('CF-Access-Authenticated-User-Email') || 'unknown';

  return json({ admin: adminEmail, total: games.length, showing: limit, games });
}
