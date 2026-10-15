import React, {
  lazy, Suspense, useRef, useEffect, useCallback, useMemo, useState, useImperativeHandle, forwardRef
} from 'react';
import { renderElement, renderSelectionOverlay, measureText } from './renderer/render.js';
import {
  getElementAtPoint, getElementsInRect, isPointOnFrameLabel,
  getResizeHandleAt, getCursorForHandle, RESIZE_HANDLES
} from './hitTest.js';
import {
  ELEMENT_TYPES, createElement, createTextElement, createLinearElement,
  createFreedrawElement, cloneElement, cloneElementSet, normalizeElement, normalizeFreedrawElement,
  FONT_FAMILY, FONT_SIZE_DEFAULT, serializeAsJSON, generateId, versionNonce
} from './elements.js';
import { HistoryManager } from './history.js';
import {
  boundsIntersectViewport, getCachedElementBounds, getCommonBounds, getElementBounds, getBoundsFromPoints, rotatePoint,
  getElementCenter, snapToGrid, distance
} from './math/geometry.js';
import { TopToolbar } from './components/TopToolbar.jsx';
import { PropertiesPanel } from './components/PropertiesPanel.jsx';
import { FooterLeft } from './components/FooterLeft.jsx';
import { exportToBlob, exportToSvg } from './io/export.js';
import { BookOpen, Box, CirclePlay, GitCompareArrows, HelpCircle, Layers as LayersIcon, PanelTop } from 'lucide-react';
import { findShortcutAction, getShortcutBindings } from './keyboardShortcuts.js';
import { buildSimulationGraph, getSimulationChoices } from './simulation.js';
import {
  clearChangeSnapshot,
  compareSceneToSnapshot,
  createChangeSnapshot,
  readChangeSnapshot,
  writeChangeSnapshot,
} from './changeTracking.js';
import {
  createSmartComponent,
  instantiateSmartComponent,
  readSmartComponents,
  updateSmartComponentInstances,
  writeSmartComponents,
} from './components/smartComponents.js';
import { adaptDefaultStrokeColors } from './themeColors.js';
import { drawDotGrid } from './renderer/paperGrid.js';

const CanvasContextMenu = lazy(() => import('./components/CanvasContextMenu.jsx').then(module => ({ default: module.CanvasContextMenu })));
const LayersPanel = lazy(() => import('./components/LayersPanel.jsx').then(module => ({ default: module.LayersPanel })));
const SmartComponentsPanel = lazy(() => import('./components/SmartComponentsPanel.jsx').then(module => ({ default: module.SmartComponentsPanel })));
const BoardPortalPanel = lazy(() => import('./components/BoardPortalPanel.jsx').then(module => ({ default: module.BoardPortalPanel })));
const SimulationPanel = lazy(() => import('./components/SimulationPanel.jsx').then(module => ({ default: module.SimulationPanel })));
const ChangeTrackingPanel = lazy(() => import('./components/ChangeTrackingPanel.jsx').then(module => ({ default: module.ChangeTrackingPanel })));

// ──────────────────────────────────────────────
//  Tool → cursor mapping
// ──────────────────────────────────────────────
const TOOL_CURSORS = {
  selection: 'default',
  hand: 'grab',
  rectangle: 'crosshair',
  ellipse: 'crosshair',
  diamond: 'crosshair',
  arrow: 'crosshair',
  line: 'crosshair',
  freedraw: 'crosshair',
  text: 'text',
  image: 'crosshair',
  frame: 'crosshair',
  embeddable: 'crosshair',
  eraser: 'cell',
  laser: 'none',
};

// ──────────────────────────────────────────────
//  Helper: apply grid snap
// ──────────────────────────────────────────────
function snap(v, gridSize) {
  return gridSize ? snapToGrid(v, gridSize) : v;
}

