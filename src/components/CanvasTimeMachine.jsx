import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  History,
} from 'lucide-react';

export const CanvasTimeMachine = memo(function CanvasTimeMachine({
  isOpen,
  onClose,
  doodleAPI,
  canvasAPI,
  theme,
  // When presentation is active at the same time, we shift the bar up
  isPresentationActive,
  standalone = true,
}) {
  const api = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const isLight = theme === 'light' || (!theme && typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  const [timeline, setTimeline] = useState({ steps: [], currentIndex: 0 });
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const playTimerRef = useRef(null);

  // Initialize timeline data when opening
  useEffect(() => {
    if (!isOpen || !api) {
      setIsPlaying(false);
      return;
    }

    const data = api.getTimeMachineTimeline?.();
    if (data && data.steps.length > 0) {
      setTimeline(data);
      setActiveStep(data.currentIndex);
    } else {
      // Fallback single-step timeline if no history yet
      const count = api.getSceneElements?.()?.length || 0;
      setTimeline({
        steps: [{ index: 0, timestamp: Date.now(), count, isCurrent: true }],
        currentIndex: 0,
      });
      setActiveStep(0);
    }
  }, [isOpen, api]);

  // Preview the active step on canvas
  const handleStepChange = useCallback((newStep) => {
    if (!api || timeline.steps.length === 0) return;
    const clamped = Math.max(0, Math.min(newStep, timeline.steps.length - 1));
    setActiveStep(clamped);
    api.previewTimeMachineStep?.(clamped);
  }, [api, timeline.steps.length]);

  // Handle Play / Pause Replay
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const delay = Math.max(120, Math.floor(650 / playbackSpeed));
    playTimerRef.current = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= timeline.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        api?.previewTimeMachineStep?.(next);
        return next;
      });
    }, delay);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, timeline.steps.length, api]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        handleStepChange(activeStep - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        handleStepChange(activeStep + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIsPlaying(false);
        handleStepChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIsPlaying(false);
        handleStepChange(timeline.steps.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeStep, timeline.steps.length, handleStepChange]);

  const handleCancel = () => {
    setIsPlaying(false);
    api?.exitTimeMachinePreview?.();
    onClose();
  };

  const handleRestore = () => {
    setIsPlaying(false);
    api?.restoreTimeMachineStep?.(activeStep);
    onClose();
  };

  if (!isOpen) return null;

  const totalSteps = timeline.steps.length;

  // When presentation bar is also active, push the time machine bar higher so
  // the two bars stack instead of overlapping.
  const bottomOffset = isPresentationActive ? 92 : 24;

  const deck = (
    <div
      role="region"
      aria-label="Canvas Time Machine"
      className="presentation-deck"
      style={{
        boxShadow: isLight
          ? '0 16px 40px rgba(0, 0, 0, 0.12)'
          : '0 16px 45px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
      }}
    >
      {/* Badge — concise */}
      <div className="presentation-badge">
        <History size={14} />
        <span>Time Machine{isPlaying ? ': Playing…' : ''}</span>
      </div>

      <div className="presentation-deck-divider" />

      {/* ← Previous */}
      <button
        className="presentation-btn"
        onClick={() => {
          setIsPlaying(false);
          handleStepChange(activeStep - 1);
        }}
        disabled={activeStep === 0}
        title="Previous Step (←)"
        aria-label="Previous step"
      >
        <ChevronLeft size={17} />
      </button>

      {/* Step counter — matches "1 / N" layout */}
      <div className="presentation-counter">
        <span>{activeStep + 1} / {Math.max(1, totalSteps)}</span>
      </div>

      {/* → Next */}
      <button
        className="presentation-btn"
        onClick={() => {
          setIsPlaying(false);
          handleStepChange(activeStep + 1);
        }}
        disabled={activeStep >= totalSteps - 1}
        title="Next Step (→)"
        aria-label="Next step"
      >
        <ChevronRight size={17} />
      </button>

      <div className="presentation-deck-divider" />

      {/* ▶ / ⏸ Play-Pause */}
      <button
        className={`presentation-btn ${isPlaying ? 'active' : ''}`}
        onClick={() => {
          if (activeStep >= totalSteps - 1 && !isPlaying) handleStepChange(0);
          setIsPlaying((p) => !p);
        }}
        title={isPlaying ? 'Pause (Space)' : 'Play timelapse (Space)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '1px' }} />}
      </button>

      {/* Speed toggle — compact, no divider needed */}
      <button
        className="presentation-btn"
        onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
        title="Playback speed"
        style={{ width: '32px', fontSize: '11px', fontWeight: 700 }}
      >
        {playbackSpeed}x
      </button>

      <div className="presentation-deck-divider" />

      {/* Restore */}
      <button
        className="presentation-restore-btn"
        onClick={handleRestore}
        title="Restore canvas to this snapshot"
      >
        <Check size={13} strokeWidth={2.5} />
        <span>Restore</span>
      </button>

      <div className="presentation-deck-divider" />

      {/* Exit — identical to Presentation exit button */}
      <button
        className="presentation-exit-btn"
        onClick={handleCancel}
        title="Exit Time Machine (Esc)"
        aria-label="Exit Time Machine"
      >
        <X size={14} />
        <span>Exit</span>
        <kbd>Esc</kbd>
      </button>
    </div>
  );

  if (!standalone) {
    return deck;
  }

  return (
    <div
      role="region"
      aria-label="Canvas Time Machine"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10002, // above PresentationMode (10001)
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: `${bottomOffset}px`,
        transition: 'padding-bottom 0.2s ease',
      }}
    >
      {deck}
    </div>
  );
});
