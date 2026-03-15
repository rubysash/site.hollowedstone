import { makeMove } from '../../../../public/play/oroboros/js/shared/engine.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, from, to, restoreRole } = body;

  if (!accessCode || !token) {
    return jsonResponse({ error: 'Missing accessCode or token' }, 400);
  }

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) return jsonResponse({ error: 'Game not found' }, 404);

  const state = JSON.parse(raw);

  // Identify player
  let player = null;
  if (state.players.p1.token === token) player = 'p1';
  else if (state.players.p2.token === token) player = 'p2';
  else return jsonResponse({ error: 'Invalid token' }, 403);

  // Re-attach theme data
  if (!state.themeData) {
    const themeUrl = new URL(`/play/oroboros/themes/${state.theme}.json`, request.url);
    const themeResp = await fetch(themeUrl);
    state.themeData = await themeResp.json();
  }

  const result = makeMove(state, player, from, to, restoreRole || null);

  if (result.error) {
    return jsonResponse({ error: result.error }, 400);
  }

  // Refresh TTL on every move; finished games get 30 days for replay, active games get 7 days
  const ttl = state.phase === 'finished' ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: ttl });
  return jsonResponse({ ok: true, phase: state.phase });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
