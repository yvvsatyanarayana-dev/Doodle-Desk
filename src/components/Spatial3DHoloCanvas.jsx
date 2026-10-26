import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Layers,
  RotateCw,
  Eye,
  Camera,
  X,
  Sliders,
  Sparkles,
  Download,
  Grid,
  Zap,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Trash2,
  MousePointerClick,
} from 'lucide-react';
import { renderElement } from '../engine/renderer/render.js';
import { getElementBounds } from '../engine/math/geometry.js';

export const getDemoElementIds = (elements) => {
  if (!Array.isArray(elements) || elements.length === 0) return new Set();

  const demoFrameIds = new Set();
  const demoElementIds = new Set();

  // Pass 1: Identify demo frames and key demo text / prototype markers
  elements.forEach((el) => {
    if (!el) return;
    if (el.isDemoPrototype || el.customData?.isDemoPrototype) {
      demoElementIds.add(el.id);
      if (el.type === 'frame') demoFrameIds.add(el.id);
    }
    if (el.type === 'frame' && el.name && (
      el.name.includes('Onboarding') ||
      el.name.includes('Product Store') ||
      el.name.includes('Order Success')
    )) {
      demoFrameIds.add(el.id);
      demoElementIds.add(el.id);
    }
    if (el.text && (
      el.text.includes('Doodle Store') ||
      el.text.includes('Explore Catalog') ||
      el.text.includes('Mechanical Keyboard') ||
      el.text.includes('Studio Pro Headphones') ||
      el.text.includes('Order Confirmed') ||
      el.text.includes('Return to Store Home') ||
      el.text.includes('Back to Onboarding') ||
      el.text.includes('Hand-crafted workspace tools') ||
      el.text.includes('Discover hand-crafted tech gear') ||
      el.text.includes('retro mechanical keys') ||
      el.text.includes('planar magnetic monitors')
    )) {
      demoElementIds.add(el.id);
      if (el.frameId) demoFrameIds.add(el.frameId);
      if (el.containerId) demoFrameIds.add(el.containerId);
    }
  });

  // Collect identified demo frames
  const demoFrames = elements.filter((el) => el && el.type === 'frame' && demoFrameIds.has(el.id));

  // Pass 2: Identify any child elements attached to demo frames, linking to demo frames, or geometrically inside demo frames
  elements.forEach((el) => {
    if (!el) return;
    if (demoElementIds.has(el.id)) return;

    // Attached via frameId
    if (el.frameId && demoFrameIds.has(el.frameId)) {
      demoElementIds.add(el.id);
      return;
    }

    // Attached via containerId
    if (el.containerId && demoFrameIds.has(el.containerId)) {
      demoElementIds.add(el.id);
      return;
    }

    // Links to a demo frame
    if (el.link && typeof el.link === 'string') {
      for (const fId of demoFrameIds) {
        if (el.link.includes(encodeURIComponent(fId)) || el.link.includes(fId)) {
          demoElementIds.add(el.id);
          return;
        }
      }
    }

    // Geometrically inside bounds of any demo frame
    for (const frame of demoFrames) {
      const fx = frame.x;
      const fy = frame.y;
      const fw = frame.width || 390;
      const fh = frame.height || 720;
      if (
        el.x >= fx - 10 &&
        el.x + (el.width || 0) <= fx + fw + 10 &&
        el.y >= fy - 10 &&
        el.y + (el.height || 0) <= fy + fh + 10
      ) {
        demoElementIds.add(el.id);
        return;
      }
    }
  });

  return demoElementIds;
};

export const isDemoPrototypeElement = (el, allElements = []) => {
  if (!el) return false;
  if (el.isDemoPrototype || el.customData?.isDemoPrototype) return true;
  if (el.name && (
    el.name.includes('Onboarding') ||
    el.name.includes('Product Store') ||
    el.name.includes('Order Success')
  )) return true;
  if (el.text && (
    el.text.includes('Doodle Store') ||
    el.text.includes('Explore Catalog') ||
    el.text.includes('Mechanical Keyboard') ||
    el.text.includes('Studio Pro Headphones') ||
    el.text.includes('Order Confirmed') ||
    el.text.includes('Return to Store Home')
  )) return true;
  if (allElements.length > 0) {
    const demoIds = getDemoElementIds(allElements);
    return demoIds.has(el.id);
  }
  return false;
};

