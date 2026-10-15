const DOT_GRID_TILE_SIZE = 128;

function getDotGridPattern(ctx, theme, zoom, patternCache) {
  const key = `${theme}:${zoom}`;
  if (patternCache.current?.key === key) return patternCache.current.pattern;

  const tile = document.createElement('canvas');
  tile.width = DOT_GRID_TILE_SIZE;
  tile.height = DOT_GRID_TILE_SIZE;
  const tileContext = tile.getContext('2d');
  if (!tileContext) return null;

  const step = 24 * zoom;
  const radius = Math.max(1, Math.min(2.2, 1.25 * Math.sqrt(zoom)));
  const tileRadius = radius * DOT_GRID_TILE_SIZE / step;
  tileContext.fillStyle = theme === 'dark'
    ? 'rgba(255, 255, 255, 0.28)'
    : 'rgba(15, 23, 42, 0.25)';
  tileContext.beginPath();
  for (const x of [0, DOT_GRID_TILE_SIZE]) {
    for (const y of [0, DOT_GRID_TILE_SIZE]) {
      tileContext.moveTo(x + tileRadius, y);
      tileContext.arc(x, y, tileRadius, 0, Math.PI * 2);
    }
  }
  tileContext.fill();

  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern || typeof pattern.setTransform !== 'function') return null;
  patternCache.current = { key, pattern };
  return pattern;
}

export function drawDotGrid(ctx, { width, height, zoom, scrollX, scrollY, theme, patternCache }) {
  const pattern = getDotGridPattern(ctx, theme, zoom, patternCache);
  const step = 24 * zoom;
  const startX = ((scrollX % step) + width) % step;
  const startY = ((scrollY % step) + height) % step;

  if (pattern) {
    const scale = step / DOT_GRID_TILE_SIZE;
    pattern.setTransform({
      a: scale,
      b: 0,
      c: 0,
      d: scale,
      e: startX,
      f: startY,
    });
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = theme === 'dark'
    ? 'rgba(255, 255, 255, 0.28)'
    : 'rgba(15, 23, 42, 0.25)';
  const dotRadius = Math.max(1, Math.min(2.2, 1.25 * Math.sqrt(zoom)));
  ctx.beginPath();
  for (let gx = startX; gx < width; gx += step) {
    for (let gy = startY; gy < height; gy += step) {
      ctx.moveTo(gx + dotRadius, gy);
      ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}
