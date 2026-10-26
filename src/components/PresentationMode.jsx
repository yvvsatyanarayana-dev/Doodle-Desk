import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Tv,
  Film,
  FileText,
  Layers,
} from 'lucide-react';

export function PresentationMode({ isActive, onClose, doodleAPI, canvasAPI, standalone = true }) {
  doodleAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [is3DDirectorActive, setIs3DDirectorActive] = useState(true);

  // Extract all frame elements from the scene as slides
  const slides = useMemo(() => {
    if (!doodleAPI) return [];
    const elements = doodleAPI.getSceneElements?.() || [];
    const frameElements = elements.filter(el => el.type === 'frame' && !el.isDeleted);

    if (frameElements.length > 0) {
      // Sort frames primarily left-to-right, top-to-bottom
      return frameElements.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 100) return a.y - b.y;
        return a.x - b.x;
      });
    }

    // Fallback: If no frames exist, treat all canvas elements as one overview slide
    if (elements.filter(el => !el.isDeleted).length > 0) {
      return [{
        id: 'overview-slide',
        name: 'Canvas Overview',
        isSynthetic: true,
      }];
    }

    return [];
  }, [doodleAPI, isActive]);

  // Navigate to slide with cinematic smooth easing
  const goToSlide = useCallback((index) => {
    if (!doodleAPI || slides.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(index, slides.length - 1));
    setCurrentSlideIndex(clampedIndex);

    const slide = slides[clampedIndex];
    if (slide && doodleAPI?.scrollToContent) {
      const duration = is3DDirectorActive ? 520 : 380;
      if (slide.isSynthetic) {
        doodleAPI.scrollToContent(undefined, { fitToContent: true, animate: true, duration });
      } else {
        doodleAPI.scrollToContent([slide], { fitToContent: true, animate: true, duration });
      }
    }
  }, [doodleAPI, slides, is3DDirectorActive]);

  // Next Slide
  const nextSlide = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      goToSlide(currentSlideIndex + 1);
    }
  }, [currentSlideIndex, slides.length, goToSlide]);

  // Prev Slide
  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      goToSlide(currentSlideIndex - 1);
    }
  }, [currentSlideIndex, goToSlide]);

  // Initialize first slide on open
  useEffect(() => {
    if (isActive) {
      setCurrentSlideIndex(0);
      goToSlide(0);
    }
  }, [isActive, goToSlide]);

  // Toggle Laser Pointer
  const toggleLaser = useCallback(() => {
    if (!doodleAPI) return;
    const nextLaser = !isLaserActive;
    setIsLaserActive(nextLaser);
    doodleAPI.setActiveTool({ type: nextLaser ? 'laser' : 'selection' });
  }, [doodleAPI, isLaserActive]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') {
        if (e.key === 'Escape') {
          e.stopPropagation();
          document.activeElement.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
        return;
      }

      if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'k') {
        toggleLaser();
      }

      if (e.key.toLowerCase() === 't') {
        setIsTrayOpen(prev => !prev);
      }

      if (e.key.toLowerCase() === 'n') {
        setIsNotesOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isActive, nextSlide, prevSlide, onClose, toggleLaser]);

  // Toggle Browser Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isActive) return null;

  const currentSlide = slides[currentSlideIndex];
  const slideTitle = currentSlide?.name || `Slide ${currentSlideIndex + 1}`;
  const speakerNotes = currentSlide?.notes || currentSlide?.text || '';

  const deck = (
    <div className="presentation-deck-container">
      {/* 3D Cinematic Vignette Overlay */}
      {is3DDirectorActive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 120px rgba(0, 0, 0, 0.45)',
            zIndex: 9998,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}

      {/* Speaker Notes Drawer */}
      {isNotesOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            width: '320px',
            maxHeight: '260px',
            background: 'rgba(24, 24, 27, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '16px',
            color: '#f4f4f5',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            zIndex: 10003,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a1a1aa' }}>
              Speaker Notes ({slideTitle})
            </span>
            <button
              type="button"
              onClick={() => setIsNotesOpen(false)}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}
              aria-label="Close speaker notes"
            >
              <X size={14} />
            </button>
          </div>
          {currentSlide?.isSynthetic ? (
            <p style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, color: '#a1a1aa' }}>
              Frames act as slides. Draw frames on the canvas to attach slide-specific speaker notes.
            </p>
          ) : (
            <textarea
              value={currentSlide?.notes || ''}
              onChange={(e) => {
                const newNotes = e.target.value;
                if (!currentSlide || !doodleAPI) return;
                const all = doodleAPI.getSceneElements?.() || [];
                const updated = all.map((el) =>
                  el.id === currentSlide.id ? { ...el, notes: newNotes } : el
                );
                doodleAPI.updateScene({ elements: updated, commitToHistory: false });
              }}
              placeholder="Type speaker notes, cues, and talking points for this frame..."
              rows={4}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#f4f4f5',
                fontSize: '13px',
                lineHeight: '1.5',
                padding: '8px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              aria-label="Speaker notes content"
            />
          )}
        </div>
      )}

      {/* Slide Tray Thumbnails */}
      {isTrayOpen && slides.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(24, 24, 27, 0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            zIndex: 10003,
            maxWidth: '90vw',
            overflowX: 'auto',
          }}
        >
          {slides.map((s, idx) => (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => goToSlide(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '84px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: idx === currentSlideIndex ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                background: idx === currentSlideIndex ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '10px', opacity: 0.6, marginBottom: '2px' }}>#{idx + 1}</span>
              <span style={{ maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name || `Slide ${idx + 1}`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Control Deck */}
      <div className="presentation-deck">
        <div className="presentation-badge">
          <Tv size={14} />
          <span>Present: <strong>{slideTitle}</strong></span>
        </div>

        <div className="presentation-deck-divider" />

        <button
          className="presentation-btn"
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          title="Previous Slide (← / Backspace)"
          aria-label="Previous slide"
        >
          <ChevronLeft size={17} />
        </button>

        <div className="presentation-counter">
          <span>{currentSlideIndex + 1} / {Math.max(slides.length, 1)}</span>
        </div>

        <button
          className="presentation-btn"
          onClick={nextSlide}
          disabled={currentSlideIndex >= slides.length - 1}
          title="Next Slide (→ / Space)"
          aria-label="Next slide"
        >
          <ChevronRight size={17} />
        </button>

        <div className="presentation-deck-divider" />

        {/* 3D Spatial Director Mode Toggle */}
        <button
          className={`presentation-btn ${is3DDirectorActive ? 'active' : ''}`}
          onClick={() => setIs3DDirectorActive(prev => !prev)}
          title="3D Spatial Director Mode"
          aria-label="3D Director mode"
        >
          <Film size={15} />
        </button>

        {/* Slide Tray */}
        <button
          className={`presentation-btn ${isTrayOpen ? 'active' : ''}`}
          onClick={() => setIsTrayOpen(prev => !prev)}
          title="Slide Thumbnails Tray (T)"
          aria-label="Slide tray"
        >
          <Layers size={15} />
        </button>

        {/* Speaker Notes */}
        <button
          className={`presentation-btn ${isNotesOpen ? 'active' : ''}`}
          onClick={() => setIsNotesOpen(prev => !prev)}
          title="Speaker Notes (N)"
          aria-label="Speaker notes"
        >
          <FileText size={15} />
        </button>

        {/* Laser Pointer Tool */}
        <button
          className={`presentation-btn ${isLaserActive ? 'active' : ''}`}
          onClick={toggleLaser}
          title="Laser Pointer (L / K)"
          aria-label="Laser pointer"
        >
          <Sparkles size={15} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          className="presentation-btn"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        <div className="presentation-deck-divider" />

        {/* Exit */}
        <button
          className="presentation-exit-btn"
          onClick={onClose}
          title="Exit Presentation (Esc)"
          aria-label="Exit presentation"
        >
          <X size={14} />
          <span>Exit</span>
          <kbd>Esc</kbd>
        </button>
      </div>
    </div>
  );

  if (!standalone) {
    return deck;
  }

  return (
    <div className="presentation-overlay">
      {deck}
    </div>
  );
}
