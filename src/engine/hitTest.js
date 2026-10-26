// Hit testing — determines which element the user clicked/touched
import {
  getCachedElementBounds, getElementBounds, isPointInRect, distanceToSegment,
  toLocalPoint, getElementCenter, polygonContainsPoint, distance, getBoundsFromPoints
} from './math/geometry.js';
import { ELEMENT_TYPES, STROKE_WIDTHS } from './elements.js';
import { getTextElementBounds } from './renderer/render.js';
import {
  getTriangleVertices, getStarVertices, getHexagonVertices, getOctagonVertices,
  getParallelogramVertices, getCylinderPolygon, getCloudPolygon
} from './renderer/sketchy.js';

const HIT_TOLERANCE = 8; // pixels

function getStrokeWidth(el) {
  return STROKE_WIDTHS[el.strokeWidth] ?? el.strokeWidth ?? 2;
}

export function isPointOnFrameLabel(el, px, py) {
  if (el.type !== ELEMENT_TYPES.FRAME) return false;
  const [lx, ly] = toLocalPoint(px, py, el);
  const rx = el.width < 0 ? el.x + el.width : el.x;
  const ry = el.height < 0 ? el.y + el.height : el.y;
  const labelW = Math.max(54, ((el.name?.length || 5) * 8) + 20);
  return lx >= rx && lx <= rx + labelW && ly >= ry - 30 && ly <= ry;
}

// Test if a point hits a specific element
export function hitTestElement(el, px, py, { includeLocked = false } = {}) {
  if (el.isDeleted || el.isHidden || (el.locked && !includeLocked)) return false;
  if (isPointOnFrameLabel(el, px, py)) return true;

  const tol = HIT_TOLERANCE + getStrokeWidth(el) / 2;
  const bounds = el.type === ELEMENT_TYPES.TEXT ? getTextElementBounds(el) : getCachedElementBounds(el);
  const left = Math.min(bounds.x, bounds.x + bounds.width);
  const right = Math.max(bounds.x, bounds.x + bounds.width);
  const top = Math.min(bounds.y, bounds.y + bounds.height);
  const bottom = Math.max(bounds.y, bounds.y + bounds.height);
  if (px < left - tol || px > right + tol ||
      py < top - tol || py > bottom + tol) {
    return false;
  }
  const [lx, ly] = toLocalPoint(px, py, el);
  const { x, y, width: w, height: h } = el;

  switch (el.type) {
    case ELEMENT_TYPES.RECTANGLE: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));
      return isPointInRect(lx, ly, rx, ry, rw, rh, tol);
    }

    case ELEMENT_TYPES.ELLIPSE: {
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));
      const rx = rw / 2;
      const ry = rh / 2;
      const cx = (w < 0 ? x + w : x) + rx;
      const cy = (h < 0 ? y + h : y) + ry;
      const ex = (lx - cx) / (rx + tol);
      const ey = (ly - cy) / (ry + tol);
      return (ex * ex + ey * ey) <= 1;
    }

    case ELEMENT_TYPES.DIAMOND: {
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const cx = rx + rw / 2, cy = ry + rh / 2;
      const corners = [[cx, ry], [rx + rw, cy], [cx, ry + rh], [rx, cy]];
      if (polygonContainsPoint(corners, lx, ly)) return true;
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        if (distanceToSegment(lx, ly, corners[i][0], corners[i][1], corners[next][0], corners[next][1]) <= tol) {
          return true;
        }
      }
      return false;
    }

    case ELEMENT_TYPES.TRIANGLE:
    case ELEMENT_TYPES.STAR:
    case ELEMENT_TYPES.HEXAGON:
    case ELEMENT_TYPES.OCTAGON:
    case ELEMENT_TYPES.PARALLELOGRAM:
    case ELEMENT_TYPES.CYLINDER:
    case ELEMENT_TYPES.CLOUD: {
      let poly;
      if (el.type === ELEMENT_TYPES.TRIANGLE) poly = getTriangleVertices(x, y, w, h);
      else if (el.type === ELEMENT_TYPES.STAR) poly = getStarVertices(x, y, w, h);
      else if (el.type === ELEMENT_TYPES.HEXAGON) poly = getHexagonVertices(x, y, w, h);
      else if (el.type === ELEMENT_TYPES.OCTAGON) poly = getOctagonVertices(x, y, w, h);
      else if (el.type === ELEMENT_TYPES.PARALLELOGRAM) poly = getParallelogramVertices(x, y, w, h);
      else if (el.type === ELEMENT_TYPES.CYLINDER) poly = getCylinderPolygon(x, y, w, h);
      else if (el.type === ELEMENT_TYPES.CLOUD) poly = getCloudPolygon(x, y, w, h);

      if (poly) {
        if (polygonContainsPoint(poly, lx, ly)) return true;
        for (let i = 0; i < poly.length; i++) {
          const next = (i + 1) % poly.length;
          if (distanceToSegment(lx, ly, poly[i][0], poly[i][1], poly[next][0], poly[next][1]) <= tol) {
            return true;
          }
        }
      }
      return false;
    }

    case ELEMENT_TYPES.CAPSULE: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));
      return isPointInRect(lx, ly, rx, ry, rw, rh, tol);
    }

    case ELEMENT_TYPES.ARROW:
    case ELEMENT_TYPES.LINE: {
      if (!el.points || el.points.length < 2) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const ax = x + el.points[i][0], ay = y + el.points[i][1];
        const bx = x + el.points[i + 1][0], by = y + el.points[i + 1][1];
        if (distanceToSegment(lx, ly, ax, ay, bx, by) <= tol) return true;
      }
      return false;
    }

    case ELEMENT_TYPES.FREEDRAW: {
      if (!el.points || el.points.length < 2) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const ax = x + el.points[i][0], ay = y + el.points[i][1];
        const bx = x + el.points[i + 1][0], by = y + el.points[i + 1][1];
        const segMinX = (ax < bx ? ax : bx) - tol;
        const segMaxX = (ax > bx ? ax : bx) + tol;
        if (lx < segMinX || lx > segMaxX) continue;
        const segMinY = (ay < by ? ay : by) - tol;
        const segMaxY = (ay > by ? ay : by) + tol;
        if (ly < segMinY || ly > segMaxY) continue;
        if (distanceToSegment(lx, ly, ax, ay, bx, by) <= tol) return true;
      }
      return false;
    }

    case ELEMENT_TYPES.TEXT: {
      const textBounds = getTextElementBounds(el);
      return isPointInRect(lx, ly, textBounds.x, textBounds.y, textBounds.width, textBounds.height, tol);
    }
    case ELEMENT_TYPES.IMAGE:
    case ELEMENT_TYPES.IFRAME: {
      return isPointInRect(lx, ly, x, y, w, h, tol);
    }
    case ELEMENT_TYPES.BOARD_PORTAL:
      return isPointInRect(lx, ly, x, y, w, h, tol);

    case ELEMENT_TYPES.FRAME: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));
      return isPointInRect(lx, ly, rx, ry, rw, rh, tol);
    }

    default:
      return isPointInRect(lx, ly, x, y, w, h, tol);
  }
}

