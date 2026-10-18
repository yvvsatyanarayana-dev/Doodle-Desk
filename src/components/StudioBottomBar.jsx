import React from 'react';
import { Undo2, Redo2, ZoomIn, ZoomOut, Grid, Eye, Headphones, Timer } from 'lucide-react';

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
  onToggleSoundStudio,
  isSoundStudioOpen,
  isAudioPlaying,
  pomodoroState,
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
        <div className="studio-inner-divider" />
        <button
          className={`studio-icon-btn ${isSoundStudioOpen || isAudioPlaying ? 'active' : ''}`}
          onClick={onToggleSoundStudio}
          title="Focus & Soundscapes (Lofi, Rain, Coffee Shop, Pomodoro)"
          style={{
            position: 'relative',
            color: isAudioPlaying ? '#a855f7' : undefined,
          }}
        >
          <Headphones size={15} />
          {isAudioPlaying && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#a855f7',
                boxShadow: '0 0 6px #a855f7',
              }}
            />
          )}
        </button>
        {pomodoroState?.isRunning && (
          <button
            type="button"
            onClick={onToggleSoundStudio}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Pomodoro Focus Timer"
          >
            <Timer size={11} />
            <span>{pomodoroState.formattedTime}</span>
          </button>
        )}
      </div>
    </div>
  );
}
