// Surakarta -- board data
// 6x6 grid with 8 corner loop arcs for capture

import { BOARD_SIZE, FILES, RANKS } from './constants.js';

// All 36 node IDs
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

// 8 directions for regular movement [dFile, dRank]
export const MOVE_DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],  // orthogonal
  [1, 1], [1, -1], [-1, 1], [-1, -1] // diagonal
];

// 4 orthogonal directions for capture path tracing
const ORTHO = [
  { df: 0, dr: -1, name: 'up' },    // toward row 1 (top)
  { df: 0, dr: 1, name: 'down' },   // toward row 6 (bottom)
  { df: -1, dr: 0, name: 'left' },  // toward col a
  { df: 1, dr: 0, name: 'right' }   // toward col f
];

// Loop connections: each loop connects two edge points via an arc outside the grid.
// When traveling along a grid line and hitting a loop entry, the piece exits on
// the perpendicular line at the other endpoint, continuing in the new direction.
//
// Each entry: { from: node, fromDir: direction traveling when entering,
//               to: node, toDir: direction traveling when exiting }
// The piece arrives at 'from' traveling in 'fromDir', enters the loop,
// and exits at 'to' now traveling in 'toDir'.

const LOOP_TRANSITIONS = [
  // Inner loops (radius 1, connecting 2nd-from-corner points)
  // Top-left corner (a1): b1 <-> a2
  { from: 'b1', fromDir: 'left',  to: 'a2', toDir: 'down' },
  { from: 'a2', fromDir: 'up',    to: 'b1', toDir: 'right' },
  // Top-right corner (f1): e1 <-> f2
  { from: 'e1', fromDir: 'right', to: 'f2', toDir: 'down' },
  { from: 'f2', fromDir: 'up',    to: 'e1', toDir: 'left' },
  // Bottom-left corner (a6): a5 <-> b6
  { from: 'a5', fromDir: 'down',  to: 'b6', toDir: 'right' },
  { from: 'b6', fromDir: 'left',  to: 'a5', toDir: 'up' },
  // Bottom-right corner (f6): f5 <-> e6
  { from: 'f5', fromDir: 'down',  to: 'e6', toDir: 'left' },
  { from: 'e6', fromDir: 'right', to: 'f5', toDir: 'up' },

  // Outer loops (radius 2, connecting 3rd-from-corner points)
  // Top-left corner (a1): c1 <-> a3
  { from: 'c1', fromDir: 'left',  to: 'a3', toDir: 'down' },
  { from: 'a3', fromDir: 'up',    to: 'c1', toDir: 'right' },
  // Top-right corner (f1): d1 <-> f3
  { from: 'd1', fromDir: 'right', to: 'f3', toDir: 'down' },
  { from: 'f3', fromDir: 'up',    to: 'd1', toDir: 'left' },
  // Bottom-left corner (a6): a4 <-> c6
  { from: 'a4', fromDir: 'down',  to: 'c6', toDir: 'right' },
  { from: 'c6', fromDir: 'left',  to: 'a4', toDir: 'up' },
  // Bottom-right corner (f6): f4 <-> d6
  { from: 'f4', fromDir: 'down',  to: 'd6', toDir: 'left' },
  { from: 'd6', fromDir: 'right', to: 'f4', toDir: 'up' },
];

// Build a lookup: given a node and the direction you're traveling, get the loop exit
const _loopMap = {};
for (const t of LOOP_TRANSITIONS) {
  _loopMap[t.from + ':' + t.fromDir] = t;
}

// Get direction delta from direction name
function dirDelta(name) {
  switch (name) {
    case 'up':    return { df: 0, dr: -1 };
    case 'down':  return { df: 0, dr: 1 };
    case 'left':  return { df: -1, dr: 0 };
    case 'right': return { df: 1, dr: 0 };
  }
  return null;
}

// Get direction name from delta
function dirName(df, dr) {
  if (df === 0 && dr === -1) return 'up';
  if (df === 0 && dr === 1) return 'down';
  if (df === -1 && dr === 0) return 'left';
  if (df === 1 && dr === 0) return 'right';
  return null;
}

