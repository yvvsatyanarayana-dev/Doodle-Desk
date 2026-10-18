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
  Edit3,
  Plus,
  ChevronDown,
  Database,
  Square,
  Circle,
  Diamond,
} from 'lucide-react';
import { defaultElementProps, generateId, ELEMENT_TYPES } from '../engine/elements.js';

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
      // Paper background with warm napkin tone
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, width, height);

      // Subtle paper grid texture
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

      // 1. Box 1: Client App
      ctx.strokeRect(60, 60, 160, 90);
      ctx.font = 'bold 20px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('Client App', 90, 112);

      // 2. Arrow to API Gateway
      ctx.beginPath();
      ctx.moveTo(225, 105);
      ctx.lineTo(380, 105);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(366, 96);
      ctx.lineTo(382, 105);
      ctx.lineTo(366, 114);
      ctx.stroke();

      ctx.font = '13px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#52525b';
      ctx.fillText('HTTPS', 285, 90); // Positioned above line

      // 3. Box 2: API Gateway
      ctx.strokeRect(390, 60, 180, 90);
      ctx.font = 'bold 20px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('API Gateway', 420, 112);

      // 4. Downward Arrow to DB
      ctx.beginPath();
      ctx.moveTo(480, 155);
      ctx.lineTo(480, 255);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(472, 242);
      ctx.lineTo(480, 255);
      ctx.lineTo(488, 242);
      ctx.stroke();

      ctx.font = '13px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#52525b';
      ctx.fillText('SQL Query', 496, 205); // Positioned beside line

      // 5. Database Cylinder
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

      // Login Box
      ctx.strokeRect(40, 140, 140, 80);
      ctx.font = 'bold 18px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('User Login', 65, 185);

      // Arrow to Diamond
      ctx.beginPath();
      ctx.moveTo(185, 180);
      ctx.lineTo(275, 180);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(263, 172);
      ctx.lineTo(275, 180);
      ctx.lineTo(263, 188);
      ctx.stroke();

      // Decision Diamond
      ctx.beginPath();
      ctx.moveTo(340, 125);
      ctx.lineTo(400, 180);
      ctx.lineTo(340, 235);
      ctx.lineTo(280, 180);
      ctx.closePath();
      ctx.stroke();
      ctx.font = 'bold 16px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillText('Valid Auth?', 298, 185);

      // Branch Yes (Up)
      ctx.beginPath();
      ctx.moveTo(400, 160);
      ctx.lineTo(495, 100);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(482, 101);
      ctx.lineTo(495, 100);
      ctx.lineTo(490, 114);
      ctx.stroke();
      ctx.font = '13px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#16a34a';
      ctx.fillText('Yes', 435, 120);

      // Dashboard Box
      ctx.strokeRect(500, 60, 140, 75);
      ctx.font = 'bold 18px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('Dashboard', 525, 105);

      // Branch No (Down)
      ctx.beginPath();
      ctx.moveTo(400, 200);
      ctx.lineTo(495, 260);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(490, 246);
      ctx.lineTo(495, 260);
      ctx.lineTo(482, 259);
      ctx.stroke();
      ctx.font = '13px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.fillText('No', 438, 245);

      // 2FA Box
      ctx.strokeRect(500, 220, 140, 75);
      ctx.font = 'bold 18px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.fillStyle = '#18181b';
      ctx.fillText('2FA Challenge', 512, 265);
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
  const [threshold, setThreshold] = useState(130);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedShapes, setDetectedShapes] = useState([]);
  const [hoveredShapeId, setHoveredShapeId] = useState(null);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [activePreset, setActivePreset] = useState('architecture');
  const [isPresetDropdownOpen, setIsPresetDropdownOpen] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDemoModeRef = useRef(false);

  // Stop camera stream cleanly
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

  // Start webcam feed
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
      setImageSrc(event.target.result);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Load sample napkin flowchart
  const loadSampleNapkin = (presetKey = 'architecture') => {
    const preset = DEMO_PRESETS[presetKey] || DEMO_PRESETS.architecture;
    setActivePreset(preset.id);
    setIsPresetDropdownOpen(false);
    isDemoModeRef.current = true;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;

    if (!ctx) {
      // In headless test environments without canvas 2D support
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

  // Computer Vision Adaptive Vectorization Engine (Fine-Grained Connected Components)
  const runVectorization = useCallback(() => {
    if (!imageSrc || isDemoModeRef.current) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
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
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Grayscale & Contrast Thresholding
      const binary = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        binary[i / 4] = gray < threshold ? 1 : 0; // 1 = dark ink stroke, 0 = background
      }

      // 2. High-Resolution Connected Component Labeling (Fine 4px step)
      const step = 4;
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const grid = new Uint8Array(cols * rows);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let count = 0;
          for (let dy = 0; dy < step; dy++) {
            for (let dx = 0; dx < step; dx++) {
              const py = r * step + dy;
              const px = c * step + dx;
              if (binary[py * w + px] === 1) count++;
            }
          }
          grid[r * cols + c] = count >= 3 ? 1 : 0;
        }
      }

      const visited = new Uint8Array(cols * rows);
      const blobs = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r * cols + c] === 1 && !visited[r * cols + c]) {
            let minC = c;
            let maxC = c;
            let minR = r;
            let maxR = r;
            let totalCells = 0;
            const queue = [[c, r]];
            visited[r * cols + c] = 1;

            while (queue.length > 0) {
              const [currC, currR] = queue.pop();
              totalCells++;
              minC = Math.min(minC, currC);
              maxC = Math.max(maxC, currC);
              minR = Math.min(minR, currR);
              maxR = Math.max(maxR, currR);

              const neighbors = [
                [currC + 1, currR],
                [currC - 1, currR],
                [currC, currR + 1],
                [currC, currR - 1],
              ];

              for (const [nc, nr] of neighbors) {
                if (
                  nc >= 0 &&
                  nc < cols &&
                  nr >= 0 &&
                  nr < rows &&
                  grid[nr * cols + nc] === 1 &&
                  !visited[nr * cols + nc]
                ) {
                  visited[nr * cols + nc] = 1;
                  queue.push([nc, nr]);
                }
              }
            }

            const blobW = (maxC - minC + 1) * step;
            const blobH = (maxR - minR + 1) * step;
            const blobX = minC * step;
            const blobY = minR * step;

            // Reject microscopic noise specks
            if (blobW > 18 && blobH > 14 && totalCells > 5) {
              blobs.push({
                x: blobX,
                y: blobY,
                width: blobW,
                height: blobH,
                cells: totalCells,
              });
            }
          }
        }
      }

      // Sort blobs top-to-bottom, left-to-right
      blobs.sort((a, b) => (Math.abs(a.y - b.y) > 30 ? a.y - b.y : a.x - b.x));

      // 3. Classify detected blobs into proper Doodle vector shapes
      let containerIdx = 1;
      const recognized = blobs.map((blob, idx) => {
        const aspect = blob.width / Math.max(1, blob.height);

        // High aspect ratio -> Horizontal arrow or line
        if (aspect > 2.8 && blob.height < 45) {
          return {
            id: `scan_shape_${idx}`,
            type: 'arrow',
            x: blob.x,
            y: blob.y + Math.round(blob.height / 2),
            width: blob.width,
            height: 0,
            points: [[0, 0], [blob.width, 0]],
            text: '',
          };
        }

        // Low aspect ratio -> Vertical arrow or line
        if (aspect < 0.35 && blob.width < 45) {
          return {
            id: `scan_shape_${idx}`,
            type: 'arrow',
            x: blob.x + Math.round(blob.width / 2),
            y: blob.y,
            width: 0,
            height: blob.height,
            points: [[0, 0], [0, blob.height]],
            text: '',
          };
        }

        // Circular or rounded blob -> Ellipse / Database Node
        if (Math.abs(aspect - 1) < 0.35 && blob.width > 45 && blob.height > 45) {
          return {
            id: `scan_shape_${idx}`,
            type: 'ellipse',
            x: blob.x,
            y: blob.y,
            width: blob.width,
            height: blob.height,
            text: `Data Node ${containerIdx++}`,
          };
        }

        // Default: Rectangular Container Card
        return {
          id: `scan_shape_${idx}`,
          type: 'rectangle',
          x: blob.x,
          y: blob.y,
          width: blob.width,
          height: blob.height,
          text: `Module ${containerIdx++}`,
        };
      });

      setDetectedShapes(recognized);
      setIsProcessing(false);
    };
    img.src = imageSrc;
  }, [imageSrc, threshold]);

  useEffect(() => {
    if (imageSrc && !isDemoModeRef.current) {
      runVectorization();
    }
  }, [imageSrc, threshold, runVectorization]);

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

    // Center offset of recognized shapes
    const avgX = detectedShapes.reduce((sum, s) => sum + s.x, 0) / detectedShapes.length;
    const avgY = detectedShapes.reduce((sum, s) => sum + s.y, 0) / detectedShapes.length;

    const newElements = [];
    const strokeColor = isDark ? '#ffffff' : '#1e1e1e';

    detectedShapes.forEach((s) => {
      const targetX = Math.round(centerX + (s.x - avgX));
      const targetY = Math.round(centerY + (s.y - avgY));
      const isConnector = s.type === 'arrow' || s.type === 'line';
      const isDb = s.type === 'cylinder' || (s.type === 'ellipse' && s.text?.toLowerCase().includes('db'));

      if (isDb) {
        // ── Native First-Class Database Cylinder ──
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
          strokeColor,
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
          fontFamily: 5, // Doodlefont
          textAlign: 'center',
          verticalAlign: 'middle',
          strokeColor,
          containerId: cylId,
          lineHeight: 1.25,
        };

        newElements.push(cylinderEl, textElement);
      } else if (isConnector) {
        // ── Arrow or Line Connector ──
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
          strokeColor,
          strokeWidth: 2,
          roughness: 1,
          endArrowhead: s.type === 'arrow' ? 'arrow' : null,
        };
        newElements.push(arrowElement);

        // Edge text label (unwrapped, generous width, non-colliding placement)
        if (s.text) {
          const labelWidth = Math.max(160, Math.round(s.text.length * 18));
          let labelX, labelY;
          if (Math.abs(dx) < 15) {
            // Vertical arrow: place text cleanly to the right with comfortable breathing room
            labelX = targetX + 22;
            labelY = targetY + dy * 0.5 - 12;
          } else {
            // Horizontal arrow: center text above arrow shaft with plenty of clearance
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
            fontFamily: 5, // Doodlefont
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor,
            lineHeight: 1.25,
          };
          newElements.push(arrowLabelEl);
        }
      } else {
        // ── Container: Rectangle, Diamond, Ellipse, Triangle, Star, Hexagon, Cloud, Capsule, Parallelogram ──
        const shapeId = generateId();
        const textId = generateId();
        const w = Math.max(40, Math.abs(s.width || 120));
        const h = Math.max(30, Math.abs(s.height || 70));

        let elType = ELEMENT_TYPES.RECTANGLE;
        if (s.type === 'diamond') elType = ELEMENT_TYPES.DIAMOND;
        else if (s.type === 'ellipse') elType = ELEMENT_TYPES.ELLIPSE;
        else if (s.type === 'triangle') elType = ELEMENT_TYPES.TRIANGLE;
        else if (s.type === 'star') elType = ELEMENT_TYPES.STAR;
        else if (s.type === 'hexagon') elType = ELEMENT_TYPES.HEXAGON;
        else if (s.type === 'cloud') elType = ELEMENT_TYPES.CLOUD;
        else if (s.type === 'capsule') elType = ELEMENT_TYPES.CAPSULE;
        else if (s.type === 'cylinder') elType = ELEMENT_TYPES.CYLINDER;
        else if (s.type === 'parallelogram') elType = ELEMENT_TYPES.PARALLELOGRAM;

        const containerElement = {
          ...defaultElementProps(),
          id: shapeId,
          type: elType,
          x: targetX,
          y: targetY,
          width: w,
          height: h,
          strokeColor,
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
            fontFamily: 5, // Doodlefont
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor,
            containerId: shapeId,
            lineHeight: 1.25,
          };
          newElements.push(textElement);
        }
      }
    });

    const currentElements = doodleAPI.getSceneElements?.() || [];
    doodleAPI.updateScene?.({
      elements: [...currentElements, ...newElements],
      commitToHistory: true,
    });

    onClose();
  };

  // Modify shape label
  const updateShapeText = (id, newText) => {
    setDetectedShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText } : s))
    );
  };

  // Modify shape type
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
      className="modal-overlay napkin-to-vector-scanner-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(8, 8, 12, 0.92)' : 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        className="napkin-to-vector-scanner-modal"
        style={{
          width: '100%',
          maxWidth: '1080px',
          height: 'min(760px, 94vh)',
          backgroundColor: isDark ? '#141418' : '#ffffff',
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '0 32px 84px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          color: isDark ? '#f4f4f5' : '#18181b',
          overflow: 'hidden',
          fontFamily: 'var(--font-family, "Doodlefont", "Virgil", cursive, sans-serif)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header Bar ── */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: isDark ? '#111114' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#18181b',
              }}
            >
              <Camera size={19} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Napkin & Sketch-to-Vector Scanner</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e4e4e7',
                    color: isDark ? '#e4e4e7' : '#27272a',
                  }}
                >
                  Computer Vision
                </span>
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', marginTop: '2px' }}>
                Turn physical paper drawings & whiteboard photos into native editable vectors
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            {/* Demo sketch preset selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => loadSampleNapkin(activePreset)}
                title="Load demo sketch"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
                  background: isDark ? '#27272a' : '#ffffff',
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
                    borderRadius: '10px',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                    zIndex: 10,
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

            <button
              type="button"
              onClick={onClose}
              title="Close Scanner (Esc)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                background: isDark ? '#27272a' : '#f1f5f9',
                color: isDark ? '#e4e4e7' : '#334155',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <X size={14} />
              <kbd className="doodle-help-kbd" style={{ minWidth: 16, height: 18, fontSize: 10, padding: '1px 5px' }}>Esc</kbd>
            </button>
          </div>
        </div>

        {/* ── Main Workspace: Input Mode or Split Vectorizer View ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {!imageSrc && !isUsingCamera ? (
            /* Upload / Camera Landing Screen */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                gap: '28px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <div style={{ textAlign: 'center', maxWidth: '440px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                  Bring physical paper notes to life
                </div>
                <div style={{ fontSize: '13px', color: isDark ? '#a1a1aa' : '#64748b', lineHeight: 1.5 }}>
                  Snap a picture of your whiteboard, handwritten napkin sketch, or flowchart diagram. Our computer vision engine converts it into fully editable Doodle Desk shapes.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '260px',
                    height: '170px',
                    borderRadius: '16px',
                    border: isDark ? '2px dashed rgba(255,255,255,0.22)' : '2px dashed #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: isDark ? '#f4f4f5' : '#18181b',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = isDark ? '#ffffff' : '#18181b')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.22)' : '#cbd5e1')
                  }
                >
                  <Upload size={34} style={{ color: isDark ? '#ffffff' : '#18181b' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Upload Photo of Sketch</span>
                  <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>PNG, JPG, or WebP</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    width: '260px',
                    height: '170px',
                    borderRadius: '16px',
                    border: isDark ? '2px dashed rgba(255,255,255,0.22)' : '2px dashed #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    color: isDark ? '#f4f4f5' : '#18181b',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = isDark ? '#ffffff' : '#18181b')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.22)' : '#cbd5e1')
                  }
                >
                  <Camera size={34} style={{ color: isDark ? '#ffffff' : '#18181b' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>Scan with Webcam</span>
                  <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>Hold paper up to camera</span>
                </button>
              </div>
            </div>
          ) : isUsingCamera ? (
            /* Live Camera Viewport */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                gap: '18px',
              }}
            >
              <video
                ref={videoRef}
                style={{
                  width: '680px',
                  maxHeight: '460px',
                  borderRadius: '14px',
                  border: isDark ? '1px solid rgba(255,255,255,0.25)' : '1px solid #cbd5e1',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              />
              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  type="button"
                  onClick={captureFrame}
                  style={{
                    padding: '10px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isDark ? '#ffffff' : '#18181b',
                    color: isDark ? '#000000' : '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.4)' : '0 4px 14px rgba(0,0,0,0.15)',
                  }}
                >
                  Snap & Vectorize Photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: isDark ? '1px solid #3f3f46' : '1px solid #cbd5e1',
                    backgroundColor: 'transparent',
                    color: isDark ? '#e4e4e7' : '#334155',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Dual-Pane Computer Vision & Vector Studio */
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left Pane: Original Paper Sketch with CV Detection Overlays */}
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#e4e4e7' : '#27272a' }}>
                    Original Paper Sketch ({detectedShapes.length} shapes identified)
                  </div>
                  <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                    Hover shapes to inspect
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: '12px',
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

                  {/* High-tech CV Bounding Box Overlays */}
                  <svg
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                    viewBox="0 0 640 420"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {detectedShapes.map((shape) => {
                      const isHovered = hoveredShapeId === shape.id;
                      const isConn = shape.type === 'arrow' || shape.type === 'line';
                      const boxW = Math.max(30, isConn ? Math.abs(shape.width || 80) : shape.width);
                      const boxH = Math.max(24, isConn ? Math.max(24, Math.abs(shape.height || 24)) : shape.height);
                      const boxX = shape.x;
                      const boxY = isConn ? shape.y - 12 : shape.y;
                      const bracketLen = Math.min(10, Math.min(boxW, boxH) / 3);

                      // Smart non-colliding badge placement
                      let tagX = boxX - 4;
                      let tagY = Math.max(4, boxY - 18);
                      if (isConn && shape.width === 0) {
                        // vertical arrow
                        tagX = boxX + 12;
                        tagY = boxY + boxH / 2 - 8;
                      } else if (isConn && shape.height === 0) {
                        // horizontal arrow
                        tagX = boxX + boxW / 2 - Math.min(80, (shape.text?.length || 5) * 3.5 + 10);
                        tagY = Math.max(4, boxY - 18);
                      }

                      return (
                        <g key={`cv_box_${shape.id}`}>
                          {/* Sleek Precision Corner Brackets */}
                          <path
                            d={`
                              M ${boxX - 4} ${boxY - 4 + bracketLen} L ${boxX - 4} ${boxY - 4} L ${boxX - 4 + bracketLen} ${boxY - 4}
                              M ${boxX + boxW + 4 - bracketLen} ${boxY - 4} L ${boxX + boxW + 4} ${boxY - 4} L ${boxX + boxW + 4} ${boxY - 4 + bracketLen}
                              M ${boxX - 4} ${boxY + boxH + 4 - bracketLen} L ${boxX - 4} ${boxY + boxH + 4} L ${boxX - 4 + bracketLen} ${boxY + boxH + 4}
                              M ${boxX + boxW + 4 - bracketLen} ${boxY + boxH + 4} L ${boxX + boxW + 4} ${boxY + boxH + 4} L ${boxX + boxW + 4} ${boxY + boxH + 4 - bracketLen}
                            `}
                            stroke={isHovered ? '#38bdf8' : 'rgba(255, 255, 255, 0.45)'}
                            strokeWidth={isHovered ? 2 : 1.2}
                            fill="none"
                          />

                          {/* Classification Tag Badge */}
                          <rect
                            x={tagX}
                            y={tagY}
                            width={Math.min(160, (shape.text?.length || 5) * 6.8 + 18)}
                            height="16"
                            fill="rgba(24, 24, 27, 0.88)"
                            stroke={isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}
                            strokeWidth="1"
                            rx="3"
                          />
                          <text
                            x={tagX + 5}
                            y={tagY + 11}
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="600"
                            fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                          >
                            {shape.text ? shape.text.slice(0, 16) : shape.type.toUpperCase()}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Right Pane: Real-Time Native Doodle Vector Preview + Interactive Inspector */}
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#e4e4e7' : '#27272a' }}>
                    Native Doodle Vector Shapes
                  </div>
                  <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                    Ready for whiteboard insertion
                  </span>
                </div>

                {/* SVG Live Vector Preview */}
                <div
                  style={{
                    flex: 1,
                    minHeight: '260px',
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: isDark ? '#111114' : '#f8fafc',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    style={{ width: '100%', height: '100%' }}
                    viewBox="0 0 640 420"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <marker
                        id="doodle-arrowhead-dark"
                        markerWidth="10"
                        markerHeight="8"
                        refX="9"
                        refY="4"
                        orient="auto"
                      >
                        <polygon points="0 1, 10 4, 0 7" fill="#ffffff" />
                      </marker>
                      <marker
                        id="doodle-arrowhead-light"
                        markerWidth="10"
                        markerHeight="8"
                        refX="9"
                        refY="4"
                        orient="auto"
                      >
                        <polygon points="0 1, 10 4, 0 7" fill="#18181b" />
                      </marker>
                      <pattern id="grid-dots-preview" width="24" height="24" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1" fill={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                      </pattern>
                    </defs>

                    <rect width="100%" height="100%" fill="url(#grid-dots-preview)" />

                    {detectedShapes.map((shape) => {
                      const isHovered = hoveredShapeId === shape.id;
                      const strokeColor = isHovered
                        ? (isDark ? '#38bdf8' : '#0284c7')
                        : (isDark ? '#ffffff' : '#18181b');
                      const fillColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

                      return (
                        <g
                          key={shape.id}
                          onMouseEnter={() => setHoveredShapeId(shape.id)}
                          onMouseLeave={() => setHoveredShapeId(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Rectangle Container */}
                          {shape.type === 'rectangle' && (
                            <>
                              <rect
                                x={shape.x}
                                y={shape.y}
                                width={shape.width}
                                height={shape.height}
                                stroke={strokeColor}
                                strokeWidth="2.2"
                                fill={fillColor}
                                rx="8"
                              />
                              {/* Sketchy double contour effect */}
                              <rect
                                x={shape.x + 1}
                                y={shape.y + 1}
                                width={shape.width - 2}
                                height={shape.height - 2}
                                stroke={strokeColor}
                                strokeWidth="0.8"
                                strokeDasharray="6, 3"
                                fill="none"
                                rx="7"
                                opacity="0.4"
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
                            </>
                          )}

                          {/* Diamond Decision */}
                          {shape.type === 'diamond' && (
                            <>
                              <polygon
                                points={`
                                  ${shape.x + shape.width / 2},${shape.y}
                                  ${shape.x + shape.width},${shape.y + shape.height / 2}
                                  ${shape.x + shape.width / 2},${shape.y + shape.height}
                                  ${shape.x},${shape.y + shape.height / 2}
                                `}
                                stroke={strokeColor}
                                strokeWidth="2.2"
                                fill={fillColor}
                              />
                              {shape.text && (
                                <text
                                  x={shape.x + shape.width / 2}
                                  y={shape.y + shape.height / 2 + 5}
                                  fill={isDark ? '#ffffff' : '#0f172a'}
                                  fontSize="13"
                                  fontWeight="600"
                                  textAnchor="middle"
                                  fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                >
                                  {shape.text}
                                </text>
                              )}
                            </>
                          )}

                          {/* Ellipse / Database Node */}
                          {shape.type === 'ellipse' && (
                            <g>
                              {shape.text?.toLowerCase().includes('db') ? (
                                <>
                                  {/* Database cylinder body with curved base */}
                                  <path
                                    d={`
                                      M ${shape.x} ${shape.y + 16}
                                      L ${shape.x} ${shape.y + shape.height - 16}
                                      A ${shape.width / 2} 16 0 0 0 ${shape.x + shape.width} ${shape.y + shape.height - 16}
                                      L ${shape.x + shape.width} ${shape.y + 16}
                                      Z
                                    `}
                                    stroke={strokeColor}
                                    strokeWidth="2.2"
                                    fill={fillColor}
                                  />
                                  {/* Top lid ellipse */}
                                  <ellipse
                                    cx={shape.x + shape.width / 2}
                                    cy={shape.y + 16}
                                    rx={shape.width / 2}
                                    ry={16}
                                    stroke={strokeColor}
                                    strokeWidth="2.2"
                                    fill={fillColor}
                                  />
                                  {/* Unobstructed text centered in cylinder */}
                                  {shape.text && (
                                    <text
                                      x={shape.x + shape.width / 2}
                                      y={shape.y + shape.height / 2 + 6}
                                      fill={isDark ? '#ffffff' : '#0f172a'}
                                      fontSize="14"
                                      fontWeight="600"
                                      textAnchor="middle"
                                      fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                    >
                                      {shape.text}
                                    </text>
                                  )}
                                </>
                              ) : (
                                <>
                                  <ellipse
                                    cx={shape.x + shape.width / 2}
                                    cy={shape.y + shape.height / 2}
                                    rx={shape.width / 2}
                                    ry={shape.height / 2}
                                    stroke={strokeColor}
                                    strokeWidth="2.2"
                                    fill={fillColor}
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
                                </>
                              )}
                            </g>
                          )}

                          {/* Arrow connector with non-colliding backdrop pill */}
                          {shape.type === 'arrow' && (
                            <g>
                              <line
                                x1={shape.x}
                                y1={shape.y}
                                x2={shape.x + (shape.points ? shape.points[1][0] : shape.width)}
                                y2={shape.y + (shape.points ? shape.points[1][1] : shape.height)}
                                stroke={strokeColor}
                                strokeWidth="2.5"
                                markerEnd={`url(#doodle-arrowhead-${isDark ? 'dark' : 'light'})`}
                              />
                              {shape.text && (
                                <g>
                                  {shape.width !== 0 && shape.height === 0 ? (
                                    // Horizontal Arrow: Label placed cleanly above line with pill
                                    <>
                                      <rect
                                        x={shape.x + shape.width / 2 - (shape.text.length * 4.2 + 8)}
                                        y={shape.y - 20}
                                        width={shape.text.length * 8.4 + 16}
                                        height="16"
                                        fill={isDark ? '#111114' : '#f8fafc'}
                                        stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                                        strokeWidth="1"
                                        rx="4"
                                      />
                                      <text
                                        x={shape.x + shape.width / 2}
                                        y={shape.y - 8}
                                        fill={isDark ? '#ffffff' : '#0f172a'}
                                        fontSize="12"
                                        fontWeight="600"
                                        textAnchor="middle"
                                        fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                      >
                                        {shape.text}
                                      </text>
                                    </>
                                  ) : (
                                    // Vertical Arrow: Label placed cleanly beside line with pill
                                    <>
                                      <rect
                                        x={shape.x + 12}
                                        y={shape.y + shape.height / 2 - 8}
                                        width={shape.text.length * 8.2 + 14}
                                        height="16"
                                        fill={isDark ? '#111114' : '#f8fafc'}
                                        stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                                        strokeWidth="1"
                                        rx="4"
                                      />
                                      <text
                                        x={shape.x + 19 + (shape.text.length * 4.1)}
                                        y={shape.y + shape.height / 2 + 4}
                                        fill={isDark ? '#ffffff' : '#0f172a'}
                                        fontSize="12"
                                        fontWeight="600"
                                        textAnchor="middle"
                                        fontFamily='"Doodlefont", "Virgil", cursive, sans-serif'
                                      >
                                        {shape.text}
                                      </text>
                                    </>
                                  )}
                                </g>
                              )}
                            </g>
                          )}

                          {/* Plain line connector */}
                          {shape.type === 'line' && (
                            <line
                              x1={shape.x}
                              y1={shape.y}
                              x2={shape.x + (shape.points ? shape.points[1][0] : shape.width)}
                              y2={shape.y + (shape.points ? shape.points[1][1] : shape.height)}
                              stroke={strokeColor}
                              strokeWidth="2.2"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Interactive Shape Inspector & Editor Strip with Theme-Aligned Scrollbar */}
                <div
                  className="napkin-scanner-scroll"
                  style={{
                    maxHeight: '185px',
                    overflowY: 'auto',
                    borderRadius: '10px',
                    backgroundColor: isDark ? '#141418' : '#f1f5f9',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: isDark ? 'rgba(255, 255, 255, 0.25) transparent' : 'rgba(0, 0, 0, 0.28) transparent',
                  }}
                >
                  {detectedShapes.map((shape) => {
                    const isHovered = hoveredShapeId === shape.id;

                    return (
                      <div
                        key={`inspector_${shape.id}`}
                        onMouseEnter={() => setHoveredShapeId(shape.id)}
                        onMouseLeave={() => setHoveredShapeId(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: isHovered
                            ? (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')
                            : 'transparent',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        {/* Shape icon */}
                        <div style={{ color: isDark ? '#a1a1aa' : '#64748b', display: 'flex', alignItems: 'center' }}>
                          {shape.type === 'rectangle' && <Square size={13} />}
                          {shape.type === 'diamond' && <Diamond size={13} />}
                          {shape.type === 'ellipse' && <Circle size={13} />}
                          {shape.type === 'arrow' && <ArrowRight size={13} />}
                          {shape.type === 'line' && <span style={{ width: 12, height: 2, background: 'currentColor' }} />}
                        </div>

                        {/* Editable label */}
                        <input
                          type="text"
                          value={shape.text || ''}
                          placeholder={shape.type === 'arrow' ? 'Optional arrow label...' : 'Shape label...'}
                          onChange={(e) => updateShapeText(shape.id, e.target.value)}
                          style={{
                            flex: 1,
                            background: isDark ? '#1e1e24' : '#ffffff',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                            borderRadius: '4px',
                            color: isDark ? '#f4f4f5' : '#18181b',
                            fontSize: '11px',
                            padding: '4px 8px',
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />

                        {/* Type switcher */}
                        <select
                          value={shape.type}
                          onChange={(e) => updateShapeType(shape.id, e.target.value)}
                          style={{
                            background: isDark ? '#1e1e24' : '#ffffff',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                            borderRadius: '4px',
                            color: isDark ? '#a1a1aa' : '#475569',
                            fontSize: '10px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        >
                          <option value="rectangle">Box</option>
                          <option value="ellipse">Ellipse / DB</option>
                          <option value="diamond">Diamond</option>
                          <option value="arrow">Arrow</option>
                          <option value="line">Line</option>
                        </select>

                        {/* Delete shape button */}
                        <button
                          type="button"
                          onClick={() => deleteShape(shape.id)}
                          title="Remove detected noise"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: isDark ? '#71717a' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = isDark ? '#71717a' : '#94a3b8')
                          }
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Action Bar & Sensitivity Controls ── */}
        {imageSrc && (
          <div
            style={{
              padding: '14px 22px',
              backgroundColor: isDark ? '#111114' : '#f8fafc',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            {/* Paper Contrast Cleanup Threshold */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b' }}>
                Paper Contrast Cleanup:
              </span>
              <input
                type="range"
                min={80}
                max={200}
                value={threshold}
                onChange={(e) => {
                  isDemoModeRef.current = false;
                  setThreshold(Number(e.target.value));
                }}
                style={{ width: '130px', accentColor: isDark ? '#ffffff' : '#18181b' }}
              />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{threshold}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  isDemoModeRef.current = false;
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  background: isDark ? '#27272a' : '#ffffff',
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
                  padding: '8px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isDark ? '#ffffff' : '#18181b',
                  color: isDark ? '#000000' : '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: detectedShapes.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.4)' : '0 4px 14px rgba(0, 0, 0, 0.15)',
                }}
              >
                <Check size={15} />
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
