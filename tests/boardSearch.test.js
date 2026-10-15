import { describe, expect, it } from 'vitest';
import { searchBoards } from '../src/engine/boardSearch.js';

describe('searchBoards', () => {
  const workspaces = [
    {
      id: 'workspace-1',
      name: 'Product',
      files: [
        {
          id: 'board-1',
          name: 'Checkout',
          elements: [
            { id: 'frame-1', type: 'frame', name: 'Payment review', x: 0 },
            { id: 'text-1', type: 'text', text: 'Approve the order', x: 0 },
            { id: 'hidden-1', type: 'text', text: 'Hidden draft', isHidden: true },
          ],
        },
      ],
    },
    {
      id: 'workspace-2',
      name: 'Operations',
      files: [
        {
          id: 'board-2',
          name: 'Incident response',
          elements: [{ id: 'text-2', type: 'text', text: 'Escalate to on-call' }],
        },
      ],
    },
  ];

  it('finds board titles and element text across every workspace', () => {
    const results = searchBoards(workspaces, 'escalate');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      kind: 'element',
      workspaceId: 'workspace-2',
      fileId: 'board-2',
      elementId: 'text-2',
      label: 'Escalate to on-call',
    });
  });

  it('uses live active-board elements instead of a stale saved snapshot', () => {
    const results = searchBoards(workspaces, 'latest note', {
      activeWorkspaceId: 'workspace-1',
      activeFileId: 'board-1',
      currentElements: [{ id: 'live', type: 'text', text: 'Latest note on the board' }],
    });
    expect(results.map(result => result.elementId)).toEqual(['live']);
  });

  it('includes named frames but skips hidden and deleted objects', () => {
    const results = searchBoards(workspaces, 'payment');
    expect(results.map(result => result.elementId)).toEqual(['frame-1']);
    expect(searchBoards(workspaces, 'hidden draft')).toEqual([]);
  });

  it('requires at least two characters', () => {
    expect(searchBoards(workspaces, 'a')).toEqual([]);
  });
});
