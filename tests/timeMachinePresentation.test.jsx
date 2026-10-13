import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CanvasTimeMachine } from '../src/components/CanvasTimeMachine.jsx';
import { PresentationMode } from '../src/components/PresentationMode.jsx';

describe('CanvasTimeMachine presentation-style layout and coexistence', () => {
  it('renders matching presentation-deck pill styling with controls', () => {
    const mockApi = {
      getTimeMachineTimeline: () => ({
        steps: [
          { index: 0, timestamp: 1000, count: 1 },
          { index: 1, timestamp: 2000, count: 2 },
          { index: 2, timestamp: 3000, count: 5 },
        ],
        currentIndex: 0,
      }),
      previewTimeMachineStep: vi.fn(),
      restoreTimeMachineStep: vi.fn(),
      exitTimeMachinePreview: vi.fn(),
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const onClose = vi.fn();

    act(() => {
      root.render(
        <CanvasTimeMachine
          isOpen={true}
          onClose={onClose}
          doodleAPI={mockApi}
          isPresentationActive={false}
        />
      );
    });

    const deck = container.querySelector('.presentation-deck');
    expect(deck).toBeTruthy();

    const badge = container.querySelector('.presentation-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('Time Machine');

    const counter = container.querySelector('.presentation-counter');
    expect(counter).toBeTruthy();
    expect(counter.textContent).toContain('1');
    expect(counter.textContent).toContain('/ 3');

    // Next step button
    const nextBtn = container.querySelector('button[aria-label="Next step"]');
    expect(nextBtn).toBeTruthy();
    act(() => {
      nextBtn.click();
    });
    expect(mockApi.previewTimeMachineStep).toHaveBeenCalledWith(1);

    // Restore button
    const restoreBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Restore')
    );
    expect(restoreBtn).toBeTruthy();
    act(() => {
      restoreBtn.click();
    });
    expect(mockApi.restoreTimeMachineStep).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('adjusts bottom offset when Presentation Mode is standalone active', () => {
    const mockApi = {
      getTimeMachineTimeline: () => ({
        steps: [{ index: 0, timestamp: 1000, count: 1 }],
        currentIndex: 0,
      }),
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Render with isPresentationActive = false
    act(() => {
      root.render(
        <CanvasTimeMachine
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockApi}
          isPresentationActive={false}
        />
      );
    });

    const region = container.querySelector('[role="region"]');
    expect(region.style.paddingBottom).toBe('24px');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('renders both Presentation and Time Machine together in a single row dock', () => {
    const mockTimeMachineApi = {
      getTimeMachineTimeline: () => ({
        steps: [
          { index: 0, timestamp: 1000, count: 2 },
          { index: 1, timestamp: 2000, count: 4 },
        ],
        currentIndex: 0,
      }),
      previewTimeMachineStep: vi.fn(),
      restoreTimeMachineStep: vi.fn(),
      exitTimeMachinePreview: vi.fn(),
      getSceneElements: () => [
        { id: 'f1', type: 'frame', name: 'Intro Slide', x: 0, y: 0, width: 800, height: 600 },
      ],
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <div className="bottom-decks-dock" role="region" aria-label="Canvas presentation and timeline controls">
          <PresentationMode
            isActive={true}
            onClose={vi.fn()}
            doodleAPI={mockTimeMachineApi}
            standalone={false}
          />
          <CanvasTimeMachine
            isOpen={true}
            onClose={vi.fn()}
            doodleAPI={mockTimeMachineApi}
            isPresentationActive={true}
            standalone={false}
          />
        </div>
      );
    });

    const dock = container.querySelector('.bottom-decks-dock');
    expect(dock).toBeTruthy();

    const decks = dock.querySelectorAll('.presentation-deck');
    expect(decks.length).toBe(2);

    // First deck is Presentation Mode
    expect(decks[0].textContent).toContain('Present:');
    expect(decks[0].textContent).toContain('Intro Slide');
    expect(decks[0].textContent).toContain('Exit');

    // Second deck is Time Machine
    expect(decks[1].textContent).toContain('Time Machine');
    expect(decks[1].textContent).toContain('Restore');
    expect(decks[1].textContent).toContain('Exit');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
