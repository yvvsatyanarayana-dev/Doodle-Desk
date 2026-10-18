// Hand-Drawn Stroke & Sloppiness Engine
// Native hand-drawn rendering engine without external dependencies:
// - Roughness 0: Architect (perfectly straight lines, zero wobble, zero overshoot)
// - Roughness 1: Artist (2 bowed overlapping passes, subtle corner overshoots)
// - Roughness 2: Cartoonist (extra wobbly, expressive sketchy strokes with pronounced corner overshoots)

const hachurePathCache = new WeakMap();

function pseudoRandom(seed) {
  // Mulberry32 LCG
  let s = (seed | 0) || 12345;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw a single sketchy line with corner overshoots and bowing.
 * Architect (0): single crisp straight line.
 * Artist (1): 2 passes with subtle corner overshoots & opposite bowing.
 * Cartoonist (2): 2-3 passes with larger overshoots and expressive wobble.
 */
export function sketchyLine(ctx, x1, y1, x2, y2, seed, roughness = 1, batch = false) {
  if (roughness < 0.1) {
    // Architect — perfectly straight
    if (!batch) ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (!batch) ctx.stroke();
    return;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;

  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;

  // Corner overshoot: strokes extend slightly past their endpoints
  // Artist (1) = 2.5px to 4px; Cartoonist (2) = 5px to 8px
  const maxOvershoot = roughness === 1 ? Math.min(len * 0.06, 3.8) : Math.min(len * 0.1, 7.2);
  // Bowing: midpoint lateral deflection (creates natural hand-drawn bend)
  const maxBow = roughness === 1 ? Math.min(len * 0.028, 2.2) : Math.min(len * 0.05, 4.4);

  const passes = roughness >= 2 ? 3 : 2;

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 17923 + 31);

    // End-point offset & overshoot along stroke direction
    const startOvershoot = (rng() * 0.7 + 0.3) * maxOvershoot * (pass === 0 ? 1 : 0.6);
    const endOvershoot = (rng() * 0.7 + 0.3) * maxOvershoot * (pass === 0 ? 0.7 : 1);

    // Subtle perpendicular wobble at start & end
    const startJitter = (rng() - 0.5) * (roughness === 1 ? 0.7 : 1.6);
    const endJitter = (rng() - 0.5) * (roughness === 1 ? 0.7 : 1.6);

    const sx = x1 - ux * startOvershoot + perpX * startJitter;
    const sy = y1 - uy * startOvershoot + perpY * startJitter;
    const ex = x2 + ux * endOvershoot + perpX * endJitter;
    const ey = y2 + uy * endOvershoot + perpY * endJitter;

    // Bow deflection: Pass 0 curves one way, Pass 1 curves slightly the opposite way
    const bowSign = pass % 2 === 0 ? 1 : -1;
    const bowAmt = bowSign * (0.5 + rng() * 0.6) * maxBow;

    // Cubic bezier control points at 1/3 and 2/3 along line
    const t1 = 0.33, t2 = 0.67;
    const cp1x = sx + (ex - sx) * t1 + perpX * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));
    const cp1y = sy + (ey - sy) * t1 + perpY * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));
    const cp2x = sx + (ex - sx) * t2 + perpX * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));
    const cp2y = sy + (ey - sy) * t2 + perpY * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));

    if (!batch) ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
    if (!batch) ctx.stroke();
  }
}

/**
 * Draw a sketchy rectangle with corner crosses.
 * All 4 edges overshoot and meet at corners with natural hand-drawn overlaps.
 */
export function sketchyRect(ctx, x, y, w, h, seed, roughness = 1) {
  if (roughness < 0.1) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
    return;
  }
  // Top: left to right
  sketchyLine(ctx, x, y, x + w, y, seed, roughness);
  // Right: top to bottom
  sketchyLine(ctx, x + w, y, x + w, y + h, seed + 101, roughness);
  // Bottom: right to left
  sketchyLine(ctx, x + w, y + h, x, y + h, seed + 202, roughness);
  // Left: bottom to top
  sketchyLine(ctx, x, y + h, x, y, seed + 303, roughness);
}

/**
 * Helper to draw a sketchy hand-drawn arc (used in rounded rectangle corners & cylinder bases).
 */
