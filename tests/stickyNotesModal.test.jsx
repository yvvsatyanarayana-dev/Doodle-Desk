import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { StickyNotesModal } from '../src/components/StickyNotesModal.jsx';

describe('StickyNotesModal', () => {
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
