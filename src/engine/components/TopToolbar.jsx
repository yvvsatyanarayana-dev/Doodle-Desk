import React, { useRef } from 'react';
import {
  Lock,
  Unlock,
  Hand,
  MousePointer,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image as ImageIcon,
  Eraser,
  Shapes,
} from 'lucide-react';

export function TopToolbar({
  activeTool = 'selection',
  onSelectTool,
  isLocked = false,
  onToggleLock,
  onInsertImage,
  isDrawToShapeActive = false,
}) {
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onInsertImage) {
      onInsertImage(file);
    }
    e.target.value = '';
  };

  const tools = [
    { id: 'lock', isLock: true },
    { id: 'hand', name: 'Hand (panning tool)', keyNum: 'H', icon: <Hand size={17} strokeWidth={1.8} /> },
    { id: 'selection', name: 'Selection', keyNum: '1', icon: <MousePointer size={17} strokeWidth={1.8} /> },
    { id: 'rectangle', name: 'Rectangle', keyNum: '2', icon: <Square size={17} strokeWidth={1.8} /> },
    { id: 'diamond', name: 'Diamond', keyNum: '3', icon: <Diamond size={17} strokeWidth={1.8} /> },
    { id: 'ellipse', name: 'Ellipse', keyNum: '4', icon: <Circle size={17} strokeWidth={1.8} /> },
    { id: 'arrow', name: 'Arrow', keyNum: '5', icon: <ArrowRight size={17} strokeWidth={1.8} /> },
    { id: 'line', name: 'Line', keyNum: '6', icon: <Minus size={17} strokeWidth={1.8} /> },
    { id: 'freedraw', name: 'Draw', keyNum: '7', icon: <Pencil size={17} strokeWidth={1.8} /> },
    { id: 'text', name: 'Text', keyNum: '8', icon: <Type size={17} strokeWidth={1.8} /> },
    { id: 'image', name: 'Insert image', keyNum: '9', isImage: true, icon: <ImageIcon size={17} strokeWidth={1.8} /> },
    { id: 'eraser', name: 'Eraser', keyNum: '0', icon: <Eraser size={17} strokeWidth={1.8} /> },
  ];

  // Signature purple active state
  const activeStyle = {
    background: '#6965db',
    backgroundColor: '#6965db',
    color: '#ffffff',
    boxShadow: '0 0 0 1px rgba(105,101,219,0.4)',
  };

  const baseStyle = {
    position: 'relative',
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: 'none',
    outline: 'none',
    padding: 0,
    background: 'transparent',
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s ease',
  };

  return (
    <div
      className="App-toolbar-container"
      style={{
        position: 'absolute',
        top: '10px',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 100,
        userSelect: 'none',
      }}
    >
      {/* Top Capsule Toolbar */}
      <div
        className="Island App-toolbar"
        style={{
          pointerEvents: 'auto',
          borderRadius: '12px',
          padding: '3px 4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          className="App-toolbar-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {tools.map((t) => {
            if (t.isLock) {
              return (
                <button
                  key="lock"
                  type="button"
                  className={`ToolIcon ToolIcon_type_button ${isLocked ? 'active' : ''}`}
                  onClick={onToggleLock}
                  title={isLocked ? 'Keep selected tool active (Locked)' : 'Lock tool (Unlocked)'}
                  aria-label="Lock tool"
                  style={{
                    ...baseStyle,
                    ...(isLocked ? { background: '#6965db', backgroundColor: '#6965db', color: '#ffffff' } : {}),
                    marginRight: '2px',
                  }}
                >
                  <div className="ToolIcon__icon">
                    {isLocked ? <Lock size={15} strokeWidth={2} /> : <Unlock size={15} strokeWidth={2} />}
                  </div>
                </button>
              );
            }

            if (t.isImage) {
              const isActive = activeTool === 'image';
              return (
                <React.Fragment key={t.id}>
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${isActive ? 'active' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    title={`${t.name} — ${t.keyNum}`}
                    aria-label={t.name}
                    aria-checked={isActive}
                    style={{ ...baseStyle, ...(isActive ? activeStyle : {}) }}
                  >
                    <div className="ToolIcon__icon">
                      {t.icon}
                    </div>
                    {t.keyNum && (
                      <span
                        className="ToolIcon__keybinding"
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '4px',
                          fontSize: '9px',
                          lineHeight: 1,
                          opacity: 0.5,
                          fontWeight: 500,
                        }}
                      >
                        {t.keyNum}
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </React.Fragment>
              );
            }

            const isActive = !isDrawToShapeActive && activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTool(t.id)}
                onDoubleClick={() => {
                  onSelectTool(t.id);
                  if (!isLocked) onToggleLock?.();
                }}
                title={`${t.name} — ${t.keyNum || t.id} (Double click to lock)`}
                aria-label={t.name}
                aria-checked={isActive}
                style={{ ...baseStyle, ...(isActive ? activeStyle : {}) }}
              >
                <div className="ToolIcon__icon">
                  {t.icon}
                </div>
                {t.keyNum && (
                  <span
                    className="ToolIcon__keybinding"
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '4px',
                      fontSize: '9px',
                      lineHeight: 1,
                      opacity: 0.5,
                      fontWeight: 500,
                    }}
                  >
                    {t.keyNum}
                  </span>
                )}
              </button>
            );
          })}

          <div
            style={{
              width: '1px',
              height: '18px',
              background: 'rgba(255, 255, 255, 0.12)',
              margin: '0 4px',
            }}
          />

          {/* Extra tools trigger button */}
          <button
            type="button"
            className={`ToolIcon ToolIcon_type_button App-toolbar__extra-tools-trigger ${activeTool === 'laser' || isDrawToShapeActive ? 'active' : ''}`}
            data-collab-laser-launcher="true"
            title={isDrawToShapeActive ? 'Draw to shape mode active (Shift+X) — click another tool to exit' : 'Extra Tools & Shapes'}
            aria-label={isDrawToShapeActive ? 'Draw to shape active' : 'Extra Tools'}
            style={{
              ...baseStyle,
              ...(activeTool === 'laser' || isDrawToShapeActive ? activeStyle : {}),
            }}
          >
            <div className="ToolIcon__icon">
              {isDrawToShapeActive ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="6" />
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                </svg>
              ) : (
                <Shapes size={17} strokeWidth={1.8} />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Subtle Hint Text directly under toolbar */}
      <div
        className="canvas-pan-hint"
        style={{
          textAlign: 'center',
          fontSize: '11px',
          marginTop: '6px',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '0.01em',
        }}
      >
        To move canvas, hold mouse wheel or spacebar while dragging, or use the hand tool
      </div>
    </div>
  );
}
