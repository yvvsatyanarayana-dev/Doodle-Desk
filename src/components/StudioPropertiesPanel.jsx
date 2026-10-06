import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Layers,
  Palette,
  Minimize2,
} from 'lucide-react';

export function StudioPropertiesPanel({
  appState = {},
  onUpdateAppState,
  onAction,
  isOpen = true,
  onToggleOpen,
}) {
  const strokeColors = [
    '#000000',
    '#ffffff',
    '#e03131',
    '#2f9e44',
    '#1971c2',
    '#f08c00',
    '#9c36b5',
    '#868e96',
  ];

  const bgColors = [
    'transparent',
    '#ffffff',
    '#ffc9c9',
    '#b2f2bb',
    '#a5d8ff',
    '#ffec99',
    '#eebefa',
    '#dee2e6',
  ];

  const currentStrokeColor = appState.currentItemStrokeColor || '#000000';
  const currentBgColor = appState.currentItemBackgroundColor || 'transparent';
  const currentFillStyle = appState.currentItemFillStyle || 'hachure';
  const currentStrokeWidth = appState.currentItemStrokeWidth || 1;
  const currentStrokeStyle = appState.currentItemStrokeStyle || 'solid';
  const currentRoughness = appState.currentItemRoughness || 1;
  const currentRoundness = appState.currentItemRoundness || 'round';
  const currentOpacity = appState.currentItemOpacity !== undefined ? appState.currentItemOpacity : 100;

  if (!isOpen) {
    return (
      <button
        className="studio-panel-toggle-btn"
        onClick={onToggleOpen}
        title="Show Studio Inspector"
      >
        <SlidersHorizontal size={16} />
      </button>
    );
  }

  return (
    <aside className="studio-properties-panel">
      {/* Panel Header */}
      <div className="studio-panel-header">
        <div className="studio-panel-title">
          <SlidersHorizontal size={15} />
          <span>Properties</span>
        </div>
        <button
          className="studio-panel-collapse-btn"
          onClick={onToggleOpen}
          title="Collapse Inspector"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="studio-panel-scroll">
        {/* Stroke Color */}
        <div className="studio-panel-section">
          <div className="studio-section-label">Stroke</div>
          <div className="studio-palette-row">
            {strokeColors.map((c) => (
              <button
                key={c}
                className={`studio-color-dot ${currentStrokeColor === c ? 'active' : ''}`}
                style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #444' : 'none' }}
                onClick={() => onUpdateAppState({ currentItemStrokeColor: c })}
                title={c}
              />
            ))}
            <input
              type="color"
              className="studio-color-input"
              value={currentStrokeColor.startsWith('#') ? currentStrokeColor : '#000000'}
              onChange={(e) => onUpdateAppState({ currentItemStrokeColor: e.target.value })}
              title="Custom stroke color"
            />
          </div>
        </div>

        {/* Background / Fill Color */}
        <div className="studio-panel-section">
          <div className="studio-section-label">Background Fill</div>
          <div className="studio-palette-row">
            {bgColors.map((c) => (
              <button
                key={c}
                className={`studio-color-dot ${currentBgColor === c ? 'active' : ''} ${c === 'transparent' ? 'transparent-dot' : ''}`}
                style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}
                onClick={() => onUpdateAppState({ currentItemBackgroundColor: c })}
                title={c === 'transparent' ? 'Transparent' : c}
              />
            ))}
            <input
              type="color"
              className="studio-color-input"
              value={currentBgColor.startsWith('#') ? currentBgColor : '#ffffff'}
              onChange={(e) => onUpdateAppState({ currentItemBackgroundColor: e.target.value })}
              title="Custom background color"
            />
          </div>

          {/* Fill Style */}
          <div className="studio-btn-segmented">
            <button
              className={`studio-segment-btn ${currentFillStyle === 'hachure' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemFillStyle: 'hachure' })}
            >
              Hachure
            </button>
            <button
              className={`studio-segment-btn ${currentFillStyle === 'cross-hatch' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemFillStyle: 'cross-hatch' })}
            >
              Cross
            </button>
            <button
              className={`studio-segment-btn ${currentFillStyle === 'solid' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemFillStyle: 'solid' })}
            >
              Solid
            </button>
          </div>
        </div>

        {/* Stroke Width & Style */}
        <div className="studio-panel-section">
          <div className="studio-section-label">Stroke Width & Style</div>
          <div className="studio-btn-segmented">
            <button
              className={`studio-segment-btn ${currentStrokeWidth === 1 ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemStrokeWidth: 1 })}
            >
              Thin
            </button>
            <button
              className={`studio-segment-btn ${currentStrokeWidth === 2 ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemStrokeWidth: 2 })}
            >
              Medium
            </button>
            <button
              className={`studio-segment-btn ${currentStrokeWidth === 4 ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemStrokeWidth: 4 })}
            >
              Bold
            </button>
          </div>

          <div className="studio-btn-segmented" style={{ marginTop: '8px' }}>
            <button
              className={`studio-segment-btn ${currentStrokeStyle === 'solid' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemStrokeStyle: 'solid' })}
            >
              Solid
            </button>
            <button
              className={`studio-segment-btn ${currentStrokeStyle === 'dashed' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemStrokeStyle: 'dashed' })}
            >
              Dashed
            </button>
            <button
              className={`studio-segment-btn ${currentStrokeStyle === 'dotted' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemStrokeStyle: 'dotted' })}
            >
              Dotted
            </button>
          </div>
        </div>

        {/* Sloppiness & Edges */}
        <div className="studio-panel-section">
          <div className="studio-section-label">Drawing Style</div>
          <div className="studio-btn-segmented">
            <button
              className={`studio-segment-btn ${currentRoughness === 0 ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemRoughness: 0 })}
            >
              Architect
            </button>
            <button
              className={`studio-segment-btn ${currentRoughness === 1 ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemRoughness: 1 })}
            >
              Artist
            </button>
            <button
              className={`studio-segment-btn ${currentRoughness === 2 ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemRoughness: 2 })}
            >
              Cartoonist
            </button>
          </div>

          <div className="studio-btn-segmented" style={{ marginTop: '8px' }}>
            <button
              className={`studio-segment-btn ${currentRoundness === 'sharp' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemRoundness: 'sharp' })}
            >
              Sharp
            </button>
            <button
              className={`studio-segment-btn ${currentRoundness === 'round' ? 'active' : ''}`}
              onClick={() => onUpdateAppState({ currentItemRoundness: 'round' })}
            >
              Rounded
            </button>
          </div>
        </div>

        {/* Opacity Slider */}
        <div className="studio-panel-section">
          <div className="studio-section-row">
            <span className="studio-section-label">Opacity</span>
            <span className="studio-section-val">{currentOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            className="studio-slider"
            value={currentOpacity}
            onChange={(e) => onUpdateAppState({ currentItemOpacity: Number(e.target.value) })}
          />
        </div>

        {/* Layer Actions */}
        <div className="studio-panel-section">
          <div className="studio-section-label">Arrange & Actions</div>
          <div className="studio-action-grid">
            <button
              className="studio-grid-action-btn"
              onClick={() => onAction('duplicate')}
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={14} />
              <span>Duplicate</span>
            </button>
            <button
              className="studio-grid-action-btn delete-btn"
              onClick={() => onAction('delete')}
              title="Delete (Delete)"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
            <button
              className="studio-grid-action-btn"
              onClick={() => onAction('bringToFront')}
              title="Bring to Front"
            >
              <BringToFront size={14} />
              <span>Front</span>
            </button>
            <button
              className="studio-grid-action-btn"
              onClick={() => onAction('sendToBack')}
              title="Send to Back"
            >
              <SendToBack size={14} />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
