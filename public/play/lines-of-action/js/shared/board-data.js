// Lines of Action -- board data
// 8x8 grid, chess algebraic notation (a1-h8)

import { BOARD_SIZE, FILES, RANKS } from './constants.js';

// All 64 square IDs
export const ALL_NODES = [];
for (let r = 0; r < BOARD_SIZE; r++) {
  for (let f = 0; f < BOARD_SIZE; f++) {
    ALL_NODES.push(FILES[f] + RANKS[r]);
  }
}

// Parse node to 0-based indices
export function fileIndex(node) { return FILES.indexOf(node[0]); }
export function rankIndex(node) { return parseInt(node[1], 10) - 1; }

// Build node from indices (null if out of bounds)
export function nodeAt(fi, ri) {
  if (fi < 0 || fi >= BOARD_SIZE || ri < 0 || ri >= BOARD_SIZE) return null;
  return FILES[fi] + RANKS[ri];
}

// 8 direction vectors: [dFile, dRank]
export const DIRECTIONS = [
  [0, 1],   // N
  [1, 1],   // NE
  [1, 0],   // E
  [1, -1],  // SE
  [0, -1],  // S
  [-1, -1], // SW
  [-1, 0],  // W
  [-1, 1]   // NW
];

// Get direction vector from one node to another, or null if not on a line
export function getDirection(from, to) {
  const df = fileIndex(to) - fileIndex(from);
  const dr = rankIndex(to) - rankIndex(from);
  if (df === 0 && dr === 0) return null;
  const absDf = Math.abs(df);
  const absDr = Math.abs(dr);
  // Must be on a straight line: same file, same rank, or same diagonal
  if (df !== 0 && dr !== 0 && absDf !== absDr) return null;
  const dist = Math.max(absDf, absDr);
  return [df / dist, dr / dist, dist];
}

// Get the destination node N steps from 'from' in a direction
export function getDestination(from, dFile, dRank, steps) {
  const fi = fileIndex(from) + dFile * steps;
  const ri = rankIndex(from) + dRank * steps;
  return nodeAt(fi, ri);
}

// Count all pieces on the full line through 'node' in the given axis direction
// The line extends in both directions until it hits the board edge
export function countPiecesOnLine(board, node, dFile, dRank) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  let count = 0;

  // Count the piece on the node itself
  if (board[node]) count++;

  // Extend in the positive direction
  let f = fi + dFile, r = ri + dRank;
  while (f >= 0 && f < BOARD_SIZE && r >= 0 && r < BOARD_SIZE) {
    if (board[nodeAt(f, r)]) count++;
    f += dFile;
    r += dRank;
  }

  // Extend in the negative direction
  f = fi - dFile;
  r = ri - dRank;
  while (f >= 0 && f < BOARD_SIZE && r >= 0 && r < BOARD_SIZE) {
    if (board[nodeAt(f, r)]) count++;
    f -= dFile;
    r -= dRank;
  }

  return count;
}

// Get squares between from and to (exclusive of both endpoints)
export function getSquaresBetween(from, to) {
  const dir = getDirection(from, to);
  if (!dir) return [];
  const [dFile, dRank, dist] = dir;
  const squares = [];
  for (let i = 1; i < dist; i++) {
    squares.push(getDestination(from, dFile, dRank, i));
  }
  return squares;
}

// 8-connectivity adjacency map (for connection/win detection)
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

// SVG positions for each square
// ViewBox 700x700, board area from 50,50 to 650,650, cell size 75
const MARGIN = 50;
const CELL = 75;
export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  NODE_POSITIONS[node] = {
    x: MARGIN + fi * CELL + CELL / 2,
    y: MARGIN + (7 - ri) * CELL + CELL / 2
  };
}

// Initial board setup
// Black (p1): b1-g1, b8-g8 (top and bottom edges, no corners)
// White (p2): a2-a7, h2-h7 (left and right edges, no corners)
export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;

  // Black on ranks 1 and 8, files b-g
  for (const f of ['b','c','d','e','f','g']) {
    board[f + '1'] = 'p1';
    board[f + '8'] = 'p1';
  }
  // White on files a and h, ranks 2-7
  for (const r of ['2','3','4','5','6','7']) {
    board['a' + r] = 'p2';
    board['h' + r] = 'p2';
  }
  return board;
}
