import { describe, expect, it, vi } from 'vitest';
import { hitTestElement, getElementAtPoint, getElementsInRect } from '../src/engine/hitTest.js';
import { renderSelectionOverlay } from '../src/engine/renderer/render.js';
import { createElement, ELEMENT_TYPES } from '../src/engine/elements.js';
import { buildSceneSpatialIndex, getSceneElementsAtPoint, getVisibleSceneElements } from '../src/engine/math/sceneSpatialIndex.js';

function createMockContext() {
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
    measureText: vi.fn(() => ({ width: 50 })),
    fillText: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  };
}

describe('Shape selection fixes', () => {
  it('hit-tests interior of circle / ellipse with transparent background', () => {
    const ellipse = createElement(ELEMENT_TYPES.ELLIPSE, 300, 200, 160, 160, {
      backgroundColor: 'transparent',
      strokeWidth: 2,
    });

    // Center of the ellipse
    expect(hitTestElement(ellipse, 380, 280)).toBe(true);

    // Near the border
    expect(hitTestElement(ellipse, 302, 280)).toBe(true);

    // Outside the ellipse
    expect(hitTestElement(ellipse, 200, 200)).toBe(false);
  });

  it('hit-tests interior of diamond with transparent background', () => {
    const diamond = createElement(ELEMENT_TYPES.DIAMOND, 400, 300, 140, 140, {
      backgroundColor: 'transparent',
      strokeWidth: 2,
    });

    // Center of the diamond
    expect(hitTestElement(diamond, 470, 370)).toBe(true);

    // Corner of the diamond
    expect(hitTestElement(diamond, 470, 302)).toBe(true);

    // Bounding box corner (outside diamond)
    expect(hitTestElement(diamond, 405, 305)).toBe(false);
  });

  it('hit-tests interior of rounded rectangle with transparent background', () => {
    const rect = createElement(ELEMENT_TYPES.RECTANGLE, 250, 400, 220, 130, {
      backgroundColor: 'transparent',
      roundness: 'round',
      strokeWidth: 2,
    });

    // Center of the rectangle
    expect(hitTestElement(rect, 360, 465)).toBe(true);

    // Near top edge
    expect(hitTestElement(rect, 360, 403)).toBe(true);

    // Outside the rectangle
    expect(hitTestElement(rect, 200, 350)).toBe(false);
  });

  it('retrieves the shape at point from a spatial index or element list', () => {
    const ellipse = createElement(ELEMENT_TYPES.ELLIPSE, 200, 100, 100, 100);
    const diamond = createElement(ELEMENT_TYPES.DIAMOND, 200, 250, 100, 100);
    const rect = createElement(ELEMENT_TYPES.RECTANGLE, 200, 400, 120, 80);

    const elements = [ellipse, diamond, rect];
    const index = buildSceneSpatialIndex(elements);

    // Query spatial index at center of ellipse
    const ellipseCandidates = getSceneElementsAtPoint(index, 250, 150);
    const hitEllipse = getElementAtPoint(ellipseCandidates.length ? ellipseCandidates : elements, 250, 150);
    expect(hitEllipse?.id).toBe(ellipse.id);

    // Query spatial index at center of diamond
    const diamondCandidates = getSceneElementsAtPoint(index, 250, 300);
    const hitDiamond = getElementAtPoint(diamondCandidates.length ? diamondCandidates : elements, 250, 300);
    expect(hitDiamond?.id).toBe(diamond.id);

    // Query spatial index at center of rectangle
    const rectCandidates = getSceneElementsAtPoint(index, 260, 440);
    const hitRect = getElementAtPoint(rectCandidates.length ? rectCandidates : elements, 260, 440);
    expect(hitRect?.id).toBe(rect.id);
  });

  it('selects shapes when marquee rectangle encloses or intersects them', () => {
    const rect = createElement(ELEMENT_TYPES.RECTANGLE, 100, 100, 100, 100);
    const elements = [rect];

    // Marquee enclosing rect
    const enclosed = getElementsInRect(elements, 50, 50, 200, 200);
    expect(enclosed).toHaveLength(1);
    expect(enclosed[0].id).toBe(rect.id);

    // Marquee partially intersecting rect (edge crossing)
    const intersecting = getElementsInRect(elements, 150, 150, 100, 100);
    expect(intersecting).toHaveLength(1);
    expect(intersecting[0].id).toBe(rect.id);

    // Marquee completely outside rect
    const outside = getElementsInRect(elements, 300, 300, 100, 100);
    expect(outside).toHaveLength(0);
  });

  it('handles negative drag coordinates when selecting elements in rect', () => {
    const rect = createElement(ELEMENT_TYPES.RECTANGLE, 100, 100, 100, 100);
    const elements = [rect];

    // Drag from bottom-right (250, 250) to top-left (50, 50) -> width = -200, height = -200
    const dragBackwards = getElementsInRect(elements, 250, 250, -200, -200);
    expect(dragBackwards).toHaveLength(1);
    expect(dragBackwards[0].id).toBe(rect.id);
  });

  it('renders high contrast selection stroke and corner handles for single shape', () => {
    const ctx = createMockContext();
    const rect = createElement(ELEMENT_TYPES.RECTANGLE, 100, 100, 200, 150);

    renderSelectionOverlay(ctx, [rect], 1);

    // Bounding box stroked
    expect(ctx.strokeRect).toHaveBeenCalled();

    // 4 corner handles filled & stroked
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);

    // 1 rotation handle arc
    expect(ctx.arc).toHaveBeenCalledTimes(1);

    // Selection stroke style is set (vibrant indigo/purple)
    expect(ctx.strokeStyle).toMatch(/#6366f1|#818cf8/);
  });
});
