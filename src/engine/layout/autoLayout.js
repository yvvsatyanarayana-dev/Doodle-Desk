/**
 * AI Smart Auto-Layout Engine for Whiteboard Diagrams
 * Automatically calculates optimal coordinate distributions for shapes, cards, and diagrams.
 */

export const AUTO_LAYOUT_TYPES = {
  HORIZONTAL_FLOW: 'horizontal-flow',
  VERTICAL_FLOW: 'vertical-flow',
  GRID_MATRIX: 'grid-matrix',
  RADIAL_CIRCLE: 'radial-circle',
  SMART_TIDY: 'smart-tidy',
};

const ROUTE_CLEARANCE = 18;
const ROUTE_OBSTACLE_PADDING = 8;

function getElementBox(element) {
  const width = element.width || 0;
  const height = element.height || 0;
  return {
    left: element.x,
    top: element.y,
    right: element.x + width,
    bottom: element.y + height,
    centerX: element.x + width / 2,
    centerY: element.y + height / 2,
  };
}

function simplifyRoute(points) {
  const result = [];
  for (const point of points) {
    const previous = result[result.length - 1];
    if (previous && previous.x === point.x && previous.y === point.y) continue;
    result.push(point);
    while (result.length >= 3) {
      const a = result[result.length - 3];
      const b = result[result.length - 2];
      const c = result[result.length - 1];
      if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
        result.splice(result.length - 2, 1);
      } else {
        break;
      }
    }
  }
  return result;
}

function segmentHitsBox(start, end, box) {
  const left = box.left - ROUTE_OBSTACLE_PADDING;
  const right = box.right + ROUTE_OBSTACLE_PADDING;
  const top = box.top - ROUTE_OBSTACLE_PADDING;
  const bottom = box.bottom + ROUTE_OBSTACLE_PADDING;
  if (start.y === end.y) {
    return start.y > top && start.y < bottom &&
      Math.max(Math.min(start.x, end.x), left) < Math.min(Math.max(start.x, end.x), right);
  }
  if (start.x === end.x) {
    return start.x > left && start.x < right &&
      Math.max(Math.min(start.y, end.y), top) < Math.min(Math.max(start.y, end.y), bottom);
  }
  return true;
}

