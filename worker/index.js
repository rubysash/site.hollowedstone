// Worker entry point — routes API requests, falls through to static assets
//
// Ouroboros API routes:
//   POST /play/oroboros/api/create    — create a new game
//   POST /play/oroboros/api/join      — join with access code
//   GET  /play/oroboros/api/state     — poll game state
//   POST /play/oroboros/api/setup     — split selection + stone placement
//   POST /play/oroboros/api/move      — submit a move
//   GET  /play/oroboros/api/replay/:id — full move log
//
// Nine Men's Morris API routes:
//   POST /play/nine-mens-morris/api/create  — create a new game
//   POST /play/nine-mens-morris/api/join    — join with access code
//   GET  /play/nine-mens-morris/api/state   — poll game state
//   POST /play/nine-mens-morris/api/place   — place a piece
//   POST /play/nine-mens-morris/api/move    — slide/fly a piece
//   POST /play/nine-mens-morris/api/remove  — remove opponent piece after mill
//   POST /play/nine-mens-morris/api/leave   — abandon game
//   GET  /play/nine-mens-morris/api/stats   — public game metrics
//   GET  /play/nine-mens-morris/api/replay/:id — full move log
//
// Lines of Action API routes:
//   POST /play/lines-of-action/api/create  — create a new game
//   POST /play/lines-of-action/api/join    — join with access code
//   GET  /play/lines-of-action/api/state   — poll game state
//   POST /play/lines-of-action/api/move    — move a piece
//   POST /play/lines-of-action/api/leave   — abandon game
//   GET  /play/lines-of-action/api/stats   — public game metrics
//   GET  /play/lines-of-action/api/replay/:id — full move log
//
// Seega API routes:
//   POST /play/seega/api/create  — create a new game
//   POST /play/seega/api/join    — join with access code
//   GET  /play/seega/api/state   — poll game state
//   POST /play/seega/api/place   — place a piece (placement phase)
//   POST /play/seega/api/move    — move a piece (movement phase)
//   POST /play/seega/api/leave   — abandon game
//   GET  /play/seega/api/stats   — public game metrics
//   GET  /play/seega/api/replay/:id — full move log
//
// Amazons API routes:
//   POST /play/amazons/api/create  — create a new game
//   POST /play/amazons/api/join    — join with access code
//   GET  /play/amazons/api/state   — poll game state
//   POST /play/amazons/api/move    — move an amazon
//   POST /play/amazons/api/shoot   — shoot an arrow
//   POST /play/amazons/api/leave   — abandon game
//   GET  /play/amazons/api/stats   — public game metrics
//   GET  /play/amazons/api/replay/:id — full move log
//
// TZAAR API routes:
//   POST /play/tzaar/api/create  — create a new game
//   POST /play/tzaar/api/join    — join with access code
//   GET  /play/tzaar/api/state   — poll game state
//   POST /play/tzaar/api/move    — capture or stack
//   POST /play/tzaar/api/pass    — pass second action
//   POST /play/tzaar/api/leave   — abandon game
//   GET  /play/tzaar/api/stats   — public game metrics
//   GET  /play/tzaar/api/replay/:id — full move log
//
// Admin API routes (protected by Cloudflare Access Zero Trust):
//   GET  /admin/api/games             — list all games with player IPs
//
// Everything else falls through to static assets via env.ASSETS

