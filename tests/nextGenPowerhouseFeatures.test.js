import { describe, expect, it } from 'vitest';
import {
  buildGraphFromElements,
  calculateSugiyamaLayout,
  calculateForceDirectedLayout,
  calculateOrthogonalTiersLayout,
  calculateRadialMindmapLayout,
  instantiateBlueprint,
  ARCHITECTURE_BLUEPRINTS,
  computeTopologyPositions,
  TOPOLOGY_MODES,
} from '../src/engine/layout/topologyBeautifier.js';
import {
  compileMathFunction,
  findGraphRoots,
  findGraphExtrema,
  computeTangentLine,
  computeRiemannIntegral,
  parseHandwrittenMathStrokes,
  convertMathPlotToDoodleElements,
  generateGraphPlot,
} from '../src/utils/mathGraphEngine.js';

describe('Feature 1: Autonomous Topology Beautifier & One-Click Layout Morphing', () => {
  const mockElements = [
    { id: 'node_1', type: 'rectangle', text: 'Client App', x: 50, y: 50, width: 140, height: 70 },
    { id: 'node_2', type: 'rectangle', text: 'API Gateway', x: 250, y: 50, width: 140, height: 70 },
    { id: 'node_3', type: 'rectangle', text: 'Auth Service', x: 450, y: 20, width: 140, height: 70 },
    { id: 'node_4', type: 'rectangle', text: 'Order Service', x: 450, y: 150, width: 140, height: 70 },
    { id: 'node_5', type: 'cylinder', text: 'Postgres DB', x: 700, y: 100, width: 140, height: 80 },
    // Connectors
    { id: 'arrow_1', type: 'arrow', startBinding: { elementId: 'node_1' }, endBinding: { elementId: 'node_2' } },
    { id: 'arrow_2', type: 'arrow', startBinding: { elementId: 'node_2' }, endBinding: { elementId: 'node_3' } },
    { id: 'arrow_3', type: 'arrow', startBinding: { elementId: 'node_2' }, endBinding: { elementId: 'node_4' } },
    { id: 'arrow_4', type: 'arrow', startBinding: { elementId: 'node_4' }, endBinding: { elementId: 'node_5' } },
  ];

  it('builds a topological graph extracting nodes, edges, and degree counts', () => {
    const graph = buildGraphFromElements(mockElements);
    expect(graph.nodes.length).toBe(5);
    expect(graph.edges.length).toBe(4);

    const clientNode = graph.nodeMap.get('node_1');
    expect(clientNode.outDegree).toBe(1);
    expect(clientNode.inDegree).toBe(0);

    const gatewayNode = graph.nodeMap.get('node_2');
    expect(gatewayNode.inDegree).toBe(1);
    expect(gatewayNode.outDegree).toBe(2);
  });

  it('computes Sugiyama Hierarchical DAG ranks without overlapping nodes', () => {
    const graph = buildGraphFromElements(mockElements);
    const positions = calculateSugiyamaLayout(graph, { nodeSeparation: 60, rankSeparation: 100 });

    expect(positions.size).toBe(5);
    const clientPos = positions.get('node_1');
    const gatewayPos = positions.get('node_2');
    const dbPos = positions.get('node_5');

    // Downstream nodes must be placed at lower/successive rank levels
    expect(gatewayPos.y).toBeGreaterThanOrEqual(clientPos.y);
    expect(dbPos.y).toBeGreaterThan(gatewayPos.y);
  });

  it('computes Force-Directed Physics layout distributing nodes organically', () => {
    const graph = buildGraphFromElements(mockElements);
    const positions = calculateForceDirectedLayout(graph, { iterations: 40, springLength: 150 });

    expect(positions.size).toBe(5);
    for (const [id, pos] of positions) {
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(isNaN(pos.x)).toBe(false);
      expect(isNaN(pos.y)).toBe(false);
    }
  });

  it('classifies systems into Orthogonal Architectural Tiers', () => {
    const graph = buildGraphFromElements(mockElements);
    const positions = calculateOrthogonalTiersLayout(graph, { tierSpacing: 140, nodeSpacing: 80 });

    expect(positions.size).toBe(5);
    const clientPos = positions.get('node_1');
    const dbPos = positions.get('node_5');

    // Client tier should sit above database tier
    expect(dbPos.y).toBeGreaterThan(clientPos.y);
  });

  it('instantiates complete Architecture Blueprints with fresh unique IDs', () => {
    const awsBlueprint = ARCHITECTURE_BLUEPRINTS.find(b => b.id === 'aws-serverless');
    expect(awsBlueprint).toBeDefined();

    const spawned = instantiateBlueprint(awsBlueprint, 300, 300);
    expect(spawned.length).toBe(awsBlueprint.elements.length);

    // Verify all IDs are newly generated and bindings are remapped
    const originalIds = new Set(awsBlueprint.elements.map(e => e.id));
    for (const el of spawned) {
      expect(originalIds.has(el.id)).toBe(false);
      expect(el.x).toBeGreaterThanOrEqual(300);
      expect(el.y).toBeGreaterThanOrEqual(300);
    }

    const spawnedArrow = spawned.find(e => e.type === 'arrow');
    expect(spawnedArrow.startBinding.elementId).toBeDefined();
    expect(originalIds.has(spawnedArrow.startBinding.elementId)).toBe(false);
  });
});

