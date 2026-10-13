import { afterEach, describe, expect, it } from 'vitest';
import { hitTestElement } from '../src/engine/hitTest.js';
import { exportToSvg } from '../src/engine/io/export.js';
import {
  findShortcutAction,
  findShortcutConflict,
  getShortcutBindings,
  resetShortcutBindings,
  saveShortcutBindings,
} from '../src/engine/keyboardShortcuts.js';

afterEach(() => {
  localStorage.clear();
});

describe('Layers and keyboard shortcuts', () => {
  it('does not render or hit-test hidden and locked elements', async () => {
    const elements = [
      { id: 'visible', type: 'rectangle', x: 0, y: 0, width: 100, height: 80, strokeColor: '#e03131' },
      { id: 'hidden', type: 'rectangle', x: 120, y: 0, width: 100, height: 80, strokeColor: '#2f9e44', isHidden: true },
      { id: 'locked', type: 'rectangle', x: 240, y: 0, width: 100, height: 80, strokeColor: '#1971c2', locked: true },
    ];

    const svg = await exportToSvg(elements, {}, {}, { exportBackground: false });
    expect(svg).toContain('stroke="#e03131"');
    expect(svg).not.toContain('stroke="#2f9e44"');
    expect(svg).toContain('stroke="#1971c2"');
    expect(hitTestElement(elements[0], 0, 0)).toBe(true);
    expect(hitTestElement(elements[1], 120, 0)).toBe(false);
    expect(hitTestElement(elements[2], 240, 0)).toBe(false);
  });

  it('matches default and customized shortcuts without matching other modifiers', () => {
    const defaults = getShortcutBindings();
    expect(findShortcutAction({ key: 'z', ctrlKey: true }, defaults)).toBe('undo');
    expect(findShortcutAction({ key: 'g', ctrlKey: true, shiftKey: true }, defaults)).toBe('ungroup');
    expect(findShortcutAction({ key: 'g', ctrlKey: true }, defaults)).toBe('group');
    expect(findShortcutAction({ key: 'l', shiftKey: true }, defaults)).toBe('toggleLayers');
    expect(findShortcutAction({ key: 'z', ctrlKey: true, altKey: true }, defaults)).toBeNull();
    expect(findShortcutConflict('Ctrl+S', 'undo', defaults)).toBe('Save');
    expect(findShortcutConflict('Ctrl+Z', 'redo', defaults)).toBe('Undo');

    const customized = saveShortcutBindings({ ...defaults, undo: 'Alt+U' });
    expect(findShortcutAction({ key: 'u', altKey: true }, customized)).toBe('undo');
    expect(findShortcutAction({ key: 'z', ctrlKey: true }, customized)).toBeNull();
    expect(getShortcutBindings().undo).toBe('Alt+U');
  });

  it('restores default keyboard shortcuts', () => {
    saveShortcutBindings({ ...getShortcutBindings(), toggleLayers: 'Alt+L' });
    const reset = resetShortcutBindings();
    expect(reset.toggleLayers).toBe('Shift+L');
    expect(getShortcutBindings().toggleLayers).toBe('Shift+L');
  });
});
