import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { getShortcutBindings } from '../engine/keyboardShortcuts';

const guideSections = [
  {
    title: 'Start here: boards, files, and workspaces',
    description: 'A workspace groups related boards; each board is a separate drawing file.',
    steps: [
      'Use the file controls in the top bar to create a new board, open an existing file, save, or save a copy. The dirty marker beside the file name means there are unsaved changes.',
      'Open Workspace Manager to create or switch workspaces, and to create, rename, duplicate, import, export, switch, or delete boards. Use it to keep projects separate.',
      'Doodle Desk saves native .doodle documents so the drawing remains editable. Auto-save and recovery help protect recent work; use Ctrl+S (Cmd+S on macOS) when you want to save immediately.',
      'In Preferences, the Doodle Vault setting chooses the local folder used by default for new drawings and exports in the desktop app. Changing the vault does not move existing files.',
      'Use the top-bar file picker to switch quickly between boards in the active workspace. Use the command palette (Ctrl+K / Cmd+K) to search for actions by name.',
    ],
  },
  {
    title: 'Draw, select, edit, and navigate the canvas',
    description: 'Create diagrams with hand-drawn shapes, labels, connectors, and freehand marks.',
    steps: [
      'Choose a tool from the canvas toolbar, then click or drag on the canvas. Selection moves and resizes objects; rectangle, diamond, ellipse, line, arrow, draw, text, image, eraser, frame, and other tools create their corresponding objects.',
      'Select multiple objects by Shift-clicking or dragging a selection box. Use the selection handles to resize and rotate. Double-click text or a text container to edit its words.',
      'Connect shapes with arrows or lines by drawing between them; use the endpoint handles to adjust a connector. Group related objects to move them together, and ungroup them when you need to edit separately.',
      'Undo and redo from the toolbar or keyboard. Copy, cut, paste, duplicate, delete, arrange front/back, and use the context menu for actions on selected objects.',
      'Pan with Space+drag or the middle mouse button. Use the wheel/trackpad to navigate and the zoom controls to zoom in/out; Zoom to Fit frames the board content.',
      'Hold Shift while drawing or dragging to constrain geometry or movement. Hold Alt while dragging/resizing for the supported duplicate or symmetric-resize behavior.',
    ],
  },
  {
    title: 'Make the board clear and organized',
    description: 'Use frames, layers, styles, reusable content, and search to manage complex boards.',
    steps: [
      'Use the Frame tool to define named areas such as screens, topics, or presentation slides. Frames help organize a large canvas and are used as scenes by prototype walkthroughs.',
      'Open Layers to inspect objects, change their order, toggle visibility, and lock items you do not want to move accidentally.',
      'Open the Library sidebar for reusable shapes and components. The Tech & Architecture Icon Library provides searchable icons for technical diagrams. Templates can insert a starting point such as a flowchart, architecture map, mind map, Kanban board, or wireframe.',
      'Smart Components lets you save and reuse component designs. A Board Portal is a canvas object that points to another board in a workspace, letting you connect related project boards.',
      'Choose a canvas paper/grid style from the top bar for standard, blueprint, dot-grid, isometric, or parchment work. Use the theme button for the app’s light/dark appearance; the color palette studio offers curated colors.',
      'Use Find & Replace to locate or update text, frame names, and links on the current board. Use Search all boards to find board names and content across workspaces.',
      'Use the mini-map to orient yourself on a large canvas. The precision ruler/compass, lasso, and draw-to-shape tools assist with accurate layout and sketch cleanup.',
    ],
  },
  {
    title: 'Generate and arrange diagrams',
    description: 'Start from text, a generated layout, or a ready-made diagram instead of placing every object by hand.',
    steps: [
      'AI Smart Auto-Layout is available from the left-side tools and command palette. Choose a horizontal flow, vertical sequence, grid, radial layout, or tidy-up; configure spacing/options and whether to apply to the selection, then apply and inspect the result.',
      'Mermaid to Doodle converts supported Mermaid diagram text into editable native canvas shapes. Choose a preset or enter syntax, check the live preview and any validation message, then insert the diagram. Ctrl+Enter inserts when the input is valid.',
      'Use Diagram Templates for prebuilt flowcharts, system architecture, mind maps, sprint Kanban boards, and mobile wireframes. Templates are inserted as editable canvas objects.',
      'For mind maps, select a node to add a child or sibling branch with Tab or Enter, or use AI Smart Auto-Layout to organize connected steps.',
    ],
  },
  {
    title: 'Take notes and capture ideas',
    description: 'Turn meeting notes, checklists, and quick thoughts into visual cards on the board.',
    steps: [
      'Open Sticky Notes & Quick Cards from the command palette or canvas extra tools. Pick a template such as Quick Note, Checklist, Idea Callout, Issue/Bug, or Code Memo.',
      'Edit the title and content, choose a card color and size, and use Live Preview to check how it will look. Select “Drop Card on Canvas” to place it near the current viewport.',
      'Select Writing Focus (the expand icon) to hide the templates, palette, size controls, and preview while drafting. Press Esc to leave focus mode; Ctrl+Enter inserts the note into the canvas.',
      'After insertion, the note is a regular editable canvas object. Move, resize, recolor, group, or delete it like other shapes.',
    ],
  },
  {
    title: 'Build flows and guided walkthroughs',
    description: 'Connect canvas objects to create clickable prototypes or guided, branching scenarios.',
    steps: [
      'Open Prototype Flows from the command palette (or its keyboard shortcut shown in the Shortcuts tab). Select a start point, choose a destination, and connect the selected object. The linked object becomes a clickable choice.',
      'For a walkthrough, create frames for each scene, add scene instructions in the flow panel, and link labeled choices in one frame to objects in another. Start the walkthrough from its entry frame.',
      'During playback, choose a linked option to move to the next scene. Use Back, Restart, Edit flow, or Exit to control the session.',
      'Use the “Create & play sample” action in Prototype Flows to add a branching example to the current board without replacing its existing objects.',
      'Export an interactive HTML walkthrough when you want a self-contained player that can be opened outside Doodle Desk.',
    ],
  },
  {
    title: 'Present, focus, and review your work',
    description: 'Navigate the board as a presentation, focus on content, or inspect editing history.',
    steps: [
      'Presentation Mode turns frames into slides. Create and arrange frames in the desired order, then start presentation mode from the top bar or command palette and navigate through the slides.',
      'Spotlight Focus Mode emphasizes the area you are presenting while reducing surrounding distractions. Toggle it again or press Esc to leave.',
      'Canvas Time Machine lets you inspect earlier drawing states and replay the evolution of the board. It complements normal Undo/Redo; use it to review history rather than replace saving.',
      'Diagram Health Check highlights issues such as broken connector references, invalid geometry, blank text objects, or labels that may be difficult to read. Select a finding to inspect it on the canvas.',
      'The precision ruler and compass are visual guides for careful drawing; the laser pointer is a temporary presentation aid rather than a permanent shape.',
    ],
  },
  {
    title: 'Import, export, print, and share',
    description: 'Save an editable source file or produce a format suited to the way you want to share.',
    steps: [
      'Use Export to create PNG images, SVG vectors, PDF documents, or an interactive HTML player when supported. Export options are also searchable in the command palette.',
      'PNG is convenient for images, SVG preserves scalable vector artwork, PDF is suited to documents/printing, and interactive HTML preserves clickable prototype or walkthrough behavior.',
      'Use Copy to Clipboard to paste a board image/vector into another application. Print opens print preview and the system print flow.',
      'Import compatible diagrams, images, templates, icon/component libraries, or workspace files through the relevant open/import controls. Keep a .doodle copy as the editable source of truth.',
      'Use Create diagram from data on the canvas feature toolbar to preview and turn up to 500 CSV or JSON records into editable cards. source/target, from/to, parent, and dependency fields create connectors automatically.',
    ],
  },
  {
    title: 'Collaborate with people',
    description: 'Share a live peer-to-peer room to work on a board together.',
    steps: [
      'Open Live Collaboration and host a room or join with a room ID shared by another participant. Grant the app network access if your operating system requests it.',
      'When connected, collaborators can see updates and cursor positions; use the session chat for messages. Follow a collaborator when you want to view the area they are working on.',
      'Use the collaboration controls to reconnect or leave the room. A room connection is for live sessions; save the board to your workspace/file as usual.',
    ],
  },
  {
    title: 'Customize Doodle Desk and find features',
    description: 'Preferences and the command palette are the fastest ways to tailor and discover tools.',
    steps: [
      'Open Preferences to adjust available app/editor settings and customize keyboard shortcuts. The exact options depend on the current application version.',
      'Press Ctrl+K (Cmd+K on macOS) and type a feature name to search actions. The palette includes tools, styles, templates, collaboration, search, quality checks, and export actions.',
      'Use the Help icon beside the theme button to return to this guide. Choose the Shortcuts tab in this window for drawing and editing key bindings.',
      'Doodle Desk is designed to work offline for local drawing and file workflows. Live collaboration requires a network connection to establish peer-to-peer sessions.',
    ],
  },
];

