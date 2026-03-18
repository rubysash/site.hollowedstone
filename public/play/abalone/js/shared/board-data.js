// Abalone -- board data
// 61-hex hexagonal board (5 per side), rows A-I
// Uses cube coordinates internally for neighbor/direction math

import { ROWS, ROW_SIZES } from './constants.js';

// --- Node generation ---

export const ALL_NODES = [];
for (const row of ROWS) {
  for (let c = 1; c <= ROW_SIZES[row]; c++) {
    ALL_NODES.push(row + c);
  }
}

// --- Cube coordinate system ---
// Cube coords (x, y, z) where x + y + z = 0
// Center = E5 = (0, 0, 0)
// Formula: ri = row index (A=0..I=8), ci = column index (0-based)
//   z = ri - 4
//   x = ci - min(ri, 4)
//   y = -x - z

const _labelToCube = {};
const _cubeToLabel = {};

for (const row of ROWS) {
  const ri = ROWS.indexOf(row);
  const z = ri - 4;
  for (let c = 1; c <= ROW_SIZES[row]; c++) {
    const ci = c - 1;
    const x = ci - Math.min(ri, 4);
    const y = -x - z;
    const label = row + c;
    const key = `${x},${y},${z}`;
    _labelToCube[label] = { x, y, z };
    _cubeToLabel[key] = label;
  }
}

export function labelToCube(label) { return _labelToCube[label]; }
export function cubeToLabel(x, y, z) { return _cubeToLabel[`${x},${y},${z}`] || null; }
export function isOnBoard(x, y, z) { return _cubeToLabel[`${x},${y},${z}`] !== undefined; }

// --- 6 hex directions in cube coordinates ---

export const DIRECTIONS = [
  { dx: 1, dy: -1, dz: 0, name: 'E' },   // 0: East (right along row)
  { dx: -1, dy: 1, dz: 0, name: 'W' },   // 1: West (left along row)
  { dx: 1, dy: 0, dz: -1, name: 'NE' },  // 2: Northeast
  { dx: 0, dy: 1, dz: -1, name: 'NW' },  // 3: Northwest
  { dx: 0, dy: -1, dz: 1, name: 'SE' },  // 4: Southeast
  { dx: -1, dy: 0, dz: 1, name: 'SW' }   // 5: Southwest
];

// Opposite direction index
export function oppositeDir(dirIdx) {
  return dirIdx ^ 1; // 0<->1, 2<->3, 4<->5
}

// Get neighbor of a node in a direction (null if off-board)
export function getNeighbor(label, dirIdx) {
  const c = _labelToCube[label];
  if (!c) return null;
  const d = DIRECTIONS[dirIdx];
  return cubeToLabel(c.x + d.dx, c.y + d.dy, c.z + d.dz);
}

// Get direction index from one adjacent node to another (null if not adjacent)
export function getDirectionBetween(from, to) {
  const cf = _labelToCube[from];
  const ct = _labelToCube[to];
  if (!cf || !ct) return null;
  const dx = ct.x - cf.x;
  const dy = ct.y - cf.y;
  const dz = ct.z - cf.z;
  for (let i = 0; i < 6; i++) {
    const d = DIRECTIONS[i];
    if (d.dx === dx && d.dy === dy && d.dz === dz) return i;
  }
  return null;
}

// Check if nodes are collinear and contiguous, return direction index or null
export function getGroupAxis(nodes) {
  if (nodes.length === 1) return null; // single marble has no axis
  if (nodes.length === 2) {
    return getDirectionBetween(nodes[0], nodes[1]);
  }
  // 3 nodes: check all orderings
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dir = getDirectionBetween(nodes[i], nodes[j]);
      if (dir === null) continue;
      const third = getNeighbor(nodes[j], dir);
      if (third && nodes.includes(third)) {
        return dir; // return direction from first to second (one end to the other)
      }
    }
  }
  return null;
}

// Order a group along its axis (returns sorted array from one end to the other)
export function orderGroup(nodes) {
  if (nodes.length <= 1) return [...nodes];
  if (nodes.length === 2) {
    const dir = getDirectionBetween(nodes[0], nodes[1]);
    return dir !== null ? [nodes[0], nodes[1]] : [...nodes];
  }
  // Find the end node that has no group neighbor behind it
  for (const node of nodes) {
    let isEnd = true;
    for (let d = 0; d < 6; d++) {
      const prev = getNeighbor(node, d);
      if (prev && nodes.includes(prev)) {
        const next = getNeighbor(prev, d);
        if (next && nodes.includes(next)) {
          // prev is middle, not an end
        }
        // check if node is at the start of this direction
        const behind = getNeighbor(node, oppositeDir(d));
        if (!behind || !nodes.includes(behind)) {
          // node is at one end in direction d
          const ordered = [node, prev];
          const third = getNeighbor(prev, d);
          if (third && nodes.includes(third)) ordered.push(third);
          if (ordered.length === nodes.length) return ordered;
        }
      }
    }
  }
  return [...nodes];
}

// --- Adjacency map (for general use) ---

export const ADJACENCY = {};
for (const node of ALL_NODES) {
  const neighbors = [];
  for (let d = 0; d < 6; d++) {
    const n = getNeighbor(node, d);
    if (n) neighbors.push(n);
  }
  ADJACENCY[node] = neighbors;
}

// --- SVG positions ---
// ViewBox 700x700. Hex spacing: 64px horizontal, 56px vertical.
// Row Y: A=126, B=182, C=238, D=294, E=350, F=406, G=462, H=518, I=574
// Row X start: 5hex=222, 6hex=190, 7hex=158, 8hex=126, 9hex=94

const ROW_Y = { A:126, B:182, C:238, D:294, E:350, F:406, G:462, H:518, I:574 };
const ROW_X_START = { 5:222, 6:190, 7:158, 8:126, 9:94 };
const HEX_SPACING = 64;

export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const row = node[0];
  const col = parseInt(node.slice(1), 10);
  const size = ROW_SIZES[row];
  NODE_POSITIONS[node] = {
    x: ROW_X_START[size] + (col - 1) * HEX_SPACING,
    y: ROW_Y[row]
  };
}

// --- Initial board setup ---

export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;

  // Black (p1): rows A, B, center of C
  for (let c = 1; c <= ROW_SIZES.A; c++) board['A' + c] = 'p1';
  for (let c = 1; c <= ROW_SIZES.B; c++) board['B' + c] = 'p1';
  board['C3'] = 'p1'; board['C4'] = 'p1'; board['C5'] = 'p1';

  // White (p2): rows I, H, center of G
  for (let c = 1; c <= ROW_SIZES.I; c++) board['I' + c] = 'p2';
  for (let c = 1; c <= ROW_SIZES.H; c++) board['H' + c] = 'p2';
  board['G3'] = 'p2'; board['G4'] = 'p2'; board['G5'] = 'p2';

  return board;
}
