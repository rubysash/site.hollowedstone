// Nine Men's Morris board data
// 3 concentric squares, 24 intersections, connected at midpoints
//
// Node naming: letter (a-h clockwise from top-left) + ring number (1=outer, 2=middle, 3=inner)
//   a = top-left corner
//   b = top midpoint
//   c = top-right corner
//   d = right midpoint
//   e = bottom-right corner
//   f = bottom midpoint
//   g = bottom-left corner
//   h = left midpoint

export const ALL_NODES = [
  'a1','b1','c1','d1','e1','f1','g1','h1',
  'a2','b2','c2','d2','e2','f2','g2','h2',
  'a3','b3','c3','d3','e3','f3','g3','h3'
];

// Adjacency: each node → array of directly connected nodes
export const ADJACENCY = {
  a1: ['b1','h1'],
  b1: ['a1','c1','b2'],
  c1: ['b1','d1'],
  d1: ['c1','e1','d2'],
  e1: ['d1','f1'],
  f1: ['e1','g1','f2'],
  g1: ['f1','h1'],
  h1: ['g1','a1','h2'],

  a2: ['b2','h2'],
  b2: ['a2','c2','b1','b3'],
  c2: ['b2','d2'],
  d2: ['c2','e2','d1','d3'],
  e2: ['d2','f2'],
  f2: ['e2','g2','f1','f3'],
  g2: ['f2','h2'],
  h2: ['g2','a2','h1','h3'],

  a3: ['b3','h3'],
  b3: ['a3','c3','b2'],
  c3: ['b3','d3'],
  d3: ['c3','e3','d2'],
  e3: ['d3','f3'],
  f3: ['e3','g3','f2'],
  g3: ['f3','h3'],
  h3: ['g3','a3','h2']
};

// All 16 possible mills (lines of 3)
export const MILLS = [
  // Outer square sides
  ['a1','b1','c1'],
  ['c1','d1','e1'],
  ['e1','f1','g1'],
  ['g1','h1','a1'],
  // Middle square sides
  ['a2','b2','c2'],
  ['c2','d2','e2'],
  ['e2','f2','g2'],
  ['g2','h2','a2'],
  // Inner square sides
  ['a3','b3','c3'],
  ['c3','d3','e3'],
  ['e3','f3','g3'],
  ['g3','h3','a3'],
  // Cross-ring connecting lines
  ['b1','b2','b3'],
  ['d1','d2','d3'],
  ['f1','f2','f3'],
  ['h1','h2','h3']
];

// SVG pixel positions for each node (matches the reference board layout)
// Board fits in a 700x700 viewBox with squares at 50, 150, 250 from edge
export const NODE_POSITIONS = {
  a1: { x: 50,  y: 50 },
  b1: { x: 350, y: 50 },
  c1: { x: 650, y: 50 },
  d1: { x: 650, y: 350 },
  e1: { x: 650, y: 650 },
  f1: { x: 350, y: 650 },
  g1: { x: 50,  y: 650 },
  h1: { x: 50,  y: 350 },

  a2: { x: 150, y: 150 },
  b2: { x: 350, y: 150 },
  c2: { x: 550, y: 150 },
  d2: { x: 550, y: 350 },
  e2: { x: 550, y: 550 },
  f2: { x: 350, y: 550 },
  g2: { x: 150, y: 550 },
  h2: { x: 150, y: 350 },

  a3: { x: 250, y: 250 },
  b3: { x: 350, y: 250 },
  c3: { x: 450, y: 250 },
  d3: { x: 450, y: 350 },
  e3: { x: 450, y: 450 },
  f3: { x: 350, y: 450 },
  g3: { x: 250, y: 450 },
  h3: { x: 250, y: 350 }
};

// Check if a node is adjacent to another
export function isAdjacent(from, to) {
  return ADJACENCY[from]?.includes(to) || false;
}

// Get all mills that contain a specific node
export function getMillsForNode(node) {
  return MILLS.filter(mill => mill.includes(node));
}

// Check if placing/moving to a node completes a mill for a player
export function checkMill(board, node, player) {
  const mills = getMillsForNode(node);
  for (const mill of mills) {
    if (mill.every(n => board[n] === player)) {
      return true;
    }
  }
  return false;
}

// Get all mills currently held by a player
export function getPlayerMills(board, player) {
  return MILLS.filter(mill => mill.every(n => board[n] === player));
}

// Check if a specific node is part of any mill for its owner
export function isInMill(board, node) {
  const player = board[node];
  if (!player) return false;
  return getMillsForNode(node).some(mill => mill.every(n => board[n] === player));
}
