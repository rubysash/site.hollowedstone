export async function onRequestGet(context) {
  const { env, params } = context;
  const kv = env.GAME_STATE;
  const accessCode = params.id;

  const raw = await kv.get(`game:${accessCode}`);
  if (!raw) {
    return jsonResponse({ error: 'Game not found' }, 404);
  }

  const state = JSON.parse(raw);

  // Return the move log and game metadata (no tokens)
  return jsonResponse({
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