import { createGame as createOuroGame, chooseSplit, placeStone, makeMove as makeOuroMove, sanitizeForPlayer as sanitizeOuro } from '../public/play/oroboros/js/shared/engine.js';
import { createGame as createMorrisGame, placePiece, makeMove as makeMorrisMove, removePiece, sanitizeForPlayer as sanitizeMorris } from '../public/play/nine-mens-morris/js/shared/engine.js';
import { createGame as createFanoronaGame, makeMove as makeFanoronaMove, endChain as endFanoronaChain, sanitizeForPlayer as sanitizeFanorona } from '../public/play/fanorona/js/shared/engine.js';
import { createGame as createLOAGame, makeMove as makeLOAMove, sanitizeForPlayer as sanitizeLOA } from '../public/play/lines-of-action/js/shared/engine.js';
import { createGame as createAbaloneGame, makeMove as makeAbaloneMove, sanitizeForPlayer as sanitizeAbalone } from '../public/play/abalone/js/shared/engine.js';
import { createGame as createTablutGame, makeMove as makeTablutMove, sanitizeForPlayer as sanitizeTablut } from '../public/play/tablut/js/shared/engine.js';
import { createGame as createSurakartaGame, makeMove as makeSurakartaMove, sanitizeForPlayer as sanitizeSurakarta } from '../public/play/surakarta/js/shared/engine.js';
import { createGame as createSeegaGame, placePiece as placeSeegaPiece, makeMove as makeSeegaMove, sanitizeForPlayer as sanitizeSeega } from '../public/play/seega/js/shared/engine.js';
import { createGame as createAmazonsGame, moveAmazon as moveAmazonsAmazon, shootArrow as shootAmazonsArrow, sanitizeForPlayer as sanitizeAmazons } from '../public/play/amazons/js/shared/engine.js';
import { createGame as createTzaarGame, makeMove as makeTzaarMove, passTurn as passTzaarTurn, sanitizeForPlayer as sanitizeTzaar } from '../public/play/tzaar/js/shared/engine.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Ouroboros API routes
    if (path.startsWith('/play/oroboros/api/')) {
      return handleOuroApi(path, request, env);
    }

    // Nine Men's Morris API routes
    if (path.startsWith('/play/nine-mens-morris/api/')) {
      return handleMorrisApi(path, request, env);
    }

    // Fanorona API routes
    if (path.startsWith('/play/fanorona/api/')) {
      return handleFanoronaApi(path, request, env);
    }

    // Lines of Action API routes
    if (path.startsWith('/play/lines-of-action/api/')) {
      return handleLOAApi(path, request, env);
    }

    // Abalone API routes
    if (path.startsWith('/play/abalone/api/')) {
      return handleAbaloneApi(path, request, env);
    }

    // Tablut API routes
    if (path.startsWith('/play/tablut/api/')) {
      return handleTablutApi(path, request, env);
    }

    // Surakarta API routes
    if (path.startsWith('/play/surakarta/api/')) {
      return handleSurakartaApi(path, request, env);
    }

    // Seega API routes
    if (path.startsWith('/play/seega/api/')) {
      return handleSeegaApi(path, request, env);
    }

    // Amazons API routes
    if (path.startsWith('/play/amazons/api/')) {
      return handleAmazonsApi(path, request, env);
    }

    // TZAAR API routes
    if (path.startsWith('/play/tzaar/api/')) {
      return handleTzaarApi(path, request, env);
    }

    // Admin API routes (Zero Trust handles auth before this runs)
    if (path.startsWith('/admin/api/')) {
      return handleAdminApi(path, request, env);
    }

    // Everything else → static assets
    return env.ASSETS.fetch(request);
  }
};

// ═══════════════════════════════════════════════
// ─── Shared Helpers ───
// ═══════════════════════════════════════════════

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

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// ═══════════════════════════════════════════════
// ─── Ouroboros API ───
// ═══════════════════════════════════════════════

async function handleOuroApi(path, request, env) {
  const route = path.replace('/play/oroboros/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleOuroCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleOuroJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleOuroState(request, env);
    if (route === '/setup' && method === 'POST') return await handleOuroSetup(request, env);
    if (route === '/move' && method === 'POST') return await handleOuroMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleOuroLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleOuroStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleOuroReplay(route, env);

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

async function loadThemeData(state, request, env) {
  if (state.themeData) return;
  const themeUrl = new URL(`/play/oroboros/themes/${state.theme}.json`, request.url);
  const resp = await env.ASSETS.fetch(themeUrl);
  if (resp.ok) {
    state.themeData = await resp.json();
  }
}

async function handleOuroCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const themeId = body.theme || 'wyrd';

  const themeUrl = new URL(`/play/oroboros/themes/${themeId}.json`, request.url);
  const themeResp = await env.ASSETS.fetch(themeUrl);
  if (!themeResp.ok) return json({ error: 'Unknown theme' }, 400);
  const theme = await themeResp.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createOuroGame(accessCode, theme);
  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'waiting';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleOuroJoin(request, env) {
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

async function handleOuroState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeOuro(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

async function handleOuroSetup(request, env) {
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

async function handleOuroMove(request, env) {
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

  const result = makeOuroMove(state, player, from, to, restoreRole || null);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase });
}

async function handleOuroStats(env) {
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
      // Only count Ouroboros games
      if (state.game === 'nine-mens-morris') continue;

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

async function handleOuroLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

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

async function handleOuroReplay(route, env) {
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

// ═══════════════════════════════════════════════
// ─── Nine Men's Morris API ───
// ═══════════════════════════════════════════════

async function handleMorrisApi(path, request, env) {
  const route = path.replace('/play/nine-mens-morris/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleMorrisCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleMorrisJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleMorrisState(request, env);
    if (route === '/place' && method === 'POST') return await handleMorrisPlace(request, env);
    if (route === '/move' && method === 'POST') return await handleMorrisMove(request, env);
    if (route === '/remove' && method === 'POST') return await handleMorrisRemove(request, env);
    if (route === '/leave' && method === 'POST') return await handleMorrisLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleMorrisStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleMorrisReplay(route, env);

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

// POST /create
async function handleMorrisCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createMorrisGame(accessCode);

  // Apply settings from request
  if (body.settings) {
    if (body.settings.flying !== undefined) state.settings.flying = !!body.settings.flying;
  }

  // Store player names for admin/replay
  state.players.p1.name = 'Dark';
  state.players.p1.title = 'Dark';
  state.players.p2.name = 'Light';
  state.players.p2.title = 'Light';
  state.theme = 'neutral';

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

// POST /join
async function handleMorrisJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.game !== 'nine-mens-morris') {
    return json({ error: 'Game not found (wrong game type)' }, 404);
  }
  if (state.players.p2.token) {
    return json({ error: 'Game already has two players.' }, 400);
  }
  if (state.phase !== 'waiting') {
    return json({ error: 'Game is not accepting players' }, 400);
  }

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'placing';
  state.turn = { player: 'p1', action: 'place' };
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

// GET /state
async function handleMorrisState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeMorris(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

// POST /place
async function handleMorrisPlace(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, node } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;

  const result = placePiece(state, player, node);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase, mill: result.mill || false });
}

// POST /move
async function handleMorrisMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;

  const result = makeMorrisMove(state, player, from, to);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase, mill: result.mill || false });
}

// POST /remove
async function handleMorrisRemove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, node } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;

  const result = removePiece(state, player, node);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase });
}

