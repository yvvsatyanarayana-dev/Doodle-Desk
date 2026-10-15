import { afterEach, describe, expect, it } from 'vitest';
import {
  clearOfflineQueue,
  mergeOfflineScenes,
  offlineQueueStorageKey,
  readOfflineQueue,
  writeOfflineQueue,
} from '../src/engine/offlineCollaboration.js';

afterEach(() => localStorage.clear());

const element = (id, text, extra = {}) => ({
  id,
  type: 'text',
  text,
  x: 0,
  y: 0,
  version: 1,
  ...extra,
});

describe('offline collaboration queue', () => {
  it('merges independent local and remote edits without conflicts', () => {
    const base = [element('local', 'Before local'), element('remote', 'Before remote')];
    const local = [element('local', 'Local change'), base[1]];
    const remote = [base[0], element('remote', 'Remote change')];

    expect(mergeOfflineScenes(base, local, remote)).toEqual({
      elements: [remote[0], remote[1]].map((item) =>
        item.id === 'local' ? local[0] : item
      ),
      conflicts: [],
    });
  });

  it('reports overlapping edits and applies the selected local or remote version', () => {
    const base = [element('shared', 'Original')];
    const local = [element('shared', 'Local wording')];
    const remote = [element('shared', 'Remote wording')];

    const unresolved = mergeOfflineScenes(base, local, remote);
    expect(unresolved.conflicts).toMatchObject([{
      id: 'shared',
      label: 'Local wording',
      localElement: local[0],
      remoteElement: remote[0],
    }]);
    expect(unresolved.elements[0].text).toBe('Local wording');
    expect(mergeOfflineScenes(base, local, remote, { shared: 'remote' }).elements[0].text)
      .toBe('Remote wording');
  });

  it('treats deletion as a change and preserves distinct additions', () => {
    const base = [element('delete-me', 'Old'), element('keep', 'Keep')];
    const local = [element('keep', 'Local addition'), element('local-new', 'New local')];
    const remote = [element('keep', 'Keep'), element('remote-new', 'New remote')];
    const result = mergeOfflineScenes(base, local, remote);

    expect(result.conflicts).toHaveLength(0);
    expect(result.elements.map(item => item.id)).toEqual(['keep', 'remote-new', 'local-new']);
    expect(result.elements[0].text).toBe('Local addition');
  });

  it('persists a queue using a workspace, board, and room-scoped key', () => {
    const key = offlineQueueStorageKey('workspace / 1', 'board:2', 'ROOM-ABC');
    const queue = { baseElements: [element('a', 'base')], localElements: [element('a', 'local')] };
    writeOfflineQueue(key, queue);
    expect(readOfflineQueue(key)).toEqual(queue);
    clearOfflineQueue(key);
    expect(readOfflineQueue(key)).toBeNull();
  });
});