// Trace capture paths from a node. Returns array of capturable opponent nodes.
// A capture path travels along orthogonal grid lines and through loops.
// Must pass through at least one loop. Path must be empty until the target.
export function getCaptureTargets(board, from, player) {
  const opponent = player === 'p1' ? 'p2' : 'p1';
  const targets = [];

  for (const dir of ORTHO) {
    // Trace from this node in this direction, looking for loop entries
    traceCapturePath(board, from, dir.name, 0, opponent, targets, new Set());
  }

  return [...new Set(targets)];
}

function traceCapturePath(board, current, direction, loopsPassed, opponent, targets, visited) {
  const delta = dirDelta(direction);
  let fi = fileIndex(current);
  let ri = rankIndex(current);

  // Step along the grid line in the given direction
  while (true) {
    fi += delta.df;
    ri += delta.dr;
    const next = nodeAt(fi, ri);

    if (!next) {
      // Off the grid edge: check for a loop transition from the previous node
      // We went one step too far, back up
      fi -= delta.df;
      ri -= delta.dr;
      const edgeNode = nodeAt(fi, ri);
      if (!edgeNode) break;

      const key = edgeNode + ':' + direction;
      const transition = _loopMap[key];
      if (!transition) break; // no loop here, path ends

      // Check the edge node is empty (unless it's the starting piece position)
      if (board[edgeNode] && edgeNode !== current) break;

      const visitKey = transition.to + ':' + transition.toDir;
      if (visited.has(visitKey)) break; // prevent infinite loops
      visited.add(visitKey);

      // Take the loop and continue tracing from the exit point
      traceCapturePath(board, transition.to, transition.toDir, loopsPassed + 1, opponent, targets, visited);
      break;
    }

    // Check what's at the next position
    const piece = board[next];
    if (piece === opponent && loopsPassed > 0) {
      // Valid capture target (passed through at least one loop)
      targets.push(next);
      break;
    }
    if (piece) {
      // Blocked by any piece (friendly or enemy without enough loops)
      break;
    }

    // Empty square, check for loop transition at this point
    const key = next + ':' + direction;
    const transition = _loopMap[key];
    if (transition) {
      const visitKey = transition.to + ':' + transition.toDir;
      if (!visited.has(visitKey)) {
        visited.add(visitKey);
        traceCapturePath(board, transition.to, transition.toDir, loopsPassed + 1, opponent, targets, visited);
      }
      // Also continue straight (the piece doesn't have to take the loop)
      // Actually in Surakarta, when you reach a loop entry point while tracing
      // along a capture path, you MUST take the loop (the path follows the track).
      // So we break here and only continue via the loop.
      break;
    }

    // Continue straight
  }
}

// 8-connectivity adjacency for regular moves
export const ADJACENCY = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  const neighbors = [];
  for (const [df, dr] of MOVE_DIRECTIONS) {
    const n = nodeAt(fi + df, ri + dr);
    if (n) neighbors.push(n);
  }
  ADJACENCY[node] = neighbors;
}

// SVG positions
// ViewBox 700x700. Grid from 100,100 to 600,600. Spacing 100px.
const MARGIN = 100;
const CELL = 100;
export const NODE_POSITIONS = {};
for (const node of ALL_NODES) {
  const fi = fileIndex(node);
  const ri = rankIndex(node);
  NODE_POSITIONS[node] = {
    x: MARGIN + fi * CELL,
    y: MARGIN + ri * CELL
  };
}

// Initial board setup
// P1 (dark) on rows 1-2, P2 (light) on rows 5-6
export function getInitialBoard() {
  const board = {};
  for (const node of ALL_NODES) board[node] = null;
  for (const f of FILES) {
    board[f + '1'] = 'p1';
    board[f + '2'] = 'p1';
    board[f + '5'] = 'p2';
    board[f + '6'] = 'p2';
  }
  return board;
}
