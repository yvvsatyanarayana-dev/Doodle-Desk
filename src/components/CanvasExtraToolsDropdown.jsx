import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Frame,
  Code,
  PaintBucket,
  LassoSelect,
  Wand2,
  StickyNote,
  Ruler,
  Palette,
} from 'lucide-react';

/**
 * CanvasExtraToolsDropdown
 * Attaches directly to canvas toolbar "Extra Tools" button (the wand icon),
 * providing the clean popover menu with:
 * - Insert image (9)
 * - Frame tool (F)
 * - Web Embed
 * - Draw to shape (Shift+X)
 * - Laser pointer (K)
 * - Bucket fill (B)
 * - Lasso selection
 * - Mermaid to Doodle
 */
function CanvasExtraToolsDropdownComponent({
  doodleAPI,
  canvasAPI,
  isDrawToShapeActive,
  onToggleDrawToShape,
  isLaserActive,
  onToggleLaser,
  onSelectCanvasTool,
  isBucketActive,
  onToggleBucket,
  isLassoActive,
  onToggleLasso,
  isRulerActive,
  onToggleRuler,
  onOpenStickyNotes,
  onOpenColorPalette,
  onOpenCommandPalette,
  onOpenTemplates,
  onOpenMermaid,
}) {
  const activeAPI = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 56, left: 100 });
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Position calculation relative to extra tools button
  const updatePosition = useCallback(() => {
    const trigger = document.querySelector('[data-collab-laser-launcher]') || document.querySelector('.App-toolbar__extra-tools-trigger');
    if (!trigger) return;

    triggerRef.current = trigger;
    const rect = trigger.getBoundingClientRect();
    const targetLeft = Math.max(8, Math.min(window.innerWidth - 240, rect.right - 230));
    setDropdownPos({
      top: Math.min(window.innerHeight - 300, rect.bottom + 6),
      left: targetLeft,
    });
  }, []);

  // Bind to extra tools trigger button
  useEffect(() => {
    let cleanupTrigger = null;

    const attachTrigger = () => {
      const trigger = document.querySelector('.App-toolbar__extra-tools-trigger');
      if (!trigger) return false;

      triggerRef.current = trigger;

      const handlePointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        updatePosition();
        setIsOpen((prev) => !prev);
      };

      const handlePrevent = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      trigger.addEventListener('pointerdown', handlePointerDown, true);
      trigger.addEventListener('click', handlePrevent, true);
      trigger.addEventListener('dblclick', handlePrevent, true);

      cleanupTrigger = () => {
        trigger.removeEventListener('pointerdown', handlePointerDown, true);
        trigger.removeEventListener('click', handlePrevent, true);
        trigger.removeEventListener('dblclick', handlePrevent, true);
      };
      return true;
    };

    if (!attachTrigger()) {
      const observer = new MutationObserver(() => {
        if (attachTrigger()) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
        if (cleanupTrigger) cleanupTrigger();
      };
    }

    return () => {
      if (cleanupTrigger) cleanupTrigger();
    };
  }, [updatePosition]);

  // Manage trigger highlight when custom tools are active
  useEffect(() => {
    const trigger = document.querySelector('.App-toolbar__extra-tools-trigger');
    if (!trigger) return;

    if (isDrawToShapeActive || isLaserActive || isBucketActive || isLassoActive || isOpen) {
      trigger.classList.add('App-toolbar__extra-tools-trigger--selected');
      trigger.classList.add('custom-active-tool-highlight');
    } else {
      trigger.classList.remove('App-toolbar__extra-tools-trigger--selected');
      trigger.classList.remove('custom-active-tool-highlight');
    }
  }, [isDrawToShapeActive, isLaserActive, isBucketActive, isLassoActive, isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [isOpen]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Shift + X: Toggle Draw to Shape
      if (e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        onToggleDrawToShape();
      }
      // K: Toggle Laser Pointer
      else if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        onToggleLaser();
      }
      // B: Toggle Bucket Fill
      else if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        onToggleBucket();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleDrawToShape, onToggleLaser, onToggleBucket]);

  // Tool Selection Handlers
  const handleSelectFrame = () => {
    setIsOpen(false);
    if (onSelectCanvasTool) onSelectCanvasTool('frame');
    else activeAPI?.setActiveTool?.({ type: 'frame' });
  };

  const handleSelectEmbed = () => {
    setIsOpen(false);
    if (onSelectCanvasTool) onSelectCanvasTool('embeddable');
    else activeAPI?.setActiveTool?.({ type: 'embeddable' });
  };

  const handleSelectDrawToShape = () => {
    setIsOpen(false);
    onToggleDrawToShape();
  };

  const handleSelectLaser = () => {
    setIsOpen(false);
    onToggleLaser();
  };

  const handleSelectBucket = () => {
    setIsOpen(false);
    onToggleBucket();
  };

  const handleSelectLasso = () => {
    setIsOpen(false);
    onToggleLasso();
  };

  const handleSelectMermaid = () => {
    setIsOpen(false);
    if (onOpenMermaid) {
      onOpenMermaid();
      return;
    }
    if (activeAPI) {
      activeAPI.updateScene?.({
        appState: {
          openDialog: { name: 'ttd', tab: 'mermaid' },
        },
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="canvas-extra-tools-popover"
      style={{
        position: 'fixed',
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 75px)',
        overflowY: 'auto',
        zIndex: 10000,
      }}
    >
      {/* Frame tool (F) */}
      <div className="canvas-tool-menu-item" onClick={handleSelectFrame}>
        <Frame size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Frame tool</span>
        <span className="canvas-tool-menu-shortcut">F</span>
      </div>

      {/* Web Embed */}
      <div className="canvas-tool-menu-item" onClick={handleSelectEmbed}>
        <Code size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Web Embed</span>
      </div>

      {/* Draw to shape (Shift+X) */}
      <div
        className={`canvas-tool-menu-item ${isDrawToShapeActive ? 'selected' : ''}`}
        onClick={handleSelectDrawToShape}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="canvas-tool-menu-icon">
          <circle cx="9" cy="9" r="6" />
          <rect x="9" y="9" width="11" height="11" rx="2" />
        </svg>
        <span className="canvas-tool-menu-label">Draw to shape</span>
        <span className="canvas-tool-menu-shortcut">Shift+X</span>
      </div>

      {/* Laser pointer (K) */}
      <div
        className={`canvas-tool-menu-item ${isLaserActive ? 'selected' : ''}`}
        onClick={handleSelectLaser}
      >
        <Wand2 size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Laser pointer</span>
        <span className="canvas-tool-menu-shortcut">K</span>
      </div>

      {/* Bucket fill (B) */}
      <div
        className={`canvas-tool-menu-item ${isBucketActive ? 'selected' : ''}`}
        onClick={handleSelectBucket}
      >
        <PaintBucket size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Bucket fill</span>
        <span className="canvas-tool-menu-shortcut">B</span>
      </div>

      {/* Lasso selection */}
      <div
        className={`canvas-tool-menu-item ${isLassoActive ? 'selected' : ''}`}
        onClick={handleSelectLasso}
      >
        <LassoSelect size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Lasso selection</span>
      </div>

      {/* Sticky Notes & Cards */}
      <div
        className="canvas-tool-menu-item"
        onClick={() => {
          setIsOpen(false);
          onOpenStickyNotes?.();
        }}
      >
        <StickyNote size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Sticky Notes & Cards</span>
        <span className="canvas-tool-menu-shortcut">N</span>
      </div>

      {/* Precision Ruler Guide */}
      <div
        className={`canvas-tool-menu-item ${isRulerActive ? 'selected' : ''}`}
        onClick={() => {
          setIsOpen(false);
          onToggleRuler?.();
        }}
      >
        <Ruler size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Precision Ruler & Compass</span>
        <span className="canvas-tool-menu-shortcut">Shift+R</span>
      </div>

      {/* Color Palette Studio */}
      <div
        className="canvas-tool-menu-item"
        onClick={() => {
          setIsOpen(false);
          onOpenColorPalette?.();
        }}
      >
        <Palette size={15} className="canvas-tool-menu-icon" />
        <span className="canvas-tool-menu-label">Color Palette Studio</span>
        <span className="canvas-tool-menu-shortcut">Shift+C</span>
      </div>

      {/* Divider */}
      <div className="canvas-tool-menu-divider" />

      {/* Mermaid to Doodle */}
      <div className="canvas-tool-menu-item" onClick={handleSelectMermaid}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="canvas-tool-menu-icon">
          <path d="M12 2L15 9L22 9L16.5 13.5L18.5 20.5L12 16L5.5 20.5L7.5 13.5L2 9L9 9Z" />
        </svg>
        <span className="canvas-tool-menu-label">Mermaid to Doodle</span>
      </div>
    </div>
  );
}

export const CanvasExtraToolsDropdown = memo(CanvasExtraToolsDropdownComponent);

