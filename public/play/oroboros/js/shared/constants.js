// Game constants

export const WIN_SCORE = 5;
export const NORMAL_MOVES = 2;
export const CENTER_MOVES = 3;
export const KO_MEMORY = 2;

// Displacement cycle: role → role it beats
// All themes share this map — each theme's role IDs must appear here
export const BEATS = {
  // Wyrd (Norse)
  ice: 'fire',
  fire: 'wood',
  wood: 'wind',
  wind: 'ice',
  // Inner Work (Psychology)
  courage: 'planning',
  planning: 'compassion',
  compassion: 'discipline',
  discipline: 'courage',
  // Neutral
  red: 'blue',
  blue: 'green',
  green: 'gold',
  gold: 'red'
};

// Player role assignments: p1 has roles 1 & 3, p2 has roles 2 & 4
export const PLAYER_ROLES = {
  p1: ['role1', 'role3'],
  p2: ['role2', 'role4']
};

// Game phases
export const PHASE = {
  WAITING: 'waiting',
  SPLITS: 'splits',
  PLACING: 'placing',
  FREE_MOVE: 'free_move',
  PLAY: 'play',
  FINISHED: 'finished'
};

// Turn phases
export const TURN_PHASE = {
  NORMAL: 'normal',
  HOLDING: 'holding',
  BERSERKER: 'berserker'
};

export function canBeat(attackerRole, defenderRole) {
  return BEATS[attackerRole] === defenderRole;
}

export function ownsRole(player, roleId, theme) {
  const r1 = theme.roles.role1.id;
  const r2 = theme.roles.role2.id;
  const r3 = theme.roles.role3.id;
  const r4 = theme.roles.role4.id;
  if (player === 'p1') return roleId === r1 || roleId === r3;
  if (player === 'p2') return roleId === r2 || roleId === r4;
  return false;
}

export function getPlayerRoleIds(player, theme) {
  if (player === 'p1') return [theme.roles.role1.id, theme.roles.role3.id];
  return [theme.roles.role2.id, theme.roles.role4.id];
}
