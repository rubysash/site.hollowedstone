// Amazons -- SVG board renderer
// 10x10 checkerboard grid

import { ALL_NODES, NODE_POSITIONS, fileIndex, rankIndex, CELL, MARGIN } from './shared/board-data.js';
import { BOARD_SIZE } from './shared/constants.js';

const NS = 'http://www.w3.org/2000/svg';
const PIECE_RADIUS = 22;
const NODE_RADIUS = 24;

// Hardcoded piece colors to resist browser theme overrides
const PIECE_COLORS = {
  p1: { fill: '#fefefe', stroke: '#555' },
  p2: { fill: '#1a1a1a', stroke: '#666' }
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
  _svg.setAttribute('viewBox', '0 0 700 700');
  _svg.innerHTML = '';
  _nodeElements = {};

  // Background
  _svg.appendChild(el('rect', { width: 700, height: 700, fill: '#1a1520' }));

  // Checkerboard squares
  const squareLayer = el('g', { class: 'square-layer' });
  _svg.appendChild(squareLayer);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let f = 0; f < BOARD_SIZE; f++) {
      const isDark = (f + r) % 2 === 0;
      squareLayer.appendChild(el('rect', {
        x: MARGIN + f * CELL, y: MARGIN + r * CELL,
        width: CELL, height: CELL,
        fill: isDark ? '#241c3a' : '#1e1832'
      }));
    }
  }

  // Board border
  squareLayer.appendChild(el('rect', {
    x: MARGIN, y: MARGIN, width: CELL * BOARD_SIZE, height: CELL * BOARD_SIZE,
    fill: 'none', stroke: '#5a4a6a', 'stroke-width': 2
  }));

  // Node layer (clickable squares)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const rect = el('rect', {
      x: pos.x - CELL / 2, y: pos.y - CELL / 2,
      width: CELL, height: CELL,
      fill: 'transparent',
      class: 'board-node',
      'data-node': node
    });
    rect.addEventListener('click', () => {
      if (_onNodeClick) _onNodeClick(node);
    });
    nodeLayer.appendChild(rect);
    _nodeElements[node] = rect;
  }

  // Piece layer
  _pieceLayer = el('g', { class: 'piece-layer' });
  _svg.appendChild(_pieceLayer);

  // Ring layer (selectable/selected indicators above pieces)
  _ringLayer = el('g', { class: 'ring-layer' });
  _svg.appendChild(_ringLayer);

  // Marker layer (valid targets on top)
  _markerLayer = el('g', { class: 'marker-layer' });
  _svg.appendChild(_markerLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const marker = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS,
      class: 'valid-target-marker',
      'data-node': node
    });
    marker.style.display = 'none';
    marker.addEventListener('click', () => {
      if (_onNodeClick) _onNodeClick(node);
    });
    _markerLayer.appendChild(marker);
  }

  // Labels
  const labelStyle = 'font-size:11px;fill:#5a4a6a;font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;';
  const files = 'abcdefghij';
  for (let f = 0; f < BOARD_SIZE; f++) {
    const t = el('text', { x: MARGIN + f * CELL + CELL / 2, y: MARGIN + BOARD_SIZE * CELL + 18, 'text-anchor': 'middle' });
    t.setAttribute('style', labelStyle);
    t.textContent = files[f];
    _svg.appendChild(t);
  }
  for (let r = 0; r < BOARD_SIZE; r++) {
    const t = el('text', { x: MARGIN - 12, y: MARGIN + r * CELL + CELL / 2 + 4, 'text-anchor': 'end' });
    t.setAttribute('style', labelStyle);
    t.textContent = String(BOARD_SIZE - r);
    _svg.appendChild(t);
  }
}

export function updateBoard(boardState, theme) {
  _pieceLayer.innerHTML = '';

  for (const node of ALL_NODES) {
    const nodeEl = _nodeElements[node];
    nodeEl.classList.remove('occupied', 'selectable', 'selected', 'last-move');
    if (boardState[node]) {
      nodeEl.classList.add('occupied');
    }
  }

  for (const node of ALL_NODES) {
    const val = boardState[node];
    if (!val) continue;

    const pos = NODE_POSITIONS[node];

    if (val === 'arrow') {
      // Draw arrow as a filled square with X
      const arrowGroup = el('g', { class: 'piece', 'data-node': node });
      const sz = CELL * 0.45;
      const rect = el('rect', {
        x: pos.x - sz / 2, y: pos.y - sz / 2,
        width: sz, height: sz,
        rx: 3, ry: 3
      });
      rect.style.fill = '#c0392b';
      rect.style.stroke = '#e74c3c';
      rect.style.strokeWidth = '1.5';
      rect.style.opacity = '0.85';
      arrowGroup.appendChild(rect);

      // X mark
      const off = sz * 0.3;
      const line1 = el('line', {
        x1: pos.x - off, y1: pos.y - off,
        x2: pos.x + off, y2: pos.y + off,
        'stroke-width': 2
      });
      line1.style.stroke = '#fff';
      line1.style.opacity = '0.6';
      arrowGroup.appendChild(line1);

      const line2 = el('line', {
        x1: pos.x + off, y1: pos.y - off,
        x2: pos.x - off, y2: pos.y + off,
        'stroke-width': 2
      });
      line2.style.stroke = '#fff';
      line2.style.opacity = '0.6';
      arrowGroup.appendChild(line2);

      _pieceLayer.appendChild(arrowGroup);
      continue;
    }

    // Amazon piece (p1 or p2)
    const colors = PIECE_COLORS[val];
    const group = el('g', { class: 'piece', 'data-node': node });

    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS,
      'stroke-width': 2.5
    });
    circle.style.fill = colors.fill;
    circle.style.stroke = colors.stroke;
    group.appendChild(circle);

    // "A" label
    const label = el('text', {
      x: pos.x, y: pos.y + 5,
      'text-anchor': 'middle',
      'font-size': '16',
      'font-weight': 'bold'
    });
    label.style.fill = val === 'p1' ? '#333' : '#ccc';
    label.style.pointerEvents = 'none';
    label.textContent = 'A';
    group.appendChild(label);

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
  if (node && NODE_POSITIONS[node]) {
    const pos = NODE_POSITIONS[node];
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

export function clearHighlights() {
  for (const node of ALL_NODES) {
    _nodeElements[node].classList.remove('selectable', 'selected');
  }
  _ringLayer.innerHTML = '';
  hideValidTargets();
}

// --- SVG helper ---

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
