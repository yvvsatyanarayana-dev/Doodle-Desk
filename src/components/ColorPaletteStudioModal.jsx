import React, { useState, memo } from 'react';
import { X, Palette, Check, Sparkles, Pipette, Sliders, RotateCcw } from 'lucide-react';

const CURATED_PALETTES = [
  {
    id: 'obsidian-luxe',
    name: 'Obsidian Gold & Luxe',
    description: 'Sophisticated deep noir with rich gold and warm champagne accents',
    canvasBg: '#121214',
    stroke: '#eab308',
    bg: '#1c1917',
    colors: ['#eab308', '#fef08a', '#ca8a04', '#1c1917', '#d4d4d8', '#78716c'],
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    description: 'Electric cyan, neon rose, and vivid synthwave purples',
    canvasBg: '#090d16',
    stroke: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    colors: ['#06b6d4', '#f43f5e', '#a855f7', '#10b981', '#facc15', '#38bdf8'],
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Arctic Frost',
    description: 'Subtle cool blues, ice teals, and arctic polar snow',
    canvasBg: '#1e232a',
    stroke: '#88c0d0',
    bg: 'rgba(136, 192, 208, 0.15)',
    colors: ['#88c0d0', '#81a1c1', '#5e81ac', '#eceff4', '#d8dee9', '#bf616a'],
  },
  {
    id: 'dracula-night',
    name: 'Dracula Midnight',
    description: 'Classic hacker theme with vivid neon violet, pink, and lime green',
    canvasBg: '#181a20',
    stroke: '#bd93f9',
    bg: 'rgba(189, 147, 249, 0.15)',
    colors: ['#bd93f9', '#ff79c6', '#50fa7b', '#ffb86c', '#8be9fd', '#f1fa8c'],
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Rainforest',
    description: 'Natural organic forest greens, fresh mint, and moss tones',
    canvasBg: '#0b1612',
    stroke: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    colors: ['#10b981', '#059669', '#34d399', '#a7f3d0', '#047857', '#064e3b'],
  },
  {
    id: 'sunset-terracotta',
    name: 'Warm Sunset & Earth',
    description: 'Sunburst amber, warm terracotta, and fiery dusk gradients',
    canvasBg: '#1a1412',
    stroke: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.15)',
    colors: ['#ea580c', '#d97706', '#f97316', '#fed7aa', '#dc2626', '#7c2d12'],
  },
  {
    id: 'studio-mono',
    name: 'Obsidian Minimalist Monochrome',
    description: 'Ultra-clean architectural black, charcoal, and crisp white',
    canvasBg: '#0e0e10',
    stroke: '#ffffff',
    bg: '#18181b',
    colors: ['#ffffff', '#e4e4e7', '#a1a1aa', '#52525b', '#27272a', '#000000'],
  },
];

