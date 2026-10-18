import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Download,
  X,
  Sparkles,
  PenTool,
  Pencil,
  Highlighter,
  Ghost,
  Volume2,
  VolumeX,
  Video,
  Hand,
  Clock,
} from 'lucide-react';
import { renderElementToCanvas } from '../engine/renderer/render.js';
import { STROKE_WIDTHS, ELEMENT_TYPES } from '../engine/elements.js';

// ── Web Audio API Whiteboard Marker Sound Synthesizer ───────────────────────
class MarkerSoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.gainNode = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Synthesize pink/white friction noise buffer (simulating marker tip on porcelain board)
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.12;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = buffer;
      this.noiseNode.loop = true;

      // Resonant bandpass filter creating the classic marker squeak
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.setValueAtTime(2600, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(2.8, this.ctx.currentTime);

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);

      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.noiseNode.start(0);
    } catch {
      // AudioContext unavailable or blocked in environment
    }
  }

  setDrawing(isDrawing, speed = 1) {
    if (!this.ctx || !this.gainNode || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const targetGain = isDrawing ? Math.min(0.18, 0.09 * speed) : 0;
      this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);

      // Micro-fluctuate pitch with velocity for organic friction
      if (isDrawing && this.filterNode) {
        const freq = 2400 + Math.random() * 600;
        this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      }
    } catch {}
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  destroy() {
    try {
      if (this.noiseNode) this.noiseNode.stop();
      if (this.ctx) this.ctx.close();
    } catch {}
  }
}

// ── Geometry & Trajectory Helpers ──────────────────────────────────────────
function getElementKeyframes(el) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.width || 100;
  const h = el.height || 60;
  const type = el.type || 'rectangle';

  if (type === ELEMENT_TYPES.FREEDRAW && Array.isArray(el.points) && el.points.length > 0) {
    return el.points.map((p) => ({ x: x + p[0], y: y + p[1] }));
  }

  if (type === ELEMENT_TYPES.ELLIPSE) {
    const rx = Math.abs(w) / 2;
    const ry = Math.abs(h) / 2;
    const cx = x + rx;
    const cy = y + ry;
    const pts = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const angle = -Math.PI / 2 + (i / segments) * (Math.PI * 2);
      pts.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
    }
    return pts;
  }

  if (type === ELEMENT_TYPES.DIAMOND) {
    const hw = w / 2;
    const hh = h / 2;
    return [
      { x: x + hw, y: y },
      { x: x + w, y: y + hh },
      { x: x + hw, y: y + h },
      { x: x, y: y + hh },
      { x: x + hw, y: y },
    ];
  }

  if (type === ELEMENT_TYPES.TRIANGLE) {
    return [
      { x: x + w / 2, y: y },
      { x: x + w, y: y + h },
      { x: x, y: y + h },
      { x: x + w / 2, y: y },
    ];
  }

  if (
    type === ELEMENT_TYPES.STAR ||
    type === ELEMENT_TYPES.HEXAGON ||
    type === ELEMENT_TYPES.OCTAGON ||
    type === ELEMENT_TYPES.PARALLELOGRAM ||
    type === ELEMENT_TYPES.CYLINDER ||
    type === ELEMENT_TYPES.CLOUD ||
    type === ELEMENT_TYPES.CAPSULE
  ) {
    const hw = w / 2;
    const hh = h / 2;
    return [
      { x: x + hw, y: y },
      { x: x + w, y: y + hh },
      { x: x + hw, y: y + h },
      { x: x, y: y + hh },
      { x: x + hw, y: y },
    ];
  }

  if (type === ELEMENT_TYPES.LINE || type === ELEMENT_TYPES.ARROW) {
    if (Array.isArray(el.points) && el.points.length > 0) {
      return el.points.map((p) => ({ x: x + p[0], y: y + p[1] }));
    }
    return [{ x, y }, { x: x + w, y: y + h }];
  }

  if (type === ELEMENT_TYPES.TEXT) {
    const pts = [];
    const textLen = Math.max(1, (el.text || '').length);
    const charW = Math.max(8, (w || 100) / textLen);
    for (let i = 0; i <= textLen; i++) {
      pts.push({ x: x + i * charW, y: y + (h || 24) * 0.65 });
    }
    return pts;
  }

  // Default Rectangle / Frame perimeter
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
}

