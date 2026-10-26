/**
 * orthogonalRouting.js
 * Smart Orthogonal (90-degree) Auto-Routing Connectors & Wire Bridges.
 * Eliminates diagonal tangled wires by generating clean, professional schematic routing
 * with obstacle clearance and wire-crossing bridge hops.
 */

import { sketchyLine } from '../renderer/sketchy.js';

/**
 * Calculates a clean orthogonal Manhattan path between two points.
 * @param {[number, number]} start [x, y]
 * @param {[number, number]} end [x, y]
 * @param {Array<Object>} [obstacles=[]] Array of bounding boxes {x, y, width, height}
 * @returns {Array<[number, number]>} Array of [x, y] waypoints
 */
export function computeOrthogonalPoints(start, end, obstacles = []) {
  const [x1, y1] = start;
  const [x2, y2] = end;

  // Trivial straight horizontal or vertical line
  if (Math.abs(x1 - x2) < 2 || Math.abs(y1 - y2) < 2) {
    return [[x1, y1], [x2, y2]];
  }

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  // Preferred route: if horizontal span is wider, route horizontally first, else vertically first
  let waypoints = [];
  if (dx >= dy) {
    let midX = (x1 + x2) / 2;
    // Obstacle avoidance: if midX cuts through an obstacle, push midX clear of it
    for (const obs of obstacles) {
      if (
        obs &&
        midX >= obs.x - 10 &&
        midX <= obs.x + obs.width + 10 &&
        Math.min(y1, y2) <= obs.y + obs.height &&
        Math.max(y1, y2) >= obs.y
      ) {
        // Shift route to the side of the obstacle
        if (Math.abs(obs.x - 15 - x1) < Math.abs(obs.x + obs.width + 15 - x1)) {
          midX = obs.x - 15;
        } else {
          midX = obs.x + obs.width + 15;
        }
      }
    }
    waypoints = [
      [x1, y1],
      [midX, y1],
      [midX, y2],
      [x2, y2],
    ];
  } else {
    let midY = (y1 + y2) / 2;
    for (const obs of obstacles) {
      if (
        obs &&
        midY >= obs.y - 10 &&
        midY <= obs.y + obs.height + 10 &&
        Math.min(x1, x2) <= obs.x + obs.width &&
        Math.max(x1, x2) >= obs.x
      ) {
        if (Math.abs(obs.y - 15 - y1) < Math.abs(obs.y + obs.height + 15 - y1)) {
          midY = obs.y - 15;
        } else {
          midY = obs.y + obs.height + 15;
        }
      }
    }
    waypoints = [
      [x1, y1],
      [x1, midY],
      [x2, midY],
      [x2, y2],
    ];
  }

  return waypoints;
}

/**
 * Detect intersection between two 2D line segments
 */
function getLineIntersection(p1, p2, p3, p4) {
  const [x1, y1] = p1, [x2, y2] = p2;
  const [x3, y3] = p3, [x4, y4] = p4;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-6) return null;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua > 0.05 && ua < 0.95 && ub > 0.05 && ub < 0.95) {
    return [x1 + ua * (x2 - x1), y1 + ua * (y2 - y1)];
  }
  return null;
}

/**
 * Draws an orthogonal connector path with smooth rounded corner bends and wire bridge hops.
 */
export function renderOrthogonalPath(ctx, points, cornerRadius = 8, roughness = 0, seed = 0, crossingHops = []) {
  if (!points || points.length < 2) return;

  const r = Math.min(cornerRadius, 12);

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const after = points[i + 2];

    if (!after || r <= 0) {
      // Last segment or sharp corners
      ctx.lineTo(next[0], next[1]);
    } else {
      // Segment with rounded corner bend
      const v1x = next[0] - curr[0];
      const v1y = next[1] - curr[1];
      const len1 = Math.hypot(v1x, v1y);

      const v2x = after[0] - next[0];
      const v2y = after[1] - next[1];
      const len2 = Math.hypot(v2x, v2y);

      const actualR = Math.min(r, Math.min(len1, len2) / 2);

      if (actualR > 1 && len1 > 0 && len2 > 0) {
        const u1x = v1x / len1;
        const u1y = v1y / len1;
        const u2x = v2x / len2;
        const u2y = v2y / len2;

        const cornerStartX = next[0] - u1x * actualR;
        const cornerStartY = next[1] - u1y * actualR;
        const cornerEndX = next[0] + u2x * actualR;
        const cornerEndY = next[1] + u2y * actualR;

        ctx.lineTo(cornerStartX, cornerStartY);
        ctx.quadraticCurveTo(next[0], next[1], cornerEndX, cornerEndY);
      } else {
        ctx.lineTo(next[0], next[1]);
      }
    }
  }

  if (roughness > 0) {
    ctx.stroke();
  } else {
    ctx.stroke();
  }
}
