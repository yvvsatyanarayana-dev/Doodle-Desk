import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Footprints,
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
import { getWalkthroughFrameForElement } from '../engine/scenarioWalkthrough.js';
import { createElement, createTextElement, ELEMENT_TYPES } from '../engine/elements.js';
import { getCommonBounds } from '../engine/math/geometry.js';

function makeElementLink(elementId) {
  return `#element=${encodeURIComponent(elementId)}`;
}

function getElementLabel(element) {
  if (!element) return 'Missing object';
  if (element.type === 'frame' && element.name?.trim()) return element.name.trim();
  if (element.text?.trim()) return element.text.trim().split('\n')[0];
  return element.name || `${element.type || 'Canvas'} object`;
}

const SAMPLE_WALKTHROUGH_ID = 'saturday-plans-v1';

function createSampleWalkthrough(originX, originY, theme) {
  const isDark = theme !== 'light';
  const frameWidth = 420;
  const frameHeight = 300;
  const frameStroke = isDark ? '#71717a' : '#a1a1aa';
  const titleColor = isDark ? '#f4f4f5' : '#18181b';
  const bodyColor = isDark ? '#a1a1aa' : '#52525b';
  const buttonFill = isDark ? '#27272a' : '#f4f4f5';
  const buttonStroke = isDark ? '#52525b' : '#d4d4d8';
  const buttonText = isDark ? '#fafafa' : '#18181b';

  const startFrame = createElement(ELEMENT_TYPES.FRAME, originX, originY, frameWidth, frameHeight, {
    name: 'Saturday plans',
    strokeColor: frameStroke,
    backgroundColor: 'transparent',
    roughness: 0,
    scenarioSample: SAMPLE_WALKTHROUGH_ID,
    scenarioSampleStart: true,
    walkthroughDescription: 'Choose a plan for Saturday. Try either option, then use Back or Restart to explore again.',
  });
  const outdoorFrame = createElement(ELEMENT_TYPES.FRAME, originX + 540, originY - 120, frameWidth, frameHeight, {
    name: 'Outdoor day',
    strokeColor: frameStroke,
    backgroundColor: 'transparent',
    roughness: 0,
    scenarioSample: SAMPLE_WALKTHROUGH_ID,
    walkthroughDescription: 'Pack a light lunch, bring water, and take the scenic trail.',
  });
  const cozyFrame = createElement(ELEMENT_TYPES.FRAME, originX + 540, originY + 320, frameWidth, frameHeight, {
    name: 'Cozy day',
    strokeColor: frameStroke,
    backgroundColor: 'transparent',
    roughness: 0,
    scenarioSample: SAMPLE_WALKTHROUGH_ID,
    walkthroughDescription: 'Make a warm drink, pick something to read, and enjoy a slower day.',
  });
  const frames = [startFrame, outdoorFrame, cozyFrame];
  const children = [];
  const addText = (frame, text, x, y, width, fontSize, color, extra = {}) => {
    const height = Math.ceil(fontSize * (text.includes('\n') ? 2.6 : 1.45));
    children.push(createTextElement(x, y, text, {
      width,
      height,
      fontSize,
      fontFamily: 5,
      lineHeight: 1.3,
      strokeColor: color,
      frameId: frame.id,
      ...extra,
    }));
  };
  const addChoice = (frame, text, target, y) => {
    const x = frame.x + 28;
    const width = frame.width - 56;
    const button = createElement(ELEMENT_TYPES.RECTANGLE, x, y, width, 42, {
      strokeColor: buttonStroke,
      backgroundColor: buttonFill,
      fillStyle: 'solid',
      strokeWidth: 1,
      roughness: 0,
      frameId: frame.id,
      link: `#element=${encodeURIComponent(target.id)}`,
    });
    children.push(button);
    addText(frame, text, x + 14, y + 10, width - 28, 17, buttonText, {
      link: `#element=${encodeURIComponent(target.id)}`,
    });
  };

  addText(startFrame, 'How do you want to spend Saturday?', originX + 28, originY + 40, frameWidth - 56, 23, titleColor);
  addText(startFrame, 'Pick a path to see how choices guide a walkthrough.', originX + 28, originY + 93, frameWidth - 56, 15, bodyColor);
  addChoice(startFrame, 'Explore the outdoors', outdoorFrame, originY + 158);
  addChoice(startFrame, 'Stay in and unwind', cozyFrame, originY + 214);

  addText(outdoorFrame, 'A day outside', outdoorFrame.x + 28, outdoorFrame.y + 48, frameWidth - 56, 23, titleColor);
  addText(outdoorFrame, 'Take a trail walk, bring a picnic, and find a new view.', outdoorFrame.x + 28, outdoorFrame.y + 104, frameWidth - 56, 16, bodyColor);
  addText(outdoorFrame, 'End of this path — use Back or Restart to try the other choice.', outdoorFrame.x + 28, outdoorFrame.y + 188, frameWidth - 56, 14, bodyColor);

  addText(cozyFrame, 'A slower kind of Saturday', cozyFrame.x + 28, cozyFrame.y + 48, frameWidth - 56, 23, titleColor);
  addText(cozyFrame, 'Make a warm drink, get comfortable, and enjoy a good book.', cozyFrame.x + 28, cozyFrame.y + 104, frameWidth - 56, 16, bodyColor);
  addText(cozyFrame, 'End of this path — use Back or Restart to try the other choice.', cozyFrame.x + 28, cozyFrame.y + 188, frameWidth - 56, 14, bodyColor);

  return { elements: [...frames, ...children], startFrame };
}

