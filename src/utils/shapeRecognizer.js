/**
 * Precision Shape Recognition Engine for "Draw to Shapes"
 * Robustly classifies hand-drawn sketches into clean geometric shapes:
 * 1. Straight Line
 * 2. Rectangle / Square (corner proximity & 4-edge span)
 * 3. Circle / Ellipse (radial variance & continuous curvature)
 * 4. Triangle (3 prominent corners, non-rectangular)
 * 5. Diamond (4 midpoint diagonal corners)
 */

// Euclidean distance
function dist(p1, p2) {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
}

// Distance from point P to line segment AB
function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);

  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  return Math.hypot(p[0] - projX, p[1] - projY);
}

// Total path length
function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i]);
  }
  return len;
}

// Douglas-Peucker simplification
function simplifyDouglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lineLen = Math.hypot(dx, dy);

  for (let i = 1; i < points.length - 1; i++) {
    let d = 0;
    if (lineLen === 0) {
      d = dist(points[i], start);
    } else {
      d = Math.abs(dy * points[i][0] - dx * points[i][1] + end[0] * start[1] - end[1] * start[0]) / lineLen;
    }

    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyDouglasPeucker(points.slice(0, index + 1), epsilon);
    const right = simplifyDouglasPeucker(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  }

  return [start, end];
}

