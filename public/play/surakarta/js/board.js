// Surakarta -- SVG board renderer
// 6x6 grid with corner loop arcs

import { ALL_NODES, NODE_POSITIONS, fileIndex, rankIndex } from './shared/board-data.js';
import { BOARD_SIZE } from './shared/constants.js';

const NS = 'http://www.w3.org/2000/svg';
const CELL = 100;
const MARGIN = 100;
const PIECE_RADIUS = 22;
const NODE_RADIUS = 24;

const PIECE_COLORS = {
  p1: { fill: '#1a1a1a', stroke: '#666666' },
  p2: { fill: '#f0e6d3', stroke: '#a08060' }
};

let _svg = null;
let _onNodeClick = null;
let _nodeElements = {};
let _pieceLayer = null;
let _ringLayer = null;
let _markerLayer = null;

export function initBoard(svgElement, onNodeClick) {
  _svg = svgElement;
  _onNodeClick = onNodeClick;
  _svg.setAttribute('viewBox', '0 0 800 800');
  _svg.innerHTML = '';
  _nodeElements = {};

  // Background
  _svg.appendChild(el('rect', { width: 800, height: 800, fill: '#1a1520' }));

  // Loop arcs (drawn behind grid lines)
  const loopLayer = el('g', { class: 'loop-layer' });
  _svg.appendChild(loopLayer);

  // Outer loops (radius 200, red)
  loopLayer.appendChild(arc('M 350,100 A 200,200 0 1,0 100,350', '#c0392b'));  // top-left
  loopLayer.appendChild(arc('M 450,100 A 200,200 0 1,1 700,350', '#c0392b'));  // top-right
  loopLayer.appendChild(arc('M 100,450 A 200,200 0 1,0 350,700', '#c0392b'));  // bottom-left
  loopLayer.appendChild(arc('M 700,450 A 200,200 0 1,1 450,700', '#c0392b'));  // bottom-right

  // Inner loops (radius 100, blue)
  loopLayer.appendChild(arc('M 250,100 A 100,100 0 1,0 100,250', '#2471a3'));  // top-left
  loopLayer.appendChild(arc('M 550,100 A 100,100 0 1,1 700,250', '#2471a3'));  // top-right
  loopLayer.appendChild(arc('M 100,550 A 100,100 0 1,0 250,700', '#2471a3'));  // bottom-left
  loopLayer.appendChild(arc('M 700,550 A 100,100 0 1,1 550,700', '#2471a3'));  // bottom-right

  // Grid lines
  const lineLayer = el('g', { class: 'line-layer' });
  _svg.appendChild(lineLayer);
  for (let i = 0; i < BOARD_SIZE; i++) {
    // Horizontal
    lineLayer.appendChild(el('line', {
      x1: MARGIN, y1: MARGIN + i * CELL,
      x2: MARGIN + (BOARD_SIZE - 1) * CELL, y2: MARGIN + i * CELL,
      stroke: '#5a4a6a', 'stroke-width': 2
    }));
    // Vertical
    lineLayer.appendChild(el('line', {
      x1: MARGIN + i * CELL, y1: MARGIN,
      x2: MARGIN + i * CELL, y2: MARGIN + (BOARD_SIZE - 1) * CELL,
      stroke: '#5a4a6a', 'stroke-width': 2
    }));
  }

  // Node layer (clickable intersections)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS,
      fill: 'transparent', class: 'board-node', 'data-node': node
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

  // Ring layer
  _ringLayer = el('g', { class: 'ring-layer' });
  _svg.appendChild(_ringLayer);

  // Marker layer (valid targets)
  _markerLayer = el('g', { class: 'marker-layer' });
  _svg.appendChild(_markerLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const marker = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS,
      class: 'valid-target-marker', 'data-node': node
    });
    marker.style.display = 'none';
    marker.addEventListener('click', () => {
      if (_onNodeClick) _onNodeClick(node);
    });
    _markerLayer.appendChild(marker);
  }

  // Labels
  const labelStyle = 'font-size:13px;fill:#5a4a6a;font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;';
  for (let f = 0; f < BOARD_SIZE; f++) {
    const t = el('text', { x: MARGIN + f * CELL, y: MARGIN - 20, 'text-anchor': 'middle' });
    t.setAttribute('style', labelStyle);
    t.textContent = 'abcdef'[f];
    _svg.appendChild(t);
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    const t = el('text', { x: MARGIN - 20, y: MARGIN + r * CELL + 5, 'text-anchor': 'end' });
    t.setAttribute('style', labelStyle);
    t.textContent = String(r + 1);
    _svg.appendChild(t);
  }
}

export function updateBoard(boardState, theme) {
  _pieceLayer.innerHTML = '';

  for (const node of ALL_NODES) {
    const nodeEl = _nodeElements[node];
    nodeEl.classList.remove('occupied', 'selectable', 'selected');
    if (boardState[node]) nodeEl.classList.add('occupied');
  }

  for (const node of ALL_NODES) {
    const owner = boardState[node];
    if (!owner) continue;

    const pos = NODE_POSITIONS[node];
    const colors = PIECE_COLORS[owner];
    const group = el('g', { class: 'piece', 'data-node': node });

    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS, 'stroke-width': 2.5
    });
    circle.style.fill = colors.fill;
    circle.style.stroke = colors.stroke;
    group.appendChild(circle);

    const inner = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS * 0.55,
      'stroke-width': 1.5, opacity: 0.5
    });
    inner.style.fill = 'none';
    inner.style.stroke = colors.stroke;
    group.appendChild(inner);

    _pieceLayer.appendChild(group);
  }
}

// --- Highlighting ---

export function highlightSelectable(nodes) {
  clearHighlights();
  for (const node of nodes) {
    if (_nodeElements[node]) _nodeElements[node].classList.add('selectable');
  }
  for (const node of nodes) {
    const pos = NODE_POSITIONS[node];
    _ringLayer.appendChild(el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS + 5, class: 'selectable-ring'
    }));
  }
}

export function highlightSelected(node) {
  for (const n of ALL_NODES) _nodeElements[n].classList.remove('selected');
  if (node && _nodeElements[node]) _nodeElements[node].classList.add('selected');
  if (node && NODE_POSITIONS[node]) {
    const pos = NODE_POSITIONS[node];
    _ringLayer.appendChild(el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS + 5, class: 'selected-ring'
    }));
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
  for (const marker of _markerLayer.children) marker.style.display = 'none';
}

export function clearHighlights() {
  for (const node of ALL_NODES) {
    _nodeElements[node].classList.remove('selectable', 'selected');
  }
  _ringLayer.innerHTML = '';
  hideValidTargets();
}

// --- Helpers ---

function arc(d, color) {
  return el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, opacity: 0.6 });
}

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
