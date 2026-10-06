import React from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut, Grid, Eye } from 'lucide-react';

export function StudioBottomBar({
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoomLevel = 1,
  gridEnabled,
  onToggleGrid,
  zenModeEnabled,
  onToggleZen,
}) {
  return (
    <div className="studio-bottom-dock">
      <div className="studio-pill-group">
        <button
          className="studio-icon-btn"
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          className="studio-icon-btn"
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>
        <div className="studio-inner-divider" />
        <button
          className="studio-icon-btn"
          onClick={onZoomOut}
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut size={15} />
        </button>
        <button
          className="studio-zoom-btn"
          onClick={onZoomReset}
          title="Fit to Content (Ctrl+0)"
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          className="studio-icon-btn"
          onClick={onZoomIn}
          title="Zoom In (Ctrl+=)"
        >
          <ZoomIn size={15} />
        </button>
        <div className="studio-inner-divider" />
        <button
          className={`studio-icon-btn ${gridEnabled ? 'active' : ''}`}
          onClick={onToggleGrid}
          title="Toggle Grid (Ctrl+')"
        >
          <Grid size={15} />
        </button>
        <button
          className={`studio-icon-btn ${zenModeEnabled ? 'active' : ''}`}
          onClick={onToggleZen}
          title="Zen Focus Mode (Alt+Z)"
        >
          <Eye size={15} />
        </button>
      </div>
    </div>
  );
}
