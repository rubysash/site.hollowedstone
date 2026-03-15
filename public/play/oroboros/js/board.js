// SVG board renderer

import {
  generateHexes, hexKey, parseHexKey, getRing, hexToPixel, hexPathD,
  isCenter, isOnEdge, HEX_SIZE
} from './shared/board-data.js';
import { getRoleInfo, getCenterInfo } from './themes.js';

let _svg = null;
let _hexElements = {};    // hexKey -> <path> element
let _stoneElements = {};  // hexKey -> <g> element
let _markerElements = {}; // hexKey -> <path> element (valid target markers)
let _onHexClick = null;

export function initBoard(svgElement, onHexClick) {
  _svg = svgElement;
  _onHexClick = onHexClick;
  renderGrid();
}

function renderGrid() {
  _svg.innerHTML = '';

  // Compute viewBox from hex extents
  const hexes = generateHexes();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const h of hexes) {
    const p = hexToPixel(h.q, h.r);
    minX = Math.min(minX, p.x - HEX_SIZE);
    minY = Math.min(minY, p.y - HEX_SIZE);
    maxX = Math.max(maxX, p.x + HEX_SIZE);
    maxY = Math.max(maxY, p.y + HEX_SIZE);
  }
  const pad = 10;
  _svg.setAttribute('viewBox',
    `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);

  // Create hex group and stone group (stones render on top)
  const hexGroup = svgEl('g', { class: 'hex-layer' });
  const markerGroup = svgEl('g', { class: 'marker-layer' });
  const stoneGroup = svgEl('g', { class: 'stone-layer' });
  _svg.appendChild(hexGroup);
  _svg.appendChild(markerGroup);
  _svg.appendChild(stoneGroup);

  for (const h of hexes) {
    const key = hexKey(h.q, h.r);
    const p = hexToPixel(h.q, h.r);
    const ring = getRing(h.q, h.r);
    const d = hexPathD(p.x, p.y);

    // Hex cell
    const path = svgEl('path', {
      d,
      class: `hex-cell ring-${ring} empty`,
      'data-hex': key
    });

    // Edge indicators
    if (isOnEdge(h.q, h.r, 'p1')) path.classList.add('edge-p1');
    if (isOnEdge(h.q, h.r, 'p2')) path.classList.add('edge-p2');

    path.addEventListener('click', () => {
      if (_onHexClick) _onHexClick(key, h.q, h.r);
    });

    hexGroup.appendChild(path);
    _hexElements[key] = path;

    // Valid target marker (hidden by default)
    const marker = svgEl('path', {
      d,
      class: 'hex-cell valid-target-marker',
      'data-hex': key,
      style: 'display:none'
    });
    marker.addEventListener('click', () => {
      if (_onHexClick) _onHexClick(key, h.q, h.r);
    });
    markerGroup.appendChild(marker);
    _markerElements[key] = marker;
  }

  // Center hex label
  const center = getCenterInfo();
  const cp = hexToPixel(0, 0);
  const label = svgEl('text', {
    x: cp.x, y: cp.y + 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    style: 'font-size:10px;fill:white;font-weight:bold;letter-spacing:0.06em;pointer-events:none;'
  });
  label.textContent = center.name.toUpperCase();
  _svg.querySelector('.stone-layer').appendChild(label);
}

export function updateBoard(boardState, lastMoves) {
  const stoneLayer = _svg.querySelector('.stone-layer');

  // Remove old stone elements
  for (const key of Object.keys(_stoneElements)) {
    _stoneElements[key].remove();
  }
  _stoneElements = {};

  // Reset hex classes
  for (const [key, el] of Object.entries(_hexElements)) {
    el.classList.remove('selected', 'selectable', 'last-move');
    if (!boardState[key]) {
      el.classList.add('empty');
    } else {
      el.classList.remove('empty');
    }
  }

  // Mark last moves
  if (lastMoves) {
    for (const m of lastMoves) {
      if (m.to && _hexElements[m.to]) _hexElements[m.to].classList.add('last-move');
    }
  }

  // Draw stones
  for (const [key, stone] of Object.entries(boardState)) {
    const { q, r } = parseHexKey(key);
    const p = hexToPixel(q, r);
    const roleInfo = getRoleInfo(stone.role);
    if (!roleInfo) continue;

    const g = svgEl('g', { class: 'stone', 'data-hex': key });

    const circle = svgEl('circle', {
      cx: p.x, cy: p.y, r: HEX_SIZE * 0.45,
      fill: roleInfo.color,
      stroke: roleInfo.strokeColor
    });
    g.appendChild(circle);

    const text = svgEl('text', {
      x: p.x, y: p.y + 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central'
    });
    text.textContent = roleInfo.symbol;
    g.appendChild(text);

    stoneLayer.appendChild(g);
    _stoneElements[key] = g;
  }
}

export function highlightSelectable(hexKeys) {
  for (const [key, el] of Object.entries(_hexElements)) {
    el.classList.toggle('selectable', hexKeys.includes(key));
  }
}

export function highlightSelected(hexKeyStr) {
  for (const [key, el] of Object.entries(_hexElements)) {
    el.classList.toggle('selected', key === hexKeyStr);
  }
}

export function showValidTargets(hexKeys) {
  for (const [key, marker] of Object.entries(_markerElements)) {
    marker.style.display = hexKeys.includes(key) ? '' : 'none';
  }
}

export function clearHighlights() {
  for (const el of Object.values(_hexElements)) {
    el.classList.remove('selectable', 'selected');
  }
  for (const marker of Object.values(_markerElements)) {
    marker.style.display = 'none';
  }
}

// SVG element helper
function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}
