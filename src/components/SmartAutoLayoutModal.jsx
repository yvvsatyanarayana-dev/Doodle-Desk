import React, { useState, memo } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowDown,
  LayoutGrid,
  CircleDot,
  Wand2,
  Check,
} from 'lucide-react';
import { applyAutoLayout, AUTO_LAYOUT_TYPES } from '../engine/layout/autoLayout.js';

const LAYOUT_OPTIONS = [
  {
    id: AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW,
    title: 'Horizontal Pipeline',
    description: 'Sequentially aligns cards from left to right with unified baseline',
    icon: ArrowRight,
  },
  {
    id: AUTO_LAYOUT_TYPES.VERTICAL_FLOW,
    title: 'Vertical Sequence',
    description: 'Stacks items top to bottom centered along a vertical line',
    icon: ArrowDown,
  },
  {
    id: AUTO_LAYOUT_TYPES.GRID_MATRIX,
    title: 'Smart Grid Matrix',
    description: 'Evenly packs shapes into balanced columns and rows with uniform gutters',
    icon: LayoutGrid,
  },
  {
    id: AUTO_LAYOUT_TYPES.RADIAL_CIRCLE,
    title: 'Radial Mind Ring',
    description: 'Arranges nodes in a symmetric circle around their shared centroid',
    icon: CircleDot,
  },
  {
    id: AUTO_LAYOUT_TYPES.SMART_TIDY,
    title: 'Smart Tidy-Up',
    description: 'Equalizes uneven spacing and centers lines without rearranging overall structure',
    icon: Wand2,
  },
];

