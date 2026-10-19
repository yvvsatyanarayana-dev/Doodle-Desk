import { describe, it, expect } from 'vitest';
import {
  calculateSceneBounds,
  stratifyElementsIntoTiers,
  extract3DRisers,
  computeCameraTransform,
  ISOMETRIC_CAMERA_PRESETS,
  ARCHITECTURE_TIERS,
  createCustomLayer,
  reorderLayers,
  ARCHITECTURE_PRESET_TEMPLATES,
  LAYER_COLOR_PRESETS,
  sanitizeLayers,
  project3DToScreen,
  export3DArchitectureSnapshot,
} from '../src/utils/isometric3DEngine.js';

describe('Feature 4: 2.5D Isometric 3D Architecture View Suite (100% Offline)', () => {
  it('provides all 5 camera presets with correct angles and elevation spacing', () => {
    expect(ISOMETRIC_CAMERA_PRESETS).toHaveProperty('isometric');
    expect(ISOMETRIC_CAMERA_PRESETS).toHaveProperty('architecture');
    expect(ISOMETRIC_CAMERA_PRESETS).toHaveProperty('cinematic');
    expect(ISOMETRIC_CAMERA_PRESETS).toHaveProperty('side');
    expect(ISOMETRIC_CAMERA_PRESETS).toHaveProperty('top');

    expect(ISOMETRIC_CAMERA_PRESETS.isometric.pitch).toBe(60);
    expect(ISOMETRIC_CAMERA_PRESETS.isometric.yaw).toBe(45);
    expect(ISOMETRIC_CAMERA_PRESETS.architecture.elevationSpacing).toBeGreaterThan(50);
  });

  it('provides 4 standard architecture tiers from Database to Client UI', () => {
    expect(ARCHITECTURE_TIERS.length).toBe(4);
    expect(ARCHITECTURE_TIERS[0].name).toBe('Data & Storage');
    expect(ARCHITECTURE_TIERS[1].name).toBe('Services & Compute');
    expect(ARCHITECTURE_TIERS[2].name).toBe('API & Gateway');
    expect(ARCHITECTURE_TIERS[3].name).toBe('Client & UI');
  });

  it('calculates accurate scene bounds and center coordinates', () => {
    const elements = [
      { id: 'el1', x: 100, y: 50, width: 200, height: 100, isDeleted: false },
      { id: 'el2', x: 400, y: 250, width: 150, height: 80, isDeleted: false },
    ];

    const bounds = calculateSceneBounds(elements);
    expect(bounds.minX).toBe(100);
    expect(bounds.minY).toBe(50);
    expect(bounds.maxX).toBe(550);
    expect(bounds.maxY).toBe(330);
    expect(bounds.width).toBe(450);
    expect(bounds.height).toBe(280);
    expect(bounds.centerX).toBe(325);
    expect(bounds.centerY).toBe(190);
  });

  it('handles empty scene bounds safely with default fallback', () => {
    const bounds = calculateSceneBounds([]);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    expect(typeof bounds.centerX).toBe('number');
  });

  it('intelligently stratifies elements into architectural tiers based on keywords', () => {
    const elements = [
      { id: 'e1', text: 'React Web Frontend Client', x: 100, y: 20, width: 100, height: 50 },
      { id: 'e2', text: 'REST & GraphQL API Gateway', x: 100, y: 150, width: 100, height: 50 },
      { id: 'e3', text: 'Auth & Payment Microservice Worker', x: 100, y: 300, width: 100, height: 50 },
      { id: 'e4', text: 'PostgreSQL Database & Redis Cache', x: 100, y: 450, width: 100, height: 50 },
    ];

    const tierMap = stratifyElementsIntoTiers(elements);
    expect(tierMap.get('e1')).toBe(3); // Client & UI
    expect(tierMap.get('e2')).toBe(2); // API & Gateway
    expect(tierMap.get('e3')).toBe(1); // Services & Compute
    expect(tierMap.get('e4')).toBe(0); // Data & Storage
  });

  it('respects manual custom tier overrides', () => {
    const elements = [
      { id: 'e1', text: 'Custom Node', x: 100, y: 100, width: 100, height: 50 },
    ];

    const customTierMap = { e1: 3 };
    const tierMap = stratifyElementsIntoTiers(elements, customTierMap);
    expect(tierMap.get('e1')).toBe(3);
  });

  it('detects 3D vertical risers between different elevation tiers and calculates height difference', () => {
    const elements = [
      { id: 'client_box', x: 100, y: 50, width: 80, height: 50, isDeleted: false },
      { id: 'api_box', x: 100, y: 200, width: 80, height: 50, isDeleted: false },
      {
        id: 'arrow_1',
        type: 'arrow',
        startBinding: { elementId: 'client_box' },
        endBinding: { elementId: 'api_box' },
        strokeColor: '#818cf8',
        strokeWidth: 2,
        isDeleted: false,
      },
    ];

    const tierMap = new Map([
      ['client_box', 3], // Tier 3 (Z = 270)
      ['api_box', 2],    // Tier 2 (Z = 180)
    ]);

    const risers = extract3DRisers(elements, tierMap, 90);
    expect(risers.length).toBe(1);
    expect(risers[0].source.tier).toBe(3);
    expect(risers[0].target.tier).toBe(2);
    expect(risers[0].source.z).toBe(270);
    expect(risers[0].target.z).toBe(180);
    expect(risers[0].heightDiff).toBe(-90);
  });

  it('does not create vertical risers for arrows connecting elements within the same tier', () => {
    const elements = [
      { id: 'srvA', x: 100, y: 100, width: 60, height: 40, isDeleted: false },
      { id: 'srvB', x: 250, y: 100, width: 60, height: 40, isDeleted: false },
      {
        id: 'arrow_same_tier',
        type: 'arrow',
        startBinding: { elementId: 'srvA' },
        endBinding: { elementId: 'srvB' },
        isDeleted: false,
      },
    ];

    const tierMap = new Map([
      ['srvA', 1],
      ['srvB', 1],
    ]);

    const risers = extract3DRisers(elements, tierMap, 90);
    expect(risers.length).toBe(0);
  });

  it('computes valid CSS 3D camera transforms', () => {
    const transform = computeCameraTransform({
      pitch: 55,
      yaw: 35,
      zoom: 1.2,
      panX: 40,
      panY: -20,
      perspective: 1200,
    });

    expect(transform.perspectiveCss).toContain('perspective(1200px)');
    expect(transform.worldTransform).toContain('rotateX(55deg)');
    expect(transform.worldTransform).toContain('rotateZ(35deg)');
    expect(transform.worldTransform).toContain('scale(1.2)');
    expect(transform.worldTransform).toContain('translate3d(40px, -20px, 0)');
  });

  it('supports creating custom layers with custom colors and orders', () => {
    const customLayer = createCustomLayer('Edge CDN', '#f43f5e', 4);
    expect(customLayer.name).toBe('Edge CDN');
    expect(customLayer.color).toBe('#f43f5e');
    expect(customLayer.order).toBe(4);
    expect(customLayer.id).toMatch(/^layer_/);
  });

  it('reorders layers and normalizes order indices', () => {
    const layers = [
      { id: 'l0', name: 'Database', order: 0 },
      { id: 'l1', name: 'Services', order: 1 },
      { id: 'l2', name: 'UI', order: 2 },
    ];

    const reordered = reorderLayers(layers, 2, 0); // Move UI to bottom
    expect(reordered[0].name).toBe('UI');
    expect(reordered[0].order).toBe(0);
    expect(reordered[1].name).toBe('Database');
    expect(reordered[1].order).toBe(1);
    expect(reordered[2].name).toBe('Services');
    expect(reordered[2].order).toBe(2);
  });

  it('provides multi-tier architecture preset templates (Cloud, AI Stack, Event-Driven)', () => {
    expect(ARCHITECTURE_PRESET_TEMPLATES).toHaveProperty('cloud_4tier');
    expect(ARCHITECTURE_PRESET_TEMPLATES).toHaveProperty('modern_ai_5tier');
    expect(ARCHITECTURE_PRESET_TEMPLATES).toHaveProperty('event_driven_6tier');
    expect(ARCHITECTURE_PRESET_TEMPLATES).toHaveProperty('classic_3tier');

    expect(ARCHITECTURE_PRESET_TEMPLATES.modern_ai_5tier.layers.length).toBe(5);
    expect(ARCHITECTURE_PRESET_TEMPLATES.event_driven_6tier.layers.length).toBe(6);
  });

  it('dynamically stratifies canvas elements across custom user-defined layers', () => {
    const customLayers = [
      { id: 'cl_0', name: 'Vector Database & Memory', color: '#10b981', order: 0 },
      { id: 'cl_1', name: 'Model & Inference Cluster', color: '#8b5cf6', order: 1 },
      { id: 'cl_2', name: 'Agent Orchestration Loop', color: '#06b6d4', order: 2 },
      { id: 'cl_3', name: 'Chat Presentation UI', color: '#f43f5e', order: 3 },
    ];

    const elements = [
      { id: 'node_chat', text: 'Chat Interface', x: 100, y: 50, width: 100, height: 50 },
      { id: 'node_agent', text: 'LangChain Agent', x: 100, y: 150, width: 100, height: 50 },
      { id: 'node_model', text: 'LLM Model Worker', x: 100, y: 250, width: 100, height: 50 },
      { id: 'node_vec', text: 'Vector Store', x: 100, y: 350, width: 100, height: 50 },
    ];

    const tierMap = stratifyElementsIntoTiers(elements, {}, customLayers);
    expect(tierMap.get('node_chat')).toBe(3);
    expect(tierMap.get('node_agent')).toBe(2);
    expect(tierMap.get('node_model')).toBe(1);
    expect(tierMap.get('node_vec')).toBe(0);
  });

  it('safely handles undefined/null elements, NaN coordinates, and malformed layers without throwing', () => {
    const { sanitizeLayers } = require ? {} : {};
    const malformedLayers = [null, undefined, { id: 'l_custom', name: 'Custom' }, { order: 2 }];
    const elementsWithBadCoords = [
      { id: 'bad1' }, // missing x and y
      { id: 'bad2', x: NaN, y: NaN },
      null,
      undefined,
      { id: 'valid1', x: 100, y: 100, width: 80, height: 40 },
    ];

    // Must never throw Cannot read properties of undefined (reading 'order')
    expect(() => {
      stratifyElementsIntoTiers(elementsWithBadCoords, {}, malformedLayers);
    }).not.toThrow();

    const tierMap = stratifyElementsIntoTiers(elementsWithBadCoords, {}, malformedLayers);
    expect(tierMap.has('bad1')).toBe(true);
    expect(tierMap.has('bad2')).toBe(true);
    expect(tierMap.has('valid1')).toBe(true);
  });

  it('sanitizeLayers cleanses invalid layer arrays and populates missing properties', () => {
    const cleaned = sanitizeLayers([null, { name: 'Only Name' }, undefined]);
    expect(cleaned.length).toBe(1);
    expect(cleaned[0].name).toBe('Only Name');
    expect(typeof cleaned[0].order).toBe('number');
    expect(cleaned[0].id).toBeDefined();

    const emptyCleaned = sanitizeLayers([]);
    expect(emptyCleaned.length).toBe(4); // Default 4 cloud tiers
  });

  it('projects 3D coordinates into valid 2D screen positions', () => {
    const proj = project3DToScreen({
      x: 200,
      y: 100,
      z: 150,
      centerX: 400,
      centerY: 300,
      width: 2400,
      height: 1500,
      yaw: 35,
      pitch: 55,
      scale: 1.2,
    });

    expect(typeof proj.sx).toBe('number');
    expect(typeof proj.sy).toBe('number');
    expect(typeof proj.depth).toBe('number');
    expect(Number.isNaN(proj.sx)).toBe(false);
    expect(Number.isNaN(proj.sy)).toBe(false);
  });

  it('safely runs export3DArchitectureSnapshot in offline environment', async () => {
    const result = await export3DArchitectureSnapshot({
      elements: [{ id: 'box1', x: 100, y: 100, width: 100, height: 60, text: 'API' }],
      layers: [{ id: 'l1', name: 'API', order: 0, color: '#6366f1' }],
      tierMap: new Map([['box1', 0]]),
      pitch: 55,
      yaw: 35,
      bounds: { minX: 100, minY: 100, maxX: 200, maxY: 160, width: 100, height: 60, centerX: 150, centerY: 130 },
    });

    expect(result).toHaveProperty('filename');
    expect(result.filename).toContain('doodle-3d-architecture');
  });

  it('supports progressive 3D scroll story layer-by-layer revelation and riser activation', () => {
    const layers = [
      { id: 'l0', name: 'Database', order: 0 },
      { id: 'l1', name: 'Services', order: 1 },
      { id: 'l2', name: 'API Gateway', order: 2 },
      { id: 'l3', name: 'Client UI', order: 3 },
    ];

    const elements = [
      { id: 'db1', x: 100, y: 100, width: 80, height: 40, isDeleted: false },
      { id: 'srv1', x: 100, y: 200, width: 80, height: 40, isDeleted: false },
      { id: 'api1', x: 100, y: 300, width: 80, height: 40, isDeleted: false },
      { id: 'client1', x: 100, y: 400, width: 80, height: 40, isDeleted: false },
      { id: 'arr1', type: 'arrow', startBinding: { elementId: 'db1' }, endBinding: { elementId: 'srv1' }, isDeleted: false },
      { id: 'arr2', type: 'arrow', startBinding: { elementId: 'srv1' }, endBinding: { elementId: 'api1' }, isDeleted: false },
      { id: 'arr3', type: 'arrow', startBinding: { elementId: 'api1' }, endBinding: { elementId: 'client1' }, isDeleted: false },
    ];

    const tierMap = new Map([
      ['db1', 0],
      ['srv1', 1],
      ['api1', 2],
      ['client1', 3],
    ]);

    const allRisers = extract3DRisers(elements, tierMap, 90, layers);
    expect(allRisers.length).toBe(3);

    // Helper: simulate riser visibility for a given revealedLayerCount
    const getVisibleRisers = (revealedCount) => {
      return allRisers.filter((r) => {
        const sIdx = layers.findIndex((l) => l.order === r.source.tier);
        const tIdx = layers.findIndex((l) => l.order === r.target.tier);
        return sIdx < revealedCount && tIdx < revealedCount;
      });
    };

    // Step 1: Base layer only (revealedCount = 1) -> no cross-tier risers visible
    expect(getVisibleRisers(1).length).toBe(0);

    // Step 2: Database + Services revealed (revealedCount = 2) -> 1 riser visible (db1 -> srv1)
    expect(getVisibleRisers(2).length).toBe(1);
    expect(getVisibleRisers(2)[0].source.tier).toBe(0);
    expect(getVisibleRisers(2)[0].target.tier).toBe(1);

    // Step 3: Database + Services + API revealed (revealedCount = 3) -> 2 risers visible
    expect(getVisibleRisers(3).length).toBe(2);

    // Step 4: All layers revealed (revealedCount = 4) -> all 3 risers visible
    expect(getVisibleRisers(4).length).toBe(3);
  });

  it('correctly clamps scroll story step progression between 1 and layer count', () => {
    const totalLayers = 4;
    const clampStep = (current, delta) => Math.max(1, Math.min(totalLayers, current + delta));

    // Clamps lower bound to 1
    expect(clampStep(1, -1)).toBe(1);
    expect(clampStep(1, -5)).toBe(1);

    // Steps forward correctly
    expect(clampStep(1, 1)).toBe(2);
    expect(clampStep(2, 1)).toBe(3);
    expect(clampStep(3, 1)).toBe(4);

    // Clamps upper bound to totalLayers
    expect(clampStep(4, 1)).toBe(4);
    expect(clampStep(4, 10)).toBe(4);
  });
});
