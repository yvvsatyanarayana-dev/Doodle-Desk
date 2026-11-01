import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileActions } from '../src/hooks/useFileActions';

function TestComponent({ onMount, onBeforeClose }) {
  const actions = useFileActions({
    doodleAPI: {
      getSceneElementsIncludingDeleted: () => [],
      getSceneElements: () => [],
      getAppState: () => ({}),
      getFiles: () => ({}),
    },
    onBeforeClose,
  });

  React.useEffect(() => {
    onMount(actions);
  }, [actions, onMount]);

  return null;
}

describe('Window Close & Dirty Actions', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('immediately closes window if document is clean', () => {
    const closeWindow = vi.fn();
    const onBeforeClose = vi.fn();
    window.electronAPI = {
      closeWindow,
      updateDocumentState: vi.fn(),
      on: vi.fn(() => vi.fn()),
    };

    let actions;
    act(() => {
      root.render(<TestComponent onMount={(a) => { actions = a; }} onBeforeClose={onBeforeClose} />);
    });

    expect(actions.isDirty).toBe(false);

    act(() => {
      actions.handleCloseWindow();
    });

    expect(onBeforeClose).toHaveBeenCalledOnce();
    expect(closeWindow).toHaveBeenCalledOnce();
    expect(actions.showUnsavedModal).toBe(false);
  });

  it('prompts unsaved modal when dirty, and closes upon discard without hanging', async () => {
    const respondToCloseRequest = vi.fn();
    const updateDocumentState = vi.fn();
    const onBeforeClose = vi.fn();
    window.electronAPI = {
      closeWindow: vi.fn(),
      respondToCloseRequest,
      updateDocumentState,
      on: vi.fn(() => vi.fn()),
    };

    let actions;
    act(() => {
      root.render(<TestComponent onMount={(a) => { actions = a; }} onBeforeClose={onBeforeClose} />);
    });

    // Mark dirty by changing scene elements
    act(() => {
      actions.onSceneChange([{ id: 'elem-1', type: 'rectangle' }]);
    });

    expect(actions.isDirty).toBe(true);

    // Trigger close
    act(() => {
      actions.handleCloseWindow();
    });

    expect(actions.showUnsavedModal).toBe(true);

    // User chooses "Don't Save" (discard)
    await act(async () => {
      await actions.resolveUnsavedModal('discard');
    });

    expect(actions.showUnsavedModal).toBe(false);
    expect(actions.isDirty).toBe(false);
    expect(onBeforeClose).toHaveBeenCalledOnce();
    expect(respondToCloseRequest).toHaveBeenCalledWith('discard');
    expect(updateDocumentState).toHaveBeenCalledWith({ filePath: null, isDirty: false });
  });

  it('cancels close without closing window when user selects cancel in unsaved modal', async () => {
    const respondToCloseRequest = vi.fn();
    const onBeforeClose = vi.fn();
    window.electronAPI = {
      closeWindow: vi.fn(),
      respondToCloseRequest,
      updateDocumentState: vi.fn(),
      on: vi.fn(() => vi.fn()),
    };

    let actions;
    act(() => {
      root.render(<TestComponent onMount={(a) => { actions = a; }} onBeforeClose={onBeforeClose} />);
    });

    act(() => {
      actions.onSceneChange([{ id: 'elem-1', type: 'rectangle' }]);
      actions.handleCloseWindow();
    });

    expect(actions.showUnsavedModal).toBe(true);

    await act(async () => {
      await actions.resolveUnsavedModal('cancel');
    });

    expect(actions.showUnsavedModal).toBe(false);
    expect(actions.isDirty).toBe(true); // remains dirty
    expect(onBeforeClose).not.toHaveBeenCalled();
    expect(respondToCloseRequest).toHaveBeenCalledWith('cancel');
  });
});
