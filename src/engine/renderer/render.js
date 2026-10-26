// Canvas renderer — draws all element types to a 2D canvas context
import {
  sketchyLine, sketchyRect, sketchyRoundedRect, sketchyEllipse, sketchyDiamond,
  sketchyTriangle, sketchyStar, sketchyHexagon, sketchyOctagon,
  sketchyCylinder, sketchyCloud, sketchyCapsule, sketchyParallelogram,
  getTriangleVertices, getStarVertices, getHexagonVertices, getOctagonVertices,
  getParallelogramVertices, getCylinderPolygon, getCloudPolygon,
  sketchyFill, solidFill, crossHatchFill, dotsFill, zigzagFill, dashedFill
} from './sketchy.js';
import { STROKE_WIDTHS, ELEMENT_TYPES } from '../elements.js';
import { getArrowheadPoints, rotatePoint, getElementCenter, getBoundsFromPoints, getCachedElementBounds } from '../math/geometry.js';
import { computeOrthogonalPoints, renderOrthogonalPath } from '../layout/orthogonalRouting.js';

// Font stack for each family
const FONT_STACKS = {
  5: '"Doodlefont", "Virgil", cursive',
  3: '"Virgil", cursive',
  2: '"Cascadia Code", "Fira Code", monospace',
  1: 'Helvetica, Arial, sans-serif',
  6: '"Nunito", sans-serif',
  7: '"Comic Shanns", cursive',
  8: '"Patrick Hand", cursive',
};

function getFontStack(fontFamily) {
  return FONT_STACKS[fontFamily] || FONT_STACKS[5];
}

function applyBaseStyle(ctx, el) {
  const strokeWidth = STROKE_WIDTHS[el.strokeWidth] ?? el.strokeWidth ?? 2;
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = el.strokeColor || '#1e1e1e';
  ctx.globalAlpha = (el.opacity ?? 100) / 100;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (el.strokeStyle === 'dashed') {
    ctx.setLineDash([strokeWidth * 6, strokeWidth * 4]);
  } else if (el.strokeStyle === 'dotted') {
    ctx.setLineDash([strokeWidth * 1.5, strokeWidth * 3]);
  } else {
    ctx.setLineDash([]);
  }
}

function applyFill(ctx, el, polygon) {
  if (!el.backgroundColor || el.backgroundColor === 'transparent') return;
  ctx.fillStyle = el.backgroundColor;

  const fillStyle = el.fillStyle || 'hachure';
  if (fillStyle === 'solid') {
    solidFill(ctx, polygon);
  } else if (fillStyle === 'hachure') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    ctx.setLineDash([]);
    sketchyFill(ctx, polygon, el.seed || 0, el.roughness ?? 1, el);
    ctx.restore();
  } else if (fillStyle === 'cross-hatch') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    ctx.setLineDash([]);
    crossHatchFill(ctx, polygon, el.seed || 0, el);
    ctx.restore();
  } else if (fillStyle === 'dots') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    ctx.setLineDash([]);
    dotsFill(ctx, polygon, el.seed || 0, el.roughness ?? 1, el);
    ctx.restore();
  } else if (fillStyle === 'zigzag') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    ctx.setLineDash([]);
    zigzagFill(ctx, polygon, el.seed || 0, el.roughness ?? 1, el);
    ctx.restore();
  } else if (fillStyle === 'dashed') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    dashedFill(ctx, polygon, el.seed || 0, el.roughness ?? 1, el);
    ctx.restore();
  }
}

// High-performance Path2D generator with Catmull-Rom & Chaikin smoothing
export function appendSmoothFreedrawToPath(path, offsetX, offsetY, pts, baseWidth = 2) {
  if (!path || !pts || pts.length === 0) return;
  if (pts.length === 1) {
    path.moveTo(offsetX + pts[0][0] + Math.max(1, baseWidth / 2), offsetY + pts[0][1]);
    path.arc(offsetX + pts[0][0], offsetY + pts[0][1], Math.max(1, baseWidth / 2), 0, Math.PI * 2);
    return;
  }
  if (pts.length === 2) {
    path.moveTo(offsetX + pts[0][0], offsetY + pts[0][1]);
    path.lineTo(offsetX + pts[1][0], offsetY + pts[1][1]);
    return;
  }

  const filtered = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = pts[i];
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    if (dx * dx + dy * dy >= 1.0 || i === pts.length - 1) {
      filtered.push(curr);
    }
  }

  let renderPts = filtered;
  if (filtered.length >= 4) {
    const chaikin = [filtered[0]];
    for (let i = 0; i < filtered.length - 1; i++) {
      const p0 = filtered[i];
      const p1 = filtered[i + 1];
      chaikin.push([0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]]);
      chaikin.push([0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]]);
    }
    chaikin.push(filtered[filtered.length - 1]);
    renderPts = chaikin;
  }

  const n = renderPts.length;
  path.moveTo(offsetX + renderPts[0][0], offsetY + renderPts[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = renderPts[i === 0 ? 0 : i - 1];
    const p1 = renderPts[i];
    const p2 = renderPts[i + 1];
    const p3 = renderPts[i + 2 >= n ? n - 1 : i + 2];

    const cp1x = offsetX + p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = offsetY + p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = offsetX + p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = offsetY + p2[1] - (p3[1] - p1[1]) / 6;
    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, offsetX + p2[0], offsetY + p2[1]);
  }
}

function createSmoothFreedrawPath(pts, baseWidth) {
  if (typeof Path2D === 'undefined' || !pts || pts.length === 0) return null;
  const p = new Path2D();
  appendSmoothFreedrawToPath(p, 0, 0, pts, baseWidth);
  return p;
}

