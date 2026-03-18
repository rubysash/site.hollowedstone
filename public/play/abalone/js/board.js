// Abalone -- SVG board renderer
// 61-hex hexagonal board

import { ALL_NODES, NODE_POSITIONS, DIRECTIONS, getNeighbor } from './shared/board-data.js';

const NS = 'http://www.w3.org/2000/svg';
const HEX_RADIUS = 24;
const PIECE_RADIUS = 20;

const PIECE_COLORS = {
  p1: { fill: '#1a1a1a', stroke: '#666666' },
  p2: { fill: '#f0e6d3', stroke: '#a08060' }
};

let _svg = null;
let _onNodeClick = null;
let _nodeElements = {};
let _pieceLayer = null;
let _ringLayer = null;
let _arrowLayer = null;

export function initBoard(svgElement, onNodeClick) {
  _svg = svgElement;
  _onNodeClick = onNodeClick;
  _svg.setAttribute('viewBox', '0 0 700 700');
  _svg.innerHTML = '';
  _nodeElements = {};

  // Background
  _svg.appendChild(el('rect', { width: 700, height: 700, fill: '#1a1520' }));

  // Board outline (flat-top hex: flat edges top/bottom, vertices left/right)
  _svg.appendChild(el('polygon', {
    points: '190,95 510,95 640,350 510,605 190,605 60,350',
    fill: '#1e1832', stroke: '#5a4a6a', 'stroke-width': 2
  }));

  // Node layer (clickable hex spots)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: HEX_RADIUS,
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

  // Ring layer (selectable/selected indicators)
  _ringLayer = el('g', { class: 'ring-layer' });
  _svg.appendChild(_ringLayer);

  // Arrow layer (direction indicators)
  _arrowLayer = el('g', { class: 'arrow-layer' });
  _svg.appendChild(_arrowLayer);
}

export function updateBoard(boardState, theme) {
  _pieceLayer.innerHTML = '';

  for (const node of ALL_NODES) {
    const nodeEl = _nodeElements[node];
    nodeEl.classList.remove('occupied', 'selectable', 'selected');
    if (boardState[node]) {
      nodeEl.classList.add('occupied');
    } else {
      nodeEl.classList.add('empty');
    }
  }

  for (const node of ALL_NODES) {
    const owner = boardState[node];
    if (!owner) continue;

    const pos = NODE_POSITIONS[node];
    const colors = PIECE_COLORS[owner];
    const group = el('g', { class: 'piece', 'data-node': node });

    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS,
      'stroke-width': 2
    });
    circle.style.fill = colors.fill;
    circle.style.stroke = colors.stroke;
    group.appendChild(circle);

    // Inner highlight
    const inner = el('circle', {
      cx: pos.x - 4, cy: pos.y - 4, r: PIECE_RADIUS * 0.35,
      'stroke-width': 0, opacity: 0.15
    });
    inner.style.fill = '#ffffff';
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
}

export function highlightSelected(nodes) {
  _ringLayer.innerHTML = '';
  for (const node of nodes) {
    if (!_nodeElements[node]) continue;
    _nodeElements[node].classList.add('selected');
    const pos = NODE_POSITIONS[node];
    _ringLayer.appendChild(el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS + 5,
      class: 'selected-ring'
    }));
  }
}

export function highlightExtendable(nodes) {
  for (const node of nodes) {
    if (!_nodeElements[node]) continue;
    const pos = NODE_POSITIONS[node];
    _ringLayer.appendChild(el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS + 5,
      class: 'extend-ring'
    }));
  }
}

export function showDirectionArrows(centerNodes, validDirs, onDirClick) {
  _arrowLayer.innerHTML = '';
  // Compute center of the group
  let cx = 0, cy = 0;
  for (const n of centerNodes) {
    cx += NODE_POSITIONS[n].x;
    cy += NODE_POSITIONS[n].y;
  }
  cx /= centerNodes.length;
  cy /= centerNodes.length;

  const arrowDist = 42;
  for (const dir of validDirs) {
    const d = DIRECTIONS[dir];
    // Convert cube direction to pixel offset (approximate)
    const ax = d.dx * 0.75 + d.dy * -0.75;
    const ay = d.dz * -0.866;
    const len = Math.sqrt(ax * ax + ay * ay);
    const nx = ax / len * arrowDist;
    const ny = ay / len * arrowDist;

    const arrow = el('circle', {
      cx: cx + nx, cy: cy + ny, r: 12,
      class: 'direction-arrow'
    });
    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onDirClick) onDirClick(dir);
    });
    _arrowLayer.appendChild(arrow);

    // Small direction label
    const label = el('text', {
      x: cx + nx, y: cy + ny + 3,
      'text-anchor': 'middle',
      class: 'dir-label'
    });
    label.textContent = DIRECTIONS[dir].name;
    label.style.pointerEvents = 'none';
    _arrowLayer.appendChild(label);
  }
}

export function clearHighlights() {
  for (const node of ALL_NODES) {
    _nodeElements[node].classList.remove('selectable', 'selected');
  }
  _ringLayer.innerHTML = '';
  _arrowLayer.innerHTML = '';
}

// --- SVG helper ---

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