function calculatePathMetrics(pts) {
  if (pts.length < 2) {
    return { totalLength: 1, segments: [{ p1: pts[0] || { x: 0, y: 0 }, p2: pts[0] || { x: 0, y: 0 }, len: 1, cumStart: 0 }] };
  }
  let totalLength = 0;
  const segments = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 0.001;
    segments.push({ p1, p2, len, cumStart: totalLength });
    totalLength += len;
  }
  return { totalLength: Math.max(1, totalLength), segments };
}

function getPointAtProgress(metrics, progress) {
  const targetDist = Math.max(0, Math.min(1, progress)) * metrics.totalLength;
  const segs = metrics.segments;
  let activeSeg = segs[segs.length - 1];

  for (let i = 0; i < segs.length; i++) {
    if (targetDist <= segs[i].cumStart + segs[i].len) {
      activeSeg = segs[i];
      break;
    }
  }

  const segProgress = Math.max(0, Math.min(1, (targetDist - activeSeg.cumStart) / activeSeg.len));
  const x = activeSeg.p1.x + (activeSeg.p2.x - activeSeg.p1.x) * segProgress;
  const y = activeSeg.p1.y + (activeSeg.p2.y - activeSeg.p1.y) * segProgress;
  const angle = Math.atan2(activeSeg.p2.y - activeSeg.p1.y, activeSeg.p2.x - activeSeg.p1.x);

  return { x, y, angle };
}

// ── Authentic Hand-Drawn Whiteboard Drawing Instruments ────────────────────
function drawDoodlePencil(ctx, x, y, angle, isDown, theme = 'dark') {
  ctx.save();
  ctx.translate(x, y);

  // Dynamic pencil tilt with subtle responsive sway tracking stroke path
  const pencilAngle = -Math.PI / 4 + Math.sin(angle) * 0.12;
  ctx.rotate(pencilAngle);

  const shadowDist = isDown ? 5 : 20;
  const shadowAlpha = isDown ? 0.35 : 0.14;

  // 1. Soft contact shadow under the pencil tip and barrel
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(shadowDist, shadowDist + 2, isDown ? 9 : 18, isDown ? 5 : 9, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Subtle 3D lift scale when pencil hovers off the board
  const liftScale = isDown ? 1.0 : 1.06;
  ctx.scale(liftScale, liftScale);

  // 2. Sharp Graphite Lead Tip at (0, 0)
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-2, -9);
  ctx.lineTo(2, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tiny graphite shine reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(-0.6, -7, 1.2, 5);

  // 3. Sharpened Natural Cedar Wood Cone with Scalloped Edges
  ctx.fillStyle = '#fef08a'; // Shaved cedar / pine tone
  ctx.beginPath();
  ctx.moveTo(-2, -9);
  ctx.lineTo(-6, -30);
  // Scalloped cut curves meeting the hexagonal facets
  ctx.quadraticCurveTo(-3, -26, 0, -30);
  ctx.quadraticCurveTo(3, -26, 6, -30);
  ctx.lineTo(2, -9);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Wood grain accent lines
  ctx.strokeStyle = 'rgba(202, 138, 4, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-1, -12);
  ctx.lineTo(-2.5, -24);
  ctx.moveTo(1, -12);
  ctx.lineTo(2.5, -24);
  ctx.stroke();

  // 4. Hexagonal Pencil Barrel with 3-Facet Shading (Classic Drafting Amber)
  // Left facet (highlight facet)
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-6, -100, 4, 70);

  // Center facet (primary body)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-2, -100, 4, 70);

  // Right facet (shadow facet)
  ctx.fillStyle = '#d97706';
  ctx.fillRect(2, -100, 4, 70);

  // Hand-drawn sketchy outer border for the barrel
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-6, -100, 12, 70);

  // Facet dividing grooves
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-2, -30);
  ctx.lineTo(-2, -100);
  ctx.moveTo(2, -30);
  ctx.lineTo(2, -100);
  ctx.stroke();

  // Signature "DOODLE DESK 2B" stamped imprint along the center facet
  ctx.save();
  ctx.fillStyle = 'rgba(69, 26, 3, 0.8)';
  ctx.font = 'bold 5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(0, -65);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('DOODLE DESK 2B', 0, 1.5);
  ctx.restore();

  // 5. Silver Metallic Ferrule Band
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(-6.5, -114, 13, 14);

  // Ferrule crimp lines
  ctx.strokeStyle = '#71717a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6.5, -106);
  ctx.lineTo(6.5, -106);
  ctx.moveTo(-6.5, -110);
  ctx.lineTo(6.5, -110);
  ctx.stroke();

  // Ferrule border
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-6.5, -114, 13, 14);

  // 6. Signature Rose Pink Rubber Eraser
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-6, -126, 12, 12, [5, 5, 0, 0]);
  } else {
    ctx.rect(-6, -126, 12, 12);
  }
  ctx.fill();

  // Soft eraser highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(-4.5, -125, 3, 10);

  // Eraser outline
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(-6, -126, 12, 12, [5, 5, 0, 0]);
  } else {
    ctx.rect(-6, -126, 12, 12);
  }
  ctx.stroke();

  ctx.restore();
}