export function drawSketchyArc(ctx, cx, cy, r, startAngle, endAngle, seed, roughness = 1, ry = null) {
  if (r <= 0.5) return;
  const actualRy = ry !== null ? ry : r;
  const passes = roughness >= 2 ? 2 : 1;
  const steps = 12;
  const sweep = endAngle - startAngle;

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 731);
    const jAmt = roughness * 0.6;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (i / steps) * sweep;
      const jrX = r + (rng() - 0.5) * jAmt;
      const jrY = actualRy + (rng() - 0.5) * jAmt;
      const px = cx + Math.cos(a) * jrX;
      const py = cy + Math.sin(a) * jrY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

/**
 * Draw a rounded rectangle with seed-stable hand-drawn strokes.
 */
export function sketchyRoundedRect(ctx, x, y, w, h, radius, seed, roughness = 1) {
  const r = Math.min(radius, Math.min(w, h) / 2);
  if (r <= 0.5) {
    sketchyRect(ctx, x, y, w, h, seed, roughness);
    return;
  }

  if (roughness < 0.1) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    ctx.stroke();
    return;
  }

  const passes = roughness >= 2 ? 2 : 1;
  const steps = 8;

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 731);
    const jAmt = roughness * 0.5;

    ctx.beginPath();
    ctx.moveTo(x + w - r, y);

    // Corner 1: top-right arc (-PI/2 to 0)
    for (let i = 1; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      ctx.lineTo(x + w - r + Math.cos(a) * jr, y + r + Math.sin(a) * jr);
    }

    // Right edge
    ctx.lineTo(x + w + (rng() - 0.5) * jAmt, y + h - r);

    // Corner 2: bottom-right arc (0 to PI/2)
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      ctx.lineTo(x + w - r + Math.cos(a) * jr, y + h - r + Math.sin(a) * jr);
    }

    // Bottom edge
    ctx.lineTo(x + r, y + h + (rng() - 0.5) * jAmt);

    // Corner 3: bottom-left arc (PI/2 to PI)
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI / 2 + (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      ctx.lineTo(x + r + Math.cos(a) * jr, y + h - r + Math.sin(a) * jr);
    }

    // Left edge
    ctx.lineTo(x + (rng() - 0.5) * jAmt, y + r);

    // Corner 4: top-left arc (PI to 3*PI/2)
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI + (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      ctx.lineTo(x + r + Math.cos(a) * jr, y + r + Math.sin(a) * jr);
    }

    // Top edge back to start
    ctx.lineTo(x + w - r, y + (rng() - 0.5) * jAmt);

    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * Generate an SVG path data string ('d') for a sketchy hand-drawn line.
 * Matches sketchyLine with double-pass bowed curve and corner overshoots.
 */
export function generateSketchyLinePath(x1, y1, x2, y2, seed = 0, roughness = 1) {
  if (roughness < 0.1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return '';

  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;

  const maxOvershoot = roughness === 1 ? Math.min(len * 0.06, 3.8) : Math.min(len * 0.1, 7.2);
  const maxBow = roughness === 1 ? Math.min(len * 0.028, 2.2) : Math.min(len * 0.05, 4.4);
  const passes = roughness >= 2 ? 3 : 2;

  let d = '';

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 17923 + 31);

    const startOvershoot = (rng() * 0.7 + 0.3) * maxOvershoot * (pass === 0 ? 1 : 0.6);
    const endOvershoot = (rng() * 0.7 + 0.3) * maxOvershoot * (pass === 0 ? 0.7 : 1);

    const startJitter = (rng() - 0.5) * (roughness === 1 ? 0.7 : 1.6);
    const endJitter = (rng() - 0.5) * (roughness === 1 ? 0.7 : 1.6);

    const sx = x1 - ux * startOvershoot + perpX * startJitter;
    const sy = y1 - uy * startOvershoot + perpY * startJitter;
    const ex = x2 + ux * endOvershoot + perpX * endJitter;
    const ey = y2 + uy * endOvershoot + perpY * endJitter;

    const bowSign = pass % 2 === 0 ? 1 : -1;
    const bowAmt = bowSign * (0.5 + rng() * 0.6) * maxBow;

    const t1 = 0.33, t2 = 0.67;
    const cp1x = sx + (ex - sx) * t1 + perpX * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));
    const cp1y = sy + (ey - sy) * t1 + perpY * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));
    const cp2x = sx + (ex - sx) * t2 + perpX * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));
    const cp2y = sy + (ey - sy) * t2 + perpY * (bowAmt * 0.95 + (rng() - 0.5) * (roughness * 0.5));

    d += `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)} `;
  }

  return d.trim();
}

