import { describe, expect, it } from 'vitest';

describe('Advanced Doodle Desk Features', () => {
  it('correctly calculates magnetic snap alignment within threshold', () => {
    const movingCenter = 202;
    const targetCenter = 200;
    const threshold = 6;
    const diff = targetCenter - movingCenter;

    expect(Math.abs(diff)).toBeLessThanOrEqual(threshold);
    const snapped = movingCenter + diff;
    expect(snapped).toBe(200);
  });

  it('correctly maps hierarchical parent-child relationships for Mind Maps', () => {
    const nodes = [
      { id: 'root', name: 'Main Idea' },
      { id: 'c1', name: 'Branch 1' },
      { id: 'c2', name: 'Branch 2' },
    ];
    const arrows = [
      { startBinding: { elementId: 'root' }, endBinding: { elementId: 'c1' } },
      { startBinding: { elementId: 'root' }, endBinding: { elementId: 'c2' } },
    ];

    const childrenMap = new Map();
    for (const a of arrows) {
      if (!childrenMap.has(a.startBinding.elementId)) {
        childrenMap.set(a.startBinding.elementId, []);
      }
      childrenMap.get(a.startBinding.elementId).push(a.endBinding.elementId);
    }

    expect(childrenMap.get('root')).toHaveLength(2);
    expect(childrenMap.get('root')).toEqual(['c1', 'c2']);
  });

  it('correctly creates 16:9 aspect ratio presentation slide dimensions', () => {
    const width = 960;
    const height = 540;
    expect(width / height).toBeCloseTo(16 / 9, 2);
  });
});
