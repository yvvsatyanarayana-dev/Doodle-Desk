import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  CornerDownRight,
  ArrowRight,
  LayoutGrid,
  Menu,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pipette,
  Palette,
  SlidersHorizontal,
  MoreHorizontal,
  Undo2,
  Redo2,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowDown,
  ArrowUp,
  Link2,
  X,
} from 'lucide-react';

const STROKE_COLORS = [
  '#1e1e1e',
  '#e03131',
  '#2f9e44',
  '#1971c2',
  '#f08c00',
  '#9c36b5',
  '#ffffff',
];

const BG_COLORS = [
  'transparent',
  '#ffc9c9',
  '#b2f2bb',
  '#a5d8ff',
  '#ffec99',
  '#eebefa',
  '#ffffff',
];

function renderFillPatternMini(fillStyle, strokeColor) {
  const color = strokeColor || '#ffffff';
  if (fillStyle === 'solid') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '3px',
          backgroundColor: color,
        }}
      />
    );
  }
  if (fillStyle === 'dots') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ color }}>
        <circle cx="5" cy="5" r="1.5" fill="currentColor" />
        <circle cx="10" cy="5" r="1.5" fill="currentColor" />
        <circle cx="15" cy="5" r="1.5" fill="currentColor" />
        <circle cx="5" cy="10" r="1.5" fill="currentColor" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <circle cx="15" cy="10" r="1.5" fill="currentColor" />
        <circle cx="5" cy="15" r="1.5" fill="currentColor" />
        <circle cx="10" cy="15" r="1.5" fill="currentColor" />
        <circle cx="15" cy="15" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (fillStyle === 'cross-hatch') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" style={{ color }}>
        <line x1="2" y1="18" x2="18" y2="2" strokeWidth="1.6" />
        <line x1="2" y1="2" x2="18" y2="18" strokeWidth="1.6" />
        <line x1="2" y1="10" x2="10" y2="2" strokeWidth="1.6" />
        <line x1="10" y1="18" x2="18" y2="10" strokeWidth="1.6" />
      </svg>
    );
  }
  // Default: hachure / hatched lines
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" style={{ color }}>
      <line x1="2" y1="18" x2="18" y2="2" strokeWidth="1.6" />
      <line x1="2" y1="11" x2="11" y2="2" strokeWidth="1.6" />
      <line x1="9" y1="18" x2="18" y2="9" strokeWidth="1.6" />
      <line x1="2" y1="5" x2="5" y2="2" strokeWidth="1.6" />
      <line x1="15" y1="18" x2="18" y2="15" strokeWidth="1.6" />
    </svg>
  );
}