export function recognizeShape(freedrawElement) {
  if (!freedrawElement || !freedrawElement.points || freedrawElement.points.length < 4) {
    return null;
  }

  const rawPoints = freedrawElement.points;
  const totalLen = pathLength(rawPoints);
  if (totalLen < 15) return null;

  const originX = freedrawElement.x;
  const originY = freedrawElement.y;

  // Global coordinates
  const pts = rawPoints.map(([px, py]) => [originX + px, originY + py]);

  const startPt = pts[0];
  const endPt = pts[pts.length - 1];
  const startEndDist = dist(startPt, endPt);

  // 1. STRAIGHT LINE: Start to end is > 82% of total length
  const straightness = startEndDist / totalLen;
  if (straightness > 0.82) {
    const w = Math.abs(endPt[0] - startPt[0]) || 2;
    const h = Math.abs(endPt[1] - startPt[1]) || 2;
    return {
      type: 'line',
      x: startPt[0],
      y: startPt[1],
      width: w,
      height: h,
      points: [[0, 0], [endPt[0] - startPt[0], endPt[1] - startPt[1]]],
    };
  }

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  pts.forEach(([px, py]) => {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  });

  const width = Math.max(maxX - minX, 10);
  const height = Math.max(maxY - minY, 10);
  const bboxDiag = Math.hypot(width, height);
  const cx = minX + width / 2;
  const cy = minY + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const aspect = width / height;

  // Douglas-Peucker simplification for polyline and corner analysis
  const simplified = simplifyDouglasPeucker(pts, bboxDiag * 0.08);

  // Compute distance to bounding box corners & boundary edges
  let dTL = Infinity, dTR = Infinity, dBR = Infinity, dBL = Infinity;
  let radialErrorSum = 0;
  let diamondDistSum = 0;
  let rectEdgeDistSum = 0;
  let q1 = false, q2 = false, q3 = false, q4 = false;

  pts.forEach(([px, py]) => {
    // Quadrants
    const a = Math.atan2(py - cy, px - cx);
    if (a >= 0 && a < Math.PI / 2) q1 = true;
    else if (a >= Math.PI / 2 && a <= Math.PI) q2 = true;
    else if (a < 0 && a >= -Math.PI / 2) q4 = true;
    else if (a < -Math.PI / 2 && a >= -Math.PI) q3 = true;

    // Radial error for circle/ellipse
    const normRad = Math.hypot((px - cx) / rx, (py - cy) / ry);
    radialErrorSum += Math.abs(normRad - 1.0);

    // Diamond Manhattan error
    const dDiamond = Math.abs((Math.abs(px - cx) / rx) + (Math.abs(py - cy) / ry) - 1.0);
    diamondDistSum += dDiamond;

    // Corner distances
    dTL = Math.min(dTL, Math.hypot(px - minX, py - minY));
    dTR = Math.min(dTR, Math.hypot(px - maxX, py - minY));
    dBR = Math.min(dBR, Math.hypot(px - maxX, py - maxY));
    dBL = Math.min(dBL, Math.hypot(px - minX, py - maxY));

    // Distance to closest bounding box boundary edge
    const dTop = Math.abs(py - minY);
    const dBot = Math.abs(py - maxY);
    const dLeft = Math.abs(px - minX);
    const dRight = Math.abs(px - maxX);
    rectEdgeDistSum += Math.min(dTop, dBot, dLeft, dRight);
  });

  const allQuadrants = q1 && q2 && q3 && q4;
  const avgRadialError = radialErrorSum / pts.length;
  const avgDiamondDist = diamondDistSum / pts.length;
  const avgRectDist = (rectEdgeDistSum / pts.length) / bboxDiag;
  const maxCornerDist = Math.max(dTL, dTR, dBR, dBL) / bboxDiag;
  const minCornerDist = Math.min(dTL, dTR, dBR, dBL) / bboxDiag;

  // =========================================================================
  // 2. CIRCLE / ELLIPSE DETECTION
  // Round shape with low radial variance, coverage across all 4 quadrants,
  // strictly rounder than a diamond, and corners never touched.
  // =========================================================================
  if (
    allQuadrants &&
    avgRadialError < 0.22 &&
    avgRadialError < avgDiamondDist * 0.90 &&
    minCornerDist > 0.05
  ) {
    // If aspect ratio is reasonably balanced (0.70 to 1.42), produce clean Circle
    if (aspect >= 0.70 && aspect <= 1.42) {
      const diameter = (width + height) / 2;
      return {
        type: 'ellipse',
        x: cx - diameter / 2,
        y: cy - diameter / 2,
        width: diameter,
        height: diameter,
      };
    }

    return {
      type: 'ellipse',
      x: minX,
      y: minY,
      width,
      height,
    };
  }

  // =========================================================================
  // 3. RECTANGLE / SQUARE DETECTION
  // A rectangle has points reaching all 4 corners of the bounding box and
  // running closely along the 4 edges.
  // =========================================================================
  const tolY = Math.max(height * 0.28, 14);
  const tolX = Math.max(width * 0.28, 14);

  let minTopX = Infinity, maxTopX = -Infinity;
  let minBotX = Infinity, maxBotX = -Infinity;
  let minLeftY = Infinity, maxLeftY = -Infinity;
  let minRightY = Infinity, maxRightY = -Infinity;

  pts.forEach(([px, py]) => {
    if (py - minY < tolY) {
      minTopX = Math.min(minTopX, px);
      maxTopX = Math.max(maxTopX, px);
    }
    if (maxY - py < tolY) {
      minBotX = Math.min(minBotX, px);
      maxBotX = Math.max(maxBotX, px);
    }
    if (px - minX < tolX) {
      minLeftY = Math.min(minLeftY, py);
      maxLeftY = Math.max(maxLeftY, py);
    }
    if (maxX - px < tolX) {
      minRightY = Math.min(minRightY, py);
      maxRightY = Math.max(maxRightY, py);
    }
  });

  const topSpan = (maxTopX - minTopX) / width;
  const botSpan = (maxBotX - minBotX) / width;
  const leftSpan = (maxLeftY - minLeftY) / height;
  const rightSpan = (maxRightY - minRightY) / height;

  const hasFourSpanningSides =
    topSpan > 0.40 &&
    botSpan > 0.40 &&
    leftSpan > 0.40 &&
    rightSpan > 0.40;

  const touchesFourCorners = maxCornerDist < 0.14 && avgRectDist < 0.15;
  const spansFourSides = hasFourSpanningSides && maxCornerDist < 0.22 && avgRectDist < 0.16;

  if (touchesFourCorners || spansFourSides) {
    // If aspect ratio is close to 1:1, produce clean Square
    if (aspect >= 0.75 && aspect <= 1.33) {
      const side = (width + height) / 2;
      return {
        type: 'rectangle',
        x: cx - side / 2,
        y: cy - side / 2,
        width: side,
        height: side,
        roundness: { type: 1 },
      };
    }

    return {
      type: 'rectangle',
      x: minX,
      y: minY,
      width,
      height,
      roundness: { type: 1 },
    };
  }

  // =========================================================================
  // 4. DIAMOND DETECTION
  // 4 corners aligning with box edge midpoints, strictly sharper than circle
  // =========================================================================
  if (
    allQuadrants &&
    avgDiamondDist < 0.18 &&
    avgDiamondDist < avgRadialError * 0.92
  ) {
    return {
      type: 'diamond',
      x: minX,
      y: minY,
      width,
      height,
    };
  }

  // =========================================================================
  // 5. TRIANGLE DETECTION
  // Closed polygon with 3 distinct corners
  // =========================================================================
  let ptA = pts[0];
  let maxDistCenter = 0;
  for (const pt of pts) {
    const d = dist(pt, [cx, cy]);
    if (d > maxDistCenter) {
      maxDistCenter = d;
      ptA = pt;
    }
  }

  let ptB = pts[0];
  let maxDistA = 0;
  for (const pt of pts) {
    const d = dist(pt, ptA);
    if (d > maxDistA) {
      maxDistA = d;
      ptB = pt;
    }
  }

  let ptC = pts[0];
  let maxDistLineAB = 0;
  for (const pt of pts) {
    const d = distToSegment(pt, ptA, ptB);
    if (d > maxDistLineAB) {
      maxDistLineAB = d;
      ptC = pt;
    }
  }

  const triArea = Math.abs(
    (ptB[0] - ptA[0]) * (ptC[1] - ptA[1]) - (ptC[0] - ptA[0]) * (ptB[1] - ptA[1])
  ) / 2;
  const boxArea = width * height;

  if (triArea > boxArea * 0.18 && maxDistLineAB > bboxDiag * 0.20) {
    let edge1Count = 0, edge2Count = 0, edge3Count = 0;
    let triDistSum = 0;
    const edgeThreshold = bboxDiag * 0.16;

    for (const pt of pts) {
      const d1 = distToSegment(pt, ptA, ptB);
      const d2 = distToSegment(pt, ptB, ptC);
      const d3 = distToSegment(pt, ptC, ptA);
      const minD = Math.min(d1, d2, d3);
      triDistSum += minD;

      if (d1 < edgeThreshold) edge1Count++;
      if (d2 < edgeThreshold) edge2Count++;
      if (d3 < edgeThreshold) edge3Count++;
    }

    const avgTriDist = triDistSum / pts.length;
    const normTriDist = avgTriDist / bboxDiag;

    const hasThreeDistinctEdges =
      edge1Count > pts.length * 0.10 &&
      edge2Count > pts.length * 0.10 &&
      edge3Count > pts.length * 0.10;

    if (hasThreeDistinctEdges && normTriDist < 0.14) {
      const corners = [ptA, ptB, ptC];
      // Sort by Y ascending: lowest Y is top apex
      corners.sort((a, b) => a[1] - b[1]);

      let apex = corners[0];
      let base1 = corners[1];
      let base2 = corners[2];

      if (base1[0] > base2[0]) {
        const temp = base1;
        base1 = base2;
        base2 = temp;
      }

      // Snap base horizontal if nearly level
      if (Math.abs(base1[1] - base2[1]) < height * 0.15) {
        const avgBaseY = (base1[1] + base2[1]) / 2;
        base1[1] = avgBaseY;
        base2[1] = avgBaseY;
      }

      // Snap apex centered if nearly symmetric
      const midBaseX = (base1[0] + base2[0]) / 2;
      if (Math.abs(apex[0] - midBaseX) < width * 0.18) {
        apex[0] = midBaseX;
      }

      return {
        type: 'line',
        x: apex[0],
        y: apex[1],
        width,
        height,
        points: [
          [0, 0],
          [base2[0] - apex[0], base2[1] - apex[1]],
          [base1[0] - apex[0], base1[1] - apex[1]],
          [0, 0],
        ],
        backgroundColor: freedrawElement.backgroundColor || 'transparent',
      };
    }
  }

  // =========================================================================
  // 6. SMOOTH OPEN POLYLINE
  // =========================================================================
  if (simplified && simplified.length >= 2 && simplified.length <= 4) {
    const p0 = simplified[0];
    return {
      type: 'line',
      x: p0[0],
      y: p0[1],
      width,
      height,
      points: simplified.map((pt) => [pt[0] - p0[0], pt[1] - p0[1]]),
    };
  }

  return null;
}
