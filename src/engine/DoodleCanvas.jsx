import React, {
  useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef
} from 'react';
import { renderElement, renderSelectionOverlay, measureText } from './renderer/render.js';
import {
  getElementAtPoint, getElementsInRect,
  getResizeHandleAt, getCursorForHandle, RESIZE_HANDLES
} from './hitTest.js';
import {
  ELEMENT_TYPES, createElement, createTextElement, createLinearElement,
  createFreedrawElement, cloneElement, normalizeElement, normalizeFreedrawElement,
  FONT_FAMILY, FONT_SIZE_DEFAULT, serializeAsJSON, generateId, versionNonce
} from './elements.js';
import { HistoryManager } from './history.js';
import {
  getCommonBounds, getElementBounds, getBoundsFromPoints, rotatePoint,
  getElementCenter, snapToGrid, distance
} from './math/geometry.js';
import { TopToolbar } from './components/TopToolbar.jsx';
import { PropertiesPanel } from './components/PropertiesPanel.jsx';
import { FooterLeft } from './components/FooterLeft.jsx';
import { exportToBlob, exportToSvg } from './io/export.js';
import { BookOpen, HelpCircle } from 'lucide-react';

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
    onPointerUpdate,
    onLinkOpen,
    renderEmbeddable,
    isDrawToShapeActive = false,
    onFreeDrawCommit,
    initialData,
    UIOptions,
    isCollaborating = false,
    collaborators,
    onOpenColorPalette,
    children,
  } = props;

  // ── State ──
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const imageCache = useRef({});

  const [elements, setElementsState] = useState(() => initialData?.elements || []);
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
  const [isToolLocked, setIsToolLocked] = useState(false);
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
  });

  // ── Setters ──
  const setElements = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(elementsRef.current) : updater;
    elementsRef.current = next;
    setElementsState(next);
  }, []);

  const setAppState = useCallback((updater) => {
    const patch = typeof updater === 'function' ? updater(appStateRef.current) : updater;
    const next = {
      ...appStateRef.current,
      ...patch,
      selectedElementIds: (patch && patch.selectedElementIds !== undefined)
        ? (patch.selectedElementIds || {})
        : (appStateRef.current?.selectedElementIds || {}),
    };
    appStateRef.current = next;
    setAppStateRaw(next);
  }, []);

  // ── Derived helpers ──
  const getSelectedElements = useCallback(() => {
    const ids = appStateRef.current?.selectedElementIds || {};
    return elementsRef.current.filter(el => ids[el.id] && !el.isDeleted);
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
  const render = useCallback(() => {
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
    if (canvasStyle === 'blueprint') {
      bg = '#0c1b33';
    } else if (canvasStyle === 'dotgrid') {
      bg = theme === 'dark' ? '#141416' : '#f8fafc';
    } else if (canvasStyle === 'isometric') {
      bg = theme === 'dark' ? '#121215' : '#ffffff';
    } else if (canvasStyle === 'parchment') {
      bg = '#fbf7ee';
    } else if (canvasStyle === 'engineering') {
      bg = '#111215';
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssW, cssH);

    // ── 2. Render Canvas Paper & Grid System ──
    if (canvasStyle === 'blueprint') {
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
    } else if (canvasStyle === 'dotgrid') {
      ctx.save();
      const step = 24 * z;
      const startX = ((scrollX % step) + cssW) % step;
      const startY = ((scrollY % step) + cssH) % step;
      ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(15, 23, 42, 0.25)';
      const dotRadius = Math.max(1, Math.min(2.2, 1.25 * Math.sqrt(z)));
      ctx.beginPath();
      for (let gx = startX; gx < cssW; gx += step) {
        for (let gy = startY; gy < cssH; gy += step) {
          ctx.moveTo(gx + dotRadius, gy);
          ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.restore();
    } else if (canvasStyle === 'isometric') {
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
    } else if (canvasStyle === 'parchment') {
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
    } else if (canvasStyle === 'engineering') {
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

    // Render all elements
    for (const el of elementsRef.current) {
      if (el.isDeleted) continue;
      // While editing, the DOM textarea is the visible text layer. Do not
      // paint the same text to canvas underneath it.
      if (el.id === interaction.current.editingElementId) continue;
      renderElement(ctx, el, imageCache.current);
    }

    // Render in-progress drawing element
    const drawing = interaction.current.drawingElement;
    if (drawing) {
      renderElement(ctx, drawing, imageCache.current);
    }

    // Selection rect
    const selRect = interaction.current.selectionRect;
    if (selRect) {
      ctx.strokeStyle = '#6965db';
      ctx.fillStyle = 'rgba(105,101,219,0.08)';
      ctx.lineWidth = 1 / z;
      ctx.setLineDash([4 / z, 3 / z]);
      ctx.fillRect(selRect.x, selRect.y, selRect.width, selRect.height);
      ctx.strokeRect(selRect.x, selRect.y, selRect.width, selRect.height);
      ctx.setLineDash([]);
    }

    // Selection overlays
    const selectedEls = elementsRef.current.filter(el =>
      selectedElementIds && selectedElementIds[el.id] && !el.isDeleted &&
      el.id !== interaction.current.editingElementId
    );
    if (selectedEls.length > 0) {
      renderSelectionOverlay(ctx, selectedEls, z);
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
        const color = collab.color || '#6965db';

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

  // Schedule render via RAF
  const scheduleRender = useCallback(() => {
    if (animRef.current) return;
    animRef.current = requestAnimationFrame(() => {
      animRef.current = null;
      render();
    });
  }, [render]);

  // ── Canvas resize ──
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
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
      if (rawHit) {
        // If clicking inside a container (such as text on a sticky note), select the container box
        const hit = rawHit.containerId
          ? (elementsRef.current.find(e => e.id === rawHit.containerId && !e.isDeleted) || rawHit)
          : rawHit;

        const selectedIds = as?.selectedElementIds || {};
        const isAlreadySelected = selectedIds[hit.id];

        if (e.shiftKey) {
          // Toggle selection
          setAppState(prev => ({
            selectedElementIds: {
              ...(prev?.selectedElementIds || {}),
              [hit.id]: !(prev?.selectedElementIds || {})[hit.id] || undefined,
            }
          }));
        } else if (!isAlreadySelected) {
          setAppState({ selectedElementIds: { [hit.id]: true } });
        }
        interaction.current.isDragging = true;
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
        ...createElement(ELEMENT_TYPES.FREEDRAW, ix, iy, 0, 0, {
          strokeColor,
          strokeWidth,
          opacity,
          roughness: 0, // Freedraw never sketchy
        }),
        points: [[0, 0]],
        pressures: [e.pressure || 0.5],
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
  }, [getScenePoint, getSelectedElements, setAppState, setElements, scheduleRender, commitHistory, notifyChange]);

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
      setAppState(prev => ({
        scrollX: prev.scrollX + dx,
        scrollY: prev.scrollY + dy,
      }));
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

      if (handle.includes('e')) w = Math.max(2, el.width + dx);
      if (handle.includes('s')) h = Math.max(2, el.height + dy);
      if (handle.includes('w')) { x = el.x + dx; w = Math.max(2, el.width - dx); }
      if (handle.includes('n')) { y = el.y + dy; h = Math.max(2, el.height - dy); }

      let updatedPoints = undefined;

      if (el.type === ELEMENT_TYPES.FREEDRAW && el.points?.length) {
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
      // We need scene delta, not canvas delta
      const z = as.zoom.value;
      const sdx = (e.clientX - ia.dragLastX) / z;
      const sdy = (e.clientY - ia.dragLastY) / z;
      ia.dragLastX = e.clientX;
      ia.dragLastY = e.clientY;

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
        }
      }

      const selectedFrames = currentElements.filter(el => allIdsToMove.has(el.id) && el.type === ELEMENT_TYPES.FRAME && !el.isDeleted);
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

      setElements(prev => prev.map(el =>
        allIdsToMove.has(el.id) && !el.isDeleted
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
        const newPt = [ix - drawing.x, iy - drawing.y];
        // Compute speed-based simulated pressure when hardware pressure not available.
        // Slower strokes = higher pressure (thicker), faster strokes = lower pressure (thinner).
        let pressure = e.pressure;
        if (!pressure || pressure <= 0 || pressure === 0) {
          const prevPt = drawing.points[drawing.points.length - 1];
          if (prevPt) {
            const dx = newPt[0] - prevPt[0];
            const dy = newPt[1] - prevPt[1];
            const speed = Math.sqrt(dx * dx + dy * dy);
            // Map speed 0→10 to pressure 0.8→0.3 (slower = more pressure)
            pressure = Math.max(0.2, Math.min(0.85, 0.85 - speed * 0.04));
          } else {
            pressure = 0.5;
          }
        }
        ia.drawingElement = {
          ...drawing,
          width: Math.max(drawing.width, Math.abs(newPt[0])),
          height: Math.max(drawing.height, Math.abs(newPt[1])),
          points: [...drawing.points, newPt],
          pressures: [...(drawing.pressures || []), pressure],
        };

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
  }, [getScenePoint, getSelectedElements, setAppState, setElements, scheduleRender, onPointerUpdate]);

  const onPointerUp = useCallback((e) => {
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {}

    const ia = interaction.current;
    const as = appStateRef.current;

    if (ia.isPanning) {
      ia.isPanning = false;
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
        if (norm.points.length < 3) {
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
      const keepFreedrawForShapeMode = norm.type === ELEMENT_TYPES.FREEDRAW && isDrawToShapeActive;
      setAppState(prev => ({
        selectedElementIds: keepFreedrawForShapeMode ? {} : { [norm.id]: true },
        activeTool: isToolLockedRef.current || keepFreedrawForShapeMode
          ? prev.activeTool
          : { type: 'selection' },
        showWelcomeScreen: false,
      }));
      if (keepFreedrawForShapeMode && canvasRef.current) {
        canvasRef.current.style.cursor = 'crosshair';
      } else if (!isToolLockedRef.current && canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
      commitHistory();
      notifyChange();
      if (norm.type === ELEMENT_TYPES.FREEDRAW) onFreeDrawCommit?.(norm);
      return;
    }
  }, [getSelectedElements, setAppState, setElements, scheduleRender, commitHistory, notifyChange, isDrawToShapeActive, onFreeDrawCommit]);

  // ── Zoom with mouse wheel ──
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const { zoom, scrollX, scrollY } = appStateRef.current;
    const z = zoom.value;

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = -e.deltaY * 0.002;
      const newZoom = Math.max(0.05, Math.min(30, z * (1 + delta)));
      const [cx, cy] = getCanvasPoint(e);
      const newScrollX = cx - (cx - scrollX) * (newZoom / z);
      const newScrollY = cy - (cy - scrollY) * (newZoom / z);
      setAppState({ zoom: { value: newZoom }, scrollX: newScrollX, scrollY: newScrollY });
    } else {
      // Pan
      setAppState(prev => ({
        scrollX: prev.scrollX - e.deltaX,
        scrollY: prev.scrollY - e.deltaY,
      }));
    }
  }, [getCanvasPoint, setAppState]);

  // ── Key events ──
  const onKeyDown = useCallback((e) => {
    if (e.code === 'Space') interaction.current.spaceDown = true;
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      const prev = historyRef.current.undo(elementsRef.current);
      if (prev) { setElements(prev); notifyChange(); }
      return;
    }
    if (isCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      const next = historyRef.current.redo(elementsRef.current);
      if (next) { setElements(next); notifyChange(); }
      return;
    }

    if (isCtrl && e.key === 'a') {
      e.preventDefault();
      const ids = {};
      for (const el of elementsRef.current) if (!el.isDeleted) ids[el.id] = true;
      setAppState({ selectedElementIds: ids });
      return;
    }

    if (isCtrl && e.key === 'c') {
      window.__doodleClipboard = getSelectedElements().map(el => ({ ...el }));
      return;
    }

    if (isCtrl && e.key === 'v') {
      if (window.__doodleClipboard?.length) {
        const pasted = window.__doodleClipboard.map(el => cloneElement(el, { x: el.x + 20, y: el.y + 20 }));
        setElements(prev => [...prev, ...pasted]);
        const ids = {};
        pasted.forEach(el => { ids[el.id] = true; });
        setAppState({ selectedElementIds: ids });
        commitHistory();
        notifyChange();
      }
      return;
    }

    if (isCtrl && e.key === 'd') {
      e.preventDefault();
      const duped = getSelectedElements().map(el => cloneElement(el, { x: el.x + 20, y: el.y + 20 }));
      if (duped.length) {
        setElements(prev => [...prev, ...duped]);
        const ids = {};
        duped.forEach(el => { ids[el.id] = true; });
        setAppState({ selectedElementIds: ids });
        commitHistory();
        notifyChange();
      }
      return;
    }

    // Delete / Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = appStateRef.current?.selectedElementIds || {};
      if (Object.keys(ids).length > 0) {
        setElements(prev => {
          const next = prev.map(el => ids[el.id] ? { ...el, isDeleted: true } : el);
          if (next.filter(el => !el.isDeleted).length === 0) {
            setAppState(as => ({ ...as, showWelcomeScreen: true }));
          }
          return next;
        });
        setAppState({ selectedElementIds: {} });
        commitHistory();
        notifyChange();
        scheduleRender();
      }
      return;
    }

    // Escape
    if (e.key === 'Escape') {
      finishTextEdit();
      setAppState({ selectedElementIds: {}, activeTool: { type: 'selection' } });
      return;
    }

    // Tool shortcuts
    if (!isCtrl && !e.shiftKey && !e.altKey) {
      if (e.key === 'q' || e.key === 'Q') {
        setIsToolLocked(prev => !prev);
        return;
      }

      const keyToolMap = {
        '1': 'selection', 'v': 'selection',
        '2': 'rectangle', 'r': 'rectangle',
        '3': 'diamond', 'd': 'diamond',
        '4': 'ellipse', 'o': 'ellipse', 'c': 'ellipse',
        '5': 'arrow', 'a': 'arrow',
        '6': 'line', 'l': 'line',
        '7': 'freedraw', 'p': 'freedraw',
        '8': 'text', 't': 'text',
        '0': 'eraser', 'e': 'eraser',
        'h': 'hand',
        'f': 'frame',
      };
      if (e.key === '9') {
        e.preventDefault();
        document.querySelector('.App-toolbar input[type="file"]')?.click();
        return;
      }
      const tool = keyToolMap[e.key.toLowerCase()];
      if (tool) {
        setAppState({ activeTool: { type: tool } });
        if (canvasRef.current) {
          canvasRef.current.style.cursor = TOOL_CURSORS[tool] || 'default';
        }
        return;
      }
    }

    // Arrow keys to nudge selected elements
    const nudgeKeys = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const nudge = nudgeKeys[e.key];
    if (nudge) {
      const [ndx, ndy] = nudge.map(v => v * (e.shiftKey ? 10 : 1));
      const ids = appStateRef.current?.selectedElementIds || {};
      setElements(prev => prev.map(el =>
        ids[el.id] ? { ...el, x: el.x + ndx, y: el.y + ndy } : el
      ));
      commitHistory();
      notifyChange();
    }
  }, [getSelectedElements, setElements, setAppState, commitHistory, notifyChange]);

  const onKeyUp = useCallback((e) => {
    if (e.code === 'Space') interaction.current.spaceDown = false;
  }, []);

  // ── Double-click to edit text / rename frame / create text ──
  const onDoubleClick = useCallback((e) => {
    const [sx, sy] = getScenePoint(e);
    const hit = getElementAtPoint(elementsRef.current, sx, sy);

    if (hit?.type === ELEMENT_TYPES.TEXT) {
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
      const newName = window.prompt('Rename Frame:', hit.name || 'Frame');
      if (newName && newName.trim()) {
        setElements(prev => prev.map(el =>
          el.id === hit.id
            ? { ...el, name: newName.trim(), version: (el.version || 1) + 1, versionNonce: versionNonce() }
            : el
        ));
        commitHistory();
        scheduleRender();
      }
    } else {
      startTextEdit(sx, sy);
    }
  }, [getScenePoint, setElements, commitHistory, scheduleRender]);

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
    // Context menu will be handled externally
  }, []);

  // ── Imperative Doodle Engine API ──
  useImperativeHandle(ref, () => {
    const api = {
      // Getters
      getSceneElements: () => elementsRef.current.filter(el => !el.isDeleted),
      getSceneElementsIncludingDeleted: () => elementsRef.current,
      getAppState: () => appStateRef.current,
      getFiles: () => filesRef.current,

      // Scene mutation
      updateScene: (sceneData) => {
        if (sceneData.elements !== undefined) {
          setElements(sceneData.elements);
          if (sceneData.commitToHistory !== false) commitHistory();
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

      // Viewport
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
        const padding = 80;
        const zx = (cw - padding * 2) / (bounds.width || 1);
        const zy = (ch - padding * 2) / (bounds.height || 1);
        const z = Math.min(1, zx, zy);
        setAppState({
          zoom: { value: z },
          scrollX: cw / 2 - (bounds.x + bounds.width / 2) * z,
          scrollY: ch / 2 - (bounds.y + bounds.height / 2) * z,
        });
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
        const all = elementsRef.current.filter(el => !el.isDeleted);
        setAppState({ selectedElementIds: Object.fromEntries(all.map(el => [el.id, true])) });
      },
      clearSelection: () => setAppState({ selectedElementIds: {} }),
      getElementById: (id) => elementsRef.current.find(el => el.id === id),
      restyleElement: (id, patch) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...patch } : el));
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
    scheduleRender();
  }, [theme, setAppState, scheduleRender]);

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
    const hasSelection = Object.values(selectedIds).some(Boolean);
    const normalizedValue = key === 'roundness'
      ? value  // keep as 'sharp' or 'round' string — renderer checks these directly
      : value;

    if (hasSelection) {
      setElements(prev =>
        prev.map(el => {
          if (selectedIds[el.id]) {
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

  const handleAction = useCallback((action) => {
    if (action === 'openColorPalette') {
      onOpenColorPalette?.();
      return;
    }
    const selectedIds = appStateRef.current.selectedElementIds || {};
    if (action === 'delete') {
      setElements(prev => {
        const next = prev.map(el => (selectedIds[el.id] ? { ...el, isDeleted: true } : el));
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
      const toDuplicate = elementsRef.current.filter(el => selectedIds[el.id] && !el.isDeleted);
      if (toDuplicate.length === 0) return;
      const newSelected = {};
      const newEls = toDuplicate.map(el => {
        const cloned = cloneElement(el, { x: el.x + 20, y: el.y + 20 });
        newSelected[cloned.id] = true;
        return cloned;
      });
      setElements(prev => [...prev, ...newEls]);
      setAppState({ selectedElementIds: newSelected });
      commitHistory();
      notifyChange();
      scheduleRender();
    } else if (action === 'bringToFront') {
      const selected = [];
      const unselected = [];
      elementsRef.current.forEach(el => {
        if (selectedIds[el.id]) selected.push(el);
        else unselected.push(el);
      });
      setElements([...unselected, ...selected]);
      commitHistory();
      notifyChange();
      scheduleRender();
    } else if (action === 'sendToBack') {
      const selected = [];
      const unselected = [];
      elementsRef.current.forEach(el => {
        if (selectedIds[el.id]) selected.push(el);
        else unselected.push(el);
      });
      setElements([...selected, ...unselected]);
      commitHistory();
      notifyChange();
      scheduleRender();
    }
  }, [commitHistory, notifyChange, scheduleRender, setAppState, setElements]);

  const handleZoomIn = useCallback(() => {
    setAppState(prev => ({ zoom: { value: Math.min(30, Number((prev.zoom.value * 1.15).toFixed(2))) } }));
  }, [setAppState]);

  const handleZoomOut = useCallback(() => {
    setAppState(prev => ({ zoom: { value: Math.max(0.1, Number((prev.zoom.value / 1.15).toFixed(2))) } }));
  }, [setAppState]);

  const handleZoomReset = useCallback(() => {
    setAppState({ zoom: { value: 1 } });
  }, [setAppState]);

  // ── Welcome screen ──
  const nonDeletedElements = elements.filter(e => !e.isDeleted);
  const showWelcome = nonDeletedElements.length === 0 &&
    (appState.activeTool?.type === 'selection' || !appState.activeTool?.type);

  return (
    <div
      ref={containerRef}
      className={`doodle-canvas-root doodle-engine-container ${theme === 'dark' ? 'theme--dark' : 'theme--light'}`}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none' }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />

      {/* Web content is rendered as a DOM overlay */}
      {renderEmbeddable && elements.filter((el) => (el.type === ELEMENT_TYPES.IFRAME || el.type === 'embeddable' || el.type === 'iframe') && !el.isDeleted).map((el) => {
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

      {/* Top-Right Stack: Library Button (Settings button portals in below this) */}
      <div className="layer-ui__wrapper__top-right">
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
