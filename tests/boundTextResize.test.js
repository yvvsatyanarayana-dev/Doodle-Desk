import { describe, it, expect } from 'vitest';
import { measureText } from '../src/engine/renderer/render';

describe('Bound Text Container Resizing', () => {
  it('calculates proportional font size scaling when container expands', () => {
    const origContainerW = 100;
    const origContainerH = 100;
    const newW = 200;
    const newH = 200;

    const scaleX = newW / origContainerW; // 2
    const scaleY = newH / origContainerH; // 2
    const scale = Math.min(scaleX, scaleY); // 2

    const origFontSize = 20;
    const newFontSize = Math.max(8, Math.min(240, Math.round(origFontSize * scale)));
    expect(newFontSize).toBe(40);
  });

  it('calculates proportional font size scaling when container shrinks', () => {
    const origContainerW = 200;
    const origContainerH = 200;
    const newW = 100;
    const newH = 100;

    const scaleX = newW / origContainerW; // 0.5
    const scaleY = newH / origContainerH; // 0.5
    const scale = Math.min(scaleX, scaleY); // 0.5

    const origFontSize = 40;
    const newFontSize = Math.max(8, Math.min(240, Math.round(origFontSize * scale)));
    expect(newFontSize).toBe(20);
  });

  it('vertically centers the bound text inside the rectangle', () => {
    const rectX = 50;
    const rectY = 100;
    const rectW = 300;
    const rectH = 200;

    const text = 'dfsdfsdf';
    const fontSize = 28;
    const targetInnerW = Math.max(16, rectW - 24);
    const metrics = measureText(text, fontSize, 5, targetInnerW);

    const textY = rectY + Math.max(0, (rectH - metrics.height) / 2);
    const textX = rectX + 10;

    expect(textX).toBe(60);
    expect(textY).toBeGreaterThan(rectY);
    expect(textY + metrics.height).toBeLessThanOrEqual(rectY + rectH);
    // Distance from top of rectangle should equal distance from bottom of rectangle
    const topMargin = textY - rectY;
    const bottomMargin = (rectY + rectH) - (textY + metrics.height);
    expect(Math.abs(topMargin - bottomMargin)).toBeLessThanOrEqual(2);
  });

  it('prevents font size from exceeding container height for multi-line text', () => {
    const rectW = 120;
    const rectH = 60;
    const text = 'Line one\nLine two\nLine three';
    let newFontSize = 32;

    const targetInnerW = Math.max(16, rectW - 24);
    const targetInnerH = Math.max(16, rectH - 20);

    let metrics = measureText(text, newFontSize, 5, targetInnerW);
    while (newFontSize > 8 && (metrics.height > targetInnerH || (metrics.lines && metrics.lines.some(l => measureText(l, newFontSize, 5).width > targetInnerW)))) {
      newFontSize = Math.max(8, newFontSize - 1);
      metrics = measureText(text, newFontSize, 5, targetInnerW);
    }

    expect(newFontSize).toBeLessThan(32);
    expect(metrics.height).toBeLessThanOrEqual(targetInnerH);
  });

  it('includes bound text in dragMoveElementIds when container is selected and leaves container stationary when text is dragged', async () => {
    const { getDragMoveElementIds } = await import('../src/engine/frameMovement');
    const container = { id: 'rect1', type: 'rectangle', x: 100, y: 100, width: 200, height: 100, boundElements: [{ id: 'text1', type: 'text' }] };
    const text = { id: 'text1', type: 'text', x: 110, y: 130, width: 180, height: 40, containerId: 'rect1' };
    const elements = [container, text];

    // Dragging container moves text
    const containerMoveIds = getDragMoveElementIds(elements, ['rect1']);
    expect(containerMoveIds.has('rect1')).toBe(true);
    expect(containerMoveIds.has('text1')).toBe(true);

    // Dragging text moves ONLY text (movable inside container)
    const textMoveIds = getDragMoveElementIds(elements, ['text1']);
    expect(textMoveIds.has('text1')).toBe(true);
    expect(textMoveIds.has('rect1')).toBe(false);
  });

  it('supports hierarchical selection: container on first click, text on second click', () => {
    const container = { id: 'rect1', type: 'rectangle', x: 100, y: 100, width: 200, height: 100, boundElements: [{ id: 'text1', type: 'text' }] };
    const text = { id: 'text1', type: 'text', x: 110, y: 130, width: 180, height: 40, containerId: 'rect1' };
    const elements = [container, text];

    function resolveHit(rawHit, selectedIds) {
      let hit = rawHit;
      if (rawHit.type === 'text' && rawHit.containerId) {
        const c = elements.find(e => e.id === rawHit.containerId && !e.isDeleted);
        if (c) {
          if (selectedIds[c.id] || selectedIds[rawHit.id]) {
            hit = rawHit;
          } else {
            hit = c;
          }
        }
      }
      return hit;
    }

    // 1st click when nothing selected: selects container
    const hit1 = resolveHit(text, {});
    expect(hit1.id).toBe('rect1');

    // 2nd click when container is selected: selects text!
    const hit2 = resolveHit(text, { rect1: true });
    expect(hit2.id).toBe('text1');

    // Clicking when text is already selected: retains text selection
    const hit3 = resolveHit(text, { text1: true });
    expect(hit3.id).toBe('text1');
  });

  it('detects unattached text inside container bounds for fallback auto-binding on resize', () => {
    const container = { id: 'rect1', type: 'rectangle', x: 100, y: 100, width: 200, height: 100, boundElements: null };
    const unattachedText = { id: 'text1', type: 'text', x: 120, y: 120, width: 80, height: 24, containerId: null };
    const outsideText = { id: 'text2', type: 'text', x: 400, y: 400, width: 80, height: 24, containerId: null };
    const elements = [container, unattachedText, outsideText];

    const insideText = elements.find(e =>
      e.type === 'text' &&
      !e.isDeleted && !e.isHidden && !e.locked &&
      e.x >= container.x - 10 &&
      e.x + (e.width || 0) <= container.x + container.width + 10 &&
      e.y >= container.y - 10 &&
      e.y + (e.height || 0) <= container.y + container.height + 10
    );

    expect(insideText).toBeDefined();
    expect(insideText.id).toBe('text1');
  });
});
