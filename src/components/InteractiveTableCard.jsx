import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, X, GripVertical, Sparkles } from 'lucide-react';
import { generateSketchyLinePath, generateSketchyRoundedRectPath } from '../engine/renderer/sketchy.js';
import { InteractiveTableFlashcardsModal } from './InteractiveTableFlashcardsModal.jsx';

/**
 * InteractiveTableCard
 * Native hand-drawn shape interactive table for Doodle Desk canvas.
 * Perfectly matches Table 2:
 * - Authentic sketchy hand-drawn strokes with organic roughness and wobble
 * - Header divider line with subtle corner overshoots
 * - Column divider lines overshooting top and bottom borders
 * - Row divider lines matching the hand-drawn sketch style
 * - Transparent / canvas-matching background (never solid black in light mode)
 * - Handwritten Doodlefont / Virgil typography
 * - No red spellcheck squiggles (spellCheck={false})
 * - Full interactive cell editing and keyboard navigation (Tab/Shift+Tab/Enter)
 * - Seamless row and column addition and deletion
 */
export function InteractiveTableCard({
  element,
  doodleAPI,
  appState,
  isDark = false,
}) {
  const tableData = element.tableData || {};
  const [columns, setColumns] = useState(() => {
    return tableData.columns || [
      { id: 'col_1', title: '', width: 200 },
      { id: 'col_2', title: '', width: 220 },
      { id: 'col_3', title: '', width: 220 },
    ];
  });

  const [rows, setRows] = useState(() => {
    return tableData.rows || [
      { id: 'row_1', cells: { col_1: '', col_2: '', col_3: '' } },
      { id: 'row_2', cells: { col_1: '', col_2: '', col_3: '' } },
    ];
  });

  const [activeCell, setActiveCell] = useState(null);
  const [isHeaderFocused, setIsHeaderFocused] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredRowIdx, setHoveredRowIdx] = useState(null);
  const [hoveredColId, setHoveredColId] = useState(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Flashcards Study Mode state
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);

  const containerRef = useRef(null);
  const activeInputRef = useRef(null);
  const resizingColRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Toolbar visibility: stay visible when selected, editing cell/header, or hovered
  const isSelected = Boolean(appState?.selectedElementIds?.[element.id]);
  const isEditing = activeCell !== null || isHeaderFocused !== null;
  const showToolbar = isSelected || isEditing || isHovered;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // 350ms grace period so mouse transitions smoothly to toolbar without disappearing
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setHoveredRowIdx(null);
      setHoveredColId(null);
    }, 350);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Open flashcard study environment (uses App-level modal if available to avoid canvas stacking context clipping)
  const handleOpenFlashcards = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const currentTableState = {
      ...element,
      tableData: {
        ...tableData,
        columns,
        rows,
      },
    };
    if (typeof window !== 'undefined' && typeof window.__openTableFlashcards === 'function') {
      window.__openTableFlashcards(currentTableState);
    } else {
      setIsFlashcardsOpen(true);
    }
  }, [element, tableData, columns, rows]);

  // Active theme detection
  const isDarkMode = isDark || appState?.theme === 'dark' || (typeof document !== 'undefined' && document.body?.classList.contains('theme--dark'));

  // Shape stroke color
  const strokeColor = useMemo(() => {
    if (element.strokeColor && element.strokeColor !== '#ffffff' && element.strokeColor !== '#1e1e1e') {
      return element.strokeColor;
    }
    return isDarkMode ? '#ffffff' : '#1e1e1e';
  }, [element.strokeColor, isDarkMode]);

  // Stroke width & roughness
  const strokeWidth = typeof element.strokeWidth === 'number' ? element.strokeWidth : 2;
  const roughness = typeof element.roughness === 'number' ? element.roughness : 1;
  const seed = element.seed || 12345;
  const roundRadius = element.roundness === 'sharp' || element.roundness === 0 ? 0 : 16;

  // Handwriting font stack
  const fontStack = useMemo(() => {
    const family = element.fontFamily;
    if (family === 1) return 'Helvetica, Arial, sans-serif';
    if (family === 2) return '"Cascadia Code", "Fira Code", monospace';
    if (family === 3) return '"Virgil", cursive';
    if (family === 6) return '"Nunito", sans-serif';
    if (family === 7) return '"Comic Shanns", cursive';
    if (family === 8) return '"Patrick Hand", cursive';
    return '"Doodlefont", "Virgil", cursive, sans-serif';
  }, [element.fontFamily]);

  // Geometry dimensions
  const width = Math.max(100, element.width || 680);
  const height = Math.max(80, element.height || 200);
  const headerHeight = 52;
  const overshoot = roughness > 0 ? 5 : 0;

  // Proportional scaling for perfect HTML grid & SVG alignment
  const totalColW = useMemo(() => columns.reduce((sum, c) => sum + (c.width || 200), 0), [columns]);
  const scaleX = useMemo(() => width / (totalColW || 1), [width, totalColW]);
  const bodyH = Math.max(40, height - headerHeight);
  const rowH = useMemo(() => (rows.length > 0 ? bodyH / rows.length : bodyH), [bodyH, rows.length]);

  // 1. Outer Sketchy Rounded Rectangle Path
  const outerBoxPath = useMemo(() => {
    return generateSketchyRoundedRectPath(0, 0, width, height, roundRadius, seed, roughness);
  }, [width, height, roundRadius, seed, roughness]);

  // 2. Header Horizontal Dividing Line (with overshoot)
  const headerLinePath = useMemo(() => {
    return generateSketchyLinePath(-overshoot, headerHeight, width + overshoot, headerHeight, seed + 101, roughness);
  }, [width, headerHeight, overshoot, seed, roughness]);

  // 3. Row Horizontal Dividing Lines (with overshoot)
  const rowLinePaths = useMemo(() => {
    if (rows.length <= 1) return [];
    const paths = [];
    for (let r = 0; r < rows.length - 1; r++) {
      const rowY = headerHeight + (r + 1) * rowH;
      paths.push(generateSketchyLinePath(-overshoot, rowY, width + overshoot, rowY, seed + 200 + r * 37, roughness));
    }
    return paths;
  }, [rows.length, rowH, headerHeight, width, overshoot, seed, roughness]);

  // 4. Column Vertical Dividing Lines (with vertical overshoot extending past top and bottom borders)
  const colLinePaths = useMemo(() => {
    if (columns.length <= 1) return [];
    let currX = 0;
    const paths = [];
    for (let c = 0; c < columns.length - 1; c++) {
      currX += (columns[c].width || 200) * scaleX;
      paths.push(generateSketchyLinePath(currX, -overshoot - 2, currX, height + overshoot + 2, seed + 300 + c * 43, roughness));
    }
    return paths;
  }, [columns, scaleX, height, overshoot, seed, roughness]);

  // Persist table changes to canvas scene
  const persistTable = useCallback((newCols, newRows, commitHistory = false) => {
    if (!doodleAPI) return;
    const allElements = doodleAPI.getSceneElements?.() || [];

    const colsToUse = newCols || columns;
    const rowsToUse = newRows || rows;

    const computedColWidths = {};
    colsToUse.forEach((col) => {
      let maxLen = (col.title || '').length;
      rowsToUse.forEach((r) => {
        const lines = (r.cells?.[col.id] || '').split('\n');
        lines.forEach((line) => {
          if (line.length > maxLen) maxLen = line.length;
        });
      });
      const autoWidth = Math.max(140, Math.min(500, Math.round(maxLen * 10.5 + 44)));
      computedColWidths[col.id] = Math.max(autoWidth, col.width ? Math.min(col.width, 500) : 160);
    });

    let totalBodyHeight = 0;
    rowsToUse.forEach((r) => {
      let maxLines = 1;
      colsToUse.forEach((c) => {
        const text = r.cells?.[c.id] || '';
        const lines = text.split('\n').length;
        const colW = computedColWidths[c.id] || 200;
        const charsPerLine = Math.max(12, Math.floor(colW / 10));
        const wrapped = Math.max(lines, Math.ceil(text.length / charsPerLine));
        if (wrapped > maxLines) maxLines = wrapped;
      });
      totalBodyHeight += Math.max(50, maxLines * 26 + 20);
    });

    const totalW = colsToUse.reduce((sum, c) => sum + (computedColWidths[c.id] || 200), 0);
    const totalH = headerHeight + totalBodyHeight;

    const updated = allElements.map((el) =>
      el.id === element.id
        ? {
            ...el,
            width: totalW,
            height: totalH,
            strokeColor: strokeColor,
            tableData: {
              columns: colsToUse.map(c => ({ ...c, width: computedColWidths[c.id] || c.width || 200 })),
              rows: rowsToUse,
              showHeader: true,
              autoArrange: true,
            },
            version: (el.version || 1) + 1,
            versionNonce: Math.floor(Math.random() * 100000),
          }
        : el
    );

    doodleAPI.updateScene({ elements: updated, commitToHistory: commitHistory });
  }, [columns, rows, strokeColor, doodleAPI, element.id, headerHeight]);

  // Focus active cell input
  useEffect(() => {
    if (activeCell && activeInputRef.current) {
      activeInputRef.current.focus();
      const len = activeInputRef.current.value?.length || 0;
      activeInputRef.current.setSelectionRange?.(len, len);
    }
  }, [activeCell]);

  // Handle cell edit
  const handleCellChange = (rowIdx, colId, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) => {
        if (i !== rowIdx) return r;
        return {
          ...r,
          cells: {
            ...r.cells,
            [colId]: value,
          },
        };
      });
      persistTable(columns, next, false);
      return next;
    });
  };

  // Handle header edit
  const handleHeaderChange = (colId, newTitle) => {
    setColumns((prev) => {
      const next = prev.map((c) => (c.id === colId ? { ...c, title: newTitle } : c));
      persistTable(next, rows, true);
      return next;
    });
  };

  // Add column
  const handleAddColumn = (afterIdx = null) => {
    const newColId = `col_${Date.now()}`;
    const newCol = {
      id: newColId,
      title: '',
      width: 220,
    };

    let nextCols;
    if (afterIdx !== null && afterIdx >= 0 && afterIdx < columns.length) {
      nextCols = [...columns.slice(0, afterIdx + 1), newCol, ...columns.slice(afterIdx + 1)];
    } else {
      nextCols = [...columns, newCol];
    }

    setColumns(nextCols);
    persistTable(nextCols, rows, true);
    setActiveCell({ rowIdx: activeCell?.rowIdx || 0, colId: newColId });
  };

  // Delete column
  const handleDeleteColumn = (colIdToDelete) => {
    if (columns.length <= 1) return;
    const targetColId = colIdToDelete || activeCell?.colId || columns[columns.length - 1].id;
    const nextCols = columns.filter((c) => c.id !== targetColId);
    setColumns(nextCols);
    if (activeCell?.colId === targetColId) {
      setActiveCell({ rowIdx: activeCell.rowIdx, colId: nextCols[0].id });
    }
    persistTable(nextCols, rows, true);
  };

  // Add row
  const handleAddRow = (afterIdx = null) => {
    const newRowId = `row_${Date.now()}`;
    const emptyCells = {};
    columns.forEach((c) => {
      emptyCells[c.id] = '';
    });
    const newRow = { id: newRowId, cells: emptyCells };

    let nextRows;
    const insertAfter = afterIdx !== null ? afterIdx : (activeCell?.rowIdx ?? rows.length - 1);
    if (insertAfter >= 0 && insertAfter < rows.length) {
      nextRows = [...rows.slice(0, insertAfter + 1), newRow, ...rows.slice(insertAfter + 1)];
    } else {
      nextRows = [...rows, newRow];
    }

    setRows(nextRows);
    persistTable(columns, nextRows, true);

    const targetRowIdx = insertAfter + 1;
    setActiveCell({ rowIdx: targetRowIdx, colId: activeCell?.colId || columns[0].id });
  };

  // Delete row
  const handleDeleteRow = (rowIdxToDelete = null) => {
    if (rows.length <= 1) return;
    const targetIdx = rowIdxToDelete !== null ? rowIdxToDelete : (activeCell?.rowIdx ?? rows.length - 1);
    const nextRows = rows.filter((_, i) => i !== targetIdx);
    setRows(nextRows);
    const newRowIdx = Math.min(targetIdx, nextRows.length - 1);
    setActiveCell({ rowIdx: newRowIdx, colId: activeCell?.colId || columns[0].id });
    persistTable(columns, nextRows, true);
  };

  // Keyboard navigation
  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();

      const isLastCol = colIdx === columns.length - 1;
      const isLastRow = rowIdx === rows.length - 1;

      if (e.shiftKey) {
        if (colIdx > 0) {
          setActiveCell({ rowIdx, colId: columns[colIdx - 1].id });
        } else if (rowIdx > 0) {
          setActiveCell({ rowIdx: rowIdx - 1, colId: columns[columns.length - 1].id });
        }
      } else {
        if (!isLastCol) {
          setActiveCell({ rowIdx, colId: columns[colIdx + 1].id });
        } else if (!isLastRow) {
          setActiveCell({ rowIdx: rowIdx + 1, colId: columns[0].id });
        } else {
          handleAddRow(rows.length - 1);
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (rowIdx < rows.length - 1) {
        setActiveCell({ rowIdx: rowIdx + 1, colId: columns[colIdx].id });
      } else {
        handleAddRow(rows.length - 1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setActiveCell(null);
      setIsHeaderFocused(null);
      setContextMenu(null);
    }
  };

  // Right-click context menu handler
  const handleContextMenu = (e, rowIdx, colId) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0);
    const y = e.clientY - (rect?.top || 0);
    setActiveCell({ rowIdx, colId });
    setContextMenu({ x, y, rowIdx, colId });
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  // Column manual resizing
  const handleMouseDownResize = (e, colId, colIdx) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = {
      colId,
      colIdx,
      startX: e.clientX,
      startWidth: columns[colIdx]?.width || 200,
    };

    const handleMouseMove = (moveEv) => {
      if (!resizingColRef.current) return;
      const dx = moveEv.clientX - resizingColRef.current.startX;
      const newW = Math.max(120, Math.min(600, resizingColRef.current.startWidth + dx));
      setColumns((prev) =>
        prev.map((c) => (c.id === resizingColRef.current.colId ? { ...c, width: newW } : c))
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (resizingColRef.current) {
        resizingColRef.current = null;
        persistTable(undefined, undefined, true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const hasCrossHatch = element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle === 'cross-hatch';
  const hasHachure = element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle === 'hachure';

  return (
    <div
      ref={containerRef}
      className="interactive-table-shape"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
        border: 'none',
        color: strokeColor,
        fontFamily: fontStack,
        userSelect: 'none',
        pointerEvents: 'auto',
        overflow: 'visible',
      }}
      onPointerDown={(e) => {
        // Stop canvas from capturing clicks or initiating drag while editing or clicking toolbar buttons
        if (e.target.closest('input, textarea, button, .table-toolbar-bridge')) {
          e.stopPropagation();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseOver={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        e.stopPropagation();
        doodleAPI?.setSelectedElements?.({ [element.id]: true });
      }}
    >
      {/* ── Native Hand-Drawn Sketchy SVG Vector Layer (Matches Table 2) ── */}
      <svg
        style={{
          position: 'absolute',
          top: -12,
          left: -12,
          width: 'calc(100% + 24px)',
          height: 'calc(100% + 24px)',
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex: 0,
        }}
        viewBox={`-12 -12 ${width + 24} ${height + 24}`}
      >
        <defs>
          {hasCrossHatch && (
            <pattern
              id={`table-crosshatch-${element.id}`}
              width="14"
              height="14"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="14" stroke={element.backgroundColor} strokeWidth="1.5" />
              <line x1="0" y1="0" x2="14" y2="0" stroke={element.backgroundColor} strokeWidth="1.5" />
            </pattern>
          )}

          {hasHachure && (
            <pattern
              id={`table-hachure-${element.id}`}
              width="14"
              height="14"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="14" stroke={element.backgroundColor} strokeWidth="1.5" />
            </pattern>
          )}
        </defs>

        {/* 1. Outer Hand-Drawn Rounded Rectangle */}
        <path
          d={outerBoxPath}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={
            hasCrossHatch
              ? `url(#table-crosshatch-${element.id})`
              : hasHachure
              ? `url(#table-hachure-${element.id})`
              : element.backgroundColor && element.backgroundColor !== 'transparent' && element.fillStyle === 'solid'
              ? element.backgroundColor
              : 'transparent'
          }
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Header Horizontal Dividing Line (with hand-drawn corner overshoot) */}
        <path
          d={headerLinePath}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Row Horizontal Dividing Lines (with hand-drawn corner overshoot) */}
        {rowLinePaths.map((dStr, idx) => (
          <path
            key={`row-line-${idx}`}
            d={dStr}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* 4. Column Vertical Dividing Lines (overshooting top and bottom borders like Table 2) */}
        {colLinePaths.map((dStr, idx) => (
          <path
            key={`col-line-${idx}`}
            d={dStr}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* ── Floating Quick Action Pill (Floats cleanly ABOVE the table) ── */}
      {showToolbar && (
        <div
          className="table-toolbar-bridge"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '-42px',
            right: '0px',
            paddingBottom: '14px',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            className="table-toolbar-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '20px',
              background: isDarkMode ? 'rgba(39, 39, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)',
              border: `1.5px solid ${strokeColor}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              title="Drag to move table"
              onPointerDown={() => {
                doodleAPI?.setSelectedElements?.({ [element.id]: true });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'grab',
                padding: '2px 3px',
                color: strokeColor,
                opacity: 0.65,
              }}
            >
              <GripVertical size={13} />
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleOpenFlashcards}
              title="Study Table as Flashcards (Question & Answer Study Mode)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
                borderRadius: '12px',
                border: 'none',
                background: '#6366f1',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 2px 6px rgba(99,102,241,0.35)',
              }}
            >
              <Sparkles size={11} />
              <span>Flashcards</span>
            </button>

            <div style={{ width: '1px', height: '14px', background: strokeColor, opacity: 0.25, margin: '0 2px' }} />

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddColumn();
              }}
              title="Add Column"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: 'none',
                background: isDarkMode ? '#3f3f46' : '#f1f5f9',
                color: strokeColor,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={11} />
              <span>Col</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddRow();
              }}
              title="Add Row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: 'none',
                background: isDarkMode ? '#3f3f46' : '#f1f5f9',
                color: strokeColor,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Plus size={11} />
              <span>Row</span>
            </button>

            <div style={{ width: '1px', height: '14px', background: strokeColor, opacity: 0.3, margin: '0 2px' }} />

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteColumn();
              }}
              disabled={columns.length <= 1}
              title={columns.length <= 1 ? 'Cannot delete only column' : 'Delete Active Column'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: columns.length <= 1 ? (isDarkMode ? '#52525b' : '#cbd5e1') : '#ef4444',
                fontSize: '11px',
                fontWeight: 600,
                cursor: columns.length <= 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Trash2 size={11} />
              <span>Col</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteRow();
              }}
              disabled={rows.length <= 1}
              title={rows.length <= 1 ? 'Cannot delete only row' : 'Delete Active Row'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: 'none',
                background: 'transparent',
                color: rows.length <= 1 ? (isDarkMode ? '#52525b' : '#cbd5e1') : '#ef4444',
                fontSize: '11px',
                fontWeight: 600,
                cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Trash2 size={11} />
              <span>Row</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Table Header Row ── */}
      <div
        style={{
          display: 'flex',
          boxSizing: 'border-box',
          height: `${headerHeight}px`,
          minHeight: `${headerHeight}px`,
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        {columns.map((col, colIdx) => {
          const isLastCol = colIdx === columns.length - 1;
          const isHeaderEditing = isHeaderFocused === col.id;
          const isColHovered = hoveredColId === col.id;
          const colWidth = (col.width || 200) * scaleX;

          return (
            <div
              key={col.id}
              onClick={(e) => {
                e.stopPropagation();
                setIsHeaderFocused(col.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoveredColId(col.id)}
              onMouseLeave={() => setHoveredColId(null)}
              onContextMenu={(e) => handleContextMenu(e, 0, col.id)}
              style={{
                width: `${colWidth}px`,
                flexShrink: 0,
                flexGrow: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 18px',
                border: 'none',
                boxSizing: 'border-box',
                cursor: 'text',
              }}
            >
              {isHeaderEditing ? (
                <input
                  ref={activeInputRef}
                  type="text"
                  value={col.title}
                  onChange={(e) => handleHeaderChange(col.id, e.target.value)}
                  onBlur={() => setIsHeaderFocused(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') setIsHeaderFocused(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    textAlign: 'center',
                    fontFamily: 'inherit',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: strokeColor,
                    width: '100%',
                    padding: 0,
                    margin: 0,
                    userSelect: 'text',
                    cursor: 'text',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: strokeColor,
                    userSelect: 'none',
                  }}
                >
                  {col.title || ''}
                </span>
              )}

              {/* Direct column delete button */}
              {isColHovered && columns.length > 1 && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteColumn(col.id);
                  }}
                  title="Delete this column"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '12px',
                    background: isDarkMode ? '#27272a' : '#e2e8f0',
                    border: `1px solid ${strokeColor}`,
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    cursor: 'pointer',
                    zIndex: 30,
                  }}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}

              {/* Column manual resize drag handle */}
              {!isLastCol && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleMouseDownResize(e, col.id, colIdx)}
                  title="Drag to resize column width"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -5,
                    width: '10px',
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 20,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Table Body Rows (Flex to fill 100% of body height with continuous vertical divider) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%', zIndex: 1 }}>
        {rows.map((row, rowIdx) => {
          const isRowHovered = hoveredRowIdx === rowIdx;

          return (
            <div
              key={row.id}
              onMouseEnter={() => setHoveredRowIdx(rowIdx)}
              onMouseLeave={() => setHoveredRowIdx(null)}
              style={{
                position: 'relative',
                display: 'flex',
                height: `${rowH}px`,
                minHeight: `${rowH}px`,
                maxHeight: `${rowH}px`,
                border: 'none',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              {/* Direct row delete button */}
              {isRowHovered && rows.length > 1 && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRow(rowIdx);
                  }}
                  title="Delete this row"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '6px',
                    transform: 'translateY(-50%)',
                    background: isDarkMode ? '#27272a' : '#e2e8f0',
                    border: `1px solid ${strokeColor}`,
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    cursor: 'pointer',
                    zIndex: 30,
                  }}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}

              {/* Row Cells */}
              {columns.map((col, colIdx) => {
                const isLastCol = colIdx === columns.length - 1;
                const cellValue = row.cells?.[col.id] || '';
                const isFocused = activeCell?.rowIdx === rowIdx && activeCell?.colId === col.id;
                const colWidth = (col.width || 200) * scaleX;

                return (
                  <div
                    key={col.id}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCell({ rowIdx, colId: col.id });
                      setIsHeaderFocused(null);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, rowIdx, col.id)}
                    style={{
                      width: `${colWidth}px`,
                      flexShrink: 0,
                      flexGrow: 0,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      border: 'none',
                      boxSizing: 'border-box',
                      cursor: 'text',
                      height: '100%',
                      backgroundColor: isFocused
                        ? (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
                        : 'transparent',
                    }}
                  >
                    {isFocused ? (
                      <textarea
                        ref={activeInputRef}
                        value={cellValue}
                        onChange={(e) => handleCellChange(rowIdx, col.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onBlur={() => {}}
                        rows={Math.max(1, cellValue.split('\n').length)}
                        placeholder=""
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        style={{
                          width: '100%',
                          minHeight: '26px',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit',
                          fontSize: '19px',
                          color: strokeColor,
                          padding: 0,
                          margin: 0,
                          lineHeight: '26px',
                          userSelect: 'text',
                          cursor: 'text',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          minHeight: '24px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: '26px',
                          fontSize: '19px',
                          color: strokeColor,
                          userSelect: 'none',
                          cursor: 'text',
                        }}
                      >
                        {cellValue || ''}
                      </div>
                    )}

                    {/* Column resize drag handle */}
                    {!isLastCol && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => handleMouseDownResize(e, col.id, colIdx)}
                        title="Drag to resize column width"
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: -5,
                          width: '10px',
                          height: '100%',
                          cursor: 'col-resize',
                          zIndex: 20,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Right-Click Cell Context Menu ── */}
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: isDarkMode ? '#27272a' : '#ffffff',
            border: `1px solid ${strokeColor}`,
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            padding: '4px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            fontSize: '12px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            minWidth: '160px',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              handleAddRow(contextMenu.rowIdx - 1);
              setContextMenu(null);
            }}
            style={contextBtnStyle(isDarkMode, strokeColor)}
          >
            <Plus size={12} />
            <span>Insert Row Above</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleAddRow(contextMenu.rowIdx);
              setContextMenu(null);
            }}
            style={contextBtnStyle(isDarkMode, strokeColor)}
          >
            <Plus size={12} />
            <span>Insert Row Below</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleDeleteRow(contextMenu.rowIdx);
              setContextMenu(null);
            }}
            disabled={rows.length <= 1}
            style={{
              ...contextBtnStyle(isDarkMode, strokeColor),
              color: rows.length <= 1 ? '#71717a' : '#ef4444',
            }}
          >
            <Trash2 size={12} />
            <span>Delete Row</span>
          </button>

          <div style={{ height: '1px', background: strokeColor, opacity: 0.25, margin: '2px 0' }} />

          <button
            type="button"
            onClick={() => {
              const colIdx = columns.findIndex(c => c.id === contextMenu.colId);
              handleAddColumn(colIdx);
              setContextMenu(null);
            }}
            style={contextBtnStyle(isDarkMode, strokeColor)}
          >
            <Plus size={12} />
            <span>Insert Column Right</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleDeleteColumn(contextMenu.colId);
              setContextMenu(null);
            }}
            disabled={columns.length <= 1}
            style={{
              ...contextBtnStyle(isDarkMode, strokeColor),
              color: columns.length <= 1 ? '#71717a' : '#ef4444',
            }}
          >
            <Trash2 size={12} />
            <span>Delete Column</span>
          </button>

          <div style={{ height: '1px', background: strokeColor, opacity: 0.25, margin: '2px 0' }} />

          <button
            type="button"
            onClick={(e) => {
              setContextMenu(null);
              handleOpenFlashcards(e);
            }}
            style={{
              ...contextBtnStyle(isDarkMode, strokeColor),
              color: '#6366f1',
              fontWeight: 700,
            }}
          >
            <Sparkles size={12} />
            <span>Practice as Flashcards...</span>
          </button>
        </div>
      )}

      {/* ── Interactive Table Flashcards Study Environment ── */}
      {isFlashcardsOpen && (
        <InteractiveTableFlashcardsModal
          isOpen={isFlashcardsOpen}
          onClose={() => setIsFlashcardsOpen(false)}
          tableElement={{
            ...element,
            tableData: {
              ...tableData,
              columns,
              rows,
            },
          }}
          isDark={isDarkMode}
        />
      )}
    </div>
  );
}

function contextBtnStyle(isDark, strokeColor) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    border: 'none',
    background: 'transparent',
    color: strokeColor,
    fontSize: '12px',
    cursor: 'pointer',
    borderRadius: '4px',
    textAlign: 'left',
    width: '100%',
  };
}

export default InteractiveTableCard;
