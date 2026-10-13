import { describe, expect, it } from 'vitest';
import {
  applyResponsiveLayout,
  captureResponsiveLayout,
  countResponsiveOverrides,
  initializeResponsiveBase,
} from '../src/engine/responsiveLayouts.js';

describe('Responsive layouts', () => {
  it('saves independent breakpoint geometry and restores the base layout', () => {
    const initial = [
      { id: 'card', type: 'rectangle', x: 100, y: 80, width: 240, height: 120 },
      { id: 'deleted', type: 'rectangle', x: 0, y: 0, width: 10, height: 10, isDeleted: true },
    ];
    const base = initializeResponsiveBase(initial);
    expect(base[0].responsiveLayouts.base).toEqual({
      x: 100, y: 80, width: 240, height: 120, angle: 0,
    });

    const phoneScene = applyResponsiveLayout(base, 'phone').map(element =>
      element.id === 'card' ? { ...element, x: 20, y: 40, width: 350, height: 180 } : element
    );
    const withPhone = captureResponsiveLayout(phoneScene, 'phone');
    const desktop = applyResponsiveLayout(withPhone, 'desktop');

    expect(desktop[0]).toMatchObject({ x: 100, y: 80, width: 240, height: 120 });
    expect(applyResponsiveLayout(withPhone, 'phone')[0]).toMatchObject({
      x: 20, y: 40, width: 350, height: 180,
    });
    expect(countResponsiveOverrides(withPhone, 'phone')).toBe(1);
    expect(countResponsiveOverrides(withPhone, 'tablet')).toBe(0);
    expect(withPhone[1]).toBe(initial[1]);
  });

  it('rejects unsupported breakpoint names', () => {
    expect(() => applyResponsiveLayout([], 'watch')).toThrow('Unknown responsive breakpoint');
    expect(() => captureResponsiveLayout([], 'watch')).toThrow('Unknown responsive breakpoint');
  });
});
