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
  GitFork,
  Activity,
  Layers,
  ToggleLeft,
  ChevronDown,
  Smartphone,
  MousePointerClick,
  Type,
  CheckSquare,
  Plus,
} from 'lucide-react';
import { applyAutoLayout, AUTO_LAYOUT_TYPES } from '../engine/layout/autoLayout.js';
import {
  TOPOLOGY_MODES,
  computeTopologyPositions,
  morphElementsWithSpring,
} from '../engine/layout/topologyBeautifier.js';

const LAYOUT_OPTIONS = [
  {
    id: TOPOLOGY_MODES.SUGIYAMA_HIERARCHICAL,
    title: 'Sugiyama Hierarchical DAG',
    description: 'Layered DAG microservice tiers with edge-crossing minimization',
    icon: GitFork,
  },
  {
    id: TOPOLOGY_MODES.FORCE_DIRECTED,
    title: 'Force-Directed Physics',
    description: 'Spring-embedder physics that organically untangles complex graphs',
    icon: Activity,
  },
  {
    id: TOPOLOGY_MODES.ORTHOGONAL_TIERS,
    title: 'Orthogonal Architecture Tiers',
    description: 'Strict 4-tier matrix: Ingress -> Services -> Queues -> Databases',
    icon: Layers,
  },
  {
    id: TOPOLOGY_MODES.RADIAL_MINDMAP,
    title: 'Radial Mind Ring',
    description: 'Arranges nodes in a symmetric circle around their shared centroid',
    icon: CircleDot,
  },
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
    id: AUTO_LAYOUT_TYPES.SMART_TIDY,
    title: 'Smart Tidy-Up',
    description: 'Equalizes uneven spacing and centers lines without rearranging overall structure',
    icon: Wand2,
  },
];

const STENCIL_ITEMS = [
  {
    id: 'toggle',
    title: 'Toggle Switch',
    description: 'Interactive switch with click sound & toggle state',
    icon: ToggleLeft,
    badge: 'Widget',
  },
  {
    id: 'tabs',
    title: 'Segmented Tabs',
    description: 'Switchable multi-tab navigation bar',
    icon: Layers,
    badge: 'Navigation',
  },
  {
    id: 'dropdown',
    title: 'Dropdown Selector',
    description: 'Select menu with expandable options',
    icon: ChevronDown,
    badge: 'Input',
  },
  {
    id: 'phone',
    title: 'Mobile Device',
    description: 'Interactive phone screen with live apps & camera',
    icon: Smartphone,
    badge: 'Device',
  },
  {
    id: 'button',
    title: 'Action Button',
    description: 'Clickable button with hover & pressed ripple states',
    icon: MousePointerClick,
    badge: 'Action',
  },
  {
    id: 'input',
    title: 'Text Input',
    description: 'Typeable text field with focus outline',
    icon: Type,
    badge: 'Form',
  },
  {
    id: 'checkbox',
    title: 'Interactive Checklist',
    description: 'Checklist with toggleable item checkmarks',
    icon: CheckSquare,
    badge: 'List',
  },
];

