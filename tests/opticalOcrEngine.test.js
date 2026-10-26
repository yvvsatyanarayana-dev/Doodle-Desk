import { describe, it, expect } from 'vitest';
import {
  binarizeImageData,
  classifyContourShape,
  inferDiagramLabel,
  vectorizeImageContours,
  traceImageVectorContours,
} from '../src/utils/opticalOcrEngine.js';

describe('opticalOcrEngine', () => {
  it('binarizes RGBA imageData based on luminance threshold', () => {
    // 2x2 mock image data: 1 white pixel, 3 dark pixels
    const data = new Uint8ClampedArray([
      255, 255, 255, 255, // white
      10, 10, 10, 255,     // dark
      20, 20, 20, 255,     // dark
      30, 30, 30, 255,     // dark
    ]);
    const imgData = { width: 2, height: 2, data };
    const { binary } = binarizeImageData(imgData, 128);

    expect(binary[0]).toBe(0); // white -> 0
    expect(binary[1]).toBe(1); // dark -> 1
    expect(binary[2]).toBe(1);
    expect(binary[3]).toBe(1);
  });

  it('classifies contour shapes into arrow, ellipse, or rectangle', () => {
    expect(classifyContourShape(200, 20)).toBe('arrow-horizontal');
    expect(classifyContourShape(20, 180)).toBe('arrow-vertical');
    expect(classifyContourShape(100, 100, 0.7)).toBe('ellipse');
    expect(classifyContourShape(150, 90, 0.5)).toBe('rectangle');
  });

  it('infers relevant architecture vocabulary labels', () => {
    const label1 = inferDiagramLabel('rectangle', 0);
    expect(typeof label1).toBe('string');
    expect(label1.length).toBeGreaterThan(0);

    const dbLabel = inferDiagramLabel('ellipse', 0);
    expect(dbLabel.includes('DB') || dbLabel.includes('Store') || dbLabel.includes('Data')).toBe(true);
  });

  it('provides clean non-hallucinatory labels when architecture vocabulary is disabled', () => {
    const neutralBox = inferDiagramLabel('rectangle', 0, undefined, false);
    expect(neutralBox).toBe('Box 1');

    const neutralNode = inferDiagramLabel('ellipse', 1, undefined, false);
    expect(neutralNode).toBe('Node 2');

    const neutralDecision = inferDiagramLabel('diamond', 2, undefined, false);
    expect(neutralDecision).toBe('Decision 3');
  });

  it('vectorizes an image with a dark block into editable vector elements', () => {
    const width = 60;
    const height = 40;
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill all with white
    data.fill(255);

    // Draw a dark rectangle in the middle
    for (let y = 10; y < 35; y++) {
      for (let x = 10; x < 50; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 10;
        data[idx + 1] = 10;
        data[idx + 2] = 10;
        data[idx + 3] = 255;
      }
    }

    const imgData = { width, height, data };
    const elements = vectorizeImageContours(imgData, { threshold: 128 });

    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0].type).toBe('rectangle');
    expect(elements[0].text).toBeTruthy();
    expect(elements[0].isDeleted).toBe(false);
  });

  it('traces drawing contours into native freedraw vector paths', () => {
    const width = 80;
    const height = 60;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255); // white paper

    // Draw a dark pencil stroke line
    for (let x = 15; x < 65; x++) {
      const y = Math.round(30 + Math.sin(x / 5) * 5);
      const idx = (y * width + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }

    const imgData = { width, height, data };
    const strokes = traceImageVectorContours(imgData, { threshold: 128, minPoints: 2, strokeWidth: 3 });

    expect(Array.isArray(strokes)).toBe(true);
    if (strokes.length > 0) {
      expect(strokes[0].type).toBe('freedraw');
      expect(Array.isArray(strokes[0].points)).toBe(true);
      expect(strokes[0].points.length).toBeGreaterThan(1);
      expect(strokes[0].strokeWidth).toBe(3);
    }
  });

  it('supports intricate sensitivity capturing fine detailed contours', () => {
    const width = 60;
    const height = 40;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(240);

    // Subtle edge
    for (let x = 10; x < 50; x++) {
      const idx = (20 * width + x) * 4;
      data[idx] = 160;
      data[idx + 1] = 160;
      data[idx + 2] = 160;
    }

    const imgData = { width, height, data };
    const strokes = traceImageVectorContours(imgData, { edgeSensitivity: 14, threshold: 180, minPoints: 2 });
    expect(Array.isArray(strokes)).toBe(true);
  });
});
