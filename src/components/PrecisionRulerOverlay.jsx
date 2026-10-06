import React, { useState, useRef, useEffect, memo } from 'react';
import { RotateCw, Move, X, Maximize2, Compass, Check } from 'lucide-react';

function PrecisionRulerOverlayComponent({ isActive, onClose }) {
  const [length, setLength] = useState(() => (typeof window !== 'undefined' ? Math.min(560, Math.max(260, window.innerWidth - 48)) : 560));
  const [pos, setPos] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    const h = typeof window !== 'undefined' ? window.innerHeight : 600;
    const l = Math.min(560, Math.max(260, w - 48));
    return { x: Math.max(12, (w - l) / 2), y: Math.max(60, h / 3) };
  });
  const [angle, setAngle] = useState(0); // in degrees
  const [unit, setUnit] = useState('px'); // 'px' | 'cm'
  const [snapAngle, setSnapAngle] = useState(true); // snap to 15 degrees

  const rulerRef = useRef(null);
  const dragStartRef = useRef(null);
  const rotateStartRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onClose]);

  if (!isActive) return null;

  // Dragging the entire ruler body
  const handlePointerDownDrag = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: pos.x,
      initialPosY: pos.y,
    };

    const handlePointerMove = (ev) => {
      if (!dragStartRef.current) return;
      const dx = ev.clientX - dragStartRef.current.startX;
      const dy = ev.clientY - dragStartRef.current.startY;
      setPos({
        x: dragStartRef.current.initialPosX + dx,
        y: dragStartRef.current.initialPosY + dy,
      });
    };

    const handlePointerUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Rotating the ruler via rotation handle
  const handlePointerDownRotate = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const handlePointerMove = (ev) => {
      const dx = ev.clientX - originX;
      const dy = ev.clientY - originY;
      let rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (rawAngle < 0) rawAngle += 360;

      if (snapAngle) {
        // Snap to nearest 15 degrees if within 3 degrees
        const snapStep = 15;
        const nearestSnap = Math.round(rawAngle / snapStep) * snapStep;
        if (Math.abs(rawAngle - nearestSnap) < 4) {
          rawAngle = nearestSnap % 360;
        }
      }

      setAngle(Math.round(rawAngle));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Resize length handle
  const handlePointerDownResize = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startLength = length;

    const handlePointerMove = (ev) => {
      const delta = (ev.clientX - startX);
      const newLen = Math.max(300, Math.min(1400, startLength + delta * 2));
      setLength(newLen);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Generate tick marks
  const tickStep = unit === 'px' ? 10 : 37.795; // ~96dpi = 37.8px/cm
  const numTicks = Math.floor(length / tickStep);
  const ticks = [];

  for (let i = 0; i <= numTicks; i++) {
    const x = i * tickStep;
    const isMajor = unit === 'px' ? i % 10 === 0 : i % 1 === 0;
    const isMedium = unit === 'px' ? i % 5 === 0 : i % 0.5 === 0;

    let tickH = 8;
    if (isMajor) tickH = 22;
    else if (isMedium) tickH = 14;

    ticks.push(
      <g key={i}>
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={tickH}
          stroke={isMajor ? '#38bdf8' : 'rgba(255, 255, 255, 0.45)'}
          strokeWidth={isMajor ? 1.5 : 1}
        />
        {isMajor && (
          <text
            x={x + 2}
            y={32}
            fill="#e2e8f0"
            fontSize="10"
            fontFamily="monospace"
            userSelect="none"
          >
            {unit === 'px' ? x : `${i}`}
          </text>
        )}
      </g>
    );
  }

  return (
    <div
      ref={rulerRef}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${length}px`,
        height: '84px',
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
        zIndex: 9990,
        userSelect: 'none',
      }}
    >
      {/* Ruler Body Glass */}
      <div
        onPointerDown={handlePointerDownDrag}
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(15, 17, 23, 0.88)',
          backdropFilter: 'blur(12px)',
          borderRadius: '10px',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.15)',
          cursor: 'grab',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* SVG Tick Marks */}
        <svg
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        >
          {ticks}
        </svg>

        {/* Center Protractor Arc & Angle Readout */}
        <div
          style={{
            position: 'absolute',
            top: '46px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            pointerEvents: 'auto',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Compass size={13} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
            {angle}°
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <button
            onClick={() => setUnit((u) => (u === 'px' ? 'cm' : 'px'))}
            style={{
              background: 'none',
              border: 'none',
              color: '#f8fafc',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 4px',
            }}
            title="Toggle measurement unit"
          >
            {unit.toUpperCase()}
          </button>
          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
          <button
            onClick={() => setAngle(0)}
            style={{
              background: 'none',
              border: 'none',
              color: angle === 0 ? '#38bdf8' : '#9ca3af',
              fontSize: '10px',
              cursor: 'pointer',
              padding: '0 2px',
            }}
            title="Reset to 0°"
          >
            0°
          </button>
          <button
            onClick={() => setAngle(90)}
            style={{
              background: 'none',
              border: 'none',
              color: angle === 90 ? '#38bdf8' : '#9ca3af',
              fontSize: '10px',
              cursor: 'pointer',
              padding: '0 2px',
            }}
            title="Reset to 90°"
          >
            90°
          </button>
          <button
            onClick={() => setSnapAngle((prev) => !prev)}
            style={{
              background: snapAngle ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: snapAngle ? '1px solid #38bdf8' : '1px solid transparent',
              borderRadius: '3px',
              color: snapAngle ? '#38bdf8' : '#6b7280',
              fontSize: '10px',
              cursor: 'pointer',
              padding: '1px 4px',
            }}
            title="Toggle 15° Angle Snapping"
          >
            Snap
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '0 2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close Ruler Guide (Esc)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Rotation Dial Knob (Top Center Floating Handle) */}
      <div
        onPointerDown={handlePointerDownRotate}
        title="Drag to rotate ruler angle"
        style={{
          position: 'absolute',
          top: '-32px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#38bdf8',
          boxShadow: '0 0 14px rgba(56, 189, 248, 0.8)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000000',
        }}
      >
        <RotateCw size={14} />
      </div>

      {/* Resize Length Knob (Right Floating Handle) */}
      <div
        onPointerDown={handlePointerDownResize}
        title="Drag to extend or shrink ruler length"
        style={{
          position: 'absolute',
          top: '50%',
          right: '-14px',
          transform: 'translateY(-50%)',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          cursor: 'ew-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000000',
        }}
      >
        <Maximize2 size={12} />
      </div>
    </div>
  );
}

export const PrecisionRulerOverlay = memo(PrecisionRulerOverlayComponent);