/**
 * Generate an SVG path data string ('d') for a sketchy rounded rectangle.
 * Matches sketchyRoundedRect with organic corner arcs and jittered edges.
 */
export function generateSketchyRoundedRectPath(x, y, w, h, radius, seed = 0, roughness = 1) {
  const r = Math.min(radius, Math.min(w, h) / 2);
  if (r <= 0.5) {
    return [
      generateSketchyLinePath(x, y, x + w, y, seed, roughness),
      generateSketchyLinePath(x + w, y, x + w, y + h, seed + 101, roughness),
      generateSketchyLinePath(x + w, y + h, x, y + h, seed + 202, roughness),
      generateSketchyLinePath(x, y + h, x, y, seed + 303, roughness),
    ].join(' ');
  }

  if (roughness < 0.1) {
    return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }

  const passes = roughness >= 2 ? 2 : 1;
  const steps = 8;
  let d = '';

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 731);
    const jAmt = roughness * 0.5;

    d += `M ${(x + w - r).toFixed(1)} ${y.toFixed(1)} `;

    // Corner 1: top-right arc (-PI/2 to 0)
    for (let i = 1; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      d += `L ${(x + w - r + Math.cos(a) * jr).toFixed(1)} ${(y + r + Math.sin(a) * jr).toFixed(1)} `;
    }

    // Right edge
    d += `L ${(x + w + (rng() - 0.5) * jAmt).toFixed(1)} ${(y + h - r).toFixed(1)} `;

    // Corner 2: bottom-right arc (0 to PI/2)
    for (let i = 1; i <= steps; i++) {
      const a = (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      d += `L ${(x + w - r + Math.cos(a) * jr).toFixed(1)} ${(y + h - r + Math.sin(a) * jr).toFixed(1)} `;
    }

    // Bottom edge
    d += `L ${(x + r).toFixed(1)} ${(y + h + (rng() - 0.5) * jAmt).toFixed(1)} `;

    // Corner 3: bottom-left arc (PI/2 to PI)
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI / 2 + (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      d += `L ${(x + r + Math.cos(a) * jr).toFixed(1)} ${(y + h - r + Math.sin(a) * jr).toFixed(1)} `;
    }

    // Left edge
    d += `L ${(x + (rng() - 0.5) * jAmt).toFixed(1)} ${(y + r).toFixed(1)} `;

    // Corner 4: top-left arc (PI to 3*PI/2)
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI + (i / steps) * (Math.PI / 2);
      const jr = r + (rng() - 0.5) * jAmt;
      d += `L ${(x + r + Math.cos(a) * jr).toFixed(1)} ${(y + r + Math.sin(a) * jr).toFixed(1)} `;
    }

    // Top edge back to start
    d += `L ${(x + w - r).toFixed(1)} ${(y + (rng() - 0.5) * jAmt).toFixed(1)} Z `;
  }

  return d.trim();
}

/**
 * Draw a sketchy ellipse with 2-pass overlapping loop.
 * Passes sweep past 360° by ~20° to eliminate flat seams and produce an authentic hand-drawn look.
 */
export function sketchyEllipse(ctx, cx, cy, rx, ry, seed, roughness = 1) {
  const absRx = Math.max(0.1, Math.abs(rx));
  const absRy = Math.max(0.1, Math.abs(ry));

  if (roughness < 0.1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, absRx, absRy, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const passes = roughness >= 2 ? 3 : 2;
  const numSteps = 24;

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 28971 + 17);
    // Start angle offset so the two passes overlap naturally at different positions
    const startAngle = pass === 0 ? 0.08 : Math.PI * 0.95;
    // Overlap: trace past 2*PI by 0.22 to 0.45 radians
    const sweepAngle = Math.PI * 2 + (0.2 + rng() * 0.25) * (roughness === 1 ? 1 : 1.4);

    const points = [];
    const jitterFactor = (roughness === 1 ? 0.035 : 0.075);

    for (let i = 0; i <= numSteps; i++) {
      const angle = startAngle + (i / numSteps) * sweepAngle;
      const rJitterX = 1 + (rng() - 0.5) * jitterFactor;
      const rJitterY = 1 + (rng() - 0.5) * jitterFactor;
      points.push([
        cx + absRx * rJitterX * Math.cos(angle),
        cy + absRy * rJitterY * Math.sin(angle),
      ]);
    }

    // Draw smooth Catmull-Rom spline through points
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
    }
    ctx.stroke();
  }
}

/**
 * Draw a sketchy diamond with corner crosses or rounded corners.
 */