export const SmartAutoLayoutModal = memo(function SmartAutoLayoutModal({
  isOpen,
  onClose,
  doodleAPI,
  canvasAPI,
  theme,
}) {
  const api = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const isLight = theme === 'light' || (!theme && typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');
  const isDark = !isLight;

  const [selectedLayout, setSelectedLayout] = useState(AUTO_LAYOUT_TYPES.HORIZONTAL_FLOW);
  const [gap, setGap] = useState(60);
  const [columns, setColumns] = useState(3);
  const [applyToSelectionOnly, setApplyToSelectionOnly] = useState(true);

  if (!isOpen) return null;

  const currentElements = api?.getSceneElements?.() || [];
  const appState = api?.getAppState?.() || {};
  const selectedIds = appState?.selectedElementIds || {};
  const selectedCount = Object.keys(selectedIds).filter((id) => selectedIds[id]).length;
  const hasSelection = selectedCount > 1;

  const handleApply = () => {
    if (!api || currentElements.length === 0) {
      onClose();
      return;
    }

    const updatedElements = applyAutoLayout(currentElements, {
      type: selectedLayout,
      selectedIds: applyToSelectionOnly && hasSelection ? selectedIds : null,
      gap,
      columns: selectedLayout === AUTO_LAYOUT_TYPES.GRID_MATRIX ? columns : null,
    });

    api.updateScene({
      elements: updatedElements,
      commitToHistory: true,
    });

    const targetSubset = updatedElements.filter((el) => {
      if (applyToSelectionOnly && hasSelection) {
        return Boolean(selectedIds[el.id]);
      }
      return !el.isDeleted;
    });

    if (targetSubset.length > 0) {
      api.scrollToContent?.(targetSubset, { fitToContent: false, animate: true, duration: 380 });
    }

    onClose();
  };

  // Theme tokens — matching LibrarySidebar design system
  const sidebarBg        = isDark ? '#1a1a1f' : '#ffffff';
  const headerBorder     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const textColor        = isDark ? '#e8e8ed' : '#1a1a1f';
  const subTextColor     = isDark ? '#8e8ea0' : '#71717a';
  const cardBg           = isDark ? 'rgba(255,255,255,0.04)' : '#f9f9fb';
  const cardBorder       = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const cardActiveBg     = isDark ? 'rgba(255,255,255,0.09)' : '#f0f0f5';
  const cardActiveBorder = isDark ? 'rgba(255,255,255,0.28)' : '#18181b';
  const iconBg           = isDark ? 'rgba(255,255,255,0.07)' : '#ebebf0';
  const iconActiveBg     = isDark ? 'rgba(255,255,255,0.18)' : '#18181b';
  const checkBg          = isDark ? '#ffffff' : '#18181b';
  const checkColor       = isDark ? '#09090b' : '#ffffff';
  const settingsBg       = isDark ? 'rgba(255,255,255,0.03)' : '#f4f4f5';
  const settingsBorder   = isDark ? 'rgba(255,255,255,0.06)' : '#e4e4e7';
  const footerBg         = isDark ? '#141417' : '#fafafa';
  const applyBtnBg       = isDark ? '#ffffff' : '#18181b';
  const applyBtnColor    = isDark ? '#09090b' : '#ffffff';
  const cancelColor      = isDark ? '#a1a1aa' : '#71717a';
  const cancelBorder     = isDark ? 'rgba(255,255,255,0.14)' : '#e4e4e7';

  const fontFamily = "'Virgil', 'Doodlefont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return (
    <>
      <div
        className="library-sidebar-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          top: '38px',
          zIndex: 999,
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <aside
        aria-label="AI Smart Auto-Layout"
        style={{
          position: 'fixed',
          top: '38px',
          left: 0,
          bottom: 0,
          width: '360px',
          maxWidth: '90vw',
          zIndex: 1000,
          background: sidebarBg,
          borderRight: `1px solid ${headerBorder}`,
          boxShadow: isDark
            ? '8px 0 32px rgba(0, 0, 0, 0.6)'
            : '8px 0 24px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          animation: 'slideInFromLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box',
          fontFamily,
        }}
      >
      {/* ── HEADER ── */}
      <div
        style={{
          padding: '0 10px 0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${headerBorder}`,
          height: '52px',
          flexShrink: 0,
          gap: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: iconActiveBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: applyBtnColor,
              flexShrink: 0,
            }}
          >
            <Sparkles size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: textColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              AI Smart Auto-Layout
            </div>
            <div style={{ fontSize: '10.5px', color: subTextColor, lineHeight: 1.3 }}>
              Arrange diagrams in 1 click
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            background: 'transparent',
            color: subTextColor,
            border: 'none',
            padding: '0',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            flexShrink: 0,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            e.currentTarget.style.color = textColor;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = subTextColor;
          }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {/* ── BODY — scrollable ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Layout option cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedLayout === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedLayout(opt.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: isSelected ? cardActiveBg : cardBg,
                  border: isSelected
                    ? `1.5px solid ${cardActiveBorder}`
                    : `1px solid ${cardBorder}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Icon chip */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isSelected ? iconActiveBg : iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={15} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: textColor }}>
                    {opt.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: subTextColor,
                      lineHeight: 1.35,
                      marginTop: '1px',
                    }}
                  >
                    {opt.description}
                  </div>
                </div>

                {/* Check indicator */}
                {isSelected && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: checkBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: checkColor,
                      flexShrink: 0,
                    }}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Settings Island ── */}
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: settingsBg,
            border: `1px solid ${settingsBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Gap Slider */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                marginBottom: '6px',
              }}
            >
              <span style={{ color: subTextColor, fontWeight: 600 }}>Element Spacing / Gap</span>
              <span style={{ color: textColor, fontWeight: 700 }}>{gap} px</span>
            </div>
            <input
              type="range"
              min="20"
              max="160"
              step="10"
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              style={{ width: '100%', accentColor: applyBtnBg, cursor: 'pointer' }}
            />
          </div>

          {/* Grid Columns — only when Grid Matrix selected */}
          {selectedLayout === AUTO_LAYOUT_TYPES.GRID_MATRIX && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  marginBottom: '6px',
                }}
              >
                <span style={{ color: subTextColor, fontWeight: 600 }}>Columns in Grid</span>
                <span style={{ color: textColor, fontWeight: 700 }}>{columns} cols</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                style={{ width: '100%', accentColor: applyBtnBg, cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Selection scope toggle */}
          {hasSelection && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                color: textColor,
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={applyToSelectionOnly}
                onChange={(e) => setApplyToSelectionOnly(e.target.checked)}
                style={{ accentColor: applyBtnBg, cursor: 'pointer' }}
              />
              Apply only to {selectedCount} selected shapes
            </label>
          )}
        </div>
      </div>

      {/* ── FOOTER — sticky at bottom ── */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: `1px solid ${headerBorder}`,
          background: footerBg,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: cancelColor,
            background: 'transparent',
            border: `1px solid ${cancelBorder}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          style={{
            flex: 2,
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: applyBtnColor,
            background: applyBtnBg,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: isDark
              ? '0 2px 10px rgba(255, 255, 255, 0.15)'
              : '0 2px 10px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.15s ease',
            fontFamily,
          }}
        >
          <Sparkles size={13} />
          Apply Auto-Layout
        </button>
      </div>
      </aside>
    </>
  );
});

export default SmartAutoLayoutModal;