export function PropertiesPanel({
  selectedElements = [],
  appState = {},
  onUpdateProperty,
  onAction,
  onOpenColorPalette,
  onUndo,
  onRedo,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1000) {
      return false;
    }
    return true;
  });
  const prevWidthRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [activeDesktopPopover, setActiveDesktopPopover] = useState(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [activeMobilePopover, setActiveMobilePopover] = useState(null);
  const [popoverAnchorX, setPopoverAnchorX] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      const prevWidth = prevWidthRef.current;
      const currentWidth = window.innerWidth;
      prevWidthRef.current = currentWidth;

      if (prevWidth >= 1000 && currentWidth < 1000) {
        setIsSidebarOpen(false);
      } else if (prevWidth < 1000 && currentWidth >= 1000) {
        setIsSidebarOpen(true);
      }
      setActiveDesktopPopover(null);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobilePopover = (popoverName, evt) => {
    setIsMobileSheetOpen(false);
    if (activeMobilePopover === popoverName) {
      setActiveMobilePopover(null);
      setPopoverAnchorX(null);
    } else {
      setActiveMobilePopover(popoverName);
      if (evt?.currentTarget && typeof evt.currentTarget.getBoundingClientRect === 'function') {
        const rect = evt.currentTarget.getBoundingClientRect();
        setPopoverAnchorX(rect.left + rect.width / 2);
      } else {
        setPopoverAnchorX(null);
      }
    }
  };

  const getPopoverStyle = (cardWidth) => {
    if (typeof window === 'undefined') return {};
    const screenWidth = window.innerWidth || 375;
    const halfWidth = cardWidth / 2;
    const anchor = popoverAnchorX != null ? popoverAnchorX : screenWidth / 2;
    const cardCenterX = Math.max(halfWidth + 8, Math.min(screenWidth - halfWidth - 8, anchor));
    const cardLeft = cardCenterX - halfWidth;
    const beakLeft = Math.max(14, Math.min(cardWidth - 14, anchor - cardLeft));
    return {
      left: `${cardCenterX}px`,
      transform: 'translateX(-50%)',
      '--beak-left': `${beakLeft}px`,
    };
  };

  useEffect(() => {
    if (!activeMobilePopover && !isMobileSheetOpen && !activeDesktopPopover) return undefined;
    const handleOutsideClick = (e) => {
      if (
        !e.target.closest('.mobile-actions-popover') &&
        !e.target.closest('.mobile-quick-btn') &&
        !e.target.closest('.doodle-rail-flyout-popover') &&
        !e.target.closest('.doodle-action-rail-btn')
      ) {
        setActiveMobilePopover(null);
        setPopoverAnchorX(null);
        setIsMobileSheetOpen(false);
        setActiveDesktopPopover(null);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [activeMobilePopover, isMobileSheetOpen, activeDesktopPopover]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeDesktopPopover) {
          setActiveDesktopPopover(null);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDesktopPopover, isSidebarOpen]);

  useEffect(() => {
    const handleResize = () => setPopoverAnchorX(null);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If no elements are selected and active tool is not a shape/text tool, don't show
  const activeTool = appState.activeTool?.type || 'selection';
  const isCreationMode = ['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw', 'text', 'frame', 'embeddable'].includes(activeTool);
  const hasSelection = selectedElements.length > 0;

  if (!hasSelection && !isCreationMode) {
    return null;
  }

  const primaryEl = selectedElements[0] || {};
  const isText = hasSelection ? selectedElements.some((e) => e.type === 'text') : activeTool === 'text';
  const isFreedraw = hasSelection ? selectedElements.every((e) => e.type === 'freedraw') : activeTool === 'freedraw';
  const isLineOrArrow = !isFreedraw && (hasSelection ? selectedElements.every((e) => e.type === 'line' || e.type === 'arrow') : (activeTool === 'line' || activeTool === 'arrow'));
  const isLinearOrFreedraw = isFreedraw || isLineOrArrow;

  const strokeColor = primaryEl.strokeColor ?? appState.currentItemStrokeColor ?? '#1e1e1e';
  const bgColor = primaryEl.backgroundColor ?? appState.currentItemBackgroundColor ?? 'transparent';
  const fillStyle = primaryEl.fillStyle ?? appState.currentItemFillStyle ?? 'hachure';
  const strokeWidth = primaryEl.strokeWidth ?? appState.currentItemStrokeWidth ?? 2;
  const strokeStyle = primaryEl.strokeStyle ?? appState.currentItemStrokeStyle ?? 'solid';
  const roughness = primaryEl.roughness ?? appState.currentItemRoughness ?? 1;
  const roundness = hasSelection && Object.prototype.hasOwnProperty.call(primaryEl, 'roundness')
    ? primaryEl.roundness
    : (Object.prototype.hasOwnProperty.call(appState, 'currentItemRoundness')
      ? appState.currentItemRoundness
      : 'round');
  const hasRoundedEdges = roundness !== null && roundness !== false && roundness !== 'sharp';
  const opacity = primaryEl.opacity ?? appState.currentItemOpacity ?? 100;

  const fontSize = primaryEl.fontSize ?? appState.currentItemFontSize ?? 20;
  const fontFamily = primaryEl.fontFamily ?? appState.currentItemFontFamily ?? 5;
  const textAlign = primaryEl.textAlign ?? appState.currentItemTextAlign ?? 'left';

  const renderPropertiesContent = () => (
    <>
      {/* Stroke Color */}
      <div>
        <div className="control-label">Stroke</div>
        <div className="color-picker" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {STROKE_COLORS.slice(0, 5).map((c) => (
            <button
              key={c}
              type="button"
              className={`color-picker-swatch ${strokeColor === c ? 'active' : ''}`}
              style={{
                backgroundColor: c,
                border: c === '#ffffff' ? '1px solid #d4d4d8' : '1px solid rgba(128, 128, 128, 0.25)',
              }}
              onClick={() => onUpdateProperty('strokeColor', c)}
              aria-label={`Stroke color ${c}`}
            />
          ))}
          <label
            className="color-picker-swatch color-picker-custom-swatch"
            title="Custom stroke color"
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            <input
              type="color"
              value={strokeColor.startsWith('#') && strokeColor.length === 7 ? strokeColor : '#1e1e1e'}
              onChange={(e) => onUpdateProperty('strokeColor', e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', left: 0, top: 0 }}
            />
            <Pipette size={12} />
          </label>
        </div>
      </div>

      {/* Background Color */}
      {!isText && !isLinearOrFreedraw && (
        <div>
          <div className="control-label">Background</div>
          <div className="color-picker" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              type="button"
              className={`color-picker-swatch doodle-swatch-transparent ${bgColor === 'transparent' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('backgroundColor', 'transparent')}
              title="Transparent background"
              aria-label="Transparent background"
            >
              <div className="doodle-swatch-transparent-checkers" />
            </button>
            {BG_COLORS.filter((c) => c !== 'transparent').slice(0, 4).map((c) => (
              <button
                key={c}
                type="button"
                className={`color-picker-swatch ${bgColor === c ? 'active' : ''}`}
                style={{
                  backgroundColor: c,
                  border: c === '#ffffff' ? '1px solid #d4d4d8' : '1px solid rgba(128, 128, 128, 0.25)',
                }}
                onClick={() => onUpdateProperty('backgroundColor', c)}
                aria-label={`Background color ${c}`}
              />
            ))}
            <label
              className="color-picker-swatch color-picker-custom-swatch"
              title="Custom background color"
              style={{ position: 'relative', cursor: 'pointer' }}
            >
              <input
                type="color"
                value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#ffffff'}
                onChange={(e) => onUpdateProperty('backgroundColor', e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', left: 0, top: 0 }}
              />
              <Pipette size={12} />
            </label>
          </div>
        </div>
      )}

      {/* Stroke Width */}
      <div>
        <div className="control-label">Stroke width</div>
        <div className="buttonList">
          <button
            type="button"
            className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 1 ? 'active' : ''}`}
            onClick={() => onUpdateProperty('strokeWidth', 1)}
            title="Thin (1)"
            aria-label="Thin stroke"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" />
            </svg>
          </button>
          <button
            type="button"
            className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 2 ? 'active' : ''}`}
            onClick={() => onUpdateProperty('strokeWidth', 2)}
            title="Bold (2)"
            aria-label="Bold stroke"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="8.5" width="16" height="3" rx="1.5" />
            </svg>
          </button>
          <button
            type="button"
            className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 3 ? 'active' : ''}`}
            onClick={() => onUpdateProperty('strokeWidth', 3)}
            title="Extra bold (3)"
            aria-label="Extra bold stroke"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="7.5" width="16" height="5" rx="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stroke Style */}
      {!isText && (
        <div>
          <div className="control-label">Stroke style</div>
          <div className="buttonList">
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'solid' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('strokeStyle', 'solid')}
              title="Solid"
              aria-label="Solid stroke style"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'dashed' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('strokeStyle', 'dashed')}
              title="Dashed"
              aria-label="Dashed stroke style"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeDasharray="3.5 2.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'dotted' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('strokeStyle', 'dotted')}
              title="Dotted"
              aria-label="Dotted stroke style"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeDasharray="1 3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Sloppiness / Roughness */}
      {!isText && !isFreedraw && (
        <div>
          <div className="control-label">Sloppiness</div>
          <div className="buttonList">
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${roughness === 0 ? 'active' : ''}`}
              onClick={() => onUpdateProperty('roughness', 0)}
              title="Architect (Straight)"
              aria-label="Architect sloppiness"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <line x1="2" y1="10" x2="18" y2="10" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${roughness === 1 ? 'active' : ''}`}
              onClick={() => onUpdateProperty('roughness', 1)}
              title="Artist (Hand-drawn)"
              aria-label="Artist sloppiness"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <path d="M 2 11 Q 7 8 11 11 T 18 9" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${roughness === 2 ? 'active' : ''}`}
              onClick={() => onUpdateProperty('roughness', 2)}
              title="Cartoon (Doodle)"
              aria-label="Cartoon sloppiness"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <path d="M 2 12 Q 6 6 10 12 T 18 8" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M 3 10 Q 7 13 11 8 T 17 11" strokeWidth="1.1" opacity="0.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Edges / Roundness */}
      {!isText && !isLinearOrFreedraw && (
        <div>
          <div className="control-label">Edges</div>
          <div className="buttonList">
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${(!roundness || roundness === 'sharp') ? 'active' : ''}`}
              onClick={() => onUpdateProperty('roundness', 'sharp')}
              title="Sharp edges"
              aria-label="Sharp edges"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <path d="M 5 16 L 5 5 L 16 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${hasRoundedEdges ? 'active' : ''}`}
              onClick={() => onUpdateProperty('roundness', 'round')}
              title="Round edges"
              aria-label="Round edges"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <path d="M 5 16 L 5 9 Q 5 5 9 5 L 16 5" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Line & Arrow Routing: Straight, Curved, Orthogonal */}
      {isLineOrArrow && (
        <div>
          <div className="control-label">Connector Routing</div>
          <div className="buttonList">
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${(!primaryEl.routing || primaryEl.routing === 'straight') && roundness !== 'elbow' ? 'active' : ''}`}
              onClick={() => {
                onUpdateProperty('routing', 'straight');
                onUpdateProperty('roundness', 'sharp');
              }}
              title="Straight line"
              aria-label="Straight line"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <line x1="3" y1="17" x2="17" y2="3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${primaryEl.routing === 'curved' ? 'active' : ''}`}
              onClick={() => {
                onUpdateProperty('routing', 'curved');
                onUpdateProperty('roundness', 'round');
              }}
              title="Curved connector"
              aria-label="Curved connector"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <path d="M 3 17 Q 5 4 17 3" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${roundness === 'elbow' || primaryEl.routing === 'orthogonal' ? 'active' : ''}`}
              onClick={() => {
                onUpdateProperty('routing', 'orthogonal');
                onUpdateProperty('roundness', 'elbow');
              }}
              title="Orthogonal elbow connector"
              aria-label="Orthogonal elbow connector"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                <path d="M 3 17 L 3 3 L 17 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Fill Style (for shapes) */}
      {!isText && !isLinearOrFreedraw && (
        <div>
          <div className="control-label">Fill</div>
          <div className="buttonList doodle-fill-buttons-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px', width: '100%' }}>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'hachure' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('fillStyle', 'hachure')}
              title="Hachure"
              aria-label="Hachure fill"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.4" />
                <line x1="4.5" y1="10" x2="10" y2="4.5" strokeWidth="1.4" />
                <line x1="10" y1="15.5" x2="15.5" y2="10" strokeWidth="1.4" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'cross-hatch' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('fillStyle', 'cross-hatch')}
              title="Cross-hatch"
              aria-label="Cross-hatch fill"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.4" />
                <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" strokeWidth="1.4" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'solid' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('fillStyle', 'solid')}
              title="Solid"
              aria-label="Solid fill"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'dots' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('fillStyle', 'dots')}
              title="Dots"
              aria-label="Dots fill"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                <circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                <circle cx="10" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                <circle cx="13.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'zigzag' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('fillStyle', 'zigzag')}
              title="Zigzag"
              aria-label="Zigzag fill"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                <path d="M 5 7.5 L 7.5 5.5 L 10 7.5 L 12.5 5.5 L 15 7.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 5 12.5 L 7.5 10.5 L 10 12.5 L 12.5 10.5 L 15 12.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'dashed' ? 'active' : ''}`}
              onClick={() => onUpdateProperty('fillStyle', 'dashed')}
              title="Dashed"
              aria-label="Dashed fill"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.4" strokeDasharray="2.5 2" />
                <line x1="4.5" y1="10" x2="10" y2="4.5" strokeWidth="1.4" strokeDasharray="2 2" />
                <line x1="10" y1="15.5" x2="15.5" y2="10" strokeWidth="1.4" strokeDasharray="2 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Text Properties */}
      {isText && (
        <>
          <div>
            <div className="control-label">Font family</div>
            <div className="buttonList">
              <button
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${fontFamily === 5 || fontFamily === 3 ? 'active' : ''}`}
                onClick={() => onUpdateProperty('fontFamily', 5)}
                title="Doodle font"
                aria-label="Doodle font"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'cursive' }}
              >
                Aa
              </button>
              <button
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${fontFamily === 1 || fontFamily === 6 ? 'active' : ''}`}
                onClick={() => onUpdateProperty('fontFamily', 1)}
                title="Normal font"
                aria-label="Normal font"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif' }}
              >
                Aa
              </button>
              <button
                type="button"
                className={`ToolIcon ToolIcon_type_radio ${fontFamily === 2 ? 'active' : ''}`}
                onClick={() => onUpdateProperty('fontFamily', 2)}
                title="Code font"
                aria-label="Code font"
                style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}
              >
                Aa
              </button>
            </div>
          </div>

          <div>
            <div className="control-label">Font size</div>
            <div className="buttonList">
              {[
                { size: 16, label: 'S' },
                { size: 20, label: 'M' },
                { size: 28, label: 'L' },
                { size: 36, label: 'XL' },
              ].map((s) => (
                <button
                  key={s.size}
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${fontSize === s.size ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('fontSize', s.size)}
                  title={`Size ${s.label}`}
                  aria-label={`Size ${s.label}`}
                  style={{ fontSize: '12px', fontWeight: 600 }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="control-label">Text align</div>
            <div className="buttonList">
              {[
                { id: 'left', icon: <AlignLeft size={16} />, title: 'Align Left' },
                { id: 'center', icon: <AlignCenter size={16} />, title: 'Align Center' },
                { id: 'right', icon: <AlignRight size={16} />, title: 'Align Right' },
              ].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ToolIcon ToolIcon_type_radio ${textAlign === a.id ? 'active' : ''}`}
                  onClick={() => onUpdateProperty('textAlign', a.id)}
                  title={a.title}
                  aria-label={a.title}
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Opacity Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span className="control-label" style={{ margin: 0 }}>Opacity</span>
          <span className="opacity-value-badge" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{opacity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={opacity}
          onChange={(e) => onUpdateProperty('opacity', Number(e.target.value))}
          className="doodle-opacity-slider"
          style={{
            width: '100%',
            accentColor: '#6366f1',
            cursor: 'pointer',
            height: '5px',
          }}
          aria-label="Shape opacity"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '10px', color: '#71717a', fontWeight: 500 }}>
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Layers */}
      {hasSelection && (
        <div>
          <div className="control-label">Layers</div>
          <div className="buttonList" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            <button
              type="button"
              className="ToolIcon"
              onClick={() => onAction?.('sendToBack')}
              title="Send to back (Ctrl+Shift+[)"
              aria-label="Send to back"
            >
              <ArrowDownToLine size={15} />
            </button>
            <button
              type="button"
              className="ToolIcon"
              onClick={() => onAction?.('sendBackward')}
              title="Send backward (Ctrl+[)"
              aria-label="Send backward"
            >
              <ArrowDown size={15} />
            </button>
            <button
              type="button"
              className="ToolIcon"
              onClick={() => onAction?.('bringForward')}
              title="Bring forward (Ctrl+])"
              aria-label="Bring forward"
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              className="ToolIcon"
              onClick={() => onAction?.('bringToFront')}
              title="Bring to front (Ctrl+Shift+])"
              aria-label="Bring to front"
            >
              <ArrowUpToLine size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {hasSelection && (
        <div>
          <div className="control-label">Actions</div>
          <div className="buttonList" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <button
              type="button"
              className="ToolIcon"
              onClick={() => onAction?.('duplicate')}
              title="Duplicate (Ctrl+D)"
              aria-label="Duplicate"
            >
              <Copy size={15} />
            </button>
            <button
              type="button"
              className="ToolIcon doodle-delete-action-btn"
              onClick={() => onAction?.('delete')}
              title="Delete (Delete / Backspace)"
              aria-label="Delete"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              className="ToolIcon"
              onClick={() => {
                const currentLink = primaryEl?.link || '';
                const url = window.prompt('Enter link URL:', currentLink);
                if (url !== null) {
                  onUpdateProperty?.('link', url);
                }
              }}
              title="Attach link"
              aria-label="Link"
            >
              <Link2 size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Excalidraw-Grade Action Rail & Properties Panel */}
      <div className="App-menu__left-wrapper doodle-excalidraw-properties-root">
        {/* Left Floating Action Rail (Rendered ONLY when properties sidebar is collapsed) */}
        {!isSidebarOpen && (
          <div className="doodle-action-rail Island" role="toolbar" aria-label="Element quick actions">
            {/* 1. Stroke / Fill Swatch Preview */}
            <button
              type="button"
              className={`doodle-action-rail-btn doodle-swatch-rail-btn ${activeDesktopPopover === 'stroke' ? 'active' : ''}`}
              onClick={() => {
                setActiveDesktopPopover((prev) => (prev === 'stroke' ? null : 'stroke'));
              }}
              title={isText ? `Text color: ${strokeColor}` : `Stroke: ${strokeColor} · Fill: ${fillStyle}`}
              aria-label={isText ? 'Text color' : 'Stroke and fill styles'}
            >
              <div
                className="doodle-rail-swatch-box"
                style={{
                  borderColor: strokeColor === '#ffffff' ? '#d4d4d8' : strokeColor,
                  backgroundColor: isText ? strokeColor : undefined,
                }}
              >
                {!isText ? renderFillPatternMini(fillStyle, strokeColor) : (
                  <span style={{ color: strokeColor === '#ffffff' ? '#111113' : '#ffffff', fontSize: '11px', fontWeight: 700 }}>A</span>
                )}
              </div>
            </button>

            {/* 2. Background Swatch Preview */}
            {!isText && !isLinearOrFreedraw && (
              <button
                type="button"
                className={`doodle-action-rail-btn doodle-swatch-rail-btn ${activeDesktopPopover === 'bg' ? 'active' : ''}`}
                onClick={() => {
                  setActiveDesktopPopover((prev) => (prev === 'bg' ? null : 'bg'));
                }}
                title={`Background: ${bgColor === 'transparent' ? 'Transparent' : bgColor}`}
                aria-label="Background color"
              >
                <div
                  className={`doodle-rail-bg-box ${bgColor === 'transparent' ? 'is-transparent' : ''}`}
                  style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
                />
              </button>
            )}

            {/* 3. Detailed Properties Toggle Button (Excalidraw Sliders Icon) */}
            <button
              type="button"
              className="doodle-action-rail-btn doodle-properties-sidebar-toggle"
              onClick={() => {
                setActiveDesktopPopover(null);
                setIsSidebarOpen(true);
              }}
              aria-label="Show properties sidebar"
              aria-expanded={false}
              title="Show properties sidebar"
            >
              <SlidersHorizontal size={17} strokeWidth={1.8} />
            </button>

            <div className="doodle-action-rail-divider" />

            {/* 4. Quick Duplicate */}
            {hasSelection && (
              <button
                type="button"
                className="doodle-action-rail-btn"
                onClick={() => onAction?.('duplicate')}
                title="Duplicate (Ctrl+D)"
                aria-label="Duplicate"
              >
                <Copy size={16} strokeWidth={1.8} />
              </button>
            )}

            {/* 5. Quick Delete */}
            {hasSelection && (
              <button
                type="button"
                className="doodle-action-rail-btn doodle-rail-delete-btn"
                onClick={() => onAction?.('delete')}
                title="Delete (Delete / Backspace)"
                aria-label="Delete"
              >
                <Trash2 size={16} strokeWidth={1.8} />
              </button>
            )}

            {/* 6. More Actions (...) */}
            {hasSelection && (
              <button
                type="button"
                className={`doodle-action-rail-btn ${activeDesktopPopover === 'actions' ? 'active' : ''}`}
                onClick={() => {
                  setActiveDesktopPopover((prev) => (prev === 'actions' ? null : 'actions'));
                }}
                title="More actions (Layers, Align, Links)"
                aria-label="More actions"
              >
                <MoreHorizontal size={17} strokeWidth={1.8} />
              </button>
            )}
          </div>
        )}

        {/* Unified Properties Island (Rendered when expanded - Authentic Excalidraw Parity from Image 2) */}
        {isSidebarOpen && (
          <div className="Island App-menu__left doodle-unified-properties-bar" role="region" aria-label="Shape properties">
            <div className="App-menu__left-header">
              <span className="App-menu__left-title">{isText ? 'Text' : (isLinearOrFreedraw ? 'Line' : 'Shape')}</span>
              <button
                type="button"
                className="doodle-properties-sidebar-toggle doodle-properties-collapse-btn"
                onClick={() => {
                  setActiveDesktopPopover(null);
                  setIsSidebarOpen(false);
                }}
                aria-label="Hide properties sidebar"
                aria-expanded={true}
                title="Hide properties sidebar (Collapse to rail)"
              >
                <SlidersHorizontal size={14} strokeWidth={1.8} />
              </button>
            </div>

            <div className="panelColumn">
              {renderPropertiesContent()}
            </div>
          </div>
        )}

        {/* Quick Popovers Beside Rail (Stroke, BG, Actions) */}
        {activeDesktopPopover === 'stroke' && (
          <div className="doodle-rail-flyout-popover Island" role="dialog" aria-label="Stroke Color">
            <div className="doodle-rail-popover-title">Stroke Color</div>
            <div className="color-picker" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
              {STROKE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-picker-swatch ${strokeColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #d4d4d8' : '1px solid rgba(128, 128, 128, 0.25)' }}
                  onClick={() => { onUpdateProperty('strokeColor', c); setActiveDesktopPopover(null); }}
                  aria-label={`Stroke color ${c}`}
                />
              ))}
              <label className="color-picker-swatch color-picker-custom-swatch" title="Custom stroke color">
                <input
                  type="color"
                  value={strokeColor.startsWith('#') && strokeColor.length === 7 ? strokeColor : '#1e1e1e'}
                  onChange={(e) => onUpdateProperty('strokeColor', e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', left: 0, top: 0 }}
                />
                <Pipette size={11} />
              </label>
            </div>

          </div>
        )}

        {activeDesktopPopover === 'bg' && !isText && !isLinearOrFreedraw && (
          <div className="doodle-rail-flyout-popover Island" role="dialog" aria-label="Background Color">
            <div className="doodle-rail-popover-title">Background Color</div>
            <div className="color-picker" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-picker-swatch ${bgColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, border: (c === '#ffffff' || c === 'transparent') ? '1px solid #d4d4d8' : '1px solid rgba(128, 128, 128, 0.25)' }}
                  onClick={() => { onUpdateProperty('backgroundColor', c); setActiveDesktopPopover(null); }}
                  aria-label={`Background color ${c}`}
                />
              ))}
              <label className="color-picker-swatch color-picker-custom-swatch" title="Custom background color">
                <input
                  type="color"
                  value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#ffffff'}
                  onChange={(e) => onUpdateProperty('backgroundColor', e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', left: 0, top: 0 }}
                />
                <Pipette size={11} />
              </label>
            </div>
          </div>
        )}

        {activeDesktopPopover === 'actions' && (
          <div className="doodle-rail-flyout-popover Island" role="menu" aria-label="Layers and Actions">
            <div className="doodle-rail-popover-title">Layer Ordering</div>
            <div className="doodle-rail-popover-row">
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('bringToFront'); setActiveDesktopPopover(null); }}
                title="Bring to Front (Ctrl+Shift+])"
              >
                <ArrowUpToLine size={14} />
                <span>Front</span>
              </button>
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('bringForward'); setActiveDesktopPopover(null); }}
                title="Bring Forward (Ctrl+])"
              >
                <ArrowUp size={14} />
                <span>Forward</span>
              </button>
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('sendBackward'); setActiveDesktopPopover(null); }}
                title="Send Backward (Ctrl+[)"
              >
                <ArrowDown size={14} />
                <span>Backward</span>
              </button>
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('sendToBack'); setActiveDesktopPopover(null); }}
                title="Send to Back (Ctrl+Shift+[)"
              >
                <ArrowDownToLine size={14} />
                <span>Back</span>
              </button>
            </div>

            <div className="doodle-rail-popover-title" style={{ marginTop: '8px' }}>Align & Links</div>
            <div className="doodle-rail-popover-row">
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('alignLeft'); setActiveDesktopPopover(null); }}
                title="Align Left"
              >
                <AlignLeft size={14} />
                <span>Left</span>
              </button>
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('alignCenter'); setActiveDesktopPopover(null); }}
                title="Align Center"
              >
                <AlignCenter size={14} />
                <span>Center</span>
              </button>
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => { onAction?.('alignRight'); setActiveDesktopPopover(null); }}
                title="Align Right"
              >
                <AlignRight size={14} />
                <span>Right</span>
              </button>
              <button
                type="button"
                className="doodle-rail-popover-btn"
                onClick={() => {
                  const currentLink = primaryEl?.link || '';
                  const url = window.prompt('Enter link URL:', currentLink);
                  if (url !== null) {
                    onUpdateProperty?.('link', url);
                  }
                  setActiveDesktopPopover(null);
                }}
                title="Attach link"
              >
                <Link2 size={14} />
                <span>Link</span>
              </button>
            </div>

            {hasSelection && (
              <>
                <div className="doodle-rail-popover-title" style={{ marginTop: '8px' }}>Mind Map</div>
                <div className="doodle-rail-popover-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <button
                    type="button"
                    className="doodle-rail-popover-btn"
                    onClick={() => { onAction?.('branchChildRight'); setActiveDesktopPopover(null); }}
                    title="Branch right (Tab)"
                  >
                    <ArrowRight size={13} />
                    <span>Right</span>
                  </button>
                  <button
                    type="button"
                    className="doodle-rail-popover-btn"
                    onClick={() => { onAction?.('branchChildDown'); setActiveDesktopPopover(null); }}
                    title="Branch down (Shift+Tab)"
                  >
                    <CornerDownRight size={13} />
                    <span>Down</span>
                  </button>
                  <button
                    type="button"
                    className="doodle-rail-popover-btn"
                    onClick={() => { onAction?.('autoArrangeTree'); setActiveDesktopPopover(null); }}
                    title="Auto-arrange tree"
                  >
                    <LayoutGrid size={13} />
                    <span>Arrange</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}


      </div>

      {/* Mobile Excalidraw-Grade Floating Quick Bar & Drawer */}
      <div className="mobile-properties-container">
        {/* Quick Popovers (Active based on button clicked) */}
        {activeMobilePopover === 'actions' && (
          <div className="mobile-actions-popover" role="dialog" aria-label="Layers and Actions" style={getPopoverStyle(180)}>
            <div className="mobile-popover-section">
              <div className="mobile-popover-title">Layers</div>
              <div className="mobile-popover-grid">
                <button
                  type="button"
                  className="mobile-popover-btn"
                  onClick={() => { onAction?.('sendToBack'); setActiveMobilePopover(null); }}
                  title="Send to back"
                  aria-label="Send to back"
                >
                  <ArrowDownToLine size={16} />
                </button>
                <button
                  type="button"
                  className="mobile-popover-btn"
                  onClick={() => { onAction?.('sendBackward'); setActiveMobilePopover(null); }}
                  title="Send backward"
                  aria-label="Send backward"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  className="mobile-popover-btn"
                  onClick={() => { onAction?.('bringForward'); setActiveMobilePopover(null); }}
                  title="Bring forward"
                  aria-label="Bring forward"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="mobile-popover-btn"
                  onClick={() => { onAction?.('bringToFront'); setActiveMobilePopover(null); }}
                  title="Bring to front"
                  aria-label="Bring to front"
                >
                  <ArrowUpToLine size={16} />
                </button>
              </div>
            </div>

            <div className="mobile-popover-section">
              <div className="mobile-popover-title">Actions</div>
              <div className="mobile-popover-grid">
                <button
                  type="button"
                  className="mobile-popover-btn"
                  onClick={() => {
                    const currentLink = primaryEl?.link || '';
                    const url = window.prompt('Enter link URL:', currentLink);
                    if (url !== null) {
                      onUpdateProperty?.('link', url);
                    }
                    setActiveMobilePopover(null);
                  }}
                  title="Link"
                  aria-label="Link"
                >
                  <Link2 size={16} />
                </button>
                <button
                  type="button"
                  className="mobile-popover-btn"
                  onClick={() => { onAction?.('duplicate'); setActiveMobilePopover(null); }}
                  title="Duplicate"
                  aria-label="Duplicate"
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="mobile-popover-btn mobile-popover-delete"
                  onClick={() => { onAction?.('delete'); setActiveMobilePopover(null); }}
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeMobilePopover === 'stroke' && (
          <div className="mobile-actions-popover" role="dialog" aria-label="Stroke Color" style={getPopoverStyle(186)}>
            <div className="mobile-popover-title">Stroke Color</div>
            <div className="mobile-color-swatches">
              {STROKE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`mobile-color-circle ${strokeColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #d4d4d8' : '1px solid rgba(128,128,128,0.25)' }}
                  onClick={() => { onUpdateProperty('strokeColor', c); setActiveMobilePopover(null); }}
                  aria-label={`Stroke ${c}`}
                />
              ))}
              <label className="mobile-color-circle custom" title="Custom color">
                <input
                  type="color"
                  value={strokeColor.startsWith('#') && strokeColor.length === 7 ? strokeColor : '#1e1e1e'}
                  onChange={(e) => onUpdateProperty('strokeColor', e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', left: 0, top: 0 }}
                />
                <Pipette size={12} />
              </label>
            </div>
          </div>
        )}

        {activeMobilePopover === 'bg' && !isText && !isLinearOrFreedraw && (
          <div className="mobile-actions-popover" role="dialog" aria-label="Background Color" style={getPopoverStyle(186)}>
            <div className="mobile-popover-title">Background Color</div>
            <div className="mobile-color-swatches">
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`mobile-color-circle ${c === 'transparent' ? 'is-transparent' : ''} ${bgColor === c ? 'active' : ''}`}
                  style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, border: c === '#ffffff' ? '1px solid #d4d4d8' : '1px solid rgba(128,128,128,0.25)' }}
                  onClick={() => { onUpdateProperty('backgroundColor', c); setActiveMobilePopover(null); }}
                  aria-label={`Background ${c}`}
                />
              ))}
              <label className="mobile-color-circle custom" title="Custom background color">
                <input
                  type="color"
                  value={bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#ffffff'}
                  onChange={(e) => onUpdateProperty('backgroundColor', e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', left: 0, top: 0 }}
                />
                <Pipette size={12} />
              </label>
            </div>
          </div>
        )}

        {/* Floating Quick Bar */}
        <div className="mobile-properties-quick-bar" role="toolbar" aria-label="Selected element quick controls">
          {/* Stroke Swatch */}
          <button
            type="button"
            className={`mobile-quick-btn mobile-swatch-btn ${activeMobilePopover === 'stroke' ? 'active' : ''}`}
            onClick={(e) => toggleMobilePopover('stroke', e)}
            title="Stroke color"
            aria-label="Stroke color"
          >
            <span
              className="mobile-swatch-preview"
              style={{
                backgroundColor: strokeColor === 'transparent' ? '#141417' : strokeColor,
                borderColor: strokeColor === '#ffffff' ? '#d4d4d8' : 'rgba(255,255,255,0.2)',
              }}
            />
          </button>

          {/* Background Swatch */}
          {!isText && !isLinearOrFreedraw && (
            <button
              type="button"
              className={`mobile-quick-btn mobile-swatch-btn ${activeMobilePopover === 'bg' ? 'active' : ''}`}
              onClick={(e) => toggleMobilePopover('bg', e)}
              title="Background color"
              aria-label="Background color"
            >
              <span
                className={`mobile-swatch-preview ${bgColor === 'transparent' ? 'is-transparent' : ''}`}
                style={{
                  backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor,
                  borderColor: bgColor === '#ffffff' ? '#d4d4d8' : 'rgba(255,255,255,0.2)',
                }}
              />
            </button>
          )}

          {/* Sliders / Full Properties Trigger */}
          <button
            type="button"
            className={`mobile-quick-btn ${(activeMobilePopover === 'properties' || isMobileSheetOpen) ? 'active' : ''}`}
            onClick={(e) => toggleMobilePopover('properties', e)}
            title="Element properties"
            aria-label="Toggle element properties sheet"
          >
            <SlidersHorizontal size={17} strokeWidth={1.8} />
          </button>

          {/* More Actions Trigger (...) */}
          <button
            type="button"
            className={`mobile-quick-btn ${activeMobilePopover === 'actions' ? 'active' : ''}`}
            onClick={(e) => toggleMobilePopover('actions', e)}
            title="Layers & Actions"
            aria-label="Layers and Actions"
          >
            <MoreHorizontal size={17} strokeWidth={1.8} />
          </button>

          <div className="mobile-quick-divider" />

          {/* Undo Button */}
          <button
            type="button"
            className="mobile-quick-btn"
            onClick={() => {
              if (onUndo) onUndo();
              else window.__doodleUndo?.();
            }}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 size={16} strokeWidth={1.8} />
          </button>

          {/* Redo Button */}
          <button
            type="button"
            className="mobile-quick-btn"
            onClick={() => {
              if (onRedo) onRedo();
              else window.__doodleRedo?.();
            }}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Mobile Excalidraw-Grade Floating Properties Popover */}
        {(activeMobilePopover === 'properties' || isMobileSheetOpen) && (
          <div
            className="mobile-actions-popover mobile-properties-popover mobile-bottom-sheet-card"
            role="dialog"
            aria-label="Element Properties"
            style={getPopoverStyle(140)}
          >
            <div className="mobile-popover-content">
              {/* Stroke Width */}
              <div className="mobile-popover-item">
                <div className="mobile-popover-label">Stroke width</div>
                <div className="mobile-popover-btn-group">
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 1 ? 'active' : ''}`}
                    onClick={() => onUpdateProperty('strokeWidth', 1)}
                    title="Thin (1)"
                    aria-label="Thin stroke"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 2 ? 'active' : ''}`}
                    onClick={() => onUpdateProperty('strokeWidth', 2)}
                    title="Bold (2)"
                    aria-label="Bold stroke"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="2" y="8.5" width="16" height="3" rx="1.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`ToolIcon ToolIcon_type_radio ${strokeWidth === 3 ? 'active' : ''}`}
                    onClick={() => onUpdateProperty('strokeWidth', 3)}
                    title="Extra bold (3)"
                    aria-label="Extra bold stroke"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="2" y="7.5" width="16" height="5" rx="2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stroke Style */}
              {!isText && (
                <div className="mobile-popover-item">
                  <div className="mobile-popover-label">Stroke style</div>
                  <div className="mobile-popover-btn-group">
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'solid' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('strokeStyle', 'solid')}
                      title="Solid"
                      aria-label="Solid stroke style"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'dashed' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('strokeStyle', 'dashed')}
                      title="Dashed"
                      aria-label="Dashed stroke style"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeDasharray="3.5 2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${strokeStyle === 'dotted' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('strokeStyle', 'dotted')}
                      title="Dotted"
                      aria-label="Dotted stroke style"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <line x1="2" y1="10" x2="18" y2="10" strokeWidth="2" strokeDasharray="1 3" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Sloppiness */}
              {!isText && !isFreedraw && (
                <div className="mobile-popover-item">
                  <div className="mobile-popover-label">Sloppiness</div>
                  <div className="mobile-popover-btn-group">
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${roughness === 0 ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('roughness', 0)}
                      title="Architect"
                      aria-label="Architect sloppiness"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <line x1="3" y1="10" x2="17" y2="10" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${roughness === 1 ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('roughness', 1)}
                      title="Artist"
                      aria-label="Artist sloppiness"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <path d="M 3 11 Q 7 8 11 11 T 17 9" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${roughness === 2 ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('roughness', 2)}
                      title="Cartoon"
                      aria-label="Cartoon sloppiness"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <path d="M 3 12 Q 6 6 10 12 T 17 8" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M 4 10 Q 7 13 11 8 T 16 11" strokeWidth="1.1" opacity="0.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Edges */}
              {!isText && !isLinearOrFreedraw && (
                <div className="mobile-popover-item">
                  <div className="mobile-popover-label">Edges</div>
                  <div className="mobile-popover-btn-group">
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${(!roundness || roundness === 'sharp') ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('roundness', 'sharp')}
                      title="Sharp edges"
                      aria-label="Sharp edges"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <path d="M 5 15 L 5 5 L 15 5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="miter" strokeDasharray="2 1.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${hasRoundedEdges ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('roundness', 'round')}
                      title="Round edges"
                      aria-label="Round edges"
                    >
                      <svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" fill="none">
                        <path d="M 5 15 L 5 9 Q 5 5 9 5 L 15 5" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 1.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Fill (for shapes) */}
              {!isText && !isLinearOrFreedraw && (
                <div className="mobile-popover-item">
                  <div className="mobile-popover-label">Fill</div>
                  <div className="mobile-popover-btn-group">
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'hachure' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fillStyle', 'hachure')}
                      title="Hachure"
                      aria-label="Hachure fill"
                    >
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                        <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.4" />
                        <line x1="4.5" y1="10" x2="10" y2="4.5" strokeWidth="1.4" />
                        <line x1="10" y1="15.5" x2="15.5" y2="10" strokeWidth="1.4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'cross-hatch' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fillStyle', 'cross-hatch')}
                      title="Cross-hatch"
                      aria-label="Cross-hatch fill"
                    >
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                        <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.3" />
                        <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" strokeWidth="1.3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'solid' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fillStyle', 'solid')}
                      title="Solid"
                      aria-label="Solid fill"
                    >
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
                        <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'dots' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fillStyle', 'dots')}
                      title="Dots"
                      aria-label="Dots fill"
                    >
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                        <circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                        <circle cx="10" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                        <circle cx="13.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'zigzag' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fillStyle', 'zigzag')}
                      title="Zigzag"
                      aria-label="Zigzag fill"
                    >
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                        <path d="M 5 7.5 L 7.5 5.5 L 10 7.5 L 12.5 5.5 L 15 7.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 5 12.5 L 7.5 10.5 L 10 12.5 L 12.5 10.5 L 15 12.5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`ToolIcon ToolIcon_type_radio ${fillStyle === 'dashed' ? 'active' : ''}`}
                      onClick={() => onUpdateProperty('fillStyle', 'dashed')}
                      title="Dashed"
                      aria-label="Dashed fill"
                    >
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                        <rect x="2.5" y="2.5" width="15" height="15" rx="2" strokeWidth="1.5" />
                        <line x1="4.5" y1="15.5" x2="15.5" y2="4.5" strokeWidth="1.4" strokeDasharray="2.5 2" />
                        <line x1="4.5" y1="10" x2="10" y2="4.5" strokeWidth="1.4" strokeDasharray="2 2" />
                        <line x1="10" y1="15.5" x2="15.5" y2="10" strokeWidth="1.4" strokeDasharray="2 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Text Properties */}
              {isText && (
                <>
                  <div className="mobile-popover-item">
                    <div className="mobile-popover-label">Font family</div>
                    <div className="mobile-popover-btn-group">
                      <button
                        type="button"
                        className={`ToolIcon ToolIcon_type_radio ${fontFamily === 5 || fontFamily === 3 ? 'active' : ''}`}
                        onClick={() => onUpdateProperty('fontFamily', 5)}
                        title="Doodle"
                        aria-label="Doodle font"
                        style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'cursive' }}
                      >
                        Aa
                      </button>
                      <button
                        type="button"
                        className={`ToolIcon ToolIcon_type_radio ${fontFamily === 1 || fontFamily === 6 ? 'active' : ''}`}
                        onClick={() => onUpdateProperty('fontFamily', 1)}
                        title="Normal"
                        aria-label="Normal font"
                        style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif' }}
                      >
                        Aa
                      </button>
                      <button
                        type="button"
                        className={`ToolIcon ToolIcon_type_radio ${fontFamily === 2 ? 'active' : ''}`}
                        onClick={() => onUpdateProperty('fontFamily', 2)}
                        title="Code"
                        aria-label="Code font"
                        style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}
                      >
                        Aa
                      </button>
                    </div>
                  </div>

                  <div className="mobile-popover-item">
                    <div className="mobile-popover-label">Font size</div>
                    <div className="mobile-popover-btn-group mobile-popover-fontsize-grid">
                      {[
                        { size: 16, label: 'S' },
                        { size: 20, label: 'M' },
                        { size: 28, label: 'L' },
                        { size: 36, label: 'XL' },
                      ].map((s) => (
                        <button
                          key={s.size}
                          type="button"
                          className={`ToolIcon ToolIcon_type_radio ${fontSize === s.size ? 'active' : ''}`}
                          onClick={() => onUpdateProperty('fontSize', s.size)}
                          title={`Size ${s.label}`}
                          aria-label={`Size ${s.label}`}
                          style={{ fontSize: '12px', fontWeight: 600 }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mobile-popover-item">
                    <div className="mobile-popover-label">Text align</div>
                    <div className="mobile-popover-btn-group">
                      {[
                        { id: 'left', icon: <AlignLeft size={16} />, title: 'Align Left' },
                        { id: 'center', icon: <AlignCenter size={16} />, title: 'Align Center' },
                        { id: 'right', icon: <AlignRight size={16} />, title: 'Align Right' },
                      ].map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`ToolIcon ToolIcon_type_radio ${textAlign === a.id ? 'active' : ''}`}
                          onClick={() => onUpdateProperty('textAlign', a.id)}
                          title={a.title}
                          aria-label={a.title}
                        >
                          {a.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Opacity Slider */}
              <div className="mobile-popover-item">
                <div className="mobile-popover-label">Opacity</div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={opacity}
                  onChange={(e) => onUpdateProperty('opacity', Number(e.target.value))}
                  className="mobile-popover-range"
                  aria-label="Shape opacity"
                />
                <div className="mobile-popover-range-labels">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
