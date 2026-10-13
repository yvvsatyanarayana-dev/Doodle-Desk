import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Tv,
} from 'lucide-react';

export function PresentationMode({ isActive, onClose, doodleAPI, canvasAPI, standalone = true }) {
  doodleAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      if (slide.isSynthetic) {
        doodleAPI.scrollToContent(undefined, { fitToContent: true, animate: true, duration: 420 });
      } else {
        doodleAPI.scrollToContent([slide], { fitToContent: true, animate: true, duration: 420 });
      }
    }
  }, [doodleAPI, slides]);

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

  const deck = (
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

      {/* Laser Pointer Tool */}
      <button
        className={`presentation-btn ${isLaserActive ? 'active' : ''}`}
        onClick={toggleLaser}
        title="Laser Pointer (K)"
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
