import React, { useState, useRef, useEffect, memo } from 'react';
import { getElementBounds } from '../engine/math/geometry.js';

/**
 * Freeform Lasso Selection Tool
 * Allows users to draw an arbitrary loop to select all enclosed elements
 */
function isPointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function LassoSelectionOverlayComponent({ isActive, doodleAPI, canvasAPI, onComplete }) {
  const [points, setPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      setIsDrawing(false);
    }
  }, [isActive]);

  const handlePointerDown = (e) => {
    if (!isActive || e.button !== 0) return;
    containerRef.current?.setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    setPoints([[e.clientX, e.clientY]]);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    setPoints((prev) => [...prev, [e.clientX, e.clientY]]);
  };

  const handlePointerUp = (e) => {
    try {
      containerRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}
    const api = doodleAPI || canvasAPI || window.__doodleAPI;
    if (!isDrawing || points.length < 3 || !api) {
      setIsDrawing(false);
      setPoints([]);
      return;
    }

    const appState = api.getAppState();
    const canvas = document.querySelector('.doodle-engine-container canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const zoom = appState.zoom?.value || 1;

    // Convert lasso screen points to scene coordinates
    const scenePoly = points.map(([sx, sy]) => [
      ...(canvasRect && api.canvasToScene
        ? api.canvasToScene(sx - canvasRect.left, sy - canvasRect.top)
        : [(sx - (canvasRect?.left || 0) - (appState.scrollX || 0)) / zoom,
          (sy - (canvasRect?.top || 0) - (appState.scrollY || 0)) / zoom]),
    ]);

    const elements = api.getSceneElements() || [];
    const selectedIds = {};

    elements.forEach((el) => {
      if (el.isDeleted) return;

      const bounds = getElementBounds(el);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;

      // Check center
      if (isPointInPolygon([cx, cy], scenePoly)) {
        selectedIds[el.id] = true;
        return;
      }

      // Check corners
      const corners = [
        [bounds.x, bounds.y],
        [bounds.x + bounds.width, bounds.y],
        [bounds.x + bounds.width, bounds.y + bounds.height],
        [bounds.x, bounds.y + bounds.height],
      ];

      for (const pt of corners) {
        if (isPointInPolygon(pt, scenePoly)) {
          selectedIds[el.id] = true;
          break;
        }
      }
    });

    api.updateScene({
      appState: {
        selectedElementIds: selectedIds,
      },
    });

    setIsDrawing(false);
    setPoints([]);
    onComplete?.();
  };

  if (!isActive) return null;

  const pathData = points.length > 0
    ? `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`
    : '';

  return (
    <div
      ref={containerRef}
      className="lasso-selection-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        top: 38,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99,
        cursor: 'crosshair',
      }}
    >
      <svg
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {points.length > 2 && (
          <path
            d={pathData}
            fill="rgba(255, 255, 255, 0.08)"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}

export const LassoSelectionOverlay = memo(LassoSelectionOverlayComponent);

