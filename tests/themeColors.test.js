import { describe, expect, it } from 'vitest';
import { adaptDefaultStrokeColors } from '../src/engine/themeColors.js';

describe('theme-aware default stroke colors', () => {
  it('switches only the previous theme default and preserves custom colors', () => {
    const elements = [
      { id: 'default', strokeColor: '#ffffff', version: 2 },
      { id: 'custom', strokeColor: '#ff0000', version: 4 },
    ];
    const lightElements = adaptDefaultStrokeColors(elements, 'light');

    expect(lightElements[0]).toMatchObject({ strokeColor: '#1e1e1e', version: 3 });
    expect(lightElements[1]).toBe(elements[1]);
  });

  it('switches default strokes back when returning to dark theme', () => {
    const element = { id: 'shape', strokeColor: '#1e1e1e' };
    expect(adaptDefaultStrokeColors([element], 'dark')[0].strokeColor).toBe('#ffffff');
    const elements = [element];
    expect(adaptDefaultStrokeColors(elements, 'light')).toBe(elements);
  });
});