// Find the topmost element at a point (reverse Z-order)
// Non-frame elements take priority so children inside a frame can be selected directly
export function getElementAtPoint(elements, px, py, { includeLocked = false, preferFrameIds = [] } = {}) {
  if (preferFrameIds.length) {
    const preferredFrames = new Set(preferFrameIds);
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === ELEMENT_TYPES.FRAME && preferredFrames.has(el.id) && hitTestElement(el, px, py, { includeLocked })) {
        return el;
      }
    }
  }
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type !== ELEMENT_TYPES.FRAME && hitTestElement(el, px, py, { includeLocked })) {
      return el;
    }
  }
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === ELEMENT_TYPES.FRAME && hitTestElement(el, px, py, { includeLocked })) {
      return el;
    }
  }
  return null;
}

// Find all elements inside or intersecting a selection rectangle
export function getElementsInRect(elements, rx, ry, rw, rh) {
  const minX = Math.min(rx, rx + rw);
  const minY = Math.min(ry, ry + rh);
  const maxX = Math.max(rx, rx + rw);
  const maxY = Math.max(ry, ry + rh);

  return elements.filter(el => {
    if (el.isDeleted || el.isHidden || el.locked) return false;
    const b = el.type === ELEMENT_TYPES.TEXT ? getTextElementBounds(el) : getCachedElementBounds(el);
    const bMinX = Math.min(b.x, b.x + b.width);
    const bMaxX = Math.max(b.x, b.x + b.width);
    const bMinY = Math.min(b.y, b.y + b.height);
    const bMaxY = Math.max(b.y, b.y + b.height);
    const isEnclosed = bMinX >= minX && bMinY >= minY && bMaxX <= maxX && bMaxY <= maxY;
    const isIntersecting = bMaxX >= minX && bMinX <= maxX && bMaxY >= minY && bMinY <= maxY;
    return isEnclosed || isIntersecting;
  });
}

