import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export function UnsavedChangesModal({ isOpen, fileName, onSave, onDiscard, onCancel }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSave, onCancel]);

  if (!isOpen) return null;

  const displayName = fileName || 'Untitled';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="pref-modal-content help-style-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pref-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="help-dialog-icon-badge warning">
              <AlertCircle size={16} />
            </div>
            <h2 className="pref-title">Unsaved Changes</h2>
          </div>
          <button className="pref-esc-pill" onClick={onCancel} aria-label="Close dialog">
            Esc to close
          </button>
        </div>

        {/* Section Subtitle */}
        <h3 className="pref-subtitle">Confirm Action</h3>

        {/* Island Card - Matching Help Dialog Island */}
        <div className="pref-island help-dialog-island">
          <p className="help-dialog-text">
            Do you want to save the changes made to <span className="help-dialog-filename">&ldquo;{displayName}&rdquo;</span>?
          </p>
          <p className="help-dialog-subtext">
            Your unsaved changes will be permanently lost if you proceed without saving.
          </p>
        </div>

        {/* Minimal Monochrome Actions */}
        <div className="help-dialog-actions">
          <button className="help-dialog-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="help-dialog-btn discard" onClick={onDiscard}>
            Don&apos;t Save
          </button>
          <button className="help-dialog-btn save" onClick={onSave} autoFocus>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
