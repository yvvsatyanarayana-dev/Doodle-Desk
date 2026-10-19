import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Layers,
  Box,
  RotateCcw,
  Camera,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  HelpCircle,
  Edit3,
  Check,
  Download,
  Eye,
  EyeOff,
  Palette,
  Sliders,
  Sparkles,
  Grid,
  ArrowUp,
  ArrowDown,
  Hand,
  RotateCw,
  Compass,
  Crosshair,
  Loader2,
  ExternalLink,
  Play,
  Pause,
} from 'lucide-react';
import {
  ISOMETRIC_CAMERA_PRESETS,
  ARCHITECTURE_TIERS,
  LAYER_COLOR_PRESETS,
  ARCHITECTURE_PRESET_TEMPLATES,
  DEMO_ARCHITECTURE_ELEMENTS,
  createCustomLayer,
  reorderLayers,
  createArchitectureNode,
  calculateSceneBounds,
  stratifyElementsIntoTiers,
  extract3DRisers,
  sanitizeLayers,
  normalizeLayer,
  project3DToScreen,
  export3DArchitectureSnapshot,
} from '../utils/isometric3DEngine.js';

const STORAGE_KEY_LAYERS = 'doodle_desk_architecture_layers_v1';

export function Isometric3DArchitectureView({
  isActive,
  onClose,
  doodleAPI,
  theme = 'dark',
}) {
  const isDark = theme !== 'light';

  // Camera State
  const [pitch, setPitch] = useState(55); // Tilt (degrees)
  const [yaw, setYaw] = useState(35); // Orbit rotation (degrees)
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(100); // Vertically centered with headroom so top layer is never cut off
  const [elevationSpacing, setElevationSpacing] = useState(95); // Pixels between tiers
  const [activePreset, setActivePreset] = useState('architecture');
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [customTierMap, setCustomTierMap] = useState({});
  const [showTierPlates, setShowTierPlates] = useState(true);
  const [showGridlines, setShowGridlines] = useState(true);
  const [plateOpacity, setPlateOpacity] = useState(0.18);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isStampMenuOpen, setIsStampMenuOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLayersStudioOpen, setIsLayersStudioOpen] = useState(false);
  const [layersStudioTab, setLayersStudioTab] = useState('stack'); // 'stack' | 'templates' | 'settings'
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Camera Mode: 'orbit' (rotate) vs 'pan' (freely move across surroundings)
  const [cameraMode, setCameraMode] = useState('orbit');
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  // 3D Scroll Story / Layer-by-Layer Assembly State
  const [scrollMode, setScrollMode] = useState('story'); // 'story' (layer-by-layer) | 'zoom'
  const [revealedLayerCount, setRevealedLayerCount] = useState(4);
  const [isPlayingTour, setIsPlayingTour] = useState(false);
  const wheelAccumulatorRef = useRef(0);
  const lastWheelTimeRef = useRef(0);
  const tourIntervalRef = useRef(null);

  // Custom User-Defined Architecture Layers
  const [layers, setLayers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAYERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeLayers(parsed);
        }
      }
    } catch {
      // Ignore parse errors and use default
    }
    return sanitizeLayers(null);
  });

  // Layer Visibility & Soloing
  const [hiddenLayerIds, setHiddenLayerIds] = useState(new Set());
  const [soloLayerId, setSoloLayerId] = useState(null);
  const [highlightedLayerId, setHighlightedLayerId] = useState(null);

  // In-place layer editing
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const [colorPickerLayerId, setColorPickerLayerId] = useState(null);

  // Add Layer Input State in Studio
  const [newLayerNameInput, setNewLayerNameInput] = useState('');
  const [newLayerColorInput, setNewLayerColorInput] = useState('#06b6d4');

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, pitch: 55, yaw: 35, panX: 0, panY: 100, isPan: false });
  const stageRef = useRef(null);

  // Persist layers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LAYERS, JSON.stringify(layers));
    } catch {
      // Ignore localStorage errors
    }
  }, [layers]);

  // Extract canvas elements or use rich default demo architecture if empty
  const rawElements = useMemo(() => {
    if (!doodleAPI) return [];
    return doodleAPI.getSceneElements?.() || [];
  }, [doodleAPI, isActive]);

  const elements = useMemo(() => {
    if (rawElements.length > 0) return rawElements;
    return DEMO_ARCHITECTURE_ELEMENTS;
  }, [rawElements]);

  // Stratify elements into architecture tiers using custom user layers
  const tierMap = useMemo(() => {
    return stratifyElementsIntoTiers(elements, customTierMap, layers);
  }, [elements, customTierMap, layers]);

  // Calculate 3D vertical connector risers
  const risers = useMemo(() => {
    return extract3DRisers(elements, tierMap, elevationSpacing, layers);
  }, [elements, tierMap, elevationSpacing, layers]);

  // Calculate scene bounds for centering
  const bounds = useMemo(() => {
    return calculateSceneBounds(elements);
  }, [elements]);

  // Sorted layers (bottom to top: order 0, 1, 2...)
  const sortedLayers = useMemo(() => {
    return sanitizeLayers(layers).sort((a, b) => ((a && a.order) ?? 0) - ((b && b.order) ?? 0));
  }, [layers]);

  // Reverse sorted layers (top to bottom: order 3, 2, 1, 0...)
  const topToBottomLayers = useMemo(() => {
    return [...sortedLayers].reverse();
  }, [sortedLayers]);

  // Synchronize and clamp revealedLayerCount when sortedLayers changes
  useEffect(() => {
    if (sortedLayers.length > 0) {
      setRevealedLayerCount((prev) => Math.max(1, Math.min(sortedLayers.length, prev || sortedLayers.length)));
    }
  }, [sortedLayers.length]);

  // Automated 3D Cinematic Tour / Story Assembly Loop
  useEffect(() => {
    if (!isPlayingTour) {
      if (tourIntervalRef.current) {
        clearInterval(tourIntervalRef.current);
        tourIntervalRef.current = null;
      }
      return;
    }

    tourIntervalRef.current = setInterval(() => {
      setRevealedLayerCount((prev) => {
        if (prev >= sortedLayers.length) {
          return 1; // Loop back to base foundation
        }
        return prev + 1;
      });
      // Subtle continuous cinematic orbit
      setYaw((prev) => (prev + 1.2) % 360);
    }, 1800);

    return () => {
      if (tourIntervalRef.current) {
        clearInterval(tourIntervalRef.current);
        tourIntervalRef.current = null;
      }
    };
  }, [isPlayingTour, sortedLayers.length]);

  // Element count per layer
  const elementCountPerLayer = useMemo(() => {
    const counts = {};
    for (const l of sortedLayers) {
      if (!l) continue;
      counts[l.id] = 0;
      counts[l.order ?? 0] = 0;
    }
    for (const el of elements) {
      if (!el || el.isDeleted || el.isHidden || el.type === 'arrow') continue;
      const tierVal = tierMap.get(el.id);
      if (counts[tierVal] !== undefined) {
        counts[tierVal]++;
      }
    }
    return counts;
  }, [elements, sortedLayers, tierMap]);

  // Apply Camera Preset
  const handleApplyPreset = (presetKey) => {
    const p = ISOMETRIC_CAMERA_PRESETS[presetKey];
    if (!p) return;
    setActivePreset(presetKey);
    setPitch(p.pitch);
    setYaw(p.yaw);
    setElevationSpacing(p.elevationSpacing);
  };

  // Reset Camera View & Pan
  const handleResetCamera = () => {
    setPitch(55);
    setYaw(35);
    setZoom(1);
    setPanX(0);
    setPanY(100);
    setElevationSpacing(95);
    setActivePreset('architecture');
    setCameraMode('orbit');
    doodleAPI?.onToast?.('Camera reset to default');
  };

  // Center Entire Architecture View
  const handleCenterView = () => {
    setPanX(0);
    setPanY(100);
    setZoom(1);
    doodleAPI?.onToast?.('Canvas centered (Hold Space + Drag to move)');
  };

  // Center View on a Specific Layer Plate
  const handleCenterLayer = (targetLayer) => {
    if (!targetLayer) return;
    const tierZ = (targetLayer.order ?? 0) * elevationSpacing;
    const verticalShift = Math.round(tierZ * Math.sin((pitch * Math.PI) / 180));
    setPanX(0);
    setPanY(verticalShift + 60);
    doodleAPI?.onToast?.(`Centered on "${targetLayer.name}"`);
  };

  // Keyboard shortcut listener (Navigation, Spacebar pan, Center, Reset, Escape, Delete)
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      // Don't intercept shortcuts while user is typing in text inputs or renaming
      if (
        e.target?.tagName === 'INPUT' ||
        e.target?.tagName === 'TEXTAREA' ||
        editingNodeId ||
        editingLayerId
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isSpaceHeldRef.current = true;
        setIsSpaceHeld(true);
      } else if (e.key === 'c' || e.key === 'C') {
        handleCenterView();
      } else if (e.key === 'r' || e.key === 'R') {
        handleResetCamera();
      } else if (e.key === 'h' || e.key === 'H') {
        setCameraMode('pan');
        doodleAPI?.onToast?.('✋ Pan Mode activated (drag to move canvas)');
      } else if (e.key === 'o' || e.key === 'O') {
        setCameraMode('orbit');
        doodleAPI?.onToast?.('🔄 Orbit Mode activated (drag to rotate 3D)');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setPanX((prev) => prev + 50);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setPanX((prev) => prev - 50);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setPanY((prev) => prev + 50);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setPanY((prev) => prev - 50);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(2.5, +(prev + 0.1).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => Math.max(0.35, +(prev - 0.1).toFixed(2)));
      } else if (e.key === 'PageDown' || e.key === ']') {
        e.preventDefault();
        setRevealedLayerCount((prev) => Math.min(sortedLayers.length, prev + 1));
      } else if (e.key === 'PageUp' || e.key === '[') {
        e.preventDefault();
        setRevealedLayerCount((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'Escape') {
        if (isPlayingTour) {
          setIsPlayingTour(false);
        } else if (isGuideOpen) {
          setIsGuideOpen(false);
        } else if (isLayersStudioOpen) {
          setIsLayersStudioOpen(false);
        } else if (isAddMenuOpen) {
          setIsAddMenuOpen(false);
        } else if (isStampMenuOpen) {
          setIsStampMenuOpen(false);
        } else if (colorPickerLayerId) {
          setColorPickerLayerId(null);
        } else {
          onClose?.();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        handleDeleteSelected();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isSpaceHeldRef.current = false;
        setIsSpaceHeld(false);
      }
    };

    const handleBlur = () => {
      isSpaceHeldRef.current = false;
      setIsSpaceHeld(false);
      isDraggingRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, onClose, isGuideOpen, isLayersStudioOpen, isAddMenuOpen, isStampMenuOpen, selectedElementId, editingNodeId, editingLayerId, colorPickerLayerId, pitch, elevationSpacing]);

  // Mouse Orbit & Pan handlers (Screen-Space Pan like simple 2D canvas)
  const handlePointerDown = (e) => {
    // If auto tour is active, user interaction pauses it
    if (isPlayingTour) {
      setIsPlayingTour(false);
    }

    // Ignore interactive controls so buttons/inputs can be clicked
    if (e.target?.closest?.('button, input, select, textarea, .physics-btn')) {
      return;
    }

    // Left (0), Middle (1), Right (2)
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}

    isDraggingRef.current = true;
    const isPan =
      e.button === 1 || // Middle mouse click always pans
      e.button === 2 || // Right mouse click always pans
      e.shiftKey ||     // Shift+drag always pans
      isSpaceHeldRef.current || // Spacebar held always pans (latency-free via ref)
      cameraMode === 'pan'; // Pan mode toggle

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pitch,
      yaw,
      panX,
      panY,
      isPan,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (dragStartRef.current.isPan) {
      // 1:1 Screen-space translation identical to 2D canvas pan
      setPanX(dragStartRef.current.panX + dx);
      setPanY(dragStartRef.current.panY + dy);
    } else {
      // Full unconstrained 360° surrounding orbit
      const newPitch = Math.max(-85, Math.min(88, dragStartRef.current.pitch + dy * 0.45));
      const newYaw = (dragStartRef.current.yaw - dx * 0.45) % 360;
      setPitch(Math.round(newPitch));
      setYaw(Math.round(newYaw));
      setActivePreset('custom');
    }
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // 3D Scroll Story Wheel Handler: Assembles & disassembles layers one-by-one with physics easing
  const handleWheel = (e) => {
    e.preventDefault();

    // If holding Ctrl/Cmd or in explicit zoom mode, perform standard camera zoom
    if (e.ctrlKey || e.metaKey || scrollMode === 'zoom') {
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.max(0.35, Math.min(2.5, +(prev * factor).toFixed(3))));
      return;
    }

    if (isPlayingTour) {
      setIsPlayingTour(false);
    }

    const now = performance.now();
    wheelAccumulatorRef.current += e.deltaY;

    // Dampened threshold of 40px ensures deliberate, satisfying step feel without accidental skips
    const THRESHOLD = 40;
    if (Math.abs(wheelAccumulatorRef.current) >= THRESHOLD) {
      if (now - lastWheelTimeRef.current > 190) {
        lastWheelTimeRef.current = now;
        if (wheelAccumulatorRef.current > 0) {
          // Scroll Down / Forward: assemble next layer
          setRevealedLayerCount((prev) => {
            const next = Math.min(sortedLayers.length, prev + 1);
            if (next !== prev) {
              const activeLayer = sortedLayers[next - 1];
              doodleAPI?.onToast?.(`Tier ${next}/${sortedLayers.length}: ${activeLayer?.name || 'Layer'}`);
            }
            return next;
          });
        } else {
          // Scroll Up / Backward: disassemble top layer
          setRevealedLayerCount((prev) => {
            const next = Math.max(1, prev - 1);
            if (next !== prev) {
              const activeLayer = sortedLayers[next - 1];
              doodleAPI?.onToast?.(`Tier ${next}/${sortedLayers.length}: ${activeLayer?.name || 'Layer'}`);
            }
            return next;
          });
        }
      }
      wheelAccumulatorRef.current = 0;
    }
  };

  // Stamp Demo Architecture to Canvas (Working & Cleanly Switches to Canvas)
  const handleStampToCanvas = (options = { switchView: true }) => {
    if (!doodleAPI) return;
    const sourceElements = rawElements.length > 0 ? elements : DEMO_ARCHITECTURE_ELEMENTS;

    // Stamp elements with current layer metadata, unique IDs, and proper positions
    const stampedElements = sourceElements.map((el, idx) => {
      const tierVal = tierMap.get(el.id) ?? el.elevationTier ?? 0;
      const targetLayer = sortedLayers.find((l) => l && (l.order === tierVal || l.id === tierVal)) || sortedLayers[0];
      return {
        ...el,
        id: el.id || `arch_stamped_${Date.now()}_${idx}`,
        elevationTier: targetLayer?.order ?? 0,
        layerId: targetLayer?.id,
        backgroundColor: el.backgroundColor || targetLayer?.color || '#6366f1',
      };
    });

    doodleAPI.updateScene?.({
      elements: stampedElements,
      commitToHistory: true,
    });

    doodleAPI.scrollToContent?.();

    if (options.switchView) {
      doodleAPI.onToast?.('✅ 3D Architecture stamped to canvas! Switched to 2D drawing view.');
      setTimeout(() => {
        onClose?.();
      }, 350);
    } else {
      doodleAPI.onToast?.('✅ 3D Architecture stamped to your canvas!');
    }
    setIsStampMenuOpen(false);
  };

  // LAYER MANAGEMENT FUNCTIONS

  // 1. Add New Custom Layer
  const handleCreateLayer = (customName = '', customColor = '') => {
    const name = (customName || '').trim() || newLayerNameInput.trim() || `Layer ${sortedLayers.length}`;
    const color = customColor || newLayerColorInput || '#06b6d4';
    const newLayer = createCustomLayer(name, color, sortedLayers.length);
    const updated = sanitizeLayers([...layers, newLayer]);
    setLayers(updated);
    setNewLayerNameInput('');
    doodleAPI?.onToast?.(`✨ Created layer "${newLayer.name}" at elevation +${(newLayer.order ?? 0) * elevationSpacing}px`);
  };

  // 2. Rename Layer
  const handleSaveLayerName = (layerId) => {
    if (!layerId || !editingLayerName.trim()) {
      setEditingLayerId(null);
      return;
    }
    const updated = sanitizeLayers(layers).map((l) => (l.id === layerId ? { ...l, name: editingLayerName.trim() } : l));
    setLayers(updated);
    setEditingLayerId(null);
    doodleAPI?.onToast?.(`Renamed layer to "${editingLayerName.trim()}"`);
  };

  // 3. Change Layer Color
  const handleChangeLayerColor = (layerId, color) => {
    const updated = sanitizeLayers(layers).map((l) => (l.id === layerId ? { ...l, color } : l));
    setLayers(updated);
    setColorPickerLayerId(null);
    doodleAPI?.onToast?.('Updated layer color theme');
  };

  // 4. Delete Layer
  const handleDeleteLayer = (layerId) => {
    if (sortedLayers.length <= 1) {
      doodleAPI?.onToast?.('⚠️ Cannot delete the last remaining layer.');
      return;
    }
    const filtered = sanitizeLayers(layers).filter((l) => l.id !== layerId);
    const reordered = filtered.map((l, idx) => ({ ...l, order: idx }));
    setLayers(sanitizeLayers(reordered));
    doodleAPI?.onToast?.('Removed architectural layer');
  };

  // 5. Reorder Layer
  const handleMoveLayer = (layerId, direction) => {
    const currentIndex = sortedLayers.findIndex((l) => l.id === layerId);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sortedLayers.length) return;

    const reordered = reorderLayers(sortedLayers, currentIndex, targetIndex);
    setLayers(sanitizeLayers(reordered));
  };

  // 6. Apply Architecture Template
  const handleLoadTemplate = (templateKey) => {
    const template = ARCHITECTURE_PRESET_TEMPLATES[templateKey];
    if (!template) return;
    setLayers(sanitizeLayers(template.layers));
    doodleAPI?.onToast?.(`Loaded ${template.name} (${template.layers.length} tiers)`);
  };

  // 7. Toggle Layer Visibility
  const handleToggleLayerVisibility = (layerId) => {
    setHiddenLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  // 8. Solo Layer Toggle
  const handleSoloLayer = (layerId) => {
    setSoloLayerId((prev) => (prev === layerId ? null : layerId));
  };

  // NODE MANAGEMENT FUNCTIONS

  // Add a new node to any custom layer
  const handleAddNodeToLayer = (targetLayer) => {
    if (!doodleAPI || !targetLayer) return;
    const current = doodleAPI.getSceneElements?.() || [];
    const baseList = current.length > 0 ? current : DEMO_ARCHITECTURE_ELEMENTS;
    const tierNodes = baseList.filter((e) => {
      if (!e) return false;
      const t = tierMap.get(e.id);
      return t === targetLayer.id || t === targetLayer.order;
    });

    const newNode = createArchitectureNode(targetLayer.id, '', tierNodes.length, sortedLayers);
    const updated = [...baseList, newNode];
    doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
    setSelectedElementId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditingText(newNode.text);
    setIsAddMenuOpen(false);
    doodleAPI.onToast?.(`Added new component to "${targetLayer.name || 'layer'}"`);
  };

  // Move selected element to a specific layer directly
  const handleMoveSelectedToLayer = (targetLayer) => {
    if (!selectedElementId || !targetLayer) return;
    const targetOrder = typeof targetLayer.order === 'number' ? targetLayer.order : 0;
    setCustomTierMap((prev) => ({
      ...prev,
      [selectedElementId]: targetOrder,
    }));
    if (doodleAPI) {
      const current = doodleAPI.getSceneElements?.() || [];
      const updated = current.map((el) => {
        if (el && el.id === selectedElementId) {
          return {
            ...el,
            elevationTier: targetOrder,
            layerId: targetLayer.id,
            backgroundColor: el.backgroundColor || targetLayer.color,
          };
        }
        return el;
      });
      doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
    }
    doodleAPI?.onToast?.(`Moved component to "${targetLayer.name || 'layer'}"`);
  };

  // Elevate or lower selected element's tier
  const handleAdjustTier = (delta) => {
    if (!selectedElementId) return;
    const currentTier = tierMap.get(selectedElementId) ?? 0;
    const maxTier = Math.max(...sortedLayers.map((l) => (l && l.order) ?? 0), 0);
    const newTier = Math.max(0, Math.min(maxTier, currentTier + delta));
    setCustomTierMap((prev) => ({
      ...prev,
      [selectedElementId]: newTier,
    }));
    // Persist to element on canvas
    if (doodleAPI) {
      const current = doodleAPI.getSceneElements?.() || [];
      const updated = current.map((el) => {
        if (el && el.id === selectedElementId) {
          return { ...el, elevationTier: newTier };
        }
        return el;
      });
      doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
    }
  };

  // Save renamed node text
  const handleSaveNodeText = () => {
    if (!editingNodeId || !doodleAPI) {
      setEditingNodeId(null);
      return;
    }
    const current = doodleAPI.getSceneElements?.() || [];
    const baseList = current.length > 0 ? current : DEMO_ARCHITECTURE_ELEMENTS;
    const updated = baseList.map((el) => {
      if (el && el.id === editingNodeId) {
        return { ...el, text: (editingText || '').trim() || el.text };
      }
      return el;
    });
    doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
    setEditingNodeId(null);
    doodleAPI.onToast?.('Updated component name');
  };

  // Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedElementId || !doodleAPI) return;
    const current = doodleAPI.getSceneElements?.() || [];
    const updated = current.filter((e) => e && e.id !== selectedElementId);
    doodleAPI.updateScene?.({ elements: updated, commitToHistory: true });
    setSelectedElementId(null);
    doodleAPI.onToast?.('Removed component from architecture');
  };

  // Export 3D Snapshot (2400x1500 Hi-Res PNG + Download + Clipboard)
  const handleExportSnapshot = async () => {
    if (isSnapshotting) return;
    setIsSnapshotting(true);
    doodleAPI?.onToast?.('📸 Rendering high-res 3D architecture snapshot...');
    try {
      const activeLayers = sortedLayers.slice(0, revealedLayerCount);
      const activeElements = elements.filter((el) => {
        const t = tierMap.get(el.id) ?? 0;
        const idx = sortedLayers.findIndex((l) => l && (l.order === t || l.id === t));
        return idx === -1 || idx < revealedLayerCount;
      });

      const result = await export3DArchitectureSnapshot({
        elements: activeElements,
        layers: activeLayers,
        tierMap,
        pitch,
        yaw,
        elevationSpacing,
        bounds,
        isDark,
      });
      if (result.success) {
        doodleAPI?.onToast?.('🎉 3D Snapshot exported to Downloads & copied to clipboard!');
      } else {
        doodleAPI?.onToast?.('⚠️ Failed to export 3D snapshot');
      }
    } catch (err) {
      console.error('Snapshot error:', err);
      doodleAPI?.onToast?.('⚠️ Error generating 3D architecture snapshot');
    } finally {
      setIsSnapshotting(false);
    }
  };

  if (!isActive) return null;

  // Find currently selected element and its assigned layer
  const selectedElement = elements.find((e) => e && e.id === selectedElementId);
  const selectedElementTier = selectedElementId ? (tierMap.get(selectedElementId) ?? 0) : 0;
  const selectedElementLayer =
    sortedLayers.find((l) => l && (l.order === selectedElementTier || l.id === selectedElementTier)) ||
    sortedLayers[0] || { id: 'layer_0', name: 'Base Layer', color: '#6366f1', order: 0 };

  return (
    <div
      className="isometric-3d-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: isDark
          ? 'radial-gradient(circle at 50% 50%, #17171d 0%, #0d0d11 100%)'
          : 'radial-gradient(circle at 50% 50%, #f1f5f9 0%, #e2e8f0 100%)',
        overflow: 'hidden',
        userSelect: 'none',
        perspective: '1300px',
        cursor: isSpaceHeld || cameraMode === 'pan'
          ? (isDraggingRef.current ? 'grabbing' : 'grab')
          : (isDraggingRef.current ? 'grabbing' : 'default'),
      }}
    >
      {/* 2D Camera Viewport Container (Pure Screen-Space Translation & Zoom) */}
      <div
        className="isometric-camera-viewport"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`,
          transformStyle: 'preserve-3d',
          transition: isDraggingRef.current ? 'none' : 'transform 0.12s ease-out',
        }}
      >
        {/* 3D World Stage (Pure 3D Rotation Around Architecture Center) */}
        <div
          ref={stageRef}
          className="isometric-3d-stage"
          style={{
            position: 'relative',
            width: `${Math.max(650, bounds.width + 240)}px`,
            height: `${Math.max(520, bounds.height + 240)}px`,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${pitch}deg) rotateZ(${yaw}deg)`,
            transition: isDraggingRef.current ? 'none' : 'transform 0.12s ease-out',
          }}
        >
        {/* Isometric Ground Grid Baseplate */}
        <div
          className="isometric-ground-plate"
          style={{
            position: 'absolute',
            inset: '-100px',
            transform: 'translateZ(-5px)',
            background: isDark
              ? 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 1px, transparent 1px)'
              : 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            border: isDark ? '1px dashed rgba(255, 255, 255, 0.12)' : '1px dashed rgba(0, 0, 0, 0.12)',
            borderRadius: '16px',
            pointerEvents: 'none',
          }}
        />

        {/* Multi-Tier Dynamic Elevation Layer Plates */}
        {showTierPlates &&
          sortedLayers.map((layer, idx) => {
            if (!layer) return null;
            const isHidden = hiddenLayerIds.has(layer.id);
            if (isHidden) return null;

            const isRevealed = idx < revealedLayerCount;
            const isCurrentActive = idx === revealedLayerCount - 1;
            const isSoloed = soloLayerId === layer.id;
            const isDimmed = soloLayerId !== null && !isSoloed;
            const isLayerHighlighted = highlightedLayerId === layer.id;
            const tierZ = (layer.order ?? idx) * elevationSpacing;
            const futureZ = tierZ + 160;
            const elementCount = elementCountPerLayer[layer.id] || elementCountPerLayer[layer.order ?? 0] || 0;
            const isEditingThisLayer = editingLayerId === layer.id;

            return (
              <div
                key={`tier_plate_${layer.id}`}
                style={{
                  position: 'absolute',
                  inset: '-20px',
                  transform: isRevealed
                    ? `translateZ(${tierZ}px) scale(1)`
                    : `translateZ(${futureZ}px) scale(0.92)`,
                  transformStyle: 'preserve-3d',
                  borderRadius: '12px',
                  border: isLayerHighlighted || isCurrentActive
                    ? `2px solid ${layer.color}`
                    : `1px solid ${layer.color}44`,
                  background: isDark
                    ? `linear-gradient(135deg, ${layer.color}${Math.round(plateOpacity * 255).toString(16).padStart(2, '0')} 0%, rgba(20, 20, 26, 0.35) 100%)`
                    : `linear-gradient(135deg, ${layer.color}${Math.round(plateOpacity * 255).toString(16).padStart(2, '0')} 0%, rgba(255, 255, 255, 0.55) 100%)`,
                  backgroundImage: showGridlines
                    ? `linear-gradient(to right, ${layer.color}15 1px, transparent 1px), linear-gradient(to bottom, ${layer.color}15 1px, transparent 1px)`
                    : 'none',
                  backgroundSize: '40px 40px',
                  boxShadow: isLayerHighlighted || isCurrentActive
                    ? `0 0 32px ${layer.color}66, 0 20px 40px rgba(0, 0, 0, 0.35)`
                    : `0 16px 36px rgba(0, 0, 0, 0.25)`,
                  opacity: !isRevealed ? 0 : (isDimmed ? 0.2 : 1),
                  filter: !isRevealed ? 'blur(8px)' : 'blur(0px)',
                  transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease, filter 0.45s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                  pointerEvents: 'none',
                }}
              >
                {/* Interactive Floating Layer Title Tag & Controls */}
                <div
                  onMouseEnter={() => isRevealed && setHighlightedLayerId(layer.id)}
                  onMouseLeave={() => setHighlightedLayerId(null)}
                  onClick={(e) => {
                    if (!isRevealed) return;
                    e.stopPropagation();
                    setHighlightedLayerId(layer.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    background: isDark ? '#141417' : '#ffffff',
                    border: `1px solid ${layer.color}`,
                    borderRadius: '8px',
                    color: layer.color,
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                    pointerEvents: 'auto',
                    cursor: 'default',
                  }}
                >
                  {/* Color Dot (Click to pick color) */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorPickerLayerId((prev) => (prev === layer.id ? null : layer.id));
                      }}
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: layer.color,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'block',
                        padding: 0,
                      }}
                      title="Click to change layer color"
                    />

                    {/* Quick Color Picker Popover */}
                    {colorPickerLayerId === layer.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '6px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(6, 16px)',
                          gap: '4px',
                          padding: '6px',
                          background: isDark ? '#1f1f23' : '#ffffff',
                          border: isDark ? '1px solid #3f3f46' : '1px solid #cbd5e1',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                          zIndex: 50,
                        }}
                      >
                        {LAYER_COLOR_PRESETS.map((cp) => (
                          <button
                            key={cp.hex}
                            type="button"
                            onClick={() => handleChangeLayerColor(layer.id, cp.hex)}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              background: cp.hex,
                              border: layer.color === cp.hex ? '2px solid #ffffff' : 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title={cp.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inline Editable Layer Name */}
                  {isEditingThisLayer ? (
                    <input
                      type="text"
                      value={editingLayerName}
                      autoFocus
                      onChange={(e) => setEditingLayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLayerName(layer.id);
                        if (e.key === 'Escape') setEditingLayerId(null);
                      }}
                      onBlur={() => handleSaveLayerName(layer.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: isDark ? '#27272a' : '#f4f4f5',
                        border: `1px solid ${layer.color}`,
                        borderRadius: '4px',
                        color: isDark ? '#ffffff' : '#0f172a',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '1px 4px',
                        width: '110px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingLayerId(layer.id);
                        setEditingLayerName(layer.name);
                      }}
                      title="Double-click to rename layer"
                      style={{ cursor: 'text' }}
                    >
                      {layer.name}
                    </span>
                  )}

                  {/* Elevation Height Tag */}
                  <span style={{ fontSize: '9px', opacity: 0.65 }}>+{tierZ}px</span>

                  {/* Component Count Badge */}
                  <span
                    style={{
                      fontSize: '9px',
                      background: `${layer.color}22`,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      fontWeight: 600,
                    }}
                    title={`${elementCount} components on this layer`}
                  >
                    {elementCount}
                  </span>

                  {/* Move Up / Down Buttons */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveLayer(layer.id, 1);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: layer.color,
                      padding: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Move layer up"
                  >
                    <ArrowUp size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveLayer(layer.id, -1);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: layer.color,
                      padding: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Move layer down"
                  >
                    <ArrowDown size={10} />
                  </button>

                  {/* Center Layer in View Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCenterLayer(layer);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: layer.color,
                      padding: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Center this layer in view"
                  >
                    <Crosshair size={10} />
                  </button>

                  {/* Edit Pencil Icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLayerId(layer.id);
                      setEditingLayerName(layer.name);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: layer.color,
                      padding: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Rename layer"
                  >
                    <Edit3 size={10} />
                  </button>

                  {/* Delete Layer Button */}
                  {layers.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f43f5e',
                        padding: '1px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete layer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        {/* 3D Vertical Connector Risers (Inter-tier beams) */}
        {risers.map((riser) => {
          const dx = riser.target.x - riser.source.x;
          const dy = riser.target.y - riser.source.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          const sourceIdx = sortedLayers.findIndex(
            (l) => l && (l.order === riser.source.tier || l.id === riser.source.tier)
          );
          const targetIdx = sortedLayers.findIndex(
            (l) => l && (l.order === riser.target.tier || l.id === riser.target.tier)
          );
          const isRiserVisible =
            (sourceIdx === -1 || sourceIdx < revealedLayerCount) &&
            (targetIdx === -1 || targetIdx < revealedLayerCount);

          return (
            <React.Fragment key={riser.id}>
              {/* Vertical Glowing Riser Guide Beam */}
              <div
                style={{
                  position: 'absolute',
                  left: `${riser.source.x - bounds.minX}px`,
                  top: `${riser.source.y - bounds.minY}px`,
                  width: '2px',
                  height: `${Math.abs(riser.heightDiff)}px`,
                  transformOrigin: 'top left',
                  transform: `translateZ(${Math.min(riser.source.z, riser.target.z)}px) rotateX(90deg) ${isRiserVisible ? 'scaleY(1)' : 'scaleY(0)'}`,
                  background: `linear-gradient(to bottom, #818cf8, #06b6d4)`,
                  boxShadow: isRiserVisible ? '0 0 12px rgba(99, 102, 241, 0.8), 0 0 4px #06b6d4' : 'none',
                  opacity: isRiserVisible ? 1 : 0,
                  transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
                  pointerEvents: 'none',
                }}
              />
              {/* Horizontal Connecting Dash */}
              <div
                style={{
                  position: 'absolute',
                  left: `${riser.source.x - bounds.minX}px`,
                  top: `${riser.source.y - bounds.minY}px`,
                  width: `${len}px`,
                  height: '2px',
                  transformOrigin: 'top left',
                  transform: `translateZ(${riser.target.z}px) rotate(${angle}deg)`,
                  background: 'dashed 2px rgba(129, 140, 248, 0.6)',
                  opacity: isRiserVisible ? 1 : 0,
                  transition: 'opacity 0.35s ease',
                  pointerEvents: 'none',
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Elevated Canvas Shapes */}
        {elements
          .filter((el) => !el.isDeleted && !el.isHidden && el.type !== 'arrow')
          .map((el) => {
            const tier = tierMap.get(el.id) ?? 0;
            const layerIdx = sortedLayers.findIndex((l) => l && (l.order === tier || l.id === tier));
            const isElRevealed = layerIdx === -1 || layerIdx < revealedLayerCount;
            const isElOnActiveLayer = layerIdx === revealedLayerCount - 1;

            const z = tier * elevationSpacing;
            const futureZ = z + 150;
            const isSelected = selectedElementId === el.id;
            const isEditingThis = editingNodeId === el.id;
            const relX = el.x - bounds.minX;
            const relY = el.y - bounds.minY;
            const w = el.width || 60;
            const h = el.height || 60;
            const layer =
              sortedLayers.find((l) => l && (l.order === tier || l.id === tier)) ||
              sortedLayers[0] || { id: 'layer_0', name: 'Base Layer', color: '#6366f1', order: 0 };

            const isLayerHidden = layer?.id ? hiddenLayerIds.has(layer.id) : false;
            if (isLayerHidden) return null;

            const isSoloed = soloLayerId === layer.id;
            const isDimmed = soloLayerId !== null && !isSoloed;

            return (
              <div
                key={el.id}
                onClick={(e) => {
                  if (!isElRevealed) return;
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                }}
                onDoubleClick={(e) => {
                  if (!isElRevealed) return;
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                  setEditingNodeId(el.id);
                  setEditingText(el.text || '');
                }}
                style={{
                  position: 'absolute',
                  left: `${relX}px`,
                  top: `${relY}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  transform: isElRevealed
                    ? `translateZ(${z}px) scale(1)`
                    : `translateZ(${futureZ}px) scale(0.85)`,
                  transformStyle: 'preserve-3d',
                  borderRadius: el.type === 'ellipse' ? '50%' : '8px',
                  background: el.backgroundColor || (isDark ? '#27272a' : '#f1f5f9'),
                  border: `2px solid ${isSelected ? '#ffffff' : (isElOnActiveLayer ? layer.color : el.strokeColor || layer.color)}`,
                  boxShadow: isSelected
                    ? `0 0 0 3px #6366f1, 0 18px 32px rgba(0, 0, 0, 0.45)`
                    : (isElOnActiveLayer ? `0 0 20px ${layer.color}66, 0 14px 28px rgba(0, 0, 0, 0.4)` : `0 12px 24px rgba(0, 0, 0, 0.35)`),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  color: isDark ? '#ffffff' : '#0f172a',
                  cursor: isElRevealed ? 'pointer' : 'default',
                  opacity: !isElRevealed ? 0 : (isDimmed ? 0.2 : 1),
                  filter: !isElRevealed ? 'blur(6px)' : 'blur(0px)',
                  pointerEvents: isElRevealed ? 'auto' : 'none',
                  transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, opacity 0.45s ease, filter 0.45s ease',
                }}
                title={isElRevealed ? 'Click to select, double-click to rename' : ''}
              >
                {/* 3D Extrusion Side Wall Simulation */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: 'rgba(0, 0, 0, 0.25)',
                    transform: 'translateZ(-8px)',
                    filter: 'blur(3px)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Inline Text Editor or Text Label */}
                {isEditingThis ? (
                  <input
                    type="text"
                    value={editingText}
                    autoFocus
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNodeText();
                      if (e.key === 'Escape') setEditingNodeId(null);
                    }}
                    onBlur={handleSaveNodeText}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid #818cf8',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      padding: '2px 4px',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: `${el.fontSize || 12}px`,
                      fontWeight: 600,
                      textAlign: 'center',
                      pointerEvents: 'none',
                      lineHeight: 1.2,
                    }}
                  >
                    {el.text || el.name || el.type}
                  </span>
                )}

                {/* Elevation Level Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: layer.color,
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    transform: 'translateZ(12px)',
                  }}
                  title={layer.name}
                >
                  L{tier}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Bar: Concise Pill */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          background: isDark ? 'rgba(20, 20, 24, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: '8px',
          color: isDark ? '#f4f4f5' : '#0f172a',
          zIndex: 10,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Box size={14} style={{ color: '#818cf8' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.01em' }}>
            3D Architecture
          </span>
        </div>

        <div className="physics-dock-divider" />

        {/* Layers Studio Button */}
        <button
          type="button"
          className={`physics-btn ${isLayersStudioOpen ? 'is-active' : ''}`}
          onClick={() => setIsLayersStudioOpen((prev) => !prev)}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isLayersStudioOpen ? '#ffffff' : '#818cf8',
            background: isLayersStudioOpen ? '#6366f1' : undefined,
          }}
          title="Open Layers Studio to manage architectural tiers"
        >
          <Layers size={13} />
          <span>Layers ({layers.length})</span>
        </button>

        {/* Stamp to Canvas Split Button with Popover */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              type="button"
              className="physics-btn"
              onClick={() => handleStampToCanvas({ switchView: true })}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                color: '#818cf8',
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                padding: '4px 8px',
              }}
              title="Stamp 3D architecture to canvas and switch to 2D view"
            >
              <Download size={13} />
              <span>Stamp</span>
            </button>
            <button
              type="button"
              className="physics-btn"
              onClick={() => setIsStampMenuOpen((prev) => !prev)}
              style={{
                background: isDark ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.18)',
                color: '#818cf8',
                padding: '4px 5px',
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: '1px solid rgba(129, 140, 248, 0.25)',
              }}
              title="Stamp options"
            >
              <ChevronDown size={11} />
            </button>
          </div>

          {isStampMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                width: '210px',
                background: isDark ? '#18181b' : '#ffffff',
                border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 20,
              }}
            >
              <button
                type="button"
                className="physics-btn"
                style={{ justifyContent: 'flex-start', fontSize: '11px', padding: '6px 8px' }}
                onClick={() => handleStampToCanvas({ switchView: true })}
              >
                <ExternalLink size={12} style={{ color: '#818cf8' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Stamp & Open 2D Canvas</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>Switches directly to 2D drawing</div>
                </div>
              </button>
              <button
                type="button"
                className="physics-btn"
                style={{ justifyContent: 'flex-start', fontSize: '11px', padding: '6px 8px' }}
                onClick={() => handleStampToCanvas({ switchView: false })}
              >
                <Download size={12} style={{ color: '#10b981' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Stamp & Stay in 3D</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>Save to scene while in 3D</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* How-To Guide Button */}
        <button
          type="button"
          className="physics-btn"
          onClick={() => setIsGuideOpen(true)}
          style={{ fontSize: '11px', padding: '4px 7px' }}
          title="Controls Guide (Space + Drag to Pan • Drag to Orbit)"
        >
          <HelpCircle size={13} />
          <span>Guide</span>
        </button>
      </div>

      {/* Selected Element Elevation Inspector (Floating Top-Right) */}
      {selectedElementId && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: isDark ? 'rgba(20, 20, 23, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(12px)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(0, 0, 0, 0.14)',
            borderRadius: '10px',
            color: isDark ? '#f4f4f5' : '#0f172a',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Selected:</span>

          {/* Quick Layer Switcher Dropdown */}
          <select
            value={selectedElementLayer?.id || ''}
            onChange={(e) => {
              const target = layers.find((l) => l.id === e.target.value);
              if (target) handleMoveSelectedToLayer(target);
            }}
            style={{
              background: isDark ? '#27272a' : '#f4f4f5',
              border: `1px solid ${selectedElementLayer?.color || '#818cf8'}`,
              borderRadius: '6px',
              color: selectedElementLayer?.color || '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {topToBottomLayers.map((l) => {
              if (!l) return null;
              return (
                <option key={l.id} value={l.id} style={{ background: '#18181b', color: l.color }}>
                  L{l.order ?? 0}: {l.name}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            className="physics-btn"
            onClick={() => handleAdjustTier(1)}
            title="Elevate to higher architectural tier"
          >
            <ChevronUp size={14} />
            <span>Elevate</span>
          </button>
          <button
            type="button"
            className="physics-btn"
            onClick={() => handleAdjustTier(-1)}
            title="Lower to lower architectural tier"
          >
            <ChevronDown size={14} />
            <span>Lower</span>
          </button>
          <button
            type="button"
            className="physics-btn"
            onClick={() => {
              setEditingNodeId(selectedElementId);
              const node = elements.find((e) => e.id === selectedElementId);
              setEditingText(node?.text || '');
            }}
            title="Rename selected component"
          >
            <Edit3 size={12} />
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="physics-btn"
            onClick={handleDeleteSelected}
            style={{ color: '#f43f5e' }}
            title="Delete component"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* ADVANCED LAYERS STUDIO SLIDE-OUT DRAWER */}
      {isLayersStudioOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '80px',
            left: '24px',
            width: '340px',
            maxHeight: 'calc(100vh - 180px)',
            background: isDark ? 'rgba(24, 24, 28, 0.96)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(0, 0, 0, 0.14)',
            borderRadius: '14px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            overflow: 'hidden',
            color: isDark ? '#f4f4f5' : '#0f172a',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Architecture Layers Studio</span>
            </div>
            <button
              type="button"
              className="physics-btn"
              onClick={() => setIsLayersStudioOpen(false)}
              style={{ padding: '3px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab Selector */}
          <div
            style={{
              display: 'flex',
              padding: '4px',
              gap: '4px',
              background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.04)',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            {[
              { id: 'stack', label: `Custom Layers (${layers.length})` },
              { id: 'templates', label: 'Presets' },
              { id: 'settings', label: '3D Styling' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`physics-btn ${layersStudioTab === tab.id ? 'is-active' : ''}`}
                style={{ flex: 1, fontSize: '11px', padding: '4px 6px', textAlign: 'center', justifyContent: 'center' }}
                onClick={() => setLayersStudioTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CUSTOM LAYERS STACK */}
          {layersStudioTab === 'stack' && (
            <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* + Create New Layer Input Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px',
                  background: isDark ? '#1a1a1e' : '#f8fafc',
                  border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                {/* Color Swatch Button */}
                <input
                  type="color"
                  value={newLayerColorInput}
                  onChange={(e) => setNewLayerColorInput(e.target.value)}
                  style={{
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                  title="Choose layer color"
                />

                <input
                  type="text"
                  placeholder="New layer name (e.g. Edge CDN)..."
                  value={newLayerNameInput}
                  onChange={(e) => setNewLayerNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateLayer();
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    fontSize: '11px',
                    color: isDark ? '#ffffff' : '#0f172a',
                    outline: 'none',
                  }}
                />

                <button
                  type="button"
                  className="physics-btn is-active"
                  onClick={() => handleCreateLayer()}
                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>

              {/* Layer Stack Items (Top to Bottom) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {topToBottomLayers.map((layer) => {
                  if (!layer) return null;
                  const isHidden = hiddenLayerIds.has(layer.id);
                  const isSoloed = soloLayerId === layer.id;
                  const count = elementCountPerLayer[layer.id] || elementCountPerLayer[layer.order ?? 0] || 0;

                  return (
                    <div
                      key={layer.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        background: isDark ? '#1f1f24' : '#ffffff',
                        border: `1px solid ${layer.color}44`,
                        borderRadius: '8px',
                        borderLeft: `4px solid ${layer.color}`,
                      }}
                    >
                      {/* Layer Order & Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: layer.color, fontWeight: 700 }}>
                            L{layer.order ?? 0}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {layer.name}
                          </span>
                          <span style={{ fontSize: '9px', opacity: 0.6 }}>({count})</span>
                        </div>
                        <div style={{ fontSize: '9px', opacity: 0.5 }}>
                          +{((layer.order ?? 0) * elevationSpacing)}px elevation
                        </div>
                      </div>

                      {/* Solo Button */}
                      <button
                        type="button"
                        onClick={() => handleSoloLayer(layer.id)}
                        className={`physics-btn ${isSoloed ? 'is-active' : ''}`}
                        style={{
                          padding: '2px 6px',
                          fontSize: '9px',
                          background: isSoloed ? layer.color : undefined,
                          color: isSoloed ? '#ffffff' : undefined,
                        }}
                        title="Solo this layer (dim all other layers)"
                      >
                        Solo
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleLayerVisibility(layer.id)}
                        className="physics-btn"
                        style={{ padding: '3px' }}
                        title={isHidden ? 'Show layer' : 'Hide layer'}
                      >
                        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => handleMoveLayer(layer.id, 1)}
                        className="physics-btn"
                        style={{ padding: '3px' }}
                        title="Move layer up"
                      >
                        <ChevronUp size={12} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveLayer(layer.id, -1)}
                        className="physics-btn"
                        style={{ padding: '3px' }}
                        title="Move layer down"
                      >
                        <ChevronDown size={12} />
                      </button>

                      {/* Delete */}
                      {layers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLayer(layer.id)}
                          className="physics-btn"
                          style={{ padding: '3px', color: '#f43f5e' }}
                          title="Delete layer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURE TEMPLATES */}
          {layersStudioTab === 'templates' && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '2px' }}>
                Choose a pre-stratified multi-tier cloud pattern:
              </div>
              {Object.values(ARCHITECTURE_PRESET_TEMPLATES).map((tmpl) => (
                <div
                  key={tmpl.id}
                  style={{
                    padding: '8px 10px',
                    background: isDark ? '#1f1f24' : '#f8fafc',
                    border: isDark ? '1px solid #2d2d34' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                  onClick={() => handleLoadTemplate(tmpl.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
                      {tmpl.name}
                    </span>
                    <span style={{ fontSize: '9px', background: 'rgba(99, 102, 241, 0.2)', padding: '1px 5px', borderRadius: '8px' }}>
                      {tmpl.layers.length} tiers
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.65 }}>
                    {tmpl.description}
                  </div>
                  {/* Layer Color Dots Preview */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    {tmpl.layers.map((l) => (
                      <span
                        key={l.id}
                        style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }}
                        title={l.name}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: 3D WORLD STYLING & DISPLAY */}
          {layersStudioTab === 'settings' && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {/* Vertical Layer Spacing Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Floor Pitch / Spacing:</span>
                  <span style={{ fontWeight: 700, color: '#818cf8' }}>{elevationSpacing}px</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="220"
                  step="5"
                  value={elevationSpacing}
                  onChange={(e) => setElevationSpacing(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* Plate Glass Opacity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Glass Plate Opacity:</span>
                  <span style={{ fontWeight: 700, color: '#818cf8' }}>{Math.round(plateOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.45"
                  step="0.02"
                  value={plateOpacity}
                  onChange={(e) => setPlateOpacity(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showTierPlates}
                    onChange={(e) => setShowTierPlates(e.target.checked)}
                  />
                  <span>Show Translucent Glass Floor Plates</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showGridlines}
                    onChange={(e) => setShowGridlines(e.target.checked)}
                  />
                  <span>Show Floor Plane Gridlines</span>
                </label>
              </div>

              {/* Reset Layers to Default */}
              <button
                type="button"
                className="physics-btn"
                onClick={() => handleLoadTemplate('cloud_4tier')}
                style={{ marginTop: '8px', justifyContent: 'center' }}
              >
                <RotateCcw size={12} />
                <span>Reset to Standard 4-Tier Cloud</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* How-To Guide Modal */}
      {isGuideOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsGuideOpen(false)}
        >
          <div
            style={{
              width: 'min(560px, 92vw)',
              background: isDark ? '#141417' : '#ffffff',
              border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px',
              color: isDark ? '#f4f4f5' : '#0f172a',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={18} style={{ color: '#818cf8' }} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Custom 3D Architecture Layers Guide</h3>
              </div>
              <button
                type="button"
                className="physics-btn"
                onClick={() => setIsGuideOpen(false)}
                style={{ padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>1. Create & Rename Layers Inline in 3D</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.8 }}>
                  Look at the floating badges on the left edge of each 3D floor plane. <strong>Double-click</strong> any badge to type your custom layer name right in 3D! Click the colored dot to pick a new color, or use the <code>▲ / ▼</code> arrows to reorder floor heights.
                </p>
              </div>

              <div>
                <strong>2. The "Layers Studio" Drawer</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.8 }}>
                  Click <strong>Layers ({layers.length})</strong> in the top bar to open the full studio. Add unlimited custom tiers (e.g. <em>Edge CDN, Kafka Event Mesh, Vector DB, AI Orchestration</em>), solo any layer, or toggle visibility.
                </p>
              </div>

              <div>
                <strong>3. Ready-Made Architecture Presets</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.8 }}>
                  In the Layers Studio, switch between <strong>Cloud Native 4-Tier</strong>, <strong>AI & LLM 5-Tier</strong>, <strong>Event-Driven 6-Tier</strong>, or <strong>Classic 3-Tier</strong> with a single click.
                </p>
              </div>

              <div>
                <strong>4. Assign & Move Components</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.8 }}>
                  Select any component in 3D and use the layer dropdown in the top-right inspector to immediately transport it to any floor plane, or click <strong>+ Add Node</strong> in the dock to drop directly into that tier.
                </p>
              </div>

              <div>
                <strong>5. 3D Scroll Story & Layer-by-Layer Assembly</strong>
                <p style={{ margin: '4px 0 0', opacity: 0.8 }}>
                  Scroll your mouse wheel or trackpad to dynamically build and assemble your architecture stack layer-by-layer with cinematic 3D easing. Use the timeline scrubber pips to jump to any tier, click <strong>Auto Tour</strong> for an automated showcase, and hold <strong>Ctrl + Wheel</strong> anytime to zoom.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="physics-btn is-active"
                onClick={() => {
                  setIsGuideOpen(false);
                  setIsLayersStudioOpen(true);
                }}
              >
                <Layers size={13} />
                <span>Open Layers Studio</span>
              </button>
              <button
                type="button"
                className="physics-btn"
                onClick={() => setIsGuideOpen(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Scroll Story / Layer-by-Layer Assembly HUD Controller */}
      <div
        className="isometric-story-scrubber"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '74px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: isDark ? 'rgba(20, 20, 25, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(0, 0, 0, 0.12)',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
          color: isDark ? '#f4f4f5' : '#0f172a',
          zIndex: 10,
          userSelect: 'none',
        }}
      >
        {/* Scroll Mode Toggle */}
        <button
          type="button"
          className={`physics-btn ${scrollMode === 'story' ? 'is-active' : ''}`}
          onClick={() => {
            const next = scrollMode === 'story' ? 'zoom' : 'story';
            setScrollMode(next);
            doodleAPI?.onToast?.(
              next === 'story'
                ? 'Scroll Mode: 3D Story (Scroll wheel reveals layers • Ctrl+Wheel to zoom)'
                : 'Scroll Mode: Zoom Canvas'
            );
          }}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            color: scrollMode === 'story' ? '#818cf8' : undefined,
          }}
          title="Toggle between 3D Layer Scroll Story and Canvas Zoom (Ctrl+Wheel always zooms)"
        >
          <Sparkles size={12} style={{ color: scrollMode === 'story' ? '#818cf8' : undefined }} />
          <span>{scrollMode === 'story' ? 'Scroll: Story' : 'Scroll: Zoom'}</span>
        </button>

        <div className="physics-dock-divider" />

        {/* Step Backward Button */}
        <button
          type="button"
          className="physics-btn"
          disabled={revealedLayerCount <= 1}
          onClick={() => setRevealedLayerCount((prev) => Math.max(1, prev - 1))}
          style={{
            opacity: revealedLayerCount <= 1 ? 0.35 : 1,
            padding: '3px 6px',
            cursor: revealedLayerCount <= 1 ? 'not-allowed' : 'pointer',
          }}
          title="Previous tier (or Scroll Up / [)"
        >
          <ChevronLeft size={13} />
        </button>

        {/* Layer Pips / Timeline Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {sortedLayers.map((l, idx) => {
            if (!l) return null;
            const isRevealed = idx < revealedLayerCount;
            const isCurrent = idx === revealedLayerCount - 1;
            return (
              <button
                key={`story_pip_${l.id}`}
                type="button"
                onClick={() => setRevealedLayerCount(idx + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: isCurrent
                    ? `1px solid ${l.color}`
                    : '1px solid transparent',
                  background: isCurrent
                    ? `${l.color}24`
                    : isRevealed
                    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
                    : 'transparent',
                  color: isCurrent
                    ? l.color
                    : isRevealed
                    ? (isDark ? '#e4e4e7' : '#3f3f46')
                    : '#71717a',
                  fontSize: '11px',
                  fontWeight: isCurrent ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                title={`Click to show up to Layer ${idx + 1}: ${l.name}`}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: isRevealed ? l.color : '#52525b',
                    boxShadow: isCurrent ? `0 0 8px ${l.color}` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <span>L{l.order ?? idx}</span>
              </button>
            );
          })}
        </div>

        {/* Step Forward Button */}
        <button
          type="button"
          className="physics-btn"
          disabled={revealedLayerCount >= sortedLayers.length}
          onClick={() => setRevealedLayerCount((prev) => Math.min(sortedLayers.length, prev + 1))}
          style={{
            opacity: revealedLayerCount >= sortedLayers.length ? 0.35 : 1,
            padding: '3px 6px',
            cursor: revealedLayerCount >= sortedLayers.length ? 'not-allowed' : 'pointer',
          }}
          title="Next tier (or Scroll Down / ])"
        >
          <ChevronRight size={13} />
        </button>

        <div className="physics-dock-divider" />

        {/* Current Active Layer Info Badge */}
        {(() => {
          const currentLayer = sortedLayers[revealedLayerCount - 1] || sortedLayers[0];
          const nodeCount = currentLayer ? (elementCountPerLayer[currentLayer.id] ?? elementCountPerLayer[currentLayer.order ?? 0] ?? 0) : 0;
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                background: currentLayer ? `${currentLayer.color}15` : 'transparent',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: currentLayer?.color || '#818cf8',
              }}
            >
              <span>{revealedLayerCount}/{sortedLayers.length}:</span>
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentLayer?.name || 'Base Layer'}
              </span>
              <span style={{ fontSize: '10px', opacity: 0.75 }}>({nodeCount})</span>
            </div>
          );
        })()}

        <div className="physics-dock-divider" />

        {/* Auto Tour Play / Pause */}
        <button
          type="button"
          className={`physics-btn ${isPlayingTour ? 'is-active' : ''}`}
          onClick={() => {
            setIsPlayingTour((prev) => {
              const next = !prev;
              doodleAPI?.onToast?.(next ? '▶ Auto Tour: Assembling architecture layers' : 'Paused Auto Tour');
              return next;
            });
          }}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '3px 8px',
            color: isPlayingTour ? '#10b981' : undefined,
            background: isPlayingTour ? 'rgba(16, 185, 129, 0.2)' : undefined,
          }}
          title={isPlayingTour ? 'Pause automated tour' : 'Play automated 3D layer assembly tour'}
        >
          {isPlayingTour ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPlayingTour ? 'Pause' : 'Tour'}</span>
        </button>

        {/* Show All / Reset Toggle */}
        <button
          type="button"
          className="physics-btn"
          onClick={() => {
            if (revealedLayerCount === sortedLayers.length) {
              setRevealedLayerCount(1);
              doodleAPI?.onToast?.('Reset to foundation layer (Scroll down to build)');
            } else {
              setRevealedLayerCount(sortedLayers.length);
              doodleAPI?.onToast?.('All architecture layers assembled');
            }
          }}
          style={{ fontSize: '11px', padding: '3px 8px' }}
          title={revealedLayerCount === sortedLayers.length ? 'Collapse down to base layer' : 'Assemble all layers'}
        >
          <span>{revealedLayerCount === sortedLayers.length ? 'Base Only' : 'Show All'}</span>
        </button>
      </div>

      {/* Bottom Floating Control Dock */}
      <div
        className="physics-playground-dock"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        {/* Pan vs Orbit Camera Mode Switcher */}
        <button
          type="button"
          className={`physics-btn ${cameraMode === 'pan' ? 'is-active' : ''}`}
          onClick={() => {
            const nextMode = cameraMode === 'orbit' ? 'pan' : 'orbit';
            setCameraMode(nextMode);
            doodleAPI?.onToast?.(
              nextMode === 'pan'
                ? '✋ Pan Mode: Drag anywhere to move surroundings (or hold Spacebar)'
                : '🔄 Orbit Mode: Drag anywhere to orbit 360°'
            );
          }}
          title={cameraMode === 'pan' ? 'Switch to Orbit Mode (O)' : 'Switch to Pan/Hand Mode (H / hold Space)'}
        >
          {cameraMode === 'pan' ? <Hand size={12} /> : <RotateCw size={12} />}
          <span>{cameraMode === 'pan' ? 'Hand Mode' : 'Orbit Mode'}</span>
        </button>

        <div className="physics-dock-divider" />

        {/* Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {[
            { id: 'isometric', label: 'Isometric' },
            { id: 'architecture', label: 'Stack' },
            { id: 'cinematic', label: 'Cinematic' },
            { id: 'top', label: 'Top 2D' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              className={`physics-btn ${activePreset === p.id ? 'is-active' : ''}`}
              onClick={() => handleApplyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="physics-dock-divider" />

        {/* Add Architecture Node Button with Popover */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`physics-btn ${isAddMenuOpen ? 'is-active' : ''}`}
            onClick={() => setIsAddMenuOpen((prev) => !prev)}
            style={{ color: '#10b981', fontWeight: 600 }}
            title="Add a new component to any custom 3D tier"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Add Node</span>
          </button>

          {isAddMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                width: '210px',
                background: isDark ? '#18181b' : '#ffffff',
                border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 20,
              }}
            >
              <div style={{ fontSize: '10px', opacity: 0.6, padding: '4px 8px', fontWeight: 700 }}>
                SELECT TARGET LAYER:
              </div>
              {topToBottomLayers.map((layer) => {
                if (!layer) return null;
                return (
                  <button
                    key={`add_tier_${layer.id}`}
                    type="button"
                    className="physics-btn"
                    style={{
                      justifyContent: 'flex-start',
                      color: layer.color || '#6366f1',
                      fontSize: '11px',
                      padding: '5px 8px',
                    }}
                    onClick={() => handleAddNodeToLayer(layer)}
                  >
                    <Plus size={11} />
                    <span>+ {layer.name} (L{layer.order ?? 0})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="physics-dock-divider" />

        {/* Layers Studio Quick Toggle */}
        <button
          type="button"
          className={`physics-btn ${isLayersStudioOpen ? 'is-active' : ''}`}
          onClick={() => setIsLayersStudioOpen((prev) => !prev)}
          title="Open Layers Studio"
        >
          <Layers size={12} />
          <span>Layers</span>
        </button>

        {/* Layer Elevation Spacing Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
          <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Spacing:</span>
          <button
            type="button"
            className="physics-btn"
            style={{ padding: '2px 6px' }}
            onClick={() => setElevationSpacing((prev) => Math.max(30, prev - 15))}
            title="Reduce 3D layer vertical spacing"
          >
            -
          </button>
          <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '38px', textAlign: 'center' }}>
            {elevationSpacing}px
          </span>
          <button
            type="button"
            className="physics-btn"
            style={{ padding: '2px 6px' }}
            onClick={() => setElevationSpacing((prev) => Math.min(220, prev + 15))}
            title="Increase 3D layer vertical spacing"
          >
            +
          </button>
        </div>

        <div className="physics-dock-divider" />

        {/* Toggle Layer Planes */}
        <button
          type="button"
          className={`physics-btn ${showTierPlates ? 'is-active' : ''}`}
          onClick={() => setShowTierPlates((prev) => !prev)}
          title="Toggle translucent layer plane plates"
        >
          <Grid size={12} />
          <span>Plates</span>
        </button>

        {/* Center View */}
        <button
          type="button"
          className="physics-btn"
          onClick={handleCenterView}
          title="Center Architecture Canvas (C)"
        >
          <Crosshair size={12} />
          <span>Center</span>
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          className="physics-btn"
          onClick={handleResetCamera}
          title="Reset Camera Orientation & Zoom (R)"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>

        {/* Snapshot */}
        <button
          type="button"
          className="physics-btn"
          onClick={handleExportSnapshot}
          disabled={isSnapshotting}
          style={{ color: '#818cf8', opacity: isSnapshotting ? 0.7 : 1 }}
          title="Snapshot 3D View to PNG & Copy to Clipboard"
        >
          {isSnapshotting ? (
            <>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Camera size={12} />
              <span>Snapshot</span>
            </>
          )}
        </button>

        {/* Close Button */}
        <button
          type="button"
          className="physics-btn"
          onClick={onClose}
          style={{ padding: '4px 6px', color: '#a1a1aa' }}
          title="Exit 3D View (Escape)"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

export default Isometric3DArchitectureView;