// Ultra-fast single-draw-call rasterizer for runs of thousands of freedraw strokes
export function renderBatchedFreedrawRun(ctx, elements, start, end) {
  if (typeof Path2D === 'undefined' || start >= end) return;
  const leadEl = elements[start];
  const lastEl = elements[end - 1];
  const count = end - start;
  const baseWidth = STROKE_WIDTHS[leadEl.strokeWidth] ?? (typeof leadEl.strokeWidth === 'number' ? leadEl.strokeWidth : 2);

  let batch = leadEl._batchedRun;
  if (!batch || batch.count !== count || batch.lastId !== lastEl.id) {
    const p = new Path2D();
    const originX = leadEl.x || 0;
    const originY = leadEl.y || 0;
    for (let k = start; k < end; k++) {
      const el = elements[k];
      if (el.points && el.points.length > 0) {
        appendSmoothFreedrawToPath(p, (el.x || 0) - originX, (el.y || 0) - originY, el.points, baseWidth);
      }
    }
    batch = {
      path: p,
      count,
      lastId: lastEl.id,
      originX,
      originY,
    };
    leadEl._batchedRun = batch;
  }

  const strokeColor = leadEl.strokeColor || '#1e1e1e';
  if (ctx.strokeStyle !== strokeColor) ctx.strokeStyle = strokeColor;
  if (ctx.lineWidth !== baseWidth) ctx.lineWidth = baseWidth;
  if (ctx.lineCap !== 'round') ctx.lineCap = 'round';
  if (ctx.lineJoin !== 'round') ctx.lineJoin = 'round';
  const hasOpacity = leadEl.opacity !== undefined && leadEl.opacity < 100;
  if (hasOpacity) ctx.globalAlpha = (leadEl.opacity / 100);

  const curX = leadEl.x || 0;
  const curY = leadEl.y || 0;
  if (curX === 0 && curY === 0) {
    ctx.stroke(batch.path);
  } else {
    ctx.translate(curX, curY);
    ctx.stroke(batch.path);
    ctx.translate(-curX, -curY);
  }

  if (hasOpacity) ctx.globalAlpha = 1;
}

// Catmull-Rom spline with Chaikin corner-smoothing for fluid, organic handwriting
function renderSmoothFreedraw(ctx, x, y, pts, baseWidth) {
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(x + pts[0][0], y + pts[0][1], Math.max(1, baseWidth / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(x + pts[0][0], y + pts[0][1]);
    ctx.lineTo(x + pts[1][0], y + pts[1][1]);
    ctx.stroke();
    return;
  }

  // Pre-filter micro-jitter duplicates
  const filtered = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = pts[i];
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    if (dx * dx + dy * dy >= 1.0 || i === pts.length - 1) {
      filtered.push(curr);
    }
  }

  // Apply Chaikin corner-cutting to round out mouse stair-steps
  let renderPts = filtered;
  if (filtered.length >= 4) {
    const chaikin = [filtered[0]];
    for (let i = 0; i < filtered.length - 1; i++) {
      const p0 = filtered[i];
      const p1 = filtered[i + 1];
      chaikin.push([0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1]]);
      chaikin.push([0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1]]);
    }
    chaikin.push(filtered[filtered.length - 1]);
    renderPts = chaikin;
  }

  const n = renderPts.length;
  ctx.beginPath();
  ctx.moveTo(x + renderPts[0][0], y + renderPts[0][1]);

  // Catmull-Rom to cubic Bezier curve fitting
  for (let i = 0; i < n - 1; i++) {
    const p0 = renderPts[i === 0 ? 0 : i - 1];
    const p1 = renderPts[i];
    const p2 = renderPts[i + 1];
    const p3 = renderPts[i + 2 >= n ? n - 1 : i + 2];

    const cp1x = x + p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = y + p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = x + p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = y + p2[1] - (p3[1] - p1[1]) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x + p2[0], y + p2[1]);
  }

  ctx.stroke();
}

