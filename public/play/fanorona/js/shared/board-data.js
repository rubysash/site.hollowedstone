// Fanorona board data
// 5 rows x 9 columns = 45 intersections
// Diagonals exist where (colIndex + rowIndex) is even
//
// Node naming: column letter (A-I) + row number (1-5)
// Row 1 = bottom (Black's home), Row 5 = top (White's home)
// Column A = leftmost, Column I = rightmost

import { COLS, ROWS } from './constants.js';

const COL_LETTERS = 'ABCDEFGHI';

// Generate all 45 node IDs
export const ALL_NODES = [];
for (let r = 1; r <= ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    ALL_NODES.push(COL_LETTERS[c] + r);
  }
}

// Parse node ID to {col, row} (0-indexed col, 1-indexed row)
export function parseNode(node) {
  const col = COL_LETTERS.indexOf(node[0]);
  const row = parseInt(node.slice(1), 10);
  return { col, row };
}

// Build node ID from col (0-indexed) and row (1-indexed)
export function nodeId(col, row) {
  return COL_LETTERS[col] + row;
}

// Check if a node has diagonal connections
// Diagonals exist where (col + row) is odd using 0-indexed col + 1-indexed row
// This matches the standard Fanorona board: A1 has diags, B1 does not, etc.
export function hasDiagonals(node) {
  const { col, row } = parseNode(node);
  return (col + row) % 2 === 1;
}

// 8 possible directions: [dcol, drow]
const DIRECTIONS = [
  [0, 1],   // up
  [0, -1],  // down
  [1, 0],   // right
  [-1, 0],  // left
  [1, 1],   // up-right
  [-1, 1],  // up-left
  [1, -1],  // down-right
  [-1, -1]  // down-left
];

// Get direction key string for a [dcol, drow] pair
export function dirKey(dc, dr) {
  return `${dc},${dr}`;
}

// Get the direction from one node to an adjacent node, or null if not adjacent
export function getDirection(from, to) {
  const f = parseNode(from);
  const t = parseNode(to);
  const dc = t.col - f.col;
  const dr = t.row - f.row;
  if (Math.abs(dc) > 1 || Math.abs(dr) > 1) return null;
  if (dc === 0 && dr === 0) return null;
  return [dc, dr];
}

// Build adjacency map
export const ADJACENCY = {};
for (const node of ALL_NODES) {
  const { col, row } = parseNode(node);
  const diag = hasDiagonals(node);
  const neighbors = [];

  for (const [dc, dr] of DIRECTIONS) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc < 0 || nc >= COLS || nr < 1 || nr > ROWS) continue;

    // Diagonal move: both source AND target must support diagonals
    const isDiag = dc !== 0 && dr !== 0;
    if (isDiag) {
      const targetNode = nodeId(nc, nr);
      if (!diag || !hasDiagonals(targetNode)) continue;
    }

    neighbors.push(nodeId(nc, nr));
  }

  ADJACENCY[node] = neighbors;
}

// SVG pixel positions for each node
// Board viewBox: 900 x 500, nodes at 100px spacing
// Col A=50, B=150, ..., I=850
// Row 5=50 (top), Row 4=150, Row 3=250, Row 2=350, Row 1=450 (bottom)
export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const { col, row } = parseNode(node);
  NODE_POSITIONS[node] = {
    x: 50 + col * 100,
    y: 50 + (ROWS - row) * 100
  };
}

// Check if two nodes are adjacent
export function isAdjacent(from, to) {
  return ADJACENCY[from]?.includes(to) || false;
}

// Get all nodes in a line from a starting point in a given direction
// Returns array of node IDs (not including the start)
export function getLine(start, dc, dr) {
  const s = parseNode(start);
  const line = [];
  let c = s.col + dc;
  let r = s.row + dr;

  while (c >= 0 && c < COLS && r >= 1 && r <= ROWS) {
    const n = nodeId(c, r);
    // For diagonal lines, every node must support diagonals
    if (dc !== 0 && dr !== 0 && !hasDiagonals(n)) break;
    line.push(n);
    c += dc;
    r += dr;
  }
  return line;
}

// Initial board setup
// Row 1-2: all p1 (Black), Row 4-5: all p2 (White)
// Row 3: alternating starting with p1 at A3, center E3 empty
export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) {
    const { col, row } = parseNode(node);
    if (row <= 2) {
      board[node] = 'p1';
    } else if (row >= 4) {
      board[node] = 'p2';
    } else {
      // Row 3: alternating, center empty
      if (col === 4) {
        board[node] = null; // E3 is empty
      } else {
        board[node] = col % 2 === 0 ? 'p1' : 'p2';
      }
    }
  }
  return board;
}
