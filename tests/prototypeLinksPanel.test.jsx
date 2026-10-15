import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PrototypeLinksPanel } from '../src/components/PrototypeLinksPanel.jsx';

describe('PrototypeLinksPanel', () => {
  it('connects a selected shape to another shape and starts from the chosen entry screen', () => {
    let elements = [
      { id: 'start', type: 'frame', name: 'Start screen', x: 0, y: 0, width: 400, height: 300 },
      { id: 'details', type: 'frame', name: 'Details', x: 500, y: 0, width: 400, height: 300 },
      { id: 'button', type: 'rectangle', text: 'Continue', x: 20, y: 20, width: 100, height: 40 },
      { id: 'next-button', type: 'ellipse', text: 'Next step', x: 150, y: 20, width: 100, height: 40 },
    ];
    const updateScene = vi.fn(({ elements: updated }) => { elements = updated; });
    const api = {
      getSceneElements: () => elements,
      getSceneElementsIncludingDeleted: () => elements,
      getAppState: () => ({ selectedElementIds: { button: true } }),
      updateScene,
      scrollToContent: vi.fn(),
    };
    const onStart = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PrototypeLinksPanel doodleAPI={api} onClose={vi.fn()} onStart={onStart} />);
    });

    const destinationSelect = container.querySelector('.prototype-frame-select select');
    act(() => {
      destinationSelect.value = 'next-button';
      destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      container.querySelector('.prototype-connect-button').click();
    });
    expect(updateScene).toHaveBeenCalledTimes(1);
    expect(elements.find((element) => element.id === 'button').link).toBe('#element=next-button');
    expect(container.querySelector('.prototype-interaction-list')).toBeTruthy();

    act(() => {
      container.querySelector('.prototype-preview-button').click();
    });
    expect(onStart).toHaveBeenCalledWith('start');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('connects a frame to a shape and offers any canvas object as an interaction destination', () => {
    let elements = [
      { id: 'start', type: 'frame', name: 'Start screen', x: 0, y: 0, width: 400, height: 300 },
      { id: 'button', type: 'rectangle', text: 'Continue', x: 20, y: 20, width: 100, height: 40 },
      { id: 'card', type: 'diamond', text: 'Next step', x: 150, y: 20, width: 100, height: 40 },
    ];
    const updateScene = vi.fn(({ elements: updated }) => { elements = updated; });
    const api = {
      getSceneElements: () => elements,
      getSceneElementsIncludingDeleted: () => elements,
      getAppState: () => ({ selectedElementIds: { start: true } }),
      updateScene,
      scrollToContent: vi.fn(),
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PrototypeLinksPanel doodleAPI={api} onClose={vi.fn()} onStart={vi.fn()} />);
    });

    const destinationSelect = container.querySelector('.prototype-frame-select select');
    expect([...destinationSelect.options].map((option) => option.value)).toEqual(['button', 'card']);
    act(() => {
      destinationSelect.value = 'button';
      destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      container.querySelector('.prototype-connect-button').click();
    });

    expect(elements.find((element) => element.id === 'start').link).toBe('#element=button');
    expect(container.querySelector('.prototype-interaction-list select').options.length).toBeGreaterThan(1);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('explains when a selected shape is the only shape available as a destination', () => {
    const elements = [
      { id: 'frame', type: 'frame', name: 'Screen', x: 0, y: 0, width: 400, height: 300 },
      { id: 'only-shape', type: 'rectangle', x: 20, y: 20, width: 100, height: 40 },
    ];
    const api = {
      getSceneElements: () => elements,
      getAppState: () => ({ selectedElementIds: { 'only-shape': true } }),
      updateScene: vi.fn(),
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PrototypeLinksPanel doodleAPI={api} onClose={vi.fn()} onStart={vi.fn()} />);
    });

    expect(container.querySelector('.prototype-destination-hint')?.textContent).toContain('Add another shape');
    expect([...container.querySelector('.prototype-frame-select select').options].map((option) => option.value)).toEqual(['frame']);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('allows shape-to-shape connections and preview when the canvas has no frames', () => {
    let elements = [
      { id: 'button', type: 'rectangle', text: 'Continue', x: 0, y: 0, width: 100, height: 40 },
      { id: 'decision', type: 'diamond', text: 'Next step', x: 150, y: 0, width: 100, height: 40 },
    ];
    const updateScene = vi.fn(({ elements: updated }) => { elements = updated; });
    const api = {
      getSceneElements: () => elements,
      getSceneElementsIncludingDeleted: () => elements,
      getAppState: () => ({ selectedElementIds: { button: true } }),
      updateScene,
      scrollToContent: vi.fn(),
    };
    const onStart = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PrototypeLinksPanel doodleAPI={api} onClose={vi.fn()} onStart={onStart} />);
    });

    expect(container.textContent).not.toContain('Add an object to get started');
    expect(container.querySelector('.prototype-flow-stats').textContent).toContain('2Objects');
    expect([...container.querySelector('.prototype-frame-select select').options].map((option) => option.value)).toEqual(['decision']);

    act(() => {
      container.querySelector('.prototype-connect-button').click();
    });
    expect(elements.find((element) => element.id === 'button').link).toBe('#element=decision');

    act(() => {
      container.querySelector('.prototype-preview-button').click();
    });
    expect(onStart).toHaveBeenCalledWith('button');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('renames a frame from the prototype starting-point list', () => {
    let elements = [
      { id: 'start', type: 'frame', name: 'Frame 1', x: 0, y: 0, width: 400, height: 300 },
    ];
    const updateScene = vi.fn(({ elements: updated }) => { elements = updated; });
    const api = {
      getSceneElements: () => elements,
      getSceneElementsIncludingDeleted: () => elements,
      getAppState: () => ({ selectedElementIds: {} }),
      updateScene,
      scrollToContent: vi.fn(),
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<PrototypeLinksPanel doodleAPI={api} onClose={vi.fn()} onStart={vi.fn()} />);
    });

    act(() => {
      container.querySelector('[aria-label="Rename Frame 1"]').click();
    });
    const nameInput = container.querySelector('input[aria-label="Frame name"]');
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setValue.call(nameInput, 'Welcome');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(elements[0].name).toBe('Welcome');
    expect(updateScene).toHaveBeenCalledWith(expect.objectContaining({ commitToHistory: true }));
    expect(container.querySelector('.prototype-screen-copy strong')?.textContent).toBe('Welcome');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