function renderInteractiveTableCanvas(ctx, el) {
  const { x, y, width: w, height: h, seed = 0, roughness = 1 } = el;
  const strokeColor = el.strokeColor || '#1e1e1e';
  const tableData = el.tableData || {};
  const columns = tableData.columns || [
    { id: 'col_1', title: 'Words', width: 260 },
    { id: 'col_2', title: 'Meaning', width: 380 },
  ];
  const rows = tableData.rows || [];

  const roundRadius = el.roundness === 'sharp' || el.roundness === 0 ? 0 : 16;
  const poly = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

  // 1. Fill
  if (roundRadius > 0 && el.backgroundColor && el.backgroundColor !== 'transparent') {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, roundRadius);
    else {
      ctx.moveTo(x + roundRadius, y);
      ctx.lineTo(x + w - roundRadius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + roundRadius);
      ctx.lineTo(x + w, y + h - roundRadius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - roundRadius, y + h);
      ctx.lineTo(x + roundRadius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - roundRadius);
      ctx.lineTo(x, y + roundRadius);
      ctx.quadraticCurveTo(x, y, x + roundRadius, y);
      ctx.closePath();
    }
    ctx.clip();
    if (el.fillStyle !== 'solid') {
      ctx.save();
      ctx.fillStyle = el.backgroundColor;
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.3;
      ctx.fill();
      ctx.restore();
    }
    applyFill(ctx, el, poly);
    ctx.restore();
  } else if (el.backgroundColor && el.backgroundColor !== 'transparent') {
    if (el.fillStyle !== 'solid') {
      ctx.save();
      ctx.fillStyle = el.backgroundColor;
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.3;
      solidFill(ctx, poly);
      ctx.restore();
    }
    applyFill(ctx, el, poly);
  }

  // 2. Base style for lines
  applyBaseStyle(ctx, el);

  // 3. Outer box
  if (roughness > 0 && roundRadius > 0) {
    sketchyRoundedRect(ctx, x, y, w, h, roundRadius, seed, roughness);
  } else if (roughness > 0) {
    sketchyRect(ctx, x, y, w, h, seed, roughness);
  } else {
    ctx.beginPath();
    if (roundRadius > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, roundRadius);
    else ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  // 4. Header divider
  const headerHeight = 52;
  sketchyLine(ctx, x, y + headerHeight, x + w, y + headerHeight, seed + 101, roughness);

  // 5. Column widths & Vertical lines
  const totalColsWidth = columns.reduce((sum, c) => sum + (c.width || 200), 0);
  const scaleX = w / (totalColsWidth || 1);
  let currentX = x;

  columns.forEach((col, cIdx) => {
    const colW = (col.width || 200) * scaleX;
    if (cIdx < columns.length - 1) {
      currentX += colW;
      sketchyLine(ctx, currentX, y, currentX, y + h, seed + 300 + cIdx * 43, roughness);
    }
  });

  // 6. Rows & Row divider lines
  if (rows.length > 0) {
    const bodyHeight = h - headerHeight;
    const rowH = bodyHeight / rows.length;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      if (rIdx < rows.length - 1) {
        const rowY = y + headerHeight + (rIdx + 1) * rowH;
        sketchyLine(ctx, x, rowY, x + w, rowY, seed + 200 + rIdx * 37, roughness);
      }
    }

    // 7. Render Text (Headers and Cells)
    const fontStack = getFontStack(el.fontFamily || 5);
    ctx.font = `bold 20px ${fontStack}`;
    ctx.fillStyle = strokeColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Header text
    let hX = x;
    columns.forEach((col) => {
      const colW = (col.width || 200) * scaleX;
      ctx.fillText(col.title || '', hX + colW / 2, y + headerHeight / 2);
      hX += colW;
    });

    // Cell text
    ctx.font = `18px ${fontStack}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    rows.forEach((row, rIdx) => {
      const cellY = y + headerHeight + rIdx * rowH + 12;
      let cellX = x;
      columns.forEach((col) => {
        const colW = (col.width || 200) * scaleX;
        const text = row.cells?.[col.id] || '';
        if (text) {
          ctx.fillText(text, cellX + 16, cellY, colW - 32);
        }
        cellX += colW;
      });
    });
  }
}

// Draw a single element to the canvas context
export function renderElement(ctx, el, imageCache = {}) {
  if (el.isDeleted || el.isHidden) return;
  if ((el.opacity ?? 100) === 0) return;

  // Ultra-fast GPU Path2D zero-overhead path for FREEDRAW
  // Bypasses heavy ctx.save() / ctx.restore() context state stack operations
  if (el.type === ELEMENT_TYPES.FREEDRAW && (!el.angle || Math.abs(el.angle) < 0.0001)) {
    if (!el.points || el.points.length === 0) return;
    const pts = el.points;
    const baseWidth = STROKE_WIDTHS[el.strokeWidth] ?? (typeof el.strokeWidth === 'number' ? el.strokeWidth : 2);
    if (typeof Path2D !== 'undefined') {
      if (!el._cachedPath2D || el._cachedPoints !== pts || el._cachedBaseWidth !== baseWidth) {
        el._cachedPath2D = createSmoothFreedrawPath(pts, baseWidth);
        el._cachedPoints = pts;
        el._cachedBaseWidth = baseWidth;
      }
      if (el._cachedPath2D) {
        const strokeColor = el.strokeColor || '#1e1e1e';
        if (ctx.strokeStyle !== strokeColor) ctx.strokeStyle = strokeColor;
        if (ctx.lineWidth !== baseWidth) ctx.lineWidth = baseWidth;
        if (ctx.lineCap !== 'round') ctx.lineCap = 'round';
        if (ctx.lineJoin !== 'round') ctx.lineJoin = 'round';
        const hasOpacity = el.opacity !== undefined && el.opacity < 100;
        if (hasOpacity) ctx.globalAlpha = (el.opacity / 100);

        const x = el.x || 0;
        const y = el.y || 0;
        if (x === 0 && y === 0) {
          ctx.stroke(el._cachedPath2D);
        } else {
          ctx.translate(x, y);
          ctx.stroke(el._cachedPath2D);
          ctx.translate(-x, -y);
        }
        if (hasOpacity) ctx.globalAlpha = 1;
        return;
      }
    }
  }

  ctx.save();

  // Apply rotation if needed
  if (el.angle && Math.abs(el.angle) > 0.0001) {
    const [cx, cy] = getElementCenter(el);
    ctx.translate(cx, cy);
    ctx.rotate(el.angle);
    ctx.translate(-cx, -cy);
  }

  applyBaseStyle(ctx, el);

  const { type, x, y, width: w, height: h, seed = 0, roughness = 1 } = el;

  switch (type) {
    case ELEMENT_TYPES.RECTANGLE: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      const roundRadius = isSharp
        ? 0
        : Math.min(rw / 2, rh / 2, typeof edgeMode === 'number' ? edgeMode : Math.min(32, Math.max(12, Math.min(rw, rh) * 0.18)));

      const poly = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]];

      // If rounded, clip background fill so hachure/solid never bleeds outside round corners
      if (roundRadius > 0 && el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, rw, rh, roundRadius);
        } else {
          ctx.moveTo(rx + roundRadius, ry);
          ctx.lineTo(rx + rw - roundRadius, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + roundRadius);
          ctx.lineTo(rx + rw, ry + rh - roundRadius);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - roundRadius, ry + rh);
          ctx.lineTo(rx + roundRadius, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - roundRadius);
          ctx.lineTo(rx, ry + roundRadius);
          ctx.quadraticCurveTo(rx, ry, rx + roundRadius, ry);
          ctx.closePath();
        }
        ctx.clip();
        applyFill(ctx, el, poly);
        ctx.restore();
      } else {
        applyFill(ctx, el, poly);
      }
      if (roughness > 0 && roundRadius > 0) {
        sketchyRoundedRect(ctx, rx, ry, rw, rh, roundRadius, seed, roughness);
      } else if (roughness > 0) {
        sketchyRect(ctx, rx, ry, rw, rh, seed, roughness);
      } else {
        ctx.beginPath();
        if (roundRadius > 0) {
          ctx.moveTo(rx + roundRadius, ry);
          ctx.lineTo(rx + rw - roundRadius, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + roundRadius);
          ctx.lineTo(rx + rw, ry + rh - roundRadius);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - roundRadius, ry + rh);
          ctx.lineTo(rx + roundRadius, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - roundRadius);
          ctx.lineTo(rx, ry + roundRadius);
          ctx.quadraticCurveTo(rx, ry, rx + roundRadius, ry);
          ctx.closePath();
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
        ctx.stroke();
      }
      break;
    }

    case ELEMENT_TYPES.ELLIPSE: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = rw / 2;
      const ry = rh / 2;
      const cx = (w < 0 ? x + w : x) + rx;
      const cy = (h < 0 ? y + h : y) + ry;
      const steps = Math.max(32, Math.ceil(Math.PI * (rx + ry) / 6));
      const poly = Array.from({ length: steps }, (_, i) => {
        const t = (i / steps) * Math.PI * 2;
        return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
      });
      applyFill(ctx, el, poly);
      sketchyEllipse(ctx, cx, cy, rx, ry, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.DIAMOND: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const dx = w < 0 ? x + w : x;
      const dy = h < 0 ? y + h : y;
      const cx2 = dx + rw / 2;
      const cy2 = dy + rh / 2;

      const edgeMode = el.roundness;
      const isSharp = !edgeMode || edgeMode === 'sharp' || edgeMode === false || edgeMode === 0;

      const halfW = rw / 2;
      const halfH = rh / 2;
      const edgeLen = Math.hypot(halfW, halfH);
      const cr = isSharp ? 0 : Math.min(edgeLen * 0.28, Math.min(32, Math.max(10, edgeLen * 0.2)));
      const ux = edgeLen > 0 ? (halfW / edgeLen) * cr : 0;
      const uy = edgeLen > 0 ? (halfH / edgeLen) * cr : 0;

      const T_in = [cx2 - ux, dy + uy];
      const T_out = [cx2 + ux, dy + uy];
      const R_in = [dx + rw - ux, cy2 - uy];
      const R_out = [dx + rw - ux, cy2 + uy];
      const B_in = [cx2 + ux, dy + rh - uy];
      const B_out = [cx2 - ux, dy + rh - uy];
      const L_in = [dx + ux, cy2 + uy];
      const L_out = [dx + ux, cy2 - uy];

      const poly2 = [];
      if (!isSharp && cr > 0) {
        const sampleQuad = (p0, cp, p1, steps = 12) => {
          const pts = [];
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const omt = 1 - t;
            const px = omt * omt * p0[0] + 2 * omt * t * cp[0] + t * t * p1[0];
            const py = omt * omt * p0[1] + 2 * omt * t * cp[1] + t * t * p1[1];
            pts.push([px, py]);
          }
          return pts;
        };

        poly2.push(T_out);
        poly2.push(R_in);
        poly2.push(...sampleQuad(R_in, [dx + rw, cy2], R_out, 12));
        poly2.push(B_in);
        poly2.push(...sampleQuad(B_in, [cx2, dy + rh], B_out, 12));
        poly2.push(L_in);
        poly2.push(...sampleQuad(L_in, [dx, cy2], L_out, 12));
        poly2.push(T_in);
        poly2.push(...sampleQuad(T_in, [cx2, dy], T_out, 12));
      } else {
        poly2.push([cx2, dy], [dx + rw, cy2], [cx2, dy + rh], [dx, cy2]);
      }

      if (!isSharp && cr > 0 && el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(T_out[0], T_out[1]);
        ctx.lineTo(R_in[0], R_in[1]);
        ctx.quadraticCurveTo(dx + rw, cy2, R_out[0], R_out[1]);
        ctx.lineTo(B_in[0], B_in[1]);
        ctx.quadraticCurveTo(cx2, dy + rh, B_out[0], B_out[1]);
        ctx.lineTo(L_in[0], L_in[1]);
        ctx.quadraticCurveTo(dx, cy2, L_out[0], L_out[1]);
        ctx.lineTo(T_in[0], T_in[1]);
        ctx.quadraticCurveTo(cx2, dy, T_out[0], T_out[1]);
        ctx.closePath();
        if (el.fillStyle === 'solid') {
          ctx.fillStyle = el.backgroundColor;
          ctx.fill();
        } else {
          ctx.clip();
          applyFill(ctx, el, poly2);
        }
        ctx.restore();
      } else {
        applyFill(ctx, el, poly2);
      }

      if (roughness === 0) {
        ctx.beginPath();
        if (!isSharp && cr > 0) {
          ctx.moveTo(T_out[0], T_out[1]);
          ctx.lineTo(R_in[0], R_in[1]);
          ctx.quadraticCurveTo(dx + rw, cy2, R_out[0], R_out[1]);
          ctx.lineTo(B_in[0], B_in[1]);
          ctx.quadraticCurveTo(cx2, dy + rh, B_out[0], B_out[1]);
          ctx.lineTo(L_in[0], L_in[1]);
          ctx.quadraticCurveTo(dx, cy2, L_out[0], L_out[1]);
          ctx.lineTo(T_in[0], T_in[1]);
          ctx.quadraticCurveTo(cx2, dy, T_out[0], T_out[1]);
          ctx.closePath();
        } else {
          ctx.moveTo(cx2, dy);
          ctx.lineTo(dx + rw, cy2);
          ctx.lineTo(cx2, dy + rh);
          ctx.lineTo(dx, cy2);
          ctx.closePath();
        }
        ctx.stroke();
      } else {
        sketchyDiamond(ctx, dx, dy, rw, rh, seed, roughness, !isSharp && cr > 0);
      }
      break;
    }

    case ELEMENT_TYPES.TRIANGLE: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getTriangleVertices(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyTriangle(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.STAR: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getStarVertices(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyStar(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.HEXAGON: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getHexagonVertices(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyHexagon(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.OCTAGON: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getOctagonVertices(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyOctagon(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.PARALLELOGRAM: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getParallelogramVertices(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyParallelogram(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.CAPSULE: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const radius = Math.min(rw, rh) / 2;
      const poly = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]];
      if (radius > 0 && el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
        ctx.clip();
        applyFill(ctx, el, poly);
        ctx.restore();
      }
      sketchyCapsule(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.CYLINDER: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getCylinderPolygon(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyCylinder(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.CLOUD: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const poly = getCloudPolygon(rx, ry, rw, rh);
      applyFill(ctx, el, poly);
      sketchyCloud(ctx, rx, ry, rw, rh, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.ARROW:
    case ELEMENT_TYPES.LINE: {
      if (!el.points || el.points.length < 2) break;
      const pts = el.points;
      const edgeMode = el.roundness;
      const isSharp = !edgeMode || edgeMode === 'sharp' || edgeMode === false || edgeMode === 0;
      const isOrthogonal = el.routing === 'orthogonal' || edgeMode === 'elbow';

      let effectiveHeadBefore = [x + pts[pts.length - 2][0], y + pts[pts.length - 2][1]];
      let effectiveHeadTip = [x + pts[pts.length - 1][0], y + pts[pts.length - 1][1]];
      let effectiveStartTip = [x + pts[0][0], y + pts[0][1]];
      let effectiveStartBefore = [x + pts[1][0], y + pts[1][1]];

      if (isOrthogonal) {
        const startPt = [x + pts[0][0], y + pts[0][1]];
        const endPt = [x + pts[pts.length - 1][0], y + pts[pts.length - 1][1]];
        const orthoPts = computeOrthogonalPoints(startPt, endPt);
        renderOrthogonalPath(ctx, orthoPts, isSharp ? 0 : 8, roughness, seed);
        if (orthoPts.length >= 2) {
          effectiveHeadBefore = orthoPts[orthoPts.length - 2];
          effectiveHeadTip = orthoPts[orthoPts.length - 1];
          effectiveStartTip = orthoPts[0];
          effectiveStartBefore = orthoPts[1];
        }
      } else if (!isSharp && pts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(x + pts[0][0], y + pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (x + pts[i][0] + x + pts[i + 1][0]) / 2;
          const yc = (y + pts[i][1] + y + pts[i + 1][1]) / 2;
          ctx.quadraticCurveTo(x + pts[i][0], y + pts[i][1], xc, yc);
        }
        ctx.lineTo(x + pts[pts.length - 1][0], y + pts[pts.length - 1][1]);
        ctx.stroke();
      } else {
        // Draw line segments
        for (let i = 0; i < pts.length - 1; i++) {
          const ax = x + pts[i][0], ay = y + pts[i][1];
          const bx = x + pts[i + 1][0], by = y + pts[i + 1][1];
          sketchyLine(ctx, ax, ay, bx, by, seed + i * 7, roughness);
        }
      }

      // Draw arrowhead if arrow type
      if (type === ELEMENT_TYPES.ARROW) {
        const tip = effectiveHeadTip;
        const before = effectiveHeadBefore;
        const arrowSize = Math.max(10, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 5);

        const headPts = getArrowheadPoints(before[0], before[1], tip[0], tip[1], arrowSize);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(headPts[1][0], headPts[1][1]);
        ctx.lineTo(headPts[0][0], headPts[0][1]);
        ctx.lineTo(headPts[2][0], headPts[2][1]);
        ctx.fillStyle = el.strokeColor || '#1e1e1e';
        ctx.fill();
        ctx.stroke();

        // Start arrowhead if bidirectional
        if (el.startArrowhead === 'arrow') {
          const tipS = effectiveStartTip;
          const beforeS = effectiveStartBefore;
          const headS = getArrowheadPoints(beforeS[0], beforeS[1], tipS[0], tipS[1], arrowSize);
          ctx.beginPath();
          ctx.moveTo(headS[1][0], headS[1][1]);
          ctx.lineTo(headS[0][0], headS[0][1]);
          ctx.lineTo(headS[2][0], headS[2][1]);
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }

    case ELEMENT_TYPES.FREEDRAW: {
      if (!el.points || el.points.length === 0) break;
      const pts = el.points;
      const baseWidth = STROKE_WIDTHS[el.strokeWidth] ?? (typeof el.strokeWidth === 'number' ? el.strokeWidth : 2);

      // Ultra-fast GPU Path2D path (bypasses heavy ctx.save/restore context stack overhead)
      if (typeof Path2D !== 'undefined') {
        if (!el._cachedPath2D || el._cachedPoints !== pts || el._cachedBaseWidth !== baseWidth) {
          el._cachedPath2D = createSmoothFreedrawPath(pts, baseWidth);
          el._cachedPoints = pts;
          el._cachedBaseWidth = baseWidth;
        }
        if (el._cachedPath2D) {
          ctx.strokeStyle = el.strokeColor || '#1e1e1e';
          ctx.lineWidth = baseWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const hasOpacity = el.opacity !== undefined && el.opacity < 100;
          if (hasOpacity) ctx.globalAlpha = (el.opacity / 100);
          ctx.translate(x, y);
          ctx.stroke(el._cachedPath2D);
          ctx.translate(-x, -y);
          if (hasOpacity) ctx.globalAlpha = 1;
          break;
        }
      }

      ctx.save();
      ctx.strokeStyle = el.strokeColor || '#1e1e1e';
      ctx.fillStyle = el.strokeColor || '#1e1e1e';
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = (el.opacity ?? 100) / 100;
      if (el.strokeStyle === 'dashed') {
        ctx.setLineDash([baseWidth * 4, baseWidth * 3]);
      } else if (el.strokeStyle === 'dotted') {
        ctx.setLineDash([baseWidth, baseWidth * 2]);
      } else {
        ctx.setLineDash([]);
      }
      renderSmoothFreedraw(ctx, x, y, pts, baseWidth);
      ctx.restore();
      break;
    }


    case ELEMENT_TYPES.TEXT: {
      const { text, fontSize = 20, fontFamily = 5, textAlign = 'left', lineHeight = 1.25, strokeColor = '#1e1e1e', width: w } = el;
      if (!text) break;

      ctx.font = `${fontSize}px ${getFontStack(fontFamily)}`;
      ctx.fillStyle = strokeColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = textAlign;

      // Automatically wrap text to container width if defined and positive
      const maxW = el.containerId && w && w > 0 ? w : 0;
      const lines = maxW > 0 ? wrapText(ctx, text, maxW) : text.split('\n');
      const lineH = fontSize * lineHeight;
      let baseX = x;
      if (textAlign === 'center') baseX = x + (w || 0) / 2;
      else if (textAlign === 'right') baseX = x + (w || 0);

      ctx.setLineDash([]);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], baseX, y + i * lineH);
      }
      break;
    }

    case ELEMENT_TYPES.IMAGE: {
      const cached = imageCache[el.fileId || el.id];
      if (cached && cached.complete) {
        ctx.drawImage(cached, x, y, w, h);
      } else {
        // Draw placeholder
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Image', x + w / 2, y + h / 2);
      }
      break;
    }

    case ELEMENT_TYPES.IFRAME:
    case 'embeddable': {
      if (el.docType === 'interactive_table') {
        if (imageCache?.__isExporting || ctx.__isExporting) {
          renderInteractiveTableCanvas(ctx, el);
        }
        break;
      }

      // Embeddables (math_graph, code_runner, markdown, pdf, web_frame, etc.)
      // are rendered live via React DOM overlay. Do NOT draw a canvas black box or placeholder on the interactive canvas.
      if (!imageCache?.__isExporting && !ctx.__isExporting) {
        break;
      }

      // Draw placeholder for iframes/embeds only during static export
      ctx.fillStyle = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : '#18181b';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = el.strokeColor || '#d4d4d8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.title || el.name || el.link || 'Embed Card', x + w / 2, y + h / 2);
      break;
    }

    case ELEMENT_TYPES.BOARD_PORTAL: {
      const radius = Math.min(12, Math.abs(w) / 8, Math.abs(h) / 8);
      ctx.save();
      ctx.fillStyle = el.backgroundColor && el.backgroundColor !== 'transparent'
        ? el.backgroundColor
        : (el.portalTheme === 'dark' ? '#18181b' : '#ffffff');
      ctx.strokeStyle = el.strokeColor || '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
      else ctx.rect(x, y, w, h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = el.portalTheme === 'dark' ? '#a5b4fc' : '#4f46e5';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('BOARD PORTAL', x + 14, y + 13);
      ctx.fillStyle = el.portalTheme === 'dark' ? '#f4f4f5' : '#18181b';
      ctx.font = '600 16px sans-serif';
      ctx.fillText(el.portalFileName || 'Untitled board', x + 14, y + 34, Math.max(0, w - 28));
      ctx.fillStyle = el.portalTheme === 'dark' ? '#a1a1aa' : '#71717a';
      ctx.font = '12px sans-serif';
      ctx.fillText(el.portalWorkspaceName || 'Workspace', x + 14, y + 58, Math.max(0, w - 28));
      ctx.fillStyle = el.portalTheme === 'dark' ? '#27272a' : '#f4f4f5';
      ctx.fillRect(x + 14, y + 82, Math.max(0, w - 28), Math.max(0, h - 96));
      ctx.fillStyle = el.portalTheme === 'dark' ? '#52525b' : '#d4d4d8';
      ctx.fillRect(x + 24, y + 92, Math.max(0, w * 0.36), 5);
      ctx.fillRect(x + 24, y + 103, Math.max(0, w * 0.62), 5);
      ctx.fillRect(x + 24, y + 114, Math.max(0, w * 0.48), 5);
      ctx.restore();
      break;
    }

    case ELEMENT_TYPES.FRAME: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));

      ctx.save();
      const strokeW = STROKE_WIDTHS[el.strokeWidth] ?? el.strokeWidth ?? 1.5;
      ctx.strokeStyle = el.strokeColor || '#71717a';
      ctx.lineWidth = strokeW;

      // Respect user's selected strokeStyle: solid, dashed, or dotted
      if (el.strokeStyle === 'dotted') {
        ctx.setLineDash([strokeW * 1.5, strokeW * 3]);
      } else if (el.strokeStyle === 'dashed') {
        ctx.setLineDash([strokeW * 4 + 4, strokeW * 3 + 3]);
      } else {
        ctx.setLineDash([]); // Straight solid line!
      }

      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      const frameRadius = isSharp ? 0 : Math.min(rw / 2, rh / 2, typeof edgeMode === 'number' ? edgeMode : 8);

      ctx.beginPath();
      if (frameRadius > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(rx, ry, rw, rh, frameRadius);
      } else if (frameRadius > 0) {
        ctx.moveTo(rx + frameRadius, ry);
        ctx.lineTo(rx + rw - frameRadius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + frameRadius);
        ctx.lineTo(rx + rw, ry + rh - frameRadius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - frameRadius, ry + rh);
        ctx.lineTo(rx + frameRadius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - frameRadius);
        ctx.lineTo(rx, ry + frameRadius);
        ctx.quadraticCurveTo(rx, ry, rx + frameRadius, ry);
        ctx.closePath();
      } else {
        ctx.rect(rx, ry, rw, rh);
      }

      if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Frame Name Pill / Header tag
      const name = el.name || 'Frame';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(name);
      const pillWidth = Math.max(54, textMetrics.width + 16);
      const pillHeight = 22;
      const pillX = rx;
      const pillY = ry - pillHeight - 4;

      const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
      const radius = 5;
      ctx.fillStyle = isLight ? '#f4f4f5' : '#1e1e24';
      ctx.strokeStyle = el.strokeColor || (isLight ? '#d4d4d8' : '#3f3f46');
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, radius);
      } else {
        ctx.rect(pillX, pillY, pillWidth, pillHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Draw tag text
      ctx.fillStyle = isLight ? '#18181b' : '#e4e4e7';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, pillX + 8, pillY + pillHeight / 2);
      ctx.restore();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

// Wrap text cleanly to fit within maxWidth
export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  if (!maxWidth || maxWidth <= 0) return text.split('\n');

  const paragraphs = text.split('\n');
  const resultLines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      resultLines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = word;
        } else {
          // Word itself exceeds maxWidth: character-level wrap
          let subWord = '';
          for (const char of word) {
            const testChar = subWord + char;
            if (ctx.measureText(testChar).width <= maxWidth) {
              subWord = testChar;
            } else {
              if (subWord) resultLines.push(subWord);
              subWord = char;
            }
          }
          currentLine = subWord;
        }
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

// Shared measurement canvas context to avoid allocating a new DOM canvas on every frame / text measurement
let sharedMeasureCanvas = null;
let sharedMeasureCtx = null;

function getSharedMeasureCtx() {
  if (typeof document === 'undefined') return null;
  if (!sharedMeasureCtx) {
    sharedMeasureCanvas = document.createElement('canvas');
    sharedMeasureCtx = sharedMeasureCanvas.getContext ? sharedMeasureCanvas.getContext('2d') : null;
  }
  return sharedMeasureCtx;
}

// Measure text element dimensions
export function measureText(text, fontSize, fontFamily = 5, maxWidth = null) {
  const ctx = getSharedMeasureCtx();
  if (!ctx) {
    const lines = (text || '').split('\n');
    let maxLen = 0;
    for (const line of lines) {
      if (line.length > maxLen) maxLen = line.length;
    }
    return {
      width: Math.ceil(maxLen * fontSize * 0.6) + 2,
      height: Math.ceil(lines.length * fontSize * 1.25) + 2,
      lines,
    };
  }
  ctx.font = `${fontSize}px ${getFontStack(fontFamily)}`;
  const lines = maxWidth && maxWidth > 0 ? wrapText(ctx, text, maxWidth) : (text || '').split('\n');
  let maxW = 0;
  for (const line of lines) {
    const m = ctx.measureText(line || ' ');
    if (m.width > maxW) maxW = m.width;
  }
  return {
    width: Math.ceil(maxWidth && maxWidth > 0 ? Math.min(maxWidth, maxW) : maxW) + 2,
    height: Math.ceil(lines.length * fontSize * 1.25) + 2,
    lines,
  };
}

export function getTextElementBounds(element) {
  const text = element.text || '';
  const maxWidth = element.containerId && element.width > 0 ? element.width : null;
  const measured = text
    ? measureText(
      text,
      element.fontSize || 20,
      element.fontFamily,
      maxWidth
    )
    : { width: 0, height: 0 };
  return {
    x: element.x,
    y: element.y,
    width: element.width > 0 ? element.width : measured.width,
    height: measured.height,
  };
}

// Render single element selection box & handles
function renderSingleElementSelection(ctx, el, zoom = 1) {
  ctx.save();

  const pointBounds = el.type === ELEMENT_TYPES.FREEDRAW && el.points?.length
    ? getBoundsFromPoints(el.points)
    : null;
  const localBounds = pointBounds
    ? { x: el.x + pointBounds.x, y: el.y + pointBounds.y, width: pointBounds.width, height: pointBounds.height }
    : el.type === ELEMENT_TYPES.TEXT
      ? getTextElementBounds(el)
      : { x: el.x, y: el.y, width: el.width, height: el.height };

  if (el.angle && Math.abs(el.angle) > 0.0001) {
    const [cx, cy] = [localBounds.x + localBounds.width / 2, localBounds.y + localBounds.height / 2];
    ctx.translate(cx, cy);
    ctx.rotate(el.angle);
    ctx.translate(-cx, -cy);
  }

  const padding = 4 / zoom;
  const rx = localBounds.x - padding;
  const ry = localBounds.y - padding;
  const rw = localBounds.width + padding * 2;
  const rh = localBounds.height + padding * 2;

  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  const handleBg = isLight ? '#ffffff' : '#232329';
  const primaryColor = isLight ? '#6366f1' : '#818cf8';

  // Dedicated linear selection handles for Arrow & Line (Doodle style: Start circle, Midpoint filled purple circle, End circle - NO bounding box or corner squares!)
  if (el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) {
    if (el.points?.length >= 2) {
      const strokeW = 1.8 / zoom;
      const pts = el.points;
      const startX = el.x + pts[0][0];
      const startY = el.y + pts[0][1];
      const endX = el.x + pts[pts.length - 1][0];
      const endY = el.y + pts[pts.length - 1][1];

      // 1. Start handle: hollow circular handle with theme bg
      ctx.fillStyle = handleBg;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.arc(startX, startY, 5.5 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Midpoint handle(s): solid filled purple circle ● as shown in screenshot
      for (let i = 0; i < pts.length - 1; i++) {
        const p1x = el.x + pts[i][0];
        const p1y = el.y + pts[i][1];
        const p2x = el.x + pts[i + 1][0];
        const p2y = el.y + pts[i + 1][1];
        const mx = (p1x + p2x) / 2;
        const my = (p1y + p2y) / 2;

        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(mx, my, 4.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // Intermediate vertex handles if multi-point arrow/line
      for (let i = 1; i < pts.length - 1; i++) {
        const vx = el.x + pts[i][0];
        const vy = el.y + pts[i][1];
        ctx.fillStyle = handleBg;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = strokeW;
        ctx.beginPath();
        ctx.arc(vx, vy, 5.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 3. End handle: hollow circular handle with theme bg
      ctx.fillStyle = handleBg;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.arc(endX, endY, 5.5 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Selection box for shapes, text, frames, freedraw
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(rx, ry, rw, rh);

  // Corner handles
  const handleSize = 8 / zoom;
  const corners = [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]];

  ctx.fillStyle = isLight ? '#ffffff' : '#18181b';
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5 / zoom;
  for (const [hx, hy] of corners) {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }

  // Rotation handle (frames cannot be rotated)
  if (el.type !== ELEMENT_TYPES.FRAME) {
    const rotHandleX = rx + rw / 2;
    const rotHandleY = ry - 20 / zoom;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rx + rw / 2, ry);
    ctx.lineTo(rotHandleX, rotHandleY);
    ctx.stroke();

    ctx.fillStyle = isLight ? '#ffffff' : '#18181b';
    ctx.strokeStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(rotHandleX, rotHandleY, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // For selected frames, highlight the tag pill with purple selection outline
  if (el.type === ELEMENT_TYPES.FRAME) {
    const name = el.name || 'Frame';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textMetrics = ctx.measureText(name);
    const pillWidth = Math.max(54, textMetrics.width + 16);
    const pillHeight = 22;
    const pillX = localBounds.x;
    const pillY = localBounds.y - pillHeight - 4;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 5);
    else ctx.rect(pillX, pillY, pillWidth, pillHeight);
    ctx.stroke();
  }

  ctx.restore();
}

// Render hit-test overlay (selection box + handles)
export function renderSelectionOverlay(ctx, elements, zoom = 1) {
  if (!elements || elements.length === 0) return;
  const validElements = elements.filter(el => !el.isDeleted);
  if (validElements.length === 0) return;

  // Single element or standard multi-selection (up to 16 elements):
  // Render dedicated individual handles directly on each element
  if (validElements.length <= 16) {
    for (const el of validElements) {
      renderSingleElementSelection(ctx, el, zoom);
    }
    return;
  }

  // Multi-element selection: compute unified group bounding box (eliminates thousands of redundant handle calls)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < validElements.length; i++) {
    const el = validElements[i];
    const b = el.type === ELEMENT_TYPES.TEXT ? getTextElementBounds(el) : getCachedElementBounds(el);
    const left = Math.min(b.x, b.x + b.width);
    const right = Math.max(b.x, b.x + b.width);
    const top = Math.min(b.y, b.y + b.height);
    const bottom = Math.max(b.y, b.y + b.height);

    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  if (minX === Infinity || maxX === -Infinity) return;

  ctx.save();

  // Draw unified group selection box
  const padding = 6 / zoom;
  const rx = minX - padding;
  const ry = minY - padding;
  const rw = (maxX - minX) + padding * 2;
  const rh = (maxY - minY) + padding * 2;

  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.setLineDash([]);

  // Corner resize handles for the entire group
  const handleSize = 8 / zoom;
  const corners = [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]];
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 1.5 / zoom;
  for (const [hx, hy] of corners) {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }

  // Rotation handle for the entire group
  const rotHandleX = rx + rw / 2;
  const rotHandleY = ry - 20 / zoom;
  ctx.beginPath();
  ctx.moveTo(rx + rw / 2, ry);
  ctx.lineTo(rotHandleX, rotHandleY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, 5 / zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Floating selection pill count badge
  const countText = `${validElements.length} shapes`;
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textW = ctx.measureText ? ctx.measureText(countText).width : 60;
  const pillW = textW + 14;
  const pillH = 20 / zoom;
  const pillX = rx;
  const pillY = ry - pillH - 6 / zoom;

  ctx.fillStyle = '#6366f1';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 4 / zoom);
    ctx.fill();
  } else {
    ctx.fillRect(pillX, pillY, pillW, pillH);
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(countText, pillX + 7, pillY + pillH / 2);

  ctx.restore();
}

export function renderElementToCanvas(el, ctx, options = {}) {
  return renderElement(ctx, el, options.imageCache || {});
}

