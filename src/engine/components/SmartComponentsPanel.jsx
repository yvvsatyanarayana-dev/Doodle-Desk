import React, { useState } from 'react';
import { Box, Check, Plus, RefreshCw, Trash2 } from 'lucide-react';

export function SmartComponentsPanel({
  components,
  selectedCount,
  selectedComponentId,
  onClose,
  onCreate,
  onInsert,
  onUpdate,
  onDelete,
}) {
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = (event) => {
    event.preventDefault();
    try {
      onCreate(name);
      setName('');
      setError('');
      setIsNaming(false);
    } catch (creationError) {
      setError(creationError.message || 'Could not create this component.');
    }
  };

  const runAction = (action) => {
    try {
      action();
      setError('');
    } catch (actionError) {
      setError(actionError.message || 'Could not complete this component action.');
    }
  };

  return (
    <aside className="doodle-layers-panel doodle-components-panel" aria-label="Smart components">
      <header className="doodle-layers-header">
        <div className="doodle-layers-heading">
          <Box size={16} />
          <div>
            <strong>Components</strong>
            <span>Reusable across your boards</span>
          </div>
        </div>
        <button type="button" className="doodle-layers-icon-button" onClick={onClose} aria-label="Close components panel">×</button>
      </header>

      <div className="doodle-components-create">
        {isNaming ? (
          <form onSubmit={handleCreate}>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Component name"
              aria-label="Component name"
              maxLength={48}
            />
            <button type="submit" disabled={!name.trim()} aria-label="Save component">
              <Check size={14} />
            </button>
            <button type="button" onClick={() => { setIsNaming(false); setError(''); }} aria-label="Cancel component creation">×</button>
          </form>
        ) : (
          <button
            type="button"
            className="doodle-components-add"
            disabled={selectedCount === 0}
            onClick={() => {
              setName('');
              setError('');
              setIsNaming(true);
            }}
            title={selectedCount ? 'Save selected objects as a reusable component' : 'Select objects first'}
          >
            <Plus size={14} />
            Create from selection
          </button>
        )}
        {selectedComponentId && (
          <button
            type="button"
            className="doodle-components-update"
            onClick={() => runAction(() => onUpdate(selectedComponentId))}
            title="Replace every instance on all boards with the current selection"
          >
            <RefreshCw size={13} />
            Update master from selection
          </button>
        )}
        {error && <span className="doodle-components-error" role="alert">{error}</span>}
      </div>

      <div className="doodle-layers-list">
        {components.map((component) => (
          <div className="doodle-component-card" key={component.id}>
            <div className="doodle-component-card-heading">
              <Box size={15} />
              <div>
                <strong>{component.name}</strong>
                <span>{component.elements.length} objects · {Math.round(component.width)} × {Math.round(component.height)}</span>
              </div>
            </div>
            <div className="doodle-component-card-actions">
              <button type="button" onClick={() => runAction(() => onInsert(component))}><Plus size={13} /> Insert</button>
              <button
                type="button"
                className="doodle-component-delete"
                onClick={() => runAction(() => onDelete(component.id))}
                aria-label={`Delete component ${component.name}`}
                title="Delete component (existing instances remain editable)"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {components.length === 0 && (
          <p className="doodle-layers-empty">Select a group of objects to save your first reusable component.</p>
        )}
      </div>
      <footer className="doodle-layers-footer">Changes to a master sync all linked instances</footer>
    </aside>
  );
}
