import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Pencil,
  Lock,
  Trash2,
} from 'lucide-react';
import { renderElement } from '../engine/renderer/render.js';
import { createElement, createTextElement, ELEMENT_TYPES } from '../engine/elements.js';
import { proceduralAudio } from '../utils/proceduralAudio.js';
import {
  getWalkthroughFrames,
  getWalkthroughFrameForElement,
} from '../engine/scenarioWalkthrough.js';
import { getDemoElementIds } from './Spatial3DHoloCanvas.jsx';

// Device specifications
export const DEVICE_PROFILES = {
  responsive: {
    id: 'responsive',
    name: 'Frameless Stage',
    icon: Maximize2,
    width: 'auto',
    height: 'auto',
    radius: 12,
    bezel: 0,
    hasDynamicIsland: false,
    hasHomeBar: false,
  },
  iphone: {
    id: 'iphone',
    name: 'iPhone 16 Pro',
    icon: Smartphone,
    width: 393,
    height: 852,
    radius: 44,
    bezel: 10,
    hasDynamicIsland: true,
    hasHomeBar: true,
  },
  ipad: {
    id: 'ipad',
    name: 'iPad Pro',
    icon: Tablet,
    width: 768,
    height: 1024,
    radius: 28,
    bezel: 14,
    hasDynamicIsland: false,
    hasHomeBar: true,
  },
  macbook: {
    id: 'macbook',
    name: 'MacBook Pro',
    icon: Laptop,
    width: 960,
    height: 600,
    radius: 12,
    bezel: 20,
    hasWindowControls: true,
    hasDynamicIsland: false,
    hasHomeBar: false,
  },
};

