import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NetworkTrafficSimulator } from '../src/components/NetworkTrafficSimulator.jsx';

describe('NetworkTrafficSimulator', () => {
  it('renders simulator HUD with metrics and play/pause controls', () => {
    const mockAPI = {
      getSceneElements: () => [
        { id: 'gw', type: 'rectangle', text: 'API Gateway', x: 50, y: 50, width: 100, height: 60 },
        { id: 'srv', type: 'rectangle', text: 'Auth Service', x: 300, y: 50, width: 100, height: 60 },
        { id: 'arr', type: 'arrow', startBinding: { elementId: 'gw' }, endBinding: { elementId: 'srv' } },
      ],
      getAppState: () => ({ zoom: { value: 1 }, scrollX: 0, scrollY: 0 }),
      onToast: vi.fn(),
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<NetworkTrafficSimulator isActive={true} onClose={vi.fn()} doodleAPI={mockAPI} />);
    });

    expect(container.textContent).toContain('Traffic Simulator');
    expect(container.textContent).toContain('Pause');
    expect(container.textContent).toContain('req/s');
    expect(container.textContent).toContain('in-flight');

    // Pause button toggles to Resume
    const pauseBtn = container.querySelector('button[aria-label="Pause traffic"]');
    expect(pauseBtn).toBeTruthy();

    act(() => {
      pauseBtn.click();
    });

    expect(container.textContent).toContain('Resume');

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