function drawDoodleInkingPen(ctx, x, y, angle, isDown, theme = 'dark') {
  ctx.save();
  ctx.translate(x, y);

  const penAngle = -Math.PI / 4 + Math.sin(angle) * 0.12;
  ctx.rotate(penAngle);

  const shadowDist = isDown ? 4 : 18;
  const shadowAlpha = isDown ? 0.35 : 0.15;

  // Shadow
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(shadowDist, shadowDist + 2, isDown ? 8 : 16, isDown ? 4 : 8, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const liftScale = isDown ? 1.0 : 1.06;
  ctx.scale(liftScale, liftScale);

  // 1. Fine Inking Needle Nib at (0, 0)
  ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#18181b';
  ctx.fillRect(-0.75, -6, 1.5, 6);

  // 2. Metal Nib Sleeve / Cone
  ctx.fillStyle = '#a1a1aa';
  ctx.beginPath();
  ctx.moveTo(-1.5, -6);
  ctx.lineTo(-3, -16);
  ctx.lineTo(3, -16);
  ctx.lineTo(1.5, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 3. Ergonomic Inking Grip Section
  ctx.fillStyle = theme === 'dark' ? '#27272a' : '#3f3f46';
  ctx.fillRect(-4, -36, 8, 20);

  // 4. Chrome Accent Ring
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(-4.5, -39, 9, 3);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4.5, -39, 9, 3);

  // 5. Sleek Technical Pen Body
  ctx.fillStyle = theme === 'dark' ? '#18181b' : '#27272a';
  ctx.fillRect(-4.5, -100, 9, 61);

  // White tip caliber label ("0.5")
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(0, -60);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('FINELINER 0.5', 0, 1.5);
  ctx.restore();

  // Pen outline
  ctx.strokeStyle = theme === 'dark' ? '#52525b' : '#09090b';
  ctx.lineWidth = 1.3;
  ctx.strokeRect(-4.5, -100, 9, 61);

  // End cap
  ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#e4e4e7';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-4, -106, 8, 6, [3, 3, 0, 0]);
  else ctx.rect(-4, -106, 8, 6);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawDoodleMarker(ctx, x, y, angle, isDown, theme = 'dark') {
  ctx.save();
  ctx.translate(x, y);

  const markerAngle = -Math.PI / 4 + Math.sin(angle) * 0.12;
  ctx.rotate(markerAngle);

  const shadowDist = isDown ? 5 : 20;
  const shadowAlpha = isDown ? 0.35 : 0.15;

  // Contact shadow
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(shadowDist, shadowDist + 2, isDown ? 12 : 22, isDown ? 6 : 12, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const liftScale = isDown ? 1.0 : 1.06;
  ctx.scale(liftScale, liftScale);

  // 1. Chisel Felt Nib at (0, 0)
  ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#18181b';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-4, -10);
  ctx.lineTo(4, -10);
  ctx.closePath();
  ctx.fill();

  // 2. Collar
  ctx.fillStyle = '#71717a';
  ctx.fillRect(-5, -16, 10, 6);
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.strokeRect(-5, -16, 10, 6);

  // 3. High-Contrast Whiteboard Marker Barrel
  ctx.fillStyle = theme === 'dark' ? '#27272a' : '#f4f4f5';
  ctx.fillRect(-7.5, -86, 15, 70);

  // Brand band
  ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#18181b';
  ctx.fillRect(-7.5, -60, 15, 14);

  // Label text
  ctx.save();
  ctx.fillStyle = theme === 'dark' ? '#000000' : '#ffffff';
  ctx.font = 'bold 5.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(0, -53);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('WHITEBOARD', 0, 2);
  ctx.restore();

  // Marker outer stroke
  ctx.strokeStyle = theme === 'dark' ? '#52525b' : '#27272a';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-7.5, -86, 15, 70);

  // Rounded end plug
  ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#18181b';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-7, -93, 14, 7, [4, 4, 0, 0]);
  else ctx.rect(-7, -93, 14, 7);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ── Particle Sparks Engine ────────────────────────────────────────────────
class DrawingParticles {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color = '#ffffff') {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 - 0.4,
        alpha: 0.9,
        size: Math.random() * 2 + 1,
        color,
      });
    }
  }

  updateAndDraw(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;
      p.size = Math.max(0.5, p.size * 0.96);

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}

