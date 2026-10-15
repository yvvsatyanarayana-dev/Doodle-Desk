import { describe, expect, it, vi } from 'vitest';
import { Script } from 'node:vm';

vi.mock('../src/engine/io/export.js', () => ({
  exportToSvg: vi.fn(async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
}));

import { generateInteractiveHtml } from '../src/engine/io/exportInteractiveHtml.js';

describe('scenario walkthrough HTML export', () => {
  it('embeds framed scenes, guide copy, and linked choices in a standalone player', async () => {
    const elements = [
      {
        id: 'start',
        type: 'frame',
        name: 'Choose a route',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        walkthroughDescription: 'Pick the safest next step.',
      },
      { id: 'done', type: 'frame', name: 'Complete', x: 400, y: 0, width: 300, height: 200 },
      {
        id: 'choice',
        type: 'rectangle',
        frameId: 'start',
        text: 'Review the request',
        link: '#element=done',
      },
    ];

    const html = await generateInteractiveHtml(elements, { name: 'Demo' }, {}, { mode: 'walkthrough' });

    expect(html).toContain('scenario-story-card');
    expect(html).toContain('scenarioHistory');
    expect(html).toContain('Pick the safest next step.');
    expect(html).toContain('Review the request');
    expect(html).toContain('targetFrameId');
    expect(html).not.toContain('id="btn-next"');
    const playerScript = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
    expect(playerScript).toBeTruthy();
    expect(() => new Script(playerScript)).not.toThrow();
  });

  it('escapes user-authored script-closing text in serialized scenario data', async () => {
    const elements = [
      {
        id: 'start',
        type: 'frame',
        name: '</script><script>alert(1)</script>',
        x: 0,
        y: 0,
        width: 300,
        height: 200,
      },
    ];

    const html = await generateInteractiveHtml(elements, {}, {}, { mode: 'walkthrough' });

    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).not.toContain('</script><script>alert(1)</script>');
  });
});
