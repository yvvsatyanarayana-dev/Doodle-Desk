import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { StickyNotesModal } from '../src/components/StickyNotesModal.jsx';

describe('StickyNotesModal', () => {
  it('provides a distraction-free writing view and lets Escape exit it before closing', () => {
    const onClose = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<StickyNotesModal isOpen={true} onClose={onClose} doodleAPI={{ getSceneElements: () => [] }} />);
    });

    const focusToggle = container.querySelector('[aria-label="Enter writing focus mode"]');
    act(() => {
      focusToggle.click();
    });

    const contentInput = container.querySelector('.sticky-notes-content-input');
    expect(container.querySelector('.sticky-notes-modal-content').classList.contains('is-writing-focus')).toBe(true);
    expect(container.querySelector('.sticky-notes-preview-panel')).toBeNull();
    expect(container.textContent).not.toContain('Card Templates');
    expect(container.querySelector('[aria-label="Exit writing focus mode"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(contentInput.rows).toBe(18);

    act(() => {
      contentInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[aria-label="Enter writing focus mode"]')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      contentInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('uses the canvas api fallback when the prop is temporarily missing', () => {
    const api = {
      getAppState: () => ({
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
        width: 1200,
        height: 800,
      }),
      getSceneElements: () => [],
      updateScene: vi.fn(),
    };

    window.__doodleAPI = api;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <StickyNotesModal
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={null}
        />
      );
    });

    const insertButton = Array.from(container.querySelectorAll('button')).find((button) =>
      (button.textContent || '').includes('Drop Card on Canvas')
    );

    expect(insertButton).toBeTruthy();

    act(() => {
      insertButton.click();
    });

    expect(api.updateScene).toHaveBeenCalledTimes(1);
    expect(api.updateScene.mock.calls[0][0].elements.length).toBeGreaterThanOrEqual(2);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    delete window.__doodleAPI;
  });
});
