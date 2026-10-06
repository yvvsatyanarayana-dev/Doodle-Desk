import React, { useEffect } from 'react';

export function HelpModal({ isOpen, onClose, theme = 'dark' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDark = theme === 'dark' || (theme !== 'light' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toolsShortcuts = [
    { label: 'Hand (panning tool)', shortcut: <kbd className="doodle-help-kbd">H</kbd> },
    {
      label: 'Selection',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">V</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">1</kbd>
        </>
      ),
    },
    {
      label: 'Rectangle',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">R</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">2</kbd>
        </>
      ),
    },
    {
      label: 'Diamond',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">D</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">3</kbd>
        </>
      ),
    },
    {
      label: 'Ellipse',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">O</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">4</kbd>
        </>
      ),
    },
    {
      label: 'Arrow',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">A</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">5</kbd>
        </>
      ),
    },
    {
      label: 'Line',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">L</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">6</kbd>
        </>
      ),
    },
    {
      label: 'Draw',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">P</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">7</kbd>
        </>
      ),
    },
    {
      label: 'Text',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">T</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">8</kbd>
        </>
      ),
    },
    { label: 'Insert image', shortcut: <kbd className="doodle-help-kbd">9</kbd> },
    {
      label: 'Eraser',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">E</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">0</kbd>
        </>
      ),
    },
    { label: 'Frame tool', shortcut: <kbd className="doodle-help-kbd">F</kbd> },
    { label: 'Laser pointer', shortcut: <kbd className="doodle-help-kbd">K</kbd> },
    {
      label: 'Pick color from canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">I</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">S</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">G</kbd>
        </>
      ),
    },
    {
      label: 'Edit line/arrow points',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Enter</kbd>
        </>
      ),
    },
  ];

  const editorShortcuts = [
    {
      label: 'Create a flowchart from a generic element',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Arrow Key</kbd>
        </>
      ),
    },
    {
      label: 'Navigate a flowchart',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Alt</kbd> <kbd className="doodle-help-kbd">Arrow Key</kbd>
        </>
      ),
    },
    {
      label: 'Move canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Space</kbd> <span className="doodle-help-connector">drag</span>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">Wheel</kbd> <span className="doodle-help-connector">drag</span>
        </>
      ),
    },
    {
      label: 'Reset the canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Delete</kbd>
        </>
      ),
    },
    { label: 'Delete', shortcut: <kbd className="doodle-help-kbd">Delete</kbd> },
    {
      label: 'Cut',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">X</kbd>
        </>
      ),
    },
    {
      label: 'Copy',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">C</kbd>
        </>
      ),
    },
    {
      label: 'Paste',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">V</kbd>
        </>
      ),
    },
    {
      label: 'Paste as plaintext',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">V</kbd>
        </>
      ),
    },
    {
      label: 'Select all',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">A</kbd>
        </>
      ),
    },
    {
      label: 'Add element to selection',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Shift</kbd> <span className="doodle-help-connector">click</span>
        </>
      ),
    },
    {
      label: 'Deep select',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <span className="doodle-help-connector">click</span>
        </>
      ),
    },
    {
      label: 'Deep select within box, and prevent dragging',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <span className="doodle-help-connector">drag</span>
        </>
      ),
    },
    {
      label: 'Copy to clipboard as PNG',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">Alt</kbd> <kbd className="doodle-help-kbd">C</kbd>
        </>
      ),
    },
    {
      label: 'Copy styles',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Alt</kbd> <kbd className="doodle-help-kbd">C</kbd>
        </>
      ),
    },
  ];

  return (
    <div
      className="doodle-help-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Modal Dialog Card */}
      <div
        className="doodle-help-window"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '890px',
          width: '92vw',
          maxHeight: '90vh',
          background: isDark ? '#141416' : '#ffffff',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e4e4e7',
          borderRadius: '14px',
          boxShadow: isDark ? '0 24px 64px rgba(0, 0, 0, 0.85)' : '0 20px 48px rgba(0, 0, 0, 0.15)',
          padding: '22px 26px 22px 26px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          color: isDark ? '#f4f4f5' : '#18181b',
        }}
      >
        {/* Header Row: Title & Esc to close Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#18181b',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Help
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            style={{
              background: isDark ? '#222226' : '#f4f4f5',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 500,
              color: isDark ? '#a1a1aa' : '#71717a',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#2a2a30' : '#e4e4e7';
              e.currentTarget.style.color = isDark ? '#ffffff' : '#18181b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? '#222226' : '#f4f4f5';
              e.currentTarget.style.color = isDark ? '#a1a1aa' : '#71717a';
            }}
          >
            Esc to close
          </button>
        </div>

        {/* Subtitle: KEYBOARD SHORTCUTS in neutral gray (Zero Blue) */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#71717a',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
          }}
        >
          KEYBOARD SHORTCUTS
        </div>

        {/* 2-Column Islands Container */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.35fr',
            gap: '14px',
            alignItems: 'start',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Column 1: TOOLS */}
          <div
            style={{
              background: isDark ? '#18181b' : '#f8f8fa',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e4e4e7',
              borderRadius: '10px',
              padding: '16px 18px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#71717a',
                marginBottom: '12px',
              }}
            >
              TOOLS
            </div>
            <div>
              {toolsShortcuts.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12.5px',
                      color: isDark ? '#d4d4d8' : '#3f3f46',
                      fontWeight: 400,
                    }}
                  >
                    {s.label}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {s.shortcut}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: EDITOR */}
          <div
            className="doodle-help-editor-card"
            style={{
              background: isDark ? '#18181b' : '#f8f8fa',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e4e4e7',
              borderRadius: '10px',
              padding: '16px 14px 16px 18px',
              maxHeight: '520px',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#71717a',
                marginBottom: '12px',
              }}
            >
              EDITOR
            </div>
            <div style={{ paddingRight: '4px' }}>
              {editorShortcuts.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12.5px',
                      color: isDark ? '#d4d4d8' : '#3f3f46',
                      fontWeight: 400,
                    }}
                  >
                    {s.label}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {s.shortcut}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .doodle-help-editor-card::-webkit-scrollbar {
          width: 5px;
        }
        .doodle-help-editor-card::-webkit-scrollbar-track {
          background: transparent;
        }
        .doodle-help-editor-card::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .doodle-help-editor-card::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }

        .doodle-help-kbd {
          background: #27272a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          padding: 2px 7px;
          font-size: 11px;
          font-weight: 600;
          color: #ffffff;
          font-family: inherit;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 20px;
          line-height: 16px;
          box-sizing: border-box;
        }

        .doodle-help-connector {
          font-size: 11px;
          color: #71717a;
          font-weight: 400;
          margin: 0 4px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default HelpModal;
