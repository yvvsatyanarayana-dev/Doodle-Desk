import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  Spatial3DHoloCanvas,
  isDemoPrototypeElement,
  getDemoElementIds,
} from '../src/components/Spatial3DHoloCanvas.jsx';
import { createDemoMobileAppPrototype } from '../src/components/InteractivePrototypePlayer.jsx';
import { createElement, ELEMENT_TYPES } from '../src/engine/elements.js';

describe('Spatial3DHoloCanvas - 3D Spatial Canvas & Scope Filtering', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('correctly identifies demo prototype elements and their child buttons/shapes', () => {
    const demo = createDemoMobileAppPrototype(100, 100, true);
    // Strip isDemoPrototype to simulate old un-tagged elements
    const untaggedElements = demo.elements.map(el => {
      const copy = { ...el };
      delete copy.isDemoPrototype;
      delete copy.customData;
      return copy;
    });

    const demoIds = getDemoElementIds(untaggedElements);
    expect(demoIds.size).toBe(untaggedElements.length);

    // Verify all untagged children are in demoIds
    untaggedElements.forEach(el => {
      expect(demoIds.has(el.id)).toBe(true);
    });

    const userCard = createElement(ELEMENT_TYPES.RECTANGLE, 400, 400, 200, 200, {
      name: 'User Rounded Card',
      roundness: 'round',
    });
    expect(demoIds.has(userCard.id)).toBe(false);
  });

  it('renders 3D Spatial Canvas HUD with camera presets and stratify modes', () => {
    const userCard = createElement(ELEMENT_TYPES.RECTANGLE, 100, 100, 200, 200, {
      roundness: 'round',
    });
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => [userCard]),
      getAppState: vi.fn(() => ({})),
      getFiles: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <Spatial3DHoloCanvas
          isActive={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          theme="dark"
        />
      );
    });

    expect(container.textContent).toContain('3D Spatial Canvas');
    expect(container.textContent).toContain('Isometric 45°');
    expect(container.textContent).toContain('Cinematic 3D');
    expect(container.textContent).toContain('Smart Tiers');
    expect(container.textContent).toContain('Snapshot');
  });

  it('automatically isolates selected elements when canvas selection is active', () => {
    const demo = createDemoMobileAppPrototype(100, 100, true);
    const userCard = createElement(ELEMENT_TYPES.RECTANGLE, 500, 500, 200, 200, {
      roundness: 'round',
    });
    const allElements = [...demo.elements, userCard];

    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => allElements),
      getAppState: vi.fn(() => ({
        selectedElementIds: { [userCard.id]: true },
      })),
      getFiles: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <Spatial3DHoloCanvas
          isActive={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          theme="dark"
        />
      );
    });

    // Scope switcher is present and only counts authentic canvas shapes (1 userCard, excluding demo elements)
    expect(container.textContent).toContain('Selection (1)');
    expect(container.textContent).toContain('All Canvas Shapes (1)');
  });

  it('automatically detects and purges demo prototype elements from canvas when 3D spatial opens', () => {
    const demo = createDemoMobileAppPrototype(100, 100, true);
    const userCard = createElement(ELEMENT_TYPES.RECTANGLE, 500, 500, 200, 200, {
      roundness: 'round',
    });
    const allElements = [...demo.elements, userCard];

    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => allElements),
      getSceneElementsIncludingDeleted: vi.fn(() => allElements),
      getAppState: vi.fn(() => ({})),
      getFiles: vi.fn(() => ({})),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <Spatial3DHoloCanvas
          isActive={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          theme="dark"
        />
      );
    });

    // Automatically calls updateScene with only authentic user canvas shapes
    expect(mockDoodleAPI.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [userCard],
        commitToHistory: true,
      })
    );
  });
});
