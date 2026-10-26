import React, { useState } from 'react';
import {
  X,
  Target,
  Compass,
  GraduationCap,
  Code2,
  Palette,
  Search,
  Check,
} from 'lucide-react';
import { FOCUS_MODES } from '../config/focusModes.js';

const MODE_ICONS = {
  architect: Compass,
  teacher: GraduationCap,
  developer: Code2,
  designer: Palette,
  researcher: Search,
};

export default function FocusModeSwitcherModal({
  isOpen,
  onClose,
  currentModeId = 'developer',
  onSelectMode,
}) {
  if (!isOpen) return null;

  const [activeId, setActiveId] = useState(currentModeId);

  const handleSelect = (mode) => {
    setActiveId(mode.id);
    if (typeof onSelectMode === 'function') {
      onSelectMode(mode);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Mode Presets"
      className="studio-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="studio-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#111215',
          color: '#f4f4f5',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="studio-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(24, 24, 27, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  Focus Mode Presets
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#a1a1aa',
                  }}
                >
                  5 Persona Workspaces
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                Tailor toolbar visibility, canvas rendering style, and hotkeys to your active task
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#a1a1aa';
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Persona Grid */}
        <div
          style={{
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '14px',
            maxHeight: '65vh',
            overflowY: 'auto',
          }}
        >
          {Object.values(FOCUS_MODES).map((mode) => {
            const Icon = MODE_ICONS[mode.id] || Compass;
            const isCurrent = activeId === mode.id;

            return (
              <div
                key={mode.id}
                onClick={() => handleSelect(mode)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: isCurrent
                    ? '1px solid rgba(16, 185, 129, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: isCurrent
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(255, 255, 255, 0.02)',
                  boxShadow: isCurrent ? '0 10px 25px -5px rgba(16, 185, 129, 0.15)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          backgroundColor: isCurrent
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: isCurrent ? '#34d399' : '#e4e4e7',
                          border: isCurrent
                            ? '1px solid rgba(16, 185, 129, 0.4)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#f4f4f5' }}>
                        {mode.title}
                      </span>
                    </div>

                    {isCurrent && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#34d399',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <Check size={12} />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    {mode.tagline}
                  </p>

                  {/* Shortcuts preview */}
                  <div
                    style={{
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#71717a',
                      }}
                    >
                      Optimized Shortcuts:
                    </div>
                    {mode.keyShortcuts.map((sc, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: '#d4d4d8',
                        }}
                      >
                        <span style={{ color: '#a1a1aa' }}>{sc.action}</span>
                        <kbd
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '10px',
                            color: '#e4e4e7',
                          }}
                        >
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '8px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    color: '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Canvas: {mode.canvasStyle}</span>
                  <span>{mode.visibleTools.length} tool groups</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="studio-modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.6)',
            fontSize: '12px',
            color: '#71717a',
          }}
        >
          <span>Switches toolbar configuration and canvas background presets instantly</span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              backgroundColor: '#10b981',
              border: 'none',
              color: '#09090b',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
