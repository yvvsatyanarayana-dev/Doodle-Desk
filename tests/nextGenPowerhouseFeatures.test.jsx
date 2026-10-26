import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LiveDataCard } from '../src/components/LiveDataCard.jsx';
import { ReactiveSliderCard } from '../src/components/ReactiveSliderCard.jsx';
import { WhiteboardAnimationStudio } from '../src/components/WhiteboardAnimationStudio.jsx';
import { NeuralKnowledgeConstellationModal } from '../src/components/NeuralKnowledgeConstellationModal.jsx';
import { NapkinToVectorScannerModal } from '../src/components/NapkinToVectorScannerModal.jsx';
import { Spatial3DHoloCanvas } from '../src/components/Spatial3DHoloCanvas.jsx';
import { FreehandMathRecognizerModal } from '../src/components/FreehandMathRecognizerModal.jsx';

describe('Next-Gen Powerhouse Canvas Features', () => {
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

  const mockAPI = {
    getSceneElements: vi.fn(() => [
      { id: 'el_1', type: 'rectangle', x: 100, y: 100, width: 200, height: 100, text: 'Frontend Client' },
      { id: 'el_2', type: 'rectangle', x: 400, y: 100, width: 220, height: 110, text: 'API Gateway [[Database]]' },
      { id: 'el_3', type: 'ellipse', x: 400, y: 300, width: 180, height: 90, text: 'Database #storage' },
      {
        id: 'el_arrow',
        type: 'arrow',
        startBinding: { elementId: 'el_1' },
        endBinding: { elementId: 'el_2' },
      },
    ]),
    getSelectedElements: vi.fn(() => []),
    getAppState: vi.fn(() => ({ zoom: { value: 1 }, scrollX: 0, scrollY: 0 })),
    updateScene: vi.fn(),
    setSelectedElements: vi.fn(),
    scrollToContent: vi.fn(),
  };

  it('renders LiveDataCard with live endpoint polling and status display', async () => {
    const mockElement = {
      id: 'live_card_1',
      type: 'embeddable',
      docType: 'live_data',
      title: 'Production Gateway API',
      url: 'https://api.doodledesk.local/v1/gateway/health',
      pollInterval: 5,
      metricField: 'status',
      width: 340,
      height: 210,
    };

    await act(async () => {
      root.render(
        <LiveDataCard
          element={mockElement}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    expect(container.textContent).toContain('Production Gateway API');
    expect(container.textContent).toContain('Active Metric (status)');
    expect(container.textContent).toContain('Poll');
  });

  it('renders ReactiveSliderCard and updates variable value and bounds', async () => {
    const mockElement = {
      id: 'slider_card_1',
      type: 'embeddable',
      docType: 'reactive_slider',
      varName: 'SCALE',
      min: 1,
      max: 10,
      step: 1,
      value: 5,
      width: 300,
      height: 120,
    };

    await act(async () => {
      root.render(
        <ReactiveSliderCard
          element={mockElement}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    expect(container.textContent).toContain('SCALE');
    expect(container.textContent).toContain('{{SCALE}}');
    expect(container.textContent).toContain('5');

    // Change slider input
    const input = container.querySelector('input[type="range"]');
    expect(input).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(input, '8');
      } else {
        input.value = '8';
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(window.__doodleVariables?.SCALE).toBe(8);
  });

  it('renders WhiteboardAnimationStudio with timeline scrubber and playback controls', async () => {
    await act(async () => {
      root.render(
        <WhiteboardAnimationStudio
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    expect(container.textContent).toContain('Whiteboard Animation Studio');
    expect(container.textContent).toContain('Motion Engine');
    expect(container.textContent).toContain('Play');
    expect(container.textContent).toContain('Export WebM');
    expect(container.textContent).toContain('Doodle Pencil');
    expect(container.textContent).toContain('Inking Pen');
    expect(container.textContent).toContain('Whiteboard Marker');
    expect(container.textContent).toContain('Ghost');
  });

  it('renders NeuralKnowledgeConstellationModal and builds 3D thought matrix with backlinks', async () => {
    await act(async () => {
      root.render(
        <NeuralKnowledgeConstellationModal
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    expect(container.textContent).toContain('Neural Knowledge Constellation');
    expect(container.textContent).toContain('3D Thought Matrix');
    expect(container.textContent).toContain('Drag to orbit in 3D');
  });

  it('renders NapkinToVectorScannerModal and supports demo sketch loading', async () => {
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
    expect(container.textContent).toContain('Computer Vision');
    expect(container.textContent).toContain('Upload Photo of Sketch');

    // Click load demo sketch
    const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Load Demo Sketch')
    );
    expect(demoBtn).toBeTruthy();

    await act(async () => {
      demoBtn.click();
    });

    expect(container.textContent).toContain('Native Doodle Vector Shapes');
    expect(container.textContent).toContain('Client App');
    expect(container.textContent).toContain('API Gateway');
    expect(container.textContent).toContain('Postgres DB');

    // Test Insert to Canvas button
    const insertBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Insert to Canvas as Vectors')
    );
    expect(insertBtn).toBeTruthy();

    await act(async () => {
      insertBtn.click();
    });

    expect(mockAPI.updateScene).toHaveBeenCalled();
  });

  it('renders Spatial3DHoloCanvas with DoodleDesk authentic studio theme and camera controls', async () => {
    await act(async () => {
      root.render(
        <Spatial3DHoloCanvas
          isActive={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          theme="dark"
        />
      );
    });

    expect(container.textContent).toContain('3D Spatial Canvas');
    expect(container.textContent).toContain('Drag to Orbit • Right-drag to Pan • Scroll to Zoom');
    expect(container.textContent).toContain('Isometric 45°');
    expect(container.textContent).toContain('Cinematic 3D');
    expect(container.textContent).toContain('Subtle Tilt');
    expect(container.textContent).toContain('Top-Down 2D');
    expect(container.textContent).toContain('Smart Tiers');
    expect(container.textContent).toContain('Layer Stack');
    expect(container.textContent).toContain('Flat 3D');
    expect(container.textContent).toContain('Canvas Floor');
    expect(container.textContent).toContain('Floor Shadows');
    expect(container.textContent).toContain('Snapshot');

    // Verify it does NOT contain the old gaudy placeholders
    expect(container.textContent).not.toContain('Z+65');
  });

  it('renders FreehandMathRecognizerModal with authentic handwriting pad and analytical metrics', async () => {
    await act(async () => {
      root.render(
        <FreehandMathRecognizerModal
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          theme="dark"
        />
      );
    });

    expect(container.textContent).toContain('Freehand Math Equation Recognizer & Grapher');
    expect(container.textContent).toContain('Draw / Scribble Math Below');
    expect(container.textContent).toContain('Formula: f(x) =');
    expect(container.textContent).toContain('Live Variables');
    expect(container.textContent).toContain('Roots (f(x)=0)');
    expect(container.textContent).toContain('Extrema (Peaks/Valleys)');
    expect(container.textContent).toContain('Tangent Slope');
    expect(container.textContent).toContain('Stamp as Vector Doodle');
    expect(container.textContent).toContain('Insert Interactive Card');

    // Test stamp doodle
    const stampBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Stamp as Vector Doodle')
    );
    expect(stampBtn).toBeTruthy();

    await act(async () => {
      stampBtn.click();
    });

    expect(mockAPI.updateScene).toHaveBeenCalled();
  });
});
