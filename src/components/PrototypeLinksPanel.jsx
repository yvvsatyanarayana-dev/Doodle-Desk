import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Link2,
  LocateFixed,
  MousePointer2,
  Pencil,
  Play,
  Unlink,
  Workflow,
  X,
} from 'lucide-react';
import { extractElementIdFromLink } from './WebFrameCard.jsx';

function makeElementLink(elementId) {
  return `#element=${encodeURIComponent(elementId)}`;
}

function getElementLabel(element) {
  if (!element) return 'Missing object';
  if (element.type === 'frame' && element.name?.trim()) return element.name.trim();
  if (element.text?.trim()) return element.text.trim().split('\n')[0];
  return element.name || `${element.type || 'Canvas'} object`;
}

export function PrototypeLinksPanel({ doodleAPI, theme = 'dark', onClose, onStart, onToast }) {
  const [targetId, setTargetId] = useState('');
  const [startElementId, setStartElementId] = useState('');
  const [editingFrameId, setEditingFrameId] = useState('');
  const [frameNameDraft, setFrameNameDraft] = useState('');
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  const elements = doodleAPI?.getSceneElements?.() || [];
  const frames = useMemo(
    () => elements
      .filter((element) => element.type === 'frame' && !element.isDeleted && !element.isHidden)
      .sort((left, right) => left.y - right.y || left.x - right.x),
    [elements],
  );
  const targets = useMemo(
    () => elements
      .filter((element) => !element.isDeleted && !element.isHidden)
      .sort((left, right) => left.y - right.y || left.x - right.x),
    [elements],
  );
  const selection = doodleAPI?.getAppState?.()?.selectedElementIds || {};
  const selectedElements = elements.filter(
    (element) => selection[element.id] && !element.isDeleted && !element.isHidden && !element.locked,
  );
  const selectedIds = useMemo(() => new Set(selectedElements.map((element) => element.id)), [selectedElements]);
  const availableTargets = targets.filter((element) => !selectedIds.has(element.id));
  const canTargetAnotherObject = availableTargets.some((element) => element.type !== 'frame');
  const targetElement = availableTargets.find((element) => element.id === targetId) || availableTargets[0];
  const startElement = targets.find((element) => element.id === startElementId)
    || frames[0]
    || targets[0];
  const elementById = useMemo(() => new Map(targets.map((element) => [element.id, element])), [targets]);
  const links = useMemo(() => elements.flatMap((source) => {
    if (source.isDeleted || source.isHidden || !source.link) return [];
    const destinationId = extractElementIdFromLink(source.link);
    const destination = destinationId ? elementById.get(destinationId) : null;
    return destination ? [{ source, destination }] : [];
  }), [elements, elementById, revision]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const saveElements = (updated) => {
    if (!doodleAPI?.updateScene) {
      setStatus('Canvas is not available. Close this panel and try again.');
      return false;
    }
    doodleAPI.updateScene({ elements: updated, commitToHistory: true });
    setRevision((value) => value + 1);
    return true;
  };

  const connectSelection = () => {
    if (!selectedElements.length || !targetElement) return;
    const source = doodleAPI.getSceneElementsIncludingDeleted?.() || elements;
    const updated = source.map((element) => selectedIds.has(element.id)
      ? {
        ...element,
        link: makeElementLink(targetElement.id),
        version: (element.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 100000),
        updated: Date.now(),
      }
      : element);
    if (saveElements(updated)) {
      setStatus(`Connected ${selectedElements.length} object${selectedElements.length === 1 ? '' : 's'} to ${getElementLabel(targetElement)}.`);
    }
  };

  const changeDestination = (sourceId, destinationId) => {
    const source = doodleAPI?.getSceneElementsIncludingDeleted?.() || elements;
    const updated = source.map((element) => element.id === sourceId
      ? {
        ...element,
        link: destinationId ? makeElementLink(destinationId) : '',
        version: (element.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 100000),
        updated: Date.now(),
      }
      : element);
    if (saveElements(updated)) setStatus(destinationId ? 'Prototype connection updated.' : 'Prototype connection removed.');
  };

  const renameFrame = (frame) => {
    const name = frameNameDraft.trim();
    if (!name) {
      setStatus('Frame name cannot be empty.');
      return;
    }
    const source = doodleAPI?.getSceneElementsIncludingDeleted?.() || elements;
    const updated = source.map((element) => element.id === frame.id
      ? {
        ...element,
        name,
        version: (element.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 100000),
        updated: Date.now(),
      }
      : element);
    if (saveElements(updated)) {
      setEditingFrameId('');
      setFrameNameDraft('');
      setStatus(`Renamed frame to “${name}”.`);
      onToast?.(`Renamed frame to “${name}”.`);
    }
  };

  const focusElement = (element) => {
    if (!element) return;
    doodleAPI?.updateScene?.({
      appState: {
        selectedElementIds: { [element.id]: true },
        selectedGroupIds: {},
        activeTool: { type: 'selection' },
      },
    });
    doodleAPI?.scrollToContent?.([element], { fitToContent: false, animate: true, duration: 320 });
  };

  const startPrototype = () => {
    if (startElement && onStart) onStart(startElement.id);
  };

  return (
    <div className="modal-overlay feature-modal-overlay prototype-editor-overlay" data-theme={theme}>
      <section
        className="feature-modal prototype-editor"
        role="dialog"
        aria-modal="false"
        aria-labelledby="prototype-links-title"
      >
        <header className="feature-modal-header prototype-editor-header">
          <span className="prototype-editor-mark"><Workflow size={15} /></span>
          <div className="prototype-editor-heading">
            <h2 id="prototype-links-title">Prototype flows</h2>
            <p>Connect any objects and preview the journey</p>
          </div>
          <button type="button" className="feature-modal-close" onClick={onClose} aria-label="Close prototype flows">
            <X size={17} />
          </button>
        </header>

        <div className="prototype-editor-content">
          <div className="prototype-flow-stats" aria-label="Prototype summary">
            <div><strong>{targets.length}</strong><span>Objects</span></div>
            <div><strong>{links.length}</strong><span>Connections</span></div>
            <div><strong>{targets.length ? 'Ready' : 'Setup needed'}</strong><span>Preview</span></div>
          </div>

          {!targets.length ? (
            <div className="prototype-empty-state">
              <span><CircleAlert size={18} /></span>
              <strong>Add an object to get started</strong>
              <p>Select any shape, text, or frame and connect it to another canvas object.</p>
            </div>
          ) : (
            <>
              <section className="prototype-editor-section">
                <div className="prototype-section-heading">
                  <div><strong>New connection</strong><span>Connect your selection to any canvas object</span></div>
                  <span className="prototype-step-badge">01</span>
                </div>
                <div className="prototype-connect-card">
                  <div className="prototype-source-chip">
                    <MousePointer2 size={15} />
                    <span>
                      <strong>{selectedElements.length ? `${selectedElements.length} selected object${selectedElements.length === 1 ? '' : 's'}` : 'Canvas selection'}</strong>
                      <small>{selectedElements.length ? selectedElements.map(getElementLabel).slice(0, 2).join(', ') : 'Select a button or object on the canvas'}</small>
                    </span>
                  </div>
                  <div className="prototype-connect-arrow"><ArrowRight size={15} /></div>
                  <label className="prototype-frame-select">
                    <span>Destination</span>
                    <span className="prototype-select-wrap">
                      <select value={targetElement?.id || ''} onChange={(event) => { setTargetId(event.target.value); setStatus(''); }}>
                        {availableTargets.map((element) => (
                          <option key={element.id} value={element.id}>
                            {element.type === 'frame' ? 'Frame' : element.type || 'Object'}: {getElementLabel(element)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </span>
                    {selectedElements.some((element) => element.type !== 'frame') && !canTargetAnotherObject && (
                      <small className="prototype-destination-hint">
                        Add another shape to the canvas to create a shape-to-shape link.
                      </small>
                    )}
                  </label>
                  <button
                    type="button"
                    className="feature-primary-button prototype-connect-button"
                    onClick={connectSelection}
                    disabled={!selectedElements.length || !targetElement}
                  >
                    <Link2 size={15} /> Connect
                  </button>
                </div>
              </section>

              <section className="prototype-editor-section prototype-screen-section">
                <div className="prototype-section-heading">
                  <div><strong>Starting point</strong><span>Choose where the preview flow begins</span></div>
                  <span className="prototype-step-badge">02</span>
                </div>
                <div className="prototype-screen-list">
                  {targets.map((element, index) => {
                    const incomingLinks = links.filter((link) => link.destination.id === element.id);
                    const isEntry = startElement?.id === element.id;
                    return (
                      <div key={element.id} className={`prototype-screen-row${isEntry ? ' is-entry' : ''}`}>
                        <button
                          type="button"
                          className="prototype-screen-main"
                          onClick={() => setStartElementId(element.id)}
                          aria-pressed={isEntry}
                        >
                          <span className="prototype-screen-index">{String(index + 1).padStart(2, '0')}</span>
                          <span className="prototype-screen-copy">
                            {editingFrameId === element.id ? (
                              <input
                                className="prototype-frame-name-input"
                                aria-label="Frame name"
                                autoFocus
                                value={frameNameDraft}
                                onChange={(event) => setFrameNameDraft(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  event.stopPropagation();
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    renameFrame(element);
                                  } else if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setEditingFrameId('');
                                    setFrameNameDraft('');
                                  }
                                }}
                                onBlur={() => {
                                  if (editingFrameId === element.id) renameFrame(element);
                                }}
                              />
                            ) : (
                              <strong>{getElementLabel(element)}</strong>
                            )}
                            <small>{element.type || 'Object'} · {incomingLinks.length} incoming connection{incomingLinks.length === 1 ? '' : 's'}{isEntry ? ' - Opens first' : ''}</small>
                          </span>
                          {isEntry ? <span className="prototype-entry-mark"><Check size={13} /> Start</span> : <ArrowRight size={14} className="prototype-screen-chevron" />}
                        </button>
                        {element.type === 'frame' && editingFrameId !== element.id && (
                          <button
                            type="button"
                            className="prototype-locate-screen"
                            onClick={() => {
                              setEditingFrameId(element.id);
                              setFrameNameDraft(element.name || `Frame ${index + 1}`);
                            }}
                            aria-label={`Rename ${getElementLabel(element)}`}
                            title="Rename frame"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <button type="button" className="prototype-locate-screen" onClick={() => focusElement(element)} aria-label={`Locate ${getElementLabel(element)} on canvas`} title="Locate on canvas">
                          <LocateFixed size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="prototype-editor-section">
                <div className="prototype-section-heading">
                  <div><strong>Interactions</strong><span>Manage links between canvas objects</span></div>
                  <span className="prototype-step-badge">{String(links.length).padStart(2, '0')}</span>
                </div>
                {links.length ? (
                  <div className="prototype-interaction-list">
                    {links.map(({ source, destination }) => (
                      <div className="prototype-interaction-row" key={source.id}>
                        <button type="button" className="prototype-interaction-source" onClick={() => focusElement(source)} title="Locate this object on the canvas">
                          <span className="prototype-interaction-icon"><MousePointer2 size={14} /></span>
                          <span><strong>{getElementLabel(source)}</strong><small>{source.type || 'Canvas object'}</small></span>
                        </button>
                        <ArrowRight size={14} className="prototype-interaction-arrow" />
                        <label className="prototype-interaction-target">
                          <select aria-label={`Destination for ${getElementLabel(source)}`} value={destination.id} onChange={(event) => changeDestination(source.id, event.target.value)}>
                            {targets.filter((element) => element.id !== source.id || element.id === destination.id).map((element) => (
                              <option key={element.id} value={element.id}>
                                {element.type === 'frame' ? 'Frame' : element.type || 'Object'}: {getElementLabel(element)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="button" className="prototype-remove-link" onClick={() => changeDestination(source.id, '')} aria-label={`Remove link from ${getElementLabel(source)}`} title="Remove connection">
                          <Unlink size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prototype-no-interactions">
                    <Link2 size={15} />
                    <span>No screen connections yet. Select a canvas object and connect it above.</span>
                  </div>
                )}
              </section>
              {status && <p className="prototype-editor-status" role="status"><Check size={13} />{status}</p>}
            </>
          )}
        </div>

        <footer className="feature-modal-footer prototype-editor-footer">
          <button type="button" className="feature-secondary-button" onClick={onClose}>Done</button>
          <button type="button" className="feature-primary-button prototype-preview-button" onClick={startPrototype} disabled={!targets.length}>
            <Play size={15} /> Preview flow <ExternalLink size={13} />
          </button>
        </footer>
      </section>
    </div>
  );
}

export default PrototypeLinksPanel;