// POST /leave
async function handleMorrisLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  if (state.phase !== 'finished') {
    state.phase = 'abandoned';
    state.result = {
      winner: player === 'p1' ? 'p2' : 'p1',
      reason: 'abandon',
      abandonedBy: player,
      finalScore: [state.players.p1.piecesLost, state.players.p2.piecesLost]
    };
    state.updatedAt = new Date().toISOString();
    await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });
  }

  return json({ ok: true });
}

// GET /stats
async function handleMorrisStats(env) {
  const kv = env.GAME_STATE;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const stats = { total: 0, thisWeek: 0, byPhase: {} };
  let cursor = null;

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      const state = JSON.parse(raw);
      if (state.game !== 'nine-mens-morris') continue;

      stats.total++;
      const phase = state.phase || 'unknown';
      stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

      if (state.createdAt && new Date(state.createdAt).getTime() > oneWeekAgo) {
        stats.thisWeek++;
      }
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json(stats);
}

// GET /replay/:code
async function handleMorrisReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  if (state.game !== 'nine-mens-morris') return json({ error: 'Not a Morris game' }, 404);

  return json({
    accessCode: state.accessCode,
    game: state.game,
    phase: state.phase,
    result: state.result,
    settings: state.settings,
    players: {
      p1: { title: 'Dark', piecesLost: state.players.p1.piecesLost, piecesOnBoard: state.players.p1.piecesOnBoard },
      p2: { title: 'Light', piecesLost: state.players.p2.piecesLost, piecesOnBoard: state.players.p2.piecesOnBoard }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Fanorona API ───
// ═══════════════════════════════════════════════

async function handleFanoronaApi(path, request, env) {
  const route = path.replace('/play/fanorona/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleFanoronaCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleFanoronaJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleFanoronaState(request, env);
    if (route === '/move' && method === 'POST') return await handleFanoronaMove(request, env);
    if (route === '/endchain' && method === 'POST') return await handleFanoronaEndChain(request, env);
    if (route === '/leave' && method === 'POST') return await handleFanoronaLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleFanoronaStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleFanoronaReplay(route, env);

    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

async function handleFanoronaCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createFanoronaGame(accessCode);

  if (body.settings) {
    if (body.settings.drawByRepetition !== undefined) state.settings.drawByRepetition = !!body.settings.drawByRepetition;
  }

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleFanoronaJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.game !== 'fanorona') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

async function handleFanoronaState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeFanorona(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

async function handleFanoronaMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to, captureType } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;

  const result = makeFanoronaMove(state, player, from, to, captureType || null);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase, chainActive: result.chainActive || false });
}

async function handleFanoronaEndChain(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;

  const result = endFanoronaChain(state, player);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true, phase: state.phase });
}

async function handleFanoronaLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  if (state.phase !== 'finished') {
    state.phase = 'abandoned';
    state.result = {
      winner: player === 'p1' ? 'p2' : 'p1',
      reason: 'abandon',
      abandonedBy: player,
      finalScore: [state.players.p1.captured, state.players.p2.captured]
    };
    state.updatedAt = new Date().toISOString();
    await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });
  }

  return json({ ok: true });
}

async function handleFanoronaStats(env) {
  const kv = env.GAME_STATE;
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const stats = { total: 0, thisWeek: 0, byPhase: {} };
  let cursor = null;

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      const state = JSON.parse(raw);
      if (state.game !== 'fanorona') continue;

      stats.total++;
      const phase = state.phase || 'unknown';
      stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

      if (state.createdAt && new Date(state.createdAt).getTime() > oneWeekAgo) {
        stats.thisWeek++;
      }
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json(stats);
}

