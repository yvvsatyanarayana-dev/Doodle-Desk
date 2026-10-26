import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Sliders,
  Check,
  X,
  RefreshCw,
  Image as ImageIcon,
  ArrowRight,
  Layers,
  Trash2,
  ChevronDown,
  Square,
  Circle,
  Diamond,
  Eye,
  Palette,
  ZoomIn,
} from 'lucide-react';
import { defaultElementProps, generateId, ELEMENT_TYPES } from '../engine/elements.js';
import {
  traceImageVectorContours,
  vectorizeImageContours,
  COMMON_VOCABULARY,
} from '../utils/opticalOcrEngine.js';

// ── Built-in Curated Demo Sketch Presets ────────────────────────────────────
const DEMO_PRESETS = {
  architecture: {
    id: 'architecture',
    name: 'Cloud Architecture',
    description: 'Client App ➔ API Gateway ➔ Postgres DB',
    shapes: [
      { id: 'shape_box_1', type: 'rectangle', x: 60, y: 60, width: 160, height: 90, text: 'Client App' },
      { id: 'shape_arr_1', type: 'arrow', x: 225, y: 105, width: 160, height: 0, points: [[0, 0], [160, 0]], text: 'HTTPS' },
      { id: 'shape_box_2', type: 'rectangle', x: 390, y: 60, width: 180, height: 90, text: 'API Gateway' },
      { id: 'shape_arr_2', type: 'arrow', x: 480, y: 155, width: 0, height: 100, points: [[0, 0], [0, 100]], text: 'SQL Query' },
      { id: 'shape_ell_1', type: 'ellipse', x: 405, y: 265, width: 150, height: 95, text: 'Postgres DB' },
    ],
    drawSketch: (ctx, width, height) => {
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      for (let x = 15; x < width; x += 25) {
        for (let y = 15; y < height; y += 25) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeRect(60, 60, 160, 90);
      ctx.font = 'bold 20px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('Client App', 90, 112);

      ctx.beginPath();
      ctx.moveTo(225, 105);
      ctx.lineTo(380, 105);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(366, 96);
      ctx.lineTo(382, 105);
      ctx.lineTo(366, 114);
      ctx.stroke();

      ctx.font = '13px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#52525b';
      ctx.fillText('HTTPS', 285, 90);

      ctx.strokeRect(390, 60, 180, 90);
      ctx.font = 'bold 20px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('API Gateway', 420, 112);

      ctx.beginPath();
      ctx.moveTo(480, 155);
      ctx.lineTo(480, 255);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(472, 242);
      ctx.lineTo(480, 255);
      ctx.lineTo(488, 242);
      ctx.stroke();

      ctx.font = '13px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#52525b';
      ctx.fillText('SQL Query', 496, 205);

      ctx.beginPath();
      ctx.ellipse(480, 280, 75, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(405, 280);
      ctx.lineTo(405, 345);
      ctx.moveTo(555, 280);
      ctx.lineTo(555, 345);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(480, 345, 75, 16, 0, 0, Math.PI);
      ctx.stroke();

      ctx.font = 'bold 18px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('Postgres DB', 432, 318);
    },
  },
  auth_flow: {
    id: 'auth_flow',
    name: 'User Auth Flow',
    description: 'User Login ➔ Decision Diamond ➔ 2FA / Dashboard',
    shapes: [
      { id: 'auth_box_1', type: 'rectangle', x: 40, y: 140, width: 140, height: 80, text: 'User Login' },
      { id: 'auth_arr_1', type: 'arrow', x: 185, y: 180, width: 90, height: 0, points: [[0, 0], [90, 0]], text: '' },
      { id: 'auth_dia_1', type: 'diamond', x: 280, y: 125, width: 120, height: 110, text: 'Valid Auth?' },
      { id: 'auth_arr_2', type: 'arrow', x: 405, y: 160, width: 90, height: -60, points: [[0, 0], [90, -60]], text: 'Yes' },
      { id: 'auth_box_2', type: 'rectangle', x: 500, y: 60, width: 140, height: 75, text: 'Dashboard' },
      { id: 'auth_arr_3', type: 'arrow', x: 405, y: 200, width: 90, height: 60, points: [[0, 0], [90, 60]], text: 'No' },
      { id: 'auth_box_3', type: 'rectangle', x: 500, y: 220, width: 140, height: 75, text: '2FA Challenge' },
    ],
    drawSketch: (ctx, width, height) => {
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      for (let x = 15; x < width; x += 25) {
        for (let y = 15; y < height; y += 25) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.strokeRect(40, 140, 140, 80);
      ctx.font = 'bold 18px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('User Login', 65, 185);
    },
  },
};

export function NapkinToVectorScannerModal({
  isOpen,
  onClose,
  doodleAPI,
  isDark = true,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [vectorMode, setVectorMode] = useState('strokes'); // 'strokes' = freehand artwork paths | 'shapes' = flowchart blocks
  const [activeDetailPreset, setActiveDetailPreset] = useState('balanced'); // 'intricate' | 'balanced' | 'clean'
  const [threshold, setThreshold] = useState(140);
  const [edgeSensitivity, setEdgeSensitivity] = useState(26);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState(isDark ? '#ffffff' : '#18181b');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedShapes, setDetectedShapes] = useState([]);
  const [hoveredShapeId, setHoveredShapeId] = useState(null);
  const [activePreset, setActivePreset] = useState('architecture');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);
  const [leftViewMode, setLeftViewMode] = useState('original'); // 'original' | 'edge'

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDemoModeRef = useRef(false);

  // Synchronize default stroke color with theme when user hasn't explicitly chosen one
  useEffect(() => {
    setStrokeColor(isDark ? '#ffffff' : '#18181b');
  }, [isDark]);

  // Cleanly shut down camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsUsingCamera(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  // Escape key and clipboard screenshot paste handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              isDemoModeRef.current = false;
              setVectorMode('strokes');
              setImageSrc(event.target.result);
              stopCamera();
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, onClose, stopCamera]);

  // Start webcam stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsUsingCamera(true);
      setImageSrc(null);
      isDemoModeRef.current = false;
    } catch {
      alert('Camera access denied or not available. Please upload an image instead.');
    }
  };

  // Capture frame from webcam
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      isDemoModeRef.current = false;
      setVectorMode('strokes');
      setImageSrc(dataUrl);
    }
    stopCamera();
  };

  // Handle uploaded image file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      isDemoModeRef.current = false;
      setVectorMode('strokes');
      setImageSrc(event.target.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Load sample napkin flowchart (for tests and quick demos)
  const loadSampleNapkin = (presetKey = 'architecture') => {
    const preset = DEMO_PRESETS[presetKey] || DEMO_PRESETS.architecture;
    setActivePreset(preset.id);
    setIsPresetDropdownOpen(false);
    isDemoModeRef.current = true;
    setVectorMode('shapes');

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;

    if (!ctx) {
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="100%" height="100%" fill="#faf8f5"/><rect x="60" y="60" width="160" height="90" stroke="#1e1e24" stroke-width="3" fill="none"/><text x="90" y="112" font-size="20">Client App</text></svg>`;
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
      setImageSrc(dataUrl);
      setDetectedShapes(preset.shapes);
      stopCamera();
      return;
    }

    preset.drawSketch(ctx, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setImageSrc(dataUrl);
    setDetectedShapes(preset.shapes);
    stopCamera();
  };

  // High-Precision Sobel Gradient & Optical Vectorization Pipeline
  const runVectorization = useCallback(() => {
    if (!imageSrc || isDemoModeRef.current) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);

      if (vectorMode === 'strokes') {
        // High-Precision Artwork & Sketch Contour Vectorizer with noise suppression
        const minStrokeLength = activeDetailPreset === 'intricate' ? 6 : (activeDetailPreset === 'clean' ? 16 : 9);
        const strokes = traceImageVectorContours(imgData, {
          threshold,
          edgeSensitivity,
          strokeColor: strokeColor || (isDark ? '#ffffff' : '#18181b'),
          strokeWidth,
          epsilon: 1.25,
          minPoints: 2,
          maxResolution: 800,
          minStrokeLength,
        });
        setDetectedShapes(strokes);
      } else {
        // Flowchart & Diagram Blocks Classifier
        const shapes = vectorizeImageContours(imgData, {
          threshold,
          isArchitecture: true,
        });
        setDetectedShapes(shapes);
      }
      setIsProcessing(false);
    };

    img.onerror = () => {
      setIsProcessing(false);
    };

    img.src = imageSrc;
  }, [imageSrc, vectorMode, threshold, edgeSensitivity, strokeColor, strokeWidth, isDark]);

  useEffect(() => {
    if (imageSrc && !isDemoModeRef.current) {
      runVectorization();
    }
  }, [imageSrc, vectorMode, threshold, edgeSensitivity, strokeColor, strokeWidth, runVectorization]);

  // Handle Preset Detail Switcher
  const handleApplyPreset = (presetType) => {
    setActiveDetailPreset(presetType);
    isDemoModeRef.current = false;
    if (presetType === 'intricate') {
      setEdgeSensitivity(16);
      setThreshold(155);
      setStrokeWidth(1.5);
    } else if (presetType === 'balanced') {
      setEdgeSensitivity(26);
      setThreshold(140);
      setStrokeWidth(2);
    } else if (presetType === 'clean') {
      setEdgeSensitivity(42);
      setThreshold(125);
      setStrokeWidth(2.5);
    }
  };

  // Compute tight dynamic bounding box for preview SVG viewport centering
  const previewBounds = useMemo(() => {
    if (!detectedShapes || detectedShapes.length === 0) {
      return { minX: 0, minY: 0, width: 640, height: 420 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    detectedShapes.forEach((shape) => {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      const w = shape.width || 0;
      const h = shape.height || 0;
      maxX = Math.max(maxX, shape.x + Math.max(20, w));
      maxY = Math.max(maxY, shape.y + Math.max(20, h));
    });

    if (minX === Infinity) return { minX: 0, minY: 0, width: 640, height: 420 };

    const padding = 24;
    return {
      minX: Math.max(0, minX - padding),
      minY: Math.max(0, minY - padding),
      width: Math.max(100, maxX - minX + padding * 2),
      height: Math.max(100, maxY - minY + padding * 2),
    };
  }, [detectedShapes]);

  // Insert recognized vector shapes directly onto the Doodle Desk canvas
  const handleInsertToCanvas = () => {
    if (!doodleAPI || detectedShapes.length === 0) return;

    const appState = doodleAPI.getAppState?.() || {};
    const zoom = appState.zoom?.value || 1;
    const scrollX = appState.scrollX || 0;
    const scrollY = appState.scrollY || 0;

    // Viewport center coordinates
    const centerX = -scrollX + (window.innerWidth / 2) / zoom;
    const centerY = -scrollY + (window.innerHeight / 2) / zoom;

    let newElements = [];
    const effectiveColor = strokeColor || (isDark ? '#ffffff' : '#1e1e1e');

    if (vectorMode === 'strokes' || detectedShapes[0]?.type === ELEMENT_TYPES.FREEDRAW) {
      // ── Native Freedraw Vector Paths ──
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      detectedShapes.forEach((s) => {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + (s.width || 0));
        maxY = Math.max(maxY, s.y + (s.height || 0));
      });

      const clusterW = Math.max(20, maxX - minX);
      const clusterH = Math.max(20, maxY - minY);
      const offsetX = Math.round(centerX - minX - clusterW / 2);
      const offsetY = Math.round(centerY - minY - clusterH / 2);

      const artworkGroupId = `group_artwork_${generateId()}`;
      newElements = detectedShapes.map((stroke) => ({
        ...defaultElementProps(),
        ...stroke,
        id: `vector_stroke_${generateId()}`,
        groupIds: [artworkGroupId],
        x: Math.round(stroke.x + offsetX),
        y: Math.round(stroke.y + offsetY),
        strokeColor: effectiveColor,
        strokeWidth: strokeWidth || 2,
        roughness: 1,
        simulatePressure: true,
        isDeleted: false,
      }));
    } else {
      // ── Architecture & Diagram Block Shapes ──
      const avgX = detectedShapes.reduce((sum, s) => sum + s.x, 0) / detectedShapes.length;
      const avgY = detectedShapes.reduce((sum, s) => sum + s.y, 0) / detectedShapes.length;

      detectedShapes.forEach((s) => {
        const targetX = Math.round(centerX + (s.x - avgX));
        const targetY = Math.round(centerY + (s.y - avgY));
        const isConnector = s.type === 'arrow' || s.type === 'line';
        const isDb = s.type === 'cylinder' || (s.type === 'ellipse' && s.text?.toLowerCase().includes('db'));

        if (isDb) {
          const cylId = generateId();
          const textId = generateId();
          const cylW = Math.max(90, Math.abs(s.width || 130));
          const cylH = Math.max(70, Math.abs(s.height || 100));

          const cylinderEl = {
            ...defaultElementProps(),
            id: cylId,
            type: ELEMENT_TYPES.CYLINDER,
            x: targetX,
            y: targetY,
            width: cylW,
            height: cylH,
            strokeColor: effectiveColor,
            backgroundColor: 'transparent',
            fillStyle: 'none',
            strokeWidth: 2,
            roughness: 1,
            boundElements: s.text ? [{ id: textId, type: 'text' }] : null,
          };

          const lidH = Math.min(cylH * 0.35, 34);
          const textElement = {
            ...defaultElementProps(),
            id: textId,
            type: ELEMENT_TYPES.TEXT,
            x: targetX + 10,
            y: targetY + Math.round(lidH / 2) + Math.round((cylH - lidH) / 2) - 12,
            width: Math.max(60, cylW - 20),
            height: 24,
            text: s.text,
            originalText: s.text,
            fontSize: 15,
            fontFamily: 5,
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor: effectiveColor,
            containerId: cylId,
            lineHeight: 1.25,
          };
          newElements.push(cylinderEl, textElement);
        } else if (isConnector) {
          const arrowId = generateId();
          const dx = (s.points ? s.points[1][0] : s.width) || 120;
          const dy = (s.points ? s.points[1][1] : s.height) || 0;

          const arrowElement = {
            ...defaultElementProps(),
            id: arrowId,
            type: s.type === 'line' ? ELEMENT_TYPES.LINE : ELEMENT_TYPES.ARROW,
            x: targetX,
            y: targetY,
            width: Math.max(1, Math.abs(dx)),
            height: Math.max(1, Math.abs(dy)),
            points: s.points || [[0, 0], [dx, dy]],
            strokeColor: effectiveColor,
            strokeWidth: 2,
            roughness: 1,
            endArrowhead: s.type === 'arrow' ? 'arrow' : null,
          };
          newElements.push(arrowElement);

          if (s.text) {
            const labelWidth = Math.max(160, Math.round(s.text.length * 18));
            let labelX, labelY;
            if (Math.abs(dx) < 15) {
              labelX = targetX + 22;
              labelY = targetY + dy * 0.5 - 12;
            } else {
              labelX = targetX + dx * 0.5 - labelWidth / 2;
              labelY = targetY + dy * 0.5 - 28;
            }

            const arrowLabelEl = {
              ...defaultElementProps(),
              id: generateId(),
              type: ELEMENT_TYPES.TEXT,
              x: Math.round(labelX),
              y: Math.round(labelY),
              width: labelWidth,
              height: 24,
              text: s.text,
              originalText: s.text,
              fontSize: 14,
              fontFamily: 5,
              textAlign: 'center',
              verticalAlign: 'middle',
              strokeColor: effectiveColor,
              lineHeight: 1.25,
            };
            newElements.push(arrowLabelEl);
          }
        } else {
          const shapeId = generateId();
          const textId = generateId();
          const w = Math.max(40, Math.abs(s.width || 120));
          const h = Math.max(30, Math.abs(s.height || 70));

          let elType = ELEMENT_TYPES.RECTANGLE;
          if (s.type === 'diamond') elType = ELEMENT_TYPES.DIAMOND;
          else if (s.type === 'ellipse') elType = ELEMENT_TYPES.ELLIPSE;

          const containerElement = {
            ...defaultElementProps(),
            id: shapeId,
            type: elType,
            x: targetX,
            y: targetY,
            width: w,
            height: h,
            strokeColor: effectiveColor,
            backgroundColor: 'transparent',
            fillStyle: 'none',
            strokeWidth: 2,
            roughness: 1,
            roundness: 'round',
            boundElements: s.text ? [{ id: textId, type: 'text' }] : null,
          };
          newElements.push(containerElement);

          if (s.text) {
            const textElement = {
              ...defaultElementProps(),
              id: textId,
              type: ELEMENT_TYPES.TEXT,
              x: targetX + 10,
              y: targetY + Math.round(h / 2 - 12),
              width: Math.max(20, w - 20),
              height: 24,
              text: s.text,
              originalText: s.text,
              fontSize: Math.min(18, Math.max(13, Math.round(w / (s.text.length * 0.85)))),
              fontFamily: 5,
              textAlign: 'center',
              verticalAlign: 'middle',
              strokeColor: effectiveColor,
              containerId: shapeId,
              lineHeight: 1.25,
            };
            newElements.push(textElement);
          }
        }
      });
    }

    const currentElements = (doodleAPI.getSceneElements?.() || []).filter((el) => !el.isDeleted);
    const selectedIds = {};
    newElements.forEach((el) => {
      selectedIds[el.id] = true;
    });

    doodleAPI.updateScene?.({
      elements: [...currentElements, ...newElements],
      appState: {
        selectedElementIds: selectedIds,
        showWelcomeScreen: false,
      },
      commitToHistory: true,
    });

    setTimeout(() => {
      doodleAPI.scrollToContent?.(newElements, { fitToContent: true, animate: true });
    }, 60);

    onClose();
  };

  // Modify shape label in diagram mode
  const updateShapeText = (id, newText) => {
    setDetectedShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText } : s))
    );
  };

  // Modify shape type in diagram mode
  const updateShapeType = (id, newType) => {
    setDetectedShapes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const isConnector = newType === 'arrow' || newType === 'line';
        return {
          ...s,
          type: newType,
          points: isConnector ? s.points || [[0, 0], [s.width || 100, s.height || 0]] : undefined,
        };
      })
    );
  };

  // Delete a shape
  const deleteShape = (id) => {
    setDetectedShapes((prev) => prev.filter((s) => s.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 99999 }}
    >
      <div
        className="pref-modal-content help-style-dialog napkin-vector-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1080px, 96vw)',
          maxWidth: '1080px',
          height: 'min(780px, 92vh)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          gap: '12px',
          overflow: 'hidden',
        }}
      >
        {/* ── Native Doodle Desk Header Bar ── */}
        <div className="pref-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="help-dialog-icon-badge">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="pref-title" style={{ fontSize: '18px', fontWeight: 600 }}>
                Napkin & Sketch-to-Vector Scanner
              </h2>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(99, 102, 241, 0.25)',
                color: isDark ? '#a5b4fc' : '#4f46e5',
              }}
            >
              Computer Vision
            </span>
          </div>

          <button
            type="button"
            className="pref-esc-pill"
            onClick={onClose}
            aria-label="Close dialog"
          >
            Esc to close
          </button>
        </div>

        {/* Subtitle */}
        <h3 className="pref-subtitle" style={{ margin: '0 0 2px 0' }}>
          Turn physical paper drawings & whiteboard photos into native editable vectors
        </h3>

        {/* ── Mode & Preset Switcher Strip ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            paddingBottom: '4px',
          }}
        >
          {/* Vector Mode Selector Tabs */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
              borderRadius: '8px',
              padding: '3px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => {
                isDemoModeRef.current = false;
                setVectorMode('strokes');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: vectorMode === 'strokes' ? 600 : 500,
                cursor: 'pointer',
                border: 'none',
                background: vectorMode === 'strokes'
                  ? (isDark ? '#6366f1' : '#4f46e5')
                  : 'transparent',
                color: vectorMode === 'strokes' ? '#ffffff' : (isDark ? '#a1a1aa' : '#64748b'),
                transition: 'all 0.15s ease',
              }}
            >
              🎨 Artwork & Sketch Vectors
            </button>

            <button
              type="button"
              onClick={() => {
                isDemoModeRef.current = false;
                setVectorMode('shapes');
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: vectorMode === 'shapes' ? 600 : 500,
                cursor: 'pointer',
                border: 'none',
                background: vectorMode === 'shapes'
                  ? (isDark ? '#6366f1' : '#4f46e5')
                  : 'transparent',
                color: vectorMode === 'shapes' ? '#ffffff' : (isDark ? '#a1a1aa' : '#64748b'),
                transition: 'all 0.15s ease',
              }}
            >
              📐 Flowchart & Diagram Blocks
            </button>
          </div>

          {/* Action buttons on top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => loadSampleNapkin(activePreset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  color: isDark ? '#ffffff' : '#18181b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={13} />
                <span>Load Demo Sketch</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPresetDropdownOpen((p) => !p);
                  }}
                  style={{ display: 'inline-flex', paddingLeft: '4px' }}
                >
                  <ChevronDown size={12} />
                </span>
              </button>

              {isPresetDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '240px',
                    backgroundColor: isDark ? '#1e1e24' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                    zIndex: 20,
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {Object.values(DEMO_PRESETS).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => loadSampleNapkin(preset.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: activePreset === preset.id
                          ? (isDark ? 'rgba(255,255,255,0.12)' : '#f1f5f9')
                          : 'transparent',
                        color: isDark ? '#ffffff' : '#18181b',
                        fontSize: '12px',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span>{preset.name}</span>
                      <span style={{ fontSize: '10px', color: isDark ? '#a1a1aa' : '#64748b', fontWeight: 400 }}>
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                color: isDark ? '#ffffff' : '#18181b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Upload size={13} />
              <span>Upload Photo of Sketch</span>
            </button>
          </div>
        </div>

        {/* ── Main Workspace: Input Mode or Split Vectorizer View ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {!imageSrc && !isUsingCamera ? (
            /* Upload / Camera Landing Screen */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer?.files?.[0];
                if (file && file.type?.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    isDemoModeRef.current = false;
                    setVectorMode('strokes');
                    setImageSrc(event.target.result);
                    stopCamera();
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px',
                gap: '20px',
                border: isDark ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px dashed #cbd5e1',
                borderRadius: '12px',
                backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.01)',
              }}
            >
              <div style={{ textAlign: 'center', maxWidth: '460px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
                  Screenshot / Photo ➔ Editable Vector Doodle
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#64748b', lineHeight: 1.5 }}>
                  Instantly extract continuous vector paths and shapes with 100% offline client-side computer vision (Sobel edge gradients, adaptive thresholding, and contour tracing).
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <Upload size={16} />
                  <span>Upload Screenshot or Photo</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    color: isDark ? '#ffffff' : '#18181b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={16} />
                  <span>Take Live Photo</span>
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: isDark ? '#71717a' : '#94a3b8',
                  background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
                }}
              >
                <span>💡 Tip: Press <strong style={{ color: isDark ? '#e4e4e7' : '#334155' }}>Ctrl+V</strong> anywhere to paste a copied screenshot, or drag & drop directly here</span>
              </div>
            </div>
          ) : isUsingCamera ? (
            /* Webcam View */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                backgroundColor: '#000000',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={captureFrame}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    borderRadius: '24px',
                    border: 'none',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  }}
                >
                  <Camera size={16} />
                  <span>Capture Sketch</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Split Vectorizer View: Left = Source, Right = Live Native Vector Preview */
            <div
              style={{
                flex: 1,
                display: 'flex',
                gap: '14px',
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              {/* Left Column: Original Paper Sketch with CV Framing */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#e4e4e7' : '#18181b' }}>
                    Original Paper Sketch ({detectedShapes.length} {vectorMode === 'strokes' ? 'vector strokes' : 'shapes'} identified)
                  </div>
                  <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                    High-Res Source
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0a0a0c',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Scanned Napkin"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />

                  {/* Corner Precision Framing Marks */}
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    <path
                      d="M 12 24 L 12 12 L 24 12 M calc(100% - 24px) 12 L calc(100% - 12px) 12 L calc(100% - 12px) 24 M 12 calc(100% - 24px) L 12 calc(100% - 12px) L 24 calc(100% - 12px) M calc(100% - 24px) calc(100% - 12px) L calc(100% - 12px) calc(100% - 12px) L calc(100% - 12px) calc(100% - 24px)"
                      stroke="#6366f1"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>

              {/* Right Column: Native Doodle Vector Shapes Preview */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#e4e4e7' : '#18181b' }}>
                    Native Doodle Vector Shapes
                  </div>
                  <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                    Ready for whiteboard insertion
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: isDark ? '#111114' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isProcessing ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        color: isDark ? '#a1a1aa' : '#64748b',
                        fontSize: '12px',
                      }}
                    >
                      <RefreshCw className="spin" size={24} style={{ color: '#6366f1' }} />
                      <span>Vectorizing contours with Sobel gradient...</span>
                    </div>
                  ) : (
                    <svg
                      style={{ width: '100%', height: '100%' }}
                      viewBox={`${previewBounds.minX} ${previewBounds.minY} ${previewBounds.width} ${previewBounds.height}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <pattern id="grid-dots-preview" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1" fill={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} />
                        </pattern>
                      </defs>

                      <rect
                        x={previewBounds.minX}
                        y={previewBounds.minY}
                        width={previewBounds.width}
                        height={previewBounds.height}
                        fill="url(#grid-dots-preview)"
                      />

                      {/* Render Recognized Vectors */}
                      {detectedShapes.map((shape, idx) => {
                        // 1. Freedraw vector strokes
                        if (shape.points && shape.points.length > 0) {
                          const d = `M ${shape.x + shape.points[0][0]} ${shape.y + shape.points[0][1]} ` +
                            shape.points.slice(1).map(([px, py]) => `L ${shape.x + px} ${shape.y + py}`).join(' ');

                          return (
                            <path
                              key={shape.id || `stroke_${idx}`}
                              d={d}
                              stroke={shape.strokeColor || strokeColor || (isDark ? '#ffffff' : '#18181b')}
                              strokeWidth={shape.strokeWidth || strokeWidth || 2}
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity="0.95"
                            />
                          );
                        }

                        // 2. Rectangle / Cylinder container
                        if (shape.type === 'rectangle' || shape.type === 'cylinder') {
                          return (
                            <g key={shape.id || `rect_${idx}`}>
                              <rect
                                x={shape.x}
                                y={shape.y}
                                width={shape.width}
                                height={shape.height}
                                stroke={strokeColor || (isDark ? '#ffffff' : '#18181b')}
                                strokeWidth="2.2"
                                fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                                rx="8"
                              />
                              {shape.text && (
                                <text
                                  x={shape.x + shape.width / 2}
                                  y={shape.y + shape.height / 2 + 5}
                                  fill={isDark ? '#ffffff' : '#0f172a'}
                                  fontSize="14"
                                  fontWeight="600"
                                  textAnchor="middle"
                                  fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                >
                                  {shape.text}
                                </text>
                              )}
                            </g>
                          );
                        }

                        // 3. Ellipse container
                        if (shape.type === 'ellipse') {
                          const cx = shape.x + shape.width / 2;
                          const cy = shape.y + shape.height / 2;
                          const rx = shape.width / 2;
                          const ry = shape.height / 2;

                          return (
                            <g key={shape.id || `ell_${idx}`}>
                              <ellipse
                                cx={cx}
                                cy={cy}
                                rx={rx}
                                ry={ry}
                                stroke={strokeColor || (isDark ? '#ffffff' : '#18181b')}
                                strokeWidth="2.2"
                                fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                              />
                              {shape.text && (
                                <text
                                  x={cx}
                                  y={cy + 5}
                                  fill={isDark ? '#ffffff' : '#0f172a'}
                                  fontSize="14"
                                  fontWeight="600"
                                  textAnchor="middle"
                                  fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                >
                                  {shape.text}
                                </text>
                              )}
                            </g>
                          );
                        }

                        // 4. Arrow or Line connector
                        if (shape.type === 'arrow' || shape.type === 'line') {
                          const x1 = shape.x;
                          const y1 = shape.y;
                          const x2 = shape.x + (shape.points ? shape.points[1][0] : shape.width);
                          const y2 = shape.y + (shape.points ? shape.points[1][1] : shape.height);

                          return (
                            <g key={shape.id || `arr_${idx}`}>
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={strokeColor || (isDark ? '#ffffff' : '#18181b')}
                                strokeWidth="2.2"
                              />
                              {shape.text && (
                                <text
                                  x={(x1 + x2) / 2}
                                  y={(y1 + y2) / 2 - 8}
                                  fill={isDark ? '#a1a1aa' : '#52525b'}
                                  fontSize="12"
                                  textAnchor="middle"
                                  fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                >
                                  {shape.text}
                                </text>
                              )}
                            </g>
                          );
                        }

                        return null;
                      })}
                    </svg>
                  )}
                </div>

                {/* Optional Shape inspector when in diagram mode */}
                {vectorMode === 'shapes' && detectedShapes.length > 0 && !detectedShapes[0]?.points && (
                  <div
                    className="napkin-scanner-scroll"
                    style={{
                      maxHeight: '110px',
                      overflowY: 'auto',
                      borderRadius: '8px',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {detectedShapes.map((shape) => (
                      <div
                        key={`inspector_${shape.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        <input
                          type="text"
                          value={shape.text || ''}
                          placeholder="Shape label..."
                          onChange={(e) => updateShapeText(shape.id, e.target.value)}
                          style={{
                            flex: 1,
                            background: isDark ? '#1e1e24' : '#ffffff',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                            borderRadius: '4px',
                            color: isDark ? '#f4f4f5' : '#18181b',
                            fontSize: '11px',
                            padding: '3px 6px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => deleteShape(shape.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Action Bar & Precision Sliders ── */}
        {imageSrc && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* Presets and Sliders */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* Sensitivity Preset Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#a1a1aa' : '#64748b', marginRight: '2px' }}>
                  Detail:
                </span>
                {[
                  { id: 'intricate', label: 'Intricate Art' },
                  { id: 'balanced', label: 'Balanced Sketch' },
                  { id: 'clean', label: 'Clean Outlines' },
                ].map((p) => {
                  const isActive = activeDetailPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        border: isActive
                          ? '1px solid #6366f1'
                          : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1'),
                        background: isActive
                          ? 'rgba(99, 102, 241, 0.18)'
                          : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
                        color: isActive ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? '#e4e4e7' : '#334155'),
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Edge Sensitivity Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                  Sensitivity:
                </span>
                <input
                  type="range"
                  min={12}
                  max={60}
                  value={edgeSensitivity}
                  onChange={(e) => {
                    isDemoModeRef.current = false;
                    setActiveDetailPreset(null);
                    setEdgeSensitivity(Number(e.target.value));
                  }}
                  style={{ width: '85px', accentColor: '#6366f1' }}
                />
                <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '18px' }}>{edgeSensitivity}</span>
              </div>

              {/* Stroke Weight Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                  Width:
                </span>
                {[
                  { w: 1.5, label: 'Fine' },
                  { w: 2, label: 'Med' },
                  { w: 3, label: 'Bold' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setStrokeWidth(item.w)}
                    style={{
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: strokeWidth === item.w ? 600 : 500,
                      cursor: 'pointer',
                      border: strokeWidth === item.w
                        ? '1px solid #6366f1'
                        : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1'),
                      background: strokeWidth === item.w
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'transparent',
                      color: strokeWidth === item.w ? (isDark ? '#a5b4fc' : '#4f46e5') : 'inherit',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Stroke Color Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {[
                  { c: isDark ? '#ffffff' : '#18181b', title: 'Default' },
                  { c: '#6366f1', title: 'Indigo' },
                  { c: '#0284c7', title: 'Sky Blue' },
                  { c: '#10b981', title: 'Emerald' },
                  { c: '#ef4444', title: 'Crimson' },
                ].map((item) => (
                  <button
                    key={item.c}
                    type="button"
                    title={item.title}
                    onClick={() => setStrokeColor(item.c)}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: item.c,
                      border: strokeColor === item.c
                        ? '2px solid #6366f1'
                        : (isDark ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(0,0,0,0.2)'),
                      cursor: 'pointer',
                      boxShadow: strokeColor === item.c ? '0 0 0 2px rgba(99,102,241,0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Actions: Scan Another & Insert to Canvas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  isDemoModeRef.current = false;
                  setDetectedShapes([]);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  color: isDark ? '#e4e4e7' : '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Scan Another
              </button>

              <button
                type="button"
                onClick={handleInsertToCanvas}
                disabled={detectedShapes.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: detectedShapes.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: detectedShapes.length === 0 ? 0.5 : 1,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                }}
              >
                <Check size={14} />
                <span>Insert to Canvas as Vectors ({detectedShapes.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NapkinToVectorScannerModal;
