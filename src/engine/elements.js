// Element ID generator
import { getBoundsFromPoints } from './math/geometry.js';

let _idCounter = Date.now();
export function generateId() {
  return (++_idCounter).toString(36) + Math.random().toString(36).slice(2, 8);
}

// Version nonce generator
export function versionNonce() {
  return Math.floor(Math.random() * 1000000000);
}

// Deep clone an element
export function cloneElement(el, overrides = {}) {
  return { ...el, ...overrides, id: generateId(), version: 1, versionNonce: versionNonce() };
}

// All font families
export const FONT_FAMILY = {
  Doodlefont: 5,
  Nunito: 6,
  'Comic Shanns': 7,
  Hand: 8,
  Virgil: 3,
  Cascadia: 2,
  Helvetica: 1,
};

export const FONT_SIZE_DEFAULT = 20;

// Default stroke colors
export const STROKE_COLORS = [
  '#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00',
  '#9c36b5', '#c2255c', '#099268', '#e8590c', '#5c7cfa',
];

export const BG_COLORS = [
  'transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99',
  '#eebefa', '#ffa8a8', '#96f2d7', '#ffd8a8', '#bac8ff',
];

// Stroke widths (1=thin, 2=bold, 3=extra-bold)
export const STROKE_WIDTHS = { 1: 1.5, 2: 2.5, 3: 4 };

// Element types
export const ELEMENT_TYPES = {
  SELECTION: 'selection',
  RECTANGLE: 'rectangle',
  ELLIPSE: 'ellipse',
  DIAMOND: 'diamond',
  ARROW: 'arrow',
  LINE: 'line',
  FREEDRAW: 'freedraw',
  TEXT: 'text',
  IMAGE: 'image',
  FRAME: 'frame',
  IFRAME: 'iframe',
};

// Default element properties
export function defaultElementProps() {
  return {
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'hachure', // hachure | cross-hatch | solid | none
    strokeWidth: 2,
    strokeStyle: 'solid', // solid | dashed | dotted
    roughness: 1,
    roundness: 'round',
    opacity: 100,
    angle: 0,
    version: 1,
    versionNonce: versionNonce(),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    updated: Date.now(),
    link: null,
  };
}

// Create a new element
export function createElement(type, x, y, width = 0, height = 0, extraProps = {}) {
  return {
    ...defaultElementProps(),
    id: generateId(),
    type,
    x,
    y,
    width,
    height,
    seed: Math.floor(Math.random() * 100000),
    ...extraProps,
  };
}

// Create a text element
export function createTextElement(x, y, text = '', extraProps = {}) {
  return createElement(ELEMENT_TYPES.TEXT, x, y, 0, 0, {
    text,
    fontSize: FONT_SIZE_DEFAULT,
    fontFamily: FONT_FAMILY.Doodlefont,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: text,
    lineHeight: 1.25,
    ...extraProps,
  });
}

// Create an arrow/line element
export function createLinearElement(type, x1, y1, x2, y2, extraProps = {}) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return createElement(type, x, y, Math.abs(x2 - x1), Math.abs(y2 - y1), {
    points: [[x1 - x, y1 - y], [x2 - x, y2 - y]],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: type === ELEMENT_TYPES.ARROW ? 'arrow' : null,
    ...extraProps,
  });
}

// Create a freedraw element
export function createFreedrawElement(x, y, points, extraProps = {}) {
  return createElement(ELEMENT_TYPES.FREEDRAW, x, y, 0, 0, {
    points,
    pressures: [],
    simulatePressure: true,
    lastCommittedPoint: null,
    ...extraProps,
  });
}

export function normalizeFreedrawElement(el) {
  if (!el || el.type !== ELEMENT_TYPES.FREEDRAW || !el.points?.length) return el;
  const bounds = getBoundsFromPoints(el.points);
  return {
    ...el,
    x: el.x + bounds.x,
    y: el.y + bounds.y,
    width: bounds.width,
    height: bounds.height,
    points: el.points.map(([px, py]) => [px - bounds.x, py - bounds.y]),
  };
}

// Normalize element (ensure correct width/height sign)
export function normalizeElement(el) {
  if (el.width < 0 || el.height < 0) {
    return {
      ...el,
      x: el.width < 0 ? el.x + el.width : el.x,
      y: el.height < 0 ? el.y + el.height : el.y,
      width: Math.abs(el.width),
      height: Math.abs(el.height),
    };
  }
  return el;
}

// Serialize the scene to JSON (Doodle format)
export function serializeAsJSON(elements, appState, files = {}) {
  return JSON.stringify({
    type: 'doodle',
    version: 2,
    source: 'https://doodledesk.app',
    elements: elements.filter(el => !el.isDeleted),
    appState: {
      gridSize: appState.gridSize || null,
      viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
      theme: appState.theme || 'light',
    },
    files,
  }, null, 2);
}