// ──────────────────────────────────────────────
//  DoodleCanvas — main component
// ──────────────────────────────────────────────
const DoodleCanvas = forwardRef(function DoodleCanvas(props, ref) {
  const {
    theme = 'light',
    canvasStyle = 'standard',
    onChange,
    onToast,
    onSelectionChange,
    onPointerUpdate,
    onLinkOpen,
    isPrototypeMode = false,
    renderEmbeddable,
    isDrawToShapeActive = false,
    onFreeDrawCommit,
    initialData,
    UIOptions,
    isCollaborating = false,
    collaborators,
    onOpenColorPalette,
    onNavigateBoardPortal,
    workspaces = [],
    workspaceId,
    fileId,
    children,
  } = props;

  // ── State ──
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const renderRef = useRef(null);
  const imageCache = useRef({});
  const dotGridPatternCache = useRef(null);
  const canvasDprRef = useRef(0);
  const pendingPanRef = useRef({ x: 0, y: 0, frame: null });
  const pendingWheelRef = useRef({
    x: 0,
    y: 0,
    zoomFactor: 1,
    anchor: null,
    frame: null,
  });

  const [elements, setElementsState] = useState(() => initialData?.elements || []);
  const [frameNameEdit, setFrameNameEdit] = useState(null);
  const frameNameInputRef = useRef(null);
  const cancelFrameNameEditRef = useRef(false);
  const [appState, setAppStateRaw] = useState(() => ({
    viewBackgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
    scrollX: 0,
    scrollY: 0,
    gridSize: null,
    activeTool: { type: 'selection' },
    selectedElementIds: {},
    selectedGroupIds: {},
    editingElement: null,
    currentItemStrokeColor: theme === 'dark' ? '#ffffff' : '#1e1e1e',
    currentItemBackgroundColor: 'transparent',
    currentItemFillStyle: 'hachure',
    currentItemStrokeWidth: 2,
    currentItemStrokeStyle: 'solid',
    currentItemRoughness: 1,
    currentItemOpacity: 100,
    currentItemFontSize: FONT_SIZE_DEFAULT,
    currentItemFontFamily: FONT_FAMILY.Doodlefont,
    currentItemTextAlign: 'left',
    currentItemStartArrowhead: null,
    currentItemEndArrowhead: 'arrow',
    zenModeEnabled: false,
    showWelcomeScreen: !initialData?.elements?.length,
    name: initialData?.appState?.name || 'Untitled Doodle',
    openSidebar: null,
    theme,
    ...initialData?.appState,
    zoom: initialData?.appState?.zoom?.value !== undefined
      ? initialData.appState.zoom
      : (typeof initialData?.appState?.zoom === 'number'
        ? { value: initialData.appState.zoom }
        : { value: 1 }),
  }));
  const [files, setFiles] = useState(initialData?.files || {});
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isComponentsPanelOpen, setIsComponentsPanelOpen] = useState(false);
  const [smartComponents, setSmartComponents] = useState([]);
  const [isPortalPanelOpen, setIsPortalPanelOpen] = useState(false);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationCurrentId, setSimulationCurrentId] = useState(null);
  const [simulationPath, setSimulationPath] = useState([]);
  const [changeSnapshot, setChangeSnapshot] = useState(null);
  const [isChangeTrackingOpen, setIsChangeTrackingOpen] = useState(false);
  const [isToolLocked, setIsToolLocked] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuStylesAvailable, setContextMenuStylesAvailable] = useState(false);
  const isToolLockedRef = useRef(false);
  isToolLockedRef.current = isToolLocked;

  // Refs to avoid stale closures in event handlers
  const elementsRef = useRef(elements);
  const appStateRef = useRef(appState);
  const filesRef = useRef(files);
  elementsRef.current = elements;
  appStateRef.current = appState;
  filesRef.current = files;

  const collaboratorsRef = useRef(new Map());

  const historyRef = useRef(new HistoryManager());
  const timeMachineOriginalRef = useRef(null);

  useEffect(() => {
    setIsSimulationActive(false);
    setSimulationCurrentId(null);
    setSimulationPath([]);
    setIsPortalPanelOpen(false);
    setIsChangeTrackingOpen(false);
    try {
      setChangeSnapshot(readChangeSnapshot(workspaceId, fileId));
    } catch (error) {
      console.error('Unable to load board change tracking baseline', error);
      setChangeSnapshot(null);
      window.alert(`Could not load this board's change baseline: ${error.message}`);
    }
  }, [workspaceId, fileId]);

  // Interaction state (NOT React state for perf — updated via refs)
  const interaction = useRef({
    isDragging: false,
    isPanning: false,
    isDrawing: false,
    isResizing: false,
    isRotating: false,
    isSelectingRect: false,
    isTextEditing: false,
    tool: 'selection',
    dragStartX: 0, dragStartY: 0,
    dragLastX: 0, dragLastY: 0,
    drawingElement: null,
    resizeHandle: null,
    resizeStartState: null,
    selectionRect: null,
    textInput: null,
    editingElementId: null,
    lassoPoints: [],
    isLassoActive: false,
    spaceDown: false,
    hasAltDuplicated: false,
    dragStartPositions: null,
  });

  // ── Setters ──
  const setElements = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(elementsRef.current) : updater;
    elementsRef.current = next;
    setElementsState(next);
  }, []);

  const setAppState = useCallback((updater) => {
    const patch = typeof updater === 'function' ? updater(appStateRef.current) : updater;
    const previousSelection = appStateRef.current?.selectedElementIds || {};
    const hasSelectionPatch = patch?.selectedElementIds !== undefined;
    const next = {
      ...appStateRef.current,
      ...patch,
      selectedElementIds: (patch && patch.selectedElementIds !== undefined)
        ? (patch.selectedElementIds || {})
        : (appStateRef.current?.selectedElementIds || {}),
    };
    appStateRef.current = next;
    setAppStateRaw(next);
    if (hasSelectionPatch) {
      const nextIds = Object.keys(next.selectedElementIds);
      const previousIds = Object.keys(previousSelection);
      if (nextIds.length !== previousIds.length || nextIds.some((id) => !previousSelection[id])) {
        onSelectionChange?.(next.selectedElementIds);
      }
    }
  }, [onSelectionChange]);

  // ── Derived helpers ──
  const getSelectedElements = useCallback(() => {
    const ids = appStateRef.current?.selectedElementIds || {};
    return elementsRef.current.filter(el => ids[el.id] && !el.isDeleted && !el.isHidden && !el.locked);
  }, []);

  const commitHistory = useCallback(() => {
    historyRef.current.record(elementsRef.current);
  }, []);

  const notifyChange = useCallback(() => {
    if (onChange) onChange(elementsRef.current, appStateRef.current);
  }, [onChange]);

  // ── Coordinate transforms ──
  const canvasToScene = useCallback((cx, cy) => {
    const { zoom, scrollX = 0, scrollY = 0 } = appStateRef.current || {};
    const z = zoom?.value || (typeof zoom === 'number' ? zoom : 1);
    return [(cx - (scrollX || 0)) / z, (cy - (scrollY || 0)) / z];
  }, []);

  const sceneBoundsToCanvas = useCallback((sx, sy) => {
    const { zoom, scrollX = 0, scrollY = 0 } = appStateRef.current || {};
    const z = zoom?.value || (typeof zoom === 'number' ? zoom : 1);
    return [sx * z + (scrollX || 0), sy * z + (scrollY || 0)];
  }, []);

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }, []);

  const getScenePoint = useCallback((e) => {
    const [cx, cy] = getCanvasPoint(e);
    return canvasToScene(cx, cy);
  }, [canvasToScene, getCanvasPoint]);

  // ── Rendering ──
  const render = useCallback((renderCanvasStyle = canvasStyle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { zoom, scrollX, scrollY, viewBackgroundColor, gridSize } = appStateRef.current || {};
    const selectedElementIds = appStateRef.current?.selectedElementIds || {};
    const z = zoom?.value || 1;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // ── 1. Determine Background Color by canvasStyle ──
    let bg = viewBackgroundColor || (theme === 'dark' ? '#121212' : '#ffffff');
    if (renderCanvasStyle === 'blueprint') {
      bg = '#0c1b33';
    } else if (renderCanvasStyle === 'dotgrid') {
      bg = theme === 'dark' ? '#141416' : '#f8fafc';
    } else if (renderCanvasStyle === 'isometric') {
      bg = theme === 'dark' ? '#121215' : '#ffffff';
    } else if (renderCanvasStyle === 'parchment') {
      bg = '#fbf7ee';
    } else if (renderCanvasStyle === 'engineering') {
      bg = '#111215';
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssW, cssH);

    // ── 2. Render Canvas Paper & Grid System ──
    if (renderCanvasStyle === 'blueprint') {
      ctx.save();
      const step = 20 * z;
      const majorStep = 100 * z;
      const startX = ((scrollX % step) + cssW) % step;
      const startY = ((scrollY % step) + cssH) % step;

      // Minor blueprint lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.beginPath();
      for (let gx = startX; gx < cssW; gx += step) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = startY; gy < cssH; gy += step) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();

      // Major blueprint lines
      const majorStartX = ((scrollX % majorStep) + cssW) % majorStep;
      const majorStartY = ((scrollY % majorStep) + cssH) % majorStep;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      for (let gx = majorStartX; gx < cssW; gx += majorStep) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = majorStartY; gy < cssH; gy += majorStep) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();
      ctx.restore();
    } else if (renderCanvasStyle === 'dotgrid') {
      ctx.save();
      drawDotGrid(ctx, {
        width: cssW,
        height: cssH,
        zoom: z,
        scrollX,
        scrollY,
        theme,
        patternCache: dotGridPatternCache,
      });
      ctx.restore();
    } else if (renderCanvasStyle === 'isometric') {
      ctx.save();
      // Equilateral isometric 30° / 150° / 90° technical grid
      const dy = 20 * z;
      const dx = dy * Math.sqrt(3);
      ctx.lineWidth = 1;
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

      const startX = ((scrollX % dx) + dx * 2) % dx;
      ctx.beginPath();
      // Vertical grid lines
      for (let gx = startX; gx < cssW; gx += dx) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }

      // 30° and 150° diagonals (slope m = 1/√3 = dy/dx)
      const slope = dy / dx;
      const diagSpan = cssW * slope;
      const stepDiag = dy * 2;
      const offsetDiag = (((scrollY - scrollX * slope) % stepDiag) + stepDiag) % stepDiag;

      for (let c = offsetDiag - diagSpan - stepDiag; c < cssH + diagSpan + stepDiag; c += stepDiag) {
        // Line y = slope * x + c
        ctx.moveTo(0, c);
        ctx.lineTo(cssW, slope * cssW + c);
      }

      const offsetDiagNeg = (((scrollY + scrollX * slope) % stepDiag) + stepDiag) % stepDiag;
      for (let c = offsetDiagNeg - diagSpan - stepDiag; c < cssH + diagSpan + stepDiag; c += stepDiag) {
        // Line y = -slope * x + c
        ctx.moveTo(0, c);
        ctx.lineTo(cssW, -slope * cssW + c);
      }
      ctx.stroke();
      ctx.restore();
    } else if (renderCanvasStyle === 'parchment') {
      ctx.save();
      const step = 20 * z;
      const startX = ((scrollX % step) + cssW) % step;
      const startY = ((scrollY % step) + cssH) % step;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.12)';
      ctx.beginPath();
      for (let gx = startX; gx < cssW; gx += step) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = startY; gy < cssH; gy += step) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();

      // Major parchment lines
      const majorStep = 100 * z;
      const majorStartX = ((scrollX % majorStep) + cssW) % majorStep;
      const majorStartY = ((scrollY % majorStep) + cssH) % majorStep;
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.22)';
      ctx.beginPath();
      for (let gx = majorStartX; gx < cssW; gx += majorStep) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = majorStartY; gy < cssH; gy += majorStep) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();
      ctx.restore();
    } else if (renderCanvasStyle === 'engineering') {
      ctx.save();
      const step = 20 * z;
      const majorStep = 100 * z;
      const startX = ((scrollX % step) + cssW) % step;
      const startY = ((scrollY % step) + cssH) % step;

      // CAD Green minor lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.13)';
      ctx.beginPath();
      for (let gx = startX; gx < cssW; gx += step) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = startY; gy < cssH; gy += step) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();

      // CAD Green major lines
      const majorStartX = ((scrollX % majorStep) + cssW) % majorStep;
      const majorStartY = ((scrollY % majorStep) + cssH) % majorStep;
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.30)';
      ctx.beginPath();
      for (let gx = majorStartX; gx < cssW; gx += majorStep) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = majorStartY; gy < cssH; gy += majorStep) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();
      ctx.restore();
    } else if (gridSize) {
      // Standard grid if gridSize is set
      ctx.save();
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      const startX = ((scrollX % (gridSize * z)) + cssW) % (gridSize * z);
      const startY = ((scrollY % (gridSize * z)) + cssH) % (gridSize * z);
      ctx.beginPath();
      for (let gx = startX; gx < cssW; gx += gridSize * z) {
        ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH);
      }
      for (let gy = startY; gy < cssH; gy += gridSize * z) {
        ctx.moveTo(0, gy); ctx.lineTo(cssW, gy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Transform to scene space
    ctx.save();
    ctx.translate(scrollX, scrollY);
    ctx.scale(z, z);

    const viewport = {
      x: -scrollX / z,
      y: -scrollY / z,
      width: cssW / z,
      height: cssH / z,
    };
    const viewportPadding = 32 + 48 / z;
    const selectedEls = [];

    // Skip off-screen elements before drawing their paths or fills.
    for (const el of elementsRef.current) {
      if (el.isDeleted || el.isHidden) continue;
      // While editing, the DOM textarea is the visible text layer. Do not
      // paint the same text to canvas underneath it.
      if (el.id === interaction.current.editingElementId) continue;
      const bounds = getCachedElementBounds(el);
      if (!boundsIntersectViewport(bounds, viewport, viewportPadding)) continue;
      renderElement(ctx, el, imageCache.current);
      if (selectedElementIds[el.id] && !el.locked) selectedEls.push(el);
    }

    // Render in-progress drawing element
    const drawing = interaction.current.drawingElement;
    if (drawing) renderElement(ctx, drawing, imageCache.current);

    // Selection rect
    const selRect = interaction.current.selectionRect;
    if (selRect) {
      ctx.strokeStyle = '#111111';
      ctx.fillStyle = 'rgba(105,101,219,0.08)';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.fillRect(selRect.x, selRect.y, selRect.width, selRect.height);
      ctx.strokeRect(selRect.x, selRect.y, selRect.width, selRect.height);
      ctx.setLineDash([]);
    }

    // Selection overlays
    if (selectedEls.length > 0) {
      renderSelectionOverlay(ctx, selectedEls, z);
    }

    // Smart Magnetic Alignment Guides
    const guides = interaction.current.alignmentGuides;
    if (guides && guides.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      for (const g of guides) {
        ctx.beginPath();
        if (g.type === 'vertical') {
          ctx.moveTo(g.x, g.y1);
          ctx.lineTo(g.x, g.y2);
        } else {
          ctx.moveTo(g.x1, g.y);
          ctx.lineTo(g.x2, g.y);
        }
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = '#f43f5e';
        const ms = 3 / z;
        if (g.type === 'vertical') {
          ctx.fillRect(g.x - ms, (g.y1 + g.y2) / 2 - ms, ms * 2, ms * 2);
        } else {
          ctx.fillRect((g.x1 + g.x2) / 2 - ms, g.y - ms, ms * 2, ms * 2);
        }
        ctx.setLineDash([4 / z, 3 / z]);
      }
      ctx.restore();
    }

    // Collaborator cursors & live badges
    const activeCollabs = (collaborators && (collaborators instanceof Map ? collaborators.size : Object.keys(collaborators).length))
      ? collaborators
      : collaboratorsRef.current;

    if (activeCollabs && (activeCollabs.size > 0 || (typeof activeCollabs === 'object' && Object.keys(activeCollabs).length > 0))) {
      const collabsList = activeCollabs instanceof Map
        ? Array.from(activeCollabs.values())
        : Object.values(activeCollabs);

      collabsList.forEach((collab) => {
        if (!collab || !collab.pointer) return;
        const cx = collab.pointer.x;
        const cy = collab.pointer.y;
        if (typeof cx !== 'number' || typeof cy !== 'number') return;
        const color = collab.color || '#111111';

        ctx.save();

        // 1. If clicking (button === 'down'), draw click ripple
        if (collab.button === 'down') {
          ctx.beginPath();
          ctx.arc(cx, cy, 14 / z, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.25;
          ctx.fill();
        }

        // 2. Sleek pointer cursor arrow
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2 / z;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 4 / z, cy + 16 / z);
        ctx.lineTo(cx + 8 / z, cy + 12 / z);
        ctx.lineTo(cx + 14 / z, cy + 12 / z);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Name pill
        if (collab.username) {
          const fontSize = Math.max(10, Math.min(13, 11 / z));
          ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          const textMetrics = ctx.measureText(collab.username);
          const badgeW = textMetrics.width + 12 / z;
          const badgeH = 18 / z;
          const badgeX = cx + 12 / z;
          const badgeY = cy + 12 / z;

          ctx.fillStyle = color;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / z);
          else ctx.rect(badgeX, badgeY, badgeW, badgeH);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(collab.username, badgeX + badgeW / 2, badgeY + badgeH / 2);
        }

        ctx.restore();
      });
    }

    ctx.restore();
  }, [theme, collaborators, canvasStyle]);
  renderRef.current = render;

  // Schedule render via RAF
  const scheduleRender = useCallback(() => {
    if (animRef.current) return;
    animRef.current = requestAnimationFrame(() => {
      animRef.current = null;
      render();
    });
  }, [render]);

  const beginFrameNameEdit = useCallback((frame) => {
    if (!frame || frame.locked) return;
    setAppState({ selectedElementIds: { [frame.id]: true } });
    setFrameNameEdit({ id: frame.id, draft: frame.name || 'Frame' });
  }, [setAppState]);

  const commitFrameNameEdit = useCallback(() => {
    if (!frameNameEdit) return;
    const frame = elementsRef.current.find(element => element.id === frameNameEdit.id);
    const name = frameNameEdit.draft.trim();
    setFrameNameEdit(null);
    if (!frame) return;
    if (!name) {
      onToast?.('Frame name cannot be empty.');
      return;
    }
    if (name === frame.name) return;
    commitHistory();
    setElements(prev => prev.map(element =>
      element.id === frame.id
        ? { ...element, name, version: (element.version || 1) + 1, versionNonce: versionNonce() }
        : element
    ));
    notifyChange();
    scheduleRender();
    onToast?.(`Renamed frame to “${name}”.`);
  }, [frameNameEdit, commitHistory, setElements, notifyChange, scheduleRender, onToast]);

  useEffect(() => {
    if (!frameNameEdit || !frameNameInputRef.current) return;
    frameNameInputRef.current.focus();
    frameNameInputRef.current.select();
  }, [frameNameEdit?.id]);

  const flushPan = useCallback(() => {
    const pending = pendingPanRef.current;
    if (pending.frame !== null) {
      cancelAnimationFrame(pending.frame);
      pending.frame = null;
    }
    const { x, y } = pending;
    pending.x = 0;
    pending.y = 0;
    if (x === 0 && y === 0) return;
    setAppState(prev => ({
      scrollX: prev.scrollX + x,
      scrollY: prev.scrollY + y,
    }));
    scheduleRender();
  }, [scheduleRender, setAppState]);

  // ── Canvas resize ──
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const pixelWidth = Math.round(w * dpr);
    const pixelHeight = Math.round(h * dpr);
    const cssWidth = `${w}px`;
    const cssHeight = `${h}px`;
    const dimensionsChanged = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
    if (!dimensionsChanged && canvas.style.width === cssWidth &&
        canvas.style.height === cssHeight && canvasDprRef.current === dpr) {
      return;
    }
    if (dimensionsChanged) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    canvas.style.width = cssWidth;
    canvas.style.height = cssHeight;
    canvasDprRef.current = dpr;
    scheduleRender();
  }, [scheduleRender]);

  useEffect(() => {
    resizeCanvas();
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const observer = new ResizeObserver(resizeCanvas);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [resizeCanvas]);

  useEffect(() => { scheduleRender(); }, [elements, appState, canvasStyle, scheduleRender]);

  useEffect(() => () => {
    if (pendingPanRef.current.frame !== null) {
      cancelAnimationFrame(pendingPanRef.current.frame);
    }
    if (pendingWheelRef.current.frame !== null) {
      cancelAnimationFrame(pendingWheelRef.current.frame);
    }
  }, []);

  // Sync collaborators with collaboratorsRef and redraw
  useEffect(() => {
    if (collaborators) {
      if (collaborators instanceof Map) {
        collaboratorsRef.current = new Map(collaborators);
      } else if (typeof collaborators === 'object') {
        collaboratorsRef.current = new Map(Object.entries(collaborators));
      }
      scheduleRender();
    }
  }, [collaborators, scheduleRender]);

  // Sync files with image cache
  useEffect(() => {
    Object.entries(files).forEach(([id, fileData]) => {
      if (fileData?.dataURL && !imageCache.current[id]) {
        const img = new Image();
        img.src = fileData.dataURL;
        img.onload = () => scheduleRender();
        imageCache.current[id] = img;
      }
    });
  }, [files, scheduleRender]);

  // ── Pointer events ──
  const onPointerDown = useCallback((e) => {
    if (isSimulationActive) return;
    if (isPrototypeMode) {
      if (e.button === 0) {
        e.preventDefault();
        const [sceneX, sceneY] = getScenePoint(e);
        const hit = getElementAtPoint(elementsRef.current, sceneX, sceneY, { includeLocked: true });
        const linkedContainer = hit?.containerId
          ? elementsRef.current.find((element) => element.id === hit.containerId && !element.isDeleted && element.link)
          : null;
        const linkedFrame = hit?.frameId
          ? elementsRef.current.find((element) => element.id === hit.frameId && element.type === 'frame' && !element.isDeleted && !element.isHidden && element.link)
          : null;
        const linkTarget = hit?.link ? hit : linkedContainer || linkedFrame;
        if (linkTarget) onLinkOpen?.(linkTarget, e);
      }
      return;
    }
    // Capture pointer to ensure smooth drag gestures across the whole window
    canvasRef.current?.setPointerCapture?.(e.pointerId);

    if (e.button === 1 || (e.button === 0 && interaction.current.spaceDown)) {
      // Middle-click or Space+drag = pan
      interaction.current.isPanning = true;
      interaction.current.dragLastX = e.clientX;
      interaction.current.dragLastY = e.clientY;
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }
    if (e.button !== 0) return;

    const [sx, sy] = getScenePoint(e);
    const as = appStateRef.current;
    const tool = as.activeTool?.type || 'selection';
    const gridSize = as.gridSize;
    const ix = snap(sx, gridSize);
    const iy = snap(sy, gridSize);

    if (as.showWelcomeScreen) {
      setAppState({ showWelcomeScreen: false });
    }

    interaction.current.dragStartX = ix;
    interaction.current.dragStartY = iy;
    interaction.current.dragLastX = e.clientX;
    interaction.current.dragLastY = e.clientY;

    if (tool === 'hand') {
      interaction.current.isPanning = true;
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    if (tool === 'selection') {
      // Check resize handles first
      const selectedEls = getSelectedElements();
      if (selectedEls.length === 1) {
        const handle = getResizeHandleAt(selectedEls[0], sx, sy, as.zoom.value);
        if (handle) {
          if (handle === RESIZE_HANDLES.ROTATION) {
            interaction.current.isRotating = true;
            interaction.current.resizeHandle = handle;
            interaction.current.resizeStartState = selectedEls[0].type === ELEMENT_TYPES.FREEDRAW
              ? normalizeFreedrawElement(selectedEls[0])
              : { ...selectedEls[0] };
          } else {
            interaction.current.isResizing = true;
            let startState = selectedEls[0].type === ELEMENT_TYPES.FREEDRAW
              ? normalizeFreedrawElement(selectedEls[0])
              : { ...selectedEls[0] };

            // When dragging an arrow/line midpoint handle, bend/curve by inserting a new point at that segment
            if ((startState.type === ELEMENT_TYPES.ARROW || startState.type === ELEMENT_TYPES.LINE) && handle.startsWith('midpoint_')) {
              const segIdx = parseInt(handle.split('_')[1], 10);
              const pts = [...(startState.points || [])];
              const p1 = pts[segIdx];
              const p2 = pts[segIdx + 1];
              const midPoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
              pts.splice(segIdx + 1, 0, midPoint);
              startState = {
                ...startState,
                points: pts,
              };
              interaction.current.resizeHandle = `point_${segIdx + 1}`;
            } else {
              interaction.current.resizeHandle = handle;
            }
            interaction.current.resizeStartState = startState;
          }
          return;
        }
      }

      // Hit test
      const rawHit = getElementAtPoint(elementsRef.current, sx, sy);
      if (rawHit?.type === ELEMENT_TYPES.FRAME && isPointOnFrameLabel(rawHit, sx, sy)) {
        beginFrameNameEdit(rawHit);
        return;
      }
      if (rawHit) {
        // If clicking inside a container (such as text on a sticky note), select the container box
        const hit = rawHit.containerId
          ? (elementsRef.current.find(e => e.id === rawHit.containerId && !e.isDeleted) || rawHit)
          : rawHit;

        const selectedIds = as?.selectedElementIds || {};
        const isAlreadySelected = selectedIds[hit.id];

        // If hit belongs to a group, gather all sibling elements in the topmost group
        const groupMembers = hit.componentInstanceId
          ? elementsRef.current.filter(e => !e.isDeleted && e.componentInstanceId === hit.componentInstanceId)
          : (hit.groupIds?.length)
            ? elementsRef.current.filter(e => !e.isDeleted && e.groupIds?.includes(hit.groupIds[hit.groupIds.length - 1]))
            : [hit];

        let nextSelectedIds = { ...selectedIds };
        if (e.shiftKey) {
          // Toggle selection
          const shouldSelect = !isAlreadySelected;
          for (const m of groupMembers) {
            if (shouldSelect) nextSelectedIds[m.id] = true;
            else delete nextSelectedIds[m.id];
          }
          setAppState({ selectedElementIds: nextSelectedIds });
        } else if (!isAlreadySelected) {
          nextSelectedIds = {};
          for (const m of groupMembers) nextSelectedIds[m.id] = true;
          setAppState({ selectedElementIds: nextSelectedIds });
        }

        interaction.current.isDragging = true;
        interaction.current.hasAltDuplicated = false;
        // Snapshot original states for Alt-drag duplication
        const startPositions = {};
        for (const el of elementsRef.current) {
          if ((nextSelectedIds[el.id] || el.id === hit.id) && !el.isDeleted && !el.isHidden && !el.locked) {
            startPositions[el.id] = cloneElement(el);
          }
        }
        interaction.current.dragStartPositions = startPositions;
        return;
      }

      // Start marquee selection
      if (!e.shiftKey) {
        setAppState({ selectedElementIds: {} });
      }
      interaction.current.isSelectingRect = true;
      interaction.current.selectionRect = { x: ix, y: iy, width: 0, height: 0 };
      scheduleRender();
      return;
    }

    if (tool === 'eraser') {
      const hit = getElementAtPoint(elementsRef.current, sx, sy);
      if (hit) {
        setElements(prev => prev.map(el => el.id === hit.id ? { ...el, isDeleted: true } : el));
        commitHistory();
        notifyChange();
      }
      return;
    }

    if (tool === 'text') {
      startTextEdit(sx, sy);
      return;
    }

    const defaultStroke = as.theme === 'dark' ? '#ffffff' : '#1e1e1e';
    const strokeColor = as.currentItemStrokeColor || defaultStroke;
    const backgroundColor = as.currentItemBackgroundColor || 'transparent';
    const fillStyle = as.currentItemFillStyle || 'hachure';
    const strokeWidth = as.currentItemStrokeWidth || 2;
    const strokeStyle = as.currentItemStrokeStyle || 'solid';
    const roughness = as.currentItemRoughness ?? 1;
    const opacity = as.currentItemOpacity ?? 100;

    if ([ELEMENT_TYPES.ARROW, ELEMENT_TYPES.LINE].includes(tool)) {
      const el = createLinearElement(tool, ix, iy, ix, iy, {
        strokeColor,
        strokeWidth,
        strokeStyle,
        roughness,
        opacity,
        startArrowhead: tool === ELEMENT_TYPES.ARROW ? as.currentItemStartArrowhead : null,
        endArrowhead: tool === ELEMENT_TYPES.ARROW ? as.currentItemEndArrowhead : null,
      });
      interaction.current.isDrawing = true;
      interaction.current.drawingElement = el;
      scheduleRender();
      return;
    }

    if (tool === 'freedraw') {
      const el = {
        ...createElement(ELEMENT_TYPES.FREEDRAW, sx, sy, 0, 0, {
          strokeColor,
          strokeWidth,
          opacity,
          roughness: 0, // Freedraw never sketchy
        }),
        points: [[0, 0]],
      };
      interaction.current.isDrawing = true;
      interaction.current.drawingElement = el;
      scheduleRender();
      return;
    }

    // Rectangle / Ellipse / Diamond
    if ([ELEMENT_TYPES.RECTANGLE, ELEMENT_TYPES.ELLIPSE, ELEMENT_TYPES.DIAMOND, ELEMENT_TYPES.FRAME, ELEMENT_TYPES.IFRAME, 'frame', 'embeddable', 'image'].includes(tool)) {
      const type = tool === 'image'
        ? ELEMENT_TYPES.IMAGE
        : (tool === 'frame' ? ELEMENT_TYPES.FRAME : (tool === 'embeddable' ? ELEMENT_TYPES.IFRAME : tool));
      const el = createElement(type, ix, iy, 0, 0, {
        strokeColor,
        backgroundColor,
        fillStyle,
        strokeWidth,
        strokeStyle,
        roughness,
        roundness: Object.prototype.hasOwnProperty.call(as, 'currentItemRoundness')
          ? as.currentItemRoundness
          : 'round',
        opacity,
      });
      if (type === ELEMENT_TYPES.FRAME) {
        const frameCount = elementsRef.current.filter(e => e.type === ELEMENT_TYPES.FRAME && !e.isDeleted).length + 1;
        el.name = `Frame ${frameCount}`;
      }
      interaction.current.isDrawing = true;
      interaction.current.drawingElement = el;
      scheduleRender();
      return;
    }
  }, [getScenePoint, getSelectedElements, setAppState, setElements, scheduleRender, commitHistory, notifyChange, isSimulationActive, isPrototypeMode, onLinkOpen, beginFrameNameEdit, onToast]);

  const onPointerMove = useCallback((e) => {
    const [sx, sy] = getScenePoint(e);
    const as = appStateRef.current;
    const gridSize = as.gridSize;
    const ix = snap(sx, gridSize);
    const iy = snap(sy, gridSize);
    const ia = interaction.current;

    // Broadcast pointer to collaborators
    if (onPointerUpdate) {
      onPointerUpdate({ pointer: { x: sx, y: sy }, button: e.buttons > 0 ? 'down' : 'up' });
    }

    if (ia.isPanning) {
      const dx = e.clientX - ia.dragLastX;
      const dy = e.clientY - ia.dragLastY;
      ia.dragLastX = e.clientX;
      ia.dragLastY = e.clientY;
      const pending = pendingPanRef.current;
      pending.x += dx;
      pending.y += dy;
      if (pending.frame === null) {
        pending.frame = requestAnimationFrame(() => {
          pending.frame = null;
          flushPan();
        });
      }
      return;
    }

    if (ia.isRotating) {
      const el = ia.resizeStartState;
      const [cx, cy] = getElementCenter(el);
      const angle = Math.atan2(iy - cy, ix - cx) + Math.PI / 2;
      setElements(prev => prev.map(e2 =>
        e2.id === el.id ? { ...e2, angle, version: (e2.version || 1) + 1, versionNonce: versionNonce() } : e2
      ));
      scheduleRender();
      return;
    }

    if (ia.isResizing) {
      const el = ia.resizeStartState;
      const handle = ia.resizeHandle;

      // Primary endpoint and vertex/midpoint handle dragging for Arrow & Line (Doodle style)
      if ((el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) &&
          (handle === 'start' || handle === 'end' || handle.startsWith('point_')) &&
          el.points?.length >= 2) {
        const pts = el.points;
        let targetIdx = -1;
        if (handle === 'start') targetIdx = 0;
        else if (handle === 'end') targetIdx = pts.length - 1;
        else if (handle.startsWith('point_')) targetIdx = parseInt(handle.split('_')[1], 10);

        if (targetIdx >= 0 && targetIdx < pts.length) {
          const absPts = pts.map(p => [el.x + p[0], el.y + p[1]]);
          absPts[targetIdx] = [ix, iy];

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const [px, py] of absPts) {
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          }

          const nw = Math.max(1, maxX - minX);
          const nh = Math.max(1, maxY - minY);
          const newPoints = absPts.map(([px, py]) => [px - minX, py - minY]);

          setElements(prev => prev.map(e2 =>
            e2.id === el.id
              ? {
                ...e2,
                x: minX,
                y: minY,
                width: nw,
                height: nh,
                points: newPoints,
                version: (e2.version || 1) + 1,
                versionNonce: versionNonce(),
              }
              : e2
          ));
          scheduleRender();
          return;
        }
      }

      const dx = ix - ia.dragStartX;
      const dy = iy - ia.dragStartY;
      let { x, y, width: w, height: h } = el;

      if (e.altKey) {
        // Center-origin (symmetric) resize
        if (handle.includes('e')) { w = Math.max(2, el.width + dx * 2); x = el.x - dx; }
        else if (handle.includes('w')) { w = Math.max(2, el.width - dx * 2); x = el.x + dx; }

        if (handle.includes('s')) { h = Math.max(2, el.height + dy * 2); y = el.y - dy; }
        else if (handle.includes('n')) { h = Math.max(2, el.height - dy * 2); y = el.y + dy; }
      } else {
        if (handle.includes('e')) w = Math.max(2, el.width + dx);
        if (handle.includes('s')) h = Math.max(2, el.height + dy);
        if (handle.includes('w')) { x = el.x + dx; w = Math.max(2, el.width - dx); }
        if (handle.includes('n')) { y = el.y + dy; h = Math.max(2, el.height - dy); }
      }

      let updatedPoints = undefined;
      let updatedFontSize = undefined;

      if (el.type === ELEMENT_TYPES.TEXT) {
        const origW = Math.max(1, el.width || 1);
        const origFontSize = el.fontSize || FONT_SIZE_DEFAULT;
        const origH = Math.max(
          1,
          measureText(el.text || ' ', origFontSize, el.fontFamily, el.width > 0 ? el.width : null).height
        );

        const factor = e.altKey ? 2 : 1;
        const effDx = dx * factor;
        const effDy = dy * factor;

        const scaleX = handle.includes('e') ? (el.width + effDx) / origW : handle.includes('w') ? (el.width - effDx) / origW : 1;
        const scaleY = handle.includes('s') ? (origH + effDy) / origH : handle.includes('n') ? (origH - effDy) / origH : 1;

        let scale = 1;
        if (handle === 'e' || handle === 'w') {
          scale = scaleX;
        } else if (handle === 's' || handle === 'n') {
          scale = scaleY;
        } else {
          scale = Math.abs(scaleX - 1) > Math.abs(scaleY - 1) ? scaleX : scaleY;
        }

        const newFontSize = Math.max(8, Math.min(180, Math.round(origFontSize * Math.max(0.1, scale))));
        updatedFontSize = newFontSize;

        const metrics = measureText(el.text || ' ', newFontSize, el.fontFamily);
        const newW = metrics.width;
        const newH = metrics.height;

        if (e.altKey) {
          x = (el.x + el.width / 2) - newW / 2;
          y = (el.y + origH / 2) - newH / 2;
        } else {
          if (handle.includes('w')) {
            x = el.x + (el.width - newW);
          } else {
            x = el.x;
          }

          if (handle.includes('n')) {
            y = el.y + (origH - newH);
          } else {
            y = el.y;
          }
        }

        w = newW;
        h = newH;
      } else if (el.type === ELEMENT_TYPES.FREEDRAW && el.points?.length) {
        const originalBounds = getBoundsFromPoints(el.points);
        if (originalBounds) {
          updatedPoints = el.points.map(([px, py]) => [
            originalBounds.width ? ((px - originalBounds.x) / originalBounds.width) * w : 0,
            originalBounds.height ? ((py - originalBounds.y) / originalBounds.height) * h : 0,
          ]);
        }
      } else if ((el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) && el.points?.length) {
        const origW = el.width || 1;
        const origH = el.height || 1;
        updatedPoints = el.points.map(([px, py]) => [
          origW > 0 ? (px / origW) * w : px,
          origH > 0 ? (py / origH) * h : py,
        ]);
      }

      // If resizing a container with bound text (e.g. sticky note), update bound text dimensions
      let boundTextUpdates = null;
      if (el.boundElements?.length) {
        const textBound = el.boundElements.find(b => b.type === 'text');
        if (textBound) {
          boundTextUpdates = {
            id: textBound.id,
            x: x + 16,
            y: y + 16,
            width: Math.max(10, w - 32),
            height: Math.max(10, h - 32),
          };
        }
      }

      setElements(prev => prev.map(e2 => {
        if (e2.id === el.id) {
          return {
            ...e2,
            x,
            y,
            width: w,
            height: h,
            ...(updatedFontSize ? { fontSize: updatedFontSize } : {}),
            ...(updatedPoints ? { points: updatedPoints } : {}),
            version: (e2.version || 1) + 1,
            versionNonce: versionNonce(),
          };
        }
        if (boundTextUpdates && e2.id === boundTextUpdates.id) {
          return {
            ...e2,
            x: boundTextUpdates.x,
            y: boundTextUpdates.y,
            width: boundTextUpdates.width,
            height: boundTextUpdates.height,
            version: (e2.version || 1) + 1,
            versionNonce: versionNonce(),
          };
        }
        return e2;
      }));
      scheduleRender();
      return;
    }

    if (ia.isDragging) {
      // Alt + Drag duplication: duplicate selected elements on drag
      if (e.altKey && !ia.hasAltDuplicated) {
        ia.hasAltDuplicated = true;
        const currentElements = elementsRef.current;
        const ids = as?.selectedElementIds || {};

        const originals = [];
        const newSelectedIds = {};
        for (const el of currentElements) {
          if (ids[el.id] && !el.isDeleted && !el.isHidden && !el.locked) {
            const startState = ia.dragStartPositions?.[el.id];
            originals.push(startState || el);
          }
        }
        const clones = cloneElementSet(originals);
        for (const clone of clones) newSelectedIds[clone.id] = true;

        if (clones.length > 0) {
          if (ia.dragStartPositions) {
            setElements(prev => [
              ...prev.map(el => {
                const startState = ia.dragStartPositions[el.id];
                return startState ? { ...startState, version: (startState.version || 1) + 1, versionNonce: versionNonce() } : el;
              }),
              ...clones,
            ]);
          } else {
            setElements(prev => [...prev, ...clones]);
          }
          setAppState({ selectedElementIds: newSelectedIds });
          as.selectedElementIds = newSelectedIds;
        }
      }

      // We need scene delta, not canvas delta
      const z = as.zoom.value;
      let sdx = (e.clientX - ia.dragLastX) / z;
      let sdy = (e.clientY - ia.dragLastY) / z;
      ia.dragLastX = e.clientX;
      ia.dragLastY = e.clientY;

      // Shift + Drag: snap to primary axis (horizontal or vertical)
      if (e.shiftKey) {
        const totalDx = ix - ia.dragStartX;
        const totalDy = iy - ia.dragStartY;
        if (Math.abs(totalDx) >= Math.abs(totalDy)) {
          sdy = 0;
        } else {
          sdx = 0;
        }
      }

      const ids = as?.selectedElementIds || {};
      const allIdsToMove = new Set(Object.keys(ids).filter(id => ids[id]));
      const currentElements = elementsRef.current;

      // Expand to all boundElements, containerIds, and shared groupIds
      for (const el of currentElements) {
        if (allIdsToMove.has(el.id)) {
          if (el.boundElements) {
            for (const b of el.boundElements) allIdsToMove.add(b.id);
          }
          if (el.containerId) {
            allIdsToMove.add(el.containerId);
          }
          if (el.groupIds?.length) {
            for (const other of currentElements) {
              if (other.groupIds?.some(gid => el.groupIds.includes(gid))) {
                allIdsToMove.add(other.id);
              }
            }
          }
          if (el.componentInstanceId) {
            for (const other of currentElements) {
              if (other.componentInstanceId === el.componentInstanceId) allIdsToMove.add(other.id);
            }
          }
        }
      }

      const selectedFrames = currentElements.filter(el =>
        allIdsToMove.has(el.id) && el.type === ELEMENT_TYPES.FRAME && !el.isDeleted && !el.isHidden && !el.locked
      );
      if (selectedFrames.length > 0) {
        for (const frame of selectedFrames) {
          const fx1 = Math.min(frame.x, frame.x + (frame.width || 0));
          const fx2 = Math.max(frame.x, frame.x + (frame.width || 0));
          const fy1 = Math.min(frame.y, frame.y + (frame.height || 0));
          const fy2 = Math.max(frame.y, frame.y + (frame.height || 0));
          for (const el of currentElements) {
            if (el.id === frame.id || el.isDeleted || allIdsToMove.has(el.id)) continue;
            // Check if element center is inside the frame boundary
            const cx = el.x + (el.width || 0) / 2;
            const cy = el.y + (el.height || 0) / 2;
            if (cx >= fx1 && cx <= fx2 && cy >= fy1 && cy <= fy2) {
              allIdsToMove.add(el.id);
            }
          }
        }
      }

      // Smart Magnetic Alignment & Guide Snapping
      const activeGuides = [];
      if (!e.altKey && allIdsToMove.size > 0) {
        let movingMinX = Infinity, movingMinY = Infinity, movingMaxX = -Infinity, movingMaxY = -Infinity;
        for (const el of currentElements) {
          if (allIdsToMove.has(el.id) && !el.isDeleted) {
            movingMinX = Math.min(movingMinX, el.x);
            movingMinY = Math.min(movingMinY, el.y);
            movingMaxX = Math.max(movingMaxX, el.x + (el.width || 0));
            movingMaxY = Math.max(movingMaxY, el.y + (el.height || 0));
          }
        }

        if (movingMinX !== Infinity) {
          const newMinX = movingMinX + sdx;
          const newMaxX = movingMaxX + sdx;
          const newMidX = (newMinX + newMaxX) / 2;
          const newMinY = movingMinY + sdy;
          const newMaxY = movingMaxY + sdy;
          const newMidY = (newMinY + newMaxY) / 2;

          const SNAP_THRESHOLD = 6 / z;
          let bestSnapX = null;
          let minDiffX = SNAP_THRESHOLD;
          let bestSnapY = null;
          let minDiffY = SNAP_THRESHOLD;

          for (const target of currentElements) {
            if (allIdsToMove.has(target.id) || target.isDeleted || target.type === ELEMENT_TYPES.FRAME) continue;
            const tMinX = target.x;
            const tMaxX = target.x + (target.width || 0);
            const tMidX = (tMinX + tMaxX) / 2;
            const tMinY = target.y;
            const tMaxY = target.y + (target.height || 0);
            const tMidY = (tMinY + tMaxY) / 2;

            const xTests = [
              { diff: tMidX - newMidX, lineX: tMidX },
              { diff: tMinX - newMinX, lineX: tMinX },
              { diff: tMaxX - newMaxX, lineX: tMaxX },
              { diff: tMaxX - newMinX, lineX: tMaxX },
              { diff: tMinX - newMaxX, lineX: tMinX },
            ];
            for (const t of xTests) {
              if (Math.abs(t.diff) < minDiffX) {
                minDiffX = Math.abs(t.diff);
                bestSnapX = {
                  delta: t.diff,
                  lineX: t.lineX,
                  y1: Math.min(newMinY, tMinY) - 30,
                  y2: Math.max(newMaxY, tMaxY) + 30,
                };
              }
            }

            const yTests = [
              { diff: tMidY - newMidY, lineY: tMidY },
              { diff: tMinY - newMinY, lineY: tMinY },
              { diff: tMaxY - newMaxY, lineY: tMaxY },
              { diff: tMaxY - newMinY, lineY: tMaxY },
              { diff: tMinY - newMaxY, lineY: tMinY },
            ];
            for (const t of yTests) {
              if (Math.abs(t.diff) < minDiffY) {
                minDiffY = Math.abs(t.diff);
                bestSnapY = {
                  delta: t.diff,
                  lineY: t.lineY,
                  x1: Math.min(newMinX, tMinX) - 30,
                  x2: Math.max(newMaxX, tMaxX) + 30,
                };
              }
            }
          }

          if (bestSnapX) {
            sdx += bestSnapX.delta;
            activeGuides.push({
              type: 'vertical',
              x: bestSnapX.lineX,
              y1: bestSnapX.y1,
              y2: bestSnapX.y2,
            });
          }

          if (bestSnapY) {
            sdy += bestSnapY.delta;
            activeGuides.push({
              type: 'horizontal',
              y: bestSnapY.lineY,
              x1: bestSnapY.x1,
              x2: bestSnapY.x2,
            });
          }
        }
      }
      ia.alignmentGuides = activeGuides;

      setElements(prev => prev.map(el =>
        allIdsToMove.has(el.id) && !el.isDeleted && !el.isHidden && !el.locked
          ? { ...el, x: el.x + sdx, y: el.y + sdy, version: (el.version || 1) + 1, versionNonce: versionNonce() }
          : el
      ));
      scheduleRender();
      return;
    }

    if (ia.isSelectingRect) {
      ia.selectionRect = {
        x: Math.min(ia.dragStartX, ix),
        y: Math.min(ia.dragStartY, iy),
        width: Math.abs(ix - ia.dragStartX),
        height: Math.abs(iy - ia.dragStartY),
      };
      scheduleRender();
      return;
    }

    if (ia.isDrawing) {
      const drawing = ia.drawingElement;
      if (!drawing) return;

      if (drawing.type === ELEMENT_TYPES.FREEDRAW) {
        const rawPt = [sx - drawing.x, sy - drawing.y];
        const pts = drawing.points;
        const prevPt = pts[pts.length - 1];
        if (prevPt) {
          const dx = rawPt[0] - prevPt[0];
          const dy = rawPt[1] - prevPt[1];
          if (dx * dx + dy * dy < 1.44) {
            return;
          }
        }
        ia.drawingElement = {
          ...drawing,
          width: Math.max(drawing.width, Math.abs(rawPt[0])),
          height: Math.max(drawing.height, Math.abs(rawPt[1])),
          points: [...pts, rawPt],
        };
        scheduleRender();
        return;

      } else if ([ELEMENT_TYPES.ARROW, ELEMENT_TYPES.LINE].includes(drawing.type)) {
        const startX = drawing.x + drawing.points[0][0];
        const startY = drawing.y + drawing.points[0][1];
        const endX = ix;
        const endY = iy;
        const nx = Math.min(startX, endX);
        const ny = Math.min(startY, endY);
        ia.drawingElement = {
          ...drawing,
          x: nx, y: ny,
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
          points: [
            [startX - nx, startY - ny],
            [endX - nx, endY - ny],
          ],
        };
      } else {
        const newW = ix - ia.dragStartX;
        const newH = e.shiftKey ? Math.sign(iy - ia.dragStartY || 1) * Math.abs(newW) : (iy - ia.dragStartY);
        ia.drawingElement = normalizeElement({
          ...drawing,
          x: ia.dragStartX,
          y: ia.dragStartY,
          width: newW,
          height: newH,
        });
      }
      scheduleRender();
      return;
    }

    // Update cursor
    const tool = as.activeTool?.type || 'selection';
    if (tool === 'selection') {
      const selectedEls = getSelectedElements();
      if (selectedEls.length === 1) {
        const handle = getResizeHandleAt(selectedEls[0], sx, sy, as.zoom.value);
        if (handle) {
          canvasRef.current.style.cursor = getCursorForHandle(handle);
          return;
        }
      }
      const hit = getElementAtPoint(elementsRef.current, sx, sy);
      canvasRef.current.style.cursor = hit ? 'move' : 'default';
    }
  }, [getScenePoint, getSelectedElements, setAppState, setElements, scheduleRender, flushPan, onPointerUpdate, isSimulationActive]);

  const onPointerUp = useCallback((e) => {
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}

    const ia = interaction.current;
    const as = appStateRef.current;

    if (ia.isPanning) {
      ia.isPanning = false;
      flushPan();
      canvasRef.current.style.cursor = TOOL_CURSORS[as.activeTool?.type] || 'default';
      return;
    }

    if (ia.isRotating || ia.isResizing) {
      ia.isRotating = false;
      ia.isResizing = false;
      ia.resizeHandle = null;
      ia.resizeStartState = null;
      commitHistory();
      notifyChange();
      return;
    }

    if (ia.isDragging) {
      ia.isDragging = false;
      ia.hasAltDuplicated = false;
      ia.dragStartPositions = null;
      ia.alignmentGuides = null;
      commitHistory();
      notifyChange();
      return;
    }

    if (ia.isSelectingRect) {
      ia.isSelectingRect = false;
      const rect = ia.selectionRect;
      ia.selectionRect = null;
      if (rect && (rect.width > 2 || rect.height > 2)) {
        const enclosed = getElementsInRect(elementsRef.current, rect.x, rect.y, rect.width, rect.height);
        const ids = {};
        for (const el of enclosed) ids[el.id] = true;
        setAppState(prev => ({ selectedElementIds: e.shiftKey ? { ...(prev?.selectedElementIds || {}), ...ids } : ids }));
      }
      scheduleRender();
      return;
    }

    if (ia.isDrawing) {
      ia.isDrawing = false;
      const drawing = ia.drawingElement;
      ia.drawingElement = null;

      if (!drawing) { scheduleRender(); return; }

      // Normalize the element (fix negative dimensions)
      let norm = normalizeElement(drawing);

      // Handle single-click creation (click-to-place):
      // If the user clicks without dragging, place a default sized shape at click position
      if (norm.type !== ELEMENT_TYPES.FREEDRAW && norm.width < 5 && norm.height < 5) {
        if (norm.type === ELEMENT_TYPES.IFRAME) {
          norm = { ...norm, width: 480, height: 320, x: norm.x - 240, y: norm.y - 160 };
        } else if (norm.type === ELEMENT_TYPES.FRAME) {
          norm = { ...norm, width: 480, height: 320, x: norm.x - 240, y: norm.y - 160 };
        } else if (norm.type === ELEMENT_TYPES.RECTANGLE) {
          norm = { ...norm, width: 100, height: 70, x: norm.x - 50, y: norm.y - 35 };
        } else if (norm.type === ELEMENT_TYPES.ELLIPSE) {
          norm = { ...norm, width: 90, height: 90, x: norm.x - 45, y: norm.y - 45 };
        } else if (norm.type === ELEMENT_TYPES.DIAMOND) {
          norm = { ...norm, width: 90, height: 90, x: norm.x - 45, y: norm.y - 45 };
        } else if (norm.type === ELEMENT_TYPES.ARROW || norm.type === ELEMENT_TYPES.LINE) {
          norm = {
            ...norm,
            width: 100,
            height: 0,
            points: [[0, 0], [100, 0]],
          };
        } else {
          scheduleRender();
          return;
        }
      } else if (norm.type === ELEMENT_TYPES.FREEDRAW) {
        if (!norm.points || norm.points.length === 0) {
          scheduleRender();
          return;
        }
        norm = normalizeFreedrawElement(norm);
      }

      if (norm.type === ELEMENT_TYPES.IFRAME || norm.type === 'embeddable' || norm.type === 'iframe') {
        let enteredUrl = null;
        try {
          enteredUrl = window.prompt('Enter website or video URL to embed:', 'https://wikipedia.org');
        } catch {}
        let link = (enteredUrl && enteredUrl.trim()) ? enteredUrl.trim() : 'https://wikipedia.org';
        if (!/^(https?:|mailto:)/i.test(link)) link = `https://${link}`;
        norm = { ...norm, link, type: ELEMENT_TYPES.IFRAME };
      }

      // Add to elements (frames go beneath contained elements if any)
      if (norm.type === ELEMENT_TYPES.FRAME) {
        if (!norm.name) {
          const frameCount = elementsRef.current.filter(el => el.type === ELEMENT_TYPES.FRAME && !el.isDeleted).length + 1;
          norm = { ...norm, name: `Frame ${frameCount}` };
        }
        const fx1 = Math.min(norm.x, norm.x + norm.width);
        const fx2 = Math.max(norm.x, norm.x + norm.width);
        const fy1 = Math.min(norm.y, norm.y + norm.height);
        const fy2 = Math.max(norm.y, norm.y + norm.height);
        const firstContainedIndex = elementsRef.current.findIndex(el => {
          if (el.isDeleted || el.type === ELEMENT_TYPES.FRAME) return false;
          const cx = el.x + (el.width || 0) / 2;
          const cy = el.y + (el.height || 0) / 2;
          return cx >= fx1 && cx <= fx2 && cy >= fy1 && cy <= fy2;
        });

        if (firstContainedIndex !== -1) {
          setElements(prev => [
            ...prev.slice(0, firstContainedIndex),
            norm,
            ...prev.slice(firstContainedIndex),
          ]);
        } else {
          setElements(prev => [...prev, norm]);
        }
      } else {
        setElements(prev => [...prev, norm]);
      }
      const isFreedraw = norm.type === ELEMENT_TYPES.FREEDRAW;
      const keepFreedrawForShapeMode = isFreedraw && isDrawToShapeActive;
      const keepActiveTool = isToolLockedRef.current || isFreedraw;

      setAppState(prev => ({
        selectedElementIds: isFreedraw ? {} : (keepFreedrawForShapeMode ? {} : { [norm.id]: true }),
        activeTool: keepActiveTool
          ? prev.activeTool
          : { type: 'selection' },
        showWelcomeScreen: false,
      }));
      if (canvasRef.current) {
        if (keepActiveTool) {
          const activeType = appStateRef.current?.activeTool?.type || (isFreedraw ? 'freedraw' : 'selection');
          canvasRef.current.style.cursor = TOOL_CURSORS[activeType] || (isFreedraw ? 'crosshair' : 'default');
        } else {
          canvasRef.current.style.cursor = 'default';
        }
      }
      commitHistory();
      notifyChange();
      if (norm.type === ELEMENT_TYPES.FREEDRAW) onFreeDrawCommit?.(norm);
      return;
    }
  }, [getSelectedElements, setAppState, setElements, scheduleRender, flushPan, commitHistory, notifyChange, isDrawToShapeActive, onFreeDrawCommit]);

  // ── Zoom with mouse wheel ──
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const pending = pendingWheelRef.current;
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.max(0.01, 1 - e.deltaY * 0.002);
      pending.zoomFactor *= factor;
      pending.anchor = getCanvasPoint(e);
    } else {
      pending.x += e.deltaX;
      pending.y += e.deltaY;
    }
    if (pending.frame !== null) return;
    pending.frame = requestAnimationFrame(() => {
      pending.frame = null;
      const { zoomFactor, anchor, x, y } = pending;
      pending.zoomFactor = 1;
      pending.anchor = null;
      pending.x = 0;
      pending.y = 0;
      const current = appStateRef.current;
      const zoom = current.zoom?.value || 1;
      let nextZoom = zoom;
      let scrollX = current.scrollX || 0;
      let scrollY = current.scrollY || 0;
      if (anchor && zoomFactor !== 1) {
        nextZoom = Math.max(0.05, Math.min(30, zoom * zoomFactor));
        scrollX = anchor[0] - (anchor[0] - scrollX) * (nextZoom / zoom);
        scrollY = anchor[1] - (anchor[1] - scrollY) * (nextZoom / zoom);
      }
      scrollX -= x;
      scrollY -= y;
      setAppState({
        ...(nextZoom !== zoom ? { zoom: { value: nextZoom } } : {}),
        scrollX,
        scrollY,
      });
      scheduleRender();
    });
  }, [getCanvasPoint, scheduleRender, setAppState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [onWheel]);
  // Mind Mapping: Branch child node with connecting arrow
  const branchChildNode = useCallback((direction = 'right') => {
    const as = appStateRef.current;
    const selectedIds = Object.keys(as.selectedElementIds || {}).filter(id => as.selectedElementIds[id]);
    if (selectedIds.length === 0) return;
    const parent = elementsRef.current.find(el => el.id === selectedIds[0] && !el.isDeleted && !el.isHidden && !el.locked);
    if (!parent) return;

    const isLR = direction === 'right' || direction === 'left';
    const isUp = direction === 'up';
    const isLeft = direction === 'left';

    const parentW = parent.width || 180;
    const parentH = parent.height || 64;
    const gapX = 130;
    const gapY = 85;

    const childX = isLR ? (isLeft ? parent.x - parentW - gapX : parent.x + parentW + gapX) : parent.x;
    const childY = isLR ? parent.y : (isUp ? parent.y - parentH - gapY : parent.y + parentH + gapY);

    const childId = 'node_' + generateId();
    const textId = 'text_' + generateId();
    const arrowId = 'arrow_' + generateId();

    const childShape = {
      ...parent,
      id: childId,
      x: childX,
      y: childY,
      width: parentW,
      height: parentH,
      boundElements: [{ id: textId, type: 'text' }],
      groupIds: [],
      frameId: parent.frameId || null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: versionNonce(),
    };

    const font = parent.fontFamily || (FONT_FAMILY?.Doodlefont ?? 5);
    const childText = {
      id: textId,
      type: 'text',
      x: childX + 10,
      y: childY + (parentH / 2) - 12,
      width: Math.max(20, parentW - 20),
      height: 24,
      strokeColor: '#f3f4f6',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      fontFamily: font,
      fontSize: 15,
      textAlign: 'center',
      verticalAlign: 'middle',
      text: 'New Topic',
      originalText: 'New Topic',
      containerId: childId,
      version: 1,
      versionNonce: versionNonce(),
    };

    const pCenterX = parent.x + parentW / 2;
    const pCenterY = parent.y + parentH / 2;
    const cCenterX = childX + parentW / 2;
    const cCenterY = childY + parentH / 2;

    let startX, startY, endX, endY;
    if (direction === 'right') {
      startX = parent.x + parentW;
      startY = pCenterY;
      endX = childX;
      endY = cCenterY;
    } else if (direction === 'down') {
      startX = pCenterX;
      startY = parent.y + parentH;
      endX = cCenterX;
      endY = childY;
    } else if (direction === 'left') {
      startX = parent.x;
      startY = pCenterY;
      endX = childX + parentW;
      endY = cCenterY;
    } else {
      startX = pCenterX;
      startY = parent.y;
      endX = cCenterX;
      endY = childY + parentH;
    }

    const dx = endX - startX;
    const dy = endY - startY;

    const arrowEl = {
      id: arrowId,
      type: ELEMENT_TYPES.ARROW,
      x: startX,
      y: startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      strokeColor: '#94a3b8',
      backgroundColor: 'transparent',
      strokeWidth: 2,
      roughness: 1,
      opacity: 100,
      points: [[0, 0], [dx, dy]],
      startBinding: { elementId: parent.id, focus: 0, gap: 1 },
      endBinding: { elementId: childId, focus: 0, gap: 1 },
      endArrowhead: 'arrow',
      version: 1,
      versionNonce: versionNonce(),
    };

    setElements(prev => [...prev, childShape, childText, arrowEl]);
    setAppState({ selectedElementIds: { [childId]: true } });
    commitHistory();
    notifyChange();
    scheduleRender();
  }, [commitHistory, notifyChange, scheduleRender, setAppState, setElements]);

  // Auto-arrange tree layout for connected nodes
  const autoArrangeTreeLayout = useCallback((direction = 'LR') => {
    const currentEls = elementsRef.current.filter(el => !el.isDeleted);
    const arrows = currentEls.filter(el => (el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) && el.startBinding?.elementId && el.endBinding?.elementId);
    if (arrows.length === 0) return;

    const parentMap = new Map();
    const childrenMap = new Map();
    const nodeMap = new Map();

    for (const el of currentEls) {
      if (el.type !== ELEMENT_TYPES.ARROW && el.type !== ELEMENT_TYPES.LINE && el.type !== 'text') {
        nodeMap.set(el.id, el);
      }
    }

    for (const arrow of arrows) {
      const pId = arrow.startBinding.elementId;
      const cId = arrow.endBinding.elementId;
      if (nodeMap.has(pId) && nodeMap.has(cId)) {
        parentMap.set(cId, pId);
        if (!childrenMap.has(pId)) childrenMap.set(pId, []);
        childrenMap.get(pId).push(cId);
      }
    }

    const roots = [];
    for (const [id] of nodeMap) {
      if (!parentMap.has(id) && childrenMap.has(id)) {
        roots.push(id);
      }
    }
    if (roots.length === 0) return;

    const isLR = direction === 'LR';
    const gapX = isLR ? 150 : 90;
    const gapY = isLR ? 60 : 120;
    const arrangedPositions = new Map();

    for (const rootId of roots) {
      const rootNode = nodeMap.get(rootId);
      const startX = rootNode.x;
      const startY = rootNode.y;

      const positionNode = (nodeId, level, secondaryPos) => {
        const node = nodeMap.get(nodeId);
        const nw = node.width || 180;
        const nh = node.height || 60;

        const posX = isLR ? startX + level * (nw + gapX) : secondaryPos;
        const posY = isLR ? secondaryPos : startY + level * (nh + gapY);

        arrangedPositions.set(nodeId, { x: posX, y: posY });

        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) return;

        let childSec = secondaryPos - ((children.length - 1) * (isLR ? nh + gapY : nw + gapX)) / 2;
        for (const cId of children) {
          positionNode(cId, level + 1, childSec);
          childSec += isLR ? nh + gapY : nw + gapX;
        }
      };

      positionNode(rootId, 0, isLR ? startY : startX);
    }

    setElements(prev => prev.map(el => {
      if (arrangedPositions.has(el.id)) {
        const pos = arrangedPositions.get(el.id);
        return { ...el, x: pos.x, y: pos.y, version: (el.version || 1) + 1 };
      }
      if (el.containerId && arrangedPositions.has(el.containerId)) {
        const pos = arrangedPositions.get(el.containerId);
        const container = nodeMap.get(el.containerId);
        const origX = container.x;
        const origY = container.y;
        return { ...el, x: el.x + (pos.x - origX), y: el.y + (pos.y - origY), version: (el.version || 1) + 1 };
      }
      return el;
    }));

    commitHistory();
    notifyChange();
    scheduleRender();
  }, [commitHistory, notifyChange, scheduleRender, setElements]);

  // Create standardized presentation frame
  const createPresentationFrame = useCallback((aspectRatio = '16:9') => {
    const frameCount = elementsRef.current.filter(el => el.type === ELEMENT_TYPES.FRAME && !el.isDeleted).length + 1;
    const as = appStateRef.current;
    const cw = canvasRef.current?.width || window.innerWidth;
    const ch = canvasRef.current?.height || window.innerHeight;
    const z = as.zoom?.value || 1;
    const centerX = -as.scrollX + cw / (2 * z);
    const centerY = -as.scrollY + ch / (2 * z);

    const frameW = 960;
    const frameH = aspectRatio === '4:3' ? 720 : 540;
    const frameId = 'frame_' + generateId();

    const frameEl = {
      id: frameId,
      type: ELEMENT_TYPES.FRAME,
      name: `Slide ${frameCount}`,
      x: Math.round(centerX - frameW / 2),
      y: Math.round(centerY - frameH / 2),
      width: frameW,
      height: frameH,
      strokeColor: '#444444',
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 2 },
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: versionNonce(),
      isDeleted: false,
    };

    setElements(prev => [...prev, frameEl]);
    setAppState({ selectedElementIds: { [frameId]: true } });
    commitHistory();
    notifyChange();
    scheduleRender();
  }, [commitHistory, notifyChange, scheduleRender, setAppState, setElements]);



  // ── Action Handlers (usable in shortcuts and components) ──
  const handleAction = useCallback((action) => {
    if (action === 'openColorPalette') {
      onOpenColorPalette?.();
      return;
    }
    const selectedIds = appStateRef.current.selectedElementIds || {};
    if (action === 'delete') {
      const deletableIds = new Set(
        elementsRef.current
          .filter(el => selectedIds[el.id] && !el.isDeleted && !el.locked)
          .map(el => el.id)
      );
      if (deletableIds.size === 0) return;
      commitHistory();
      setElements(prev => {
        const next = prev.map(el => (deletableIds.has(el.id) ? { ...el, isDeleted: true } : el));
        if (next.filter(el => !el.isDeleted).length === 0) {
          setAppState(as => ({ ...as, showWelcomeScreen: true }));
        }
        return next;
      });
      setAppState({ selectedElementIds: {} });
      commitHistory();
      notifyChange();
      scheduleRender();
    } else if (action === 'duplicate') {
      const toDuplicate = elementsRef.current.filter(el => selectedIds[el.id] && !el.isDeleted && !el.isHidden && !el.locked);
      if (toDuplicate.length === 0) return;
      commitHistory();
      const newSelected = {};
      const newEls = toDuplicate.map(el => {
        const cloned = cloneElement(el, { x: el.x + 20, y: el.y + 20 });
        newSelected[cloned.id] = true;
        return cloned;
      });
      setElements(prev => [...prev, ...newEls]);
      setAppState({ selectedElementIds: newSelected });
      notifyChange();
      scheduleRender();
    } else if (action === 'bringToFront') {
      const selected = [];
      const unselected = [];
      elementsRef.current.forEach(el => {
        if (selectedIds[el.id]) selected.push(el);
        else unselected.push(el);
      });
      commitHistory();
      setElements([...unselected, ...selected]);
      notifyChange();
      scheduleRender();
    } else if (action === 'sendToBack') {
      const selected = [];
      const unselected = [];
      elementsRef.current.forEach(el => {
        if (selectedIds[el.id]) selected.push(el);
        else unselected.push(el);
      });
      commitHistory();
      setElements([...selected, ...unselected]);
      notifyChange();
      scheduleRender();
    } else if (action === 'sendBackward' || action === 'bringForward') {
      const selected = new Set(elementsRef.current
        .filter(el => selectedIds[el.id] && !el.isDeleted && !el.isHidden && !el.locked)
        .map(el => el.id));
      if (!selected.size) return;
      const next = [...elementsRef.current];
      if (action === 'sendBackward') {
        for (let index = 1; index < next.length; index += 1) {
          if (selected.has(next[index].id) && !selected.has(next[index - 1].id)) {
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
          }
        }
      } else {
        for (let index = next.length - 2; index >= 0; index -= 1) {
          if (selected.has(next[index].id) && !selected.has(next[index + 1].id)) {
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
          }
        }
      }
      commitHistory();
      setElements(next);
      notifyChange();
      scheduleRender();
    } else if (action === 'toggleLock') {
      const selected = elementsRef.current.filter(el => selectedIds[el.id] && !el.isDeleted && !el.isHidden);
      if (!selected.length) return;
      const locked = !selected.every(el => el.locked);
      commitHistory();
      setElements(prev => prev.map(el => selectedIds[el.id] && !el.isDeleted && !el.isHidden
        ? { ...el, locked, version: (el.version || 1) + 1, versionNonce: versionNonce(), updated: Date.now() }
        : el));
      setAppState({ selectedElementIds: locked ? {} : selectedIds });
      notifyChange();
      scheduleRender();
    } else if (action === 'paste') {
      if (!window.__doodleClipboard?.length) {
        onToast?.('Nothing to paste. Copy an object first.');
        return;
      }
      commitHistory();
      const pasted = window.__doodleClipboard.map(el => cloneElement(el, { x: el.x + 20, y: el.y + 20 }));
      setElements(prev => [...prev, ...pasted]);
      setAppState({ selectedElementIds: Object.fromEntries(pasted.map(el => [el.id, true])) });
      notifyChange();
      scheduleRender();
      onToast?.(`Pasted ${pasted.length} object${pasted.length === 1 ? '' : 's'}.`);
    } else if (action === 'group' || action === 'ungroup') {
      const selectedElements = elementsRef.current.filter(el =>
        selectedIds[el.id] && !el.isDeleted && !el.isHidden && !el.locked
      );
      const groupedElements = selectedElements.filter(el => el.groupIds?.length);
      if (action === 'group' && selectedElements.length < 2) {
        onToast?.('Select at least two unlocked objects to group.');
        return;
      }
      if (action === 'ungroup' && !groupedElements.length) {
        onToast?.('No grouped objects selected.');
        return;
      }
      const groupId = generateId();
      commitHistory();
      setElements(prev => prev.map(el => {
        if (!selectedIds[el.id] || el.isDeleted || el.isHidden || el.locked) return el;
        if (action === 'ungroup' && !el.groupIds?.length) return el;
        const groupIds = action === 'group'
          ? [...(el.groupIds || []), groupId]
          : (el.groupIds || []).slice(0, -1);
        return { ...el, groupIds, version: (el.version || 1) + 1, versionNonce: versionNonce() };
      }));
      notifyChange();
      scheduleRender();
      const changedCount = action === 'group' ? selectedElements.length : groupedElements.length;
      onToast?.(`${action === 'group' ? 'Grouped' : 'Ungrouped'} ${changedCount} object${changedCount === 1 ? '' : 's'}.`);
    } else if (action === 'branchChildRight') {
      branchChildNode('right');
    } else if (action === 'branchChildDown') {
      branchChildNode('down');
    } else if (action === 'autoArrangeTree') {
      autoArrangeTreeLayout('LR');
    } else if (action === 'createPresentationFrame') {
      createPresentationFrame('16:9');
    }
  }, [commitHistory, notifyChange, scheduleRender, setAppState, setElements, branchChildNode, autoArrangeTreeLayout, createPresentationFrame, onToast]);

  const selectLayer = useCallback((elementId, extendSelection) => {
    const target = elementsRef.current.find(el => el.id === elementId && !el.isDeleted);
    if (!target) return;
    const groupId = target.groupIds?.at(-1);
    const groupMembers = groupId
      ? elementsRef.current.filter(el => !el.isDeleted && el.groupIds?.includes(groupId))
      : [target];
    const next = extendSelection ? { ...(appStateRef.current.selectedElementIds || {}) } : {};
    const shouldSelect = !extendSelection || !next[elementId];
    for (const element of groupMembers) {
      if (shouldSelect) next[element.id] = true;
      else delete next[element.id];
    }
    setAppState({ selectedElementIds: next });
    scheduleRender();
  }, [scheduleRender, setAppState]);

  const updateLayerProperty = useCallback((elementId, property, value) => {
    const element = elementsRef.current.find(el => el.id === elementId && !el.isDeleted);
    if (!element || element[property] === value) return;
    commitHistory();
    setElements(prev => prev.map(el => el.id === elementId
      ? { ...el, [property]: value, version: (el.version || 1) + 1, versionNonce: versionNonce(), updated: Date.now() }
      : el));
    if (property === 'locked' && value) {
      const nextSelection = { ...(appStateRef.current.selectedElementIds || {}) };
      delete nextSelection[elementId];
      setAppState({ selectedElementIds: nextSelection });
    }
    notifyChange();
    scheduleRender();
  }, [commitHistory, notifyChange, scheduleRender, setAppState, setElements]);

  const moveLayer = useCallback((elementId, direction) => {
    const current = elementsRef.current;
    const index = current.findIndex(el => el.id === elementId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    commitHistory();
    const reordered = [...current];
    const now = Date.now();
    const oldElement = reordered[index];
    const newElement = reordered[nextIndex];
    reordered[index] = { ...newElement, version: (newElement.version || 1) + 1, versionNonce: versionNonce(), updated: now };
    reordered[nextIndex] = { ...oldElement, version: (oldElement.version || 1) + 1, versionNonce: versionNonce(), updated: now };
    setElements(reordered);
    notifyChange();
    scheduleRender();
  }, [commitHistory, notifyChange, scheduleRender, setElements]);

  const handleZoomIn = useCallback(() => {
    setAppState(prev => ({ zoom: { value: Math.min(30, Number((prev.zoom.value * 1.15).toFixed(2))) } }));
  }, [setAppState]);

  const handleZoomOut = useCallback(() => {
    setAppState(prev => ({ zoom: { value: Math.max(0.1, Number((prev.zoom.value / 1.15).toFixed(2))) } }));
  }, [setAppState]);

  const handleZoomReset = useCallback(() => {
    setAppState({ zoom: { value: 1 } });
  }, [setAppState]);

  // ── Key events ──
  const onKeyDown = useCallback((e) => {
    if (e.code === 'Space') interaction.current.spaceDown = true;
    const target = e.target;
    if (target?.closest?.('.settings-sidebar-panel')) return;

    // Tab key: Mind Map quick branch child node
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && !interaction.current.editingElementId) {
      const ids = appStateRef.current?.selectedElementIds || {};
      const hasSelected = Object.values(ids).some(Boolean);
      if (hasSelected) {
        e.preventDefault();
        branchChildNode(e.shiftKey ? 'down' : 'right');
        return;
      }
    }
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const shortcutAction = findShortcutAction(e, getShortcutBindings());
    if (shortcutAction) {
      e.preventDefault();
      switch (shortcutAction) {
        case 'undo': {
          const previous = historyRef.current.undo(elementsRef.current);
          if (previous) { setElements(previous); notifyChange(); scheduleRender(); }
          return;
        }
        case 'redo': {
          const next = historyRef.current.redo(elementsRef.current);
          if (next) { setElements(next); notifyChange(); scheduleRender(); }
          return;
        }
        case 'selectAll': {
          const ids = {};
          for (const el of elementsRef.current) {
            if (!el.isDeleted && !el.isHidden && !el.locked) ids[el.id] = true;
          }
          setAppState({ selectedElementIds: ids });
          scheduleRender();
          return;
        }
        case 'copy': {
          const copied = getSelectedElements();
          window.__doodleClipboard = copied.map(el => ({ ...el }));
          onToast?.(copied.length
            ? `Copied ${copied.length} object${copied.length === 1 ? '' : 's'}.`
            : 'Nothing selected to copy.');
          return;
        }
        case 'cut': {
          const cut = getSelectedElements();
          window.__doodleClipboard = cut.map(el => ({ ...el }));
          if (!cut.length) {
            onToast?.('Nothing selected to cut.');
            return;
          }
          handleAction('delete');
          onToast?.(`Cut ${cut.length} object${cut.length === 1 ? '' : 's'}.`);
          return;
        }
        case 'paste': {
          handleAction('paste');
          return;
        }
        case 'duplicate':
          handleAction('duplicate');
          return;
        case 'delete':
          handleAction('delete');
          return;
        case 'group':
        case 'ungroup':
        case 'bringToFront':
        case 'sendToBack':
          handleAction(shortcutAction);
          return;
        case 'zoomIn':
          handleZoomIn();
          return;
        case 'zoomOut':
          handleZoomOut();
          return;
        case 'zoomReset':
          handleZoomReset();
          return;
        case 'toggleLayers':
          setIsLayersPanelOpen(prev => !prev);
          return;
        case 'toggleToolLock':
          setIsToolLocked(prev => !prev);
          return;
        default: {
          const tool = {
            toolSelection: 'selection',
            toolRectangle: 'rectangle',
            toolDiamond: 'diamond',
            toolEllipse: 'ellipse',
            toolArrow: 'arrow',
            toolLine: 'line',
            toolFreedraw: 'freedraw',
            toolText: 'text',
            toolEraser: 'eraser',
            toolHand: 'hand',
            toolFrame: 'frame',
          }[shortcutAction];
          if (!tool) return;
          setAppState({ activeTool: { type: tool } });
          if (canvasRef.current) canvasRef.current.style.cursor = TOOL_CURSORS[tool] || 'default';
          return;
        }
      }
    }

    if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handleAction('delete');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      const next = historyRef.current.redo(elementsRef.current);
      if (next) { setElements(next); notifyChange(); scheduleRender(); }
      return;
    }

    // Font size increase/decrease shortcut for selected text elements (Ctrl+Shift+> / Ctrl+Shift+<)
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl && (e.key === '>' || e.key === '<' || (e.shiftKey && (e.key === '.' || e.key === ',')))) {
      const selectedIds = appStateRef.current?.selectedElementIds || {};
      const selectedTextEls = elementsRef.current.filter(el =>
        selectedIds[el.id] && el.type === ELEMENT_TYPES.TEXT && !el.isDeleted && !el.isHidden && !el.locked
      );
      if (selectedTextEls.length > 0) {
        e.preventDefault();
        const delta = (e.key === '>' || e.key === '.') ? 4 : -4;
        setElements(prev =>
          prev.map(el => {
            if (selectedIds[el.id] && el.type === ELEMENT_TYPES.TEXT && !el.isDeleted && !el.isHidden && !el.locked) {
              const currentSize = el.fontSize || FONT_SIZE_DEFAULT;
              const newSize = Math.max(8, Math.min(180, currentSize + delta));
              const metrics = measureText(el.text || ' ', newSize, el.fontFamily);
              return {
                ...el,
                fontSize: newSize,
                width: metrics.width,
                height: metrics.height,
                version: (el.version || 1) + 1,
                versionNonce: versionNonce(),
              };
            }
            return el;
          })
        );
        commitHistory();
        notifyChange();
        scheduleRender();
        return;
      }
    }

    if (isCtrl && e.key === '+') {
      e.preventDefault();
      handleZoomIn();
      return;
    }
    if (isCtrl && e.key === '_') {
      e.preventDefault();
      handleZoomOut();
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      if (isLayersPanelOpen) {
        setIsLayersPanelOpen(false);
        return;
      }
      if (isComponentsPanelOpen) {
        setIsComponentsPanelOpen(false);
        return;
      }
      if (isPortalPanelOpen || isChangeTrackingOpen || isSimulationActive) {
        setIsPortalPanelOpen(false);
        setIsChangeTrackingOpen(false);
        setIsSimulationActive(false);
        setSimulationCurrentId(null);
        setSimulationPath([]);
        return;
      }
      finishTextEdit();
      setAppState({ selectedElementIds: {}, activeTool: { type: 'selection' } });
      return;
    }

    // Number-row shortcuts remain as convenient alternate tool selectors.
    const numericTools = {
      '1': 'selection', '2': 'rectangle', '3': 'diamond', '4': 'ellipse',
      '5': 'arrow', '6': 'line', '7': 'freedraw', '8': 'text', '0': 'eraser',
    };
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key === '9') {
      e.preventDefault();
      document.querySelector('.App-toolbar input[type="file"]')?.click();
      return;
    }
    const numericTool = numericTools[e.key];
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && numericTool) {
      setAppState({ activeTool: { type: numericTool } });
      if (canvasRef.current) canvasRef.current.style.cursor = TOOL_CURSORS[numericTool] || 'default';
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'c') {
      setAppState({ activeTool: { type: 'ellipse' } });
      if (canvasRef.current) canvasRef.current.style.cursor = TOOL_CURSORS.ellipse;
      return;
    }

    // Arrow keys to nudge selected elements
    const nudgeKeys = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const nudge = nudgeKeys[e.key];
    if (nudge) {
      const [ndx, ndy] = nudge.map(v => v * (e.shiftKey ? 10 : 1));
      const ids = appStateRef.current?.selectedElementIds || {};
      setElements(prev => prev.map(el =>
        ids[el.id] && !el.isDeleted && !el.isHidden && !el.locked
          ? { ...el, x: el.x + ndx, y: el.y + ndy }
          : el
      ));
      commitHistory();
      notifyChange();
    }
  }, [getSelectedElements, setElements, setAppState, commitHistory, notifyChange, scheduleRender, handleAction, handleZoomIn, handleZoomOut, handleZoomReset, isLayersPanelOpen, isComponentsPanelOpen, isPortalPanelOpen, isChangeTrackingOpen, isSimulationActive]);

  const onKeyUp = useCallback((e) => {
    if (e.code === 'Space') interaction.current.spaceDown = false;
  }, []);

  // ── Double-click to edit text / rename frame / create text ──
  const onDoubleClick = useCallback((e) => {
    const [sx, sy] = getScenePoint(e);
    const hit = getElementAtPoint(elementsRef.current, sx, sy);

    if (hit?.type === ELEMENT_TYPES.BOARD_PORTAL) {
      onNavigateBoardPortal?.(hit.portalWorkspaceId, hit.portalFileId);
    } else if (hit?.type === ELEMENT_TYPES.TEXT) {
      startTextEditOnElement(hit);
    } else if (hit?.boundElements?.length) {
      // Direct double-click editing on sticky notes and containers
      const textBound = hit.boundElements.find(b => b.type === 'text');
      const boundTextEl = elementsRef.current.find(el => el.id === textBound?.id && !el.isDeleted);
      if (boundTextEl) {
        startTextEditOnElement(boundTextEl);
      } else {
        startTextEdit(sx, sy);
      }
    } else if (hit?.type === ELEMENT_TYPES.FRAME) {
      beginFrameNameEdit(hit);
    } else {
      startTextEdit(sx, sy);
    }
  }, [getScenePoint, beginFrameNameEdit, onNavigateBoardPortal]);

  // ── Text editing ──
  function startTextEdit(sx, sy) {
    finishTextEdit();
    const as = appStateRef.current;
    const el = createTextElement(sx, sy, '', {
      strokeColor: as.currentItemStrokeColor,
      fontSize: as.currentItemFontSize,
      fontFamily: as.currentItemFontFamily,
      textAlign: as.currentItemTextAlign,
      opacity: as.currentItemOpacity,
    });
    setElements(prev => [...prev, el]);
    setAppState({ selectedElementIds: { [el.id]: true }, activeTool: { type: 'selection' }, showWelcomeScreen: false });
    interaction.current.editingElementId = el.id;
    mountTextarea(el, sx, sy, true);
  }

  function startTextEditOnElement(el) {
    finishTextEdit();
    interaction.current.editingElementId = el.id;
    const [cx, cy] = sceneBoundsToCanvas(el.x, el.y);
    mountTextarea(el, el.x, el.y, false, el.text || '');
  }

  function mountTextarea(el, sx, sy, isNew = false, initialText = '') {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    const textarea = document.createElement('textarea');
    textarea.value = initialText;
    textarea.spellcheck = false;
    textarea.wrap = el.width ? 'soft' : 'off';
    textarea.autocomplete = 'off';
    textarea.autocorrect = 'off';
    textarea.autocapitalize = 'off';
    textarea.tabIndex = 0;
    const as = appStateRef.current;
    const z = as.zoom.value;
    const [canvasX, canvasY] = sceneBoundsToCanvas(el.x, el.y);
    const fontSize = (el.fontSize || FONT_SIZE_DEFAULT) * z;
    const fontStacks = {
      1: 'Helvetica, Arial, sans-serif',
      2: '"Cascadia Code", "Fira Code", monospace',
      3: '"Virgil", cursive',
      5: '"Doodlefont", "Virgil", cursive',
      6: '"Nunito", sans-serif',
      7: '"Comic Shanns", cursive',
      8: '"Patrick Hand", cursive',
    };

    Object.assign(textarea.style, {
      position: 'absolute',
      left: `${canvasX}px`,
      top: `${canvasY}px`,
      display: 'block',
      pointerEvents: 'auto',
      userSelect: 'text',
      webkitUserSelect: 'text',
      boxSizing: 'border-box',
      minWidth: '1px',
      width: el.width ? `${el.width * z}px` : 'auto',
      maxWidth: el.width ? `${el.width * z}px` : 'none',
      minHeight: `${fontSize * (el.lineHeight || 1.25)}px`,
      fontSize: `${fontSize}px`,
      fontFamily: fontStacks[el.fontFamily] || fontStacks[5],
      lineHeight: String(el.lineHeight || 1.25),
      textAlign: el.textAlign || 'left',
      color: el.strokeColor || '#1e1e1e',
      background: 'transparent',
      border: '0',
      outline: 'none',
      padding: '0',
      margin: '0',
      resize: 'none',
      overflow: 'hidden',
      whiteSpace: el.width ? 'pre-wrap' : 'pre',
      wordBreak: el.width ? 'break-word' : 'normal',
      zIndex: 9999,
      transform: el.angle ? `rotate(${el.angle}rad)` : 'none',
    });

    const resizeTextarea = () => {
      const text = textarea.value;
      const { width, height } = measureText(text || ' ', el.fontSize || FONT_SIZE_DEFAULT, el.fontFamily);
      // Add a small measurement cushion: canvas and textarea font metrics differ
      // slightly in Chromium, and an undersized textarea wraps the same text.
      textarea.style.width = `${(Math.max(1, width) + 12) * z}px`;
      textarea.style.height = `${Math.max(el.fontSize || FONT_SIZE_DEFAULT, height) * z}px`;
      return { text, width, height };
    };

    // Size existing text immediately as well as on every edit so the textarea
    // never wraps independently of the canvas text layout.
    resizeTextarea();

    textarea.addEventListener('input', () => {
      const { text, width, height } = resizeTextarea();
      setElements(prev => prev.map(e2 =>
        e2.id === el.id
          ? { ...e2, text, width, height, originalText: text, version: (e2.version || 1) + 1 }
          : e2
      ));
      notifyChange();
    });

    textarea.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' || (ev.key === 'Enter' && !ev.shiftKey && ev.ctrlKey)) {
        ev.preventDefault();
        finishTextEdit();
      }
    });

    // Keep editor pointer events away from the canvas interaction handlers.
    textarea.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    textarea.addEventListener('blur', finishTextEdit);

    interaction.current.textInput = textarea;
    container.appendChild(textarea);
    // Focus after insertion so Chromium/Electron has a live, focusable node.
    requestAnimationFrame(() => {
      if (interaction.current.textInput === textarea && textarea.isConnected) {
        textarea.focus({ preventScroll: true });
        if (!isNew) {
          const end = textarea.value.length;
          textarea.setSelectionRange(end, end);
        }
      }
    });
  }

  function finishTextEdit() {
    const ta = interaction.current.textInput;
    const editId = interaction.current.editingElementId;
    if (ta) {
      ta.removeEventListener('blur', finishTextEdit);
      ta.remove();
      interaction.current.textInput = null;
    }
    if (editId) {
      // Remove empty text elements
      setElements(prev => {
        const updated = prev.map(el =>
          el.id === editId && (!el.text || el.text.trim() === '')
            ? { ...el, isDeleted: true }
            : el
        );
        return updated;
      });
      interaction.current.editingElementId = null;
      commitHistory();
      notifyChange();
    }
  }

  // ── Context menu ──
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    if (isPrototypeMode || isSimulationActive) return;
    const [sceneX, sceneY] = getScenePoint(e);
    const hit = getElementAtPoint(elementsRef.current, sceneX, sceneY, { includeLocked: true });
    const previousSelection = appStateRef.current.selectedElementIds || {};
    let nextSelection = {};
    if (hit) {
      if (previousSelection[hit.id]) {
        nextSelection = previousSelection;
      } else {
        const groupId = hit.groupIds?.at(-1);
        const group = groupId
          ? elementsRef.current.filter(el => !el.isDeleted && !el.isHidden && el.groupIds?.includes(groupId))
          : [hit];
        nextSelection = Object.fromEntries(group.map(el => [el.id, true]));
      }
    }
    setAppState({ selectedElementIds: nextSelection });
    scheduleRender();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      elementIds: Object.keys(nextSelection),
    });
    setContextMenuStylesAvailable(Boolean(window.__doodleStyleClipboard));
  }, [getScenePoint, isPrototypeMode, isSimulationActive, scheduleRender, setAppState]);

  const handleContextMenuAction = useCallback(async (action, value) => {
    const ids = contextMenu?.elementIds || [];
    const selected = elementsRef.current.filter(el =>
      ids.includes(el.id) && !el.isDeleted && !el.isHidden
    );
    const editable = selected.filter(el => !el.locked);
    const styleProperties = [
      'strokeColor', 'backgroundColor', 'fillStyle', 'strokeWidth', 'strokeStyle',
      'roughness', 'opacity', 'roundness', 'fontFamily', 'fontSize',
      'textAlign', 'verticalAlign', 'lineHeight',
    ];
    const writeText = async (text) => {
      let electronError = null;
      if (window.electronAPI?.writeClipboardText) {
        try {
          const copied = await window.electronAPI.writeClipboardText(text);
          if (copied) return;
        } catch (error) {
          electronError = error;
          console.warn('Electron clipboard write failed; trying the browser clipboard:', error);
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      if (electronError) throw electronError;
      throw new Error('Clipboard text access is not available.');
    };

    try {
      switch (action) {
        case 'copy':
          window.__doodleClipboard = selected.map(el => JSON.parse(JSON.stringify(el)));
          onToast?.(selected.length
            ? `Copied ${selected.length} object${selected.length === 1 ? '' : 's'}.`
            : 'Nothing selected to copy.');
          return;
        case 'cut':
          window.__doodleClipboard = selected.map(el => JSON.parse(JSON.stringify(el)));
          if (!editable.length) {
            onToast?.('Nothing unlocked is selected to cut.');
            return;
          }
          handleAction('delete');
          onToast?.(`Cut ${editable.length} object${editable.length === 1 ? '' : 's'}.`);
          return;
        case 'paste':
          handleAction('paste');
          return;
        case 'duplicate':
        case 'delete':
        case 'sendBackward':
        case 'bringForward':
        case 'sendToBack':
        case 'bringToFront':
        case 'toggleLock':
          handleAction(action);
          return;
        case 'copyStyles':
          if (selected.length) {
            window.__doodleStyleClipboard = Object.fromEntries(
              styleProperties
                .filter(property => selected[0][property] !== undefined)
                .map(property => [property, selected[0][property]])
            );
            setContextMenuStylesAvailable(true);
          }
          return;
        case 'pasteStyles': {
          const styles = window.__doodleStyleClipboard;
          if (!styles || !editable.length) return;
          const editableIds = new Set(editable.map(el => el.id));
          commitHistory();
          setElements(prev => prev.map(el => editableIds.has(el.id)
            ? { ...el, ...styles, version: (el.version || 1) + 1, versionNonce: versionNonce(), updated: Date.now() }
            : el));
          notifyChange();
          scheduleRender();
          return;
        }
        case 'wrapFrame': {
          if (!editable.length) return;
          const bounds = getCommonBounds(editable);
          if (!bounds) return;
          const padding = 32;
          const frameCount = elementsRef.current.filter(el => el.type === ELEMENT_TYPES.FRAME && !el.isDeleted).length + 1;
          const frame = createElement(
            ELEMENT_TYPES.FRAME,
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + padding * 2,
            bounds.height + padding * 2,
            {
              name: `Frame ${frameCount}`,
              strokeColor: theme === 'dark' ? '#737373' : '#525252',
              backgroundColor: 'rgba(128, 128, 128, 0.04)',
              fillStyle: 'solid',
            }
          );
          const selectedIds = new Set(editable.map(el => el.id));
          const firstSelected = elementsRef.current.findIndex(el => selectedIds.has(el.id));
          commitHistory();
          setElements(prev => {
            const children = prev.map(el => selectedIds.has(el.id)
              ? { ...el, frameId: frame.id, version: (el.version || 1) + 1, versionNonce: versionNonce() }
              : el);
            const insertionIndex = Math.max(0, firstSelected);
            return [...children.slice(0, insertionIndex), frame, ...children.slice(insertionIndex)];
          });
          setAppState({ selectedElementIds: { [frame.id]: true } });
          notifyChange();
          scheduleRender();
          return;
        }
        case 'flipHorizontal':
        case 'flipVertical': {
          if (!editable.length) return;
          const bounds = getCommonBounds(editable);
          if (!bounds) return;
          const horizontal = action === 'flipHorizontal';
          const axis = horizontal ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2;
          const editableIds = new Set(editable.map(el => el.id));
          commitHistory();
          setElements(prev => prev.map(el => {
            if (!editableIds.has(el.id)) return el;
            const next = { ...el };
            if (horizontal) {
              next.x = 2 * axis - (el.x + (el.width || 0));
              next.angle = -(el.angle || 0);
              if (el.points?.length) next.points = el.points.map(([px, py]) => [el.width - px, py]);
            } else {
              next.y = 2 * axis - (el.y + (el.height || 0));
              next.angle = Math.PI - (el.angle || 0);
              if (el.points?.length) next.points = el.points.map(([px, py]) => [px, el.height - py]);
            }
            next.version = (el.version || 1) + 1;
            next.versionNonce = versionNonce();
            next.updated = Date.now();
            return next;
          }));
          notifyChange();
          scheduleRender();
          return;
        }
        case 'addToLibrary': {
          if (!editable.length) return;
          const bounds = getCommonBounds(editable);
          if (!bounds) return;
          const stored = localStorage.getItem('doodle_custom_templates_v1');
          const templates = stored ? JSON.parse(stored) : [];
          const normalizedElements = editable.map(el => ({
            ...JSON.parse(JSON.stringify(el)),
            x: el.x - bounds.x,
            y: el.y - bounds.y,
          }));
          const template = {
            id: `tpl_${Date.now()}`,
            title: `Selection ${templates.length + 1}`,
            category: 'Custom',
            desc: `${editable.length} saved elements`,
            elements: normalizedElements,
            createdAt: Date.now(),
            elementCount: editable.length,
          };
          localStorage.setItem('doodle_custom_templates_v1', JSON.stringify([template, ...templates]));
          window.alert(`Saved "${template.title}" to the template library.`);
          return;
        }
        case 'saveLink': {
          if (!editable.length || !value) return;
          const editableIds = new Set(editable.map(el => el.id));
          commitHistory();
          setElements(prev => prev.map(el => editableIds.has(el.id)
            ? { ...el, link: value, version: (el.version || 1) + 1, versionNonce: versionNonce(), updated: Date.now() }
            : el));
          notifyChange();
          scheduleRender();
          return;
        }
        case 'copyLink': {
          if (!selected.length) return;
          const url = new URL(window.location.href);
          url.searchParams.set('element', selected[0].id);
          await writeText(url.toString());
          window.electronAPI?.showNotification?.('Clipboard', 'Copied object link to clipboard');
          return;
        }
        case 'copySvg': {
          if (!selected.length) return;
          const svg = await exportToSvg(selected, appStateRef.current, filesRef.current, { exportBackground: false });
          await writeText(svg);
          window.electronAPI?.showNotification?.('Clipboard', 'Copied SVG vector to clipboard');
          return;
        }
        case 'copyPng': {
          if (!selected.length) return;
          const blob = await exportToBlob(selected, appStateRef.current, filesRef.current, {
            exportBackground: false,
            exportScale: 2,
          });
          if (!blob) throw new Error('Unable to render the selected objects as an image.');
          let copied = false;
          if (window.electronAPI?.writeClipboardImage) {
            try {
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              copied = await window.electronAPI.writeClipboardImage(dataUrl);
            } catch (error) {
              console.warn('Electron image clipboard write failed; trying the browser clipboard:', error);
            }
          }
          if (!copied && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            copied = true;
          }
          if (!copied) throw new Error('Clipboard image access is not available.');
          window.electronAPI?.showNotification?.('Clipboard', 'Copied PNG image to clipboard');
          return;
        }
        default:
          return;
      }
    } catch (error) {
      console.error(`Canvas context-menu action "${action}" failed`, error);
      window.alert(`Could not ${action === 'copyPng' ? 'copy the PNG' : action === 'copySvg' ? 'copy the SVG' : action === 'copyLink' ? 'copy the object link' : action === 'addToLibrary' ? 'save the selection' : 'complete this action'}: ${error.message}`);
    }
  }, [contextMenu, commitHistory, handleAction, notifyChange, scheduleRender, setAppState, setElements, theme, onToast]);

  // ── Imperative Doodle Engine API ──
  useImperativeHandle(ref, () => {
    const api = {
      // Getters
      getSceneElements: () => elementsRef.current.filter(el => !el.isDeleted),
      getSceneElementsIncludingDeleted: () => elementsRef.current,
      getAppState: () => appStateRef.current,
      getFiles: () => filesRef.current,
      renderCanvasStyle: (style) => renderRef.current?.(style),

      // Scene mutation
      updateScene: (sceneData) => {
        if (sceneData.elements !== undefined) {
          if (sceneData.commitToHistory !== false) commitHistory();
          setElements(sceneData.elements);
        }
        if (sceneData.appState !== undefined) {
          setAppState(prev => ({ ...prev, ...sceneData.appState }));
        }
        if (sceneData.files !== undefined) {
          setFiles(prev => ({ ...prev, ...sceneData.files }));
        }
        if (sceneData.collaborators !== undefined) {
          if (sceneData.collaborators instanceof Map) {
            collaboratorsRef.current = new Map(sceneData.collaborators);
          } else if (typeof sceneData.collaborators === 'object' && sceneData.collaborators !== null) {
            collaboratorsRef.current = new Map(Object.entries(sceneData.collaborators));
          }
        }
        notifyChange();
        scheduleRender();
      },

      resetScene: () => {
        setElements([]);
        setAppState(prev => ({
          ...prev,
          selectedElementIds: {},
          selectedGroupIds: {},
          editingElement: null,
          showWelcomeScreen: true,
        }));
        historyRef.current.clear();
      },

      // Tool control
      setActiveTool: (tool) => {
        setAppState({ activeTool: tool });
        if (canvasRef.current && tool?.type) {
          canvasRef.current.style.cursor = TOOL_CURSORS[tool.type] || 'default';
        }
        notifyChange();
        scheduleRender();
      },

      // ── Canvas Time Machine API ──
      getTimeMachineTimeline: () => {
        return historyRef.current.getTimeline(elementsRef.current);
      },
      previewTimeMachineStep: (index) => {
        if (!timeMachineOriginalRef.current) {
          timeMachineOriginalRef.current = elementsRef.current;
        }
        const snapshot = historyRef.current.peekSnapshot(index, timeMachineOriginalRef.current);
        if (snapshot) {
          setElements(snapshot);
          scheduleRender();
        }
      },
      exitTimeMachinePreview: () => {
        if (timeMachineOriginalRef.current) {
          setElements(timeMachineOriginalRef.current);
          timeMachineOriginalRef.current = null;
          scheduleRender();
        }
      },
      restoreTimeMachineStep: (index) => {
        const base = timeMachineOriginalRef.current || elementsRef.current;
        const restored = historyRef.current.restoreTo(index, base);
        timeMachineOriginalRef.current = null;
        if (restored) {
          setElements(restored);
          notifyChange();
          scheduleRender();
        }
      },

      // Viewport with Cinematic Smooth Animated Camera Easing
      scrollToContent: (elementsOrPoints, opts = {}) => {
        const els = elementsOrPoints || elementsRef.current.filter(el => !el.isDeleted);
        if (!els || els.length === 0) return;
        const bounds = getCommonBounds(Array.isArray(els) ? els : [els]);
        if (!bounds) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        const padding = opts.padding || 80;
        const zx = (cw - padding * 2) / (bounds.width || 1);
        const zy = (ch - padding * 2) / (bounds.height || 1);
        const targetZ = Math.min(1.5, Math.max(0.1, Math.min(zx, zy)));
        const targetScrollX = cw / 2 - (bounds.x + bounds.width / 2) * targetZ;
        const targetScrollY = ch / 2 - (bounds.y + bounds.height / 2) * targetZ;

        if (opts.animate) {
          const startScrollX = appStateRef.current.scrollX || 0;
          const startScrollY = appStateRef.current.scrollY || 0;
          const startZ = appStateRef.current.zoom?.value || 1;
          const startTime = performance.now();
          const duration = opts.duration || 420;

          const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Smooth easeInOutCubic
            const ease = progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            setAppState({
              zoom: { value: startZ + (targetZ - startZ) * ease },
              scrollX: startScrollX + (targetScrollX - startScrollX) * ease,
              scrollY: startScrollY + (targetScrollY - startScrollY) * ease,
            });

            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        } else {
          setAppState({
            zoom: { value: targetZ },
            scrollX: targetScrollX,
            scrollY: targetScrollY,
          });
        }
      },

      // Mind Mapping: Branch child node with connecting arrow
      branchChildNode: (direction = 'right') => {
        const as = appStateRef.current;
        const selectedIds = Object.keys(as.selectedElementIds || {}).filter(id => as.selectedElementIds[id]);
        if (selectedIds.length === 0) return;
        const parent = elementsRef.current.find(el => el.id === selectedIds[0] && !el.isDeleted);
        if (!parent) return;

        const isLR = direction === 'right' || direction === 'left';
        const isUp = direction === 'up';
        const isLeft = direction === 'left';

        const parentW = parent.width || 180;
        const parentH = parent.height || 64;
        const gapX = 130;
        const gapY = 85;

        const childX = isLR ? (isLeft ? parent.x - parentW - gapX : parent.x + parentW + gapX) : parent.x;
        const childY = isLR ? parent.y : (isUp ? parent.y - parentH - gapY : parent.y + parentH + gapY);

        const childId = 'node_' + generateId();
        const textId = 'text_' + generateId();
        const arrowId = 'arrow_' + generateId();

        const childShape = {
          ...parent,
          id: childId,
          x: childX,
          y: childY,
          width: parentW,
          height: parentH,
          boundElements: [{ id: textId, type: 'text' }],
          groupIds: [],
          frameId: parent.frameId || null,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: versionNonce(),
        };

        const font = parent.fontFamily || (FONT_FAMILY?.Doodlefont ?? 5);
        const childText = {
          id: textId,
          type: 'text',
          x: childX + 10,
          y: childY + (parentH / 2) - 12,
          width: Math.max(20, parentW - 20),
          height: 24,
          strokeColor: '#f3f4f6',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          fontFamily: font,
          fontSize: 15,
          textAlign: 'center',
          verticalAlign: 'middle',
          text: 'New Topic',
          originalText: 'New Topic',
          containerId: childId,
          version: 1,
          versionNonce: versionNonce(),
        };

        const pCenterX = parent.x + parentW / 2;
        const pCenterY = parent.y + parentH / 2;
        const cCenterX = childX + parentW / 2;
        const cCenterY = childY + parentH / 2;

        let startX, startY, endX, endY;
        if (direction === 'right') {
          startX = parent.x + parentW;
          startY = pCenterY;
          endX = childX;
          endY = cCenterY;
        } else if (direction === 'down') {
          startX = pCenterX;
          startY = parent.y + parentH;
          endX = cCenterX;
          endY = childY;
        } else if (direction === 'left') {
          startX = parent.x;
          startY = pCenterY;
          endX = childX + parentW;
          endY = cCenterY;
        } else {
          startX = pCenterX;
          startY = parent.y;
          endX = cCenterX;
          endY = childY + parentH;
        }

        const dx = endX - startX;
        const dy = endY - startY;

        const arrowEl = {
          id: arrowId,
          type: ELEMENT_TYPES.ARROW,
          x: startX,
          y: startY,
          width: Math.abs(dx),
          height: Math.abs(dy),
          strokeColor: '#94a3b8',
          backgroundColor: 'transparent',
          strokeWidth: 2,
          roughness: 1,
          opacity: 100,
          points: [[0, 0], [dx, dy]],
          startBinding: { elementId: parent.id, focus: 0, gap: 1 },
          endBinding: { elementId: childId, focus: 0, gap: 1 },
          endArrowhead: 'arrow',
          version: 1,
          versionNonce: versionNonce(),
        };

        setElements(prev => [...prev, childShape, childText, arrowEl]);
        setAppState({ selectedElementIds: { [childId]: true } });
        commitHistory();
        notifyChange();
        scheduleRender();
      },

      // Auto-arrange tree layout for connected nodes
      autoArrangeTreeLayout: (direction = 'LR') => {
        const currentEls = elementsRef.current.filter(el => !el.isDeleted);
        const arrows = currentEls.filter(el => (el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) && el.startBinding?.elementId && el.endBinding?.elementId);
        if (arrows.length === 0) return;

        const parentMap = new Map();
        const childrenMap = new Map();
        const nodeMap = new Map();

        for (const el of currentEls) {
          if (el.type !== ELEMENT_TYPES.ARROW && el.type !== ELEMENT_TYPES.LINE && el.type !== 'text') {
            nodeMap.set(el.id, el);
          }
        }

        for (const arrow of arrows) {
          const pId = arrow.startBinding.elementId;
          const cId = arrow.endBinding.elementId;
          if (nodeMap.has(pId) && nodeMap.has(cId)) {
            parentMap.set(cId, pId);
            if (!childrenMap.has(pId)) childrenMap.set(pId, []);
            childrenMap.get(pId).push(cId);
          }
        }

        const roots = [];
        for (const [id] of nodeMap) {
          if (!parentMap.has(id) && childrenMap.has(id)) {
            roots.push(id);
          }
        }
        if (roots.length === 0) return;

        const isLR = direction === 'LR';
        const gapX = isLR ? 150 : 90;
        const gapY = isLR ? 60 : 120;
        const arrangedPositions = new Map();

        for (const rootId of roots) {
          const rootNode = nodeMap.get(rootId);
          const startX = rootNode.x;
          const startY = rootNode.y;

          const positionNode = (nodeId, level, secondaryPos) => {
            const node = nodeMap.get(nodeId);
            const nw = node.width || 180;
            const nh = node.height || 60;

            const posX = isLR ? startX + level * (nw + gapX) : secondaryPos;
            const posY = isLR ? secondaryPos : startY + level * (nh + gapY);

            arrangedPositions.set(nodeId, { x: posX, y: posY });

            const children = childrenMap.get(nodeId) || [];
            if (children.length === 0) return;

            let childSec = secondaryPos - ((children.length - 1) * (isLR ? nh + gapY : nw + gapX)) / 2;
            for (const cId of children) {
              positionNode(cId, level + 1, childSec);
              childSec += isLR ? nh + gapY : nw + gapX;
            }
          };

          positionNode(rootId, 0, isLR ? startY : startX);
        }

        setElements(prev => prev.map(el => {
          if (arrangedPositions.has(el.id)) {
            const pos = arrangedPositions.get(el.id);
            return { ...el, x: pos.x, y: pos.y, version: (el.version || 1) + 1 };
          }
          if (el.containerId && arrangedPositions.has(el.containerId)) {
            const pos = arrangedPositions.get(el.containerId);
            const container = nodeMap.get(el.containerId);
            const origX = container.x;
            const origY = container.y;
            return { ...el, x: el.x + (pos.x - origX), y: el.y + (pos.y - origY), version: (el.version || 1) + 1 };
          }
          return el;
        }));

        commitHistory();
        notifyChange();
        scheduleRender();
      },

      // Create standardized presentation frame
      createPresentationFrame: (aspectRatio = '16:9') => {
        const frameCount = elementsRef.current.filter(el => el.type === ELEMENT_TYPES.FRAME && !el.isDeleted).length + 1;
        const as = appStateRef.current;
        const cw = canvasRef.current?.width || window.innerWidth;
        const ch = canvasRef.current?.height || window.innerHeight;
        const z = as.zoom?.value || 1;
        const centerX = -as.scrollX + cw / (2 * z);
        const centerY = -as.scrollY + ch / (2 * z);

        const frameW = 960;
        const frameH = aspectRatio === '4:3' ? 720 : 540;
        const frameId = 'frame_' + generateId();

        const frameEl = {
          id: frameId,
          type: ELEMENT_TYPES.FRAME,
          name: `Slide ${frameCount}`,
          x: Math.round(centerX - frameW / 2),
          y: Math.round(centerY - frameH / 2),
          width: frameW,
          height: frameH,
          strokeColor: '#444444',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          fillStyle: 'solid',
          strokeWidth: 2,
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: { type: 2 },
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: versionNonce(),
          isDeleted: false,
        };

        setElements(prev => [...prev, frameEl]);
        setAppState({ selectedElementIds: { [frameId]: true } });
        commitHistory();
        notifyChange();
        scheduleRender();
      },

      // Library (stub for compatibility)
      updateLibrary: ({ libraryItems, merge }) => {
        // No-op in custom engine (library is managed externally)
      },

      // File management
      addFiles: (newFiles) => {
        setFiles(prev => {
          const updated = { ...prev };
          for (const f of newFiles) updated[f.id] = f;
          return updated;
        });
      },

      // History
      history: {
        undo: () => {
          const prev = historyRef.current.undo(elementsRef.current);
          if (prev) { setElements(prev); notifyChange(); }
        },
        redo: () => {
          const next = historyRef.current.redo(elementsRef.current);
          if (next) { setElements(next); notifyChange(); }
        },
      },

      // Coordinate transforms
      canvasToScene: (cx, cy) => canvasToScene(cx, cy),
      getSelectedElements: () => getSelectedElements(),
      setSelectedElements: (ids) => setAppState({ selectedElementIds: ids || {} }),
      toggleLayerVisibility: (id) => {
        const element = elementsRef.current.find(item => item.id === id && !item.isDeleted);
        if (element) updateLayerProperty(id, 'isHidden', !element.isHidden);
      },
      toggleLayerLock: (id) => {
        const element = elementsRef.current.find(item => item.id === id && !item.isDeleted);
        if (element) updateLayerProperty(id, 'locked', !element.locked);
      },
      moveLayer,
      groupSelected: () => handleAction('group'),
      ungroupSelected: () => handleAction('ungroup'),
      toggleLayersPanel: () => setIsLayersPanelOpen(prev => !prev),

      // Zoom
      zoomIn: () => {
        setAppState(prev => ({ zoom: { value: Math.min(30, prev.zoom.value * 1.15) } }));
      },
      zoomOut: () => {
        setAppState(prev => ({ zoom: { value: Math.max(0.05, prev.zoom.value / 1.15) } }));
      },

      // Compatibility helpers
      setAppState: (patch) => setAppState(patch),
      setBackgroundColor: (color) => setAppState({ viewBackgroundColor: color }),
      focus: () => canvasRef.current?.focus(),
      selectAll: () => {
        const all = elementsRef.current.filter(el => !el.isDeleted && !el.isHidden && !el.locked);
        setAppState({ selectedElementIds: Object.fromEntries(all.map(el => [el.id, true])) });
      },
      clearSelection: () => setAppState({ selectedElementIds: {} }),
      getElementById: (id) => elementsRef.current.find(el => el.id === id),
      restyleElement: (id, patch) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...patch } : el));
      },
      insertSvgIcon: ({ svgString, name = 'Icon', width = 48, height = 48, x, y }) => {
        const fileId = generateId();
        const dataURL = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
        const img = new window.Image();
        img.onload = () => {
          imageCache.current[fileId] = img;
          const fileObj = {
            id: fileId,
            dataURL,
            mimeType: 'image/svg+xml',
            created: Date.now(),
          };
          setFiles(prev => ({ ...prev, [fileId]: fileObj }));

          let sceneX = x;
          let sceneY = y;
          if (sceneX === undefined || sceneY === undefined) {
            const canvas = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            const cw = (canvas?.width || 800) / dpr;
            const ch = (canvas?.height || 600) / dpr;
            [sceneX, sceneY] = canvasToScene(cw / 2 - width / 2, ch / 2 - height / 2);
          }

          const el = createElement(ELEMENT_TYPES.IMAGE, Math.round(sceneX), Math.round(sceneY), width, height, {
            fileId,
            strokeColor: 'transparent',
            backgroundColor: 'transparent',
            name: name,
          });

          setElements(prev => [...prev, el]);
          commitHistory();
          setAppState({ selectedElementIds: { [el.id]: true }, activeTool: { type: 'selection' }, showWelcomeScreen: false });
          notifyChange();
          scheduleRender();
        };
        img.src = dataURL;
      },
      toBlob: () => exportToBlob(),
    };

    if (typeof window !== 'undefined') {
      window.__doodleAPI = api;
    }

    return api;
  }, [
    canvasToScene,
    commitHistory,
    getSelectedElements,
    notifyChange,
    scheduleRender,
    setAppState,
    setElements,
    setFiles,
    updateLayerProperty,
    moveLayer,
    handleAction,
  ]);

  // Theme change - update background and shape drawing default color
  useEffect(() => {
    const isDark = theme === 'dark';
    const newBg = isDark ? '#121212' : '#ffffff';
    const newStroke = isDark ? '#ffffff' : '#1e1e1e';
    const oldStroke = isDark ? '#1e1e1e' : '#ffffff';

    setAppState(prev => {
      const currentStroke = prev?.currentItemStrokeColor;
      const shouldUpdateStroke = !currentStroke || currentStroke === oldStroke;
      return {
        viewBackgroundColor: newBg,
        theme,
        currentItemStrokeColor: shouldUpdateStroke ? newStroke : currentStroke,
      };
    });
    const nextElements = adaptDefaultStrokeColors(elementsRef.current, theme);
    if (nextElements !== elementsRef.current) {
      commitHistory();
      setElements(nextElements);
      notifyChange();
    }
    scheduleRender();
  }, [theme, setAppState, setElements, commitHistory, notifyChange, scheduleRender]);

  // Attach global key listeners
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown, { capture: false });
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: false });
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  // ── UI Handlers ──
  const handleSelectTool = useCallback((toolId) => {
    setAppState(prev => ({
      activeTool: { type: toolId },
      selectedElementIds: toolId === 'selection' ? prev.selectedElementIds : {},
      showWelcomeScreen: toolId === 'selection' ? prev.showWelcomeScreen : false,
    }));
    if (canvasRef.current) {
      canvasRef.current.style.cursor = TOOL_CURSORS[toolId] || 'default';
    }
    notifyChange();
    scheduleRender();
  }, [notifyChange, scheduleRender, setAppState]);

  const handleInsertImage = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result;
      const img = new window.Image();
      img.onload = () => {
        const fileId = generateId();
        const fileObj = {
          id: fileId,
          dataURL,
          mimeType: file.type,
          created: Date.now(),
        };
        imageCache.current[fileId] = img;
        setFiles(prev => ({ ...prev, [fileId]: fileObj }));

        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const cw = (canvas?.width || 800) / dpr;
        const ch = (canvas?.height || 600) / dpr;
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const [sceneX, sceneY] = canvasToScene(cw / 2 - w / 2, ch / 2 - h / 2);

        const el = createElement(ELEMENT_TYPES.IMAGE, sceneX, sceneY, w, h, {
          fileId,
          strokeColor: 'transparent',
          backgroundColor: 'transparent',
        });

        setElements(prev => [...prev, el]);
        commitHistory();
        setAppState({ selectedElementIds: { [el.id]: true }, activeTool: { type: 'selection' }, showWelcomeScreen: false });
        notifyChange();
        scheduleRender();
      };
      img.src = dataURL;
    };
    reader.readAsDataURL(file);
  }, [canvasToScene, commitHistory, notifyChange, scheduleRender, setAppState, setElements]);

  const handleUpdateProperty = useCallback((key, value) => {
    const selectedIds = appStateRef.current.selectedElementIds || {};
    const hasSelection = elementsRef.current.some(el =>
      selectedIds[el.id] && !el.isDeleted && !el.isHidden && !el.locked
    );
    const normalizedValue = key === 'roundness'
      ? value  // keep as 'sharp' or 'round' string — renderer checks these directly
      : value;

    if (hasSelection) {
      setElements(prev =>
        prev.map(el => {
          if (selectedIds[el.id] && !el.isDeleted && !el.isHidden && !el.locked) {
            if (el.type === ELEMENT_TYPES.TEXT && (key === 'fontSize' || key === 'fontFamily' || key === 'text')) {
              const newFontSize = key === 'fontSize' ? normalizedValue : (el.fontSize || FONT_SIZE_DEFAULT);
              const newFontFamily = key === 'fontFamily' ? normalizedValue : (el.fontFamily || 5);
              const newText = key === 'text' ? normalizedValue : (el.text || ' ');
              const metrics = measureText(newText, newFontSize, newFontFamily);
              return {
                ...el,
                [key]: normalizedValue,
                width: metrics.width,
                height: metrics.height,
                version: (el.version || 1) + 1,
                versionNonce: versionNonce(),
              };
            }
            return {
              ...el,
              [key]: normalizedValue,
              version: (el.version || 1) + 1,
              versionNonce: versionNonce(),
            };
          }
          return el;
        })
      );
      commitHistory();
      notifyChange();
    }

    const appStateKeyMap = {
      strokeColor: 'currentItemStrokeColor',
      backgroundColor: 'currentItemBackgroundColor',
      fillStyle: 'currentItemFillStyle',
      strokeWidth: 'currentItemStrokeWidth',
      strokeStyle: 'currentItemStrokeStyle',
      roughness: 'currentItemRoughness',
      roundness: 'currentItemRoundness',
      opacity: 'currentItemOpacity',
      fontSize: 'currentItemFontSize',
      fontFamily: 'currentItemFontFamily',
      textAlign: 'currentItemTextAlign',
    };
    const asKey = appStateKeyMap[key];
    if (asKey) {
      setAppState({ [asKey]: normalizedValue });
    }
    scheduleRender();
  }, [commitHistory, notifyChange, scheduleRender, setAppState, setElements]);

  const selectedElementsForComponent = useMemo(
    () => isComponentsPanelOpen ? getSelectedElements() : [],
    [isComponentsPanelOpen, elements, appState.selectedElementIds, getSelectedElements]
  );
  const selectedComponentIds = useMemo(
    () => [...new Set(selectedElementsForComponent
      .map(element => element.componentId)
      .filter(Boolean))],
    [selectedElementsForComponent]
  );
  const selectedComponentId = selectedComponentIds.length === 1 &&
    selectedElementsForComponent.every(element => element.componentId === selectedComponentIds[0])
    ? selectedComponentIds[0]
    : null;
  const simulationGraph = useMemo(
    () => isSimulationActive ? buildSimulationGraph(elements) : null,
    [elements, isSimulationActive]
  );
  const simulationChoices = useMemo(
    () => simulationCurrentId && simulationGraph
      ? getSimulationChoices(simulationGraph, simulationCurrentId)
      : [],
    [simulationGraph, simulationCurrentId]
  );
  const changeRows = useMemo(
    () => changeSnapshot ? compareSceneToSnapshot(elements, changeSnapshot) : [],
    [elements, changeSnapshot]
  );
  const createComponentFromSelection = (name) => {
    const component = createSmartComponent(selectedElementsForComponent, name, filesRef.current);
    const nextComponents = writeSmartComponents([...readSmartComponents(), component]);
    setSmartComponents(nextComponents);
  };

  const insertComponent = (component) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) throw new Error('The canvas is not ready for component insertion.');
    const [centerX, centerY] = canvasToScene(rect.width / 2, rect.height / 2);
    const instance = instantiateSmartComponent(
      component,
      centerX - component.width / 2,
      centerY - component.height / 2
    );
    commitHistory();
    setElements([...elementsRef.current, ...instance.elements]);
    if (Object.keys(instance.files).length) setFiles(prev => ({ ...prev, ...instance.files }));
    setAppState(prev => ({
      ...prev,
      selectedElementIds: Object.fromEntries(instance.elements.map(element => [element.id, true])),
    }));
    notifyChange();
    scheduleRender();
  };

  const updateComponentMaster = (componentId) => {
    const selectedInstanceIds = [...new Set(selectedElementsForComponent
      .filter(element => element.componentId === componentId && element.componentInstanceId)
      .map(element => element.componentInstanceId))];
    if (selectedInstanceIds.length !== 1) {
      throw new Error('Select exactly one component instance to update its master.');
    }
    const selectedInstance = elementsRef.current.filter(
      element => !element.isDeleted &&
        element.componentId === componentId &&
        element.componentInstanceId === selectedInstanceIds[0]
    );
    if (selectedInstance.length === 0) {
      throw new Error('The selected component instance is empty.');
    }
    const current = readSmartComponents();
    const existing = current.find(component => component.id === componentId);
    if (!existing) throw new Error('This component is no longer in the saved library.');
    const updated = createSmartComponent(selectedInstance, existing.name, filesRef.current, componentId);
    const nextComponents = writeSmartComponents(current.map(component =>
      component.id === componentId ? updated : component
    ));
    setSmartComponents(nextComponents);
    const updatedInstances = props.onUpdateComponentInstances?.(updated) || 0;
    if (!props.onUpdateComponentInstances) {
      const result = updateSmartComponentInstances(elementsRef.current, updated);
      if (result.instanceCount) {
        commitHistory();
        setElements(result.elements);
        if (Object.keys(result.files).length) setFiles(prev => ({ ...prev, ...result.files }));
        notifyChange();
        scheduleRender();
      }
    }
    if (!updatedInstances && props.onUpdateComponentInstances) {
      throw new Error('No linked instances were found on any board.');
    }
  };

  const deleteSmartComponent = (componentId) => {
    const nextComponents = writeSmartComponents(
      readSmartComponents().filter(component => component.id !== componentId)
    );
    setSmartComponents(nextComponents);
  };

  const createBoardPortal = (workspace, file) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) throw new Error('The canvas is not ready for portal insertion.');
    const [centerX, centerY] = canvasToScene(rect.width / 2, rect.height / 2);
    const portal = createElement(ELEMENT_TYPES.BOARD_PORTAL, centerX - 140, centerY - 75, 280, 150, {
      portalWorkspaceId: workspace.id,
      portalFileId: file.id,
      portalWorkspaceName: workspace.name,
      portalFileName: file.name,
      portalTheme: theme,
      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
      strokeColor: '#6366f1',
      roughness: 0,
    });
    commitHistory();
    setElements([...elementsRef.current, portal]);
    setAppState(prev => ({
      ...prev,
      selectedElementIds: { [portal.id]: true },
      showWelcomeScreen: false,
    }));
    setIsPortalPanelOpen(false);
    notifyChange();
    scheduleRender();
  };

  const saveChangeBaseline = () => {
    try {
      const nextSnapshot = createChangeSnapshot(elementsRef.current);
      writeChangeSnapshot(workspaceId, fileId, nextSnapshot);
      setChangeSnapshot(nextSnapshot);
    } catch (error) {
      console.error('Unable to save board change tracking baseline', error);
      window.alert(`Could not save this board's change baseline: ${error.message}`);
    }
  };

  const removeChangeBaseline = () => {
    try {
      clearChangeSnapshot(workspaceId, fileId);
      setChangeSnapshot(null);
    } catch (error) {
      console.error('Unable to remove board change tracking baseline', error);
      window.alert(`Could not remove this board's change baseline: ${error.message}`);
    }
  };

  const focusTrackedChange = (change) => {
    const currentElement = elementsRef.current.find(element => element.id === change.id && !element.isDeleted);
    const target = currentElement || change.element;
    if (!target) return;
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    const zoom = appStateRef.current.zoom?.value || 1;
    const x = target.x + (target.width || 0) / 2;
    const y = target.y + (target.height || 0) / 2;
    setAppState({
      scrollX: rect.width / 2 - x * zoom,
      scrollY: rect.height / 2 - y * zoom,
      ...(currentElement ? { selectedElementIds: { [currentElement.id]: true } } : { selectedElementIds: {} }),
    });
  };

  const startSimulationAt = (nodeId) => {
    setSimulationCurrentId(nodeId);
    setSimulationPath([nodeId]);
  };

  const startSimulation = () => {
    setIsLayersPanelOpen(false);
    setIsComponentsPanelOpen(false);
    setIsPortalPanelOpen(false);
    setIsChangeTrackingOpen(false);
    setIsSimulationActive(true);
    const graph = buildSimulationGraph(elementsRef.current);
    const selected = getSelectedElements().find(element =>
      graph.nodes.some(node => node.id === element.id)
    );
    if (selected) startSimulationAt(selected.id);
    else if (graph.starts.length === 1) startSimulationAt(graph.starts[0].id);
    else {
      setSimulationCurrentId(null);
      setSimulationPath([]);
    }
  };

  const chooseSimulationBranch = (choice) => {
    setSimulationCurrentId(choice.to);
    setSimulationPath(path => [...path, choice.to]);
  };

  // ── Welcome screen ──
  const nonDeletedElements = elements.filter(e => !e.isDeleted);
  const contextMenuElements = contextMenu
    ? elements.filter(el => contextMenu.elementIds.includes(el.id) && !el.isDeleted && !el.isHidden)
    : [];
  const showWelcome = nonDeletedElements.length === 0 &&
    (appState.activeTool?.type === 'selection' || !appState.activeTool?.type);

  return (
    <div
      ref={containerRef}
      className={`doodle-canvas-root doodle-engine-container ${theme === 'dark' ? 'theme--dark' : 'theme--light'}`}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none' }}
    >
      {contextMenu && (
        <Suspense fallback={null}>
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            hasSelection={contextMenuElements.length > 0}
            canEdit={contextMenuElements.length > 0 && contextMenuElements.every(el => !el.locked)}
            canPaste={Boolean(window.__doodleClipboard?.length)}
            hasStyles={contextMenuStylesAvailable}
            selectedLocked={contextMenuElements.length > 0 && contextMenuElements.every(el => el.locked)}
            onAction={handleContextMenuAction}
            onClose={() => setContextMenu(null)}
            theme={theme}
          />
        </Suspense>
      )}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: isPrototypeMode ? 'pointer' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />

      {frameNameEdit && (() => {
        const frame = elements.find(element => element.id === frameNameEdit.id && !element.isDeleted && !element.isHidden);
        if (!frame) return null;
        const frameX = frame.width < 0 ? frame.x + frame.width : frame.x;
        const frameY = frame.height < 0 ? frame.y + frame.height : frame.y;
        const [left, top] = sceneBoundsToCanvas(frameX, frameY - 26);
        const zoom = appState.zoom?.value || 1;
        const width = Math.max(54, ((frameNameEdit.draft.length || 5) * 8) + 20) * zoom;
        return (
          <input
            ref={frameNameInputRef}
            type="text"
            className="doodle-frame-name-input"
            aria-label="Frame name"
            value={frameNameEdit.draft}
            onChange={(event) => setFrameNameEdit(current =>
              current ? { ...current, draft: event.target.value } : current
            )}
            onBlur={() => {
              if (cancelFrameNameEditRef.current) {
                cancelFrameNameEditRef.current = false;
                return;
              }
              commitFrameNameEdit();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                cancelFrameNameEditRef.current = true;
                setFrameNameEdit(null);
                event.currentTarget.blur();
              }
            }}
            style={{
              left,
              top,
              width,
              height: 22 * zoom,
              fontSize: 12 * zoom,
            }}
          />
        );
      })()}

      {changeRows.map(change => {
        const bounds = getElementBounds(change.element);
        const [left, top] = sceneBoundsToCanvas(bounds.x, bounds.y);
        const zoom = appState.zoom?.value || 1;
        return (
          <div
            key={`change-marker:${change.status}:${change.id}`}
            className={`doodle-change-marker is-${change.status}`}
            style={{
              left,
              top,
              width: Math.max(8, bounds.width * zoom),
              height: Math.max(8, bounds.height * zoom),
              transform: change.element.angle ? `rotate(${change.element.angle}rad)` : undefined,
            }}
            aria-hidden="true"
          />
        );
      })}

      {isSimulationActive && simulationCurrentId && (() => {
        const currentNode = simulationGraph.nodes.find(node => node.id === simulationCurrentId);
        if (!currentNode) return null;
        const bounds = getElementBounds(currentNode);
        const [left, top] = sceneBoundsToCanvas(bounds.x, bounds.y);
        const zoom = appState.zoom?.value || 1;
        return (
          <div
            className="doodle-simulation-focus"
            style={{
              left,
              top,
              width: Math.max(8, bounds.width * zoom),
              height: Math.max(8, bounds.height * zoom),
              transform: currentNode.angle ? `rotate(${currentNode.angle}rad)` : undefined,
            }}
            aria-hidden="true"
          />
        );
      })()}

      {elements.filter(element =>
        element.type === ELEMENT_TYPES.BOARD_PORTAL && !element.isDeleted && !element.isHidden
      ).map(element => {
        const [left, top] = sceneBoundsToCanvas(element.x, element.y);
        const zoom = appState.zoom?.value || 1;
        return (
          <div
            key={`portal-open:${element.id}`}
            className="doodle-portal-overlay"
            style={{
              left,
              top,
              width: Math.max(0, Math.abs(element.width) * zoom),
              height: Math.max(0, Math.abs(element.height) * zoom),
              transform: element.angle ? `rotate(${element.angle}rad)` : undefined,
            }}
          >
            <button
              type="button"
              title={`Open ${element.portalFileName || 'linked board'}`}
              aria-label={`Open linked board ${element.portalFileName || ''}`}
              onClick={() => onNavigateBoardPortal?.(element.portalWorkspaceId, element.portalFileId)}
            >
              Open board <span aria-hidden="true">↗</span>
            </button>
          </div>
        );
      })}

      {/* Web content is rendered as a DOM overlay */}
      {renderEmbeddable && elements.filter((el) => (el.type === ELEMENT_TYPES.IFRAME || el.type === 'embeddable' || el.type === 'iframe') && !el.isDeleted && !el.isHidden).map((el) => {
        const [left, top] = sceneBoundsToCanvas(el.x, el.y);
        const z = appState.zoom?.value || 1;
        const inset = 4 / z;
        const width = Math.max(0, Math.abs(el.width) - inset * 2);
        const height = Math.max(0, Math.abs(el.height) - inset * 2);
        return (
          <div
            key={el.id}
            className="doodle-embed-overlay"
            style={{
              position: 'absolute',
              left: `${left + inset}px`,
              top: `${top + inset}px`,
              width: `${width * z}px`,
              height: `${height * z}px`,
              overflow: 'visible',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 2,
              transform: el.angle ? `rotate(${el.angle}rad)` : undefined,
              transformOrigin: 'center center',
            }}
          >
            {renderEmbeddable(el, appState)}
          </div>
        );
      })}

      {/* Top Toolbar */}
      <TopToolbar
        activeTool={appState.activeTool?.type || 'selection'}
        onSelectTool={handleSelectTool}
        isLocked={isToolLocked}
        onToggleLock={() => setIsToolLocked(prev => !prev)}
        onInsertImage={handleInsertImage}
        isDrawToShapeActive={isDrawToShapeActive}
      />

      {/* Properties Panel (Left Sidebar) */}
      <PropertiesPanel
        selectedElements={getSelectedElements()}
        appState={appState}
        onUpdateProperty={handleUpdateProperty}
        onAction={handleAction}
        onOpenColorPalette={onOpenColorPalette}
      />

      {/* Bottom-Left Controls (Zoom & Undo/Redo) */}
      <FooterLeft
        zoomLevel={appState.zoom?.value || 1}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onUndo={() => {
          const prev = historyRef.current.undo(elementsRef.current);
          if (prev) { setElements(prev); notifyChange(); scheduleRender(); }
        }}
        onRedo={() => {
          const next = historyRef.current.redo(elementsRef.current);
          if (next) { setElements(next); notifyChange(); scheduleRender(); }
        }}
      />

      <div className="doodle-feature-tools-left" aria-label="Diagram features">
        <button
          type="button"
          className={`doodle-feature-tool-button${isSimulationActive ? ' is-active' : ''}`}
          onClick={() => {
            if (isSimulationActive) {
              setIsSimulationActive(false);
              setSimulationCurrentId(null);
              setSimulationPath([]);
            } else {
              startSimulation();
            }
          }}
          title={isSimulationActive ? 'Exit diagram simulation' : 'Simulate connected flow'}
          aria-label={isSimulationActive ? 'Exit diagram simulation' : 'Start diagram simulation'}
          aria-pressed={isSimulationActive}
        >
          <CirclePlay size={20} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`doodle-feature-tool-button${isChangeTrackingOpen ? ' is-active' : ''}`}
          onClick={() => {
            setIsLayersPanelOpen(false);
            setIsComponentsPanelOpen(false);
            setIsPortalPanelOpen(false);
            setIsSimulationActive(false);
            setIsChangeTrackingOpen(value => !value);
          }}
          title="Visual change tracking"
          aria-label="Toggle visual change tracking"
          aria-expanded={isChangeTrackingOpen}
        >
          <GitCompareArrows size={20} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className={`doodle-feature-tool-button${isPortalPanelOpen ? ' is-active' : ''}`}
          onClick={() => {
            setIsLayersPanelOpen(false);
            setIsComponentsPanelOpen(false);
            setIsChangeTrackingOpen(false);
            setIsSimulationActive(false);
            setIsPortalPanelOpen(value => !value);
          }}
          title="Create a board portal"
          aria-label="Toggle board portal panel"
          aria-expanded={isPortalPanelOpen}
        >
          <PanelTop size={20} strokeWidth={1.8} />
        </button>
      </div>

      {/* Top-Right Stack: Library Button (Settings button portals in below this) */}
      <div className="layer-ui__wrapper__top-right">
        <button
          type="button"
          className={`ToolIcon ToolIcon_type_button sidebar-trigger${isComponentsPanelOpen ? ' is-active' : ''}`}
          onClick={() => {
            try {
              setSmartComponents(readSmartComponents());
              setIsLayersPanelOpen(false);
              setIsPortalPanelOpen(false);
              setIsChangeTrackingOpen(false);
              setIsSimulationActive(false);
              setIsComponentsPanelOpen(prev => !prev);
            } catch (error) {
              window.alert(`Could not open the component library: ${error.message}`);
            }
          }}
          title="Smart components"
          aria-label="Toggle smart components panel"
          aria-expanded={isComponentsPanelOpen}
        >
          <div className="ToolIcon__icon">
            <Box size={18} strokeWidth={1.8} />
          </div>
        </button>
        <button
          type="button"
          className={`ToolIcon ToolIcon_type_button sidebar-trigger${isLayersPanelOpen ? ' is-active' : ''}`}
          onClick={() => {
            setIsComponentsPanelOpen(false);
            setIsPortalPanelOpen(false);
            setIsChangeTrackingOpen(false);
            setIsSimulationActive(false);
            setIsLayersPanelOpen(prev => !prev);
          }}
          title="Layers (Shift+L)"
          aria-label="Toggle layers panel"
          aria-expanded={isLayersPanelOpen}
        >
          <div className="ToolIcon__icon">
            <LayersIcon size={18} strokeWidth={1.8} />
          </div>
        </button>
        <button
          type="button"
          className="ToolIcon ToolIcon_type_button sidebar-trigger"
          onClick={() => {
            if (props.onToggleLibrary) props.onToggleLibrary();
            else if (props.onOpenLibrary) props.onOpenLibrary();
          }}
          title="Library"
          aria-label="Library"
        >
          <div className="ToolIcon__icon">
            <BookOpen size={18} strokeWidth={1.8} />
          </div>
        </button>
      </div>

      {isLayersPanelOpen && (
        <Suspense fallback={null}>
          <LayersPanel
            elements={elements}
            selectedIds={appState.selectedElementIds || {}}
            onClose={() => setIsLayersPanelOpen(false)}
            onSelect={selectLayer}
            onToggleVisibility={(id) => {
              const element = elementsRef.current.find(item => item.id === id);
              if (element) updateLayerProperty(id, 'isHidden', !element.isHidden);
            }}
            onToggleLock={(id) => {
              const element = elementsRef.current.find(item => item.id === id);
              if (element) updateLayerProperty(id, 'locked', !element.locked);
            }}
            onMove={moveLayer}
            onGroup={() => handleAction('group')}
            onUngroup={() => handleAction('ungroup')}
          />
        </Suspense>
      )}
      {isComponentsPanelOpen && (
        <Suspense fallback={null}>
          <SmartComponentsPanel
            components={smartComponents}
            selectedCount={selectedElementsForComponent.length}
            selectedComponentId={selectedComponentId}
            onClose={() => setIsComponentsPanelOpen(false)}
            onCreate={createComponentFromSelection}
            onInsert={insertComponent}
            onUpdate={updateComponentMaster}
            onDelete={deleteSmartComponent}
          />
        </Suspense>
      )}
      {isPortalPanelOpen && (
        <Suspense fallback={null}>
          <BoardPortalPanel
            workspaces={workspaces}
            activeWorkspaceId={workspaceId}
            activeFileId={fileId}
            onCreate={createBoardPortal}
            onClose={() => setIsPortalPanelOpen(false)}
          />
        </Suspense>
      )}
      {isChangeTrackingOpen && (
        <Suspense fallback={null}>
          <ChangeTrackingPanel
            hasBaseline={Boolean(changeSnapshot)}
            changes={changeRows}
            onSetBaseline={saveChangeBaseline}
            onClearBaseline={removeChangeBaseline}
            onFocus={focusTrackedChange}
            onClose={() => setIsChangeTrackingOpen(false)}
          />
        </Suspense>
      )}
      {isSimulationActive && (
        <Suspense fallback={null}>
          <SimulationPanel
            nodes={simulationCurrentId ? simulationGraph.nodes : simulationGraph.starts.length ? simulationGraph.starts : simulationGraph.nodes}
            currentId={simulationCurrentId}
            path={simulationPath}
            choices={simulationChoices}
            onStart={startSimulationAt}
            onChoose={chooseSimulationBranch}
            onBack={() => {
              const previousPath = simulationPath.slice(0, -1);
              setSimulationPath(previousPath);
              setSimulationCurrentId(previousPath[previousPath.length - 1] || null);
            }}
            onReset={() => {
              const firstId = simulationPath[0];
              setSimulationCurrentId(firstId || null);
              setSimulationPath(firstId ? [firstId] : []);
            }}
            onClose={() => {
              setIsSimulationActive(false);
              setSimulationCurrentId(null);
              setSimulationPath([]);
            }}
          />
        </Suspense>
      )}

      {/* Bottom-Right: Help (?) button pill */}
      <div className="layer-ui__wrapper__footer-right">
        <button
          type="button"
          className="help-icon"
          onClick={() => {
            if (props.onOpenHelp) props.onOpenHelp();
            else window.__doodleOpenHelp?.();
          }}
          title="Help & Shortcuts (?)"
          aria-label="Help"
        >
          <HelpCircle size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* Welcome Screen (from children) */}
      {showWelcome && children && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          {children}
        </div>
      )}

      {/* Canvas style CSS */}
      <style>{`
        .doodle-engine-container {
          font-family: inherit;
        }
        .doodle-engine-container canvas {
          cursor: ${TOOL_CURSORS[appState.activeTool?.type] || 'default'};
        }
      `}</style>
    </div>
  );
});

export default DoodleCanvas;

// Named exports for Doodle Engine
export { DoodleCanvas };
export { FONT_FAMILY };
export { serializeAsJSON };
