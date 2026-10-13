import { describe, expect, it } from 'vitest';
import { boundsIntersectViewport, getElementBounds } from '../src/engine/math/geometry.js';

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
});
