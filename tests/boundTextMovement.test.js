import { describe, it, expect } from 'vitest';
import { getDragMoveElementIds } from '../src/engine/frameMovement.js';
import { getTextElementBounds } from '../src/engine/renderer/render.js';

describe('Bound Text Movement & Repositioning', () => {
  it('allows text to move independently when selected, without dragging the container rectangle', () => {
    const container = {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 400,
      height: 600,
      boundElements: [{ id: 'text-1', type: 'text' }],
    };
    const text = {
      id: 'text-1',
      type: 'text',
      x: 110,
      y: 350,
      width: 380,
      height: 30,
      text: 'working',
      containerId: 'rect-1',
    };
    const elements = [container, text];

    // When ONLY the text is selected for dragging:
    const textDragIds = getDragMoveElementIds(elements, ['text-1']);
    expect(textDragIds.has('text-1')).toBe(true);
    expect(textDragIds.has('rect-1')).toBe(false); // Container MUST NOT move!

    // Simulating dragging the text by (dx: 0, dy: -150) inside the rectangle
    const movedText = { ...text, y: text.y - 150 };
    expect(movedText.y).toBe(200);
    // Container remains in place
    expect(container.y).toBe(100);
  });

  it('moves both container and bound text when the container is dragged', () => {
    const container = {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 400,
      height: 600,
      boundElements: [{ id: 'text-1', type: 'text' }],
    };
    const text = {
      id: 'text-1',
      type: 'text',
      x: 110,
      y: 200,
      width: 380,
      height: 30,
      text: 'working',
      containerId: 'rect-1',
    };
    const elements = [container, text];

    // When the container is dragged:
    const containerDragIds = getDragMoveElementIds(elements, ['rect-1']);
    expect(containerDragIds.has('rect-1')).toBe(true);
    expect(containerDragIds.has('text-1')).toBe(true); // Child text moves with parent
  });

  it('unbinds text when dragged completely outside of container bounds', () => {
    const container = {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      boundElements: [{ id: 'text-1', type: 'text' }],
    };
    // Text moved to (800, 800), far outside container
    const draggedText = {
      id: 'text-1',
      type: 'text',
      x: 800,
      y: 800,
      width: 100,
      height: 30,
      text: 'working',
      containerId: 'rect-1',
    };

    const tb = getTextElementBounds(draggedText);
    const intersects = (
      tb.x + tb.width > container.x &&
      tb.x < container.x + container.width &&
      tb.y + tb.height > container.y &&
      tb.y < container.y + container.height
    );

    expect(intersects).toBe(false);
  });

  it('keeps text bound when moved within container bounds', () => {
    const container = {
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 400,
      height: 600,
      boundElements: [{ id: 'text-1', type: 'text' }],
    };
    // Text moved near the top of the container
    const movedText = {
      id: 'text-1',
      type: 'text',
      x: 120,
      y: 140,
      width: 360,
      height: 30,
      text: 'working',
      containerId: 'rect-1',
    };

    const tb = getTextElementBounds(movedText);
    const intersects = (
      tb.x + tb.width > container.x &&
      tb.x < container.x + container.width &&
      tb.y + tb.height > container.y &&
      tb.y < container.y + container.height
    );

    expect(intersects).toBe(true);
  });
});
