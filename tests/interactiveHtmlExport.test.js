import { describe, expect, it } from 'vitest';
import { generateInteractiveHtml } from '../src/engine/io/exportInteractiveHtml.js';

describe('Interactive HTML export', () => {
  it('adapts neutral shape strokes and text when switching themes', async () => {
    const html = await generateInteractiveHtml([
      {
        id: 'white-shape',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        strokeColor: '#fff',
        backgroundColor: 'transparent',
      },
      {
        id: 'dark-shape',
        type: 'ellipse',
        x: 120,
        y: 0,
        width: 100,
        height: 80,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
      },
      {
        id: 'white-text',
        type: 'text',
        x: 0,
        y: 100,
        width: 100,
        height: 30,
        text: 'Readable text',
        strokeColor: '#ffffff',
      },
    ]);

    expect(html).toContain('data-theme-stroke="light"');
    expect(html).toContain('data-theme-stroke="dark"');
    expect(html).toContain('data-theme-text="light"');
    expect(html).toContain('[data-theme-stroke="light"]');
    expect(html).toContain('stroke: #1e1e1e !important');
    expect(html).toContain('[data-theme-stroke="dark"]');
    expect(html).toContain('stroke: #f4f4f5 !important');
    expect(html).toContain('[data-theme-text="light"]');
  });

  it('preserves saturated custom stroke colors', async () => {
    const html = await generateInteractiveHtml([
      {
        id: 'custom-shape',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        strokeColor: '#e03131',
        backgroundColor: 'transparent',
      },
    ]);

    const exportedShape = html.match(/<rect\b[^>]*stroke="#e03131"[^>]*>/)?.[0];
    expect(exportedShape).toBeTruthy();
    expect(exportedShape).not.toContain('data-theme-stroke');
  });
});