export function sketchyDiamond(ctx, x, y, w, h, seed, roughness = 1, isRounded = false) {
  const rw = Math.max(0.1, Math.abs(w));
  const rh = Math.max(0.1, Math.abs(h));
  const cx = x + rw / 2;
  const cy = y + rh / 2;

  if (!isRounded) {
    sketchyLine(ctx, cx, y, x + rw, cy, seed, roughness);
    sketchyLine(ctx, x + rw, cy, cx, y + rh, seed + 101, roughness);
    sketchyLine(ctx, cx, y + rh, x, cy, seed + 202, roughness);
    sketchyLine(ctx, x, cy, cx, y, seed + 303, roughness);
    return;
  }

  const halfW = rw / 2;
  const halfH = rh / 2;
  const edgeLen = Math.hypot(halfW, halfH);
  if (edgeLen < 1) return;
  const cr = Math.min(edgeLen * 0.28, Math.min(32, Math.max(10, edgeLen * 0.2)));
  const ux = (halfW / edgeLen) * cr;
  const uy = (halfH / edgeLen) * cr;

  const T_in = [cx - ux, y + uy];
  const T_out = [cx + ux, y + uy];
  const R_in = [x + rw - ux, cy - uy];
  const R_out = [x + rw - ux, cy + uy];
  const B_in = [cx + ux, y + rh - uy];
  const B_out = [cx - ux, y + rh - uy];
  const L_in = [x + ux, cy + uy];
  const L_out = [x + ux, cy - uy];

  const isDashed = ctx.getLineDash && ctx.getLineDash().length > 0;
  const passes = isDashed ? 1 : (roughness >= 2 ? 2 : 1);

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 541);
    const jAmt = roughness * 0.5;

    ctx.beginPath();
    ctx.moveTo(T_out[0], T_out[1]);

    // Top-right edge
    ctx.lineTo(R_in[0] + (rng() - 0.5) * jAmt, R_in[1] + (rng() - 0.5) * jAmt);
    // Right corner
    ctx.quadraticCurveTo(x + rw + (rng() - 0.5) * jAmt, cy + (rng() - 0.5) * jAmt, R_out[0], R_out[1]);

    // Bottom-right edge
    ctx.lineTo(B_in[0] + (rng() - 0.5) * jAmt, B_in[1] + (rng() - 0.5) * jAmt);
    // Bottom corner
    ctx.quadraticCurveTo(cx + (rng() - 0.5) * jAmt, y + rh + (rng() - 0.5) * jAmt, B_out[0], B_out[1]);

    // Bottom-left edge
    ctx.lineTo(L_in[0] + (rng() - 0.5) * jAmt, L_in[1] + (rng() - 0.5) * jAmt);
    // Left corner
    ctx.quadraticCurveTo(x + (rng() - 0.5) * jAmt, cy + (rng() - 0.5) * jAmt, L_out[0], L_out[1]);

    // Top-left edge
    ctx.lineTo(T_in[0] + (rng() - 0.5) * jAmt, T_in[1] + (rng() - 0.5) * jAmt);
    // Top corner
    ctx.quadraticCurveTo(cx + (rng() - 0.5) * jAmt, y + (rng() - 0.5) * jAmt, T_out[0], T_out[1]);

    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * Hachure fill — hand-drawn diagonal lines clipped inside the shape.
 */
