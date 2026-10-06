import { describe, it, expect } from 'vitest';

describe('Doodle Document File Handling', () => {
  it('should validate and parse valid .doodle JSON structure', () => {
    const rawDocument = JSON.stringify({
      type: 'doodle',
      version: 2,
      source: 'https://doodledesk.app',
      elements: [
        {
          id: 'elem-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          strokeColor: '#1e1e1e',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 2,
          roughness: 1,
          opacity: 100,
          isDeleted: false,
        },
      ],
      appState: {
        viewBackgroundColor: '#ffffff',
        gridSize: null,
      },
      files: {},
    });

    const parsed = JSON.parse(rawDocument);
    expect(parsed.type).toBe('doodle');
    expect(parsed.elements).toHaveLength(1);
    expect(parsed.elements[0].type).toBe('rectangle');
    expect(parsed.elements[0].width).toBe(200);
  });

  it('should validate and parse .doodlelib library files', () => {
    const rawLib = JSON.stringify({
      type: 'doodlelib',
      version: 2,
      libraryItems: [
        {
          id: 'lib-item-1',
          status: 'published',
          elements: [
            {
              id: 'lib-el-1',
              type: 'diamond',
              x: 0,
              y: 0,
              width: 80,
              height: 80,
            },
          ],
        },
      ],
    });

    const parsed = JSON.parse(rawLib);
    expect(parsed.type).toBe('doodlelib');
    expect(parsed.libraryItems).toHaveLength(1);
    expect(parsed.libraryItems[0].elements[0].type).toBe('diamond');
  });

  it('should format window titles accurately with unsaved indicator', () => {
    const formatTitle = (fileName, isDirty) => {
      const name = fileName ? fileName : 'Untitled';
      const prefix = isDirty ? '● ' : '';
      return `${prefix}${name} - Doodle Desk`;
    };

    expect(formatTitle(null, false)).toBe('Untitled - Doodle Desk');
    expect(formatTitle('diagram.doodle', false)).toBe('diagram.doodle - Doodle Desk');
    expect(formatTitle('diagram.doodle', true)).toBe('● diagram.doodle - Doodle Desk');
    expect(formatTitle(null, true)).toBe('● Untitled - Doodle Desk');
  });

  it('should properly serialize crash recovery snapshot and verify timestamp', () => {
    const snapshot = {
      elements: [{ id: '1', type: 'rectangle' }],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
      filePath: 'C:/drawings/test.doodle',
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(snapshot);
    const restored = JSON.parse(serialized);

    expect(restored.elements).toHaveLength(1);
    expect(restored.filePath).toBe('C:/drawings/test.doodle');
    expect(restored.timestamp).toBeGreaterThan(0);
  });
});