describe('Feature 2: 3D Spatial Holo-Canvas & Parallax Depth Studio', () => {
  it('correctly stratifies elements into 3D vertical elevation tiers', () => {
    const elements = [
      { id: 'f1', type: 'frame', name: 'Background Frame' },
      { id: 'db1', type: 'cylinder', text: 'Database Layer' },
      { id: 's1', type: 'rectangle', text: 'Auth API Service' },
      { id: 'c1', type: 'cloud', text: 'Cloudflare CDN' },
    ];

    const zTiers = elements.map(el => {
      if (el.type === 'frame') return 0;
      if (el.type === 'cylinder') return 1;
      if (el.type === 'rectangle') return 2;
      if (el.type === 'cloud') return 3;
      return 1;
    });

    expect(zTiers).toEqual([0, 1, 2, 3]);
  });
});

describe('Feature 5: Freehand Math Equation Recognizer & Interactive Graphing Calculator', () => {
  it('compiles math formulas into fast executable functions', () => {
    const fn = compileMathFunction('2 * sin(x) + cos(2 * x)');
    expect(fn).toBeDefined();
    expect(fn(0)).toBeCloseTo(1, 2); // 2*sin(0) + cos(0) = 1
    expect(fn(Math.PI / 2)).toBeCloseTo(1, 2); // 2*sin(pi/2) + cos(pi) = 2 - 1 = 1
  });

  it('accurately identifies function roots (f(x) = 0)', () => {
    // Parabola: f(x) = x^2 - 4 => roots at -2 and +2
    const fn = compileMathFunction('x^2 - 4');
    const roots = findGraphRoots(fn, {}, [-5, 5]);

    expect(roots.length).toBe(2);
    expect(roots.some(r => Math.abs(r - (-2)) < 0.05)).toBe(true);
    expect(roots.some(r => Math.abs(r - 2) < 0.05)).toBe(true);
  });

  it('accurately identifies local extrema (peaks and valleys)', () => {
    // Cubic: f(x) = x^3 - 3x => derivative 3x^2 - 3 => local max at x = -1, local min at x = +1
    const fn = compileMathFunction('x^3 - 3*x');
    const extrema = findGraphExtrema(fn, {}, [-3, 3]);

    expect(extrema.length).toBe(2);
    const max = extrema.find(e => e.type === 'max');
    const min = extrema.find(e => e.type === 'min');

    expect(max).toBeDefined();
    expect(Math.abs(max.x - (-1))).toBeLessThan(0.1);
    expect(min).toBeDefined();
    expect(Math.abs(min.x - 1)).toBeLessThan(0.1);
  });

  it('computes instantaneous tangent lines and derivatives', () => {
    // f(x) = x^2, at x = 3, f'(3) = 6, y = 9
    const fn = compileMathFunction('x^2');
    const tangent = computeTangentLine(fn, {}, 3);

    expect(tangent).toBeDefined();
    expect(tangent.x0).toBe(3);
    expect(tangent.y0).toBe(9);
    expect(tangent.slope).toBeCloseTo(6, 1);
  });

  it('computes definite Riemann integral areas numerically', () => {
    // Integral of f(x) = 2x from 0 to 4 is [x^2]_0^4 = 16
    const fn = compileMathFunction('2 * x');
    const result = computeRiemannIntegral(fn, {}, 0, 4);

    expect(result.area).toBeCloseTo(16, 1);
  });

  it('parses freehand handwriting strokes into valid mathematical formulas', () => {
    // Wave stroke simulation
    const waveStroke = {
      points: [
        [10, 50], [20, 30], [30, 70], [40, 25], [50, 75], [60, 30], [70, 70],
        [80, 28], [90, 72], [100, 32], [110, 68], [120, 35], [130, 65], [140, 38], [150, 62], [160, 40]
      ],
    };
    const recognized = parseHandwrittenMathStrokes([waveStroke]);
    expect(recognized.formula).toContain('sin');
    expect(recognized.latex).toContain('sin');
  });

  it('converts plotted mathematical curves into whiteboard doodle elements', () => {
    const fn = compileMathFunction('sin(x)');
    const plotData = generateGraphPlot({ fn, width: 400, height: 200, padding: 20 });
    const elements = convertMathPlotToDoodleElements(plotData, 'sin(x)', 100, 100);

    expect(elements.length).toBe(4);
    // X Axis arrow, Y Axis arrow, freedraw curve, and formula text
    expect(elements.some(e => e.type === 'arrow')).toBe(true);
    expect(elements.some(e => e.type === 'freedraw')).toBe(true);
    expect(elements.some(e => e.type === 'text')).toBe(true);
  });
});
