import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NapkinToVectorScannerModal } from '../src/components/NapkinToVectorScannerModal.jsx';
import { ELEMENT_TYPES } from '../src/engine/elements.js';

describe('NapkinToVectorScannerModal - Artwork & Sketch Vectorizer', () => {
  let container;
  let root;
  let mockAPI;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockAPI = {
      getAppState: vi.fn(() => ({ zoom: { value: 1 }, scrollX: 0, scrollY: 0 })),
      getSceneElements: vi.fn(() => []),
      updateScene: vi.fn(),
      scrollToContent: vi.fn(),
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders modal with studio theme and default Artwork & Sketch Vectors mode', async () => {
    await act(async () => {
      root.render(
        <NapkinToVectorScannerModal
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    expect(container.textContent).toContain('Napkin & Sketch-to-Vector Scanner');
    expect(container.textContent).toContain('Artwork & Sketch Vectors');
    expect(container.textContent).toContain('Flowchart & Diagram Blocks');
    expect(container.textContent).toContain('Upload Photo of Sketch');

    // Has studio dialog classes
    const dialog = container.querySelector('.napkin-vector-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.classList.contains('help-style-dialog')).toBe(true);
  });

  it('loads demo diagram sketch and inserts elements into canvas', async () => {
    await act(async () => {
      root.render(
        <NapkinToVectorScannerModal
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Load Demo Sketch')
    );
    expect(demoBtn).toBeTruthy();

    await act(async () => {
      demoBtn.click();
    });

    expect(container.textContent).toContain('Native Doodle Vector Shapes');
    expect(container.textContent).toContain('Client App');

    const insertBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Insert to Canvas as Vectors')
    );
    expect(insertBtn).toBeTruthy();

    await act(async () => {
      insertBtn.click();
    });

    expect(mockAPI.updateScene).toHaveBeenCalled();
    const updateCall = mockAPI.updateScene.mock.calls[0][0];
    expect(updateCall.elements.length).toBeGreaterThan(0);
  });
});
