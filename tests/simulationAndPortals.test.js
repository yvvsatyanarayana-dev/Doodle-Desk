import { describe, expect, it } from 'vitest';
import { hitTestElement } from '../src/engine/hitTest.js';
import { exportToSvg } from '../src/engine/io/export.js';
import { buildSimulationGraph, getSimulationChoices } from '../src/engine/simulation.js';

describe('Interactive diagram simulation', () => {
  it('builds branching choices from bound arrows and ignores unrelated shapes', () => {
    const elements = [
      { id: 'start', type: 'diamond', text: 'Start', x: 0, y: 0, width: 80, height: 60 },
      { id: 'yes', type: 'rectangle', text: 'Approve', x: 120, y: -50, width: 90, height: 50 },
      { id: 'no', type: 'rectangle', text: 'Decline', x: 120, y: 50, width: 90, height: 50 },
      { id: 'unrelated', type: 'ellipse', x: 400, y: 0, width: 50, height: 50 },
      { id: 'yes-edge', type: 'arrow', startBinding: { elementId: 'start' }, endBinding: { elementId: 'yes' } },
      { id: 'no-edge', type: 'arrow', label: 'No', startBinding: { elementId: 'start' }, endBinding: { elementId: 'no' } },
    ];

    const graph = buildSimulationGraph(elements);
    const choices = getSimulationChoices(graph, 'start');

    expect(graph.nodes.map(node => node.id)).toEqual(['start', 'yes', 'no']);
    expect(graph.starts.map(node => node.id)).toEqual(['start']);
    expect(choices.map(choice => choice.target.id)).toEqual(['yes', 'no']);
    expect(choices.map(choice => choice.label)).toEqual(['Approve', 'No']);
  });

  it('does not offer deleted, hidden, or unbound shapes as a flow', () => {
    const graph = buildSimulationGraph([
      { id: 'hidden', type: 'rectangle', isHidden: true },
      { id: 'deleted', type: 'rectangle', isDeleted: true },
      { id: 'unconnected', type: 'rectangle' },
      { id: 'wire', type: 'arrow', startBinding: { elementId: 'unconnected' } },
    ]);
    expect(graph.nodes).toEqual([]);
    expect(graph.starts).toEqual([]);
  });
});

describe('Nested board portals', () => {
  it('supports rectangular hit-testing and exports a readable board link card', async () => {
    const portal = {
      id: 'portal',
      type: 'boardPortal',
      x: 30,
      y: 40,
      width: 260,
      height: 150,
      portalWorkspaceName: 'Product',
      portalFileName: 'Roadmap',
      backgroundColor: '#ffffff',
      strokeColor: '#6366f1',
    };
    expect(hitTestElement(portal, 80, 80)).toBe(true);

    const svg = await exportToSvg([portal], {}, {}, { exportBackground: false });
    expect(svg).toContain('BOARD PORTAL');
    expect(svg).toContain('Roadmap');
    expect(svg).toContain('Product');
  });
});
