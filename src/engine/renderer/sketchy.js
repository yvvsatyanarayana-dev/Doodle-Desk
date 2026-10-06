// Hand-Drawn Stroke & Sloppiness Engine
// Native hand-drawn rendering engine without external dependencies:
// - Roughness 0: Architect (perfectly straight lines, zero wobble, zero overshoot)
// - Roughness 1: Artist (2 bowed overlapping passes, subtle corner overshoots)
// - Roughness 2: Cartoonist (extra wobbly, expressive sketchy strokes with pronounced corner overshoots)

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
export function sketchyLine(ctx, x1, y1, x2, y2, seed, roughness = 1) {
  if (roughness < 0.1) {
    // Architect — perfectly straight
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
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

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
    ctx.stroke();
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
 * Helper to draw a sketchy hand-drawn arc (used in rounded rectangle corners).
 */
function drawSketchyArc(ctx, cx, cy, r, startAngle, endAngle, seed, roughness = 1) {
  if (r <= 0.5) return;
  const passes = roughness >= 2 ? 2 : 1;
  const steps = 8;
  const sweep = endAngle - startAngle;

  for (let pass = 0; pass < passes; pass++) {
    const rng = pseudoRandom(seed + pass * 731);
    const jAmt = roughness * 0.6;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (i / steps) * sweep;
      const jr = r + (rng() - 0.5) * jAmt;
      const px = cx + Math.cos(a) * jr;
      const py = cy + Math.sin(a) * jr;
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
export function sketchyFill(ctx, paths, seed, roughness = 1) {
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

  const gap = Math.max(6, (ctx.lineWidth || 2) * 4);
  const angle = -Math.PI / 4; // 45° hachure
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const diagLen = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
  const cx2 = (minX + maxX) / 2;
  const cy2 = (minY + maxY) / 2;

  ctx.save();
  ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.75;
  for (let d = -diagLen; d < diagLen; d += gap) {
    const x1 = cx2 + cos * d - sin * diagLen;
    const y1 = cy2 + sin * d + cos * diagLen;
    const x2 = cx2 + cos * d + sin * diagLen;
    const y2 = cy2 + sin * d - cos * diagLen;
    sketchyLine(ctx, x1, y1, x2, y2, seed + Math.round(d), Math.max(0, roughness * 0.6));
  }
  ctx.restore();
  ctx.restore();
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
export function crossHatchFill(ctx, paths, seed) {
  sketchyFill(ctx, paths, seed, 1);

  ctx.save();
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [px, py] of paths) {
    if (px < bounds.minX) bounds.minX = px;
    if (py < bounds.minY) bounds.minY = py;
    if (px > bounds.maxX) bounds.maxX = px;
    if (py > bounds.maxY) bounds.maxY = py;
  }
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const rotated = paths.map(([px, py]) => {
    const dx = px - cx, dy = py - cy;
    return [cx - dy, cy + dx];
  });
  sketchyFill(ctx, rotated, seed + 500, 1);
  ctx.restore();
}
