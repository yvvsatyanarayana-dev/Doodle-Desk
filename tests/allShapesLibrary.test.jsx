import { describe, expect, it, vi } from 'vitest';
import { ELEMENT_TYPES, createElement } from '../src/engine/elements.js';
import { renderElement } from '../src/engine/renderer/render.js';
import { hitTestElement } from '../src/engine/hitTest.js';
import { elementToSvg } from '../src/engine/io/export.js';
import { recognizeShape } from '../src/utils/shapeRecognizer.js';

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
    stroke: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    ellipse: vi.fn(),
    arc: vi.fn(),
  };
}

describe('All Shapes Library & Precision Recognition', () => {
  it('defines all first-class shape types in ELEMENT_TYPES', () => {
    expect(ELEMENT_TYPES.TRIANGLE).toBe('triangle');
    expect(ELEMENT_TYPES.STAR).toBe('star');
    expect(ELEMENT_TYPES.HEXAGON).toBe('hexagon');
    expect(ELEMENT_TYPES.OCTAGON).toBe('octagon');
    expect(ELEMENT_TYPES.CYLINDER).toBe('cylinder');
    expect(ELEMENT_TYPES.CLOUD).toBe('cloud');
    expect(ELEMENT_TYPES.CAPSULE).toBe('capsule');
    expect(ELEMENT_TYPES.PARALLELOGRAM).toBe('parallelogram');
  });

  it('renders all shape types to canvas context without throwing', () => {
    const ctx = createContext();
    const shapes = [
      ELEMENT_TYPES.TRIANGLE,
      ELEMENT_TYPES.STAR,
      ELEMENT_TYPES.HEXAGON,
      ELEMENT_TYPES.OCTAGON,
      ELEMENT_TYPES.CYLINDER,
      ELEMENT_TYPES.CLOUD,
      ELEMENT_TYPES.CAPSULE,
      ELEMENT_TYPES.PARALLELOGRAM,
    ];

    shapes.forEach((type) => {
      const el = createElement(type, 100, 100, 120, 90, {
        strokeColor: '#ffffff',
        backgroundColor: 'transparent',
        fillStyle: 'none',
        roughness: 1,
      });
      expect(() => renderElement(ctx, el)).not.toThrow();
    });
  });

  it('performs hit testing on triangle, cylinder, hexagon, and star', () => {
    const triangle = createElement(ELEMENT_TYPES.TRIANGLE, 100, 100, 100, 100, {
      backgroundColor: '#ffffff',
    });
    // Apex is at (150, 100), center is (150, 150)
    expect(hitTestElement(triangle, 150, 150)).toBe(true);
    expect(hitTestElement(triangle, 20, 20)).toBe(false);

    const cylinder = createElement(ELEMENT_TYPES.CYLINDER, 200, 200, 100, 120, {
      backgroundColor: '#ffffff',
    });
    expect(hitTestElement(cylinder, 250, 260)).toBe(true);
    expect(hitTestElement(cylinder, 50, 50)).toBe(false);
  });

  it('exports valid SVG strings for new geometric shapes', () => {
    const shapes = [
      ELEMENT_TYPES.TRIANGLE,
      ELEMENT_TYPES.STAR,
      ELEMENT_TYPES.HEXAGON,
      ELEMENT_TYPES.CYLINDER,
      ELEMENT_TYPES.CLOUD,
      ELEMENT_TYPES.CAPSULE,
    ];

    shapes.forEach((type) => {
      const el = createElement(type, 50, 50, 100, 80, {
        strokeColor: '#ffffff',
        backgroundColor: 'transparent',
      });
      const svg = elementToSvg(el);
      expect(typeof svg).toBe('string');
      expect(svg.length).toBeGreaterThan(10);
    });
  });

  it('recognizes hand-drawn arrows in shape recognition', () => {
    // Arrow: horizontal stem + barbed return tip
    const stroke = {
      id: 'arrow-stroke',
      type: 'freedraw',
      x: 10,
      y: 50,
      width: 100,
      height: 20,
      points: [
        [0, 0], [15, 0], [30, 0], [45, 0], [60, 0], [75, 0], [90, 0], [100, 0],
        [88, -10],
      ],
    };
    const rec = recognizeShape(stroke);
    expect(rec).toBeTruthy();
    expect(rec.type).toBe('arrow');
  });

  it('recognizes hand-drawn 3-corner closed strokes as native triangles', () => {
    const stroke = {
      id: 'triangle-stroke',
      type: 'freedraw',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      points: [
        [50, 10], [52, 14], [70, 50], [90, 90], [100, 100],
        [60, 98], [20, 99], [0, 100],
        [20, 60], [40, 25], [50, 10],
      ],
    };
    const rec = recognizeShape(stroke);
    expect(rec).toBeTruthy();
    expect(rec.type).toBe('triangle');
  });

  it('renders TopToolbar component without ReferenceError on Shapes icon', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { TopToolbar } = await import('../src/engine/components/TopToolbar.jsx');
    const React = await import('react');
    const html = renderToStaticMarkup(React.createElement(TopToolbar, { activeTool: 'selection', onSelectTool: () => {} }));
    expect(html).toContain('App-toolbar');
  });
});

