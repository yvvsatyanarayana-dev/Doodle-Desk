import { describe, expect, it } from 'vitest';
import {
  getScenarioWalkthroughScenes,
  getWalkthroughFrameForElement,
} from '../src/engine/scenarioWalkthrough.js';

const frames = [
  { id: 'start', type: 'frame', name: 'Start', x: 0, y: 0, width: 300, height: 200 },
  { id: 'success', type: 'frame', name: 'Success', x: 400, y: 0, width: 300, height: 200 },
  { id: 'retry', type: 'frame', name: 'Try again', x: 800, y: 0, width: 300, height: 200 },
];

describe('scenario walkthrough graph', () => {
  it('builds labeled choices from linked objects within a frame', () => {
    const elements = [
      ...frames,
      { id: 'choice-yes', type: 'rectangle', frameId: 'start', text: 'Yes, continue', link: '#element=success' },
      { id: 'choice-no', type: 'rectangle', frameId: 'start', text: 'No, retry', link: '/?element=retry' },
    ];

    const [start] = getScenarioWalkthroughScenes(elements);

    expect(start.choices).toEqual([
      {
        sourceId: 'choice-yes',
        label: 'Yes, continue',
        targetFrameId: 'success',
        targetFrameName: 'Success',
      },
      {
        sourceId: 'choice-no',
        label: 'No, retry',
        targetFrameId: 'retry',
        targetFrameName: 'Try again',
      },
    ]);
  });

  it('uses frame geometry when an imported object has no frameId', () => {
    const object = { id: 'unassigned', type: 'rectangle', x: 20, y: 30, width: 50, height: 40 };
    expect(getWalkthroughFrameForElement([...frames, object], object)?.id).toBe('start');
  });

  it('ignores external, missing, deleted, hidden, and same-scene destinations', () => {
    const elements = [
      ...frames,
      { id: 'external', type: 'rectangle', frameId: 'start', text: 'Website', link: 'https://example.com' },
      { id: 'missing', type: 'rectangle', frameId: 'start', text: 'Missing', link: '#element=gone' },
      { id: 'self', type: 'rectangle', frameId: 'start', text: 'Stay', link: '#element=start' },
      { id: 'deleted', type: 'rectangle', frameId: 'start', isDeleted: true, link: '#element=success' },
      { id: 'hidden', type: 'rectangle', frameId: 'start', isHidden: true, link: '#element=success' },
    ];

    expect(getScenarioWalkthroughScenes(elements)[0].choices).toEqual([]);
  });

  it('keeps scene guide text and supplies stable names for unnamed frames', () => {
    const elements = [
      { ...frames[0], name: '', walkthroughDescription: 'Choose a path.' },
      { ...frames[1], name: '' },
    ];
    const scenes = getScenarioWalkthroughScenes(elements);
    expect(scenes.map(({ name, description }) => [name, description])).toEqual([
      ['Scene 1', 'Choose a path.'],
      ['Scene 2', ''],
    ]);
  });
});
