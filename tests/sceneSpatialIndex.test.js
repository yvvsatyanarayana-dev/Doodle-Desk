import { describe, expect, it } from 'vitest';
import {
  buildSceneSpatialIndex,
  getSceneAlignmentCandidates,
  getVisibleSceneElementsDuringDrag,
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

  it('correctly maps visible flags when deleted elements precede active shapes', () => {
    const deleted1 = { id: 'del1', x: 0, y: 0, width: 40, height: 40, isDeleted: true };
    const deleted2 = { id: 'del2', x: 50, y: 50, width: 40, height: 40, isDeleted: true };
    const active1 = { id: 'act1', x: 10, y: 10, width: 50, height: 50 };
    const active2 = { id: 'act2', x: 3000, y: 3000, width: 50, height: 50 };
    const index = buildSceneSpatialIndex([deleted1, deleted2, active1, active2]);

    const visible = getVisibleSceneElements(index, { x: 0, y: 0, width: 100, height: 100 });
    expect(visible).toEqual([active1]);
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

  it('finds alignment candidates in nearby horizontal and vertical strips', () => {
    const nearbyX = { id: 'nearby-x', x: 96, y: 5000, width: 20, height: 20 };
    const nearbyY = { id: 'nearby-y', x: 5000, y: 96, width: 20, height: 20 };
    const far = { id: 'far', x: 5000, y: 5000, width: 20, height: 20 };
    const spatialIndex = buildSceneSpatialIndex([nearbyX, nearbyY, far]);

    expect(getSceneAlignmentCandidates(spatialIndex, {
      minX: 100,
      maxX: 120,
      minY: 100,
      maxY: 120,
    }, 6)).toEqual([nearbyX, nearbyY]);
  });

  it('renders dragged objects at their preview position without rebuilding their scene index', () => {
    const behind = { id: 'behind', x: 0, y: 0, width: 20, height: 20 };
    const moved = { id: 'moved', x: 1000, y: 0, width: 20, height: 20 };
    const front = { id: 'front', x: 10, y: 10, width: 20, height: 20 };
    const spatialIndex = buildSceneSpatialIndex([behind, moved, front]);

    expect(getVisibleSceneElementsDuringDrag(
      spatialIndex,
      { x: 0, y: 0, width: 50, height: 50 },
      0,
      new Set(['moved']),
      { x: -980, y: 0 },
    )).toEqual([
      behind,
      { ...moved, x: 20, y: 0 },
      front,
    ]);
  });
});