function ColorPaletteStudioModalComponent({ isOpen, onClose, doodleAPI, canvasAPI }) {
  doodleAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const [selectedPalette, setSelectedPalette] = useState(CURATED_PALETTES[0]);
  const [customStroke, setCustomStroke] = useState('#eab308');
  const [customBg, setCustomBg] = useState('#1c1917');

  if (!isOpen) return null;

  // Apply to currently selected shapes on the canvas
  const handleApplyToSelected = () => {
    if (!doodleAPI) return;

    const elements = doodleAPI.getSceneElements?.() || [];
    const appState = doodleAPI.getAppState?.() || {};
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      (id) => appState.selectedElementIds[id]
    );

    if (selectedIds.length === 0) {
      // Nothing selected -> set as active tool colors instead
      handleSetActiveToolColors();
      onClose();
      return;
    }

    const updated = elements.map((el) => {
      if (selectedIds.includes(el.id)) {
        return {
          ...el,
          strokeColor: selectedPalette.stroke,
          backgroundColor: selectedPalette.bg,
          version: (el.version || 1) + 1,
          versionNonce: Math.floor(Math.random() * 100000),
        };
      }
      return el;
    });

    doodleAPI.updateScene({
      elements: updated,
      appState: {
        currentItemStrokeColor: selectedPalette.stroke,
        currentItemBackgroundColor: selectedPalette.bg,
      },
      commitToHistory: true,
    });
    onClose();
  };

  // Set as active draw colors for newly created elements
  const handleSetActiveToolColors = () => {
    if (!doodleAPI) return;

    doodleAPI.updateScene({
      appState: {
        currentItemStrokeColor: selectedPalette.stroke,
        currentItemBackgroundColor: selectedPalette.bg,
      },
    });
    onClose();
  };

  // Set canvas background
  const handleApplyCanvasBg = () => {
    if (!doodleAPI) return;

    doodleAPI.updateScene({
      appState: {
        viewBackgroundColor: selectedPalette.canvasBg,
      },
    });
  };

  // Reset all colors: Canvas backdrop, active drawing tool colors, and any selected shapes back to native defaults
  const handleResetAllColors = () => {
    if (!doodleAPI) return;

    const appState = doodleAPI.getAppState?.() || {};
    const isDark = appState.theme === 'dark';
    const defaultStroke = isDark ? '#ffffff' : '#1e1e1e';
    const defaultBg = 'transparent';
    const defaultCanvasBg = isDark ? '#121212' : '#ffffff';

    const elements = doodleAPI.getSceneElements?.() || [];
    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(
      (id) => appState.selectedElementIds[id]
    );

    let updatedElements = elements;
    if (selectedIds.length > 0) {
      updatedElements = elements.map((el) => {
        if (selectedIds.includes(el.id)) {
          return {
            ...el,
            strokeColor: defaultStroke,
            backgroundColor: defaultBg,
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 100000),
          };
        }
        return el;
      });
    }

    doodleAPI.updateScene({
      ...(selectedIds.length > 0 ? { elements: updatedElements } : {}),
      appState: {
        viewBackgroundColor: defaultCanvasBg,
        currentItemStrokeColor: defaultStroke,
        currentItemBackgroundColor: defaultBg,
      },
      commitToHistory: true,
    });

    setSelectedPalette(CURATED_PALETTES[0]);
    onClose();
  };

  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container color-palette-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '740px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          background: isLight ? '#ffffff' : '#121214',
          borderRadius: '16px',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: isLight ? '0 24px 60px rgba(0, 0, 0, 0.15)' : '0 24px 60px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#eab308',
              }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: isLight ? '#0f172a' : '#f3f4f6' }}>
                Curated Color Palette Studio
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: isLight ? '#64748b' : '#9ca3af' }}>
                Harmonious themes for diagram styling, shape strokes, and canvas backdrops
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="color-palette-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600 }}>
            Choose Color Harmony
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {CURATED_PALETTES.map((pal) => {
              const isSelected = selectedPalette.id === pal.id;
              return (
                <div
                  key={pal.id}
                  onClick={() => setSelectedPalette(pal)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: isSelected
                      ? (isLight ? '#eff6ff' : 'rgba(255, 255, 255, 0.08)')
                      : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                    border: isSelected
                      ? (isLight ? '1.5px solid #4f46e5' : '1.5px solid #ffffff')
                      : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'),
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 15px rgba(0, 0, 0, 0.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? (isLight ? '#4f46e5' : '#ffffff') : (isLight ? '#1e293b' : '#d1d5db') }}>
                      {pal.name}
                    </span>
                    {isSelected && <Check size={14} style={{ color: isLight ? '#4f46e5' : '#ffffff' }} />}
                  </div>

                  {/* Swatches strip */}
                  <div style={{ display: 'flex', height: '18px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                    {pal.colors.map((c, i) => (
                      <div key={i} style={{ flex: 1, background: c }} />
                    ))}
                  </div>

                  <p style={{ margin: 0, fontSize: '11px', color: isLight ? '#64748b' : '#9ca3af', lineHeight: 1.3 }}>
                    {pal.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick Preview & Canvas Backdrop Control */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: isLight ? '#f8fafc' : '#0d0d10',
              borderRadius: '8px',
              border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: isLight ? '#64748b' : '#9ca3af' }}>Active Palette:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: isLight ? '#0f172a' : '#f3f4f6', fontWeight: 600 }}>{selectedPalette.name}</span>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedPalette.stroke }} />
              </div>
            </div>

            <button
              onClick={handleApplyCanvasBg}
              style={{
                padding: '6px 12px',
                background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: isLight ? '#1e293b' : '#e5e7eb',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Set Canvas Backdrop ({selectedPalette.canvasBg})
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="color-palette-modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '14px 20px',
            background: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.25)',
            borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleResetAllColors}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Reset canvas background, tool colors, and selected shapes to default"
          >
            <RotateCcw size={15} />
            <span>Reset All Colors</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#d1d5db',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSetActiveToolColors}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Set as Default Drawing Colors
            </button>
            <button
              onClick={handleApplyToSelected}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                background: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                color: '#000000',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)',
              }}
            >
              <Check size={16} />
              <span>Apply to Selected Shapes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ColorPaletteStudioModal = memo(ColorPaletteStudioModalComponent);