function drawHachure(ctx, paths, seed, roughness, cacheOwner, angle, gap, opacity) {
  if (!paths || paths.length < 3) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(paths[0][0], paths[0][1]);
  for (let i = 1; i < paths.length; i++) {
    ctx.lineTo(paths[i][0], paths[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of paths) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const diagLen = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
  const cx2 = (minX + maxX) / 2;
  const cy2 = (minY + maxY) / 2;
  const cacheSignature = [minX, minY, maxX, maxY, seed, roughness, ctx.lineWidth, angle, gap].join(':');
  let cachedPath = null;
  if (cacheOwner && typeof cacheOwner === 'object' && typeof Path2D !== 'undefined') {
    let pathsBySignature = hachurePathCache.get(cacheOwner);
    cachedPath = pathsBySignature?.get(cacheSignature) || null;
    if (!cachedPath) {
      cachedPath = new Path2D();
      if (!pathsBySignature || pathsBySignature.size >= 2) {
        pathsBySignature = new Map();
        hachurePathCache.set(cacheOwner, pathsBySignature);
      }
      pathsBySignature.set(cacheSignature, cachedPath);
      for (let d = -diagLen; d < diagLen; d += gap) {
        const x1 = cx2 + cos * d - sin * diagLen;
        const y1 = cy2 + sin * d + cos * diagLen;
        const x2 = cx2 + cos * d + sin * diagLen;
        const y2 = cy2 + sin * d - cos * diagLen;
        sketchyLine(cachedPath, x1, y1, x2, y2, seed + Math.round(d), Math.max(0, roughness * 0.6), true);
      }
    }
  }

  ctx.save();
  ctx.globalAlpha = (ctx.globalAlpha || 1) * opacity;
  if (cachedPath) {
    ctx.stroke(cachedPath);
  } else {
    ctx.beginPath();
    for (let d = -diagLen; d < diagLen; d += gap) {
      const x1 = cx2 + cos * d - sin * diagLen;
      const y1 = cy2 + sin * d + cos * diagLen;
      const x2 = cx2 + cos * d + sin * diagLen;
      const y2 = cy2 + sin * d - cos * diagLen;
      sketchyLine(ctx, x1, y1, x2, y2, seed + Math.round(d), Math.max(0, roughness * 0.6), true);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

export function sketchyFill(ctx, paths, seed, roughness = 1, cacheOwner = null) {
  drawHachure(
    ctx,
    paths,
    seed,
    roughness,
    cacheOwner,
    -Math.PI / 4,
    Math.max(6, (ctx.lineWidth || 2) * 4),
    0.75,
  );
}

/**
 * Solid fill.
 */
export function solidFill(ctx, paths) {
  if (!paths || paths.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(paths[0][0], paths[0][1]);
  for (let i = 1; i < paths.length; i++) {
    ctx.lineTo(paths[i][0], paths[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Cross-hatch fill (two perpendicular hachure passes).
 */
export function crossHatchFill(ctx, paths, seed, cacheOwner = null) {
  const gap = Math.max(9, (ctx.lineWidth || 2) * 5);
  drawHachure(ctx, paths, seed, 1, cacheOwner, -Math.PI / 4, gap, 0.52);
  drawHachure(ctx, paths, seed + 500, 1, cacheOwner, Math.PI / 4, gap, 0.52);
}

// ── Polygon & Multi-Shape Handlers ──

export function getTriangleVertices(x, y, w, h) {
  const cx = x + w / 2;
  return [
    [cx, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function getStarVertices(x, y, w, h, points = 5) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerRx = Math.abs(w) / 2;
  const outerRy = Math.abs(h) / 2;
  const innerRx = outerRx * 0.42;
  const innerRy = outerRy * 0.42;
  const total = points * 2;
  const vertices = [];
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < total; i++) {
    const angle = startAngle + (i * Math.PI) / points;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    vertices.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return vertices;
}

export function getHexagonVertices(x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = Math.abs(w) / 2;
  const ry = Math.abs(h) / 2;
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    vertices.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return vertices;
}

export function getOctagonVertices(x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = Math.abs(w) / 2;
  const ry = Math.abs(h) / 2;
  const vertices = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    vertices.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return vertices;
}

export function getParallelogramVertices(x, y, w, h) {
  const skew = Math.min(w * 0.25, 28);
  return [
    [x + skew, y],
    [x + w, y],
    [x + w - skew, y + h],
    [x, y + h],
  ];
}

export function getCylinderPolygon(x, y, w, h) {
  const rw = Math.max(0.1, Math.abs(w));
  const rh = Math.max(0.1, Math.abs(h));
  const lidH = Math.min(rh * 0.35, 34);
  const rx = rw / 2;
  const ry = lidH / 2;
  const cx = x + rx;
  const steps = 16;
  const poly = [];

  // Top lid (full ellipse)
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    poly.push([cx + Math.cos(a) * rx, y + ry + Math.sin(a) * ry]);
  }
  // Right side down
  poly.push([x + rw, y + rh - ry]);
  // Bottom half ellipse
  for (let i = 0; i <= steps / 2; i++) {
    const a = (i / (steps / 2)) * Math.PI;
    poly.push([cx + Math.cos(a) * rx, y + rh - ry + Math.sin(a) * ry]);
  }
  // Left side up
  poly.push([x, y + ry]);
  return poly;
}

export function getCloudPolygon(x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const steps = 24;
  const poly = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // Radial puff modulation
    const puff = 1 + 0.12 * Math.sin(a * 6);
    poly.push([cx + Math.cos(a) * rx * puff, cy + Math.sin(a) * ry * puff]);
  }
  return poly;
}

/**
 * Draw hand-drawn sketchy closed polygon.
 */
export function sketchyPolygon(ctx, vertices, seed, roughness = 1) {
  if (!vertices || vertices.length < 2) return;
  if (roughness < 0.1) {
    ctx.beginPath();
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i][0], vertices[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    return;
  }
  const len = vertices.length;
  for (let i = 0; i < len; i++) {
    const v0 = vertices[i];
    const v1 = vertices[(i + 1) % len];
    sketchyLine(ctx, v0[0], v0[1], v1[0], v1[1], seed + i * 101, roughness);
  }
}

export function sketchyTriangle(ctx, x, y, w, h, seed, roughness = 1) {
  const vertices = getTriangleVertices(x, y, w, h);
  sketchyPolygon(ctx, vertices, seed, roughness);
}

export function sketchyStar(ctx, x, y, w, h, seed, roughness = 1, points = 5) {
  const vertices = getStarVertices(x, y, w, h, points);
  sketchyPolygon(ctx, vertices, seed, roughness);
}

export function sketchyHexagon(ctx, x, y, w, h, seed, roughness = 1) {
  const vertices = getHexagonVertices(x, y, w, h);
  sketchyPolygon(ctx, vertices, seed, roughness);
}

export function sketchyOctagon(ctx, x, y, w, h, seed, roughness = 1) {
  const vertices = getOctagonVertices(x, y, w, h);
  sketchyPolygon(ctx, vertices, seed, roughness);
}

export function sketchyParallelogram(ctx, x, y, w, h, seed, roughness = 1) {
  const vertices = getParallelogramVertices(x, y, w, h);
  sketchyPolygon(ctx, vertices, seed, roughness);
}

export function sketchyCapsule(ctx, x, y, w, h, seed, roughness = 1) {
  const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
  sketchyRoundedRect(ctx, x, y, w, h, radius, seed, roughness);
}

/**
 * Draw a clean, authentic sketchy Database Cylinder:
 * 1. Top lid ellipse
 * 2. Left vertical edge
 * 3. Right vertical edge
 * 4. Matching curved bottom arc
 */
export function sketchyCylinder(ctx, x, y, w, h, seed, roughness = 1) {
  const rw = Math.max(0.1, Math.abs(w));
  const rh = Math.max(0.1, Math.abs(h));
  const lidH = Math.min(rh * 0.35, 34);
  const rx = rw / 2;
  const ry = lidH / 2;
  const cx = x + rx;

  // 1. Top lid ellipse
  sketchyEllipse(ctx, cx, y + ry, rx, ry, seed, roughness);

  // 2. Left vertical edge
  sketchyLine(ctx, x, y + ry, x, y + rh - ry, seed + 101, roughness);

  // 3. Right vertical edge
  sketchyLine(ctx, x + rw, y + ry, x + rw, y + rh - ry, seed + 202, roughness);

  // 4. Bottom curved arc (matching lower half of ellipse)
  if (roughness < 0.1) {
    ctx.beginPath();
    ctx.ellipse(cx, y + rh - ry, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
  } else {
    drawSketchyArc(ctx, cx, y + rh - ry, rx, 0, Math.PI, seed + 303, roughness, ry);
  }
}

/**
 * Draw a sketchy Cloud shape with perimeter puffy arcs.
 */
export function sketchyCloud(ctx, x, y, w, h, seed, roughness = 1) {
  const lobes = 7;
  const rx = Math.abs(w) / 2;
  const ry = Math.abs(h) / 2;
  const cx = x + rx;
  const cy = y + ry;

  for (let i = 0; i < lobes; i++) {
    const a1 = (i / lobes) * Math.PI * 2;
    const a2 = ((i + 1) / lobes) * Math.PI * 2;
    const lobeAngle = (a1 + a2) / 2;
    const lobeCx = cx + Math.cos(lobeAngle) * (rx * 0.72);
    const lobeCy = cy + Math.sin(lobeAngle) * (ry * 0.72);
    const lobeR = (rx + ry) / (lobes * 0.85);

    if (roughness < 0.1) {
      ctx.beginPath();
      ctx.arc(lobeCx, lobeCy, lobeR, a1 - 0.2, a2 + 0.2);
      ctx.stroke();
    } else {
      drawSketchyArc(ctx, lobeCx, lobeCy, lobeR, a1 - 0.2, a2 + 0.2, seed + i * 83, roughness);
    }
  }
}
