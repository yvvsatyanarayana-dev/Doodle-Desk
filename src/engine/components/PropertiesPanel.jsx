import React from 'react';
import {
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pipette,
  Palette,
} from 'lucide-react';

const STROKE_COLORS = [
  '#1e1e1e',
  '#e03131',
  '#2f9e44',
  '#1971c2',
  '#f08c00',
  '#9c36b5',
  '#ffffff',
];

const BG_COLORS = [
  'transparent',
  '#ffc9c9',
  '#b2f2bb',
  '#a5d8ff',
  '#ffec99',
  '#eebefa',
  '#ffffff',
];

export function PropertiesPanel({
  selectedElements = [],
  appState = {},
  onUpdateProperty,
  onAction,
  onOpenColorPalette,
}) {
  // If no elements are selected and active tool is not a shape/text tool, don't show
  const activeTool = appState.activeTool?.type || 'selection';
  const isCreationMode = ['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text', 'frame', 'embeddable'].includes(activeTool);
  const hasSelection = selectedElements.length > 0;

  if (!hasSelection && !isCreationMode) {
    return null;
  }

  // Determine current active values (either from primary selected element or current appState defaults)
  const primaryEl = selectedElements[0] || {};
  const isText = hasSelection ? selectedElements.some((e) => e.type === 'text') : activeTool === 'text';

  const strokeColor = primaryEl.strokeColor ?? appState.currentItemStrokeColor ?? '#1e1e1e';
  const bgColor = primaryEl.backgroundColor ?? appState.currentItemBackgroundColor ?? 'transparent';
  const fillStyle = primaryEl.fillStyle ?? appState.currentItemFillStyle ?? 'hachure';
  const strokeWidth = primaryEl.strokeWidth ?? appState.currentItemStrokeWidth ?? 2;
  const strokeStyle = primaryEl.strokeStyle ?? appState.currentItemStrokeStyle ?? 'solid';
  const roughness = primaryEl.roughness ?? appState.currentItemRoughness ?? 1;
  const roundness = hasSelection && Object.prototype.hasOwnProperty.call(primaryEl, 'roundness')
    ? primaryEl.roundness
    : (Object.prototype.hasOwnProperty.call(appState, 'currentItemRoundness')
      ? appState.currentItemRoundness
      : 'round');
  const hasRoundedEdges = roundness !== null && roundness !== false && roundness !== 'sharp';
  const opacity = primaryEl.opacity ?? appState.currentItemOpacity ?? 100;

  const fontSize = primaryEl.fontSize ?? appState.currentItemFontSize ?? 20;
  const fontFamily = primaryEl.fontFamily ?? appState.currentItemFontFamily ?? 5;
  const textAlign = primaryEl.textAlign ?? appState.currentItemTextAlign ?? 'left';

  return (
    <div className="App-menu__left-wrapper">
      <div className="Island App-menu__left">
        <div className="panelColumn">
          {/* Stroke Color */}
          <div>
            <div className="control-label">Stroke</div>
            <div className="color-picker" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              {STROKE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-picker-swatch ${strokeColor === c ? 'active' : ''}`}
                  style={{
                    backgroundColor: c,
                    border: c === '#ffffff' ? '1px solid #d4d4d8' : '1px solid rgba(128, 128, 128, 0.25)',
                  }}
                  onClick={() => onUpdateProperty('strokeColor', c)}
                  title={`Stroke: ${c}`}
                  aria-label={`Stroke color ${c}`}
                />
              ))}

              {/* Custom Stroke Color Picker */}
              <label
                className={`color-picker-swatch color-picker-custom-swatch ${!STROKE_COLORS.includes(strokeColor) ? 'active' : ''}`}
                style={{
                  position: 'relative',
                  backgroundColor: strokeColor.startsWith('#') && strokeColor.length === 7 ? strokeColor : '#1e1e1e',
                  border: '1px solid rgba(128, 128, 128, 0.35)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={`Custom Stroke Color (${strokeColor})`}
              >
                <input
                  type="color"
                  value={strokeColor.startsWith('#') && strokeColor.length === 7 ? strokeColor : '#1e1e1e'}
                  onChange={(e) => onUpdateProperty('strokeColor', e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 }}
                  aria-label="Custom stroke color"
                />
                <Pipette size={11} style={{ color: strokeColor === '#ffffff' ? '#18181b' : '#ffffff', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))', pointerEvents: 'none' }} />
              </label>
            </div>
          </div>

          {/* Background Fill Color (for shapes) */}
          {!isText && (
            <div>
              <div className="control-label">Background</div>
              <div className="color-picker" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-picker-swatch ${bgColor === c ? 'active' : ''}`}
                    style={{
                      backgroundColor: c === 'transparent' ? 'transparent' : c,
                      border: (c === '#ffffff' || c === 'transparent') ? '1px solid #d4d4d8' : '1px solid rgba(128, 128, 128, 0.25)',
                      backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #777 25%, transparent 25%), linear-gradient(-45deg, #777 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #777 75%), linear-gradient(-45deg, transparent 75%, #777 75%)' : undefined,
                      backgroundSize: c === 'transparent' ? '6px 6px' : undefined,
                      backgroundPosition: c === 'transparent' ? '0 0, 0 3px, 3px -3px, -3px 0px' : undefined,
                    }}
                    onClick={() => onUpdateProperty('backgroundColor', c)}
                    title={c === 'transparent' ? 'Transparent' : `Background: ${c}`}
                    aria-label={`Background color ${c}`}
                  />
                ))}

                {/* Custom Background Color Picker */}
                <label
                  className={`color-picker-swatch color-picker-custom-swatch ${!BG_COLORS.includes(bgColor) && bgColor !== 'transparent' ? 'active' : ''}`}
                  style={{
                    position: 'relative',
                    backgroundColor: bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#ffffff',
                    border: '1px solid rgba(128, 128, 128, 0.35)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={`Custom Background Color (${bgColor})`}
                >
                  <input
                    type="color"
                    value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#ffffff'}
                    onChange={(e) => onUpdateProperty('backgroundColor', e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 }}
                    aria-label="Custom background color"
                  />
                  <Pipette size={11} style={{ color: bgColor === '#ffffff' ? '#18181b' : '#ffffff', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))', pointerEvents: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* Fill Style (for shapes) - SVG Icons */}
          {!isText && (
            <div>
              <div className="control-label">Fill</div>
              <div className="buttonList">
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'hachure' ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('fillStyle', 'hachure')}
                  title="Hachure"
                  aria-label="Hachure fill"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                    <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.4" />
                    <line x1="4.5" y1="10" x2="10" y2="4.5" strokeWidth="1.4" />
                    <line x1="10" y1="15.5" x2="15.5" y2="10" strokeWidth="1.4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'cross-hatch' ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('fillStyle', 'cross-hatch')}
                  title="Cross-hatch"
                  aria-label="Cross-hatch fill"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                    <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.3" />
                    <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" strokeWidth="1.3" />
                    <line x1="4.5" y1="10" x2="10" y2="4.5" strokeWidth="1.3" />
                    <line x1="10" y1="15.5" x2="15.5" y2="10" strokeWidth="1.3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'solid' ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('fillStyle', 'solid')}
                  title="Solid"
                  aria-label="Solid fill"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Stroke Width - SVG Bar Icons */}
          <div>
            <div className="control-label">Stroke width</div>
            <div className="buttonList">
              <button
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 1 ? 'active' : ''}`}
                onClick={() => onUpdateProperty('strokeWidth', 1)}
                title="Thin (1)"
                aria-label="Thin stroke"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" />
                </svg>
              </button>
              <button
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 2 ? 'active' : ''}`}
                onClick={() => onUpdateProperty('strokeWidth', 2)}
                title="Bold (2)"
                aria-label="Bold stroke"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="2" y="8.5" width="16" height="3" rx="1.5" />
                </svg>
              </button>
              <button
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 3 ? 'active' : ''}`}
                onClick={() => onUpdateProperty('strokeWidth', 3)}
                title="Extra bold (3)"
                aria-label="Extra bold stroke"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <rect x="2" y="7.5" width="16" height="5" rx="2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stroke Style - SVG Line Icons */}
          {!isText && (
            <div>
              <div className="control-label">Stroke style</div>
              <div className="buttonList">
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'solid' ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('strokeStyle', 'solid')}
                  title="Solid"
                  aria-label="Solid stroke style"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'dashed' ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('strokeStyle', 'dashed')}
                  title="Dashed"
                  aria-label="Dashed stroke style"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeDasharray="3.5 2.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'dotted' ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('strokeStyle', 'dotted')}
                  title="Dotted"
                  aria-label="Dotted stroke style"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeDasharray="1 3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Sloppiness / Roughness - SVG Curve Icons */}
          {!isText && (
            <div>
              <div className="control-label">Sloppiness</div>
              <div className="buttonList">
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${roughness === 0 ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('roughness', 0)}
                  title="Architect (Straight)"
                  aria-label="Architect sloppiness"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <line x1="2" y1="10" x2="18" y2="10" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${roughness === 1 ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('roughness', 1)}
                  title="Artist (Hand-drawn)"
                  aria-label="Artist sloppiness"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <path d="M 2 11 Q 7 8 11 11 T 18 9" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${roughness === 2 ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('roughness', 2)}
                  title="Cartoon (Doodle)"
                  aria-label="Cartoon sloppiness"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <path d="M 2 12 Q 6 6 10 12 T 18 8" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M 3 10 Q 7 13 11 8 T 17 11" strokeWidth="1.1" opacity="0.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Edges / Roundness - SVG Corner Icons */}
          {!isText && (
            <div>
              <div className="control-label">Edges</div>
              <div className="buttonList">
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${(!roundness || roundness === 'sharp') ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('roundness', 'sharp')}
                  title="Sharp edges"
                  aria-label="Sharp edges"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <path d="M 5 16 L 5 5 L 16 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${hasRoundedEdges ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('roundness', 'round')}
                  title="Round edges"
                  aria-label="Round edges"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                    <path d="M 5 16 L 5 9 Q 5 5 9 5 L 16 5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Text Properties */}
          {isText && (
            <>
              <div>
                <div className="control-label">Font family</div>
                <div className="buttonList">
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${fontFamily === 5 || fontFamily === 3 ? 'active' : ''}`}
                    onClick={() => onUpdateProperty('fontFamily', 5)}
                    title="Hand-drawn (Doodle)"
                    aria-label="Doodle font"
                    style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'cursive' }}
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${fontFamily === 1 || fontFamily === 6 ? 'active' : ''}`}
                    onClick={() => onUpdateProperty('fontFamily', 1)}
                    title="Normal (Sans)"
                    aria-label="Normal font"
                    style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif' }}
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${fontFamily === 2 ? 'active' : ''}`}
                    onClick={() => onUpdateProperty('fontFamily', 2)}
                    title="Code (Monospace)"
                    aria-label="Code font"
                    style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}
                  >
                    Aa
                  </button>
                </div>
              </div>

              <div>
                <div className="control-label">Font size</div>
                <div className="buttonList">
                  {[
                    { size: 16, label: 'S' },
                    { size: 20, label: 'M' },
                    { size: 28, label: 'L' },
                    { size: 36, label: 'XL' },
                  ].map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fontSize === s.size ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fontSize', s.size)}
                      title={`Size ${s.label}`}
                      aria-label={`Size ${s.label}`}
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="control-label">Text align</div>
                <div className="buttonList">
                  {[
                    { id: 'left', icon: <AlignLeft size={16} />, title: 'Align Left' },
                    { id: 'center', icon: <AlignCenter size={16} />, title: 'Align Center' },
                    { id: 'right', icon: <AlignRight size={16} />, title: 'Align Right' },
                  ].map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${textAlign === a.id ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('textAlign', a.id)}
                      title={a.title}
                      aria-label={a.title}
                    >
                      {a.icon}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Opacity Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="control-label" style={{ margin: 0 }}>Opacity</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{opacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={opacity}
              onChange={(e) => onUpdateProperty('opacity', Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#6965db',
                cursor: 'pointer',
                height: '4px',
              }}
              aria-label="Shape opacity"
            />
          </div>

          {/* Actions for Selected Elements */}
          {hasSelection && (
            <div>
              <div className="control-label">Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  className="property-action-button"
                  onClick={() => onAction('duplicate')}
                  title="Duplicate (Ctrl+D)"
                  aria-label="Duplicate"
                >
                  <Copy size={13} />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  className="property-action-button property-action-delete"
                  onClick={() => onAction('delete')}
                  title="Delete (Delete)"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  className="property-action-button"
                  onClick={() => onAction('bringToFront')}
                  title="Bring to Front"
                  aria-label="Bring to Front"
                >
                  <BringToFront size={13} />
                  <span>Front</span>
                </button>
                <button
                  type="button"
                  className="property-action-button"
                  onClick={() => onAction('sendToBack')}
                  title="Send to Back"
                  aria-label="Send to Back"
                >
                  <SendToBack size={13} />
                  <span>Back</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
