import { describe, expect, it } from 'vitest';
import { recognizeShape } from '../src/utils/shapeRecognizer.js';

function makeStroke(points) {
  const minX = Math.min(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxX = Math.max(...points.map(([x]) => x));
  const maxY = Math.max(...points.map(([, y]) => y));
  return {
    id: 'test-stroke',
    type: 'freedraw',
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: points.map(([x, y]) => [x - minX, y - minY]),
  };
}

describe('draw-to-shape recognition', () => {
  it('converts a closed rectangle stroke to a rectangle', () => {
    const stroke = makeStroke([
      [10, 10], [60, 10], [110, 10], [110, 60], [110, 110],
      [60, 110], [10, 110], [10, 60], [10, 10],
    ]);

    expect(recognizeShape(stroke)?.type).toBe('rectangle');
  });

  it('converts a closed circular stroke to an ellipse', () => {
    const center = [80, 75];
    const radius = 45;
    const points = Array.from({ length: 49 }, (_, index) => {
      const angle = (index / 48) * Math.PI * 2;
      return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
    });

    expect(recognizeShape(makeStroke(points))?.type).toBe('ellipse');
  });
});
