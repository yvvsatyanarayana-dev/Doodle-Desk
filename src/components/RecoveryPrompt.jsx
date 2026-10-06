import React, { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export function RecoveryPrompt({ isOpen, meta, onRestore, onDiscard }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDiscard();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onRestore();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onRestore, onDiscard]);

  if (!isOpen || !meta) return null;

  const dateStr = meta.timestamp
    ? new Date(meta.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : 'earlier';

  return (
    <div className="modal-overlay" onClick={onDiscard}>
      <div className="pref-modal-content help-style-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pref-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="help-dialog-icon-badge">
              <RotateCcw size={16} />
            </div>
            <h2 className="pref-title">Recover Drawing</h2>
          </div>
          <button className="pref-esc-pill" onClick={onDiscard} aria-label="Close dialog">
            Esc to close
          </button>
        </div>

        {/* Section Subtitle */}
        <h3 className="pref-subtitle">Auto-Saved Session</h3>

        {/* Island Card */}
        <div className="pref-island help-dialog-island">
          <p className="help-dialog-text">
            An unsaved drawing session from <span className="help-dialog-filename">{dateStr}</span> ({meta.elementsCount || 0} elements) was found.
          </p>
          <p className="help-dialog-subtext">
            Would you like to restore this session to continue your work?
          </p>
        </div>

        {/* Minimal Monochrome Actions */}
        <div className="help-dialog-actions">
          <button className="help-dialog-btn cancel" onClick={onDiscard}>
            Discard
          </button>
          <button className="help-dialog-btn save" onClick={onRestore} autoFocus>
            Restore Session
          </button>
        </div>
      </div>
    </div>
  );
}
