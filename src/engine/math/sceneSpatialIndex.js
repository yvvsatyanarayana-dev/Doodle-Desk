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
  if (!index) return [];

  const range = getCellRange({
    x: viewport.x - padding,
    y: viewport.y - padding,
    width: viewport.width + padding * 2,
    height: viewport.height + padding * 2,
  }, index.cellSize);

  const candidates = new Set(index.overflow);
  if (cellCount(range) > MAX_QUERY_CELLS) {
    index.entries.forEach((entry) => candidates.add(entry));
  } else {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        index.cells.get(getCellKey(x, y))?.forEach((entry) => candidates.add(entry));
      }
    }
  }

  return Array.from(candidates)
    .filter((entry) => boundsIntersectViewport(entry.bounds, viewport, padding))
    .sort((first, second) => first.order - second.order)
    .map((entry) => entry.element);
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
  if (!index) return [];

  const elementsById = new Map();
  for (const element of getVisibleSceneElements(index, viewport, padding)) {
    if (!movedIds.has(element.id)) elementsById.set(element.id, element);
  }

  for (const id of movedIds) {
    const original = index.elementsById.get(id);
    if (!original || original.isDeleted || original.isHidden || original.locked) continue;
    const bounds = getCachedElementBounds(original);
    if (!boundsIntersectViewport({
      ...bounds,
      x: bounds.x + offset.x,
      y: bounds.y + offset.y,
    }, viewport, padding)) continue;
    elementsById.set(id, {
      ...original,
      x: original.x + offset.x,
      y: original.y + offset.y,
    });
  }

  return Array.from(elementsById.values())
    .sort((first, second) => index.orderById.get(first.id) - index.orderById.get(second.id));
}
