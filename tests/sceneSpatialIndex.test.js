import { describe, expect, it } from 'vitest';
import {
  buildSceneSpatialIndex,
  getVisibleSceneElements,
} from '../src/engine/math/sceneSpatialIndex.js';

describe('scene spatial index', () => {
  it('returns visible elements in original canvas stacking order', () => {
    const behind = { id: 'behind', x: 20, y: 20, width: 30, height: 30 };
    const offscreen = { id: 'offscreen', x: 2000, y: 2000, width: 20, height: 20 };
    const front = { id: 'front', x: 30, y: 30, width: 20, height: 20 };
    const index = buildSceneSpatialIndex([behind, offscreen, front]);

    expect(getVisibleSceneElements(index, { x: 0, y: 0, width: 100, height: 100 }))
      .toEqual([behind, front]);
  });

  it('handles negative dimensions and includes the requested padding', () => {
    const negative = { id: 'negative', x: 120, y: 30, width: -30, height: 20 };
    const near = { id: 'near', x: 108, y: 40, width: 10, height: 10 };
    const far = { id: 'far', x: 115, y: 40, width: 10, height: 10 };
    const index = buildSceneSpatialIndex([negative, near, far]);

    expect(getVisibleSceneElements(index, { x: 0, y: 0, width: 100, height: 100 }, 8))
      .toEqual([negative, near]);
  });

  it('keeps large elements queryable and excludes hidden or deleted elements', () => {
    const large = { id: 'large', x: -5000, y: -5000, width: 10000, height: 10000 };
    const hidden = { id: 'hidden', x: 10, y: 10, width: 10, height: 10, isHidden: true };
    const deleted = { id: 'deleted', x: 10, y: 10, width: 10, height: 10, isDeleted: true };
    const index = buildSceneSpatialIndex([large, hidden, deleted]);

    expect(getVisibleSceneElements(index, { x: 0, y: 0, width: 100, height: 100 }))
      .toEqual([large]);
  });

  it('limits candidates to nearby cells on large scenes', () => {
    const elements = Array.from({ length: 10000 }, (_, index) => ({
      id: `element-${index}`,
      x: index * 10000,
      y: 0,
      width: 20,
      height: 20,
    }));
    const spatialIndex = buildSceneSpatialIndex(elements);

    expect(getVisibleSceneElements(spatialIndex, { x: 500000, y: 0, width: 100, height: 100 }))
      .toEqual([elements[50]]);
    expect(spatialIndex.cells.get('976,0')).toHaveLength(1);
  });
});
