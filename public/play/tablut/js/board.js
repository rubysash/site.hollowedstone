// Tablut -- SVG board renderer
// 9x9 grid with throne and corner squares

import { ALL_NODES, NODE_POSITIONS, fileIndex, rankIndex } from './shared/board-data.js';
import { BOARD_SIZE, THRONE, CORNERS } from './shared/constants.js';

const NS = 'http://www.w3.org/2000/svg';
const CELL = 65;
const MARGIN = 55;
const PIECE_RADIUS = 22;
const NODE_RADIUS = 24;

const PIECE_COLORS = {
  p1:   { fill: '#1a1a1a', stroke: '#666666' },  // Attackers (dark)
  p2:   { fill: '#f0e6d3', stroke: '#a08060' },  // Defenders (light)
  king: { fill: '#d4aa00', stroke: '#8a6e00' }    // King (gold)
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

  // Grid squares
  const squareLayer = el('g', { class: 'square-layer' });
  _svg.appendChild(squareLayer);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let f = 0; f < BOARD_SIZE; f++) {
      const node = ALL_NODES[r * BOARD_SIZE + f];
      let color = '#1e1832';
      if (node === THRONE) color = '#2a2040';
      else if (CORNERS.includes(node)) color = '#1e2e1e';
      squareLayer.appendChild(el('rect', {
        x: MARGIN + f * CELL, y: MARGIN + r * CELL,
        width: CELL, height: CELL, fill: color
      }));
    }
  }

  // Grid lines
  const lineLayer = el('g', { class: 'line-layer' });
  _svg.appendChild(lineLayer);
  for (let i = 0; i <= BOARD_SIZE; i++) {
    lineLayer.appendChild(el('line', {
      x1: MARGIN + i * CELL, y1: MARGIN,
      x2: MARGIN + i * CELL, y2: MARGIN + BOARD_SIZE * CELL,
      stroke: '#3a2a4a', 'stroke-width': 1
    }));
    lineLayer.appendChild(el('line', {
      x1: MARGIN, y1: MARGIN + i * CELL,
      x2: MARGIN + BOARD_SIZE * CELL, y2: MARGIN + i * CELL,
      stroke: '#3a2a4a', 'stroke-width': 1
    }));
  }

  // Board border
  lineLayer.appendChild(el('rect', {
    x: MARGIN, y: MARGIN, width: CELL * BOARD_SIZE, height: CELL * BOARD_SIZE,
    fill: 'none', stroke: '#5a4a6a', 'stroke-width': 2
  }));

  // Special square markers
  // Throne
  const tp = NODE_POSITIONS[THRONE];
  squareLayer.appendChild(el('circle', {
    cx: tp.x, cy: tp.y, r: 8,
    fill: 'none', stroke: '#8a6e00', 'stroke-width': 2, opacity: 0.5
  }));
  // Corners
  for (const c of CORNERS) {
    const cp = NODE_POSITIONS[c];
    squareLayer.appendChild(el('rect', {
      x: cp.x - 12, y: cp.y - 12, width: 24, height: 24,
      fill: 'none', stroke: '#4a6a3d', 'stroke-width': 2, rx: 3, opacity: 0.5
    }));
  }

  // Node layer (clickable)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const rect = el('rect', {
      x: pos.x - CELL / 2, y: pos.y - CELL / 2,
      width: CELL, height: CELL,
      fill: 'transparent', class: 'board-node', 'data-node': node
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

  // Ring layer
  _ringLayer = el('g', { class: 'ring-layer' });
  _svg.appendChild(_ringLayer);

  // Marker layer
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
  const labelStyle = 'font-size:11px;fill:#5a4a6a;font-family:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;';
  for (let f = 0; f < BOARD_SIZE; f++) {
    const t = el('text', { x: MARGIN + f * CELL + CELL / 2, y: MARGIN + BOARD_SIZE * CELL + 18, 'text-anchor': 'middle' });
    t.setAttribute('style', labelStyle);
    t.textContent = 'abcdefghi'[f];
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
    nodeEl.classList.remove('occupied', 'selectable', 'selected');
    if (boardState[node]) nodeEl.classList.add('occupied');
  }

  for (const node of ALL_NODES) {
    const piece = boardState[node];
    if (!piece) continue;

    const pos = NODE_POSITIONS[node];
    const colors = PIECE_COLORS[piece];
    const group = el('g', { class: 'piece', 'data-node': node });

    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS, 'stroke-width': 2.5
    });
    circle.style.fill = colors.fill;
    circle.style.stroke = colors.stroke;
    group.appendChild(circle);

    if (piece === 'king') {
      // Crown mark
      const crown = el('text', {
        x: pos.x, y: pos.y + 5, 'text-anchor': 'middle',
        'font-size': '16', 'font-weight': 'bold'
      });
      crown.style.fill = '#4a3000';
      crown.style.pointerEvents = 'none';
      crown.textContent = 'K';
      group.appendChild(crown);
    } else {
      const inner = el('circle', {
        cx: pos.x, cy: pos.y, r: PIECE_RADIUS * 0.55,
        'stroke-width': 1.5, opacity: 0.5
      });
      inner.style.fill = 'none';
      inner.style.stroke = colors.stroke;
      group.appendChild(inner);
    }

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

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
