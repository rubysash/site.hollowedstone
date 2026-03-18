// Seega -- board data
// 5x5 grid, orthogonal movement only

import { BOARD_SIZE, FILES, RANKS, CENTER } from './constants.js';

export const ALL_NODES = [];
for (let r = 0; r < BOARD_SIZE; r++) {
  for (let f = 0; f < BOARD_SIZE; f++) {
    ALL_NODES.push(FILES[f] + RANKS[r]);
  }
}

export function fileIndex(node) { return FILES.indexOf(node[0]); }
export function rankIndex(node) { return parseInt(node[1], 10) - 1; }

export function nodeAt(fi, ri) {
  if (fi < 0 || fi >= BOARD_SIZE || ri < 0 || ri >= BOARD_SIZE) return null;
  return FILES[fi] + RANKS[ri];
}

// 4 orthogonal directions [dFile, dRank]
export const DIRECTIONS = [
  [0, -1],  // up (toward row 1)
  [0, 1],   // down (toward row 5)
  [1, 0],   // right
  [-1, 0]   // left
];

// Orthogonal adjacency
export const ADJACENCY = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  const neighbors = [];
  for (const [df, dr] of DIRECTIONS) {
    const n = nodeAt(fi + df, ri + dr);
    if (n) neighbors.push(n);
  }
  ADJACENCY[node] = neighbors;
}

// SVG positions
// ViewBox 700x700. 5x5 grid with 100px cells, starting at 100,100.
const MARGIN = 100;
const CELL = 100;
export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  NODE_POSITIONS[node] = {
    x: MARGIN + fi * CELL + CELL / 2,
    y: MARGIN + ri * CELL + CELL / 2
  };
}

// Initial board: all empty (pieces placed during placement phase)
export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;
  return board;
}