async function handleFanoronaReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  if (state.game !== 'fanorona') return json({ error: 'Not a Fanorona game' }, 404);

  return json({
    accessCode: state.accessCode,
    game: state.game,
    phase: state.phase,
    result: state.result,
    settings: state.settings,
    players: {
      p1: { title: 'Black', piecesLeft: state.players.p1.piecesLeft, captured: state.players.p1.captured },
      p2: { title: 'White', piecesLeft: state.players.p2.piecesLeft, captured: state.players.p2.captured }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Lines of Action API ───
// ═══════════════════════════════════════════════

async function handleLOAApi(path, request, env) {
  const route = path.replace('/play/lines-of-action/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleLOACreate(request, env);
    if (route === '/join' && method === 'POST') return await handleLOAJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleLOAState(request, env);
    if (route === '/move' && method === 'POST') return await handleLOAMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleLOALeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleLOAStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleLOAReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

async function handleLOACreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createLOAGame(accessCode);

  if (body.settings) {
    if (body.settings.drawByRepetition !== undefined) state.settings.drawByRepetition = !!body.settings.drawByRepetition;
    if (body.settings.moveLimit !== undefined) {
      const ml = parseInt(body.settings.moveLimit, 10);
      if (ml >= 0 && ml <= 1000) state.settings.moveLimit = ml;
    }
  }

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleLOAJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.game !== 'lines-of-action') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

async function handleLOAState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeLOA(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

async function handleLOAMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = makeLOAMove(state, player, from, to);

  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });

  return json({ ok: true });
}

async function handleLOALeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = {
    winner: state.players[opponent].token ? opponent : null,
    reason: 'abandon',
    abandonedBy: player,
    finalScore: [state.players.p1.captured, state.players.p2.captured]
  };
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });

  return json({ ok: true });
}

async function handleLOAStats(env) {
  const kv = env.GAME_STATE;
  let cursor = null;
  let total = 0;
  let thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      try {
        const state = JSON.parse(raw);
        if (state.game !== 'lines-of-action') continue;
        total++;
        if (state.createdAt > oneWeekAgo) thisWeek++;
      } catch {}
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json({ total, thisWeek });
}

async function handleLOAReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  if (state.game !== 'lines-of-action') return json({ error: 'Game not found' }, 404);

  return json({
    accessCode: state.accessCode,
    game: state.game,
    phase: state.phase,
    result: state.result,
    settings: state.settings,
    players: {
      p1: { title: 'Black', piecesLeft: state.players.p1.piecesLeft, captured: state.players.p1.captured },
      p2: { title: 'White', piecesLeft: state.players.p2.piecesLeft, captured: state.players.p2.captured }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Abalone API ───
// ═══════════════════════════════════════════════

async function handleAbaloneApi(path, request, env) {
  const route = path.replace('/play/abalone/api', '');
  const method = request.method;
  try {
    if (route === '/create' && method === 'POST') return await handleAbaloneCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleAbaloneJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleAbaloneState(request, env);
    if (route === '/move' && method === 'POST') return await handleAbaloneMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleAbaloneLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleAbaloneStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleAbaloneReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

async function handleAbaloneCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createAbaloneGame(accessCode);

  if (body.settings) {
    if (body.settings.drawByRepetition !== undefined) state.settings.drawByRepetition = !!body.settings.drawByRepetition;
    if (body.settings.moveLimit !== undefined) {
      const ml = parseInt(body.settings.moveLimit, 10);
      if (ml >= 0 && ml <= 1000) state.settings.moveLimit = ml;
    }
  }

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleAbaloneJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();
  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);

  if (state.game !== 'abalone') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  return json({ accessCode, player: 'p2', token });
}

async function handleAbaloneState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeAbalone(state, player);
  sanitized.you = player;
  if (since > 0) sanitized.log = sanitized.log.filter(e => e.seq > since);
  return json(sanitized);
}

async function handleAbaloneMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, marbles, direction } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = makeAbaloneMove(state, player, marbles, direction);
  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true });
}

async function handleAbaloneLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = {
    winner: state.players[opponent].token ? opponent : null,
    reason: 'abandon',
    abandonedBy: player,
    finalScore: [state.players.p1.eliminated, state.players.p2.eliminated]
  };
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });
  return json({ ok: true });
}

async function handleAbaloneStats(env) {
  const kv = env.GAME_STATE;
  let cursor = null;
  let total = 0, thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);
    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      try {
        const state = JSON.parse(raw);
        if (state.game !== 'abalone') continue;
        total++;
        if (state.createdAt > oneWeekAgo) thisWeek++;
      } catch {}
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json({ total, thisWeek });
}

async function handleAbaloneReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  if (state.game !== 'abalone') return json({ error: 'Game not found' }, 404);

  return json({
    accessCode: state.accessCode, game: state.game, phase: state.phase,
    result: state.result, settings: state.settings,
    players: {
      p1: { title: 'Black', eliminated: state.players.p1.eliminated },
      p2: { title: 'White', eliminated: state.players.p2.eliminated }
    },
    log: state.log, createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Tablut API ───
// ═══════════════════════════════════════════════

async function handleTablutApi(path, request, env) {
  const route = path.replace('/play/tablut/api', '');
  const method = request.method;
  try {
    if (route === '/create' && method === 'POST') return await handleTablutCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleTablutJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleTablutState(request, env);
    if (route === '/move' && method === 'POST') return await handleTablutMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleTablutLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleTablutStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleTablutReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: 'Internal error' }, 500); }
}

