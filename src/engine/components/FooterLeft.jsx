import React from 'react';
import { Minus, Plus, Undo2, Redo2 } from 'lucide-react';

export function FooterLeft({
  zoomLevel = 1,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
}) {
  return (
    <div className="layer-ui__wrapper__footer-left">
      <div className="Stack">
        {/* Zoom Actions Pill */}
        <div className="zoom-actions">
          <button
            type="button"
            className="ToolIcon ToolIcon_type_button zoom-out-button"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl+-)"
            aria-label="Zoom Out"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="zoom-button"
            onClick={onZoomReset}
            title="Reset Zoom to 100% (Ctrl+0)"
            aria-label="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            className="ToolIcon ToolIcon_type_button zoom-in-button"
            onClick={onZoomIn}
            title="Zoom In (Ctrl+=)"
            aria-label="Zoom In"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Undo / Redo Pill */}
        <div className="undo-redo-buttons">
          <div className="undo-button-container">
            <button
              type="button"
              className="ToolIcon ToolIcon_type_button"
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={15} />
            </button>
          </div>
          <div className="redo-button-container">
            <button
              type="button"
              className="ToolIcon ToolIcon_type_button"
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
