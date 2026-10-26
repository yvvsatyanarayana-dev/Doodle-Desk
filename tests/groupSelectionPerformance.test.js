import { describe, expect, it, vi } from 'vitest';
import { renderSelectionOverlay, renderBatchedFreedrawRun } from '../src/engine/renderer/render.js';
import { hitTestElement, getElementAtPoint } from '../src/engine/hitTest.js';

function createContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    fillText: vi.fn(),
  };
}

describe('renderSelectionOverlay performance and group bounds', () => {
  it('renders a unified group selection box and 4 corner handles when multiple elements are selected, avoiding handle explosion', () => {
    const ctx = createContext();

    // Mock 50 selected elements (simulating vectorized artwork)
    const elements = Array.from({ length: 50 }, (_, i) => ({
      id: `stroke_${i}`,
      type: 'freedraw',
      x: 50 + (i % 10) * 20,
      y: 50 + Math.floor(i / 10) * 20,
      width: 15,
      height: 15,
      points: [[0, 0], [15, 15]],
      isDeleted: false,
    }));

    renderSelectionOverlay(ctx, elements, 1);

    // Exactly 1 rotation handle circle for the entire group, instead of 50
    expect(ctx.arc).toHaveBeenCalledTimes(1);

    // Exactly 4 corner handles + 1 count pill background, instead of 50 * 4 = 200 handles
    expect(ctx.fillRect).toHaveBeenCalledTimes(5);

    // Group count text was drawn
    expect(ctx.fillText).toHaveBeenCalledWith('50 shapes', expect.any(Number), expect.any(Number));
  });

  it('renders dedicated handles for a single element', () => {
    const ctx = createContext();
    const singleEl = {
      id: 'rect_1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 80,
      height: 60,
      isDeleted: false,
    };

    renderSelectionOverlay(ctx, [singleEl], 1);

    // 1 rotation handle + 4 corner handles
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('renders individual handles for each shape when selecting small groups (e.g. 2 shapes) without group pill badge', () => {
    const ctx = createContext();
    const shapes = [
      { id: 'rect_1', type: 'rectangle', x: 50, y: 50, width: 80, height: 60, isDeleted: false },
      { id: 'rect_2', type: 'rectangle', x: 200, y: 150, width: 80, height: 60, isDeleted: false },
    ];

    renderSelectionOverlay(ctx, shapes, 1);

    // 2 rotation handles (1 per shape)
    expect(ctx.arc).toHaveBeenCalledTimes(2);

    // 8 corner handles (4 per shape)
    expect(ctx.fillRect).toHaveBeenCalledTimes(8);

    // No group count pill text drawn!
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('hit-tests interior of shapes even with transparent backgroundColor', () => {
    const transparentRect = {
      id: 'rect_transparent',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      backgroundColor: 'transparent',
      strokeWidth: 2,
    };

    // Clicking squarely in the center of the transparent rectangle
    expect(hitTestElement(transparentRect, 200, 175)).toBe(true);

    // Clicking outside
    expect(hitTestElement(transparentRect, 50, 50)).toBe(false);

    // Topmost selection retrieves transparent rectangle by clicking its interior
    const elements = [transparentRect];
    expect(getElementAtPoint(elements, 200, 175)?.id).toBe('rect_transparent');
  });

  it('batches a run of freedraw strokes into a single GPU ctx.stroke call', () => {
    const originalPath2D = globalThis.Path2D;
    class MockPath2D {
      constructor() {
        this.commands = [];
      }
      moveTo(...args) { this.commands.push(['moveTo', ...args]); }
      lineTo(...args) { this.commands.push(['lineTo', ...args]); }
      bezierCurveTo(...args) { this.commands.push(['bezierCurveTo', ...args]); }
      arc(...args) { this.commands.push(['arc', ...args]); }
    }
    globalThis.Path2D = MockPath2D;

    try {
      const ctx = createContext();
      ctx.translate = vi.fn();

      const strokes = Array.from({ length: 100 }, (_, i) => ({
        id: `vector_${i}`,
        type: 'freedraw',
        x: 10 + i * 2,
        y: 20 + i * 2,
        points: [[0, 0], [10, 5], [20, 10]],
        strokeColor: '#ffffff',
        strokeWidth: 2,
        opacity: 100,
        isDeleted: false,
      }));

      renderBatchedFreedrawRun(ctx, strokes, 0, strokes.length);

      // Exactly 1 stroke call for all 100 strokes combined!
      expect(ctx.stroke).toHaveBeenCalledTimes(1);
      expect(strokes[0]._batchedRun).toBeDefined();
      expect(strokes[0]._batchedRun.count).toBe(100);

      // Subsequent frame reuses cached batch path in 0ms!
      ctx.stroke.mockClear();
      renderBatchedFreedrawRun(ctx, strokes, 0, strokes.length);
      expect(ctx.stroke).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.Path2D = originalPath2D;
    }
  });
});
