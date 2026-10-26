import React, { useEffect, useRef, useState, memo } from 'react';
import { ParticleTrailEngine, TRAIL_MODES } from '../utils/particleTrails.js';
import { Sparkles, Flame, PenTool, Target, X } from 'lucide-react';

const UI_SELECTOR = 'button, a, input, select, textarea, [role="button"], header, nav, dialog, ' +
  '.studio-topbar, .studio-topbar-left, .studio-topbar-center, .studio-topbar-right, ' +
  '.Island, .App-toolbar, .App-toolbar-container, .App-toolbar-content, .ToolIcon, ' +
  '.canvas-extra-tools-popover, .dropdown-panel, .dropdown-menu, .studio-dropdown-menu, ' +
  '.canvas-style-dropdown, .minimap-toggle-btn, .minimap-card, .help-icon, ' +
  '.layer-ui__wrapper__top-right, .layer-ui__wrapper__footer-right, .FooterLeft, ' +
  '.undo-redo-stack, .zoom-actions, .sidebar, .sidebar-trigger, .Modal, ' +
  '.live-collab-dropdown, .live-collab-chat-toggle, .live-collab-chat-panel, ' +
  '.studio-properties-panel, .App-menu__left-wrapper, .welcome-screen, .zen-mode-toggle-btn';

/**
 * Custom Laser Pointer & Presenter Particle Physics
 * Supports:
 * - Beam (crimson laser)
 * - Fireflies (sparkle bursts with velocity physics)
 * - Ribbon (calligraphic flowing ink stream)
 * - Spotlight (magnetic halo snapping to nearby diagram elements)
 */
function CustomLaserPointerComponent({ isActive, onClose, doodleAPI }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(new ParticleTrailEngine());
  const animFrameRef = useRef(null);
  const currentPosRef = useRef({ x: -100, y: -100 });
  const isPointerDownRef = useRef(false);
  const [trailMode, setTrailMode] = useState(TRAIL_MODES.BEAM);

  // Sync mode with engine
  const handleSelectMode = (mode) => {
    setTrailMode(mode);
    engineRef.current.setMode(mode);
  };

  useEffect(() => {
    if (!isActive) {
      isPointerDownRef.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const engine = engineRef.current;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const isOverUI = (target) => {
      if (!target) return false;
      return !!target.closest?.(UI_SELECTOR);
    };

    const handlePointerDown = (e) => {
      if (isOverUI(e.target)) {
        return;
      }
      if (e.button === 0) {
        isPointerDownRef.current = true;
        engine.addPoint(e.clientX, e.clientY, true);
      }
    };

    const handlePointerUp = () => {
      isPointerDownRef.current = false;
    };

    const handlePointerMove = (e) => {
      if (isOverUI(e.target)) {
        currentPosRef.current = { x: -100, y: -100 };
      } else {
        currentPosRef.current = { x: e.clientX, y: e.clientY };
      }

      if (isPointerDownRef.current || engine.mode === TRAIL_MODES.SPOTLIGHT) {
        engine.addPoint(e.clientX, e.clientY, isPointerDownRef.current);
      }

      // Magnetic spotlight update
      if (engine.mode === TRAIL_MODES.SPOTLIGHT && doodleAPI) {
        const elements = doodleAPI.getSceneElements?.() || [];
        const appState = doodleAPI.getAppState?.() || {};
        engine.updateMagneticSpotlight(e.clientX, e.clientY, elements, {
          zoom: appState.zoom?.value || 1,
          scrollX: appState.scrollX || 0,
          scrollY: appState.scrollY || 0,
        });
      }
    };

    const handleKeyDown = (e) => {
      if (
        e.key === 'Escape' ||
        ((e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey)
      ) {
        e.preventDefault();
        onClose?.();
        return;
      }

      // Shift+L cycles trail modes
      if (e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        const next = engine.cycleMode();
        setTrailMode(next);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('keydown', handleKeyDown);

    // Particle render loop
    const render = (now) => {
      engine.render(ctx, canvas.width, canvas.height, now);

      // Render cursor bead
      const head = currentPosRef.current;
      if (head.x > 0 && head.y > 0) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle =
          engine.mode === TRAIL_MODES.FIREFLIES
            ? '#38bdf8'
            : engine.mode === TRAIL_MODES.RIBBON
            ? '#10b981'
            : engine.mode === TRAIL_MODES.SPOTLIGHT
            ? '#818cf8'
            : '#f43f5e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, onClose, doodleAPI]);

  if (!isActive) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="custom-laser-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />

      {/* Floating Trail Physics Mode Bar */}
      <div
        className="laser-mode-pill"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          background: 'rgba(24, 24, 27, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          color: '#f4f4f5',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: '10px', color: '#a1a1aa', marginRight: '4px' }}>TRAIL:</span>

        <button
          type="button"
          onClick={() => handleSelectMode(TRAIL_MODES.BEAM)}
          style={{
            background: trailMode === TRAIL_MODES.BEAM ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
            color: trailMode === TRAIL_MODES.BEAM ? '#f43f5e' : '#a1a1aa',
            border: 'none',
            borderRadius: '12px',
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title="Crimson Laser Beam"
        >
          <Flame size={12} /> Beam
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode(TRAIL_MODES.FIREFLIES)}
          style={{
            background: trailMode === TRAIL_MODES.FIREFLIES ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            color: trailMode === TRAIL_MODES.FIREFLIES ? '#38bdf8' : '#a1a1aa',
            border: 'none',
            borderRadius: '12px',
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title="Luminous Spark Fireflies"
        >
          <Sparkles size={12} /> Sparks
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode(TRAIL_MODES.RIBBON)}
          style={{
            background: trailMode === TRAIL_MODES.RIBBON ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
            color: trailMode === TRAIL_MODES.RIBBON ? '#10b981' : '#a1a1aa',
            border: 'none',
            borderRadius: '12px',
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title="Fluid Ink Ribbon"
        >
          <PenTool size={12} /> Ribbon
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode(TRAIL_MODES.SPOTLIGHT)}
          style={{
            background: trailMode === TRAIL_MODES.SPOTLIGHT ? 'rgba(129, 140, 248, 0.25)' : 'transparent',
            color: trailMode === TRAIL_MODES.SPOTLIGHT ? '#818cf8' : '#a1a1aa',
            border: 'none',
            borderRadius: '12px',
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title="Magnetic Spotlight (Snaps to elements)"
        >
          <Target size={12} /> Spotlight
        </button>

        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Exit Laser Mode (Esc)"
        >
          <X size={13} />
        </button>
      </div>
    </>
  );
}

export const CustomLaserPointer = memo(CustomLaserPointerComponent);
