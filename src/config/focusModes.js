/**
 * focusModes.js
 * Preset persona configurations for Doodle Desk.
 * Allows instant adaptation to Architect, Teacher, Developer, Designer, or Researcher workflows.
 */

export const FOCUS_MODES = {
  ARCHITECT: {
    id: 'architect',
    title: 'Architect',
    tagline: 'High-level systems modeling & ADR synthesis',
    canvasStyle: 'blueprint',
    accentColor: '#10b981',
    visibleTools: ['components', 'connectors', 'frames', 'adr', 'topology', 'cql'],
    keyShortcuts: [
      { key: 'Shift+A', action: 'Auto-Layout DAG' },
      { key: 'Ctrl+Shift+D', action: 'Insert Decision Frame' },
      { key: 'Ctrl+Shift+F', action: 'Open CQL Query Bar' },
    ],
  },
  TEACHER: {
    id: 'teacher',
    title: 'Teacher',
    tagline: 'Visual pedagogy, interactive flashcards & presentations',
    canvasStyle: 'parchment',
    accentColor: '#f59e0b',
    visibleTools: ['flashcards', 'tables', 'stickyNotes', 'presentation', 'laser'],
    keyShortcuts: [
      { key: 'N', action: 'New Sticky Note' },
      { key: 'F', action: 'Study Flashcard Deck' },
      { key: 'K', action: 'Toggle Laser Pointer' },
    ],
  },
  DEVELOPER: {
    id: 'developer',
    title: 'Developer',
    tagline: 'Code scratchpads, math graphs & formal specifications',
    canvasStyle: 'engineeringDark',
    accentColor: '#10b981',
    visibleTools: ['codeScratchpad', 'mathGraph', 'formalSpecs', 'simulation', 'cql'],
    keyShortcuts: [
      { key: 'Ctrl+E', action: 'Evaluate Scratchpad' },
      { key: 'Shift+M', action: 'Plot Math Formula' },
      { key: 'Ctrl+K', action: 'Command Palette' },
    ],
  },
  DESIGNER: {
    id: 'designer',
    title: 'Designer',
    tagline: 'Wireframes, color palettes & prototype players',
    canvasStyle: 'standard',
    accentColor: '#ec4899',
    visibleTools: ['palette', 'stencils', 'prototypePlayer', 'wireframeToCode'],
    keyShortcuts: [
      { key: 'Shift+C', action: 'Color Swatches' },
      { key: 'Alt+P', action: 'Play Prototype' },
      { key: 'B', action: 'Bucket Fill' },
    ],
  },
  RESEARCHER: {
    id: 'researcher',
    title: 'Researcher',
    tagline: 'Active knowledge graphs, citations & semantic search',
    canvasStyle: 'dotGrid',
    accentColor: '#8b5cf6',
    visibleTools: ['knowledgeGraph', 'multiView', 'cql', 'pdfCards', 'citations'],
    keyShortcuts: [
      { key: 'Shift+K', action: 'Knowledge Constellation' },
      { key: 'Ctrl+Shift+F', action: 'Canvas Query Language' },
      { key: 'Ctrl+Shift+M', action: 'Multi-View Table/Graph' },
    ],
  },
};