export function HelpModal({ isOpen, onClose, theme = 'dark' }) {
  const [activeTab, setActiveTab] = useState('guide');
  const [guideQuery, setGuideQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDark = theme === 'dark' || (theme !== 'light' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const prototypeShortcut = getShortcutBindings().openPrototypeLinks;
  const query = guideQuery.trim().toLocaleLowerCase();
  const visibleGuideSections = query
    ? guideSections.filter((section) => (
      `${section.title} ${section.description} ${section.steps.join(' ')}`.toLocaleLowerCase().includes(query)
    ))
    : guideSections;

  const toolsShortcuts = [
    { label: 'Hand (panning tool)', shortcut: <kbd className="doodle-help-kbd">H</kbd> },
    {
      label: 'Selection',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">V</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">1</kbd>
        </>
      ),
    },
    {
      label: 'Rectangle',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">R</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">2</kbd>
        </>
      ),
    },
    {
      label: 'Diamond',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">D</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">3</kbd>
        </>
      ),
    },
    {
      label: 'Ellipse',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">O</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">4</kbd>
        </>
      ),
    },
    {
      label: 'Arrow',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">A</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">5</kbd>
        </>
      ),
    },
    {
      label: 'Line',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">L</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">6</kbd>
        </>
      ),
    },
    {
      label: 'Draw',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">P</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">7</kbd>
        </>
      ),
    },
    {
      label: 'Text',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">T</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">8</kbd>
        </>
      ),
    },
    { label: 'Insert image', shortcut: <kbd className="doodle-help-kbd">9</kbd> },
    {
      label: 'Eraser',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">E</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">0</kbd>
        </>
      ),
    },
    { label: 'Frame tool', shortcut: <kbd className="doodle-help-kbd">F</kbd> },
    { label: 'Laser pointer', shortcut: <kbd className="doodle-help-kbd">K</kbd> },
    {
      label: 'Tech & Architecture Icon Library',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">I</kbd>
        </>
      ),
    },
    {
      label: 'Pick color from canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">I</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">S</kbd>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">G</kbd>
        </>
      ),
    },
    {
      label: 'Edit line/arrow points',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Enter</kbd>
        </>
      ),
    },
  ];

  const editorShortcuts = [
    ...(prototypeShortcut ? [{
      label: 'Open interactive prototype flows',
      shortcut: prototypeShortcut.split('+').map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          {index > 0 && <span className="doodle-help-connector">+</span>}
          <kbd className="doodle-help-kbd">{key}</kbd>
        </React.Fragment>
      )),
    }] : []),
    {
      label: 'Find & Replace on canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">F</kbd>
        </>
      ),
    },
    {
      label: 'Open layers (visibility, locking & order)',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Shift</kbd>
          <kbd className="doodle-help-kbd">L</kbd>
        </>
      ),
    },
    {
      label: 'Customize keyboard shortcuts',
      shortcut: <span>Preferences</span>,
    },
    {
      label: 'Group / ungroup selection',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">G</kbd>
          <span className="doodle-help-connector">/</span>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">G</kbd>
        </>
      ),
    },
    {
      label: 'Create a flowchart from a generic element',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Arrow Key</kbd>
        </>
      ),
    },
    {
      label: 'Navigate a flowchart',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Alt</kbd> <kbd className="doodle-help-kbd">Arrow Key</kbd>
        </>
      ),
    },
    {
      label: 'Move canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Space</kbd> <span className="doodle-help-connector">drag</span>
          <span className="doodle-help-connector">or</span>
          <kbd className="doodle-help-kbd">Wheel</kbd> <span className="doodle-help-connector">drag</span>
        </>
      ),
    },
    {
      label: 'Reset the canvas',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Delete</kbd>
        </>
      ),
    },
    { label: 'Delete', shortcut: <kbd className="doodle-help-kbd">Delete</kbd> },
    {
      label: 'Cut',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">X</kbd>
        </>
      ),
    },
    {
      label: 'Copy',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">C</kbd>
        </>
      ),
    },
    {
      label: 'Paste',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">V</kbd>
        </>
      ),
    },
    {
      label: 'Paste as plaintext',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">V</kbd>
        </>
      ),
    },
    {
      label: 'Select all',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">A</kbd>
        </>
      ),
    },
    {
      label: 'Add element to selection',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Shift</kbd> <span className="doodle-help-connector">click</span>
        </>
      ),
    },
    {
      label: 'Deep select',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <span className="doodle-help-connector">click</span>
        </>
      ),
    },
    {
      label: 'Deep select within box, and prevent dragging',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <span className="doodle-help-connector">drag</span>
        </>
      ),
    },
    {
      label: 'Copy to clipboard as PNG',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Shift</kbd> <kbd className="doodle-help-kbd">Alt</kbd> <kbd className="doodle-help-kbd">C</kbd>
        </>
      ),
    },
    {
      label: 'Copy styles',
      shortcut: (
        <>
          <kbd className="doodle-help-kbd">Ctrl</kbd> <kbd className="doodle-help-kbd">Alt</kbd> <kbd className="doodle-help-kbd">C</kbd>
        </>
      ),
    },
  ];

  return (
    <div
      className="doodle-help-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Modal Dialog Card */}
      <div
        className={`doodle-help-window ${isDark ? 'is-dark' : 'is-light'}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '980px',
          width: '92vw',
          height: 'min(760px, 90vh)',
          maxHeight: '90vh',
          background: isDark ? '#141416' : '#ffffff',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e4e4e7',
          borderRadius: '14px',
          boxShadow: isDark ? '0 24px 64px rgba(0, 0, 0, 0.85)' : '0 20px 48px rgba(0, 0, 0, 0.15)',
          padding: '22px 26px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          color: isDark ? '#f4f4f5' : '#18181b',
        }}
      >
        {/* Header Row: Title & Esc to close Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#18181b',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Doodle Desk Guide
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            style={{
              background: isDark ? '#222226' : '#f4f4f5',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 500,
              color: isDark ? '#a1a1aa' : '#71717a',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#2a2a30' : '#e4e4e7';
              e.currentTarget.style.color = isDark ? '#ffffff' : '#18181b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? '#222226' : '#f4f4f5';
              e.currentTarget.style.color = isDark ? '#a1a1aa' : '#71717a';
            }}
          >
            Esc to close
          </button>
        </div>

        {/* Subtitle: KEYBOARD SHORTCUTS in neutral gray (Zero Blue) */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#71717a',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
          }}
        >
          A practical guide to the tools and workflows in your app
        </div>

        <div className="doodle-guide-tabs" role="tablist" aria-label="Help topics">
          <button
            type="button"
            className={`doodle-guide-tab${activeTab === 'guide' ? ' is-active' : ''}`}
            id="doodle-guide-tab-guide"
            role="tab"
            aria-selected={activeTab === 'guide'}
            aria-controls="doodle-guide-panel"
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={14} /> User guide
          </button>
          <button
            type="button"
            className={`doodle-guide-tab${activeTab === 'shortcuts' ? ' is-active' : ''}`}
            id="doodle-guide-tab-shortcuts"
            role="tab"
            aria-selected={activeTab === 'shortcuts'}
            aria-controls="doodle-guide-panel"
            onClick={() => setActiveTab('shortcuts')}
          >
            Keyboard shortcuts
          </button>
        </div>

        {activeTab === 'guide' ? (
          <div className="doodle-guide-content" id="doodle-guide-panel" role="tabpanel" aria-labelledby="doodle-guide-tab-guide">
            <label className="doodle-guide-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={guideQuery}
                onChange={(event) => setGuideQuery(event.target.value)}
                placeholder="Search the guide, e.g. export, notes, frames..."
                aria-label="Search user guide"
              />
            </label>
            <div className="doodle-guide-sections">
              {visibleGuideSections.map((section, index) => (
                <details className="doodle-guide-section" key={section.title} open={index === 0 && !guideQuery.trim()}>
                  <summary>
                    <span>
                      <strong>{section.title}</strong>
                      <small>{section.description}</small>
                    </span>
                  </summary>
                  <ol>
                    {section.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </details>
              ))}
              {!visibleGuideSections.length && (
                <div className="doodle-guide-no-results">No guide topics match “{guideQuery}”. Try a tool or workflow name.</div>
              )}
            </div>
          </div>
        ) : (
        <div
          className="doodle-help-shortcuts-content"
          id="doodle-guide-panel"
          role="tabpanel"
          aria-labelledby="doodle-guide-tab-shortcuts"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.35fr',
            gap: '14px',
            alignItems: 'start',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Column 1: TOOLS */}
          <div
            style={{
              background: isDark ? '#18181b' : '#f8f8fa',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e4e4e7',
              borderRadius: '10px',
              padding: '16px 18px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#71717a',
                marginBottom: '12px',
              }}
            >
              TOOLS
            </div>
            <div>
              {toolsShortcuts.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12.5px',
                      color: isDark ? '#d4d4d8' : '#3f3f46',
                      fontWeight: 400,
                    }}
                  >
                    {s.label}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {s.shortcut}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: EDITOR */}
          <div
            className="doodle-help-editor-card"
            style={{
              background: isDark ? '#18181b' : '#f8f8fa',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e4e4e7',
              borderRadius: '10px',
              padding: '16px 14px 16px 18px',
              maxHeight: '520px',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#71717a',
                marginBottom: '12px',
              }}
            >
              EDITOR
            </div>
            <p style={{
              margin: '0 0 8px',
              fontSize: '11px',
              color: isDark ? '#a1a1aa' : '#71717a',
            }}>
              Shortcuts can be reassigned in Preferences. Locked objects cannot be edited on the canvas.
            </p>
            <div style={{ paddingRight: '4px' }}>
              {editorShortcuts.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12.5px',
                      color: isDark ? '#d4d4d8' : '#3f3f46',
                      fontWeight: 400,
                    }}
                  >
                    {s.label}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    {s.shortcut}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

      <style>{`
        .doodle-help-editor-card::-webkit-scrollbar {
          width: 5px;
        }
        .doodle-help-editor-card::-webkit-scrollbar-track {
          background: transparent;
        }
        .doodle-help-editor-card::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .doodle-help-editor-card::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }

        .doodle-help-kbd {
          background: #27272a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          padding: 2px 7px;
          font-size: 11px;
          font-weight: 600;
          color: #ffffff;
          font-family: inherit;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 20px;
          line-height: 16px;
          box-sizing: border-box;
        }

        .doodle-help-connector {
          font-size: 11px;
          color: #71717a;
          font-weight: 400;
          margin: 0 4px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      </div>
    </div>
  );
}

export default HelpModal;
