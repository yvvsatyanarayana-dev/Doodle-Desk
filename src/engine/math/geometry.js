// Core geometry math utilities

export const EPSILON = 0.0001;

export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function normalizeAngle(angle) {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

// Get bounding box of a set of points
export function getBoundsFromPoints(points) {
  if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of points) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Get bounding box of an element
export function getElementBounds(el) {
  if (!el) return { x: 0, y: 0, width: 0, height: 0 };
  const { x, y, width, height, angle = 0 } = el;

  if (el.type === 'freedraw' && Array.isArray(el.points) && el.points.length > 0) {
    const pointBounds = getBoundsFromPoints(el.points);
    const bounds = {
      x: x + pointBounds.x,
      y: y + pointBounds.y,
      width: pointBounds.width,
      height: pointBounds.height,
    };
    if (!angle || Math.abs(angle) < EPSILON) return bounds;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const halfW = bounds.width / 2;
    const halfH = bounds.height / 2;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const corners = [[-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH]]
      .map(([localX, localY]) => [
        centerX + localX * cosAngle - localY * sinAngle,
        centerY + localX * sinAngle + localY * cosAngle,
      ]);
    const xs = corners.map(([cornerX]) => cornerX);
    const ys = corners.map(([, cornerY]) => cornerY);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }

  if (!angle || Math.abs(angle) < EPSILON) {
    return { x, y, width, height };
  }

  // For rotated elements, compute the axis-aligned bounding box
  const cx = x + width / 2;
  const cy = y + height / 2;
  const hw = width / 2;
  const hh = height / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]
  ].map(([lx, ly]) => [
    cx + lx * cos - ly * sin,
    cy + lx * sin + ly * cos
  ]);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of corners) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Get tight bounding box for a list of elements
export function getCommonBounds(elements) {
  if (!elements || elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Hit testing a point in a rectangle
export function isPointInRect(px, py, rx, ry, rw, rh, tolerance = 0) {
  return px >= rx - tolerance && px <= rx + rw + tolerance &&
         py >= ry - tolerance && py <= ry + rh + tolerance;
}

// Hit testing a point near a line segment
export function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < EPSILON) return distance(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = clamp(t, 0, 1);
  return distance(px, py, ax + t * dx, ay + t * dy);
}

// Rotate a point around a center
export function rotatePoint(px, py, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

// Get center of element
export function getElementCenter(el) {
  return [el.x + el.width / 2, el.y + el.height / 2];
}

// Transform a canvas point to element's local space (accounting for rotation)
export function toLocalPoint(px, py, el) {
  const [cx, cy] = getElementCenter(el);
  return rotatePoint(px, py, cx, cy, -(el.angle || 0));
}

// Snap to grid
export function snapToGrid(v, gridSize) {
  if (!gridSize) return v;
  return Math.round(v / gridSize) * gridSize;
}

// Polygon contains point (ray casting)
export function polygonContainsPoint(polygon, px, py) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Get arrow head points
export function getArrowheadPoints(x1, y1, x2, y2, size = 14) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = 0.45;
  return [
    [x2, y2],
    [x2 - size * Math.cos(angle - spread), y2 - size * Math.sin(angle - spread)],
    [x2 - size * Math.cos(angle + spread), y2 - size * Math.sin(angle + spread)],
  ];
}

// Bezier curve point
export function cubicBezier(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return mt ** 3 * p0 + 3 * mt ** 2 * t * p1 + 3 * mt * t ** 2 * p2 + t ** 3 * p3;
}
