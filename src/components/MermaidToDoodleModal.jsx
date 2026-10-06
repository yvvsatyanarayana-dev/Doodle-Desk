import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GitFork, AlertCircle, Sparkles, Check, Copy } from 'lucide-react';
import { parseMermaidToElements, MERMAID_PRESETS } from '../utils/mermaidParser';

export function MermaidToDoodleModal({
  isOpen,
  onClose,
  doodleAPI,
  theme = 'dark',
}) {
  const [code, setCode] = useState(MERMAID_PRESETS[0].code);
  const [selectedPreset, setSelectedPreset] = useState(MERMAID_PRESETS[0].id);
  const [copied, setCopied] = useState(false);

  // Parse code reactively for live preview and validation
  const parsed = useMemo(() => {
    return parseMermaidToElements(code, { theme, originX: 40, originY: 40 });
  }, [code, theme]);

  // Escape to close and Ctrl+Enter to insert
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleInsert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, code, parsed]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setCode(preset.code);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = useCallback(() => {
    if (!doodleAPI || parsed.error || !parsed.elements?.length) return;

    const appState = doodleAPI.getAppState?.() || {};
    const currentElements = (doodleAPI.getSceneElements?.() || []).filter((el) => !el.isDeleted);

    // Calculate insertion origin: Center of current viewport
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;
    const viewportCenterX = -scrollX + (window.innerWidth / 2) / zoom;
    const viewportCenterY = -scrollY + (window.innerHeight / 2) / zoom;

    const bounds = parsed.bounds || { x: 40, y: 40, width: 400, height: 300 };
    const offsetX = viewportCenterX - bounds.x - bounds.width / 2;
    const offsetY = viewportCenterY - bounds.y - bounds.height / 2;

    // Shift parsed elements to current viewport center
    const newElements = parsed.elements.map((el) => {
      const shifted = {
        ...el,
        x: Math.round(el.x + offsetX),
        y: Math.round(el.y + offsetY),
      };
      return shifted;
    });

    const newSelectedIds = {};
    newElements.forEach((el) => {
      newSelectedIds[el.id] = true;
    });

    doodleAPI.updateScene?.({
      elements: [...currentElements, ...newElements],
      appState: {
        selectedElementIds: newSelectedIds,
        showWelcomeScreen: false,
      },
      commitToHistory: true,
    });

    setTimeout(() => {
      doodleAPI.scrollToContent?.(newElements, { fitToContent: true, animate: true });
    }, 60);

    onClose();
  }, [doodleAPI, parsed, onClose]);

  if (!isOpen) return null;

  const isDark = theme !== 'light';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="pref-modal-content help-style-dialog mermaid-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '880px',
          width: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          padding: '24px 28px',
        }}
      >
        {/* Header */}
        <div className="pref-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="help-dialog-icon-badge">
              <GitFork size={16} />
            </div>
            <div>
              <h2 className="pref-title" style={{ fontSize: '18px', fontWeight: 600 }}>
                Mermaid to Doodle
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="pref-esc-pill"
            onClick={onClose}
            aria-label="Close dialog"
          >
            Esc to close
          </button>
        </div>

        {/* Subtitle */}
        <h3 className="pref-subtitle" style={{ margin: '0 0 4px 0' }}>
          Convert Mermaid diagram syntax into native editable shapes
        </h3>

        {/* Preset Selector Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#a1a1aa' : '#64748b',
              marginRight: '4px',
              flexShrink: 0,
            }}
          >
            Templates:
          </span>
          {MERMAID_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  border: isSelected
                    ? isDark
                      ? '1px solid rgba(255, 255, 255, 0.25)'
                      : '1px solid rgba(0, 0, 0, 0.3)'
                    : isDark
                      ? '1px solid rgba(255, 255, 255, 0.08)'
                      : '1px solid rgba(0, 0, 0, 0.08)',
                  background: isSelected
                    ? isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.08)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.03)'
                      : 'rgba(0, 0, 0, 0.03)',
                  color: isSelected
                    ? isDark
                      ? '#ffffff'
                      : '#0f172a'
                    : isDark
                      ? '#a1a1aa'
                      : '#64748b',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {preset.title}
              </button>
            );
          })}
        </div>

        {/* Main Content: Split Editor & Live Preview */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
            gap: '14px',
            height: '330px',
            minHeight: '250px',
          }}
        >
          {/* Left: Code Editor */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: isDark ? '#161619' : '#f8fafc',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#a1a1aa' : '#64748b' }}>
                MERMAID CODE
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDark ? '#a1a1aa' : '#64748b',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setSelectedPreset(null);
              }}
              placeholder="Enter Mermaid diagram code here..."
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: isDark ? '#f4f4f5' : '#1e293b',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '13px',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Right: Live Preview & Inspection */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: isDark ? '#161619' : '#f8fafc',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#a1a1aa' : '#64748b' }}>
                LIVE PREVIEW
              </span>
              <span style={{ fontSize: '11px', color: isDark ? '#71717a' : '#94a3b8' }}>
                {parsed.elements?.length ? `${parsed.elements.length} elements generated` : 'No elements'}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {parsed.error ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#f87171',
                    textAlign: 'center',
                    padding: '16px',
                  }}
                >
                  <AlertCircle size={24} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{parsed.error}</span>
                </div>
              ) : parsed.bounds ? (
                <svg
                  viewBox={`${parsed.bounds.x - 30} ${parsed.bounds.y - 30} ${parsed.bounds.width + 60} ${parsed.bounds.height + 60}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                >
                  <defs>
                    <marker
                      id="mermaid-arrowhead"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={isDark ? '#a1a1aa' : '#64748b'} />
                    </marker>
                  </defs>

                  {/* Render arrows / lines */}
                  {parsed.elements.map((el) => {
                    if (el.type === 'arrow' || el.type === 'line') {
                      const pts = (el.points || [[0, 0], [el.width, el.height]])
                        .map(([px, py]) => `${el.x + px},${el.y + py}`)
                        .join(' ');
                      return (
                        <polyline
                          key={el.id}
                          points={pts}
                          stroke={isDark ? '#a1a1aa' : '#64748b'}
                          strokeWidth={el.strokeWidth || 1.8}
                          strokeDasharray={el.strokeStyle === 'dashed' ? '5,5' : 'none'}
                          fill="none"
                          markerEnd={el.endArrowhead ? 'url(#mermaid-arrowhead)' : undefined}
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Render shape backgrounds and borders */}
                  {parsed.elements.map((el) => {
                    if (el.type === 'rectangle') {
                      return (
                        <rect
                          key={el.id}
                          x={el.x}
                          y={el.y}
                          width={el.width}
                          height={el.height}
                          rx={el.roundness ? 12 : 6}
                          fill={isDark ? '#27272a' : '#f1f5f9'}
                          stroke={isDark ? '#e4e4e7' : '#334155'}
                          strokeWidth="2"
                        />
                      );
                    }
                    if (el.type === 'diamond') {
                      const cx = el.x + el.width / 2;
                      const cy = el.y + el.height / 2;
                      const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
                      return (
                        <polygon
                          key={el.id}
                          points={pts}
                          fill={isDark ? '#27272a' : '#f1f5f9'}
                          stroke={isDark ? '#e4e4e7' : '#334155'}
                          strokeWidth="2"
                        />
                      );
                    }
                    if (el.type === 'ellipse') {
                      return (
                        <ellipse
                          key={el.id}
                          cx={el.x + el.width / 2}
                          cy={el.y + el.height / 2}
                          rx={el.width / 2}
                          ry={el.height / 2}
                          fill={isDark ? '#27272a' : '#f1f5f9'}
                          stroke={isDark ? '#e4e4e7' : '#334155'}
                          strokeWidth="2"
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Render text labels on top */}
                  {parsed.elements.map((el) => {
                    if (el.type === 'text') {
                      const isContainer = Boolean(el.containerId);
                      return (
                        <text
                          key={el.id}
                          x={el.x + el.width / 2}
                          y={isContainer ? el.y + el.height / 2 : el.y + 10}
                          fill={isDark ? '#f4f4f5' : '#0f172a'}
                          fontSize={isContainer ? 14 : 12}
                          fontWeight={isContainer ? '600' : '500'}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily="sans-serif"
                        >
                          {el.text}
                        </text>
                      );
                    }
                    return null;
                  })}
                </svg>
              ) : (
                <div style={{ color: isDark ? '#71717a' : '#94a3b8', fontSize: '13px' }}>
                  Write Mermaid code to see live preview
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="help-dialog-actions" style={{ marginTop: '14px', paddingTop: '4px' }}>
          <button
            type="button"
            className="help-dialog-btn cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="help-dialog-btn save"
            onClick={handleInsert}
            disabled={Boolean(parsed.error) || !parsed.elements?.length}
            style={{
              opacity: parsed.error || !parsed.elements?.length ? 0.5 : 1,
              cursor: parsed.error || !parsed.elements?.length ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={15} />
            Insert to Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

export default MermaidToDoodleModal;
