import { boundsIntersectViewport, getCachedElementBounds } from './geometry.js';

const DEFAULT_CELL_SIZE = 512;
const MAX_CELLS_PER_ELEMENT = 64;
const MAX_QUERY_CELLS = 4096;

function getCellRange(bounds, cellSize) {
  const minX = Math.min(bounds.x, bounds.x + bounds.width);
  const maxX = Math.max(bounds.x, bounds.x + bounds.width);
  const minY = Math.min(bounds.y, bounds.y + bounds.height);
  const maxY = Math.max(bounds.y, bounds.y + bounds.height);
  return {
    minX: Math.floor(minX / cellSize),
    maxX: Math.floor(maxX / cellSize),
    minY: Math.floor(minY / cellSize),
    maxY: Math.floor(maxY / cellSize),
  };
}

function cellCount(range) {
  return (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1);
}

function getCellKey(x, y) {
  return `${x},${y}`;
}

export function buildSceneSpatialIndex(elements, cellSize = DEFAULT_CELL_SIZE) {
  const entries = [];
  const cells = new Map();
  const overflow = [];
  const elementsById = new Map();
  const orderByElement = new Map();
  const orderById = new Map();
  const sceneBounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  elements.forEach((element, order) => {
    if (!element) return;
    if (element.id) {
      elementsById.set(element.id, element);
      orderById.set(element.id, order);
    }
    if (element.isDeleted || element.isHidden) return;
    const entry = { element, order, bounds: getCachedElementBounds(element) };
    entries.push(entry);
    orderByElement.set(element, order);
    const left = Math.min(entry.bounds.x, entry.bounds.x + entry.bounds.width);
    const top = Math.min(entry.bounds.y, entry.bounds.y + entry.bounds.height);
    sceneBounds.minX = Math.min(sceneBounds.minX, left);
    sceneBounds.minY = Math.min(sceneBounds.minY, top);
    sceneBounds.maxX = Math.max(sceneBounds.maxX, left + Math.abs(entry.bounds.width));
    sceneBounds.maxY = Math.max(sceneBounds.maxY, top + Math.abs(entry.bounds.height));

    const range = getCellRange(entry.bounds, cellSize);
    if (cellCount(range) > MAX_CELLS_PER_ELEMENT) {
      overflow.push(entry);
      return;
    }

    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        const key = getCellKey(x, y);
        let bucket = cells.get(key);
        if (!bucket) {
          bucket = [];
          cells.set(key, bucket);
        }
        bucket.push(entry);
      }
    }
  });

  return { cellSize, cells, entries, overflow, elementsById, orderByElement, orderById, sceneBounds };
}

export function getVisibleSceneElements(index, viewport, padding = 0) {
  if (!index || !index.entries.length) return [];

  // Ultra-fast path: If the entire scene bounds are contained inside the viewport, return all elements directly in O(1)
  const sb = index.sceneBounds;
  if (
    sb &&
    sb.minX !== Infinity &&
    viewport.x - padding <= sb.minX &&
    viewport.y - padding <= sb.minY &&
    viewport.x + viewport.width + padding >= sb.maxX &&
    viewport.y + viewport.height + padding >= sb.maxY
  ) {
    if (!index._cachedAllElements || index._cachedAllElements.length !== index.entries.length) {
      index._cachedAllElements = index.entries.map((e) => e.element);
    }
    return index._cachedAllElements;
  }

  const range = getCellRange(
    {
      x: viewport.x - padding,
      y: viewport.y - padding,
      width: viewport.width + padding * 2,
      height: viewport.height + padding * 2,
    },
    index.cellSize
  );

  const total = index.entries.length;
  if (!index._visibleFlags || index._visibleFlags.length < total) {
    index._visibleFlags = new Uint8Array(Math.max(total, 1024));
  } else {
    index._visibleFlags.fill(0, 0, total);
  }
  const visibleFlags = index._visibleFlags;

  if (cellCount(range) > MAX_QUERY_CELLS) {
    for (let i = 0; i < total; i++) {
      if (boundsIntersectViewport(index.entries[i].bounds, viewport, padding)) {
        visibleFlags[i] = 1;
      }
    }
  } else {
    // Check overflow entries
    const overflow = index.overflow;
    for (let i = 0; i < overflow.length; i++) {
      const entry = overflow[i];
      if (boundsIntersectViewport(entry.bounds, viewport, padding)) {
        visibleFlags[entry.order] = 1;
      }
    }
    // Check grid cell buckets
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        const bucket = index.cells.get(getCellKey(x, y));
        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const entry = bucket[i];
            if (!visibleFlags[entry.order] && boundsIntersectViewport(entry.bounds, viewport, padding)) {
              visibleFlags[entry.order] = 1;
            }
          }
        }
      }
    }
  }

  // Linear assembly preserves exact original canvas stacking Z-order with zero sorting overhead
  const result = [];
  for (let i = 0; i < total; i++) {
    if (visibleFlags[i]) {
      result.push(index.entries[i].element);
    }
  }
  return result;
}