// Built-in Demo Mobile App Prototype Generator
export function createDemoMobileAppPrototype(originX = 120, originY = 120, isDark = true) {
  const frameW = 390;
  const frameH = 720;
  const gap = 160;

  const bgFrame = isDark ? '#141418' : '#ffffff';
  const strokeColor = isDark ? '#ffffff' : '#18181b';
  const mutedText = isDark ? '#a1a1aa' : '#71717a';
  const cardBg = isDark ? '#1e1e24' : '#f4f4f5';
  const accentColor = '#10b981';

  // ── Frame 1: Onboarding / Welcome ──
  const frame1 = createElement(ELEMENT_TYPES.FRAME, originX, originY, frameW, frameH, {
    name: '1. Onboarding Screen',
    backgroundColor: bgFrame,
    strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    strokeWidth: 2,
    roughness: 0,
  });

  // ── Frame 2: Product Catalog Feed ──
  const frame2 = createElement(ELEMENT_TYPES.FRAME, originX + frameW + gap, originY, frameW, frameH, {
    name: '2. Product Store',
    backgroundColor: bgFrame,
    strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    strokeWidth: 2,
    roughness: 0,
  });

  // ── Frame 3: Order Checkout Success ──
  const frame3 = createElement(ELEMENT_TYPES.FRAME, originX + (frameW + gap) * 2, originY, frameW, frameH, {
    name: '3. Order Success',
    backgroundColor: bgFrame,
    strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    strokeWidth: 2,
    roughness: 0,
  });

  const children = [];

  const addText = (frame, text, rx, ry, w, fs, color, extra = {}) => {
    children.push(createTextElement(frame.x + rx, frame.y + ry, text, {
      width: w,
      fontSize: fs,
      fontFamily: 5,
      strokeColor: color,
      frameId: frame.id,
      ...extra,
    }));
  };

  // ── Population for Frame 1 ──
  children.push(createElement(ELEMENT_TYPES.ELLIPSE, frame1.x + 115, frame1.y + 130, 160, 160, {
    frameId: frame1.id,
    strokeColor: accentColor,
    backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.08)',
    fillStyle: 'solid',
    strokeWidth: 2.5,
    roughness: 1,
  }));
  addText(frame1, '✨', 165, 185, 60, 48, accentColor);
  addText(frame1, 'Doodle Store', 40, 330, 310, 30, strokeColor);
  addText(frame1, 'Discover hand-crafted tech gear & minimalist desk setups.', 40, 380, 310, 15, mutedText);

  // CTA Button ➔ Frame 2
  const btn1 = createElement(ELEMENT_TYPES.RECTANGLE, frame1.x + 40, frame1.y + 570, 310, 56, {
    frameId: frame1.id,
    strokeColor: accentColor,
    backgroundColor: accentColor,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
    link: `#element=${encodeURIComponent(frame2.id)}`,
  });
  children.push(btn1);
  addText(frame1, 'Explore Catalog ➔', 110, 586, 200, 16, '#ffffff', {
    link: `#element=${encodeURIComponent(frame2.id)}`,
  });

  // ── Population for Frame 2 ──
  addText(frame2, 'Featured Items', 30, 40, 240, 24, strokeColor);
  addText(frame2, 'Hand-crafted workspace tools', 30, 75, 240, 14, mutedText);

  // Product Card 1
  children.push(createElement(ELEMENT_TYPES.RECTANGLE, frame2.x + 30, frame2.y + 120, 330, 190, {
    frameId: frame2.id,
    strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    backgroundColor: cardBg,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
  }));
  addText(frame2, 'Mechanical Keyboard', 50, 145, 290, 18, strokeColor);
  addText(frame2, 'Wireless retro mechanical keys with hot-swap switches.', 50, 180, 290, 13, mutedText);
  addText(frame2, '$149.00', 50, 235, 100, 18, accentColor);

  // Buy Button on Card 1 ➔ Frame 3
  const buyBtn1 = createElement(ELEMENT_TYPES.RECTANGLE, frame2.x + 220, frame2.y + 225, 120, 42, {
    frameId: frame2.id,
    strokeColor: accentColor,
    backgroundColor: accentColor,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
    link: `#element=${encodeURIComponent(frame3.id)}`,
  });
  children.push(buyBtn1);
  addText(frame2, 'Buy Now ➔', 242, 237, 100, 14, '#ffffff', {
    link: `#element=${encodeURIComponent(frame3.id)}`,
  });

  // Product Card 2
  children.push(createElement(ELEMENT_TYPES.RECTANGLE, frame2.x + 30, frame2.y + 340, 330, 190, {
    frameId: frame2.id,
    strokeColor: isDark ? '#3f3f46' : '#e4e4e7',
    backgroundColor: cardBg,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
  }));
  addText(frame2, 'Studio Pro Headphones', 50, 365, 290, 18, strokeColor);
  addText(frame2, 'Open-back planar magnetic monitors for deep focus.', 50, 400, 290, 13, mutedText);
  addText(frame2, '$289.00', 50, 455, 100, 18, accentColor);

  // Buy Button on Card 2 ➔ Frame 3
  const buyBtn2 = createElement(ELEMENT_TYPES.RECTANGLE, frame2.x + 220, frame2.y + 445, 120, 42, {
    frameId: frame2.id,
    strokeColor: accentColor,
    backgroundColor: accentColor,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
    link: `#element=${encodeURIComponent(frame3.id)}`,
  });
  children.push(buyBtn2);
  addText(frame2, 'Buy Now ➔', 242, 457, 100, 14, '#ffffff', {
    link: `#element=${encodeURIComponent(frame3.id)}`,
  });

  // Back to Welcome button
  const backToHomeBtn = createElement(ELEMENT_TYPES.RECTANGLE, frame2.x + 30, frame2.y + 610, 330, 46, {
    frameId: frame2.id,
    strokeColor: isDark ? '#3f3f46' : '#d4d4d8',
    backgroundColor: 'transparent',
    fillStyle: 'none',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
    link: `#element=${encodeURIComponent(frame1.id)}`,
  });
  children.push(backToHomeBtn);
  addText(frame2, '⬅ Back to Onboarding', 115, 623, 200, 14, mutedText, {
    link: `#element=${encodeURIComponent(frame1.id)}`,
  });

  // ── Population for Frame 3 ──
  children.push(createElement(ELEMENT_TYPES.ELLIPSE, frame3.x + 130, frame3.y + 150, 130, 130, {
    frameId: frame3.id,
    strokeColor: '#10b981',
    backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.1)',
    fillStyle: 'solid',
    strokeWidth: 2.5,
    roughness: 1,
  }));
  addText(frame3, '✓', 175, 185, 50, 52, '#10b981');
  addText(frame3, 'Order Confirmed!', 40, 330, 310, 26, strokeColor);
  addText(frame3, 'Your package is being packed & shipped to your desk setup.', 40, 375, 310, 15, mutedText);

  // Return Home CTA ➔ Frame 1
  const returnHomeBtn = createElement(ELEMENT_TYPES.RECTANGLE, frame3.x + 40, frame3.y + 570, 310, 56, {
    frameId: frame3.id,
    strokeColor: accentColor,
    backgroundColor: accentColor,
    fillStyle: 'solid',
    strokeWidth: 1.5,
    roughness: 0,
    roundness: 'round',
    link: `#element=${encodeURIComponent(frame1.id)}`,
  });
  children.push(returnHomeBtn);
  addText(frame3, 'Return to Store Home', 95, 586, 220, 16, '#ffffff', {
    link: `#element=${encodeURIComponent(frame1.id)}`,
  });

  const allDemoElements = [frame1, frame2, frame3, ...children].map((el) => ({
    ...el,
    isDemoPrototype: true,
    customData: { ...(el.customData || {}), isDemoPrototype: true },
  }));

  const demoFrames = allDemoElements.filter((el) => el.type === ELEMENT_TYPES.FRAME);

  return {
    frames: demoFrames,
    elements: allDemoElements,
  };
}

