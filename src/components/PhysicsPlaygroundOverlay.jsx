import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Plus,
  X,
  Orbit,
} from 'lucide-react';
import { CanvasPhysicsWorld } from '../utils/canvasPhysicsEngine.js';

export function PhysicsPlaygroundOverlay({
  isActive,
  onClose,
  doodleAPI,
  theme = 'dark',
}) {
  const isDark = theme !== 'light';
  const [isRunning, setIsRunning] = useState(true);
  const [gravityMode, setGravityMode] = useState('earth'); // 'earth' | 'moon' | 'zero' | 'inverted'
  const [bounceMode, setBounceMode] = useState('rubber'); // 'soft' | 'rubber' | 'superball'
  const physicsWorldRef = useRef(null);
  const runFrameRef = useRef(null);

  // Calculate viewport boundaries in scene coordinates
  const computeBounds = () => {
    const appState = doodleAPI?.getAppState?.() || {};
    const zoom = appState.zoom?.value || (typeof appState.zoom === 'number' ? appState.zoom : 1);
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;

    const viewLeft = -scrollX / zoom;
    const viewTop = -scrollY / zoom;
    const viewWidth = window.innerWidth / zoom;
    const viewHeight = window.innerHeight / zoom;

    // Floor is positioned 120px above bottom screen edge: giving 60px+ of clean breathing room above dock
    const floorY = viewTop + viewHeight - (120 / zoom);
    const ceilingY = viewTop + (16 / zoom);
    const leftWall = viewLeft + (16 / zoom);
    const rightWall = viewLeft + viewWidth - (16 / zoom);

    return {
      x: leftWall,
      y: ceilingY,
      top: ceilingY,
      bottom: floorY,
      left: leftWall,
      right: rightWall,
      width: rightWall - leftWall,
      height: floorY - ceilingY,
      viewLeft,
      viewTop,
      viewWidth,
      viewHeight,
      zoom,
    };
  };

  // Synchronize physics body coordinates to DoodleCanvas elements
  const runFrame = (bodies) => {
    if (!doodleAPI) return;
    const all = doodleAPI.getSceneElementsIncludingDeleted?.() || [];
    const presentIds = new Set(all.map((el) => el.id));
    const missing = [];

    // Ensure any newly added body in physicsWorld is safely present
    for (const body of bodies.values()) {
      if (body.element && !presentIds.has(body.id)) {
        missing.push(body.element);
      }
    }

    const baseList = missing.length > 0 ? [...all, ...missing] : all;
    let changed = false;

    const updated = baseList.map((el) => {
      const body = bodies.get(el.id);
      if (body) {
        changed = true;
        return {
          ...el,
          x: Math.round(body.x),
          y: Math.round(body.y),
        };
      }
      return el;
    });

    if (changed) {
      doodleAPI.updateScene?.({ elements: updated, commitToHistory: false });
    }
  };
  runFrameRef.current = runFrame;

  // Initialize physics simulation when activated
  useEffect(() => {
    if (!isActive || !doodleAPI) return;

    let currentElements = doodleAPI.getSceneElements?.() || [];
    const bounds = computeBounds();

    const world = new CanvasPhysicsWorld({
      gravity: 980,
      restitution: 0.65,
      friction: 0.985,
    });
    world.bounds = bounds;
    physicsWorldRef.current = world;

    // If canvas has no shapes, spawn 4 colorful demo shapes immediately with distinct spacing
    if (currentElements.length === 0) {
      const centerX = bounds.viewLeft + bounds.viewWidth / 2;
      const spawnTop = bounds.viewTop + (70 / bounds.zoom);

      const demoShapes = [
        {
          id: 'phys_ball_1',
          type: 'ellipse',
          x: Math.round(centerX - 130),
          y: Math.round(spawnTop),
          width: 50,
          height: 50,
          backgroundColor: '#f43f5e',
          strokeColor: '#fda4af',
          strokeWidth: 2,
          fillStyle: 'solid',
          roughness: 0,
          isDeleted: false,
          version: 1,
        },
        {
          id: 'phys_box_2',
          type: 'rectangle',
          x: Math.round(centerX - 50),
          y: Math.round(spawnTop - 30),
          width: 52,
          height: 52,
          backgroundColor: '#6366f1',
          strokeColor: '#818cf8',
          strokeWidth: 2,
          fillStyle: 'solid',
          roughness: 0,
          isDeleted: false,
          version: 1,
        },
        {
          id: 'phys_diamond_3',
          type: 'diamond',
          x: Math.round(centerX + 30),
          y: Math.round(spawnTop - 15),
          width: 52,
          height: 52,
          backgroundColor: '#06b6d4',
          strokeColor: '#67e8f9',
          strokeWidth: 2,
          fillStyle: 'solid',
          roughness: 0,
          isDeleted: false,
          version: 1,
        },
        {
          id: 'phys_ball_4',
          type: 'ellipse',
          x: Math.round(centerX + 115),
          y: Math.round(spawnTop - 45),
          width: 48,
          height: 48,
          backgroundColor: '#10b981',
          strokeColor: '#6ee7b7',
          strokeWidth: 2,
          fillStyle: 'solid',
          roughness: 0,
          isDeleted: false,
          version: 1,
        },
      ];

      currentElements = demoShapes;
      doodleAPI.updateScene?.({ elements: demoShapes, commitToHistory: false });
    }

    world.initElements(currentElements, bounds);
    world.start((bodies) => runFrameRef.current?.(bodies));
    setIsRunning(true);

    const handleResize = () => {
      if (physicsWorldRef.current) {
        physicsWorldRef.current.bounds = computeBounds();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      world.stop();
    };
  }, [isActive, doodleAPI]);

  // Action: Gravity Presets (1G, 0.2G, 0G, -1G)
  const handleGravityChange = (mode, e) => {
    e?.stopPropagation?.();
    setGravityMode(mode);
    if (!physicsWorldRef.current) return;
    physicsWorldRef.current.setGravityMode(mode, true);
    if (!isRunning) {
      physicsWorldRef.current.start((bodies) => runFrameRef.current?.(bodies));
      setIsRunning(true);
    }
  };

  // Action: Bounce Presets (Soft, Rubber, Super)
  const handleBounceChange = (mode, e) => {
    e?.stopPropagation?.();
    setBounceMode(mode);
    if (!physicsWorldRef.current) return;
    physicsWorldRef.current.setBounceMode(mode, true);
    if (!isRunning) {
      physicsWorldRef.current.start((bodies) => runFrameRef.current?.(bodies));
      setIsRunning(true);
    }
  };

  // Action: Play / Pause Simulation
  const handleTogglePlay = (e) => {
    e?.stopPropagation?.();
    if (!physicsWorldRef.current) return;
    if (isRunning) {
      physicsWorldRef.current.stop();
      setIsRunning(false);
    } else {
      physicsWorldRef.current.start((bodies) => runFrameRef.current?.(bodies));
      setIsRunning(true);
    }
  };

  // Action: Drop new colorful shape from top/bottom
  const handleSpawnShape = (e) => {
    e?.stopPropagation?.();
    if (!doodleAPI || !physicsWorldRef.current) return;
    const bounds = computeBounds();
    physicsWorldRef.current.bounds = bounds;

    const colors = ['#f43f5e', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shapeTypes = ['ellipse', 'rectangle', 'diamond'];
    const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    const size = Math.floor(Math.random() * 16) + 48; // 48px to 64px

    // Distribute drops across the visible canvas width so they don't pile into a single cluster
    const margin = Math.max(90, bounds.viewWidth * 0.16);
    const spawnableWidth = Math.max(200, bounds.viewWidth - margin * 2);
    const spawnX = bounds.viewLeft + margin + Math.random() * spawnableWidth;
    const spawnY = physicsWorldRef.current.gravity < 0
      ? bounds.bottom - size - 20
      : bounds.top + 20;

    const newEl = {
      id: `phys_drop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: Math.round(spawnX),
      y: Math.round(spawnY),
      width: size,
      height: size,
      backgroundColor: color,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      fillStyle: 'solid',
      roughness: 0,
      isDeleted: false,
      version: 1,
    };

    physicsWorldRef.current.addBody(newEl);
    const all = doodleAPI.getSceneElements?.() || [];
    doodleAPI.updateScene?.({ elements: [...all, newEl], commitToHistory: false });

    if (!isRunning) {
      physicsWorldRef.current.start((bodies) => runFrameRef.current?.(bodies));
      setIsRunning(true);
    }
    doodleAPI.onToast?.(`Dropped new bouncy shape`);
  };

  // Action: Explosive shake impulse upward
  const handleShake = (e) => {
    e?.stopPropagation?.();
    if (!physicsWorldRef.current) return;
    physicsWorldRef.current.applyShake(850);
    if (!isRunning) {
      physicsWorldRef.current.start((bodies) => runFrameRef.current?.(bodies));
      setIsRunning(true);
    }
    doodleAPI.onToast?.('⚡ Shake Impulse applied!');
  };

  // Action: Reset shapes back to original positions
  const handleReset = (e) => {
    e?.stopPropagation?.();
    if (!physicsWorldRef.current || !doodleAPI) return;
    const currentElements = doodleAPI.getSceneElements?.() || [];
    const restored = physicsWorldRef.current.resetToDesignLayout(currentElements);
    doodleAPI.updateScene?.({ elements: restored, commitToHistory: false });

    if (!isRunning) {
      physicsWorldRef.current.start((bodies) => runFrameRef.current?.(bodies));
      setIsRunning(true);
    }
    doodleAPI.onToast?.('↺ Reset shapes to original positions');
  };

  // Action: Exit Physics mode
  const handleExit = (e) => {
    e?.stopPropagation?.();
    if (physicsWorldRef.current) {
      physicsWorldRef.current.stop();
    }
    onClose?.();
  };

  if (!isActive) return null;

  return (
    <div
      className="physics-playground-dock"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Title / Orbit Icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 6px' }}>
        <Orbit size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Physics
        </span>
      </div>

      <div className="physics-dock-divider" />

      {/* Play/Pause */}
      <button
        type="button"
        className={`physics-btn ${isRunning ? 'is-active' : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleTogglePlay}
        title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
      >
        {isRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
        <span>{isRunning ? 'Pause' : 'Play'}</span>
      </button>

      <div className="physics-dock-divider" />

      {/* Gravity: 1G | 0.2G | 0G | -1G */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        {[
          { id: 'earth', label: '1G' },
          { id: 'moon', label: '0.2G' },
          { id: 'zero', label: '0G' },
          { id: 'inverted', label: '-1G' },
        ].map((g) => (
          <button
            key={g.id}
            type="button"
            className={`physics-btn ${gravityMode === g.id ? 'is-active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleGravityChange(g.id, e)}
            title={`Gravity: ${g.label}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="physics-dock-divider" />

      {/* Bounce: Soft | Rubber | Super */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        {[
          { id: 'soft', label: 'Soft' },
          { id: 'rubber', label: 'Rubber' },
          { id: 'superball', label: 'Super' },
        ].map((b) => (
          <button
            key={b.id}
            type="button"
            className={`physics-btn ${bounceMode === b.id ? 'is-active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleBounceChange(b.id, e)}
            title={`Bounce: ${b.label}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="physics-dock-divider" />

      {/* Action Buttons: Drop, Shake, Reset, Exit */}
      <button
        type="button"
        className="physics-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleSpawnShape}
        style={{ color: '#10b981' }}
        title="Drop a new colorful physics shape"
      >
        <Plus size={12} strokeWidth={2.5} />
        <span>Drop</span>
      </button>

      <button
        type="button"
        className="physics-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleShake}
        style={{ color: '#f59e0b' }}
        title="Explosive impulse to blast shapes upward"
      >
        <Zap size={12} />
        <span>Shake</span>
      </button>

      <button
        type="button"
        className="physics-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleReset}
        title="Restore original shape positions"
      >
        <RotateCcw size={11} />
        <span>Reset</span>
      </button>

      <button
        type="button"
        className="physics-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleExit}
        style={{ padding: '4px 6px', color: '#a1a1aa' }}
        title="Exit Physics Mode (Shift+P)"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default PhysicsPlaygroundOverlay;
