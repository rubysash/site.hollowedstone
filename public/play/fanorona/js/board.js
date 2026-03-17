// Fanorona — SVG board renderer
// 5x9 grid with orthogonal + diagonal connections

import { ALL_NODES, ADJACENCY, parseNode, nodeId, hasDiagonals } from './shared/board-data.js';
import { COLS, ROWS } from './shared/constants.js';

const NS = 'http://www.w3.org/2000/svg';
const NODE_RADIUS = 16;
const PIECE_RADIUS = 20;

// Hardcoded piece colors — immune to browser theme overrides
const PIECE_COLORS = {
  p1: { fill: '#111111', stroke: '#aaaaaa' },  // Black
  p2: { fill: '#f0e6d3', stroke: '#a08060' }   // Cream
};

let _svg = null;
let _onNodeClick = null;
let _nodeElements = {};
let _pieceLayer = null;
let _ringLayer = null;
let _markerLayer = null;
let _flipped = false;
let _positions = {};

// Compute SVG positions based on player perspective
function computePositions(flipped) {
  const pos = {};
  for (const node of ALL_NODES) {
    const { col, row } = parseNode(node);
    pos[node] = {
      x: 50 + col * 100,
      y: flipped ? (50 + (row - 1) * 100) : (50 + (ROWS - row) * 100)
    };
  }
  return pos;
}

export function initBoard(svgElement, onNodeClick, myPlayer) {
  _svg = svgElement;
  _onNodeClick = onNodeClick;
  _flipped = myPlayer === 'p2';
  _positions = computePositions(_flipped);
  _svg.setAttribute('viewBox', '0 0 900 500');
  _svg.innerHTML = '';
  _nodeElements = {};

  // Background
  const bg = el('rect', { width: 900, height: 500, fill: '#1a1520' });
  _svg.appendChild(bg);

  // Board lines layer
  const lineLayer = el('g', { class: 'line-layer' });
  _svg.appendChild(lineLayer);
  drawBoardLines(lineLayer);

  // Node layer (clickable)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = _positions[node];
    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS,
      class: 'board-node empty',
      'data-node': node
    });
    circle.addEventListener('click', () => {
      if (_onNodeClick) _onNodeClick(node);
    });
    nodeLayer.appendChild(circle);
    _nodeElements[node] = circle;
  }

  // Piece layer
  _pieceLayer = el('g', { class: 'piece-layer' });
  _svg.appendChild(_pieceLayer);

  // Ring layer (selectable/selected indicators — above pieces)
  _ringLayer = el('g', { class: 'ring-layer' });
  _svg.appendChild(_ringLayer);

  // Marker layer (valid targets — on top)
  _markerLayer = el('g', { class: 'marker-layer' });
  _svg.appendChild(_markerLayer);
  for (const node of ALL_NODES) {
    const pos = _positions[node];
    const marker = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS + 5,
      class: 'valid-target-marker',
      'data-node': node
    });
    marker.style.display = 'none';
    marker.addEventListener('click', () => {
      if (_onNodeClick) _onNodeClick(node);
    });
    _markerLayer.appendChild(marker);
  }
}

function drawBoardLines(layer) {
  // Horizontal lines
  for (let r = 1; r <= ROWS; r++) {
    const y = _flipped ? (50 + (r - 1) * 100) : (50 + (ROWS - r) * 100);
    layer.appendChild(el('line', {
      x1: 50, y1: y, x2: 850, y2: y, class: 'board-line'
    }));
  }

  // Vertical lines
  for (let c = 0; c < COLS; c++) {
    const x = 50 + c * 100;
    layer.appendChild(el('line', {
      x1: x, y1: 50, x2: x, y2: 450, class: 'board-line'
    }));
  }

  // Diagonal lines — between adjacent nodes that both have diagonals
  const drawn = new Set();
  for (const node of ALL_NODES) {
    if (!hasDiagonals(node)) continue;
    const pos = _positions[node];
    for (const neighbor of ADJACENCY[node]) {
      if (!hasDiagonals(neighbor)) continue;
      const npos = _positions[neighbor];
      if (pos.x === npos.x || pos.y === npos.y) continue;
      const key = [node, neighbor].sort().join('-');
      if (drawn.has(key)) continue;
      drawn.add(key);
      layer.appendChild(el('line', {
        x1: pos.x, y1: pos.y, x2: npos.x, y2: npos.y,
        class: 'board-line-diag'
      }));
    }
  }
}

export function updateBoard(boardState, theme) {
  _pieceLayer.innerHTML = '';

  for (const node of ALL_NODES) {
    const nodeEl = _nodeElements[node];
    nodeEl.classList.remove('occupied', 'selectable', 'selected', 'last-move', 'removable');
    if (boardState[node]) {
      nodeEl.classList.add('occupied');
    } else {
      nodeEl.classList.add('empty');
    }
  }

  // Draw pieces — use hardcoded colors to prevent browser theme overrides
  for (const node of ALL_NODES) {
    const owner = boardState[node];
    if (!owner) continue;

    const pos = _positions[node];
    const colors = PIECE_COLORS[owner];
    const group = el('g', { class: 'piece', 'data-node': node });

    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS,
      'stroke-width': 2.5
    });
    circle.style.fill = colors.fill;
    circle.style.stroke = colors.stroke;
    group.appendChild(circle);

    const inner = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS * 0.6,
      'stroke-width': 1.5,
      opacity: 0.6
    });
    inner.style.fill = 'none';
    inner.style.stroke = colors.stroke;
    group.appendChild(inner);

    _pieceLayer.appendChild(group);
  }
}

// ─── Highlighting ───

export function highlightSelectable(nodes) {
  clearHighlights();
  for (const node of nodes) {
    if (_nodeElements[node]) _nodeElements[node].classList.add('selectable');
  }
  // Draw visible rings above pieces so the highlight isn't hidden
  for (const node of nodes) {
    const pos = _positions[node];
    const ring = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS + 5,
      class: 'selectable-ring'
    });
    _ringLayer.appendChild(ring);
  }
}

export function highlightSelected(node) {
  for (const n of ALL_NODES) _nodeElements[n].classList.remove('selected');
  if (node && _nodeElements[node]) _nodeElements[node].classList.add('selected');
  // Draw visible selected ring above the piece
  if (node && _positions[node]) {
    const pos = _positions[node];
    const ring = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS + 5,
      class: 'selected-ring'
    });
    _ringLayer.appendChild(ring);
  }
}

export function showValidTargets(nodes) {
  hideValidTargets();
  for (const marker of _markerLayer.children) {
    if (nodes.includes(marker.getAttribute('data-node'))) {
      marker.style.display = '';
    }
  }
}

export function hideValidTargets() {
  for (const marker of _markerLayer.children) {
    marker.style.display = 'none';
  }
}

export function highlightCaptured(nodes) {
  for (const node of nodes) {
    if (_nodeElements[node]) _nodeElements[node].classList.add('removable');
  }
}

export function clearHighlights() {
  for (const node of ALL_NODES) {
    _nodeElements[node].classList.remove('selectable', 'selected', 'removable');
  }
  _ringLayer.innerHTML = '';
  hideValidTargets();
}

// ─── SVG helper ───

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
