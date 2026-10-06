import { describe, expect, it, vi } from 'vitest';
import { renderElement } from '../src/engine/renderer/render.js';
import { normalizeFreedrawElement } from '../src/engine/elements.js';
import { sketchyRoundedRect } from '../src/engine/renderer/sketchy.js';
import { getElementBounds } from '../src/engine/math/geometry.js';
import { getResizeHandleAt, RESIZE_HANDLES } from '../src/engine/hitTest.js';

function createContext() {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
  };
  return ctx;
}

describe('shape outline rendering', () => {
  it('renders sharp rectangles as clean native canvas rectangles', () => {
    const ctx = createContext();

    renderElement(ctx, {
      id: 'sharp',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      roundness: null,
      roughness: 0,
      strokeColor: '#fff',
      opacity: 100,
    });

    expect(ctx.rect).toHaveBeenCalledWith(10, 20, 200, 120);
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('applies the selected sloppiness level to sharp rectangle outlines', () => {
    const cleanCtx = createContext();
    const artistCtx = createContext();
    const cartoonCtx = createContext();
    const baseElement = {
      type: 'rectangle', x: 10, y: 20, width: 200, height: 120,
      roundness: null, strokeColor: '#fff', opacity: 100,
    };

    renderElement(cleanCtx, { ...baseElement, roughness: 0 });
    renderElement(artistCtx, { ...baseElement, roughness: 1 });
    renderElement(cartoonCtx, { ...baseElement, roughness: 2 });

    expect(cleanCtx.rect).toHaveBeenCalledOnce();
    expect(cleanCtx.stroke).toHaveBeenCalledOnce();
    expect(artistCtx.rect).not.toHaveBeenCalled();
    expect(artistCtx.stroke.mock.calls.length).toBeGreaterThan(cleanCtx.stroke.mock.calls.length);
    expect(cartoonCtx.stroke.mock.calls.length).toBeGreaterThan(artistCtx.stroke.mock.calls.length);
  });

  it('applies sloppiness while preserving rounded corners', () => {
    const cleanCtx = createContext();
    const roughCtx = createContext();
    const baseElement = {
      type: 'rectangle', x: 10, y: 20, width: 200, height: 120,
      roundness: { type: 3 }, strokeColor: '#fff', opacity: 100,
    };

    renderElement(cleanCtx, { ...baseElement, roughness: 0 });
    renderElement(roughCtx, { ...baseElement, roughness: 1 });

    expect(cleanCtx.quadraticCurveTo).toHaveBeenCalledTimes(4);
    expect(roughCtx.lineTo.mock.calls.length).toBeGreaterThan(cleanCtx.lineTo.mock.calls.length);
  });

  it('renders rounded rectangles with smooth corners and a single outline', () => {
    const ctx = createContext();

    renderElement(ctx, {
      id: 'rounded',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      roundness: { type: 3 },
      roughness: 0,
      strokeColor: '#fff',
      opacity: 100,
    });

    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4);
    expect(ctx.rect).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('renders default diamonds as clean native canvas paths', () => {
    const ctx = createContext();

    renderElement(ctx, {
      id: 'diamond',
      type: 'diamond',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      roughness: 0,
      strokeColor: '#fff',
      opacity: 100,
    });

    expect(ctx.moveTo).toHaveBeenCalledWith(110, 20);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('renders rounded diamonds with smooth corner curves', () => {
    const ctx = createContext();

    renderElement(ctx, {
      id: 'diamond-round',
      type: 'diamond',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      roundness: 'round',
      roughness: 0,
      strokeColor: '#fff',
      opacity: 100,
    });

    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4);
    expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('keeps every rough rounded-rectangle corner continuous', () => {
    const ctx = createContext();
    sketchyRoundedRect(ctx, 0, 0, 200, 120, 16, 1234, 1);
    const moves = ctx.moveTo.mock.calls;
    const points = [moves[0], ...ctx.lineTo.mock.calls];

    expect(moves[0]).toEqual([184, 0]);
    expect(points.some(([x, y]) => Math.abs(x - 184) < 1e-8 && Math.abs(y) < 1e-8)).toBe(true);
    expect(ctx.closePath).toHaveBeenCalledOnce();
  });

  it('normalizes pencil strokes so selection bounds contain left/up points', () => {
    const legacyStroke = {
      id: 'stroke',
      type: 'freedraw',
      x: 100,
      y: 100,
      width: 70,
      height: 20,
      points: [[0, 0], [-40, -15], [70, 20]],
    };
    const normalized = normalizeFreedrawElement(legacyStroke);

    expect(normalized.x).toBe(60);
    expect(normalized.y).toBe(85);
    expect(normalized.width).toBe(110);
    expect(normalized.height).toBe(35);
    expect(normalized.points).toEqual([[40, 15], [0, 0], [110, 35]]);
    expect(Math.min(...normalized.points.map(([x]) => normalized.x + x))).toBe(normalized.x);
    expect(Math.max(...normalized.points.map(([x]) => normalized.x + x))).toBe(normalized.x + normalized.width);

    expect(getElementBounds(legacyStroke)).toEqual({ x: 60, y: 85, width: 110, height: 35 });
    expect(getResizeHandleAt(legacyStroke, 56, 81, 1)).toBe(RESIZE_HANDLES.NW);
  });
});