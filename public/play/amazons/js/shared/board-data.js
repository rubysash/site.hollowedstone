// Amazons -- board data
// 10x10 grid, queen movement

import { BOARD_SIZE, FILES, RANKS } from './constants.js';

export const ALL_NODES = [];
for (let r = 0; r < BOARD_SIZE; r++) {
  for (let f = 0; f < BOARD_SIZE; f++) {
    ALL_NODES.push(FILES[f] + RANKS[r]);
  }
}

export function fileIndex(node) { return FILES.indexOf(node[0]); }
export function rankIndex(node) {
  const r = node.slice(1);
  return RANKS.indexOf(r);
}

export function nodeAt(fi, ri) {
  if (fi < 0 || fi >= BOARD_SIZE || ri < 0 || ri >= BOARD_SIZE) return null;
  return FILES[fi] + RANKS[ri];
}

// 8 directions [dFile, dRank]
export const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

// Get all squares reachable by queen movement from a given position
export function getQueenReachable(board, from) {
  const fi = fileIndex(from);
  const ri = rankIndex(from);
  const reachable = [];

  for (const [df, dr] of DIRECTIONS) {
    let f = fi + df, r = ri + dr;
    while (f >= 0 && f < BOARD_SIZE && r >= 0 && r < BOARD_SIZE) {
      const node = nodeAt(f, r);
      if (board[node] !== null) break; // blocked by amazon or arrow
      reachable.push(node);
      f += df;
      r += dr;
    }
  }
  return reachable;
}

// SVG positions
// ViewBox 700x700. 10x10 grid, cell 60px, margin 50.
const MARGIN = 50;
const CELL = 60;
export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  NODE_POSITIONS[node] = {
    x: MARGIN + fi * CELL + CELL / 2,
    y: MARGIN + (9 - ri) * CELL + CELL / 2
  };
}
export { CELL, MARGIN };

// Initial board
export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;
  // White (p1): a4, d1, g1, j4
  board['a4'] = 'p1'; board['d1'] = 'p1'; board['g1'] = 'p1'; board['j4'] = 'p1';
  // Black (p2): a7, d10, g10, j7
  board['a7'] = 'p2'; board['d10'] = 'p2'; board['g10'] = 'p2'; board['j7'] = 'p2';
  return board;
}
