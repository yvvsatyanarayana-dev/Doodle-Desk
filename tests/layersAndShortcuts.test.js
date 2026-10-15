import { afterEach, describe, expect, it } from 'vitest';
import { getElementAtPoint, hitTestElement } from '../src/engine/hitTest.js';
import { exportToSvg } from '../src/engine/io/export.js';
import {
  findShortcutAction,
  findShortcutConflict,
  getShortcutBindings,
  resetShortcutBindings,
  saveShortcutBindings,
} from '../src/engine/keyboardShortcuts.js';
import { assignUniqueClonedFrameNames, cloneElementSet } from '../src/engine/elements.js';

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

  it('can hit-test a locked element only when explicitly requested', () => {
    const locked = { id: 'locked', type: 'rectangle', x: 10, y: 10, width: 80, height: 60, locked: true };
    expect(getElementAtPoint([locked], 10, 40)).toBeNull();
    expect(getElementAtPoint([locked], 10, 40, { includeLocked: true })).toBe(locked);
  });

  it('moves an already selected frame instead of its overlapping canvas content', () => {
    const frame = { id: 'frame-copy', type: 'frame', x: 0, y: 0, width: 200, height: 120 };
    const content = {
      id: 'content',
      type: 'rectangle',
      x: 30,
      y: 30,
      width: 60,
      height: 40,
      backgroundColor: '#ffffff',
    };
    expect(getElementAtPoint([frame, content], 45, 45, { preferFrameIds: ['frame-copy'] })).toBe(frame);
    expect(getElementAtPoint([frame, content], 45, 45)).toBe(content);
  });

  it('duplicates grouped elements into a separate group and remaps internal bindings', () => {
    const originals = [
      {
        id: 'shape',
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 80,
        height: 60,
        groupIds: ['original-group'],
        boundElements: [{ id: 'label', type: 'text' }],
      },
      {
        id: 'label',
        type: 'text',
        x: 20,
        y: 30,
        width: 40,
        height: 20,
        groupIds: ['original-group'],
        containerId: 'shape',
      },
    ];

    const clones = cloneElementSet(originals);

    expect(clones.map(element => element.id)).not.toEqual(originals.map(element => element.id));
    expect(clones[0].groupIds[0]).toBe(clones[1].groupIds[0]);
    expect(clones[0].groupIds[0]).not.toBe(originals[0].groupIds[0]);
    expect(clones[0].boundElements[0].id).toBe(clones[1].id);
    expect(clones[1].containerId).toBe(clones[0].id);
  });

  it('remaps copied frame membership to the pasted frame', () => {
    const originals = [
      { id: 'frame', type: 'frame', x: 0, y: 0, width: 200, height: 120 },
      { id: 'child', type: 'rectangle', frameId: 'frame', x: 20, y: 20, width: 40, height: 30 },
    ];
    const clones = cloneElementSet(originals);
    expect(clones[1].frameId).toBe(clones[0].id);
    expect(clones[1].frameId).not.toBe(originals[0].id);
  });

  it('assigns unique sequential names to cloned frames', () => {
    const originals = [
      { id: 'frame-1', type: 'frame', name: 'Frame 1' },
      { id: 'frame-2', type: 'frame', name: 'Frame 2' },
    ];
    const clones = assignUniqueClonedFrameNames(cloneElementSet(originals), originals);

    expect(clones.map(frame => frame.name)).toEqual(['Frame 3', 'Frame 4']);
    expect(originals.map(frame => frame.name)).toEqual(['Frame 1', 'Frame 2']);
  });

  it('matches default and customized shortcuts without matching other modifiers', () => {
    const defaults = getShortcutBindings();
    expect(findShortcutAction({ key: 'z', ctrlKey: true }, defaults)).toBe('undo');
    expect(findShortcutAction({ key: 'g', ctrlKey: true, shiftKey: true }, defaults)).toBe('ungroup');
    expect(findShortcutAction({ key: 'g', ctrlKey: true }, defaults)).toBe('group');
    expect(findShortcutAction({ key: 'l', shiftKey: true }, defaults)).toBe('toggleLayers');
    expect(findShortcutAction({ key: 'p', ctrlKey: true, shiftKey: true }, defaults)).toBe('openPrototypeLinks');
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