export function InteractivePrototypePlayer({
  isOpen,
  onClose,
  doodleAPI,
  initialFrameId,
  theme = 'dark',
  onToast,
}) {
  const [activeFrameId, setActiveFrameId] = useState(initialFrameId || '');
  const [deviceType, setDeviceType] = useState('iphone'); // 'responsive' | 'iphone' | 'ipad' | 'macbook'
  const [deviceStyle, setDeviceStyle] = useState('doodle'); // 'doodle' | 'studio'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [fitMode, setFitMode] = useState('fit'); // 'fit' | 'fill' | 'actual'
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [transitionEffect, setTransitionEffect] = useState('slide'); // 'slide' | 'slide-up' | 'fade' | 'pop' | 'instant'
  const [transitionAnimClass, setTransitionAnimClass] = useState('');
  const [showHotspotHints, setShowHotspotHints] = useState(true);
  const [isHotspotPulsing, setIsHotspotPulsing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stageBg, setStageBg] = useState(theme === 'dark' ? 'dark' : 'paper');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [touchRipples, setTouchRipples] = useState([]);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [virtualDemoApp, setVirtualDemoApp] = useState(null);
  const [windowDimensions, setWindowDimensions] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const imageCacheRef = useRef({});

  // Lock body scroll while player is open to prevent any window scrollbar
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Track window resize to dynamically fit stage without scrollbars
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setWindowDimensions({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Scene elements from Doodle API or isolated in-memory demo preview
  const allElements = useMemo(() => {
    if (virtualDemoApp) return virtualDemoApp.elements;
    return doodleAPI?.getSceneElements?.() || [];
  }, [doodleAPI, isOpen, virtualDemoApp]);

  const frames = useMemo(() => {
    if (virtualDemoApp) return virtualDemoApp.frames;
    return getWalkthroughFrames(allElements);
  }, [allElements, virtualDemoApp]);

  // Set initial frame if none selected or if frame deleted
  useEffect(() => {
    if (!isOpen) return;
    if (frames.length > 0) {
      const exists = frames.some(f => f.id === activeFrameId);
      if (!activeFrameId || !exists) {
        const start = initialFrameId && frames.some(f => f.id === initialFrameId)
          ? initialFrameId
          : frames[0].id;
        setActiveFrameId(start);
        setHistory([start]);
        setHistoryIndex(0);
      }
    }
  }, [isOpen, frames, activeFrameId, initialFrameId]);

  const currentFrame = useMemo(() => {
    return frames.find(f => f.id === activeFrameId) || frames[0] || null;
  }, [frames, activeFrameId]);

  // Elements that belong to the active frame
  const frameElements = useMemo(() => {
    if (!currentFrame) return [];
    return allElements.filter(el => {
      if (el.isDeleted || el.isHidden || el.id === currentFrame.id) return false;
      if (el.frameId === currentFrame.id) return true;
      const cx = el.x + (el.width || 0) / 2;
      const cy = el.y + (el.height || 0) / 2;
      return cx >= currentFrame.x && cx <= currentFrame.x + currentFrame.width &&
             cy >= currentFrame.y && cy <= currentFrame.y + currentFrame.height;
    });
  }, [allElements, currentFrame]);

  // Clickable hotspots inside current frame
  const hotspots = useMemo(() => {
    if (!currentFrame) return [];
    const elementsById = new Map(allElements.map(e => [e.id, e]));

    const parseDestinationId = (link) => {
      if (!link) return null;
      const match = /#element=([^&]+)/.exec(link);
      if (match) return decodeURIComponent(match[1]);
      if (/^[a-zA-Z0-9_-]{8,}$/.test(link)) return link;
      return null;
    };

    return frameElements.flatMap(el => {
      if (!el.link) return [];
      const destId = parseDestinationId(el.link);
      if (!destId) return [];

      const target = elementsById.get(destId);
      const targetFrame = target ? getWalkthroughFrameForElement(allElements, target) : null;
      if (!targetFrame) return [];

      return [{
        elementId: el.id,
        targetFrameId: targetFrame.id,
        targetFrameName: targetFrame.name,
        x: el.x - currentFrame.x,
        y: el.y - currentFrame.y,
        width: Math.max(12, el.width || 60),
        height: Math.max(12, el.height || 30),
      }];
    });
  }, [allElements, currentFrame, frameElements]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else {
          onClose?.();
        }
      } else if (e.key === 'ArrowLeft') {
        navigateBack();
      } else if (e.key === 'ArrowRight') {
        navigateForward();
      } else if (e.key === 'r' || e.key === 'R') {
        restartFlow();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowHotspotHints(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, history, historyIndex, isDrawerOpen]);

  // Render current frame to canvas with exact clipping and DPI scale
  const renderFrameCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const targetW = currentFrame.width || 390;
    const targetH = currentFrame.height || 720;

    if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
      canvas.width = targetW * dpr;
      canvas.height = targetH * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Canvas background matching frame or studio theme
    ctx.fillStyle = currentFrame.backgroundColor && currentFrame.backgroundColor !== 'transparent'
      ? currentFrame.backgroundColor
      : (stageBg === 'paper' ? '#ffffff' : '#141418');
    ctx.fillRect(0, 0, targetW, targetH);

    // Frame boundary clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, targetW, targetH);
    ctx.clip();

    // Translate to frame origin and render elements
    ctx.translate(-currentFrame.x, -currentFrame.y);
    for (const el of frameElements) {
      renderElement(ctx, el, imageCacheRef.current);
    }

    ctx.restore();
  }, [currentFrame, frameElements, stageBg]);

  useEffect(() => {
    renderFrameCanvas();
  }, [renderFrameCanvas]);

  // Navigate to target frame with transition
  const navigateToFrame = (targetFrameId, direction = 'forward') => {
    if (!targetFrameId || targetFrameId === activeFrameId) return;

    if (soundEnabled) {
      try {
        proceduralAudio.playSnapClick();
      } catch {}
    }

    let animClass = '';
    if (transitionEffect === 'slide') {
      animClass = direction === 'forward' ? 'anim-slide-left' : 'anim-slide-right';
    } else if (transitionEffect === 'slide-up') {
      animClass = 'anim-slide-up';
    } else if (transitionEffect === 'fade') {
      animClass = 'anim-fade';
    } else if (transitionEffect === 'pop') {
      animClass = 'anim-pop';
    }

    if (animClass) {
      setTransitionAnimClass(animClass);
      setTimeout(() => {
        setActiveFrameId(targetFrameId);
        setTransitionAnimClass('');
      }, 240);
    } else {
      setActiveFrameId(targetFrameId);
    }

    if (direction === 'forward') {
      const newHistory = history.slice(0, historyIndex + 1).concat(targetFrameId);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const navigateBack = () => {
    if (historyIndex > 0) {
      const prevFrameId = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      navigateToFrame(prevFrameId, 'back');
    }
  };

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      const nextFrameId = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      navigateToFrame(nextFrameId, 'forward');
    }
  };

  const restartFlow = () => {
    if (history.length > 0) {
      const startId = history[0];
      setHistoryIndex(0);
      navigateToFrame(startId, 'back');
      onToast?.('Restarted prototype from start screen');
    }
  };

  // Figma-style Hotspot Hint Trigger on non-clickable tap
  const handleEmptyStageClick = (e) => {
    if (e.target.closest('.prototype-hotspot-btn')) return;

    setIsHotspotPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setIsHotspotPulsing(false);
    }, 700);
  };

  // Touch pointer ripple effect on screen tap
  const handleScreenPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      id: Date.now() + Math.random(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setTouchRipples(r => [...r.slice(-4), ripple]);
    setTimeout(() => {
      setTouchRipples(r => r.filter(it => it.id !== ripple.id));
    }, 380);
  };

  // Load Demo Mobile App Prototype in-memory without polluting the canvas
  const handleLoadDemoPrototype = () => {
    const demo = createDemoMobileAppPrototype(120, 120, stageBg === 'dark' || stageBg === 'dots');
    setVirtualDemoApp(demo);

    setActiveFrameId(demo.frames[0].id);
    setHistory([demo.frames[0].id]);
    setHistoryIndex(0);
    setDeviceType('iphone');
    onToast?.('Loaded interactive E-Commerce Mobile App prototype preview!');
  };

  const demoIds = useMemo(() => {
    return getDemoElementIds(allElements);
  }, [allElements]);

  const hasDemoElements = demoIds.size > 0 || Boolean(virtualDemoApp);

  const handleRemoveDemoPrototype = () => {
    if (virtualDemoApp) {
      setVirtualDemoApp(null);
    }
    if (doodleAPI) {
      const currentScene = doodleAPI.getSceneElementsIncludingDeleted?.() || doodleAPI.getSceneElements?.() || [];
      const allDemoIds = getDemoElementIds(currentScene);
      if (allDemoIds.size > 0) {
        const remaining = currentScene.filter((el) => !allDemoIds.has(el.id));
        doodleAPI.updateScene({
          elements: remaining,
          commitToHistory: true,
        });
      }
    }
    onToast?.('Removed demo prototype screens');
  };

  if (!isOpen) return null;

  const profile = DEVICE_PROFILES[deviceType] || DEVICE_PROFILES.iphone;
  const isFrameless = deviceType === 'responsive';

  const frameW = currentFrame?.width || 390;
  const frameH = currentFrame?.height || 720;

  // Viewport dimensions accounting for device orientation
  let viewportBaseW = profile.width === 'auto' ? frameW : profile.width;
  let viewportBaseH = profile.height === 'auto' ? frameH : profile.height;

  if (orientation === 'landscape' && profile.width !== 'auto') {
    viewportBaseW = profile.height;
    viewportBaseH = profile.width;
  }

  // Exact aspect ratio calculation for content inside viewport
  let contentScale = 1;
  if (fitMode === 'fit') {
    contentScale = Math.min(viewportBaseW / frameW, viewportBaseH / frameH);
  } else if (fitMode === 'fill') {
    contentScale = Math.max(viewportBaseW / frameW, viewportBaseH / frameH);
  } else {
    contentScale = 1; // actual 100%
  }

  const contentRenderW = Math.round(frameW * contentScale);
  const contentRenderH = Math.round(frameH * contentScale);
  const viewportBoxW = isFrameless ? contentRenderW : viewportBaseW;
  const viewportBoxH = isFrameless ? contentRenderH : viewportBaseH;

  const contentOffsetX = Math.round((viewportBoxW - contentRenderW) / 2);
  const contentOffsetY = Math.round((viewportBoxH - contentRenderH) / 2);

  // Outer shell dimensions including bezels and titlebar
  const shellOuterW = viewportBoxW + (isFrameless ? 0 : profile.bezel * 2);
  const shellOuterH = viewportBoxH + (isFrameless ? 0 : profile.bezel * 2) + (profile.hasWindowControls ? 32 : 0);

  // Crucial: Dynamically scale entire device to 100% fit stage without ANY scrollbars
  const availStageW = Math.max(300, windowDimensions.w - 48);
  const availStageH = Math.max(260, windowDimensions.h - 116);
  const stageFitScale = Math.min(1, availStageW / shellOuterW, availStageH / shellOuterH);

  return (
    <div
      ref={containerRef}
      className={`interactive-prototype-player-root stage-bg-${stageBg}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onClick={handleEmptyStageClick}
    >
      {/* ── Floating Top Studio Dock (Concise, Single Line, Crisp Vector Icons) ── */}
      <div className="prototype-studio-dock" onClick={(e) => e.stopPropagation()}>
        {/* Left: Branding & Frame Title */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: stageBg === 'paper' ? '#f4f4f5' : '#27272a',
            border: stageBg === 'paper' ? '1px solid #e4e4e7' : '1px solid #3f3f46',
            color: stageBg === 'paper' ? '#18181b' : '#f4f4f5',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}
        >
          <Play size={10} fill="currentColor" />
          <span>PROTOTYPE PLAYER</span>
        </div>

        {/* Screen Picker */}
        {frames.length > 0 && (
          <select
            aria-label="Select screen"
            value={activeFrameId}
            onChange={(e) => navigateToFrame(e.target.value)}
            style={{
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              border: stageBg === 'paper' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.12)',
              background: stageBg === 'paper' ? '#ffffff' : 'rgba(255,255,255,0.06)',
              color: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '130px',
              whiteSpace: 'nowrap',
            }}
          >
            {frames.map((f, i) => (
              <option key={f.id} value={f.id}>
                {i + 1}. {f.name || 'Untitled Screen'}
              </option>
            ))}
          </select>
        )}

        <div className="prototype-dock-divider" />

        {/* History Nav */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
          <button
            type="button"
            onClick={navigateBack}
            disabled={historyIndex <= 0}
            title="Navigate Back (Left Arrow)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: historyIndex <= 0 ? (stageBg === 'paper' ? '#cbd5e1' : '#52525b') : 'inherit',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            onClick={navigateForward}
            disabled={historyIndex >= history.length - 1}
            title="Navigate Forward (Right Arrow)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: historyIndex >= history.length - 1 ? (stageBg === 'paper' ? '#cbd5e1' : '#52525b') : 'inherit',
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <button
          type="button"
          onClick={restartFlow}
          title="Restart Prototype from beginning (R)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '5px',
            border: 'none',
            background: stageBg === 'paper' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
            color: 'inherit',
            fontSize: '10.5px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <RotateCcw size={10} />
          <span>Restart</span>
        </button>

        <div className="prototype-dock-divider" />

        {/* Device Switcher (Frameless, iPhone, iPad, MacBook) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: stageBg === 'paper' ? '#f1f5f9' : 'rgba(0,0,0,0.25)',
            borderRadius: '6px',
            padding: '2px',
            border: stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
            gap: '1px',
          }}
        >
          {['responsive', 'iphone', 'ipad', 'macbook'].map((profId) => {
            const prof = DEVICE_PROFILES[profId];
            const Icon = prof.icon;
            const isActive = deviceType === prof.id;
            const label = prof.name === 'Frameless Stage' ? 'Frameless' : prof.name.split(' ')[0];
            return (
              <button
                key={prof.id}
                type="button"
                onClick={() => setDeviceType(prof.id)}
                title={`Simulate on ${prof.name}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: isActive
                    ? (stageBg === 'paper' ? '1px solid #d4d4d8' : '1px solid #3f3f46')
                    : '1px solid transparent',
                  background: isActive
                    ? (stageBg === 'paper' ? '#e4e4e7' : '#27272a')
                    : 'transparent',
                  color: isActive
                    ? (stageBg === 'paper' ? '#18181b' : '#ffffff')
                    : (stageBg === 'paper' ? '#64748b' : '#a1a1aa'),
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={11} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Orientation Toggle (Only for devices) */}
        {!isFrameless && (
          <button
            type="button"
            onClick={() => setOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')}
            title={`Rotate to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '5px',
              border: stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
              background: stageBg === 'paper' ? '#ffffff' : 'rgba(255,255,255,0.05)',
              color: 'inherit',
              fontSize: '10.5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={10} />
            <span>{orientation === 'portrait' ? 'Portrait' : 'Landscape'}</span>
          </button>
        )}

        {/* Shell Style Switcher (Doodle vs Studio) - Vector Lucide Icons, NO EMOJIS */}
        {!isFrameless && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: stageBg === 'paper' ? '#f1f5f9' : 'rgba(0,0,0,0.25)',
              borderRadius: '6px',
              padding: '2px',
              border: stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
              gap: '1px',
            }}
          >
            <button
              type="button"
              onClick={() => setDeviceStyle('doodle')}
              title="Hand-drawn Doodle Shell"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                border: deviceStyle === 'doodle'
                  ? (stageBg === 'paper' ? '1px solid #d4d4d8' : '1px solid #3f3f46')
                  : '1px solid transparent',
                background: deviceStyle === 'doodle'
                  ? (stageBg === 'paper' ? '#e4e4e7' : '#27272a')
                  : 'transparent',
                color: deviceStyle === 'doodle'
                  ? (stageBg === 'paper' ? '#18181b' : '#ffffff')
                  : (stageBg === 'paper' ? '#64748b' : '#a1a1aa'),
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Pencil size={11} />
              <span>Doodle Shell</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceStyle('studio')}
              title="Hardware Studio Shell"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                border: deviceStyle === 'studio'
                  ? (stageBg === 'paper' ? '1px solid #d4d4d8' : '1px solid #3f3f46')
                  : '1px solid transparent',
                background: deviceStyle === 'studio'
                  ? (stageBg === 'paper' ? '#e4e4e7' : '#27272a')
                  : 'transparent',
                color: deviceStyle === 'studio'
                  ? (stageBg === 'paper' ? '#18181b' : '#ffffff')
                  : (stageBg === 'paper' ? '#64748b' : '#a1a1aa'),
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Smartphone size={11} />
              <span>Studio Shell</span>
            </button>
          </div>
        )}

        <div className="prototype-dock-divider" />

        {/* Load Demo App button */}
        <button
          type="button"
          onClick={handleLoadDemoPrototype}
          title="Generate a fully functional 3-screen interactive e-commerce mobile app prototype"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '5px',
            border: stageBg === 'paper' ? '1px solid #d4d4d8' : '1px solid #3f3f46',
            background: stageBg === 'paper' ? '#f4f4f5' : '#27272a',
            color: stageBg === 'paper' ? '#18181b' : '#f4f4f5',
            fontSize: '10.5px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={11} />
          <span>Load Demo App</span>
        </button>

        {/* Remove Demo button if demo screens exist on canvas */}
        {hasDemoElements && (
          <button
            type="button"
            onClick={handleRemoveDemoPrototype}
            title="Remove demo screens from your canvas document"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '5px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontSize: '10.5px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Trash2 size={11} />
            <span>Remove Demo</span>
          </button>
        )}

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={() => setSoundEnabled(v => !v)}
          title={soundEnabled ? 'Tactile Click Audio On' : 'Muted'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: soundEnabled ? (stageBg === 'paper' ? '#18181b' : '#ffffff') : (stageBg === 'paper' ? '#a1a1aa' : '#71717a'),
            cursor: 'pointer',
          }}
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>

        {/* Stage Theme Toggle */}
        <button
          type="button"
          onClick={() => setStageBg(b => b === 'dark' ? 'paper' : 'dark')}
          title="Toggle Canvas Theme (Dark / Light)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {stageBg === 'paper' ? <Moon size={13} /> : <Sun size={13} />}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          title="Exit Prototype Player (Esc)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '5px',
            border: 'none',
            background: stageBg === 'paper' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* ── Main Simulator Stage (Zero Scrollbars Guaranteed) ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          width: '100vw',
          height: '100vh',
        }}
        onClick={handleEmptyStageClick}
      >
        {/* Empty State Banner if no frames found */}
        {frames.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              maxWidth: '460px',
              padding: '36px 32px',
              borderRadius: '20px',
              background: stageBg === 'paper' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(20, 20, 24, 0.92)',
              border: stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid #27272a',
              boxShadow: stageBg === 'paper' ? '0 20px 40px rgba(0,0,0,0.06)' : '0 25px 60px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: stageBg === 'paper' ? '#f4f4f5' : '#27272a',
                border: stageBg === 'paper' ? '1px solid #e4e4e7' : '1px solid #3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: stageBg === 'paper' ? '#18181b' : '#ffffff',
              }}
            >
              <Smartphone size={30} strokeWidth={2} />
            </div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: '0 0 8px 0',
                color: stageBg === 'paper' ? '#0f172a' : '#f8fafc',
                letterSpacing: '-0.01em',
              }}
            >
              No Screen Frames on Canvas Yet
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: stageBg === 'paper' ? '#64748b' : '#a1a1aa',
                lineHeight: 1.6,
                margin: '0 0 22px 0',
              }}
            >
              Prototypes run inside Frame containers. Draw frames on your canvas and link buttons between them, or click below to immediately load a pre-wired demo app!
            </p>
            <button
              type="button"
              onClick={handleLoadDemoPrototype}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: stageBg === 'paper' ? '#18181b' : '#ffffff',
                color: stageBg === 'paper' ? '#ffffff' : '#09090b',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer',
                boxShadow: stageBg === 'paper'
                  ? '0 4px 16px rgba(0, 0, 0, 0.16)'
                  : '0 4px 20px rgba(255, 255, 255, 0.18)',
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={14} />
              <span>Load 3-Screen Mobile App Demo</span>
            </button>
          </div>
        ) : (
          /* Device Simulation Shell with Dynamic Scale Fitting */
          <div
            className={`prototype-device-shell device-${deviceType} device-style-${isFrameless ? 'frameless' : deviceStyle} ${transitionAnimClass}`}
            style={{
              borderRadius: isFrameless ? '12px' : `${profile.radius}px`,
              padding: isFrameless ? '0px' : `${profile.bezel}px`,
              transform: stageFitScale < 1 ? `scale(${stageFitScale})` : 'none',
              transformOrigin: 'center center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MacBook Title Bar Controls */}
            {profile.hasWindowControls && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  background: deviceStyle === 'doodle' ? '#202026' : '#18181d',
                  borderTopLeftRadius: `${profile.radius}px`,
                  borderTopRightRadius: `${profile.radius}px`,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    color: '#a1a1aa',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 10px',
                    borderRadius: '5px',
                    margin: '0 32px',
                  }}
                >
                  <Lock size={10} style={{ opacity: 0.7 }} />
                  <span>doodledesk.preview/{currentFrame?.name?.toLowerCase().replace(/\s+/g, '-') || 'screen'}</span>
                </div>
              </div>
            )}

            {/* Device Screen Viewport */}
            <div
              className="prototype-viewport-container"
              style={{
                width: `${viewportBoxW}px`,
                height: `${viewportBoxH}px`,
                borderRadius: isFrameless ? '12px' : `${Math.max(6, profile.radius - profile.bezel)}px`,
                backgroundColor: currentFrame?.backgroundColor && currentFrame.backgroundColor !== 'transparent'
                  ? currentFrame.backgroundColor
                  : (stageBg === 'paper' ? '#ffffff' : '#121215'),
              }}
              onPointerDown={handleScreenPointerDown}
              onClick={handleEmptyStageClick}
            >
              {/* Dynamic Island for Portrait iPhone */}
              {profile.hasDynamicIsland && orientation === 'portrait' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      top: '7px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '76px',
                      height: '18px',
                      borderRadius: '10px',
                      backgroundColor: '#000000',
                      zIndex: 35,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 7px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#1c1917' }} />
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#09090b' }} />
                  </div>

                  {/* iOS Status Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '5px',
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0 18px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: stageBg === 'paper' ? '#18181b' : '#f4f4f5',
                      zIndex: 30,
                      pointerEvents: 'none',
                    }}
                  >
                    <span>9:41</span>
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span>5G</span>
                      <span>100%</span>
                    </span>
                  </div>
                </>
              )}

              {/* Aspect-Ratio Preserved Screen Content & Hotspot Overlay */}
              <div
                className="prototype-screen-content"
                style={{
                  left: `${contentOffsetX}px`,
                  top: `${contentOffsetY}px`,
                  width: `${contentRenderW}px`,
                  height: `${contentRenderH}px`,
                }}
              >
                {/* Real High-DPI Doodle Canvas Rendering */}
                <canvas
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                />

                {/* Interactive Clickable Hotspots */}
                {hotspots.map((spot) => (
                  <button
                    key={spot.elementId}
                    type="button"
                    className={`prototype-hotspot-btn ${isHotspotPulsing ? 'hotspot-pulsing' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToFrame(spot.targetFrameId);
                    }}
                    onMouseEnter={() => setHoveredHotspot(spot)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                    title={`Click to navigate to ${spot.targetFrameName}`}
                    style={{
                      left: `${spot.x * contentScale}px`,
                      top: `${spot.y * contentScale}px`,
                      width: `${spot.width * contentScale}px`,
                      height: `${spot.height * contentScale}px`,
                      border: isHotspotPulsing
                        ? '2px solid #f59e0b'
                        : (showHotspotHints ? '1.5px dashed rgba(245, 158, 11, 0.55)' : 'none'),
                      backgroundColor: isHotspotPulsing
                        ? 'rgba(245, 158, 11, 0.25)'
                        : (showHotspotHints ? 'rgba(245, 158, 11, 0.1)' : 'transparent'),
                    }}
                  />
                ))}
              </div>

              {/* Touch Ripples */}
              {touchRipples.map((rip) => (
                <div
                  key={rip.id}
                  className="prototype-touch-ripple"
                  style={{
                    left: `${rip.x}px`,
                    top: `${rip.y}px`,
                  }}
                />
              ))}

              {/* Home Indicator Bar */}
              {profile.hasHomeBar && orientation === 'portrait' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '84px',
                    height: '3.5px',
                    borderRadius: '4px',
                    backgroundColor: stageBg === 'paper' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
                    zIndex: 35,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Figma-Style "Click Highlighted Area to Navigate" Toast */}
        {isHotspotPulsing && (
          <div
            style={{
              position: 'fixed',
              bottom: '56px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: stageBg === 'paper' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(24, 24, 28, 0.95)',
              color: stageBg === 'paper' ? '#18181b' : '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
              border: stageBg === 'paper' ? '1px solid #e4e4e7' : '1px solid #3f3f46',
              zIndex: 9999,
              pointerEvents: 'none',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <Sparkles size={13} style={{ color: '#f59e0b' }} />
            <span>Click highlighted area to navigate</span>
          </div>
        )}

        {/* Hovered Hotspot Floating Tooltip */}
        {hoveredHotspot && (
          <div
            style={{
              position: 'fixed',
              top: '64px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: stageBg === 'paper' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(24, 24, 28, 0.95)',
              color: stageBg === 'paper' ? '#18181b' : '#ffffff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              border: stageBg === 'paper' ? '1px solid #e4e4e7' : '1px solid #3f3f46',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <ArrowRight size={12} />
            <span>Navigates to: <strong>{hoveredHotspot.targetFrameName}</strong></span>
          </div>
        )}
      </main>

      {/* ── Screen Flow Drawer (Collapsible) ── */}
      {isDrawerOpen && (
        <aside
          className="prototype-screens-drawer"
          style={{
            position: 'fixed',
            bottom: '56px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: stageBg === 'paper' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(18, 18, 22, 0.96)',
            border: stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '92vw',
            overflowX: 'auto',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '4px', whiteSpace: 'nowrap' }}>
            <Layers size={14} style={{ color: stageBg === 'paper' ? '#18181b' : '#ffffff' }} />
            <span style={{ fontSize: '11.5px', fontWeight: 700 }}>Flow Map:</span>
          </div>

          {frames.map((f, i) => {
            const isActive = f.id === activeFrameId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => navigateToFrame(f.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  padding: '7px 11px',
                  borderRadius: '8px',
                  border: isActive
                    ? (stageBg === 'paper' ? '2px solid #18181b' : '2px solid #ffffff')
                    : (stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)'),
                  background: isActive
                    ? (stageBg === 'paper' ? '#f4f4f5' : '#27272a')
                    : (stageBg === 'paper' ? '#ffffff' : '#1e1e24'),
                  color: 'inherit',
                  cursor: 'pointer',
                  minWidth: '120px',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9.5px', color: stageBg === 'paper' ? '#71717a' : '#a1a1aa', fontWeight: 700 }}>Screen #{i + 1}</span>
                  {isActive && <CheckCircle2 size={11} style={{ color: stageBg === 'paper' ? '#18181b' : '#ffffff' }} />}
                </div>
                <strong style={{ fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.name || 'Untitled'}
                </strong>
                <small style={{ fontSize: '9.5px', color: stageBg === 'paper' ? '#71717a' : '#a1a1aa' }}>
                  {Math.round(f.width || 0)} × {Math.round(f.height || 0)} px
                </small>
              </button>
            );
          })}
        </aside>
      )}

      {/* ── Floating Bottom Status Capsule (Clean Single-Line Alignment, Zero Text Wrapping) ── */}
      <div className="prototype-bottom-pill" onClick={(e) => e.stopPropagation()}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <span>CURRENT SCREEN:</span>
          <strong style={{ color: stageBg === 'paper' ? '#18181b' : '#ffffff' }}>
            {currentFrame?.name || 'Untitled'}
          </strong>
        </span>

        <span className="prototype-dock-divider" style={{ height: '14px', margin: '0 2px' }} />

        <span style={{ whiteSpace: 'nowrap' }}>
          {hotspots.length} interactive {hotspots.length === 1 ? 'hotspot' : 'hotspots'}
        </span>

        <span className="prototype-dock-divider" style={{ height: '14px', margin: '0 2px' }} />

        {/* Screens Drawer Toggle */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(v => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '5px',
            border: isDrawerOpen
              ? (stageBg === 'paper' ? '1px solid #d4d4d8' : '1px solid #3f3f46')
              : (stageBg === 'paper' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)'),
            background: isDrawerOpen
              ? (stageBg === 'paper' ? '#e4e4e7' : '#27272a')
              : 'transparent',
            color: isDrawerOpen
              ? (stageBg === 'paper' ? '#18181b' : '#ffffff')
              : 'inherit',
            cursor: 'pointer',
            fontSize: '11px',
            whiteSpace: 'nowrap',
          }}
        >
          <Layers size={11} />
          <span>Screens ({frames.length})</span>
        </button>

        <span className="prototype-dock-divider" style={{ height: '14px', margin: '0 2px' }} />

        {/* Hotspots visibility toggle */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={showHotspotHints}
            onChange={(e) => setShowHotspotHints(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: stageBg === 'paper' ? '#18181b' : '#ffffff' }}
          />
          <span>Highlight clickable hotspots</span>
        </label>

        <span className="prototype-dock-divider" style={{ height: '14px', margin: '0 2px' }} />

        <span style={{ whiteSpace: 'nowrap', opacity: 0.8, fontSize: '10.5px' }}>
          Tip: Tap anywhere on screen to flash hints
        </span>
      </div>
    </div>
  );
}

export default InteractivePrototypePlayer;
