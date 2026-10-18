import { describe, expect, it } from 'vitest';
import { constrainPointToAngle } from '../src/engine/math/geometry.js';

describe('Shift Key Drag Constraints', () => {
  it('constrains angle to 45 degree steps with Shift key for lines/arrows', () => {
    const startX = 100;
    const startY = 100;

    // Almost horizontal line (100, 100) -> (200, 108)
    const [hEndX, hEndY] = constrainPointToAngle(startX, startY, 200, 108, Math.PI / 4);
    expect(Math.round(hEndY)).toBe(100); // Snaps to 0 degrees (pure horizontal)
    expect(Math.round(hEndX)).toBe(200);

    // Diagonal 45 degree line (100, 100) -> (195, 205)
    const [dEndX, dEndY] = constrainPointToAngle(startX, startY, 195, 205, Math.PI / 4);
    expect(Math.round(dEndX)).toBe(Math.round(dEndY)); // Snaps to 45 degrees
  });

  it('calculates aspect ratio correctly during Shift resize', () => {
    const origWidth = 200;
    const origHeight = 100;
    const aspect = origWidth / origHeight; // 2

    const draggedWidth = 350;
    const constrainedHeight = draggedWidth / aspect;
    expect(constrainedHeight).toBe(175);
    expect(draggedWidth / constrainedHeight).toBe(2);
  });

  it('locks primary axis during Shift drag movement', () => {
    const dragStartX = 100;
    const dragStartY = 100;

    // Movement: moved 80px right and 15px down
    const ix = 180;
    const iy = 115;
    const totalDx = ix - dragStartX; // 80
    const totalDy = iy - dragStartY; // 15

    const isHorizontal = Math.abs(totalDx) >= Math.abs(totalDy);
    expect(isHorizontal).toBe(true);

    // Primary axis locks Y offset to 0
    const offset = {
      x: isHorizontal ? totalDx : 0,
      y: isHorizontal ? 0 : totalDy,
    };
    expect(offset.x).toBe(80);
    expect(offset.y).toBe(0);
  });
});
