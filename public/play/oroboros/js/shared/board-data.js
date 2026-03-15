// Hex grid for Agon board (radius 4, 61 hexes)
// Axial coordinates (q, r), pointy-top orientation
// Center = (0, 0), Ring = max(|q|, |r|, |q+r|)

export const BOARD_RADIUS = 4;
export const HEX_SIZE = 38.105;
export const CENTER_X = 363;
export const CENTER_Y = 363;

// Six neighbor directions (pointy-top axial)
export const DIRECTIONS = [
  { q: 1, r: 0 },   // east
  { q: 1, r: -1 },  // northeast
  { q: 0, r: -1 },  // northwest
  { q: -1, r: 0 },  // west
  { q: -1, r: 1 },  // southwest
  { q: 0, r: 1 },   // southeast
];

// Starting edges
export const P1_EDGE = [
  { q: 0, r: -4 }, { q: 1, r: -4 }, { q: 2, r: -4 }, { q: 3, r: -4 }, { q: 4, r: -4 }
];
export const P2_EDGE = [
  { q: -4, r: 4 }, { q: -3, r: 4 }, { q: -2, r: 4 }, { q: -1, r: 4 }, { q: 0, r: 4 }
];

export const CENTER = { q: 0, r: 0 };

export function hexKey(q, r) {
  return `${q},${r}`;
}

export function parseHexKey(key) {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function getRing(q, r) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

export function generateHexes() {
  const hexes = [];
  for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
    for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
      if (Math.abs(q + r) <= BOARD_RADIUS) {
        hexes.push({ q, r });
      }
    }
  }
  return hexes;
}

export function getNeighbors(q, r) {
  return DIRECTIONS
    .map(d => ({ q: q + d.q, r: r + d.r }))
    .filter(h => getRing(h.q, h.r) <= BOARD_RADIUS);
}

export function isAdjacent(q1, r1, q2, r2) {
  const dq = q2 - q1;
  const dr = r2 - r1;
  return DIRECTIONS.some(d => d.q === dq && d.r === dr);
}

export function isMoveTowardCenter(fromQ, fromR, toQ, toR) {
  return getRing(toQ, toR) < getRing(fromQ, fromR);
}

export function isCenter(q, r) {
  return q === 0 && r === 0;
}

export function hexToPixel(q, r) {
  return {
    x: CENTER_X + Math.sqrt(3) * HEX_SIZE * q + (Math.sqrt(3) / 2) * HEX_SIZE * r,
    y: CENTER_Y + 1.5 * HEX_SIZE * r
  };
}

export function hexPathD(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 3) * i;
    pts.push(
      (cx + HEX_SIZE * Math.cos(angle)).toFixed(2) + ',' +
      (cy + HEX_SIZE * Math.sin(angle)).toFixed(2)
    );
  }
  return 'M ' + pts.join(' L ') + ' Z';
}

// Precompute adjacency map: { "q,r": ["q2,r2", ...] }
let _adjMap = null;
export function getAdjacencyMap() {
  if (_adjMap) return _adjMap;
  _adjMap = {};
  for (const h of generateHexes()) {
    _adjMap[hexKey(h.q, h.r)] = getNeighbors(h.q, h.r).map(n => hexKey(n.q, n.r));
  }
  return _adjMap;
}

export function getEdge(player) {
  return player === 'p1' ? P1_EDGE : P2_EDGE;
}

export function isOnEdge(q, r, player) {
  const edge = getEdge(player);
  return edge.some(e => e.q === q && e.r === r);
}