export function getSceneAlignmentCandidates(index, bounds, threshold) {
  if (!index || !index.entries.length) return [];

  const { minX, minY, maxX, maxY } = index.sceneBounds;

  const vertical = getVisibleSceneElements(index, {
    x: bounds.minX - threshold,
    y: minY,
    width: bounds.maxX - bounds.minX + threshold * 2,
    height: maxY - minY,
  });
  const horizontal = getVisibleSceneElements(index, {
    x: minX,
    y: bounds.minY - threshold,
    width: maxX - minX,
    height: bounds.maxY - bounds.minY + threshold * 2,
  });
  if (!vertical.length) return horizontal;
  if (!horizontal.length) return vertical;

  const candidates = [...vertical];
  const candidateIds = new Set(vertical);
  for (const element of horizontal) {
    if (!candidateIds.has(element)) candidates.push(element);
  }
  return candidates.sort((first, second) => index.orderByElement.get(first) - index.orderByElement.get(second));
}

export function getSceneElementsAtPoint(index, x, y, padding = 32) {
  return getVisibleSceneElements(index, { x, y, width: 0, height: 0 }, padding);
}

export function getVisibleSceneElementsDuringDrag(index, viewport, padding, movedIds, offset) {
  if (!index || !index.entries.length) return [];

  const total = index.entries.length;
  const result = [];
  const hasOffset = offset && (offset.x !== 0 || offset.y !== 0);
  const offsetX = hasOffset ? offset.x : 0;
  const offsetY = hasOffset ? offset.y : 0;

  const vpMinX = viewport.x - padding;
  const vpMaxX = viewport.x + viewport.width + padding;
  const vpMinY = viewport.y - padding;
  const vpMaxY = viewport.y + viewport.height + padding;

  for (let i = 0; i < total; i++) {
    const entry = index.entries[i];
    const element = entry.element;
    if (element.isDeleted || element.isHidden) continue;

    if (movedIds && movedIds.has(element.id)) {
      if (element.locked) continue;
      const b = entry.bounds;
      const bMinX = Math.min(b.x, b.x + b.width) + offsetX;
      const bMaxX = Math.max(b.x, b.x + b.width) + offsetX;
      const bMinY = Math.min(b.y, b.y + b.height) + offsetY;
      const bMaxY = Math.max(b.y, b.y + b.height) + offsetY;

      if (bMaxX >= vpMinX && bMinX <= vpMaxX && bMaxY >= vpMinY && bMinY <= vpMaxY) {
        result.push(hasOffset ? {
          ...element,
          x: element.x + offsetX,
          y: element.y + offsetY,
        } : element);
      }
    } else {
      if (boundsIntersectViewport(entry.bounds, viewport, padding)) {
        result.push(element);
      }
    }
  }

  return result;
}
