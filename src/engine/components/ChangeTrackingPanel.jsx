import React from 'react';
import { GitCompareArrows, RotateCcw, ScanEye, Trash2 } from 'lucide-react';

const STATUS_LABELS = { added: 'Added', modified: 'Changed', removed: 'Removed' };

export function ChangeTrackingPanel({ hasBaseline, changes, onSetBaseline, onClearBaseline, onFocus, onClose }) {
  const counts = changes.reduce((result, change) => {
    result[change.status] = (result[change.status] || 0) + 1;
    return result;
  }, {});
  return (
    <aside className="doodle-layers-panel doodle-feature-panel" aria-label="Visual change tracking">
      <header className="doodle-layers-header">
        <div className="doodle-layers-heading">
          <GitCompareArrows size={16} />
          <div>
            <strong>Change tracking</strong>
            <span>{hasBaseline ? 'Compared with your saved baseline' : 'Save a baseline to start tracking'}</span>
          </div>
        </div>
        <button type="button" className="doodle-layers-icon-button" onClick={onClose} aria-label="Close change tracking">×</button>
      </header>
      <div className="doodle-changes-actions">
        <button type="button" onClick={onSetBaseline}><ScanEye size={13} /> {hasBaseline ? 'Update baseline' : 'Set baseline'}</button>
        {hasBaseline && <button type="button" onClick={onClearBaseline} title="Remove the saved comparison baseline"><Trash2 size={13} /></button>}
      </div>
      {hasBaseline && (
        <>
          <div className="doodle-change-counts" aria-live="polite">
            <span className="is-added">{counts.added || 0} added</span>
            <span className="is-modified">{counts.modified || 0} changed</span>
            <span className="is-removed">{counts.removed || 0} removed</span>
          </div>
          <div className="doodle-layers-list">
            {changes.map(change => (
              <button
                type="button"
                className={`doodle-change-row is-${change.status}`}
                key={`${change.status}:${change.id}`}
                onClick={() => onFocus(change)}
              >
                <span className="doodle-change-dot" />
                <span className="doodle-change-name">{change.element.text || change.element.type || 'Object'}</span>
                <span>{STATUS_LABELS[change.status]}</span>
              </button>
            ))}
            {changes.length === 0 && <p className="doodle-layers-empty">No changes since the baseline.</p>}
          </div>
          <footer className="doodle-layers-footer"><RotateCcw size={12} /> Change markers update live</footer>
        </>
      )}
    </aside>
  );
}