function DestinationPicker({ value, options, onChange, theme, ariaLabel, compact = false }) {
  return (
    <span className={`prototype-themed-select${compact ? ' is-compact' : ''}`} data-theme={theme}>
      <select
        aria-label={ariaLabel}
        value={options.some((option) => option.id === value) ? value : (options[0]?.id || '')}
        disabled={!options.length}
        onChange={(event) => onChange(event.target.value)}
      >
        {!options.length && <option value="">No destinations</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.type === 'frame' ? 'Frame' : option.type || 'Object'}: {getElementLabel(option)}
          </option>
        ))}
      </select>
      <span className="prototype-themed-select-icon" aria-hidden="true">
        <ChevronDown size={14} />
      </span>
    </span>
  );
}

export function PrototypeLinksPanel({ doodleAPI, theme = 'dark', onClose, onStart, onToast }) {
  const [targetId, setTargetId] = useState('');
  const [startElementId, setStartElementId] = useState('');
  const [editingFrameId, setEditingFrameId] = useState('');
  const [frameNameDraft, setFrameNameDraft] = useState('');
  const [guideDraft, setGuideDraft] = useState('');
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
  const startFrame = getWalkthroughFrameForElement(elements, startElement);
  const sampleStartFrame = frames.find(
    (frame) => frame.scenarioSample === SAMPLE_WALKTHROUGH_ID && frame.scenarioSampleStart,
  );
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

  const createOrPlaySampleWalkthrough = () => {
    if (sampleStartFrame) {
      onStart?.(sampleStartFrame.id, { mode: 'walkthrough' });
      return;
    }
    if (!doodleAPI?.updateScene) {
      setStatus('Canvas is not available. Close this panel and try again.');
      return;
    }
    const existing = doodleAPI.getSceneElementsIncludingDeleted?.() || elements;
    const bounds = getCommonBounds(elements);
    const originX = bounds ? bounds.x + bounds.width + 120 : 0;
    const originY = bounds ? bounds.y : 0;
    const sample = createSampleWalkthrough(originX, originY, theme);
    if (!saveElements([...existing, ...sample.elements])) return;
    setStatus('Added the Saturday sample to your board. Starting the walkthrough.');
    onStart?.(sample.startFrame.id, { mode: 'walkthrough' });
  };

  useEffect(() => {
    setGuideDraft(startFrame?.walkthroughDescription || '');
  }, [startFrame?.id, startFrame?.walkthroughDescription]);

  const saveWalkthroughGuide = () => {
    if (!startFrame || guideDraft === (startFrame.walkthroughDescription || '')) return;
    const source = doodleAPI.getSceneElementsIncludingDeleted?.() || elements;
    const updated = source.map((element) => element.id === startFrame.id
      ? {
        ...element,
        walkthroughDescription: guideDraft,
        version: (element.version || 1) + 1,
        versionNonce: Math.floor(Math.random() * 100000),
        updated: Date.now(),
      }
      : element);
    saveElements(updated);
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
          <div className="prototype-sample-card">
            <div>
              <strong>{sampleStartFrame ? 'Sample walkthrough is ready' : 'Want to see how walkthroughs work?'}</strong>
              <span>{sampleStartFrame ? 'Play the branching Saturday example.' : 'Adds a small branching example without replacing your work.'}</span>
            </div>
            <button
              type="button"
              className="feature-secondary-button prototype-sample-button"
              onClick={createOrPlaySampleWalkthrough}
            >
              {sampleStartFrame ? <BookOpen size={15} /> : <Footprints size={15} />}
              {sampleStartFrame ? 'Play sample' : 'Create & play sample'}
            </button>
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
                    <DestinationPicker
                      value={targetElement?.id || ''}
                      options={availableTargets}
                      theme={theme}
                      ariaLabel="Choose connection destination"
                      onChange={(value) => { setTargetId(value); setStatus(''); }}
                    />
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

              {startFrame && (
                <section className="prototype-editor-section">
                  <div className="prototype-section-heading">
                    <div><strong>Scene guide</strong><span>Add context for people playing this walkthrough</span></div>
                    <BookOpen size={15} className="scenario-guide-icon" />
                  </div>
                  <label className="scenario-guide-field">
                    <span>{startFrame.name?.trim() || 'Starting scene'} instructions</span>
                    <textarea
                      value={guideDraft}
                      maxLength={500}
                      placeholder="Set the scene, explain the goal, or share what to look for..."
                      onChange={(event) => setGuideDraft(event.target.value)}
                      onBlur={saveWalkthroughGuide}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                    <small>{guideDraft.length}/500 · Saved with this frame</small>
                  </label>
                </section>
              )}

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
                        <span className="prototype-interaction-target">
                          <DestinationPicker
                            value={destination.id}
                            options={targets.filter((element) => element.id !== source.id || element.id === destination.id)}
                            theme={theme}
                            compact
                            ariaLabel={`Destination for ${getElementLabel(source)}`}
                            onChange={(value) => changeDestination(source.id, value)}
                          />
                        </span>
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
          <div className="prototype-preview-actions">
            <button
              type="button"
              className="feature-secondary-button prototype-walkthrough-button"
              onClick={() => startFrame && onStart?.(startFrame.id, { mode: 'walkthrough' })}
              disabled={!startFrame}
              aria-label="Play walkthrough"
              title="Play walkthrough"
            >
              <BookOpen size={15} /> Walkthrough
            </button>
            <button
              type="button"
              className="feature-primary-button prototype-preview-button"
              onClick={startPrototype}
              disabled={!targets.length}
              aria-label="Preview flow"
              title="Preview flow"
            >
              <Play size={15} /> Preview <ExternalLink size={13} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default PrototypeLinksPanel;
