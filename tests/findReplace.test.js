import { describe, expect, it } from 'vitest';
import { findBoardMatches, replaceBoardMatch, replaceBoardMatches } from '../src/engine/findReplace.js';

describe('board find and replace', () => {
  it('finds text, frame names, and links without including hidden or deleted elements', () => {
    const elements = [
      { id: 'label', type: 'text', text: 'Welcome welcome' },
      { id: 'frame', type: 'frame', name: 'Welcome screen' },
      { id: 'link', type: 'rectangle', link: 'https://example.test/welcome' },
      { id: 'hidden', type: 'text', text: 'welcome', isHidden: true },
      { id: 'deleted', type: 'text', text: 'welcome', isDeleted: true },
    ];

    expect(findBoardMatches(elements, 'welcome')).toEqual([
      expect.objectContaining({ elementId: 'label', field: 'text', occurrences: 2 }),
      expect.objectContaining({ elementId: 'frame', field: 'name', occurrences: 1 }),
      expect.objectContaining({ elementId: 'link', field: 'link', occurrences: 1 }),
    ]);
  });

  it('supports case-sensitive matching and literal special characters', () => {
    const elements = [{ id: 'label', type: 'text', text: 'A+B a+b' }];

    expect(findBoardMatches(elements, 'a+b', { caseSensitive: true })).toHaveLength(1);
    expect(findBoardMatches(elements, 'a+b', { caseSensitive: true })[0].occurrences).toBe(1);
    expect(findBoardMatches(elements, 'a+b')).toHaveLength(1);
    expect(findBoardMatches(elements, 'a+b')[0].occurrences).toBe(2);
  });

  it('replaces every occurrence on active elements and preserves untouched/deleted records', () => {
    const hidden = { id: 'hidden', type: 'text', text: 'old', isHidden: true };
    const deleted = { id: 'deleted', type: 'text', text: 'old', isDeleted: true };
    const untouched = { id: 'untouched', type: 'text', text: 'other' };
    const source = [
      { id: 'target', type: 'text', text: 'old old', link: 'https://old.test', version: 4 },
      hidden,
      deleted,
      untouched,
    ];

    const result = replaceBoardMatches(source, 'old', 'new');

    expect(result.replacements).toBe(3);
    expect(result.elements[0]).toMatchObject({
      id: 'target',
      text: 'new new',
      link: 'https://new.test',
      version: 5,
    });
    expect(result.elements[1]).toBe(hidden);
    expect(result.elements[2]).toBe(deleted);
    expect(result.elements[3]).toBe(untouched);
  });

  it('replaces only one occurrence for the selected result field', () => {
    const elements = [
      { id: 'label', type: 'text', text: 'Start start', name: 'Start frame', version: 2 },
    ];
    const match = findBoardMatches(elements, 'start')[0];

    const result = replaceBoardMatch(elements, match, 'start', 'Begin');

    expect(result.replacements).toBe(1);
    expect(result.elements[0]).toMatchObject({
      text: 'Begin start',
      name: 'Start frame',
      version: 3,
    });
  });

  it('does not change the scene when the search query is empty', () => {
    const elements = [{ id: 'label', type: 'text', text: 'unchanged' }];
    expect(replaceBoardMatches(elements, '  ', 'new')).toEqual({ elements, replacements: 0 });
    expect(findBoardMatches(elements, '')).toEqual([]);
  });
});
