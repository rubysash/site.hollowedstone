// Tablut -- board data
// 9x9 grid, chess-style algebraic notation (a1-i9)

import { BOARD_SIZE, FILES, RANKS, THRONE, CORNERS } from './constants.js';

// All 81 square IDs
export const ALL_NODES = [];
for (let r = 0; r < BOARD_SIZE; r++) {
  for (let f = 0; f < BOARD_SIZE; f++) {
    ALL_NODES.push(FILES[f] + RANKS[r]);
  }
}

export function fileIndex(node) { return FILES.indexOf(node[0]); }
export function rankIndex(node) { return parseInt(node.slice(1), 10) - 1; }

export function nodeAt(fi, ri) {
  if (fi < 0 || fi >= BOARD_SIZE || ri < 0 || ri >= BOARD_SIZE) return null;
  return FILES[fi] + RANKS[ri];
}

// 4 orthogonal directions [dFile, dRank]
export const DIRECTIONS = [
  [0, 1],   // N
  [0, -1],  // S
  [1, 0],   // E
  [-1, 0]   // W
];

// Get all squares a piece can move to from a given position (rook movement)
// Stops at board edge or any occupied square. Cannot land on throne/corners unless king.
export function getReachable(board, from, isKing) {
  const fi = fileIndex(from);
  const ri = rankIndex(from);
  const targets = [];

  for (const [df, dr] of DIRECTIONS) {
    let f = fi + df, r = ri + dr;
    while (f >= 0 && f < BOARD_SIZE && r >= 0 && r < BOARD_SIZE) {
      const node = nodeAt(f, r);
      if (board[node] !== null) break; // blocked by any piece

      // Only king can land on throne or corners
      if (!isKing && (node === THRONE || CORNERS.includes(node))) {
        // Can pass through empty throne but not stop
        if (node === THRONE) {
          f += df; r += dr;
          continue;
        }
        break; // cannot pass through or land on corners
      }

      targets.push(node);
      f += df;
      r += dr;
    }
  }
  return targets;
}

// Orthogonal adjacency (4-connected)
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
// ViewBox 700x700, grid spacing 75px, margin 50
const MARGIN = 55;
const CELL = 65;
export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  NODE_POSITIONS[node] = {
    x: MARGIN + fi * CELL + CELL / 2,
    y: MARGIN + (8 - ri) * CELL + CELL / 2
  };
}

// Initial board setup
export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;

  // King on throne
  board['e5'] = 'king';

  // Defenders (p2): cross around king
  for (const n of ['c5','d5','f5','g5','e3','e4','e6','e7']) board[n] = 'p2';

  // Attackers (p1): groups of 4 at each edge center
  // Top: d9, e9, f9, e8
  for (const n of ['d9','e9','f9','e8']) board[n] = 'p1';
  // Bottom: d1, e1, f1, e2
  for (const n of ['d1','e1','f1','e2']) board[n] = 'p1';
  // Left: a4, a5, a6, b5
  for (const n of ['a4','a5','a6','b5']) board[n] = 'p1';
  // Right: i4, i5, i6, h5
  for (const n of ['i4','i5','i6','h5']) board[n] = 'p1';

  return board;
}

// Check if a square is "hostile" (counts as enemy for custodian capture)
export function isHostile(node, board) {
  if (CORNERS.includes(node)) return true;
  if (node === THRONE && board[node] === null) return true;
  return false;
}
