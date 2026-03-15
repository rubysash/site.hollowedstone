import { sanitizeForPlayer } from '../../../../public/play/oroboros/js/shared/engine.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const kv = env.GAME_STATE;
  const url = new URL(request.url);
  const accessCode = url.searchParams.get('game');
  const token = url.searchParams.get('token');
  const since = parseInt(url.searchParams.get('since') || '0', 10);

  if (!accessCode || !token) {
    return jsonResponse({ error: 'Missing game or token' }, 400);
  }

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) {
    return jsonResponse({ error: 'Game not found' }, 404);
  }

  const state = JSON.parse(raw);

  // Identify player by token
  let player = null;
  if (state.players.p1.token === token) player = 'p1';
  else if (state.players.p2.token === token) player = 'p2';
  else return jsonResponse({ error: 'Invalid token' }, 403);

  // Re-attach theme data for sanitization logic
  // (themeData was stored with the game)
  const sanitized = sanitizeForPlayer(state, player);
  sanitized.you = player;

  // If since provided, only return log entries after that seq
  if (since > 0) {
    sanitized.log = sanitized.log.filter(e => e.seq > since);
  }

  return jsonResponse(sanitized);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