export const SmartAutoLayoutModal = memo(function SmartAutoLayoutModal({
  isOpen,
  onClose,
  doodleAPI,
  canvasAPI,
  theme,
  initialTab = 'layout',
}) {
  const api = doodleAPI || canvasAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);
  const isLight = theme === 'light' || (!theme && typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');
  const isDark = !isLight;

  const [activeTab, setActiveTab] = useState(initialTab); // 'layout' | 'stencils'
  const [selectedLayout, setSelectedLayout] = useState(TOPOLOGY_MODES.SUGIYAMA_HIERARCHICAL);
  const [gap, setGap] = useState(60);
  const [columns, setColumns] = useState(3);
  const [applyToSelectionOnly, setApplyToSelectionOnly] = useState(true);
  const [enable60fpsMorph, setEnable60fpsMorph] = useState(true);
  const [isMorphing, setIsMorphing] = useState(false);
  const [justInserted, setJustInserted] = useState(null);

  if (!isOpen) return null;

  const currentElements = api?.getSceneElements?.() || [];
  const appState = api?.getAppState?.() || {};
  const selectedIds = appState?.selectedElementIds || {};
  const selectedCount = Object.keys(selectedIds).filter((id) => selectedIds[id]).length;
  const hasSelection = selectedCount > 1;

  const handleInsertStencil = (stencilType) => {
    if (!api) return;
    if (api.insertInteractiveStencil) {
      api.insertInteractiveStencil(stencilType);
    }
    setJustInserted(stencilType);
    setTimeout(() => setJustInserted(null), 1400);
  };

  const handleApply = () => {
    if (!api || currentElements.length === 0) {
      onClose();
      return;
    }

    const isTopologyMode = Object.values(TOPOLOGY_MODES).includes(selectedLayout);

    if (isTopologyMode) {
      const targetSubset = currentElements.filter((el) => {
        if (applyToSelectionOnly && hasSelection) {
          return Boolean(selectedIds[el.id]);
        }
        return !el.isDeleted;
      });

      const targetPositions = computeTopologyPositions(targetSubset, selectedLayout, {
        nodeSeparation: gap,
        rankSeparation: gap * 1.5,
        springLength: gap * 2.2,
      });

      if (enable60fpsMorph && targetPositions.size > 0) {
        setIsMorphing(true);
        morphElementsWithSpring(
          targetSubset,
          targetPositions,
          (intermediateElements) => {
            const subsetMap = new Map(intermediateElements.map(el => [el.id, el]));
            const nextAll = currentElements.map(el => subsetMap.get(el.id) || el);
            api.updateScene({ elements: nextAll, commitToHistory: false });
          },
          () => {
            setIsMorphing(false);
            const subsetMap = new Map();
            for (const [id, pos] of targetPositions.entries()) {
              const orig = currentElements.find(e => e.id === id);
              if (orig) {
                subsetMap.set(id, { ...orig, x: pos.x, y: pos.y });
              }
            }
            const finalAll = currentElements.map(el => subsetMap.get(el.id) || el);
            api.updateScene({ elements: finalAll, commitToHistory: true });
          }
        );
      } else {
        const subsetMap = new Map();
        for (const [id, pos] of targetPositions.entries()) {
          const orig = currentElements.find(e => e.id === id);
          if (orig) {
            subsetMap.set(id, { ...orig, x: pos.x, y: pos.y });
          }
        }
        const updatedElements = currentElements.map(el => subsetMap.get(el.id) || el);
        api.updateScene({ elements: updatedElements, commitToHistory: true });
      }

      onClose();
      return;
    }

    // Standard Auto-Layout
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

  // Authentic LibrarySidebar Design System & Neutral Dark Palette
  const sidebarBg        = isDark ? '#141417' : '#ffffff';
  const headerBorder     = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e4e4e7';
  const textColor        = isDark ? '#f4f4f5' : '#18181b';
  const subTextColor     = isDark ? '#9ca3af' : '#71717a';
  const cardBg           = isDark ? '#1c1c1f' : '#ffffff';
  const cardBorder       = isDark ? 'rgba(255, 255, 255, 0.07)' : '#e4e4e7';
  const cardActiveBg     = isDark ? '#27272a' : '#f4f4f5';
  const cardActiveBorder = isDark ? 'rgba(255, 255, 255, 0.28)' : '#18181b';
  const pillActiveBg     = isDark ? '#27272a' : '#e4e4e7';
  const pillActiveColor  = isDark ? '#ffffff' : '#18181b';
  const inactivePillColor= isDark ? '#71717a' : '#71717a';
  const iconBg           = isDark ? '#242428' : '#f1f5f9';
  const iconActiveBg     = isDark ? '#333338' : '#18181b';
  const iconColor        = isDark ? '#f4f4f5' : '#52525b';
  const iconActiveColor  = isDark ? '#ffffff' : '#18181b';
  const checkBg          = isDark ? '#ffffff' : '#18181b';
  const checkColor       = isDark ? '#09090b' : '#ffffff';
  const settingsBg       = isDark ? '#18181b' : '#f8fafc';
  const settingsBorder   = isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0';
  const footerBg         = isDark ? '#141417' : '#ffffff';
  const applyBtnBg       = isDark ? '#ffffff' : '#18181b';
  const applyBtnColor    = isDark ? '#09090b' : '#ffffff';
  const cancelColor      = isDark ? '#a1a1aa' : '#52525b';
  const cancelBorder     = isDark ? 'rgba(255, 255, 255, 0.14)' : '#d4d4d8';

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
          background: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(15, 23, 42, 0.16)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* ── LEFT SIDEBAR — Authentic Studio Placement ── */}
      <aside
        className="library-sidebar auto-layout-sidebar"
        style={{
          position: 'fixed',
          top: '38px',
          left: 0,
          bottom: 0,
          width: '360px',
          zIndex: 1000,
          background: sidebarBg,
          borderRight: `1px solid ${headerBorder}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark
            ? '8px 0 32px rgba(0, 0, 0, 0.6)'
            : '12px 0 32px rgba(15, 23, 42, 0.12)',
          fontFamily,
          userSelect: 'none',
          animation: 'slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${headerBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                color: isDark ? '#ffffff' : '#18181b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
              }}
            >
              <Sparkles size={16} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: textColor,
                  lineHeight: 1.25,
                }}
              >
                Smart Auto-Layout
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: subTextColor,
                  lineHeight: 1.2,
                  marginTop: '1px',
                }}
              >
                Neatly organize messy whiteboard content
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Smart Auto-Layout"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              color: subTextColor,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── TAB BAR (Matching LibrarySidebar Design) ── */}
        <div
          style={{
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${headerBorder}`,
            height: '44px',
            flexShrink: 0,
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            style={{
              background: activeTab === 'layout' ? pillActiveBg : 'transparent',
              color: activeTab === 'layout' ? pillActiveColor : inactivePillColor,
              border: 'none',
              borderRadius: '7px',
              padding: '6px 11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: activeTab === 'layout' ? 600 : 500,
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={13} strokeWidth={activeTab === 'layout' ? 2.4 : 1.8} />
            <span>Layout Modes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stencils')}
            style={{
              background: activeTab === 'stencils' ? pillActiveBg : 'transparent',
              color: activeTab === 'stencils' ? pillActiveColor : inactivePillColor,
              border: 'none',
              borderRadius: '7px',
              padding: '6px 11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: activeTab === 'stencils' ? 600 : 500,
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={13} strokeWidth={activeTab === 'stencils' ? 2.4 : 1.8} />
            <span>UI Stencils</span>
          </button>
        </div>

        {/* ── TAB 1: AUTO-LAYOUT MODES ── */}
        {activeTab === 'layout' && (
          <div
            className="auto-layout-sidebar-content"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Layout Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {LAYOUT_OPTIONS.map((opt) => {
                const isSelected = selectedLayout === opt.id;
                const IconComp = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedLayout(opt.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: isSelected ? cardActiveBg : cardBg,
                      border: isSelected
                        ? `1px solid ${cardActiveBorder}`
                        : `1px solid ${cardBorder}`,
                      boxShadow: isSelected && !isDark ? '0 0 0 2px rgba(24, 24, 27, 0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isSelected ? iconActiveBg : iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSelected ? iconActiveColor : iconColor,
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <IconComp size={16} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 650,
                          color: textColor,
                          lineHeight: 1.25,
                        }}
                      >
                        {opt.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: subTextColor,
                          lineHeight: 1.25,
                          marginTop: '2px',
                        }}
                      >
                        {opt.description}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
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

              {/* Grid Columns (only for Grid Matrix) */}
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

              {/* Spring Morphing Toggle */}
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
                  checked={enable60fpsMorph}
                  onChange={(e) => setEnable60fpsMorph(e.target.checked)}
                  style={{ accentColor: applyBtnBg, cursor: 'pointer' }}
                />
                Smooth 60fps spring transition
              </label>
            </div>
          </div>
        )}

        {/* ── TAB 2: INTERACTIVE UI STENCILS ── */}
        {activeTab === 'stencils' && (
          <div
            className="auto-layout-sidebar-content"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '11.5px',
                color: subTextColor,
                lineHeight: 1.4,
                marginBottom: '4px',
                padding: '2px 4px',
              }}
            >
              Interactive widgets with real functional state and audio. Click any component to place on canvas.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {STENCIL_ITEMS.map((st) => {
                const StencilIcon = st.icon;
                const isJustAdded = justInserted === st.id;

                return (
                  <div
                    key={st.id}
                    data-stencil-id={st.id}
                    onClick={() => handleInsertStencil(st.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: isJustAdded ? cardActiveBg : cardBg,
                      border: isJustAdded
                        ? `1px solid ${cardActiveBorder}`
                        : `1px solid ${cardBorder}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: iconColor,
                        flexShrink: 0,
                      }}
                    >
                      <StencilIcon size={16} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 650,
                          color: textColor,
                          lineHeight: 1.25,
                        }}
                      >
                        {st.title}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: subTextColor,
                          lineHeight: 1.25,
                          marginTop: '2px',
                        }}
                      >
                        {st.description}
                      </div>
                    </div>

                    <button
                      type="button"
                      data-stencil-button={st.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertStencil(st.id);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: `1px solid ${cardBorder}`,
                        background: isJustAdded ? (isDark ? '#27272a' : '#18181b') : 'transparent',
                        color: isJustAdded ? '#ffffff' : textColor,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isJustAdded ? (
                        <>
                          <Check size={11} strokeWidth={3} />
                          <span>Placed!</span>
                        </>
                      ) : (
                        <>
                          <Plus size={11} strokeWidth={2.5} />
                          <span>Place</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FOOTER — Sticky at bottom (Shown in Layout Tab) ── */}
        {activeTab === 'layout' && (
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
              disabled={isMorphing}
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
                  : '0 4px 12px rgba(24, 24, 27, 0.16)',
                transition: 'all 0.15s ease',
                fontFamily,
              }}
            >
              <Sparkles size={13} />
              {isMorphing ? 'Morphing...' : 'Apply Auto-Layout'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
});

export default SmartAutoLayoutModal;
