import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawDotGrid } from '../src/engine/renderer/paperGrid.js';
import { cancelIdleTask, scheduleIdleTask } from '../src/utils/idleTask.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('canvas performance helpers', () => {
  it('reuses a dot-grid pattern while updating its pan offset', () => {
    const tileContext = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(tileContext);
    const setTransform = vi.fn();
    const pattern = { setTransform };
    const context = {
      createPattern: vi.fn(() => pattern),
      fillRect: vi.fn(),
    };
    const patternCache = { current: null };
    const settings = {
      width: 800,
      height: 600,
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
      theme: 'light',
      patternCache,
    };

    drawDotGrid(context, settings);
    drawDotGrid(context, { ...settings, scrollX: 30, scrollY: 18 });

    expect(context.createPattern).toHaveBeenCalledTimes(1);
    expect(tileContext.arc).toHaveBeenCalledTimes(4);
    expect(setTransform).toHaveBeenCalledTimes(2);
    expect(setTransform).toHaveBeenLastCalledWith({
      a: 24 / 128,
      b: 0,
      c: 0,
      d: 24 / 128,
      e: 14,
      f: 18,
    });
    expect(context.fillRect).toHaveBeenCalledTimes(2);
  });

  it('falls back to direct dot drawing if canvas patterns are unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    });
    const context = {
      createPattern: vi.fn(() => null),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    };

    drawDotGrid(context, {
      width: 30,
      height: 30,
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
      theme: 'light',
      patternCache: { current: null },
    });

    expect(context.createPattern).toHaveBeenCalledOnce();
    expect(context.arc).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalledOnce();
  });

  it('schedules and cancels idle work with the timer fallback', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const task = scheduleIdleTask(callback);

    expect(callback).not.toHaveBeenCalled();
    cancelIdleTask(task);
    vi.runOnlyPendingTimers();
    expect(callback).not.toHaveBeenCalled();
  });
});
