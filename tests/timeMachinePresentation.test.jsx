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

  it('supports 3D Director mode toggle, slide thumbnails tray, and editable speaker notes', () => {
    const mockElements = [
      { id: 'f1', type: 'frame', name: 'Overview', notes: 'First frame notes', x: 0, y: 0, width: 800, height: 600 },
      { id: 'f2', type: 'frame', name: 'Architecture', notes: 'Second frame notes', x: 900, y: 0, width: 800, height: 600 },
    ];
    const updateScene = vi.fn();
    const scrollToContent = vi.fn();
    const setActiveTool = vi.fn();

    const mockApi = {
      getSceneElements: () => mockElements,
      updateScene,
      scrollToContent,
      setActiveTool,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <PresentationMode
          isActive={true}
          onClose={vi.fn()}
          doodleAPI={mockApi}
          standalone={false}
        />
      );
    });

    // Check Director mode toggle button exists
    const directorBtn = container.querySelector('button[aria-label="3D Director mode"]');
    expect(directorBtn).toBeTruthy();
    expect(directorBtn.classList.contains('active')).toBe(true);

    // Toggle 3D Director mode
    act(() => {
      directorBtn.click();
    });
    expect(directorBtn.classList.contains('active')).toBe(false);

    // Check Laser pointer button
    const laserBtn = container.querySelector('button[aria-label="Laser pointer"]');
    expect(laserBtn).toBeTruthy();
    act(() => {
      laserBtn.click();
    });
    expect(setActiveTool).toHaveBeenCalledWith({ type: 'laser' });

    // Open Slide Tray
    const trayBtn = container.querySelector('button[aria-label="Slide tray"]');
    expect(trayBtn).toBeTruthy();
    act(() => {
      trayBtn.click();
    });
    expect(container.textContent).toContain('Overview');
    expect(container.textContent).toContain('Architecture');

    // Open Speaker Notes Drawer
    const notesBtn = container.querySelector('button[aria-label="Speaker notes"]');
    expect(notesBtn).toBeTruthy();
    act(() => {
      notesBtn.click();
    });

    const notesTextarea = container.querySelector('textarea[aria-label="Speaker notes content"]');
    expect(notesTextarea).toBeTruthy();
    expect(notesTextarea.value).toBe('First frame notes');

    // Edit notes
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(notesTextarea, 'Updated notes for frame 1');
      notesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      notesTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(updateScene).toHaveBeenCalled();

    // Navigate to next slide
    const nextBtn = container.querySelector('button[aria-label="Next slide"]');
    expect(nextBtn).toBeTruthy();
    act(() => {
      nextBtn.click();
    });
    expect(scrollToContent).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});