// ── Main Component ────────────────────────────────────────────────────────
export function WhiteboardAnimationStudio({
  isOpen,
  onClose,
  doodleAPI,
  isDark = true,
}) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0); // 0 to 1
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [instrument, setInstrument] = useState('pencil'); // 'pencil' | 'inkpen' | 'marker' | 'ghost'
  const [styleMode, setStyleMode] = useState('write_on'); // 'write_on' | 'sketch' | 'spring'
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [directorCam, setDirectorCam] = useState(false);
  const [selectedDurationSec, setSelectedDurationSec] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const soundEngineRef = useRef(null);
  const particlesRef = useRef(new DrawingParticles());

  // Initialize marker audio synthesizer
  useEffect(() => {
    soundEngineRef.current = new MarkerSoundSynthesizer();
    return () => {
      soundEngineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    soundEngineRef.current?.setMuted(!isSoundEnabled);
  }, [isSoundEnabled]);

  // Collect scene elements
  const sceneElements = useMemo(() => {
    if (!doodleAPI) return [];
    const elements = doodleAPI.getSceneElements?.() || [];
    return elements.filter((el) => !el.isDeleted && !el.isHidden);
  }, [doodleAPI, isOpen]);

  // Precompute metrics and paths for every element
  const parsedElements = useMemo(() => {
    return sceneElements.map((el) => {
      const keyframes = getElementKeyframes(el);
      const metrics = calculatePathMetrics(keyframes);
      return {
        element: el,
        keyframes,
        metrics,
        bounds: {
          x: el.x || 0,
          y: el.y || 0,
          w: Math.abs(el.width || 80),
          h: Math.abs(el.height || 60),
        },
      };
    });
  }, [sceneElements]);

  // Scene bounds
  const sceneBounds = useMemo(() => {
    if (parsedElements.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 600, width: 1000, height: 600 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    parsedElements.forEach(({ bounds }) => {
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.w);
      maxY = Math.max(maxY, bounds.y + bounds.h);
    });

    const padding = 70;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: Math.max(480, maxX - minX + padding * 2),
      height: Math.max(320, maxY - minY + padding * 2),
    };
  }, [parsedElements]);

  // Calculate total runtime duration
  const totalDurationMs = useMemo(() => {
    if (selectedDurationSec) return selectedDurationSec * 1000;
    // Dynamic calculation: give proportional time based on scene complexity
    return Math.max(3500, parsedElements.length * 900);
  }, [parsedElements.length, selectedDurationSec]);

  // ── Exact Time & State Resolution at Progress P ──────────────────────────
  const animationState = useMemo(() => {
    const count = parsedElements.length;
    if (count === 0) {
      return {
        activeIdx: -1,
        isTravel: false,
        elementProgress: 1,
        penX: 0,
        penY: 0,
        penAngle: -Math.PI / 4,
        isDown: false,
      };
    }

    if (currentProgress >= 1) {
      const last = parsedElements[count - 1];
      const endPt = last.keyframes[last.keyframes.length - 1] || { x: 0, y: 0 };
      return {
        activeIdx: count - 1,
        isTravel: false,
        elementProgress: 1,
        penX: endPt.x,
        penY: endPt.y,
        penAngle: -Math.PI / 4,
        isDown: false,
      };
    }

    // Allocate time: 82% drawing time, 18% pen travel/lift time between shapes
    const travelFraction = count > 1 ? 0.18 : 0;
    const drawFraction = 1 - travelFraction;
    const timePerElement = 1 / count;
    const drawTimePerElement = timePerElement * (1 - (count > 1 ? 0.18 : 0));
    const travelTimePerElement = timePerElement - drawTimePerElement;

    const globalP = currentProgress;
    const elementSlot = Math.min(count - 1, Math.floor(globalP / timePerElement));
    const slotProgress = (globalP - elementSlot * timePerElement) / timePerElement;

    const currentItem = parsedElements[elementSlot];
    const prevItem = elementSlot > 0 ? parsedElements[elementSlot - 1] : null;

    // Check if we are in travel/lift mode leading into this element
    const isTravelSlot = slotProgress < (count > 1 ? 0.18 : 0) && elementSlot > 0;

    if (isTravelSlot) {
      const travelT = slotProgress / 0.18; // 0 -> 1
      // Smooth cubic bezier travel from prev end point to current start point
      const prevEnd = prevItem.keyframes[prevItem.keyframes.length - 1] || { x: 0, y: 0 };
      const currStart = currentItem.keyframes[0] || { x: 0, y: 0 };

      // EaseInOutCubic
      const easedT = travelT < 0.5 ? 4 * travelT * travelT * travelT : 1 - Math.pow(-2 * travelT + 2, 3) / 2;
      const penX = prevEnd.x + (currStart.x - prevEnd.x) * easedT;
      const penY = prevEnd.y + (currStart.y - prevEnd.y) * easedT - Math.sin(travelT * Math.PI) * 16;
      const penAngle = Math.atan2(currStart.y - prevEnd.y, currStart.x - prevEnd.x);

      return {
        activeIdx: elementSlot,
        isTravel: true,
        elementProgress: 0,
        penX,
        penY,
        penAngle,
        isDown: false,
      };
    }

    // We are actively drawing the current element
    const drawProgress = count > 1 ? (slotProgress - 0.18) / (1 - 0.18) : slotProgress;
    const clampedProgress = Math.max(0, Math.min(1, drawProgress));
    const pointData = getPointAtProgress(currentItem.metrics, clampedProgress);

    return {
      activeIdx: elementSlot,
      isTravel: false,
      elementProgress: clampedProgress,
      penX: pointData.x,
      penY: pointData.y,
      penAngle: pointData.angle,
      isDown: true,
    };
  }, [parsedElements, currentProgress]);

  // Sync sound with drawing state
  useEffect(() => {
    if (isPlaying && animationState.isDown && currentProgress < 1) {
      soundEngineRef.current?.setDrawing(true, speedMultiplier);
      // Emit ink sparkle particles
      particlesRef.current.emit(
        animationState.penX,
        animationState.penY,
        isDark ? '#ffffff' : '#18181b'
      );
    } else {
      soundEngineRef.current?.setDrawing(false);
    }
  }, [isPlaying, animationState, currentProgress, speedMultiplier, isDark]);

  // ── Canvas Render Loop ───────────────────────────────────────────────────
  const renderStage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = isDark ? '#141416' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    if (parsedElements.length === 0) {
      ctx.fillStyle = isDark ? '#71717a' : '#94a3b8';
      ctx.font = '16px "Doodlefont", "Virgil", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No elements on canvas to animate. Draw something on your board!', width / 2, height / 2);
      return;
    }

    // Base scale and framing
    let scaleX = (width - 60) / sceneBounds.width;
    let scaleY = (height - 60) / sceneBounds.height;
    let baseScale = Math.min(scaleX, scaleY, 1.25);
    let targetCenterX = sceneBounds.minX + sceneBounds.width / 2;
    let targetCenterY = sceneBounds.minY + sceneBounds.height / 2;

    // Director Cam: Smooth close-up framing that pans with the active stroke
    if (directorCam && currentProgress < 0.95 && animationState.activeIdx >= 0) {
      const activeEl = parsedElements[animationState.activeIdx];
      if (activeEl) {
        baseScale = baseScale * 1.35;
        targetCenterX = animationState.penX;
        targetCenterY = animationState.penY;
      }
    }

    const offsetX = width / 2 - targetCenterX * baseScale;
    const offsetY = height / 2 - targetCenterY * baseScale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(baseScale, baseScale);

    // 1. Render all completely finished elements
    parsedElements.forEach((item, idx) => {
      if (idx < animationState.activeIdx || (idx === animationState.activeIdx && animationState.elementProgress >= 1)) {
        try {
          ctx.save();
          renderElementToCanvas(item.element, ctx, { theme: isDark ? 'dark' : 'light' });
          ctx.restore();
        } catch {
          ctx.strokeStyle = item.element.strokeColor || (isDark ? '#ffffff' : '#000000');
          ctx.lineWidth = 2;
          ctx.strokeRect(item.bounds.x, item.bounds.y, item.bounds.w, item.bounds.h);
        }
      }
    });

    // 2. Render currently animating element progressively
    if (
      animationState.activeIdx >= 0 &&
      animationState.activeIdx < parsedElements.length &&
      !animationState.isTravel &&
      animationState.elementProgress < 1
    ) {
      const activeItem = parsedElements[animationState.activeIdx];
      const el = activeItem.element;
      const p = animationState.elementProgress;
      const strokeW = STROKE_WIDTHS[el.strokeWidth] || el.strokeWidth || 2.5;
      const color = el.strokeColor || (isDark ? '#ffffff' : '#18181b');

      ctx.save();

      if (styleMode === 'spring') {
        // Elastic scale-pop reveal
        const springT = Math.sin(p * Math.PI * 0.7);
        ctx.translate(activeItem.bounds.x + activeItem.bounds.w / 2, activeItem.bounds.y + activeItem.bounds.h / 2);
        ctx.scale(springT, springT);
        ctx.translate(-(activeItem.bounds.x + activeItem.bounds.w / 2), -(activeItem.bounds.y + activeItem.bounds.h / 2));
        renderElementToCanvas(el, ctx, { theme: isDark ? 'dark' : 'light' });
      } else {
        // True Progressive Stroke Tracing
        if (styleMode === 'sketch') {
          // Blueprint faint outline first
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = isDark ? '#ffffff' : '#71717a';
          ctx.lineWidth = 1;
          ctx.strokeRect(activeItem.bounds.x, activeItem.bounds.y, activeItem.bounds.w, activeItem.bounds.h);
          ctx.restore();
        }

        // Trace points up to progress
        const targetDist = p * activeItem.metrics.totalLength;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let drawnDist = 0;
        const segs = activeItem.metrics.segments;

        if (segs.length > 0) {
          ctx.moveTo(segs[0].p1.x, segs[0].p1.y);

          for (let s = 0; s < segs.length; s++) {
            const seg = segs[s];
            if (targetDist >= seg.cumStart + seg.len) {
              ctx.lineTo(seg.p2.x, seg.p2.y);
            } else if (targetDist > seg.cumStart) {
              const fract = (targetDist - seg.cumStart) / seg.len;
              const px = seg.p1.x + (seg.p2.x - seg.p1.x) * fract;
              const py = seg.p1.y + (seg.p2.y - seg.p1.y) * fract;
              ctx.lineTo(px, py);
              break;
            }
          }
          ctx.stroke();
        }

        // For text elements, render typed characters progressively
        if (el.type === ELEMENT_TYPES.TEXT && el.text) {
          const visibleCount = Math.ceil(el.text.length * p);
          ctx.font = `${el.fontSize || 20}px "Doodlefont", "Virgil", cursive, sans-serif`;
          ctx.fillStyle = color;
          ctx.fillText(el.text.slice(0, visibleCount), el.x, el.y + (el.fontSize || 20));
        }
      }

      ctx.restore();
    }

    // 3. Draw active ink sparkles / dust
    particlesRef.current.updateAndDraw(ctx);

    // 4. Render selected Drawing Instrument
    if (instrument !== 'ghost' && currentProgress < 1 && (isPlaying || currentProgress > 0)) {
      const { penX, penY, penAngle, isDown } = animationState;

      if (instrument === 'pencil' || instrument === 'hand') {
        drawDoodlePencil(ctx, penX, penY, penAngle, isDown, isDark ? 'dark' : 'light');
      } else if (instrument === 'inkpen' || instrument === 'stylus' || instrument === 'quill') {
        drawDoodleInkingPen(ctx, penX, penY, penAngle, isDown, isDark ? 'dark' : 'light');
      } else if (instrument === 'marker') {
        drawDoodleMarker(ctx, penX, penY, penAngle, isDown, isDark ? 'dark' : 'light');
      }
    }

    ctx.restore();
  }, [
    isDark,
    parsedElements,
    sceneBounds,
    currentProgress,
    animationState,
    directorCam,
    styleMode,
    instrument,
    isPlaying,
  ]);

  // ── Frame Ticker ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      renderStage();
      lastTimeRef.current = null;
      return;
    }

    const tick = (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setCurrentProgress((prev) => {
        const step = delta / (totalDurationMs / speedMultiplier);
        const next = prev + step;
        if (next >= 1) {
          if (isLooping) {
            particlesRef.current.clear();
            return 0;
          } else {
            setIsPlaying(false);
            return 1;
          }
        }
        return next;
      });

      renderStage();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDurationMs, speedMultiplier, isLooping, renderStage]);

  // Initial draw & resize
  useEffect(() => {
    if (isOpen) {
      renderStage();
    }
  }, [isOpen, renderStage]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentProgress((p) => Math.max(0, p - 0.05));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentProgress((p) => Math.min(1, p + 0.05));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Video Export (WebM)
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !window.MediaRecorder) {
      alert('Media recording is not supported in this environment.');
      return;
    }

    setIsExporting(true);
    setIsPlaying(false);
    setCurrentProgress(0);

    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 6000000,
    });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-animation-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    };

    recorder.start();
    setIsPlaying(true);

    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
        setIsPlaying(false);
      }
    }, totalDurationMs / speedMultiplier + 600);
  };

  if (!isOpen) return null;

  const currentSec = ((currentProgress * totalDurationMs) / 1000).toFixed(1);
  const totalSec = (totalDurationMs / 1000).toFixed(1);

  return (
    <div
      className="modal-overlay whiteboard-animation-studio-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(8, 8, 12, 0.88)' : 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        className="whiteboard-animation-studio-modal"
        style={{
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '94vh',
          backgroundColor: isDark ? '#141416' : '#ffffff',
          borderRadius: '20px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: isDark
            ? '0 32px 80px rgba(0, 0, 0, 0.75), 0 4px 16px rgba(0, 0, 0, 0.4)'
            : '0 24px 64px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          color: isDark ? '#f4f4f5' : '#18181b',
          overflow: 'hidden',
          fontFamily: 'var(--font-family, "Doodlefont", "Virgil", cursive, sans-serif)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header ── */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: isDark ? '#111113' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#18181b',
              }}
            >
              <Film size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Whiteboard Animation Studio</span>
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
                  Motion Engine
                </span>
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', marginTop: '2px' }}>
                {parsedElements.length} stroke{parsedElements.length === 1 ? '' : 's'} • {totalSec}s runtime • Vector Write-On
              </div>
            </div>
          </div>

          {/* Quick Settings & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Whiteboard Sound FX Toggle */}
            <button
              type="button"
              onClick={() => setIsSoundEnabled((s) => !s)}
              title={isSoundEnabled ? 'Marker Audio Squeak Enabled' : 'Marker Audio Muted'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: isSoundEnabled
                  ? (isDark ? '1px solid #ffffff' : '1px solid #18181b')
                  : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                background: isSoundEnabled
                  ? (isDark ? '#ffffff' : '#18181b')
                  : (isDark ? '#222226' : '#ffffff'),
                color: isSoundEnabled
                  ? (isDark ? '#000000' : '#ffffff')
                  : (isDark ? '#a1a1aa' : '#64748b'),
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isSoundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>Marker FX</span>
            </button>

            {/* Director Cam Toggle */}
            <button
              type="button"
              onClick={() => setDirectorCam((c) => !c)}
              title="Camera follows drawing tip dynamically"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                border: directorCam
                  ? (isDark ? '1px solid #ffffff' : '1px solid #18181b')
                  : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                background: directorCam
                  ? (isDark ? '#ffffff' : '#18181b')
                  : (isDark ? '#222226' : '#ffffff'),
                color: directorCam
                  ? (isDark ? '#000000' : '#ffffff')
                  : (isDark ? '#a1a1aa' : '#64748b'),
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Video size={13} />
              <span>Director Cam</span>
            </button>

            {/* Export WebM */}
            <button
              type="button"
              onClick={handleExportVideo}
              disabled={isExporting || parsedElements.length === 0}
              title="Record and download animation as 60fps WebM Video"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isDark ? '#ffffff' : '#18181b',
                color: isDark ? '#000000' : '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isExporting ? 'wait' : 'pointer',
                boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Download size={13} />
              <span>{isExporting ? 'Recording...' : 'Export WebM'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Animation Studio (Esc)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #d4d4d8',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#a1a1aa' : '#64748b',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
              <span>Esc</span>
            </button>
          </div>
        </div>

        {/* ── Studio Stage (Canvas Viewport) ── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: isDark ? '#141416' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '440px',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            width={980}
            height={520}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain',
            }}
          />

          {/* Active drawing instrument HUD tag */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 16,
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: isDark ? 'rgba(20, 20, 24, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              backdropFilter: 'blur(8px)',
              color: isDark ? '#a1a1aa' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>
              {animationState.isDown
                ? `Drawing stroke ${animationState.activeIdx + 1} of ${parsedElements.length}`
                : animationState.isTravel
                ? 'Moving to next stroke...'
                : currentProgress >= 1
                ? 'Drawing complete'
                : 'Ready'}
            </span>
          </div>
        </div>

        {/* ── Timeline & Playback Controller ── */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: isDark ? '#111113' : '#f8fafc',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Timeline Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', minWidth: '40px' }}>
              {currentSec}s
            </span>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={currentProgress}
              onChange={(e) => {
                setCurrentProgress(Number(e.target.value));
                renderStage();
              }}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: isDark ? '#ffffff' : '#18181b',
                height: '6px',
                borderRadius: '99px',
              }}
            />

            <span style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#64748b', minWidth: '40px', textAlign: 'right' }}>
              {totalSec}s
            </span>
          </div>

          {/* Action & Option Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Left: Playback Steppers & Play Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentProgress(0);
                  particlesRef.current.clear();
                  renderStage();
                }}
                title="Restart from beginning"
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  background: isDark ? '#222226' : '#ffffff',
                  color: isDark ? '#e4e4e7' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RotateCcw size={13} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentProgress((p) => Math.max(0, p - 0.08));
                  renderStage();
                }}
                title="Step backward"
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  background: isDark ? '#222226' : '#ffffff',
                  color: isDark ? '#e4e4e7' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <SkipBack size={13} />
              </button>

              {/* Main Play / Pause Button */}
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                title="Play / Pause (Space)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isDark ? '#ffffff' : '#18181b',
                  color: isDark ? '#000000' : '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.4)' : '0 4px 14px rgba(0, 0, 0, 0.15)',
                }}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                <kbd
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    height: 18,
                    background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                    color: isDark ? '#000000' : '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  Space
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentProgress((p) => Math.min(1, p + 0.08));
                  renderStage();
                }}
                title="Step forward"
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  background: isDark ? '#222226' : '#ffffff',
                  color: isDark ? '#e4e4e7' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <SkipForward size={13} />
              </button>
            </div>

            {/* Center: Instrument Selector (Doodle Pencil / Inking Pen / Whiteboard Marker / Ghost) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isDark ? '#1a1a1e' : '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px',
              }}
            >
              {[
                { id: 'pencil', label: 'Doodle Pencil', icon: <Pencil size={12} /> },
                { id: 'inkpen', label: 'Inking Pen', icon: <PenTool size={12} /> },
                { id: 'marker', label: 'Whiteboard Marker', icon: <Highlighter size={12} /> },
                { id: 'ghost', label: 'Ghost', icon: <Ghost size={12} /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setInstrument(item.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: instrument === item.id ? (isDark ? '#ffffff' : '#18181b') : 'transparent',
                    color: instrument === item.id ? (isDark ? '#000000' : '#ffffff') : (isDark ? '#a1a1aa' : '#64748b'),
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Right: Style, Speed & Duration */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Loop toggle */}
              <button
                type="button"
                onClick={() => setIsLooping((p) => !p)}
                title="Toggle animation looping"
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: isLooping
                    ? (isDark ? '1px solid #ffffff' : '1px solid #18181b')
                    : (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'),
                  background: isLooping
                    ? (isDark ? '#ffffff' : '#18181b')
                    : (isDark ? '#222226' : '#ffffff'),
                  color: isLooping
                    ? (isDark ? '#000000' : '#ffffff')
                    : (isDark ? '#a1a1aa' : '#64748b'),
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Loop
              </button>

              {/* Speed buttons */}
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeedMultiplier(spd)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: speedMultiplier === spd ? (isDark ? '#ffffff' : '#18181b') : (isDark ? '#222226' : '#f1f5f9'),
                    color: speedMultiplier === spd ? (isDark ? '#000000' : '#ffffff') : (isDark ? '#a1a1aa' : '#64748b'),
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhiteboardAnimationStudio;
