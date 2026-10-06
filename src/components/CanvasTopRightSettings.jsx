import React, { useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Settings } from 'lucide-react';

/**
 * CanvasTopRightSettings
 * Positions a Settings / Preferences button directly alongside Library button
 * in the top-right canvas area, styled identically (36x36px rounded obsidian pill).
 */
function CanvasTopRightSettingsComponent({ isOpen, onTogglePreferences }) {
  const [targetNode, setTargetNode] = useState(null);

  useEffect(() => {
    const locateTarget = () => {
      const el = document.querySelector('.layer-ui__wrapper__top-right') || document.querySelector('.doodle-canvas-root .layer-ui__wrapper__top-right');
      if (el) {
        setTargetNode(el);
        return true;
      }
      return false;
    };

    if (!locateTarget()) {
      const observer = new MutationObserver(() => {
        if (locateTarget()) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
  }, []);

  const buttonContent = (
    <button
      type="button"
      className={`ToolIcon ToolIcon_type_button canvas-settings-trigger ${isOpen ? 'active' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onTogglePreferences?.();
      }}
      title="Preferences (Ctrl+,)"
      aria-label="Preferences"
    >
      <div className="ToolIcon__icon">
        <Settings size={18} />
      </div>
    </button>
  );

  if (targetNode) {
    return createPortal(buttonContent, targetNode);
  }

  // Fallback if top-right wrapper is not yet initialized
  return (
    <div className="canvas-settings-fallback">
      {buttonContent}
    </div>
  );
}

export const CanvasTopRightSettings = memo(CanvasTopRightSettingsComponent);