// Resize handle hit test
export const RESIZE_HANDLES = {
  NW: 'nw', N: 'n', NE: 'ne',
  W: 'w', E: 'e',
  SW: 'sw', S: 's', SE: 'se',
  ROTATION: 'rotation',
  START: 'start',
  END: 'end',
  MIDPOINT: 'midpoint',
};

export function getResizeHandleAt(el, px, py, zoom = 1) {
  if (el.isDeleted) return null;
  const [lx, ly] = toLocalPoint(px, py, el);
  const handleSize = 14 / zoom;

  // Linear elements (Arrow & Line) have dedicated endpoint and midpoint handles
  if ((el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) && el.points?.length >= 2) {
    const pts = el.points;
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const startX = el.x + firstPt[0];
    const startY = el.y + firstPt[1];
    const endX = el.x + lastPt[0];
    const endY = el.y + lastPt[1];

    if (distance(lx, ly, startX, startY) <= handleSize) {
      return RESIZE_HANDLES.START;
    }
    if (distance(lx, ly, endX, endY) <= handleSize) {
      return RESIZE_HANDLES.END;
    }

    // Check intermediate vertex points
    for (let i = 1; i < pts.length - 1; i++) {
      const vx = el.x + pts[i][0];
      const vy = el.y + pts[i][1];
      if (distance(lx, ly, vx, vy) <= handleSize) {
        return `point_${i}`;
      }
    }

    // Check segment midpoints for curving/bending
    for (let i = 0; i < pts.length - 1; i++) {
      const p1x = el.x + pts[i][0];
      const p1y = el.y + pts[i][1];
      const p2x = el.x + pts[i + 1][0];
      const p2y = el.y + pts[i + 1][1];
      const mx = (p1x + p2x) / 2;
      const my = (p1y + p2y) / 2;
      if (distance(lx, ly, mx, my) <= handleSize) {
        return `midpoint_${i}`;
      }
    }

    // Never fall through to bounding box or rotation handles for arrow/line!
    return null;
  }

  const bounds = el.type === ELEMENT_TYPES.TEXT
    ? getTextElementBounds(el)
    : el.type === ELEMENT_TYPES.FREEDRAW && el.points?.length
      ? (() => {
      const pointsBounds = getBoundsFromPoints(el.points);
      return {
        x: el.x + pointsBounds.x,
        y: el.y + pointsBounds.y,
        width: pointsBounds.width,
        height: pointsBounds.height,
      };
      })()
      : el;
  const { x, y, width: w, height: h } = bounds;
  const padding = 4 / zoom;

  const rx = x - padding;
  const ry = y - padding;
  const rw = w + padding * 2;
  const rh = h + padding * 2;

  const rotHandle = [rx + rw / 2, ry - 20 / zoom];
  if (distance(lx, ly, rotHandle[0], rotHandle[1]) <= handleSize) {
    return RESIZE_HANDLES.ROTATION;
  }

  const handles = {
    [RESIZE_HANDLES.NW]: [rx, ry],
    [RESIZE_HANDLES.NE]: [rx + rw, ry],
    [RESIZE_HANDLES.SW]: [rx, ry + rh],
    [RESIZE_HANDLES.SE]: [rx + rw, ry + rh],
  };

  for (const [name, [hx, hy]] of Object.entries(handles)) {
    if (Math.abs(lx - hx) <= handleSize / 2 && Math.abs(ly - hy) <= handleSize / 2) {
      return name;
    }
  }
  return null;
}

// Get cursor for a given resize handle
export function getCursorForHandle(handle) {
  if (handle === RESIZE_HANDLES.START || handle === RESIZE_HANDLES.END) return 'crosshair';
  if (handle?.startsWith('midpoint') || handle === RESIZE_HANDLES.MIDPOINT || handle?.startsWith('point')) return 'crosshair';
  switch (handle) {
    case RESIZE_HANDLES.NW: case RESIZE_HANDLES.SE: return 'nwse-resize';
    case RESIZE_HANDLES.NE: case RESIZE_HANDLES.SW: return 'nesw-resize';
    case RESIZE_HANDLES.N: case RESIZE_HANDLES.S: return 'ns-resize';
    case RESIZE_HANDLES.W: case RESIZE_HANDLES.E: return 'ew-resize';
    case RESIZE_HANDLES.ROTATION: return 'crosshair';
    default: return 'move';
  }
}
