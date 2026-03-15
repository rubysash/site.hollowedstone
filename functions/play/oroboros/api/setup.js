import { chooseSplit, placeStone } from '../../../../public/play/oroboros/js/shared/engine.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  const kv = env.GAME_STATE;
  const body = await request.json();
  const { accessCode, token, action } = body;

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

  // Re-attach theme data for engine functions
  if (!state.themeData) {
    const themeUrl = new URL(`/play/oroboros/themes/${state.theme}.json`, request.url);
    const themeResp = await fetch(themeUrl);
    state.themeData = await themeResp.json();
  }

  let result;

  if (action === 'split') {
    const roleACount = body.roleACount;
    result = chooseSplit(state, player, roleACount);
  } else if (action === 'place') {
    const { q, r, role } = body;
    result = placeStone(state, player, q, r, role);
  } else {
    return jsonResponse({ error: 'Unknown action' }, 400);
  }

  if (result.error) {
    return jsonResponse({ error: result.error }, 400);
  }

  const SEVEN_DAYS = 60 * 60 * 24 * 7;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  return jsonResponse({ ok: true, phase: state.phase });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
