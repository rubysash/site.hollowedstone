function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const kv = env.GAME_STATE;
  const body = await request.json();
  const accessCode = (body.accessCode || '').toUpperCase().trim();

  if (!accessCode) {
    return jsonResponse({ error: 'Access code required' }, 400);
  }

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) {
    return jsonResponse({ error: 'Game not found' }, 404);
  }

  const state = JSON.parse(raw);

  if (state.players.p2.token) {
    // Already has a P2 — check if this is a rejoin
    return jsonResponse({ error: 'Game already has two players. Use your existing token.' }, 400);
  }

  if (state.phase !== 'waiting') {
    return jsonResponse({ error: 'Game is not accepting players' }, 400);
  }

  const token = generateToken();
  state.players.p2.token = token;
  state.phase = 'splits';
  state.updatedAt = new Date().toISOString();

  await kv.put(`game:${accessCode}`, JSON.stringify(state));

  return jsonResponse({ accessCode, player: 'p2', token });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
