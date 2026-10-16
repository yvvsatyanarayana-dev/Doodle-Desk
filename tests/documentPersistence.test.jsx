import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from '../src/hooks/useAutoSave.js';
import { useFileActions } from '../src/hooks/useFileActions.js';
import { useWorkspaces } from '../src/hooks/useWorkspaces.js';

let root;
let container;

function mountHook(renderHook) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  let result;
  function HookHarness() {
    result = renderHook();
    return null;
  }
  act(() => root.render(<HookHarness />));
  return () => result;
}

afterEach(() => {
  if (root) act(() => root.unmount());
  if (container?.parentNode) container.parentNode.removeChild(container);
  localStorage.clear();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  root = null;
  container = null;
});

describe('document persistence', () => {
  it('saves workspace documents in place and does not mark app-state-only updates dirty', async () => {
    const elements = [{ id: 'shape', type: 'rectangle', version: 1 }];
    const api = { getSceneElementsIncludingDeleted: () => elements };
    const saveWorkspace = vi.fn(() => true);
    const onSaved = vi.fn();
    const getActions = mountHook(() => useFileActions({
      doodleAPI: api,
      onSaveWorkspace: saveWorkspace,
      onSaved,
    }));

    act(() => getActions().onSceneChange(elements, { scrollX: 20 }));
    expect(getActions().isDirty).toBe(false);

    const changedElements = [{ ...elements[0], version: 2 }];
    act(() => getActions().onSceneChange(changedElements, {}));
    expect(getActions().isDirty).toBe(true);

    let saved;
    await act(async () => {
      saved = await getActions().handleSave();
    });

    expect(saved).toBe(true);
    expect(saveWorkspace).toHaveBeenCalledOnce();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(getActions().isDirty).toBe(false);
  });

  it('persists Ctrl+S workspace snapshots immediately to the active file', () => {
    const savedFile = {
      id: 'file-1',
      name: 'Chapter 1',
      elements: [],
      appState: {},
      binaryFiles: {},
    };
    localStorage.setItem('doodle_desk_workspaces_v1', JSON.stringify([{
      id: 'workspace-1',
      name: 'Main',
      activeFileId: savedFile.id,
      files: [savedFile],
    }]));
    localStorage.setItem('doodle_desk_active_workspace_id_v1', 'workspace-1');
    const liveElements = [{ id: 'shape', type: 'rectangle', version: 1 }];
    const api = {
      getSceneElements: () => liveElements,
      getAppState: () => ({ viewBackgroundColor: '#ffffff', zoom: { value: 1 } }),
      getFiles: () => ({}),
    };
    const getWorkspace = mountHook(() => useWorkspaces({ doodleAPI: api }));

    let saved;
    act(() => {
      saved = getWorkspace().saveActiveWorkspaceSnapshot(true, true);
    });

    const persistedWorkspaces = JSON.parse(localStorage.getItem('doodle_desk_workspaces_v1'));
    expect(saved).toBe(true);
    expect(persistedWorkspaces[0].files[0].elements).toEqual(liveElements);
    expect(persistedWorkspaces[0].files[0].name).toBe('Chapter 1');
  });

  it('suppresses recovery when its scene is already saved', () => {
    const elements = [{ id: 'saved-shape', type: 'rectangle', version: 3 }];
    localStorage.setItem('doodle_desktop_recovery_data', JSON.stringify({ elements, files: {} }));
    localStorage.setItem('doodle_desktop_recovery_meta', JSON.stringify({
      timestamp: 123,
      elementsCount: elements.length,
    }));
    const api = {
      getSceneElements: () => elements,
      getAppState: () => ({}),
      getFiles: () => ({}),
    };
    const getRecovery = mountHook(() => useAutoSave({
      doodleAPI: api,
      isDirty: false,
      savedElements: elements,
    }));

    expect(getRecovery().hasRecoverySession).toBe(false);
    expect(localStorage.getItem('doodle_desktop_recovery_data')).toBeNull();
    expect(localStorage.getItem('doodle_desktop_recovery_meta')).toBeNull();
  });

  it('keeps recovery available when it contains changes beyond the saved scene', () => {
    const savedElements = [{ id: 'saved-shape', type: 'rectangle', version: 1 }];
    const recoveryElements = [{ ...savedElements[0], version: 2 }];
    localStorage.setItem('doodle_desktop_recovery_data', JSON.stringify({ elements: recoveryElements }));
    localStorage.setItem('doodle_desktop_recovery_meta', JSON.stringify({
      timestamp: 123,
      elementsCount: recoveryElements.length,
    }));
    const api = {
      getSceneElements: () => savedElements,
      getAppState: () => ({}),
      getFiles: () => ({}),
    };
    const getRecovery = mountHook(() => useAutoSave({
      doodleAPI: api,
      isDirty: false,
      savedElements,
    }));

    expect(getRecovery().hasRecoverySession).toBe(true);
    expect(localStorage.getItem('doodle_desktop_recovery_data')).not.toBeNull();
  });
});
