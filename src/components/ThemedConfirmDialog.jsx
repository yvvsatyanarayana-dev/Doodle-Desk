import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, Info, HelpCircle } from 'lucide-react';

export function ThemedConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  subtitle = 'Confirm Action',
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  danger = false,
  isAlert = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 999999 }}
      onClick={onCancel}
    >
      <div
        className="pref-modal-content help-style-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div className="pref-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={`help-dialog-icon-badge ${danger ? 'danger' : ''}`}>
              {danger ? <Trash2 size={16} /> : isAlert ? <Info size={16} /> : <HelpCircle size={16} />}
            </div>
            <h2 className="pref-title">{title}</h2>
          </div>
          <button
            className="pref-esc-pill"
            onClick={onCancel}
            aria-label="Close dialog"
            type="button"
          >
            Esc to close
          </button>
        </div>

        {/* Section Subtitle */}
        {subtitle && <h3 className="pref-subtitle">{subtitle}</h3>}

        {/* Island Card */}
        <div className="pref-island help-dialog-island">
          <p className="help-dialog-text">
            {message}
          </p>
          {danger && (
            <p className="help-dialog-subtext">
              This action cannot be undone.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="help-dialog-actions">
          {!isAlert && (
            <button
              type="button"
              className="help-dialog-btn cancel"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`help-dialog-btn ${danger ? 'danger' : 'save'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemedConfirmDialog;
