import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PropertiesPanel } from '../src/engine/components/PropertiesPanel.jsx';
import { measureText } from '../src/engine/renderer/render.js';

describe('Text size and font controls', () => {
  it('renders font size presets, current size label, and stepper buttons for text elements', () => {
    const handleUpdate = vi.fn();
    const selectedTextElement = {
      id: 'text-1',
      type: 'text',
      x: 100,
      y: 100,
      width: 80,
      height: 30,
      text: 'Hello Doodle',
      fontSize: 20,
      fontFamily: 5,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <PropertiesPanel
          selectedElements={[selectedTextElement]}
          appState={{ activeTool: { type: 'selection' } }}
          onUpdateProperty={handleUpdate}
          onAction={vi.fn()}
        />
      );
    });

    // Preset buttons S, M, L, XL
    const sBtn = container.querySelector('[aria-label="Size S"]');
    const mBtn = container.querySelector('[aria-label="Size M"]');
    const lBtn = container.querySelector('[aria-label="Size L"]');
    const xlBtn = container.querySelector('[aria-label="Size XL"]');

    expect(sBtn).not.toBeNull();
    expect(mBtn).not.toBeNull();
    expect(lBtn).not.toBeNull();
    expect(xlBtn).not.toBeNull();

    // Test clicking preset XL
    act(() => {
      xlBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(handleUpdate).toHaveBeenCalledWith('fontSize', 36);

    // Test clicking preset S
    act(() => {
      sBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(handleUpdate).toHaveBeenCalledWith('fontSize', 16);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('recalculates dimensions correctly when font size is increased or decreased', () => {
    const text = 'Scale this text';
    const smallMetrics = measureText(text, 16, 5);
    const largeMetrics = measureText(text, 36, 5);

    expect(largeMetrics.height).toBeGreaterThan(smallMetrics.height);
  });

  it('deep clones points, pressures, and groupIds in cloneElement for duplicate operations', async () => {
    const { cloneElement } = await import('../src/engine/elements.js');
    const original = {
      id: 'shape-1',
      type: 'freedraw',
      x: 10,
      y: 20,
      points: [[0, 0], [10, 15]],
      pressures: [0.5, 0.7],
      groupIds: ['group-a'],
    };

    const clone = cloneElement(original, { x: 50, y: 60 });
    expect(clone.id).not.toBe(original.id);
    expect(clone.x).toBe(50);
    expect(clone.y).toBe(60);
    expect(clone.points).toEqual(original.points);
    expect(clone.points).not.toBe(original.points);
    expect(clone.points[0]).not.toBe(original.points[0]);
    expect(clone.pressures).toEqual(original.pressures);
    expect(clone.pressures).not.toBe(original.pressures);
    expect(clone.groupIds).toEqual(original.groupIds);
    expect(clone.groupIds).not.toBe(original.groupIds);
  });
});
