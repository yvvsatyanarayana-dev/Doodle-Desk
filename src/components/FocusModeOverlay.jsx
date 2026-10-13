import React, { useState, useEffect, useRef, memo } from 'react';
import { X } from 'lucide-react';
import { getCommonBounds } from '../engine/math/geometry.js';

export const FocusModeOverlay = memo(function FocusModeOverlay({
  isActive,
  onClose,
  doodleAPI,
  canvasAPI,
  theme,
}) {
  const api = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const isLight = theme === 'light' || (!theme && typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');
  const [selectedBounds, setSelectedBounds] = useState(null);
  const [barPosition, setBarPosition] = useState(null);
  const dragOffsetRef = useRef(null);
  const barRef = useRef(null);
  const dragCleanupRef = useRef(null);

  useEffect(() => () => {
    dragCleanupRef.current?.();
  }, []);

  const handleBarPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    dragCleanupRef.current?.();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setBarPosition({ x: rect.left, y: rect.top });

    const pointerId = event.pointerId;
    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId || !dragOffsetRef.current || !barRef.current) return;
      const barRect = barRef.current.getBoundingClientRect();
      setBarPosition({
        x: Math.max(0, Math.min(window.innerWidth - barRect.width, moveEvent.clientX - dragOffsetRef.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - barRect.height, moveEvent.clientY - dragOffsetRef.current.y)),
      });
    };
    const handlePointerUp = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      dragOffsetRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      dragCleanupRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      dragOffsetRef.current = null;
    };
  };

  // Continuously track selected elements' screen coordinates
  useEffect(() => {
    if (!isActive || !api) {
      setSelectedBounds(null);
      return;
    }

    const updateFocusBounds = () => {
      const elements = api.getSceneElements?.() || [];
      const appState = api.getAppState?.() || {};
      const selectedIds = appState.selectedElementIds || {};

      const selectedList = elements.filter((el) => selectedIds[el.id] && !el.isDeleted);
      if (selectedList.length === 0) {
        setSelectedBounds(null);
        return;
      }

      const common = getCommonBounds(selectedList);
      if (!common) {
        setSelectedBounds(null);
        return;
      }

      const canvas = document.querySelector('.doodle-engine-container canvas');
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return;

      const zoom = appState.zoom?.value || 1;
      const scrollX = appState.scrollX || 0;
      const scrollY = appState.scrollY || 0;

      // Transform scene coordinates to screen coordinates
      const screenX = rect.left + scrollX + common.x * zoom;
      const screenY = rect.top + scrollY + common.y * zoom;
      const screenW = common.width * zoom;
      const screenH = common.height * zoom;

      const padding = 20;
      setSelectedBounds({
        x: screenX - padding,
        y: screenY - padding,
        width: screenW + padding * 2,
        height: screenH + padding * 2,
      });
    };

    updateFocusBounds();
    const interval = setInterval(updateFocusBounds, 80);
    window.addEventListener('resize', updateFocusBounds);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateFocusBounds);
    };
  }, [isActive, api]);

  // Keyboard shortcut to exit Focus Mode with Escape
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onClose]);

  if (!isActive) return null;

  return (
    <div
      role="region"
      aria-label="Canvas Focus Mode"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        pointerEvents: 'none', // Allow canvas interactions underneath through the spotlight
        fontFamily: "'Virgil', 'Doodlefont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Movable focus status bar */}
      <div
        ref={barRef}
        onPointerDown={handleBarPointerDown}
        title="Drag to move"
        style={{
          position: 'fixed',
          top: barPosition?.y ?? '64px',
          left: barPosition?.x ?? '50%',
          transform: barPosition ? 'none' : 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '7px 16px',
          background: isLight ? '#ffffff' : '#141417',
          border: isLight ? '1px solid #e4e4e7' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          boxShadow: isLight
            ? '0 8px 24px rgba(0, 0, 0, 0.12)'
            : '0 8px 24px rgba(0, 0, 0, 0.5)',
          color: isLight ? '#18181b' : '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          maxWidth: 'calc(100vw - 16px)',
          cursor: 'move',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            background: isLight ? '#18181b' : '#22c55e',
            boxShadow: isLight ? 'none' : '0 0 8px #22c55e',
            animation: 'pulse 1.8s infinite',
            flexShrink: 0,
          }}
        />
        <span style={{ whiteSpace: 'nowrap' }}>Focus Mode Active</span>
        <span style={{ color: isLight ? '#71717a' : '#a1a1aa', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {selectedBounds ? 'Spotlight on selected items' : 'Select any shape to spotlight'}
        </span>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          style={{
            background: isLight ? '#f4f4f5' : 'rgba(255, 255, 255, 0.1)',
            border: isLight ? '1px solid #e4e4e7' : '1px solid rgba(255, 255, 255, 0.14)',
            color: isLight ? '#18181b' : '#f4f4f5',
            borderRadius: '10px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title="Exit Focus Mode (Esc)"
        >
          <X size={12} />
          Exit
        </button>
      </div>

      {/* SVG Mask Spotlight Vignette */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White background: reveal the darkening overlay */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black cutout: cut a hole for the focused element */}
            {selectedBounds && (
              <rect
                x={selectedBounds.x}
                y={selectedBounds.y}
                width={selectedBounds.width}
                height={selectedBounds.height}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Pure neutral dark backdrop with mask applied */}
        <rect
          width="100%"
          height="100%"
          fill={isLight ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.72)'}
          mask="url(#spotlight-mask)"
        />

        {/* Clean monochrome border around the spotlight cutout */}
        {selectedBounds && (
          <rect
            x={selectedBounds.x}
            y={selectedBounds.y}
            width={selectedBounds.width}
            height={selectedBounds.height}
            fill="none"
            stroke={isLight ? '#18181b' : '#f4f4f5'}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            style={{
              filter: isLight
                ? 'drop-shadow(0 0 8px rgba(24, 24, 27, 0.3))'
                : 'drop-shadow(0 0 8px rgba(244, 244, 245, 0.35))',
            }}
          />
        )}
      </svg>
    </div>
  );
});
export default FocusModeOverlay;
