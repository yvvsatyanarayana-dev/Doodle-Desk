import { describe, expect, it, vi } from 'vitest';
import { getTextElementBounds, renderElement } from '../src/engine/renderer/render.js';
import { normalizeFreedrawElement } from '../src/engine/elements.js';
import { crossHatchFill, sketchyFill, sketchyRoundedRect } from '../src/engine/renderer/sketchy.js';
import { getElementBounds } from '../src/engine/math/geometry.js';
import { getResizeHandleAt, hitTestElement, RESIZE_HANDLES } from '../src/engine/hitTest.js';

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
  it('hits the frame name label above the frame bounds', () => {
    const frame = {
      id: 'frame',
      type: 'frame',
      name: 'Frame 1',
      x: 100,
      y: 100,
      width: 400,
      height: 300,
    };

    expect(hitTestElement(frame, 110, 85)).toBe(true);
    expect(hitTestElement(frame, 300, 85)).toBe(false);
  });

  it('uses the rendered text height instead of stale empty space for selection bounds and hits', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
      const text = {
        id: 'text',
        type: 'text',
        x: 20,
        y: 30,
        width: 300,
        height: 360,
        fontSize: 32,
        fontFamily: 5,
        text: 'testing',
      };
      const bounds = getTextElementBounds(text);

      expect(bounds).toEqual({ x: 20, y: 30, width: 300, height: 42 });
      expect(hitTestElement(text, 50, 40)).toBe(true);
      expect(hitTestElement(text, 50, 250)).toBe(false);
      expect(getResizeHandleAt(text, 324, 76)).toBe(RESIZE_HANDLES.SE);
    } finally {
      getContext.mockRestore();
    }
  });

  it('gives empty text no oversized selection bounds', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    try {
      expect(getTextElementBounds({
        type: 'text',
        x: 10,
        y: 12,
        width: 240,
        height: 300,
        text: '',
      })).toEqual({ x: 10, y: 12, width: 240, height: 0 });
    } finally {
      getContext.mockRestore();
    }
  });

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

  it('renders rounded diamond with cross-hatch fill and smooth corner clipping', () => {
    const ctx = createContext();

    renderElement(ctx, {
      id: 'diamond-cross-hatch',
      type: 'diamond',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      roundness: 'round',
      roughness: 1,
      strokeColor: '#fff',
      backgroundColor: '#f06595',
      fillStyle: 'cross-hatch',
      opacity: 100,
    });

    // 4 for clip + at least 4 in sketchy stroke
    expect(ctx.quadraticCurveTo.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('renders rounded diamond with solid fill using native curved fill', () => {
    const ctx = createContext();

    renderElement(ctx, {
      id: 'diamond-solid',
      type: 'diamond',
      x: 10,
      y: 20,
      width: 200,
      height: 120,
      roundness: 'round',
      roughness: 0,
      strokeColor: '#fff',
      backgroundColor: '#f06595',
      fillStyle: 'solid',
      opacity: 100,
    });

    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(8); // 4 for fill + 4 for stroke
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

  it('batches hachure strokes into one canvas stroke operation', () => {
    const ctx = createContext();
    ctx.lineWidth = 2;

    sketchyFill(ctx, [[0, 0], [160, 0], [160, 120], [0, 120]], 42, 1);

    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('reuses cached hachure geometry for unchanged elements', () => {
    const originalPath2D = globalThis.Path2D;
    const pathInstances = [];
    class TestPath2D {
      constructor() {
        pathInstances.push(this);
      }
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
    }
    globalThis.Path2D = TestPath2D;

    try {
      const owner = {};
      const paths = [[0, 0], [160, 0], [160, 120], [0, 120]];
      const firstCtx = createContext();
      const secondCtx = createContext();
      firstCtx.lineWidth = 2;
      secondCtx.lineWidth = 2;

      sketchyFill(firstCtx, paths, 42, 1, owner);
      sketchyFill(secondCtx, paths, 42, 1, owner);

      expect(pathInstances).toHaveLength(1);
      expect(firstCtx.stroke).toHaveBeenCalledWith(pathInstances[0]);
      expect(secondCtx.stroke).toHaveBeenCalledWith(pathInstances[0]);
    } finally {
      if (originalPath2D === undefined) {
        delete globalThis.Path2D;
      } else {
        globalThis.Path2D = originalPath2D;
      }
    }
  });

  it('draws cross-hatch passes at distinct diagonal angles', () => {
    const originalPath2D = globalThis.Path2D;
    const pathInstances = [];
    class TestPath2D {
      constructor() {
        this.slopes = [];
        this.currentPoint = null;
        pathInstances.push(this);
      }
      moveTo(x, y) {
        this.currentPoint = [x, y];
      }
      lineTo(x, y) {
        this.currentPoint = [x, y];
      }
      bezierCurveTo(_cp1x, _cp1y, _cp2x, _cp2y, x, y) {
        if (this.currentPoint) {
          this.slopes.push(Math.sign((x - this.currentPoint[0]) * (y - this.currentPoint[1])));
        }
        this.currentPoint = [x, y];
      }
    }
    globalThis.Path2D = TestPath2D;

    try {
      const ctx = createContext();
      ctx.lineWidth = 2;
      crossHatchFill(ctx, [[0, 0], [160, 0], [160, 120], [0, 120]], 42, {});

      expect(pathInstances).toHaveLength(2);
      expect(pathInstances[0].slopes[0]).not.toBe(pathInstances[1].slopes[0]);
    } finally {
      if (originalPath2D === undefined) {
        delete globalThis.Path2D;
      } else {
        globalThis.Path2D = originalPath2D;
      }
    }
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

  it('renders shapes with dots, zigzag, and dashed fill styles', () => {
    for (const fillStyle of ['dots', 'zigzag', 'dashed']) {
      const ctx = createContext();
      ctx.arc = vi.fn();
      renderElement(ctx, {
        id: `rect-${fillStyle}`,
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        backgroundColor: '#74c0fc',
        fillStyle,
        roughness: 1,
      });

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    }
  });
});