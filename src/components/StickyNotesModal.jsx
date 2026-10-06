import React, { useState, useEffect, useRef, memo } from 'react';
import { X, StickyNote, CheckSquare, Lightbulb, Bug, Code, Sparkles, Plus } from 'lucide-react';
import { FONT_FAMILY } from '../engine/elements.js';

const STICKY_PALETTES = [
  { id: 'yellow', name: 'Canary Yellow', bg: '#fef08a', stroke: '#ca8a04', text: '#713f12' },
  { id: 'mint', name: 'Cyber Mint', bg: '#a7f3d0', stroke: '#059669', text: '#064e3b' },
  { id: 'lavender', name: 'Soft Lavender', bg: '#e9d5ff', stroke: '#9333ea', text: '#581c87' },
  { id: 'rose', name: 'Rose Blush', bg: '#fbcfe8', stroke: '#db2777', text: '#831843' },
  { id: 'sky', name: 'Ocean Sky', bg: '#bae6fd', stroke: '#0284c7', text: '#0c4a6e' },
  { id: 'peach', name: 'Warm Peach', bg: '#fed7aa', stroke: '#ea580c', text: '#7c2d12' },
  { id: 'obsidian', name: 'Obsidian Dark', bg: '#1c1917', stroke: '#44403c', text: '#f5f5f4' },
  { id: 'neon', name: 'Cyber Slate', bg: '#0f172a', stroke: '#38bdf8', text: '#f8fafc' },
];

const PRESETS = [
  {
    id: 'note',
    label: 'Quick Note',
    icon: StickyNote,
    title: 'Important Note',
    content: 'Review quarterly goals and align architecture milestones with engineering team.',
  },
  {
    id: 'checklist',
    label: 'Checklist',
    icon: CheckSquare,
    title: 'Sprint Tasks',
    content: '[ ] Refactor state management\n[x] Implement offline auto-save\n[ ] Performance profiling & audit\n[ ] Design review with team',
  },
  {
    id: 'idea',
    label: 'Idea Callout',
    icon: Lightbulb,
    title: '💡 Breakthrough Idea',
    content: 'Add natural language to flowchart generation for rapid zero-click prototyping!',
  },
  {
    id: 'bug',
    label: 'Issue / Bug',
    icon: Bug,
    title: '🐛 Bug Investigation',
    content: 'High priority:\n- Verify touch pinch zoom on Windows touchscreens\n- Check memory footprint on 500+ elements',
  },
  {
    id: 'code',
    label: 'Code Memo',
    icon: Code,
    title: 'Terminal / Snippet',
    content: 'const app = express();\napp.use(cors());\napp.listen(8080);',
  },
];

const SIZES = [
  { id: 'compact', label: 'Compact', width: 200, height: 200 },
  { id: 'standard', label: 'Standard', width: 260, height: 260 },
  { id: 'wide', label: 'Wide Card', width: 380, height: 240 },
];

