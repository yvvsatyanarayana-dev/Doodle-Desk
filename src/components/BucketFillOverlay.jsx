import React, { useState, memo } from 'react';
import { hitTestElement } from '../engine/hitTest.js';
import { ELEMENT_TYPES } from '../engine/elements.js';
import { toLocalPoint, isPointInRect, polygonContainsPoint, getElementBounds } from '../engine/math/geometry.js';

/**
 * Checks if a point is inside the bounding interior or border of an element,
 * even if the element currently has a transparent background.
 */
function hitTestElementForBucket(el, px, py) {
  if (el.isDeleted) return false;
  const [lx, ly] = toLocalPoint(px, py, el);
  const { x, y, width: w, height: h } = el;

  // Rectangles / Frames: test full rectangular area
  if (el.type === ELEMENT_TYPES.RECTANGLE || el.type === 'rectangle' || el.type === ELEMENT_TYPES.FRAME || el.type === 'frame') {
    return isPointInRect(lx, ly, x, y, w, h, 8);
  }

  // Ellipse: test interior area
  if (el.type === ELEMENT_TYPES.ELLIPSE || el.type === 'ellipse') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = Math.max(1, Math.abs(w) / 2);
    const ry = Math.max(1, Math.abs(h) / 2);
    const ex = (lx - cx) / rx;
    const ey = (ly - cy) / ry;
    return (ex * ex + ey * ey) <= 1.08;
  }

  // Diamond: test interior polygon
  if (el.type === ELEMENT_TYPES.DIAMOND || el.type === 'diamond') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const corners = [[cx, y], [x + w, cy], [cx, y + h], [x, cy]];
    return polygonContainsPoint(corners, lx, ly) || hitTestElement(el, px, py);
  }

  // Freedraw stroke: test bounds or stroke
  if (el.type === ELEMENT_TYPES.FREEDRAW || el.type === 'freedraw') {
    const b = getElementBounds(el);
    return isPointInRect(px, py, b.x, b.y, b.width, b.height, 10) || hitTestElement(el, px, py);
  }

  // Default to standard hit test
  return hitTestElement(el, px, py);
}

/**
 * Bucket Fill Tool
 * Flood-fills clicked shapes with the currently active background color
 */
function BucketFillOverlayComponent({ isActive, doodleAPI, canvasAPI }) {
  const [ripple, setRipple] = useState(null);

  if (!isActive) return null;

  const handleClick = (e) => {
    const api = doodleAPI || canvasAPI || window.__doodleAPI;
    if (!api) return;

    const appState = api.getAppState?.() || {};
    const canvas = document.querySelector('.doodle-engine-container canvas') || document.querySelector('canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const zoom = appState.zoom?.value || (typeof appState.zoom === 'number' ? appState.zoom : 1);

    const clientX = e.clientX;
    const clientY = e.clientY;
    const canvasX = clientX - (canvasRect?.left || 0);
    const canvasY = clientY - (canvasRect?.top || 0);

    const scenePoint = canvasRect && api.canvasToScene
      ? api.canvasToScene(canvasX, canvasY)
      : [
        (canvasX - (appState.scrollX || 0)) / zoom,
        (canvasY - (appState.scrollY || 0)) / zoom,
      ];

    const elements = api.getSceneElements?.() || [];
    const targetElement = [...elements].reverse().find((element) =>
      !element.isDeleted && hitTestElementForBucket(element, scenePoint[0], scenePoint[1])
    );

    if (targetElement) {
      // Determine new background fill color
      let fillColor = appState.currentItemBackgroundColor;
      if (!fillColor || fillColor === 'transparent') {
        fillColor = appState.currentItemStrokeColor || '#6965db';
      }

      const updatedElements = elements.map((el) => {
        if (el.id === targetElement.id) {
          return {
            ...el,
            backgroundColor: fillColor,
            fillStyle: el.fillStyle && el.fillStyle !== 'none' && el.fillStyle !== 'transparent' ? el.fillStyle : 'solid',
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 100000),
          };
        }
        return el;
      });

      api.updateScene({
        elements: updatedElements,
        appState: {
          selectedElementIds: { [targetElement.id]: true },
        },
        commitToHistory: true,
      });

      // Show splash ripple effect
      setRipple({ x: clientX, y: clientY, color: fillColor });
      setTimeout(() => setRipple(null), 450);
    }
  };

  return (
    <div
      className="bucket-fill-overlay"
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 38,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99,
        cursor: 'cell',
      }}
    >
      {ripple && (
        <div
          style={{
            position: 'absolute',
            left: ripple.x - 20,
            top: ripple.y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `3px solid ${ripple.color || '#6965db'}`,
            backgroundColor: ripple.color ? `${ripple.color}33` : 'rgba(105, 101, 219, 0.2)',
            animation: 'scaleIn 0.35s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

export const BucketFillOverlay = memo(BucketFillOverlayComponent);
