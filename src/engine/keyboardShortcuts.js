const STORAGE_KEY = 'doodle_keyboard_shortcuts_v1';

export const SHORTCUT_DEFINITIONS = [
  { id: 'undo', label: 'Undo', defaultShortcut: 'Ctrl+Z' },
  { id: 'redo', label: 'Redo', defaultShortcut: 'Ctrl+Y' },
  { id: 'selectAll', label: 'Select all', defaultShortcut: 'Ctrl+A' },
  { id: 'copy', label: 'Copy', defaultShortcut: 'Ctrl+C' },
  { id: 'paste', label: 'Paste', defaultShortcut: 'Ctrl+V' },
  { id: 'duplicate', label: 'Duplicate', defaultShortcut: 'Ctrl+D' },
  { id: 'delete', label: 'Delete selection', defaultShortcut: 'Delete' },
  { id: 'group', label: 'Group selection', defaultShortcut: 'Ctrl+G' },
  { id: 'ungroup', label: 'Ungroup selection', defaultShortcut: 'Ctrl+Shift+G' },
  { id: 'bringToFront', label: 'Bring forward', defaultShortcut: 'Ctrl+]' },
  { id: 'sendToBack', label: 'Send backward', defaultShortcut: 'Ctrl+[' },
  { id: 'zoomIn', label: 'Zoom in', defaultShortcut: 'Ctrl+=' },
  { id: 'zoomOut', label: 'Zoom out', defaultShortcut: 'Ctrl+-' },
  { id: 'zoomReset', label: 'Reset zoom', defaultShortcut: 'Ctrl+0' },
  { id: 'toggleLayers', label: 'Toggle layers panel', defaultShortcut: 'Shift+L' },
  { id: 'toggleToolLock', label: 'Lock active tool', defaultShortcut: 'Q' },
  { id: 'toolSelection', label: 'Selection tool', defaultShortcut: 'V' },
  { id: 'toolRectangle', label: 'Rectangle tool', defaultShortcut: 'R' },
  { id: 'toolDiamond', label: 'Diamond tool', defaultShortcut: 'D' },
  { id: 'toolEllipse', label: 'Ellipse tool', defaultShortcut: 'O' },
  { id: 'toolArrow', label: 'Arrow tool', defaultShortcut: 'A' },
  { id: 'toolLine', label: 'Line tool', defaultShortcut: 'L' },
  { id: 'toolFreedraw', label: 'Free draw tool', defaultShortcut: 'P' },
  { id: 'toolText', label: 'Text tool', defaultShortcut: 'T' },
  { id: 'toolEraser', label: 'Eraser tool', defaultShortcut: 'E' },
  { id: 'toolHand', label: 'Hand tool', defaultShortcut: 'H' },
  { id: 'toolFrame', label: 'Frame tool', defaultShortcut: 'F' },
];

export const RESERVED_SHORTCUTS = [
  { shortcut: 'Ctrl+S', label: 'Save' },
  { shortcut: 'Ctrl+Shift+S', label: 'Save as' },
  { shortcut: 'Ctrl+O', label: 'Open' },
  { shortcut: 'Ctrl+N', label: 'New file' },
  { shortcut: 'Ctrl+P', label: 'Print' },
  { shortcut: 'Ctrl+,', label: 'Preferences' },
  { shortcut: 'Ctrl+Shift+E', label: 'Quick export' },
  { shortcut: 'Ctrl+Shift+A', label: 'AI diagram generator' },
  { shortcut: 'Ctrl+Shift+I', label: 'Icon library' },
];

const DEFAULT_BINDINGS = Object.fromEntries(
  SHORTCUT_DEFINITIONS.map(({ id, defaultShortcut }) => [id, defaultShortcut])
);

export function getShortcutBindings() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return Object.fromEntries(
      SHORTCUT_DEFINITIONS.map(({ id }) => [
        id,
        typeof parsed[id] === 'string' ? parsed[id] : DEFAULT_BINDINGS[id],
      ])
    );
  } catch (error) {
    console.error('Unable to load keyboard shortcuts', error);
    return { ...DEFAULT_BINDINGS };
  }
}

export function saveShortcutBindings(bindings) {
  const validBindings = Object.fromEntries(
    SHORTCUT_DEFINITIONS.map(({ id }) => [
      id,
      typeof bindings[id] === 'string' ? bindings[id] : DEFAULT_BINDINGS[id],
    ])
  );
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(validBindings));
  } catch (error) {
    console.error('Unable to save keyboard shortcuts', error);
    throw error;
  }
  return validBindings;
}

export function resetShortcutBindings() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Unable to reset keyboard shortcuts', error);
    throw error;
  }
  return { ...DEFAULT_BINDINGS };
}

export function formatShortcutEvent(event) {
  const modifiers = [];
  if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return null;
  modifiers.push(key);
  return modifiers.join('+');
}

export function findShortcutAction(event, bindings) {
  const shortcut = formatShortcutEvent(event);
  if (!shortcut) return null;
  return SHORTCUT_DEFINITIONS.find(({ id }) => bindings[id] === shortcut)?.id || null;
}

export function findShortcutConflict(shortcut, actionId, bindings) {
  const reserved = RESERVED_SHORTCUTS.find(item => item.shortcut === shortcut);
  if (reserved) return reserved.label;
  const action = SHORTCUT_DEFINITIONS.find(({ id }) =>
    id !== actionId && bindings[id] === shortcut
  );
  return action?.label || null;
}
