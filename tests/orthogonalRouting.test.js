import { describe, expect, it, vi } from 'vitest';
import { computeOrthogonalPoints, renderOrthogonalPath } from '../src/engine/layout/orthogonalRouting.js';
import { renderElement } from '../src/engine/renderer/render.js';

describe('orthogonalRouting', () => {
  it('returns straight points for collinear horizontal or vertical coordinates', () => {
    expect(computeOrthogonalPoints([10, 20], [100, 20])).toEqual([[10, 20], [100, 20]]);
    expect(computeOrthogonalPoints([50, 10], [50, 200])).toEqual([[50, 10], [50, 200]]);
  });

  it('computes clean 90-degree elbow waypoints for diagonal offsets', () => {
    const ptsH = computeOrthogonalPoints([0, 0], [100, 40]);
    expect(ptsH).toHaveLength(4);
    expect(ptsH[0]).toEqual([0, 0]);
    expect(ptsH[1]).toEqual([50, 0]);
    expect(ptsH[2]).toEqual([50, 40]);
    expect(ptsH[3]).toEqual([100, 40]);

    const ptsV = computeOrthogonalPoints([0, 0], [40, 100]);
    expect(ptsV).toHaveLength(4);
    expect(ptsV[0]).toEqual([0, 0]);
    expect(ptsV[1]).toEqual([0, 50]);
    expect(ptsV[2]).toEqual([40, 50]);
    expect(ptsV[3]).toEqual([40, 100]);
  });

  it('shifts midpoints to route clear around obstacles', () => {
    const obstacle = { x: 40, y: -20, width: 30, height: 80 };
    const pts = computeOrthogonalPoints([0, 0], [100, 40], [obstacle]);
    expect(pts).toHaveLength(4);
    // Midpoint should be deflected away from the obstacle
    expect(pts[1][0]).not.toBe(50);
  });

  it('renders an orthogonal connector path with quadratic corner arcs', () => {
    const ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
    };

    const points = [[0, 0], [50, 0], [50, 100], [100, 100]];
    renderOrthogonalPath(ctx, points, 8, 0, 123);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders orthogonal arrows via renderElement without error', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
    };

    renderElement(ctx, {
      id: 'ortho-arrow',
      type: 'arrow',
      x: 20,
      y: 30,
      points: [[0, 0], [120, 80]],
      routing: 'orthogonal',
      strokeColor: '#3b82f6',
      strokeWidth: 2,
      opacity: 100,
    });

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled(); // Arrowhead
  });
});
