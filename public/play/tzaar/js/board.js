// TZAAR -- SVG board renderer
// 60-space hex board (4 rings, center hole)

import { ALL_NODES, NODE_POSITIONS, idToCube } from './shared/board-data.js';

const NS = 'http://www.w3.org/2000/svg';
const PIECE_RADIUS = 18;
const NODE_RADIUS = 22;

// Hardcoded piece colors
const PIECE_COLORS = {
  p1: { fill: '#fefefe', stroke: '#555555', textFill: '#333' },
  p2: { fill: '#1a1a1a', stroke: '#666666', textFill: '#ccc' }
};

const TYPE_LABEL = { tzaar: 'T', tzarra: 'Z', tott: 't' };

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

  // Draw lines connecting adjacent nodes
  const lineLayer = el('g', { class: 'line-layer' });
  _svg.appendChild(lineLayer);
  const drawnLines = new Set();
  const DIRECTIONS = [
    [1, -1, 0], [-1, 1, 0],
    [1, 0, -1], [-1, 0, 1],
    [0, 1, -1], [0, -1, 1]
  ];
  for (const nodeId of ALL_NODES) {
    const cube = idToCube(nodeId);
    const posA = NODE_POSITIONS[nodeId];
    for (const [dx, dy, dz] of DIRECTIONS) {
      const nx = cube.x + dx, ny = cube.y + dy, nz = cube.z + dz;
      // Skip center hole
      if (nx === 0 && ny === 0 && nz === 0) continue;
      const neighborKey = `${nx},${ny},${nz}`;
      // Find neighbor node ID
      const neighborId = ALL_NODES.find(id => {
        const c = idToCube(id);
        return c.x === nx && c.y === ny && c.z === nz;
      });
      if (!neighborId) continue;
      const lineKey = [nodeId, neighborId].sort().join('-');
      if (drawnLines.has(lineKey)) continue;
      drawnLines.add(lineKey);
      const posB = NODE_POSITIONS[neighborId];
      lineLayer.appendChild(el('line', {
        x1: posA.x, y1: posA.y, x2: posB.x, y2: posB.y,
        stroke: '#5a4a6a', 'stroke-width': 1.5, opacity: 0.5
      }));
    }
  }

  // Center hole marker (dashed circle)
  _svg.appendChild(el('circle', {
    cx: 350, cy: 350, r: 20,
    fill: 'none', stroke: '#5a4a6a',
    'stroke-width': 2, 'stroke-dasharray': '4,4',
    opacity: 0.6
  }));

  // Node layer (clickable circles)
  const nodeLayer = el('g', { class: 'node-layer' });
  _svg.appendChild(nodeLayer);
  for (const node of ALL_NODES) {
    const pos = NODE_POSITIONS[node];
    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: NODE_RADIUS,
      fill: 'transparent',
      class: 'board-node',
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
}

export function updateBoard(boardState, theme) {
  _pieceLayer.innerHTML = '';

  for (const node of ALL_NODES) {
    const nodeEl = _nodeElements[node];
    nodeEl.classList.remove('occupied', 'selectable', 'selected');
    if (boardState[node]) {
      nodeEl.classList.add('occupied');
    }
  }

  for (const node of ALL_NODES) {
    const piece = boardState[node];
    if (!piece) continue;

    const pos = NODE_POSITIONS[node];
    const colors = PIECE_COLORS[piece.owner];
    const group = el('g', { class: 'piece', 'data-node': node });

    // Main piece circle
    const circle = el('circle', {
      cx: pos.x, cy: pos.y, r: PIECE_RADIUS,
      'stroke-width': 2.5
    });
    circle.style.fill = colors.fill;
    circle.style.stroke = colors.stroke;
    group.appendChild(circle);

    // Type label
    const label = TYPE_LABEL[piece.type] || '?';
    const txt = el('text', {
      x: pos.x, y: pos.y + 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': '13px',
      'font-weight': 'bold',
      'font-family': 'ui-monospace, "SF Mono", Consolas, monospace'
    });
    txt.style.fill = colors.textFill;
    txt.setAttribute('pointer-events', 'none');
    txt.textContent = label;
    group.appendChild(txt);

    // Stack height badge (if > 1)
    if (piece.height > 1) {
      const badgeX = pos.x + PIECE_RADIUS * 0.7;
      const badgeY = pos.y - PIECE_RADIUS * 0.7;
      group.appendChild(el('circle', {
        cx: badgeX, cy: badgeY, r: 8,
        fill: '#6a0dad', stroke: '#b388ff', 'stroke-width': 1
      }));
      const badgeTxt = el('text', {
        x: badgeX, y: badgeY + 1,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': '10px',
        'font-weight': 'bold',
        fill: '#fff'
      });
      badgeTxt.setAttribute('pointer-events', 'none');
      badgeTxt.textContent = String(piece.height);
      group.appendChild(badgeTxt);
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
