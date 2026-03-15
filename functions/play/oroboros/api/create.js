import { createGame } from '../../../../public/play/oroboros/js/shared/engine.js';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const kv = env.GAME_STATE;
  const body = await request.json();
  const themeId = body.theme || 'wyrd';

  // Load theme data
  // Themes are static JSON — we'll inline a fetch from the same origin
  const themeUrl = new URL(`/play/oroboros/themes/${themeId}.json`, request.url);
  const themeResp = await fetch(themeUrl);
  if (!themeResp.ok) {
    return jsonResponse({ error: 'Unknown theme' }, 400);
  }
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
  state.phase = 'waiting';

  // Store game state and code lookup
  // TTL: active games expire after 7 days, code lookup after 7 days
  // Finished games get a shorter TTL set in the move endpoint
  const SEVEN_DAYS = 60 * 60 * 24 * 7;
  await kv.put(`game:${accessCode}`, JSON.stringify(state), { expirationTtl: SEVEN_DAYS });
  await kv.put(`code:${accessCode}`, accessCode, { expirationTtl: SEVEN_DAYS });

  return jsonResponse({ accessCode, player: 'p1', token });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