const CAMERA_PRESETS = [
  { id: 'isometric', label: 'Isometric 45°', pitch: 45, yaw: 35, zoom: 1 },
  { id: 'cinematic', label: 'Cinematic 3D', pitch: 62, yaw: 24, zoom: 1.05 },
  { id: 'subtle', label: 'Subtle Tilt', pitch: 26, yaw: 14, zoom: 1 },
  { id: 'topdown', label: 'Top-Down 2D', pitch: 0, yaw: 0, zoom: 1 },
];

const STRATIFY_MODES = [
  { id: 'architecture', label: 'Smart Tiers' },
  { id: 'stack', label: 'Layer Stack' },
  { id: 'flat', label: 'Flat 3D' },
];

/**
 * 3D Spatial Canvas Element Subcomponent
 * Renders the authentic hand-drawn sketchy doodle element onto a dedicated canvas
 * preserving rough strokes, exact colors, transparent fills, and handwriting.
 */
const SpatialDoodleElement3D = memo(function SpatialDoodleElement3D({
  el,
  zElevation,
  isSelected,
  isDark,
  files,
  onClick,
  onElevationChange,
}) {
  const canvasRef = useRef(null);
  const bounds = useMemo(() => getElementBounds(el), [el]);
  const padding = 16; // Margins so rough sketchy borders and arrowheads are not clipped

  const w = Math.max(20, Math.ceil(bounds.width + padding * 2));
  const h = Math.max(20, Math.ceil(bounds.height + padding * 2));

  // Render authentic doodle onto offscreen canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 2;
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Align element bounds with padding inside canvas
    ctx.translate(padding - bounds.x, padding - bounds.y);
    try {
      renderElement(ctx, el, files || {});
    } catch (err) {
      console.warn('3D renderElement error:', err);
    }
    ctx.restore();
  }, [el, bounds, w, h, files]);

  // Elevation badge / tooltip text
  const elementLabel = el.text || el.name || (el.type ? el.type.charAt(0).toUpperCase() + el.type.slice(1) : 'Element');

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${bounds.x - padding}px`,
        top: `${bounds.y - padding}px`,
        width: `${w}px`,
        height: `${h}px`,
        transformStyle: 'preserve-3d',
        transform: `translateZ(${zElevation}px)`,
        cursor: 'pointer',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        filter: isSelected
          ? `drop-shadow(0 0 14px ${isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.35)'}) drop-shadow(0 ${zElevation * 0.3 + 8}px ${zElevation * 0.4 + 14}px rgba(0,0,0,${isDark ? 0.75 : 0.25}))`
          : `drop-shadow(0 ${zElevation * 0.28 + 6}px ${zElevation * 0.38 + 12}px rgba(0,0,0,${isDark ? 0.65 : 0.18}))`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${w}px`,
          height: `${h}px`,
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* Selected Element Accent Frame */}
      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              left: `${padding - 3}px`,
              top: `${padding - 3}px`,
              width: `${bounds.width + 6}px`,
              height: `${bounds.height + 6}px`,
              border: isDark ? '1.5px solid #ffffff' : '1.5px solid #18181b',
              borderRadius: '6px',
              pointerEvents: 'none',
              boxShadow: isDark ? '0 0 10px rgba(255, 255, 255, 0.35)' : '0 0 8px rgba(0, 0, 0, 0.18)',
            }}
          >
            {/* 4 Corner Anchors */}
            <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '7px', height: '7px', background: isDark ? '#ffffff' : '#18181b', borderRadius: '1px' }} />
            <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '7px', height: '7px', background: isDark ? '#ffffff' : '#18181b', borderRadius: '1px' }} />
            <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '7px', height: '7px', background: isDark ? '#ffffff' : '#18181b', borderRadius: '1px' }} />
            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '7px', height: '7px', background: isDark ? '#ffffff' : '#18181b', borderRadius: '1px' }} />
          </div>

          {/* Floating Elevation Pill for Selected Element */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: `${padding - 36}px`,
              left: `${padding}px`,
              background: isDark ? '#141417' : '#ffffff',
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.6)' : '0 6px 18px rgba(0,0,0,0.12)',
              borderRadius: '20px',
              padding: '2px 8px 2px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: isDark ? '#f4f4f5' : '#18181b',
              whiteSpace: 'nowrap',
              zIndex: 100,
              cursor: 'default',
            }}
          >
            <span style={{ fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {elementLabel}
            </span>
            <span style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>•</span>
            <span style={{ color: isDark ? '#a1a1aa' : '#52525b', fontWeight: 500 }}>
              Z: {zElevation}px
            </span>
            <div style={{ display: 'flex', gap: '2px', marginLeft: '2px' }}>
              <button
                onClick={() => onElevationChange(el.id, 1)}
                title="Raise Layer (Up)"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
                  background: isDark ? '#27272a' : '#f4f4f5',
                  color: isDark ? '#ffffff' : '#18181b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={() => onElevationChange(el.id, -1)}
                title="Lower Layer (Down)"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
                  background: isDark ? '#27272a' : '#f4f4f5',
                  color: isDark ? '#ffffff' : '#18181b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export function Spatial3DHoloCanvas({
  isActive,
  onClose,
  doodleAPI,
  theme = 'dark',
}) {
  const isDark = theme !== 'light';
  const api = doodleAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);

  // 3D Camera & Parallax State
  const [pitch, setPitch] = useState(45); // degrees
  const [yaw, setYaw] = useState(32);   // degrees
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(30);
  const [depthSpacing, setDepthSpacing] = useState(55); // Pixels of Z separation per tier
  const [mouseParallaxStrength, setMouseParallaxStrength] = useState(14);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [showGridFloor, setShowGridFloor] = useState(true);
  const [showFloorShadows, setShowFloorShadows] = useState(true);
  const [stratifyMode, setStratifyMode] = useState('architecture'); // 'architecture' | 'stack' | 'flat'
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [customTiers, setCustomTiers] = useState({}); // { [id]: tierDelta }
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const containerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, startPitch: 0, startYaw: 0, startPanX: 0, startPanY: 0 });

  // Get active canvas elements and files map
  const allSceneElements = useMemo(() => {
    if (!api) return [];
    return (api.getSceneElements?.() || []).filter(el => !el.isDeleted && !el.isHidden);
  }, [api, isActive]);

  const files = useMemo(() => {
    if (!api) return {};
    return api.getFiles?.() || {};
  }, [api, isActive]);

  const appState = useMemo(() => {
    if (!api) return {};
    return api.getAppState?.() || {};
  }, [api, isActive]);

  const selectedIds = useMemo(() => {
    return Object.keys(appState.selectedElementIds || {}).filter(
      (id) => appState.selectedElementIds[id]
    );
  }, [appState.selectedElementIds]);

  const hasSelectedElements = selectedIds.length > 0;

  const demoElementIds = useMemo(() => {
    return getDemoElementIds(allSceneElements);
  }, [allSceneElements]);

  const hasDemoElements = demoElementIds.size > 0;

  // Filter strictly to non-demo elements so 3D spatial ONLY contains real canvas shapes
  const nonDemoElements = useMemo(() => {
    return allSceneElements.filter((el) => !demoElementIds.has(el.id));
  }, [allSceneElements, demoElementIds]);

  const nonDemoElementsCount = nonDemoElements.length;

  // Scope Mode: 'selection' | 'all'
  const [scopeMode, setScopeMode] = useState(() => {
    if (selectedIds.length > 0) return 'selection';
    return 'all';
  });

  // Automatically update scope when selection changes
  useEffect(() => {
    if (selectedIds.length > 0) {
      setScopeMode('selection');
    } else {
      setScopeMode('all');
    }
  }, [selectedIds.length]);

  // Action to permanently remove demo elements from canvas
  const handleClearDemoElementsFromCanvas = useCallback(() => {
    if (!api) return;
    const currentElements = api.getSceneElementsIncludingDeleted?.() || api.getSceneElements?.() || [];
    const demoIds = getDemoElementIds(currentElements);
    if (demoIds.size === 0) return;
    const updated = currentElements.filter((el) => !demoIds.has(el.id));
    api.updateScene?.({
      elements: updated,
      commitToHistory: true,
    });
  }, [api]);

  // Automatically purge any demo prototype elements from canvas when 3D spatial is active
  useEffect(() => {
    if (isActive && api && hasDemoElements) {
      handleClearDemoElementsFromCanvas();
    }
  }, [isActive, api, hasDemoElements, handleClearDemoElementsFromCanvas]);

  // Raw elements to display: strictly user canvas shapes (never prototype demo elements)
  const rawElements = useMemo(() => {
    if (scopeMode === 'selection' && hasSelectedElements) {
      const selectedSet = new Set(selectedIds);
      const selEls = nonDemoElements.filter((el) => selectedSet.has(el.id));
      if (selEls.length > 0) return selEls;
    }
    return nonDemoElements;
  }, [nonDemoElements, scopeMode, hasSelectedElements, selectedIds]);

  // DoodleDesk canvas theme colors
  const canvasBg = appState.viewBackgroundColor || (isDark ? '#121212' : '#ffffff');
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
  const toolbarBg = isDark ? '#141417' : '#ffffff';
  const toolbarBorder = isDark ? '1px solid #27272a' : '1px solid #e4e4e7';
  const toolbarShadow = isDark ? '0 10px 30px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.08)';

  // Assign Z-Elevation tiers based on stratify mode and custom overrides
  const stratifiedElements = useMemo(() => {
    return rawElements.map((el, index) => {
      let baseTier = 0;

      if (stratifyMode === 'flat') {
        baseTier = 0;
      } else if (stratifyMode === 'stack') {
        // Linear stack by element draw order
        baseTier = Math.min(6, Math.floor((index / Math.max(1, rawElements.length - 1)) * 5));
      } else {
        // Smart Architecture Stratification
        if (el.zTier !== undefined) {
          baseTier = el.zTier;
        } else if (el.type === 'frame' || (el.width > 700 && el.height > 500)) {
          baseTier = 0;
        } else if (
          el.type === 'cylinder' ||
          el.type === 'table' ||
          el.text?.toLowerCase().includes('db') ||
          el.text?.toLowerCase().includes('sql') ||
          el.text?.toLowerCase().includes('storage') ||
          el.text?.toLowerCase().includes('redis')
        ) {
          baseTier = 1;
        } else if (
          el.type === 'rectangle' ||
          el.type === 'diamond' ||
          el.type === 'ellipse' ||
          el.type === 'hexagon'
        ) {
          if (el.text?.toLowerCase().includes('queue') || el.text?.toLowerCase().includes('broker')) {
            baseTier = 2;
          } else {
            baseTier = 2;
          }
        } else if (
          el.type === 'cloud' ||
          el.text?.toLowerCase().includes('api') ||
          el.text?.toLowerCase().includes('gateway') ||
          el.text?.toLowerCase().includes('ingress') ||
          el.text?.toLowerCase().includes('cdn')
        ) {
          baseTier = 3;
        } else if (el.type === 'text' || el.type === 'freedraw' || el.type === 'arrow' || el.type === 'line') {
          baseTier = 4;
        } else {
          baseTier = 2;
        }
      }

      const tierDelta = customTiers[el.id] || 0;
      const effectiveTier = Math.max(0, baseTier + tierDelta);

      return {
        ...el,
        zTier: effectiveTier,
      };
    });
  }, [rawElements, stratifyMode, customTiers]);

  // Compute common scene bounds
  const sceneBounds = useMemo(() => {
    if (stratifiedElements.length === 0) {
      return { minX: 0, minY: 0, width: 800, height: 600, centerX: 400, centerY: 300 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of stratifiedElements) {
      const b = getElementBounds(el);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + Math.max(10, b.width));
      maxY = Math.max(maxY, b.y + Math.max(10, b.height));
    }
    return {
      minX,
      minY,
      width: Math.max(480, maxX - minX),
      height: Math.max(340, maxY - minY),
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }, [stratifiedElements]);

  // Adjust elevation tier for an element
  const handleElevationChange = useCallback((elementId, delta) => {
    setCustomTiers(prev => {
      const current = prev[elementId] || 0;
      return { ...prev, [elementId]: current + delta };
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;
      if (e.key === 'Escape') {
        if (selectedElementId) {
          setSelectedElementId(null);
        } else {
          onClose();
        }
      } else if (selectedElementId && (e.key === 'ArrowUp' || e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleElevationChange(selectedElementId, 1);
      } else if (selectedElementId && (e.key === 'ArrowDown' || e.key === '-')) {
        e.preventDefault();
        handleElevationChange(selectedElementId, -1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedElementId, onClose, handleElevationChange]);

  // Mouse move handler for live 3D parallax tilt & orbit
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    setMouseOffset({
      x: nx * mouseParallaxStrength,
      y: ny * mouseParallaxStrength,
    });

    if (isOrbiting) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (e.buttons === 1) { // Left click orbit
        setYaw(dragStartRef.current.startYaw + dx * 0.35);
        setPitch(Math.max(0, Math.min(85, dragStartRef.current.startPitch - dy * 0.35)));
      } else if (e.buttons === 2 || e.buttons === 4) { // Right or middle click pan
        setPanX(dragStartRef.current.startPanX + dx);
        setPanY(dragStartRef.current.startPanY + dy);
      }
    }
  }, [isOrbiting, mouseParallaxStrength]);

  const handleMouseDown = useCallback((e) => {
    setIsOrbiting(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPitch: pitch,
      startYaw: yaw,
      startPanX: panX,
      startPanY: panY,
    };
  }, [pitch, yaw, panX, panY]);

  const handleMouseUp = useCallback(() => {
    setIsOrbiting(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.35, Math.min(2.8, prev - e.deltaY * 0.0012)));
  }, []);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    setPitch(45);
    setYaw(32);
    setZoom(1);
    setPanX(0);
    setPanY(30);
  }, []);

  // Snapshot 3D Canvas
  const handleSnapshot = async () => {
    setIsSnapshotting(true);
    try {
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = 1920;
      snapshotCanvas.height = 1080;
      const ctx = snapshotCanvas.getContext('2d');

      // Studio background matching theme
      ctx.fillStyle = isDark ? '#121212' : '#ffffff';
      ctx.fillRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);

      // Canvas dot grid pattern
      const dotSpacing = 28;
      ctx.fillStyle = dotColor;
      for (let x = 14; x < snapshotCanvas.width; x += dotSpacing) {
        for (let y = 14; y < snapshotCanvas.height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render 3D scene elements projection onto snapshot
      const radPitch = ((pitch + mouseOffset.y) * Math.PI) / 180;
      const radYaw = ((yaw + mouseOffset.x) * Math.PI) / 180;
      const centerX = snapshotCanvas.width / 2 + panX;
      const centerY = snapshotCanvas.height / 2 + panY;

      // Project and draw each element
      for (const el of stratifiedElements) {
        const b = getElementBounds(el);
        const z = el.zTier * depthSpacing;
        const relX = b.x - sceneBounds.centerX;
        const relY = b.y - sceneBounds.centerY;

        // 3D rotation projection
        const x1 = relX * Math.cos(radYaw) + z * Math.sin(radYaw);
        const y1 = relY;
        const z1 = -relX * Math.sin(radYaw) + z * Math.cos(radYaw);

        const x2 = x1;
        const y2 = y1 * Math.cos(radPitch) - z1 * Math.sin(radPitch);
        const z2 = y1 * Math.sin(radPitch) + z1 * Math.cos(radPitch);

        const fov = 1100;
        const scale = (fov / (fov + z2)) * zoom;
        const projX = centerX + x2 * scale;
        const projY = centerY + y2 * scale;

        ctx.save();
        ctx.translate(projX, projY);
        ctx.scale(scale, scale);

        // Render soft shadow
        if (showFloorShadows && z > 0) {
          ctx.save();
          ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.1)';
          ctx.filter = `blur(${Math.min(12, z * 0.12 + 4)}px)`;
          ctx.fillRect(-b.width / 2, -b.height / 2 + z * 0.25, b.width, b.height);
          ctx.restore();
        }

        ctx.translate(-b.x - b.width / 2, -b.y - b.height / 2);
        try {
          renderElement(ctx, el, files || {});
        } catch (e) {
          // ignore render error
        }
        ctx.restore();
      }

      // Watermark in DoodleDesk signature typography
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)';
      ctx.font = '600 15px -apple-system, sans-serif';
      ctx.fillText('DoodleDesk • 3D Spatial Canvas', 40, 50);
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
      ctx.fillText(`Pitch: ${Math.round(pitch)}° • Yaw: ${Math.round(yaw)}° • ${stratifiedElements.length} Elements`, 40, 72);

      const link = document.createElement('a');
      link.download = `doodledesk-3d-canvas-${Date.now()}.png`;
      link.href = snapshotCanvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsSnapshotting(false);
    }
  };

  if (!isActive) return null;

  const effectivePitch = pitch + mouseOffset.y;
  const effectiveYaw = yaw + mouseOffset.x;
  const floorMargin = 140;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
      onClick={() => setSelectedElementId(null)}
      className="spatial-3d-canvas-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        background: isDark
          ? 'radial-gradient(circle at 50% 45%, #19191f 0%, #0c0c0e 100%)'
          : 'radial-gradient(circle at 50% 45%, #ffffff 0%, #ececef 100%)',
        userSelect: 'none',
        overflow: 'hidden',
        perspective: '1300px',
        cursor: isOrbiting ? 'grabbing' : 'grab',
      }}
    >
      {/* ── TOP HUD (Matches DoodleDesk .App-toolbar) ── */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 3000,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Brand / Title Pill & Scope Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: toolbarBg,
              border: toolbarBorder,
              padding: '7px 14px',
              borderRadius: '12px',
              boxShadow: toolbarShadow,
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: isDark ? '#27272a' : '#f4f4f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#18181b',
              }}
            >
              <Box size={16} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 650, color: isDark ? '#ffffff' : '#18181b', lineHeight: 1.25 }}>
                3D Spatial Canvas
              </div>
              <div style={{ fontSize: '10.5px', color: isDark ? '#71717a' : '#a1a1aa' }}>
                Drag to Orbit • Right-drag to Pan • Scroll to Zoom
              </div>
            </div>
          </div>

          {/* Scope Selector: Selected Shapes vs All Shapes */}
          {hasSelectedElements && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: toolbarBg,
                border: toolbarBorder,
                padding: '3px',
                borderRadius: '10px',
                boxShadow: toolbarShadow,
                pointerEvents: 'auto',
              }}
            >
              <button
                type="button"
                onClick={() => setScopeMode('selection')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: scopeMode === 'selection' ? (isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8') : '1px solid transparent',
                  background: scopeMode === 'selection' ? (isDark ? '#27272a' : '#e4e4e7') : 'transparent',
                  color: scopeMode === 'selection' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#52525b'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <MousePointerClick size={12} />
                <span>Selection ({selectedIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setScopeMode('all')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: scopeMode === 'all' ? (isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8') : '1px solid transparent',
                  background: scopeMode === 'all' ? (isDark ? '#27272a' : '#e4e4e7') : 'transparent',
                  color: scopeMode === 'all' ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#52525b'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Layers size={12} />
                <span>All Canvas Shapes ({nonDemoElementsCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Camera Presets */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: toolbarBg,
            border: toolbarBorder,
            padding: '4px',
            borderRadius: '12px',
            boxShadow: toolbarShadow,
            pointerEvents: 'auto',
          }}
        >
          {CAMERA_PRESETS.map(preset => {
            const isPresetActive = Math.abs(pitch - preset.pitch) < 3 && Math.abs(yaw - preset.yaw) < 3;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setPitch(preset.pitch);
                  setYaw(preset.yaw);
                  setZoom(preset.zoom);
                }}
                style={{
                  padding: '5px 11px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 550,
                  border: 'none',
                  background: isPresetActive ? (isDark ? '#27272a' : '#e4e4e7') : 'transparent',
                  color: isPresetActive ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#52525b'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Right: Stratify Mode, Snapshot & Close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          {/* Stratify Mode Selector */}
          <div
            style={{
              display: 'flex',
              background: toolbarBg,
              border: toolbarBorder,
              padding: '3px',
              borderRadius: '10px',
              boxShadow: toolbarShadow,
            }}
          >
            {STRATIFY_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setStratifyMode(mode.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 550,
                  border: 'none',
                  background: stratifyMode === mode.id ? (isDark ? '#27272a' : '#e4e4e7') : 'transparent',
                  color: stratifyMode === mode.id ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#a1a1aa' : '#71717a'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Snapshot Button */}
          <button
            onClick={handleSnapshot}
            disabled={isSnapshotting}
            title="Download High-Res 3D Snapshot"
            style={{
              padding: '7px 13px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: 600,
              border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
              background: isDark ? '#27272a' : '#18181b',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: toolbarShadow,
            }}
          >
            <Download size={13} />
            Snapshot
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Exit 3D View (Esc)"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: toolbarBorder,
              background: toolbarBg,
              color: isDark ? '#ffffff' : '#18181b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: toolbarShadow,
            }}
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* ── 3D TRANSFORM WORLD CONTAINER ── */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${sceneBounds.width}px`,
          height: `${sceneBounds.height}px`,
          transformStyle: 'preserve-3d',
          transform: `
            translate(-50%, -50%)
            translate3d(${panX}px, ${panY}px, 0px)
            scale(${zoom})
            rotateX(${effectivePitch}deg)
            rotateY(${effectiveYaw}deg)
          `,
          transition: isOrbiting ? 'none' : 'transform 0.12s ease-out',
        }}
      >
        {/* Authentic Canvas Floor Plane with Real Dot Grid */}
        {showGridFloor && (
          <div
            style={{
              position: 'absolute',
              top: `-${floorMargin}px`,
              left: `-${floorMargin}px`,
              width: `${sceneBounds.width + floorMargin * 2}px`,
              height: `${sceneBounds.height + floorMargin * 2}px`,
              transform: 'translateZ(-6px)',
              background: canvasBg,
              backgroundImage: `radial-gradient(circle, ${dotColor} 1.2px, transparent 1.2px)`,
              backgroundSize: '24px 24px',
              borderRadius: '18px',
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              boxShadow: isDark
                ? '0 25px 65px rgba(0, 0, 0, 0.75), 0 0 0 1px #27272a'
                : '0 20px 45px rgba(0, 0, 0, 0.1), 0 0 0 1px #e4e4e7',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Projected Floor Shadows under Elevated Elements */}
        {showFloorShadows && stratifiedElements.map((el) => {
          const zElevation = el.zTier * depthSpacing;
          if (zElevation <= 0) return null;
          const b = getElementBounds(el);
          const relX = b.x - sceneBounds.minX;
          const relY = b.y - sceneBounds.minY;

          return (
            <div
              key={`shadow-${el.id}`}
              style={{
                position: 'absolute',
                left: `${relX}px`,
                top: `${relY}px`,
                width: `${Math.max(20, b.width)}px`,
                height: `${Math.max(20, b.height)}px`,
                borderRadius: '8px',
                background: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.08)',
                filter: `blur(${Math.min(16, zElevation * 0.12 + 4)}px)`,
                transform: 'translateZ(-2px)',
                pointerEvents: 'none',
                opacity: Math.max(0.2, 0.7 - zElevation * 0.0018),
              }}
            />
          );
        })}

        {/* 3D Elevated Elements (Rendered faithfully with Rough.js) */}
        {stratifiedElements.map((el) => {
          const zElevation = el.zTier * depthSpacing;
          const isSelected = selectedElementId === el.id;

          // Render element relative to scene bounds
          const relElement = {
            ...el,
            x: el.x - sceneBounds.minX,
            y: el.y - sceneBounds.minY,
          };

          return (
            <SpatialDoodleElement3D
              key={el.id}
              el={relElement}
              zElevation={zElevation}
              isSelected={isSelected}
              isDark={isDark}
              files={files}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElementId(el.id);
              }}
              onElevationChange={handleElevationChange}
            />
          );
        })}

        {/* Empty Scene Guidance */}
        {stratifiedElements.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) translateZ(20px)',
              background: toolbarBg,
              border: toolbarBorder,
              borderRadius: '12px',
              padding: '24px 32px',
              textAlign: 'center',
              boxShadow: toolbarShadow,
              color: isDark ? '#ffffff' : '#18181b',
              maxWidth: '360px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 650, marginBottom: '6px' }}>
              No Elements on Canvas
            </div>
            <div style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#52525b', lineHeight: 1.4 }}>
              Draw some shapes, cards, or notes on your 2D canvas, then launch 3D Spatial Canvas to see them hover in tiered 3D space!
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM CONTROLS DOCK (Matches DoodleDesk zoom dock) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: toolbarBg,
          border: toolbarBorder,
          padding: '8px 18px',
          borderRadius: '14px',
          boxShadow: toolbarShadow,
          zIndex: 3000,
        }}
      >
        {/* Z-Depth Separation Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: isDark ? '#e4e4e7' : '#18181b' }}>
          <Layers size={13} color={isDark ? '#a1a1aa' : '#71717a'} />
          <span style={{ fontWeight: 500 }}>Z-Spacing:</span>
          <input
            type="range"
            min="15"
            max="130"
            value={depthSpacing}
            onChange={e => setDepthSpacing(Number(e.target.value))}
            style={{ width: '80px', cursor: 'pointer', accentColor: isDark ? '#ffffff' : '#18181b' }}
          />
          <span style={{ fontWeight: 600, minWidth: '32px' }}>{depthSpacing}px</span>
        </div>

        <div style={{ width: '1px', height: '18px', background: isDark ? '#27272a' : '#e4e4e7' }} />

        {/* Parallax Strength Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', color: isDark ? '#e4e4e7' : '#18181b' }}>
          <Zap size={13} color={isDark ? '#a1a1aa' : '#71717a'} />
          <span style={{ fontWeight: 500 }}>Parallax:</span>
          <input
            type="range"
            min="0"
            max="30"
            value={mouseParallaxStrength}
            onChange={e => setMouseParallaxStrength(Number(e.target.value))}
            style={{ width: '65px', cursor: 'pointer', accentColor: isDark ? '#ffffff' : '#18181b' }}
          />
        </div>

        <div style={{ width: '1px', height: '18px', background: isDark ? '#27272a' : '#e4e4e7' }} />

        {/* Floor Grid Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: isDark ? '#e4e4e7' : '#18181b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showGridFloor}
            onChange={e => setShowGridFloor(e.target.checked)}
            style={{ accentColor: isDark ? '#ffffff' : '#18181b' }}
          />
          <span>Canvas Floor</span>
        </label>

        <div style={{ width: '1px', height: '18px', background: isDark ? '#27272a' : '#e4e4e7' }} />

        {/* Floor Shadows Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: isDark ? '#e4e4e7' : '#18181b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showFloorShadows}
            onChange={e => setShowFloorShadows(e.target.checked)}
            style={{ accentColor: isDark ? '#ffffff' : '#18181b' }}
          />
          <span>Floor Shadows</span>
        </label>

        <div style={{ width: '1px', height: '18px', background: isDark ? '#27272a' : '#e4e4e7' }} />

        {/* Reset Camera Button */}
        <button
          onClick={handleResetCamera}
          title="Reset Camera Angle & Pan"
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
            background: 'transparent',
            color: isDark ? '#a1a1aa' : '#52525b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

export default Spatial3DHoloCanvas;
