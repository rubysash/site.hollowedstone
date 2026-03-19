// Nine Men's Morris — SVG board renderer
// Draws the 3-square board with 24 nodes, lines, and pieces

import { ALL_NODES, ADJACENCY, NODE_POSITIONS, MILLS } from './shared/board-data.js';

const NS = 'http://www.w3.org/2000/svg';
const NODE_RADIUS = 18;
const PIECE_RADIUS = 22;
const LINE_WIDTH = 3;

let _svg = null;
let _onNodeClick = null;
let _nodeElements = {};
let _pieceLayer = null;
let _markerLayer = null;

export function initBoard(svgElement, onNodeClick) {
  _svg = svgElement;
  _onNodeClick = onNodeClick;
  _svg.setAttribute('viewBox', '0 0 700 700');
  _svg.innerHTML = '';
  _nodeElements = {};

  // Background
  const bg = el('rect', { width: 700, height: 700, fill: '#1a1520' });
  _svg.appendChild(bg);

  // Board lines layer
  const lineLayer = el('g', { class: 'line-layer' });
  _svg.appendChild(lineLayer);
  drawBoardLines(lineLayer);

  // Node layer (intersection points — clickable)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
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

  // Marker layer (valid targets — on top so they're always clickable)
  _markerLayer = el('g', { class: 'marker-layer' });
  _svg.appendChild(_markerLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const marker = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS + 6,
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
  const squares = [
    ['a1','b1','c1','d1','e1','f1','g1','h1'],
    ['a2','b2','c2','d2','e2','f2','g2','h2'],
    ['a3','b3','c3','d3','e3','f3','g3','h3']
  ];

  // Draw each square
  for (const sq of squares) {
    const points = sq.map(n => NODE_POSITIONS[n]);
    // Close the square: a→b→c→d→e→f→g→h→a
    for (let i = 0; i < 8; i++) {
      const from = points[i];
      const to = points[(i + 1) % 8];
      layer.appendChild(el('line', {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        class: 'board-line'
      }));
    }
  }

  // Draw connecting lines (midpoints between rings)
  const connections = [['b1','b2'],['b2','b3'],['d1','d2'],['d2','d3'],['f1','f2'],['f2','f3'],['h1','h2'],['h2','h3']];
  for (const [a, b] of connections) {
    const pa = NODE_POSITIONS[a], pb = NODE_POSITIONS[b];
    layer.appendChild(el('line', {
      x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y,
      class: 'board-line'
    }));
  }
}

export function updateBoard(boardState, theme, lastMove) {
  // Clear existing pieces
  _pieceLayer.innerHTML = '';

  // Reset node states
  for (const node of ALL_NODES) {
    const el = _nodeElements[node];
    el.classList.remove('occupied', 'selectable', 'selected', 'last-move', 'removable');
    if (boardState[node]) {
      el.classList.add('occupied');
    } else {
      el.classList.add('empty');
    }
  }

  // Mark last move
  if (lastMove) {
    if (lastMove.from && _nodeElements[lastMove.from]) _nodeElements[lastMove.from].classList.add('last-move');
    if (lastMove.to && _nodeElements[lastMove.to]) _nodeElements[lastMove.to].classList.add('last-move');
    if (lastMove.node && _nodeElements[lastMove.node]) _nodeElements[lastMove.node].classList.add('last-move');
  }

  // Draw pieces
  for (const node of ALL_NODES) {
    const owner = boardState[node];
    if (!owner) continue;

    const pos = NODE_POSITIONS[node];
    const pInfo = theme.players[owner];
    const group = el('g', { class: 'piece', 'data-node': node });

    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS,
      'stroke-width': 2.5
    });
    circle.style.fill = pInfo.pieceColor;
    circle.style.stroke = pInfo.strokeColor;
    group.appendChild(circle);

    // Inner ring for visual distinction
    const inner = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS * 0.6,
      'stroke-width': 1.5,
      opacity: 0.6
    });
    inner.style.fill = 'none';
    inner.style.stroke = pInfo.strokeColor;
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
}

export function highlightSelected(node) {
  for (const n of ALL_NODES) _nodeElements[n].classList.remove('selected');
  if (node && _nodeElements[node]) _nodeElements[node].classList.add('selected');
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

export function highlightRemovable(nodes) {
  clearHighlights();
  for (const node of nodes) {
    if (_nodeElements[node]) _nodeElements[node].classList.add('removable');
  }
}

export function clearHighlights() {
  for (const node of ALL_NODES) {
    const el = _nodeElements[node];
    el.classList.remove('selectable', 'selected', 'removable');
  }
  hideValidTargets();
}

// ─── SVG helper ───

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
