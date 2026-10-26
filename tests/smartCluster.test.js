import { describe, it, expect } from 'vitest';
import {
  computeClusterBounds,
  createSmartCluster,
  recomputeClusterAutoHug,
  CLUSTER_DEFAULTS,
} from '../src/engine/layout/smartCluster.js';

describe('smartCluster layout engine', () => {
  it('computes tight bounds enclosing multiple elements with padding', () => {
    const elements = [
      { id: '1', x: 100, y: 100, width: 200, height: 100 },
      { id: '2', x: 400, y: 250, width: 150, height: 80 },
    ];

    const bounds = computeClusterBounds(elements, 20, 30);
    // minX = 100, maxX = 550. With 20px padding on both sides:
    // x = 100 - 20 = 80, width = (550 - 100) + 40 = 490
    expect(bounds.x).toBe(80);
    expect(bounds.width).toBe(490);

    // minY = 100, maxY = 330. With 20px padding + 30px header:
    // y = 100 - 20 - 30 = 50, height = (330 - 100) + 40 + 30 = 300
    expect(bounds.y).toBe(50);
    expect(bounds.height).toBe(300);
  });

  it('creates smart cluster frame and updates child frame references', () => {
    const elements = [
      { id: 'el_1', x: 10, y: 20, width: 50, height: 40 },
      { id: 'el_2', x: 80, y: 90, width: 60, height: 50 },
    ];

    const { clusterElement, updatedChildElements } = createSmartCluster(elements, {
      name: 'Backend Microservices',
      strokeColor: '#3b82f6',
    });

    expect(clusterElement.type).toBe('frame');
    expect(clusterElement.isCluster).toBe(true);
    expect(clusterElement.name).toBe('Backend Microservices');
    expect(clusterElement.strokeColor).toBe('#3b82f6');
    expect(clusterElement.childElementIds).toEqual(['el_1', 'el_2']);

    expect(updatedChildElements[0].frameId).toBe(clusterElement.id);
    expect(updatedChildElements[1].frameId).toBe(clusterElement.id);
  });

  it('recomputes cluster bounds dynamically when child elements move', () => {
    const elements = [
      { id: 'el_1', x: 10, y: 20, width: 50, height: 40 },
    ];
    const { clusterElement } = createSmartCluster(elements);

    // Child moved far down-right
    const movedElements = [
      { id: 'el_1', x: 500, y: 600, width: 50, height: 40, frameId: clusterElement.id },
    ];

    const hugged = recomputeClusterAutoHug(clusterElement, movedElements, 28);
    expect(hugged.x).toBe(500 - 28);
    expect(hugged.y).toBe(600 - 28 - CLUSTER_DEFAULTS.HEADER_HEIGHT);
  });
});