async function handleTablutCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }
  const token = generateToken();
  const state = createTablutGame(accessCode);
  if (body.settings) {
    if (body.settings.drawByRepetition !== undefined) state.settings.drawByRepetition = !!body.settings.drawByRepetition;
    if (body.settings.kingArmed !== undefined) state.settings.kingArmed = !!body.settings.kingArmed;
    if (body.settings.edgeEscape !== undefined) state.settings.edgeEscape = !!body.settings.edgeEscape;
  }
  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });
  return json({ accessCode, player: 'p1', token });
}

async function handleTablutJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();
  if (!accessCode) return json({ error: 'Access code required' }, 400);
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  if (state.game !== 'tablut') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);
  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  return json({ accessCode, player: 'p2', token });
}

async function handleTablutState(request, env) {
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
  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();
  if (state.requests % 25 === 0) await kv.put(`game:${accessCode}`, JSON.stringify(state));
  const sanitized = sanitizeTablut(state, player);
  sanitized.you = player;
  if (since > 0) sanitized.log = sanitized.log.filter(e => e.seq > since);
  return json(sanitized);
}

async function handleTablutMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to } = body;
  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);
  state.requests = (state.requests || 0) + 1;
  const result = makeTablutMove(state, player, from, to);
  if (result.error) return json({ error: result.error }, 400);
  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true });
}

async function handleTablutLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;
  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = { winner: state.players[opponent].token ? opponent : null, reason: 'abandon', abandonedBy: player, finalScore: [state.players.p1.captured, state.players.p2.captured] };
  state.updatedAt = new Date().toISOString();
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });
  return json({ ok: true });
}

async function handleTablutStats(env) {
  const kv = env.GAME_STATE;
  let cursor = null, total = 0, thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);
    for (const key of list.keys) {
      const raw = await kv.get(key.name); if (!raw) continue;
      try { const s = JSON.parse(raw); if (s.game !== 'tablut') continue; total++; if (s.createdAt > oneWeekAgo) thisWeek++; } catch {}
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return json({ total, thisWeek });
}

async function handleTablutReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');
  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  if (state.game !== 'tablut') return json({ error: 'Game not found' }, 404);
  return json({
    accessCode: state.accessCode, game: state.game, phase: state.phase,
    result: state.result, settings: state.settings,
    players: { p1: { title: 'Attackers', captured: state.players.p1.captured }, p2: { title: 'Defenders', captured: state.players.p2.captured } },
    log: state.log, createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Surakarta API ───
// ═══════════════════════════════════════════════

async function handleSurakartaApi(path, request, env) {
  const route = path.replace('/play/surakarta/api', '');
  const method = request.method;
  try {
    if (route === '/create' && method === 'POST') return await handleSurakartaCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleSurakartaJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleSurakartaState(request, env);
    if (route === '/move' && method === 'POST') return await handleSurakartaMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleSurakartaLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleSurakartaStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleSurakartaReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: 'Internal error' }, 500); }
}

async function handleSurakartaCreate(request, env) {
  const kv = env.GAME_STATE; const body = await request.json();
  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) { accessCode = generateCode(); const existing = await kv.get(`code:${accessCode}`); if (!existing) break; }
  const token = generateToken();
  const state = createSurakartaGame(accessCode);
  if (body.settings) {
    if (body.settings.drawByRepetition !== undefined) state.settings.drawByRepetition = !!body.settings.drawByRepetition;
    if (body.settings.moveLimit !== undefined) { const ml = parseInt(body.settings.moveLimit, 10); if (ml >= 0 && ml <= 1000) state.settings.moveLimit = ml; }
  }
  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });
  return json({ accessCode, player: 'p1', token });
}

async function handleSurakartaJoin(request, env) {
  const kv = env.GAME_STATE; const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();
  if (!accessCode) return json({ error: 'Access code required' }, 400);
  const raw = await kv.get(`game:${accessCode}`); if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  if (state.game !== 'surakarta') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);
  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  return json({ accessCode, player: 'p2', token });
}

