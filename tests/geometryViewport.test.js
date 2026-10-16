import { describe, expect, it } from 'vitest';
import {
  boundsIntersectViewport,
  constrainPointToAngle,
  getCachedElementBounds,
  getElementBounds,
} from '../src/engine/math/geometry.js';

describe('viewport geometry', () => {
  const viewport = { x: 0, y: 0, width: 100, height: 100 };

  it('intersects visible and padded bounds but rejects distant bounds', () => {
    expect(boundsIntersectViewport({ x: 90, y: 20, width: 30, height: 20 }, viewport)).toBe(true);
    expect(boundsIntersectViewport({ x: 105, y: 20, width: 10, height: 10 }, viewport, 8)).toBe(true);
    expect(boundsIntersectViewport({ x: 110, y: 20, width: 10, height: 10 }, viewport, 8)).toBe(false);
  });

  it('handles negative dimensions and uses rotated element bounds', () => {
    expect(boundsIntersectViewport({ x: 110, y: 20, width: -20, height: 20 }, viewport)).toBe(true);

    const rotated = getElementBounds({
      type: 'rectangle',
      x: 88,
      y: 45,
      width: 40,
      height: 10,
      angle: Math.PI / 4,
    });
    expect(boundsIntersectViewport(rotated, viewport)).toBe(true);
  });

  it('caches bounds for immutable elements, including free-draw strokes', () => {
    const element = {
      type: 'freedraw',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      points: [[0, 0], [30, 40]],
    };
    const bounds = getCachedElementBounds(element);
    expect(getCachedElementBounds(element)).toBe(bounds);
    expect(bounds).toEqual({ x: 10, y: 20, width: 30, height: 40 });

    const updated = { ...element, points: [[0, 0], [50, 60]] };
    expect(getCachedElementBounds(updated)).toEqual(getElementBounds(updated));
    expect(getCachedElementBounds(updated).width).toBe(50);
  });

  it('constrains line endpoints to the nearest 45-degree angle without changing their length', () => {
    const endpoint = constrainPointToAngle(10, 20, 40, 48);

    expect(endpoint[0] - 10).toBeCloseTo(endpoint[1] - 20);
    expect(Math.hypot(endpoint[0] - 10, endpoint[1] - 20)).toBeCloseTo(
      Math.hypot(30, 28),
    );
  });
});