function routeBoundConnector(connector, startElement, endElement, obstacles) {
  if (!startElement || !endElement) return connector;

  const startBox = getElementBox(startElement);
  const endBox = getElementBox(endElement);
  const horizontal = Math.abs(endBox.centerX - startBox.centerX) >=
    Math.abs(endBox.centerY - startBox.centerY);
  const forward = horizontal
    ? endBox.centerX >= startBox.centerX
    : endBox.centerY >= startBox.centerY;
  const start = horizontal
    ? { x: forward ? startBox.right : startBox.left, y: startBox.centerY }
    : { x: startBox.centerX, y: forward ? startBox.bottom : startBox.top };
  const end = horizontal
    ? { x: forward ? endBox.left : endBox.right, y: endBox.centerY }
    : { x: endBox.centerX, y: forward ? endBox.top : endBox.bottom };
  const direction = forward ? 1 : -1;
  const startStub = horizontal
    ? { x: start.x + ROUTE_CLEARANCE * direction, y: start.y }
    : { x: start.x, y: start.y + ROUTE_CLEARANCE * direction };
  const endStub = horizontal
    ? { x: end.x - ROUTE_CLEARANCE * direction, y: end.y }
    : { x: end.x, y: end.y - ROUTE_CLEARANCE * direction };
  const bounds = obstacles.reduce((result, box) => ({
    minX: Math.min(result.minX, box.left),
    minY: Math.min(result.minY, box.top),
    maxX: Math.max(result.maxX, box.right),
    maxY: Math.max(result.maxY, box.bottom),
  }), {
    minX: Math.min(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxX: Math.max(start.x, end.x),
    maxY: Math.max(start.y, end.y),
  });
  const detours = horizontal
    ? [
      { x: (startStub.x + endStub.x) / 2, y: startStub.y },
      { x: bounds.minX - ROUTE_CLEARANCE, y: startStub.y },
      { x: bounds.maxX + ROUTE_CLEARANCE, y: startStub.y },
      { x: startStub.x, y: bounds.minY - ROUTE_CLEARANCE },
      { x: startStub.x, y: bounds.maxY + ROUTE_CLEARANCE },
    ]
    : [
      { x: startStub.x, y: (startStub.y + endStub.y) / 2 },
      { x: startStub.x, y: bounds.minY - ROUTE_CLEARANCE },
      { x: startStub.x, y: bounds.maxY + ROUTE_CLEARANCE },
      { x: bounds.minX - ROUTE_CLEARANCE, y: startStub.y },
      { x: bounds.maxX + ROUTE_CLEARANCE, y: startStub.y },
    ];

  const candidates = [
    [start, startStub, endStub, end],
    ...detours.map((waypoint) => horizontal
      ? (waypoint.y === startStub.y
        ? [start, startStub, { x: waypoint.x, y: startStub.y }, { x: waypoint.x, y: endStub.y }, endStub, end]
        : [start, startStub, { x: startStub.x, y: waypoint.y }, { x: endStub.x, y: waypoint.y }, endStub, end])
      : (waypoint.x === startStub.x
        ? [start, startStub, { x: startStub.x, y: waypoint.y }, { x: endStub.x, y: waypoint.y }, endStub, end]
        : [start, startStub, { x: waypoint.x, y: startStub.y }, { x: waypoint.x, y: endStub.y }, endStub, end])),
  ].map(simplifyRoute);

  const scoreRoute = (route) => {
    let score = Math.max(0, route.length - 2) * ROUTE_CLEARANCE;
    for (let index = 1; index < route.length; index += 1) {
      const segment = Math.abs(route[index].x - route[index - 1].x) +
        Math.abs(route[index].y - route[index - 1].y);
      score += segment;
      for (const obstacle of obstacles) {
        if (segmentHitsBox(route[index - 1], route[index], obstacle)) score += 100000;
      }
    }
    return score;
  };
  const route = candidates.reduce((best, candidate) =>
    scoreRoute(candidate) < scoreRoute(best) ? candidate : best
  );
  const minX = Math.min(...route.map((point) => point.x));
  const minY = Math.min(...route.map((point) => point.y));
  const maxX = Math.max(...route.map((point) => point.x));
  const maxY = Math.max(...route.map((point) => point.y));

  return {
    ...connector,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: route.map((point) => [point.x - minX, point.y - minY]),
    version: (connector.version || 1) + 1,
    versionNonce: Math.floor(Math.random() * 1000000),
  };
}

/**
 * Calculates bounding box and moves bound children (like text inside shapes).
 */
export function applyAutoLayout(elements, options = {}) {
  const {
    type = AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW,
    selectedIds = null,
    gap = 60,
    columns = null,
  } = options;

  if (!elements || elements.length === 0) return elements;

  // Determine target elements to arrange
  const targetFilter = (el) => {
    if (el.isDeleted || el.isHidden || el.locked) return false;
    // Don't directly layout bound text elements; they follow their parent containers
    if (el.containerId) return false;
    // Don't layout standalone arrows/lines in the primary grid (they route between shapes)
    if (el.type === 'arrow' || el.type === 'line') return false;
    if (selectedIds && Object.keys(selectedIds).length > 0) {
      return Boolean(selectedIds[el.id]);
    }
    return true;
  };

  const targets = elements.filter(targetFilter);
  if (targets.length <= 1) return elements; // Nothing to re-layout with 0 or 1 item

  // Compute common original center / origin so diagrams don't fly off-screen
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of targets) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 0));
    maxY = Math.max(maxY, el.y + (el.height || 0));
  }
  const originX = minX;
  const originY = minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Map to store new (x, y) for each target
  const newPositions = new Map();

  switch (type) {
    case AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW: {
      // Sort primarily by x, then y
      const sorted = [...targets].sort((a, b) => (a.x - b.x) || (a.y - b.y));
      let currentX = originX;
      for (const el of sorted) {
        const w = el.width || 120;
        const h = el.height || 80;
        const targetY = centerY - h / 2;
        newPositions.set(el.id, { x: currentX, y: targetY });
        currentX += w + gap;
      }
      break;
    }

    case AUTO_LAYOUT_TYPES.VERTICAL_FLOW: {
      // Sort primarily by y, then x
      const sorted = [...targets].sort((a, b) => (a.y - b.y) || (a.x - b.x));
      let currentY = originY;
      for (const el of sorted) {
        const w = el.width || 120;
        const h = el.height || 80;
        const targetX = centerX - w / 2;
        newPositions.set(el.id, { x: targetX, y: currentY });
        currentY += h + gap;
      }
      break;
    }

    case AUTO_LAYOUT_TYPES.GRID_MATRIX: {
      const sorted = [...targets].sort((a, b) => (a.y - b.y) || (a.x - b.x));
      const n = sorted.length;
      const numCols = columns || Math.ceil(Math.sqrt(n));

      // Calculate max width and height for uniform cell grid alignment
      let maxW = 0, maxH = 0;
      for (const el of sorted) {
        maxW = Math.max(maxW, el.width || 120);
        maxH = Math.max(maxH, el.height || 80);
      }

      sorted.forEach((el, index) => {
        const col = index % numCols;
        const row = Math.floor(index / numCols);
        const w = el.width || 120;
        const h = el.height || 80;
        // Center item within the cell
        const cellX = originX + col * (maxW + gap);
        const cellY = originY + row * (maxH + gap);
        const posX = cellX + (maxW - w) / 2;
        const posY = cellY + (maxH - h) / 2;
        newPositions.set(el.id, { x: posX, y: posY });
      });
      break;
    }

    case AUTO_LAYOUT_TYPES.RADIAL_CIRCLE: {
      const sorted = [...targets];
      const count = sorted.length;
      let maxDim = 0;
      for (const el of sorted) {
        maxDim = Math.max(maxDim, el.width || 120, el.height || 80);
      }
      const radius = Math.max(140, (count * (maxDim + gap)) / (2 * Math.PI));

      sorted.forEach((el, index) => {
        const angle = (2 * Math.PI * index) / count - Math.PI / 2;
        const w = el.width || 120;
        const h = el.height || 80;
        const posX = centerX + radius * Math.cos(angle) - w / 2;
        const posY = centerY + radius * Math.sin(angle) - h / 2;
        newPositions.set(el.id, { x: posX, y: posY });
      });
      break;
    }

    case AUTO_LAYOUT_TYPES.SMART_TIDY:
    default: {
      // Determine dominant axis: horizontal or vertical
      const widthSpan = maxX - minX;
      const heightSpan = maxY - minY;
      const isHorizontal = widthSpan >= heightSpan;

      if (isHorizontal) {
        const sorted = [...targets].sort((a, b) => a.x - b.x);
        let currentX = originX;
        for (const el of sorted) {
          const w = el.width || 120;
          const h = el.height || 80;
          const targetY = centerY - h / 2;
          newPositions.set(el.id, { x: currentX, y: targetY });
          currentX += w + Math.max(30, gap);
        }
      } else {
        const sorted = [...targets].sort((a, b) => a.y - b.y);
        let currentY = originY;
        for (const el of sorted) {
          const w = el.width || 120;
          const h = el.height || 80;
          const targetX = centerX - w / 2;
          newPositions.set(el.id, { x: targetX, y: currentY });
          currentY += h + Math.max(30, gap);
        }
      }
      break;
    }
  }

  // Construct delta offsets map to update bound text elements and connected arrows
  const deltas = new Map();
  for (const el of targets) {
    const pos = newPositions.get(el.id);
    if (pos) {
      deltas.set(el.id, { dx: pos.x - el.x, dy: pos.y - el.y });
    }
  }

  const arrangedElements = elements.map((el) => {
    const position = newPositions.get(el.id);
    return position ? { ...el, x: position.x, y: position.y } : el;
  });
  const elementsById = new Map(arrangedElements.map((el) => [el.id, el]));
  const obstacles = arrangedElements
    .filter((el) => !el.isDeleted && !el.isHidden && !el.containerId &&
      el.type !== 'arrow' && el.type !== 'line' &&
      el.type !== 'freedraw' && el.type !== 'frame')
    .map((el) => ({ id: el.id, ...getElementBox(el) }));

  // Generate updated elements array
  return elements.map((el) => {
    if (newPositions.has(el.id)) {
      const pos = newPositions.get(el.id);
      return {
        ...el,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        version: (el.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 1000000),
      };
    }

    if ((el.type === 'arrow' || el.type === 'line') && el.points?.length >= 2) {
      const startId = el.startBinding?.elementId;
      const endId = el.endBinding?.elementId;
      if (startId && endId && (deltas.has(startId) || deltas.has(endId))) {
        return routeBoundConnector(
          el,
          elementsById.get(startId),
          elementsById.get(endId),
          obstacles.filter(({ id }) => id !== startId && id !== endId)
        );
      }

      const startDelta = deltas.get(el.startBinding?.elementId) || { dx: 0, dy: 0 };
      const endDelta = deltas.get(el.endBinding?.elementId) || { dx: 0, dy: 0 };
      if (
        startDelta.dx !== 0 || startDelta.dy !== 0 ||
        endDelta.dx !== 0 || endDelta.dy !== 0
      ) {
        const points = el.points.map(([pointX, pointY], index) => {
          const progress = index / (el.points.length - 1);
          const dx = startDelta.dx + (endDelta.dx - startDelta.dx) * progress;
          const dy = startDelta.dy + (endDelta.dy - startDelta.dy) * progress;
          return [el.x + pointX + dx, el.y + pointY + dy];
        });
        const minX = Math.min(...points.map(([pointX]) => pointX));
        const minY = Math.min(...points.map(([, pointY]) => pointY));
        const maxX = Math.max(...points.map(([pointX]) => pointX));
        const maxY = Math.max(...points.map(([, pointY]) => pointY));
        return {
          ...el,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          points: points.map(([pointX, pointY]) => [pointX - minX, pointY - minY]),
          version: (el.version || 1) + 1,
          versionNonce: Math.floor(Math.random() * 1000000),
        };
      }
    }

    // If element is a bound text child of a moved container
    if (el.containerId && deltas.has(el.containerId)) {
      const { dx, dy } = deltas.get(el.containerId);
      return {
        ...el,
        x: Math.round(el.x + dx),
        y: Math.round(el.y + dy),
        version: (el.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 1000000),
      };
    }

    return el;
  });
}
