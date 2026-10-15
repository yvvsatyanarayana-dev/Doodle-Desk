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

  elements.forEach((element, order) => {
    if (!element || element.isDeleted || element.isHidden) return;
    const entry = { element, order, bounds: getCachedElementBounds(element) };
    entries.push(entry);

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

  return { cellSize, cells, entries, overflow };
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
