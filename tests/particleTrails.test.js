import { describe, it, expect } from 'vitest';
import { ParticleTrailEngine, TRAIL_MODES } from '../src/utils/particleTrails.js';

describe('ParticleTrailEngine', () => {
  it('initializes with default BEAM mode and empty point collections', () => {
    const engine = new ParticleTrailEngine();
    expect(engine.mode).toBe(TRAIL_MODES.BEAM);
    expect(engine.points).toEqual([]);
    expect(engine.particles).toEqual([]);
  });

  it('switches and cycles through trail modes cleanly', () => {
    const engine = new ParticleTrailEngine();

    engine.setMode(TRAIL_MODES.FIREFLIES);
    expect(engine.mode).toBe(TRAIL_MODES.FIREFLIES);

    const nextMode1 = engine.cycleMode();
    expect(nextMode1).toBe(TRAIL_MODES.RIBBON);

    const nextMode2 = engine.cycleMode();
    expect(nextMode2).toBe(TRAIL_MODES.SPOTLIGHT);

    const nextMode3 = engine.cycleMode();
    expect(nextMode3).toBe(TRAIL_MODES.BEAM);
  });

  it('generates spark particles with velocity when in FIREFLIES mode', () => {
    const engine = new ParticleTrailEngine();
    engine.setMode(TRAIL_MODES.FIREFLIES);

    engine.addPoint(100, 150, true);
    expect(engine.particles.length).toBeGreaterThanOrEqual(2);

    const p = engine.particles[0];
    expect(p.x).toBeGreaterThan(90);
    expect(p.y).toBeGreaterThan(140);
    expect(typeof p.vx).toBe('number');
    expect(typeof p.vy).toBe('number');
    expect(typeof p.color).toBe('string');
  });

  it('identifies and magnetically attracts to the nearest visible diagram element in SPOTLIGHT mode', () => {
    const engine = new ParticleTrailEngine();
    engine.setMode(TRAIL_MODES.SPOTLIGHT);

    const elements = [
      { id: 'box1', type: 'rectangle', x: 200, y: 200, width: 120, height: 80, isDeleted: false },
      { id: 'box2', type: 'rectangle', x: 800, y: 800, width: 100, height: 60, isDeleted: false },
      { id: 'deleted_box', type: 'rectangle', x: 210, y: 210, width: 120, height: 80, isDeleted: true },
    ];

    // Cursor near box1 (screen x: 220, y: 210)
    engine.updateMagneticSpotlight(220, 210, elements, { zoom: 1, scrollX: 0, scrollY: 0 });
    expect(engine.spotlightTarget).toBeTruthy();
    expect(engine.spotlightTarget.screenX).toBe(200);
    expect(engine.spotlightTarget.screenY).toBe(200);
    expect(engine.spotlightTarget.screenWidth).toBe(120);

    // Cursor far away from all elements
    engine.updateMagneticSpotlight(50, 50, elements, { zoom: 1, scrollX: 0, scrollY: 0 });
    expect(engine.spotlightTarget).toBeNull();
  });
});