async function handleSurakartaState(request, env) {
  const kv = env.GAME_STATE; const url = new URL(request.url);
  const accessCode = url.searchParams.get('game'); const token = url.searchParams.get('token');
  const since = parseInt(url.searchParams.get('since') || '0', 10);
  if (!accessCode || !token) return json({ error: 'Missing game or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`); if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token); if (!player) return json({ error: 'Invalid token' }, 403);
  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();
  if (state.requests % 25 === 0) await kv.put(`game:${accessCode}`, JSON.stringify(state));
  const sanitized = sanitizeSurakarta(state, player);
  sanitized.you = player;
  if (since > 0) sanitized.log = sanitized.log.filter(e => e.seq > since);
  return json(sanitized);
}

async function handleSurakartaMove(request, env) {
  const kv = env.GAME_STATE; const body = await request.json();
  const { accessCode, token, from, to } = body;
  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`); if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token); if (!player) return json({ error: 'Invalid token' }, 403);
  state.requests = (state.requests || 0) + 1;
  const result = makeSurakartaMove(state, player, from, to);
  if (result.error) return json({ error: result.error }, 400);
  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return json({ ok: true });
}

async function handleSurakartaLeave(request, env) {
  const kv = env.GAME_STATE; const body = await request.json();
  const { accessCode, token } = body;
  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);
  const raw = await kv.get(`game:${accessCode}`); if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token); if (!player) return json({ error: 'Invalid token' }, 403);
  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = { winner: state.players[opponent].token ? opponent : null, reason: 'abandon', abandonedBy: player, finalScore: [state.players.p1.captured, state.players.p2.captured] };
  state.updatedAt = new Date().toISOString();
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });
  return json({ ok: true });
}

async function handleSurakartaStats(env) {
  const kv = env.GAME_STATE; let cursor = null, total = 0, thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  do {
    const listOpts = { prefix: 'game:', limit: 1000 }; if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);
    for (const key of list.keys) { const raw = await kv.get(key.name); if (!raw) continue; try { const s = JSON.parse(raw); if (s.game !== 'surakarta') continue; total++; if (s.createdAt > oneWeekAgo) thisWeek++; } catch {} }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return json({ total, thisWeek });
}

async function handleSurakartaReplay(route, env) {
  const kv = env.GAME_STATE; const accessCode = route.replace('/replay/', '');
  const raw = await kv.get(`game:${accessCode}`); if (!raw) return json({ error: 'Game not found' }, 404);
  const state = JSON.parse(raw);
  if (state.game !== 'surakarta') return json({ error: 'Game not found' }, 404);
  return json({
    accessCode: state.accessCode, game: state.game, phase: state.phase, result: state.result, settings: state.settings,
    players: { p1: { title: 'Dark', captured: state.players.p1.captured, piecesLeft: state.players.p1.piecesLeft }, p2: { title: 'Light', captured: state.players.p2.captured, piecesLeft: state.players.p2.piecesLeft } },
    log: state.log, createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Seega API ───
// ═══════════════════════════════════════════════

async function handleSeegaApi(path, request, env) {
  const route = path.replace('/play/seega/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleSeegaCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleSeegaJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleSeegaState(request, env);
    if (route === '/place' && method === 'POST') return await handleSeegaPlace(request, env);
    if (route === '/move' && method === 'POST') return await handleSeegaMove(request, env);
    if (route === '/leave' && method === 'POST') return await handleSeegaLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleSeegaStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleSeegaReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

async function handleSeegaCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createSeegaGame(accessCode);

  if (body.settings) {
    if (body.settings.drawByRepetition !== undefined) state.settings.drawByRepetition = !!body.settings.drawByRepetition;
    if (body.settings.moveLimit !== undefined) {
      const ml = parseInt(body.settings.moveLimit, 10);
      if (ml >= 0 && ml <= 1000) state.settings.moveLimit = ml;
    }
  }

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleSeegaJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.game !== 'seega') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'placing';
  state.turn.player = 'p1';
  state.turn.action = 'place';
  state.turn.placedThisTurn = 0;
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

async function handleSeegaState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeSeega(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

async function handleSeegaPlace(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, node } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = placeSeegaPiece(state, player, node);

  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });

  return json({ ok: true });
}

async function handleSeegaMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = makeSeegaMove(state, player, from, to);

  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });

  return json({ ok: true });
}

async function handleSeegaLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = {
    winner: state.players[opponent].token ? opponent : null,
    reason: 'abandon',
    abandonedBy: player,
    finalScore: [state.players.p1.captured, state.players.p2.captured]
  };
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });

  return json({ ok: true });
}

async function handleSeegaStats(env) {
  const kv = env.GAME_STATE;
  let cursor = null;
  let total = 0;
  let thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      try {
        const state = JSON.parse(raw);
        if (state.game !== 'seega') continue;
        total++;
        if (state.createdAt > oneWeekAgo) thisWeek++;
      } catch {}
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json({ total, thisWeek });
}

async function handleSeegaReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  if (state.game !== 'seega') return json({ error: 'Game not found' }, 404);

  return json({
    accessCode: state.accessCode,
    game: state.game,
    phase: state.phase,
    result: state.result,
    settings: state.settings,
    players: {
      p1: { title: 'Dark', piecesLeft: state.players.p1.piecesLeft, captured: state.players.p1.captured },
      p2: { title: 'Light', piecesLeft: state.players.p2.piecesLeft, captured: state.players.p2.captured }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Amazons API ───
// ═══════════════════════════════════════════════

async function handleAmazonsApi(path, request, env) {
  const route = path.replace('/play/amazons/api', '');
  const method = request.method;
  try {
    if (route === '/create' && method === 'POST') return await handleAmazonsCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleAmazonsJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleAmazonsState(request, env);
    if (route === '/move' && method === 'POST') return await handleAmazonsMove(request, env);
    if (route === '/shoot' && method === 'POST') return await handleAmazonsShoot(request, env);
    if (route === '/leave' && method === 'POST') return await handleAmazonsLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleAmazonsStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleAmazonsReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

async function handleAmazonsCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createAmazonsGame(accessCode);

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleAmazonsJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.game !== 'amazons') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.turn = { player: 'p1', action: 'move', amazon: null };
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

async function handleAmazonsState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeAmazons(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

async function handleAmazonsMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = moveAmazonsAmazon(state, player, from, to);

  if (result.error) return json({ error: result.error }, 400);

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ ok: true, needsShoot: result.needsShoot || false });
}

async function handleAmazonsShoot(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, target } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = shootAmazonsArrow(state, player, target);

  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });

  return json({ ok: true, finished: result.finished || false });
}

async function handleAmazonsLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = {
    winner: state.players[opponent].token ? opponent : null,
    reason: 'abandon',
    abandonedBy: player,
    arrowCount: state.arrowCount
  };
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });

  return json({ ok: true });
}

async function handleAmazonsStats(env) {
  const kv = env.GAME_STATE;
  let cursor = null;
  let total = 0;
  let thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      try {
        const state = JSON.parse(raw);
        if (state.game !== 'amazons') continue;
        total++;
        if (state.createdAt > oneWeekAgo) thisWeek++;
      } catch {}
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json({ total, thisWeek });
}

async function handleAmazonsReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  if (state.game !== 'amazons') return json({ error: 'Game not found' }, 404);

  return json({
    accessCode: state.accessCode,
    game: state.game,
    phase: state.phase,
    result: state.result,
    arrowCount: state.arrowCount,
    players: {
      p1: { title: 'White' },
      p2: { title: 'Black' }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── TZAAR API ───
// ═══════════════════════════════════════════════

async function handleTzaarApi(path, request, env) {
  const route = path.replace('/play/tzaar/api', '');
  const method = request.method;

  try {
    if (route === '/create' && method === 'POST') return await handleTzaarCreate(request, env);
    if (route === '/join' && method === 'POST') return await handleTzaarJoin(request, env);
    if (route === '/state' && method === 'GET') return await handleTzaarState(request, env);
    if (route === '/move' && method === 'POST') return await handleTzaarMove(request, env);
    if (route === '/pass' && method === 'POST') return await handleTzaarPass(request, env);
    if (route === '/leave' && method === 'POST') return await handleTzaarLeave(request, env);
    if (route === '/stats' && method === 'GET') return await handleTzaarStats(env);
    if (route.startsWith('/replay/') && method === 'GET') return await handleTzaarReplay(route, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

async function handleTzaarCreate(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();

  let accessCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    accessCode = generateCode();
    const existing = await kv.get(`code:${accessCode}`);
    if (!existing) break;
  }

  const token = generateToken();
  const state = createTzaarGame(accessCode);

  state.players.p1.token = token;
  state.players.p1.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.theme = 'neutral';

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p1', token });
}

async function handleTzaarJoin(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) return json({ error: 'Access code required' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  if (state.game !== 'tzaar') return json({ error: 'Game not found (wrong game type)' }, 404);
  if (state.players.p2.token) return json({ error: 'Game already has two players.' }, 400);
  if (state.phase !== 'waiting') return json({ error: 'Game is not accepting players' }, 400);

  const token = generateToken();
  state.players.p2.token = token;
  state.players.p2.ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  state.phase = 'playing';
  state.requests = (state.requests || 0) + 1;
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });

  return json({ accessCode, player: 'p2', token });
}

async function handleTzaarState(request, env) {
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

  state.requests = (state.requests || 0) + 1;
  if (!state.lastSeen) state.lastSeen = {};
  state.lastSeen[player] = new Date().toISOString();

  if (state.requests % 25 === 0) {
    await kv.put(`game:${accessCode}`, JSON.stringify(state));
  }

  const sanitized = sanitizeTzaar(state, player);
  sanitized.you = player;

  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return json(sanitized);
}

async function handleTzaarMove(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = makeTzaarMove(state, player, from, to);

  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });

  return json({ ok: true });
}

async function handleTzaarPass(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  state.requests = (state.requests || 0) + 1;
  const result = passTzaarTurn(state, player);

  if (result.error) return json({ error: result.error }, 400);

  const ttl = state.phase === 'finished' ? THIRTY_DAYS : SEVEN_DAYS;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });

  return json({ ok: true });
}

async function handleTzaarLeave(request, env) {
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token } = body;

  if (!accessCode || !token) return json({ error: 'Missing accessCode or token' }, 400);

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  const player = identifyPlayer(state, token);
  if (!player) return json({ error: 'Invalid token' }, 403);

  const opponent = player === 'p1' ? 'p2' : 'p1';
  state.phase = 'finished';
  state.result = {
    winner: state.players[opponent].token ? opponent : null,
    reason: 'abandon',
    abandonedBy: player,
    finalScore: [state.players.p1.captured, state.players.p2.captured]
  };
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: THIRTY_DAYS });

  return json({ ok: true });
}

async function handleTzaarStats(env) {
  const kv = env.GAME_STATE;
  let cursor = null;
  let total = 0;
  let thisWeek = 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const listOpts = { prefix: 'game:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;
    const list = await kv.list(listOpts);

    for (const key of list.keys) {
      const raw = await kv.get(key.name);
      if (!raw) continue;
      try {
        const state = JSON.parse(raw);
        if (state.game !== 'tzaar') continue;
        total++;
        if (state.createdAt > oneWeekAgo) thisWeek++;
      } catch {}
    }

    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json({ total, thisWeek });
}

async function handleTzaarReplay(route, env) {
  const kv = env.GAME_STATE;
  const accessCode = route.replace('/replay/', '');

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return json({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);
  if (state.game !== 'tzaar') return json({ error: 'Game not found' }, 404);

  return json({
    accessCode: state.accessCode,
    game: state.game,
    phase: state.phase,
    result: state.result,
    players: {
      p1: { title: 'White', captured: state.players.p1.captured },
      p2: { title: 'Black', captured: state.players.p2.captured }
    },
    log: state.log,
    createdAt: state.createdAt
  });
}

// ═══════════════════════════════════════════════
// ─── Admin API (protected by Cloudflare Access Zero Trust) ───
// ═══════════════════════════════════════════════

async function handleAdminApi(path, request, env) {
  const route = path.replace('/admin/api', '');

  try {
    if (route === '/games') return await handleAdminGames(request, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    return json({ error: 'Internal error', detail: e.message }, 500);
  }
}

async function handleAdminGames(request, env) {
  const kv = env.GAME_STATE;
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

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
      const isMorris = state.game === 'nine-mens-morris';
      const isFanorona = state.game === 'fanorona';
      const isLOA = state.game === 'lines-of-action';
      const isAbalone = state.game === 'abalone';
      const isTablut = state.game === 'tablut';
      const isSurakarta = state.game === 'surakarta';
      const isSeega = state.game === 'seega';
      const isAmazons = state.game === 'amazons';
      const isTzaar = state.game === 'tzaar';
      // Score extraction per game type
      const p1Score = isAmazons ? (state.arrowCount ?? 0) : isAbalone ? (state.players.p1.eliminated ?? 0) : (isFanorona || isLOA || isTablut || isSurakarta || isSeega || isTzaar) ? (state.players.p1.captured ?? 0) : isMorris ? (state.players.p2.piecesLost ?? 0) : (state.players.p1.score ?? 0);
      const p2Score = isAmazons ? (state.arrowCount ?? 0) : isAbalone ? (state.players.p2.eliminated ?? 0) : (isFanorona || isLOA || isTablut || isSurakarta || isSeega || isTzaar) ? (state.players.p2.captured ?? 0) : isMorris ? (state.players.p1.piecesLost ?? 0) : (state.players.p2.score ?? 0);

      games.push({
        code: state.accessCode,
        game: state.game || 'ouroboros',
        theme: isTzaar ? 'tzaar' : isAmazons ? 'amazons' : isSeega ? 'seega' : isSurakarta ? 'surakarta' : isTablut ? 'tablut' : isAbalone ? 'abalone' : isLOA ? 'lines-of-action' : isFanorona ? 'fanorona' : isMorris ? 'nine-mens-morris' : state.theme,
        phase: state.phase,
        created: state.createdAt,
        updated: state.updatedAt,
        p1: {
          name: state.players.p1.name || state.players.p1.title || (isTzaar ? 'White' : isAmazons ? 'White' : isMorris ? 'Dark' : (isLOA || isSeega) ? 'Dark' : 'P1'),
          ip: state.players.p1.ip || 'n/a',
          score: p1Score,
          holding: state.players.p1.holding?.length || 0
        },
        p2: {
          name: state.players.p2.name || state.players.p2.title || (isTzaar ? 'Black' : isAmazons ? 'Black' : isMorris ? 'Light' : (isLOA || isSeega) ? 'Light' : 'P2'),
          ip: state.players.p2.ip || 'n/a',
          score: p2Score,
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

  games.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  const adminEmail = request.headers.get('CF-Access-Authenticated-User-Email') || 'unknown';

  return json({ admin: adminEmail, total: games.length, showing: limit, games });
}
