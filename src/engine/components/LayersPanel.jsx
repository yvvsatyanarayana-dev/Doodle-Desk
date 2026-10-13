import React from 'react';
import { Eye, EyeOff, Layers, Lock, LockOpen, Minus, Plus, Ungroup } from 'lucide-react';

function getElementLabel(element, index) {
  if (element.name) return element.name;
  if (element.text?.trim()) return element.text.trim().split('\n')[0].slice(0, 28);
  return `${element.type || 'Shape'} ${index + 1}`;
}

export function LayersPanel({
  elements,
  selectedIds,
  onClose,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onMove,
  onGroup,
  onUngroup,
}) {
  const visibleElements = elements
    .map((element, index) => ({ element, index }))
    .filter(({ element }) => !element.isDeleted)
    .reverse();
  const selectedCount = elements.filter(element =>
    selectedIds[element.id] && !element.isDeleted && !element.isHidden && !element.locked
  ).length;
  const hasGroups = visibleElements.some(({ element }) =>
    selectedIds[element.id] && !element.isHidden && !element.locked && element.groupIds?.length
  );

  return (
    <aside className="doodle-layers-panel" aria-label="Layers panel">
      <header className="doodle-layers-header">
        <div className="doodle-layers-heading">
          <Layers size={16} />
          <div>
            <strong>Layers</strong>
            <span>{visibleElements.length} objects</span>
          </div>
        </div>
        <button type="button" className="doodle-layers-icon-button" onClick={onClose} aria-label="Close layers panel">×</button>
      </header>

      <div className="doodle-layers-actions">
        <button type="button" onClick={onGroup} disabled={selectedCount < 2} title="Group selected objects">
          <Layers size={14} /> Group
        </button>
        <button type="button" onClick={onUngroup} disabled={!hasGroups} title="Ungroup selected objects">
          <Ungroup size={14} /> Ungroup
        </button>
      </div>

      <div className="doodle-layers-list">
        {visibleElements.map(({ element, index }, displayIndex) => (
          <div
            key={element.id}
            className={`doodle-layer-row${selectedIds[element.id] ? ' is-selected' : ''}${element.isHidden ? ' is-hidden' : ''}`}
          >
            <button
              type="button"
              className="doodle-layer-select"
              onClick={(event) => onSelect(element.id, event.shiftKey)}
              title={`Select ${getElementLabel(element, index)}`}
            >
              <span className="doodle-layer-type">{element.type?.slice(0, 1).toUpperCase() || 'S'}</span>
              <span className="doodle-layer-name">{getElementLabel(element, index)}</span>
              {element.groupIds?.length > 0 && <span className="doodle-layer-group-badge">G</span>}
            </button>
            <button
              type="button"
              className="doodle-layers-icon-button"
              onClick={() => onToggleVisibility(element.id)}
              aria-label={`${element.isHidden ? 'Show' : 'Hide'} ${getElementLabel(element, index)}`}
              title={element.isHidden ? 'Show layer' : 'Hide layer'}
            >
              {element.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              className="doodle-layers-icon-button"
              onClick={() => onToggleLock(element.id)}
              aria-label={`${element.locked ? 'Unlock' : 'Lock'} ${getElementLabel(element, index)}`}
              title={element.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {element.locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>
            <button
              type="button"
              className="doodle-layers-icon-button"
              onClick={() => onMove(element.id, 1)}
              disabled={displayIndex === 0}
              aria-label={`Move ${getElementLabel(element, index)} forward`}
              title="Move forward"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="doodle-layers-icon-button"
              onClick={() => onMove(element.id, -1)}
              disabled={displayIndex === visibleElements.length - 1}
              aria-label={`Move ${getElementLabel(element, index)} backward`}
              title="Move backward"
            >
              <Minus size={14} />
            </button>
          </div>
        ))}
        {visibleElements.length === 0 && <p className="doodle-layers-empty">Your canvas is empty.</p>}
      </div>
      <footer className="doodle-layers-footer">Top of list is frontmost</footer>
    </aside>
  );
}
