import { describe, expect, it } from 'vitest';
import { getDragMoveElementIds, getFrameMoveElementIds } from '../src/engine/frameMovement.js';

describe('frame movement', () => {
  it('expands a drag to related bindings, containers, groups, and component instances', () => {
    const elements = [
      { id: 'shape', type: 'rectangle', boundElements: [{ id: 'label' }], groupIds: ['group'] },
      { id: 'label', type: 'text', containerId: 'shape' },
      { id: 'group-peer', type: 'ellipse', groupIds: ['group'] },
      { id: 'component-peer', type: 'rectangle', componentInstanceId: 'instance' },
    ];

    expect([...getDragMoveElementIds(elements, ['shape', 'component-peer'])]).toEqual([
      'shape',
      'component-peer',
      'label',
      'group-peer',
    ]);
  });

  it('moves contents assigned to a frame and unassigned elements inside it', () => {
    const elements = [
      { id: 'frame', type: 'frame', x: 0, y: 0, width: 300, height: 200 },
      { id: 'assigned', type: 'rectangle', frameId: 'frame', x: 350, y: 20, width: 40, height: 40 },
      { id: 'unassigned', type: 'rectangle', x: 40, y: 50, width: 30, height: 30 },
      { id: 'outside', type: 'rectangle', x: 400, y: 300, width: 30, height: 30 },
    ];

    expect([...getFrameMoveElementIds(elements, ['frame'])]).toEqual([
      'frame',
      'assigned',
      'unassigned',
    ]);
  });

  it('does not pull content from overlapping frames into a pasted frame', () => {
    const elements = [
      { id: 'original-frame', type: 'frame', x: 0, y: 0, width: 300, height: 200 },
      { id: 'pasted-frame', type: 'frame', x: 20, y: 20, width: 300, height: 200 },
      { id: 'original-content', type: 'rectangle', frameId: 'original-frame', x: 60, y: 60, width: 40, height: 40 },
    ];

    expect([...getFrameMoveElementIds(elements, ['pasted-frame'])]).toEqual(['pasted-frame']);
  });

  it('ignores locked, hidden, and deleted contents when moving a frame', () => {
    const elements = [
      { id: 'frame', type: 'frame', x: 0, y: 0, width: 300, height: 200 },
      { id: 'locked', type: 'rectangle', frameId: 'frame', locked: true, x: 10, y: 10, width: 20, height: 20 },
      { id: 'hidden', type: 'rectangle', frameId: 'frame', isHidden: true, x: 30, y: 10, width: 20, height: 20 },
      { id: 'deleted', type: 'rectangle', frameId: 'frame', isDeleted: true, x: 50, y: 10, width: 20, height: 20 },
    ];

    expect([...getFrameMoveElementIds(elements, ['frame'])]).toEqual(['frame']);
  });
});
