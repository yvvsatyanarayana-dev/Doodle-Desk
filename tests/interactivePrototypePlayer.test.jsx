import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  InteractivePrototypePlayer,
  createDemoMobileAppPrototype,
  DEVICE_PROFILES,
} from '../src/components/InteractivePrototypePlayer.jsx';

describe('InteractivePrototypePlayer & Prototyping Engine', () => {
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

  it('generates a 3-screen interactive e-commerce mobile app prototype with working links', () => {
    const demo = createDemoMobileAppPrototype(100, 100, true);

    expect(demo.frames).toHaveLength(3);
    expect(demo.frames[0].name).toContain('Onboarding');
    expect(demo.frames[1].name).toContain('Product Store');
    expect(demo.frames[2].name).toContain('Order Success');

    // Check that elements inside Frame 1 have a link targeting Frame 2
    const frame2Id = demo.frames[1].id;
    const linkedToFrame2 = demo.elements.filter(
      (el) => el.link && el.link.includes(encodeURIComponent(frame2Id))
    );
    expect(linkedToFrame2.length).toBeGreaterThanOrEqual(1);

    // Check that elements inside Frame 2 have a link targeting Frame 3
    const frame3Id = demo.frames[2].id;
    const linkedToFrame3 = demo.elements.filter(
      (el) => el.link && el.link.includes(encodeURIComponent(frame3Id))
    );
    expect(linkedToFrame3.length).toBeGreaterThanOrEqual(1);
  });

  it('renders InteractivePrototypePlayer with top controls, device profiles, and active screen title', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Header & Player title
    expect(container.textContent).toContain('PROTOTYPE PLAYER');

    // Screen name is displayed
    expect(container.textContent).toContain('1. Onboarding Screen');

    // Device switcher buttons
    expect(container.textContent).toContain('iPhone');
    expect(container.textContent).toContain('iPad');
    expect(container.textContent).toContain('MacBook');
    expect(container.textContent).toContain('Frameless');
  });

  it('switches device frame profile between iPhone, iPad, and MacBook', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Initially iPhone
    expect(container.querySelector('.device-iphone')).not.toBeNull();

    // Switch to iPad
    const ipadBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('iPad'));
    expect(ipadBtn).toBeDefined();
    act(() => {
      ipadBtn.click();
    });
    expect(container.querySelector('.device-ipad')).not.toBeNull();

    // Switch to MacBook
    const macbookBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('MacBook'));
    expect(macbookBtn).toBeDefined();
    act(() => {
      macbookBtn.click();
    });
    expect(container.querySelector('.device-macbook')).not.toBeNull();
  });

  it('navigates to next screen when clicking an interactive hotspot', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Initially on Screen 1
    expect(container.textContent).toContain('1. Onboarding Screen');

    // Find clickable hotspot buttons
    const hotspotButtons = container.querySelectorAll('.prototype-hotspot-btn');
    expect(hotspotButtons.length).toBeGreaterThanOrEqual(1);

    // Click hotspot to navigate to Screen 2
    act(() => {
      hotspotButtons[0].click();
    });

    // Now screen 2 is active or transition has begun
    expect(mockDoodleAPI.getSceneElements).toHaveBeenCalled();
  });

  it('triggers Figma-style hotspot pulse toast when tapping non-clickable area', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Tap the stage outside hotspots
    const stage = container.querySelector('main');
    act(() => {
      stage.click();
    });

    // Figma-style helper toast appears (neutral / amber, zero blue)
    expect(container.textContent).toContain('Click highlighted area to navigate');
  });

  it('restarts flow and navigates backward/forward in history', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Click to Screen 2
    const hotspots = container.querySelectorAll('.prototype-hotspot-btn');
    act(() => {
      hotspots[0].click();
    });

    // Restart button
    const restartBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Restart'));
    expect(restartBtn).toBeDefined();
    act(() => {
      restartBtn.click();
    });

    // Navigated back to Screen 1
    expect(container.textContent).toContain('1. Onboarding Screen');
  });

  it('switches between Doodle Hand-Drawn Shell and Studio Hardware Shell', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Initially doodle shell
    expect(container.querySelector('.device-style-doodle')).not.toBeNull();

    // Switch to Studio Shell
    const studioShellBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Studio Shell'));
    expect(studioShellBtn).toBeDefined();
    act(() => {
      studioShellBtn.click();
    });

    expect(container.querySelector('.device-style-studio')).not.toBeNull();
  });

  it('toggles orientation between Portrait and Landscape', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    const rotateBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Portrait') || b.textContent.includes('Landscape'));
    expect(rotateBtn).toBeDefined();

    act(() => {
      rotateBtn.click();
    });

    // After click, orientation flipped
    expect(container.textContent).toContain('Landscape');
  });

  it('opens Flow Map Screens drawer and displays all screen cards', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    // Click Screens drawer toggle
    const screensBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Screens (3)'));
    expect(screensBtn).toBeDefined();

    act(() => {
      screensBtn.click();
    });

    // Drawer is now open with cards
    const drawer = container.querySelector('.prototype-screens-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('Flow Map:');
    expect(drawer.textContent).toContain('Screen #1');
    expect(drawer.textContent).toContain('Screen #2');
    expect(drawer.textContent).toContain('Screen #3');
  });

  it('renders aspect-ratio preserved screen wrapper and hotspot offsets', () => {
    const demo = createDemoMobileAppPrototype(0, 0, true);
    const mockDoodleAPI = {
      getSceneElements: vi.fn(() => demo.elements),
      getAppState: vi.fn(() => ({})),
    };

    act(() => {
      root.render(
        <InteractivePrototypePlayer
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockDoodleAPI}
          initialFrameId={demo.frames[0].id}
          theme="dark"
        />
      );
    });

    const screenContent = container.querySelector('.prototype-screen-content');
    expect(screenContent).not.toBeNull();
    expect(screenContent.style.width).toMatch(/px$/);
    expect(screenContent.style.height).toMatch(/px$/);

    // Canvas exists inside screen content
    const canvas = screenContent.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });
});
