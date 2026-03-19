// TZAAR -- board data
// 60-space hex board (4 concentric rings, center removed)
// Uses axial coordinates mapped to ring-based node IDs

import { TOTAL_SPACES } from './constants.js';

// Build the board using cube coordinates
// Center (0,0,0) is the HOLE (not playable)
// Rings 1-4 correspond to distance 1-4 from center

const _cubeToId = {};
const _idToCube = {};
const _allNodes = [];

// 6 cube directions for walking around a ring
const HEX_DIRS = [
  [1, 0, -1], [0, 1, -1], [-1, 1, 0],
  [-1, 0, 1], [0, -1, 1], [1, -1, 0]
];

// Generate all hex positions at a given distance from center
function generateRing(distance) {
  const nodes = [];
  if (distance === 0) return nodes;

  // Start at the "top-right" corner of the ring
  let x = 0, y = -distance, z = distance;

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < distance; step++) {
      nodes.push([x, y, z]);
      x += HEX_DIRS[side][0];
      y += HEX_DIRS[side][1];
      z += HEX_DIRS[side][2];
    }
  }
  return nodes;
}

for (let ring = 1; ring <= 4; ring++) {
  const positions = generateRing(ring);
  positions.forEach((pos, idx) => {
    const id = `r${ring}n${idx}`;
    const [x, y, z] = pos;
    _cubeToId[`${x},${y},${z}`] = id;
    _idToCube[id] = { x, y, z };
    _allNodes.push(id);
  });
}

export const ALL_NODES = _allNodes;

export function idToCube(id) { return _idToCube[id]; }
export function cubeToId(x, y, z) { return _cubeToId[`${x},${y},${z}`] || null; }

// 6 hex directions in cube coords
const DIRECTIONS = [
  [1, -1, 0], [-1, 1, 0],
  [1, 0, -1], [-1, 0, 1],
  [0, 1, -1], [0, -1, 1]
];

// Get all occupied positions reachable from a node by straight-line movement
// Returns array of node IDs that have pieces (the FIRST piece in each direction)
// Cannot cross empty center (0,0,0) or jump over pieces
export function getReachableTargets(board, from) {
  const cube = _idToCube[from];
  if (!cube) return [];
  const targets = [];

  for (const [dx, dy, dz] of DIRECTIONS) {
    let x = cube.x + dx;
    let y = cube.y + dy;
    let z = cube.z + dz;

    while (true) {
      // Check if this position is the center hole (0,0,0)
      if (x === 0 && y === 0 && z === 0) break;

      const id = cubeToId(x, y, z);
      if (!id) break; // off the board

      if (board[id] !== null) {
        // Found an occupied space - this is a valid target
        targets.push(id);
        break;
      }

      // Empty space, continue
      x += dx;
      y += dy;
      z += dz;
    }
  }
  return targets;
}

// SVG positions for each node
// ViewBox 700x700, center at 350,350
// Pointy-top hex: px = S * sqrt(3) * (x + z/2), py = S * 3/2 * z
const CX = 350, CY = 350;
const HEX_SPACING = 43;

export const NODE_POSITIONS = {};
for (const id of ALL_NODES) {
  const c = _idToCube[id];
  const px = CX + HEX_SPACING * Math.sqrt(3) * (c.x + c.z / 2);
  const py = CY + HEX_SPACING * 1.5 * c.z;
  NODE_POSITIONS[id] = { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10 };
}

// Generate a random starting position
// All 60 spaces filled: 30 white pieces (6 tzaar, 9 tzarra, 15 tott)
// and 30 black pieces (same distribution)
export function getRandomSetup() {
  const board = {};

  // Create piece pools
  const whitePieces = [];
  const blackPieces = [];
  for (let i = 0; i < 6; i++) { whitePieces.push('tzaar'); blackPieces.push('tzaar'); }
  for (let i = 0; i < 9; i++) { whitePieces.push('tzarra'); blackPieces.push('tzarra'); }
  for (let i = 0; i < 15; i++) { whitePieces.push('tott'); blackPieces.push('tott'); }

  const allPieces = [];
  for (let i = 0; i < 30; i++) {
    allPieces.push({ owner: 'p1', type: whitePieces[i] });
    allPieces.push({ owner: 'p2', type: blackPieces[i] });
  }

  // Shuffle
  for (let i = allPieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPieces[i], allPieces[j]] = [allPieces[j], allPieces[i]];
  }

  // Place on board
  for (let i = 0; i < ALL_NODES.length; i++) {
    const p = allPieces[i];
    board[ALL_NODES[i]] = { owner: p.owner, type: p.type, height: 1 };
  }

  return board;
}

// Empty board for initialization
export function getEmptyBoard() {
  const board = {};
  for (const id of ALL_NODES) board[id] = null;
  return board;
}