function StickyNotesModalComponent({ isOpen, onClose, doodleAPI, canvasAPI }) {
  const activeAPI = doodleAPI || canvasAPI;
  const [selectedPalette, setSelectedPalette] = useState(STICKY_PALETTES[0]);
  const [title, setTitle] = useState(PRESETS[0].title);
  const [content, setContent] = useState(PRESETS[0].content);
  const [selectedSize, setSelectedSize] = useState(SIZES[1]);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setTitle(preset.title);
    setContent(preset.content);
  };

  const handleInsert = () => {
    const api = activeAPI || window.__doodleAPI;
    if (!api) {
      onClose();
      return;
    }

    const appState = api.getAppState?.() || {};
    const zoom = appState.zoom?.value || (typeof appState.zoom === 'number' ? appState.zoom : 1);
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;
    const width = appState.width || window.innerWidth;
    const height = appState.height || window.innerHeight;

    // Viewport center coordinates accurately transformed into scene space
    let targetX, targetY;
    if (api.canvasToScene) {
      const [cx, cy] = api.canvasToScene(width / 2, height / 2);
      targetX = Math.round(cx - selectedSize.width / 2);
      targetY = Math.round(cy - selectedSize.height / 2);
    } else {
      targetX = Math.round((width / 2 - scrollX) / zoom - selectedSize.width / 2);
      targetY = Math.round((height / 2 - scrollY) / zoom - selectedSize.height / 2);
    }

    const font = FONT_FAMILY?.Doodlefont ?? 5;
    const idSeed = Math.random().toString(36).substring(2, 9);
    const boxId = `sticky-box-${idSeed}`;
    const textId = `sticky-text-${idSeed}`;

    const formattedText = title ? `${title}\n\n${content}` : content;

    const boxElement = {
      id: boxId,
      type: 'rectangle',
      x: targetX,
      y: targetY,
      width: selectedSize.width,
      height: selectedSize.height,
      angle: 0,
      strokeColor: selectedPalette.stroke,
      backgroundColor: selectedPalette.bg,
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [`group-${idSeed}`],
      frameId: null,
      roundness: { type: 3 },
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: [{ id: textId, type: 'text' }],
      updated: Date.now(),
      link: null,
      locked: false,
    };

    const textElement = {
      id: textId,
      type: 'text',
      x: targetX + 16,
      y: targetY + 16,
      width: selectedSize.width - 32,
      height: selectedSize.height - 32,
      angle: 0,
      strokeColor: selectedPalette.text,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [`group-${idSeed}`],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: formattedText,
      fontSize: 16,
      fontFamily: font,
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: 14,
      containerId: boxId,
      originalText: formattedText,
      lineHeight: 1.35,
    };

    const currentElements = api.getSceneElements?.() || [];
    api.updateScene({
      elements: [...currentElements, boxElement, textElement],
      appState: {
        selectedElementIds: { [boxId]: true },
        showWelcomeScreen: false,
      },
      commitToHistory: true,
    });

    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleInsert();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="modal-container sticky-notes-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '740px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          background: '#121214',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(254, 240, 138, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fef08a',
              }}
            >
              <StickyNote size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f3f4f6' }}>
                Sticky Notes & Quick Cards
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                Drop customizable hand-drawn sticky cards directly onto your canvas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="studio-icon-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="sticky-notes-modal-body" style={{ display: 'flex', padding: '20px', gap: '20px', overflowY: 'auto' }}>
          {/* Left Configuration Panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Template Presets */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Card Templates
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        color: '#d1d5db',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      <Icon size={13} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title & Content Inputs */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Card heading..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1a1a1e',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Content
              </label>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note, task list, or ideas..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1e',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Color Palette Selection */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Card Color
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {STICKY_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    onClick={() => setSelectedPalette(pal)}
                    title={pal.name}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: pal.bg,
                      border: selectedPalette.id === pal.id ? `2px solid #ffffff` : `1px solid ${pal.stroke}`,
                      cursor: 'pointer',
                      transform: selectedPalette.id === pal.id ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: selectedPalette.id === pal.id ? '0 0 10px rgba(255, 255, 255, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Size Options */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Card Size
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: selectedSize.id === size.id ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: selectedSize.id === size.id ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      color: selectedSize.id === size.id ? '#ffffff' : '#9ca3af',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Preview Card */}
          <div
            className="sticky-notes-preview-panel"
            style={{
              width: '280px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0a0a0c',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 600 }}>
              Live Preview
            </div>

            <div
              style={{
                width: selectedSize.id === 'wide' ? '240px' : '200px',
                height: selectedSize.id === 'compact' ? '170px' : '200px',
                background: selectedPalette.bg,
                border: `2px solid ${selectedPalette.stroke}`,
                borderRadius: '8px',
                padding: '14px',
                color: selectedPalette.text,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                overflow: 'hidden',
                fontFamily: 'Doodlefont, Virgil, sans-serif',
              }}
            >
              {title && (
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', borderBottom: `1px dashed ${selectedPalette.stroke}`, paddingBottom: '4px' }}>
                  {title}
                </div>
              )}
              <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: 1.35, overflow: 'hidden' }}>
                {content || 'Type your message...'}
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '11px', color: '#6b7280' }}>
              Press <kbd style={{ padding: '2px 5px', background: '#1e1e24', borderRadius: '4px', border: '1px solid #333' }}>Ctrl+Enter</kbd> to insert
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '14px 20px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#d1d5db',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              color: '#000000',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255, 255, 255, 0.2)',
            }}
          >
            <Plus size={16} />
            <span>Drop Card on Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const StickyNotesModal = memo(StickyNotesModalComponent);
