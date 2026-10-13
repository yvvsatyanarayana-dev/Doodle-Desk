import { afterEach, describe, expect, it } from 'vitest';
import {
  clearChangeSnapshot,
  compareSceneToSnapshot,
  createChangeSnapshot,
  readChangeSnapshot,
  writeChangeSnapshot,
} from '../src/engine/changeTracking.js';

afterEach(() => localStorage.clear());

describe('Visual change tracking', () => {
  it('classifies added, changed, and removed objects while ignoring version metadata', () => {
    const baseline = createChangeSnapshot([
      { id: 'same', type: 'rectangle', x: 0, y: 0, width: 50, height: 30, version: 1 },
      { id: 'changed', type: 'text', x: 100, y: 0, text: 'Before', version: 1 },
      { id: 'removed', type: 'ellipse', x: 200, y: 0, width: 40, height: 40 },
    ]);
    const current = [
      { id: 'same', type: 'rectangle', x: 0, y: 0, width: 50, height: 30, version: 3, updated: 42 },
      { id: 'changed', type: 'text', x: 100, y: 0, text: 'After', version: 2 },
      { id: 'added', type: 'diamond', x: 300, y: 0, width: 40, height: 40 },
    ];

    expect(compareSceneToSnapshot(current, baseline).map(change => [change.id, change.status])).toEqual([
      ['changed', 'modified'],
      ['added', 'added'],
      ['removed', 'removed'],
    ]);
  });

  it('persists baselines independently per board and can clear one baseline', () => {
    const first = createChangeSnapshot([{ id: 'first', type: 'rectangle', x: 0, y: 0 }]);
    const second = createChangeSnapshot([{ id: 'second', type: 'ellipse', x: 1, y: 1 }]);
    writeChangeSnapshot('workspace', 'board-a', first);
    writeChangeSnapshot('workspace', 'board-b', second);

    expect(readChangeSnapshot('workspace', 'board-a')).toEqual(first);
    expect(readChangeSnapshot('workspace', 'board-b')).toEqual(second);
    clearChangeSnapshot('workspace', 'board-a');
    expect(readChangeSnapshot('workspace', 'board-a')).toBeNull();
    expect(readChangeSnapshot('workspace', 'board-b')).toEqual(second);
  });
});
