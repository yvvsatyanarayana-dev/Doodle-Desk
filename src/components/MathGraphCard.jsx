import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  Sparkles,
  Trash2,
  ChevronDown,
  Sliders,
  RefreshCw,
  FileText,
  Pencil,
  Calculator,
  Check,
  Plus,
} from 'lucide-react';
import {
  MATH_PRESETS,
  compileMathFunction,
  generateGraphPlot,
  formatMathFormulaText,
} from '../utils/mathGraphEngine.js';

export function MathGraphCard({
  element,
  doodleAPI,
  isDark = true,
}) {
  const initialPreset = MATH_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState(initialPreset.id);
  const [title, setTitle] = useState(element.name || element.title || 'Math Function & Graph');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [formulaStr, setFormulaStr] = useState(element.formulaStr || 'sin(x)');
  const [latexStr, setLatexStr] = useState(element.latexStr || 'f(x) = \\sin(x)');
  const [params, setParams] = useState(element.params || { a: 2, b: 1, c: 0 });
  const [xRange, setXRange] = useState(element.xRange || [-10, 10]);
  const [yRange, setYRange] = useState(element.yRange || [-4, 4]);
  const [calcX, setCalcX] = useState(2);
  const [calcResult, setCalcResult] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const formulaInputRef = useRef(null);
  const svgRef = useRef(null);

  // Compile user-written math function dynamically
  const compiledFn = useMemo(() => {
    return compileMathFunction(formulaStr) || compileMathFunction(initialPreset.formula);
  }, [formulaStr, initialPreset.formula]);

  // Compute live calculator output for calcX
  useEffect(() => {
    if (!compiledFn) {
      setCalcResult(null);
      return;
    }
    try {
      const val = compiledFn(Number(calcX), params.a ?? 1, params.b ?? 1, params.c ?? 0);
      if (typeof val === 'number' && !isNaN(val)) {
        setCalcResult(Number(val.toFixed(4)));
      } else {
        setCalcResult('Undefined / NaN');
      }
    } catch {
      setCalcResult('Error');
    }
  }, [calcX, compiledFn, params]);

  // Generate SVG graph coordinates
  const plotData = useMemo(() => {
    if (!compiledFn) return { pathD: '', points: [], originX: 0, originY: 0 };
    return generateGraphPlot({
      fn: compiledFn,
      params,
      xRange,
      yRange,
      width: 440,
      height: 200,
      padding: 26,
    });
  }, [compiledFn, params, xRange, yRange]);

  // Sync formula changes to element
  const handleFormulaChange = (newFormula) => {
    setFormulaStr(newFormula);
    setLatexStr(`f(x) = ${newFormula}`);

    if (doodleAPI) {
      const all = doodleAPI.getSceneElements?.() || [];
      const updated = all.map((el) =>
        el.id === element.id
          ? {
              ...el,
              formulaStr: newFormula,
              latexStr: `f(x) = ${newFormula}`,
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: false });
    }
  };

  const handleTitleSave = (newTitle) => {
    setTitle(newTitle);
    setIsEditingTitle(false);
    if (doodleAPI) {
      const all = doodleAPI.getSceneElements?.() || [];
      const updated = all.map((el) =>
        el.id === element.id
          ? {
              ...el,
              name: newTitle,
              title: newTitle,
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: true });
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setFormulaStr(preset.formula);
    setLatexStr(preset.latex);
    setParams(preset.params);
    setXRange(preset.xRange);
    setYRange(preset.yRange);
    setIsPresetsOpen(false);

    if (doodleAPI) {
      const all = doodleAPI.getSceneElements?.() || [];
      const updated = all.map((el) =>
        el.id === element.id
          ? {
              ...el,
              formulaStr: preset.formula,
              latexStr: preset.latex,
              params: preset.params,
              xRange: preset.xRange,
              yRange: preset.yRange,
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: false });
    }
  };

  // Helper chip insert
  const insertChip = (snippet) => {
    const input = formulaInputRef.current;
    if (!input) {
      handleFormulaChange(formulaStr + snippet);
      return;
    }
    const start = input.selectionStart || formulaStr.length;
    const end = input.selectionEnd || formulaStr.length;
    const updated = formulaStr.slice(0, start) + snippet + formulaStr.slice(end);
    handleFormulaChange(updated);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 20);
  };

  const handleParamChange = (paramKey, val) => {
    const updated = { ...params, [paramKey]: parseFloat(val) };
    setParams(updated);
  };

  // Stamp mathematical formula and curve directly as real Doodle Canvas shapes
  const handleStampToCanvas = (e) => {
    e?.stopPropagation?.();
    if (!doodleAPI || !plotData.points?.length) return;
    const all = doodleAPI.getSceneElements?.() || [];
    const spawnX = (element.x || 100) + (element.width || 440) + 40;
    const spawnY = element.y || 100;

    // Formula label text
    const labelEl = {
      id: `math_txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'text',
      x: spawnX,
      y: spawnY,
      width: 320,
      height: 36,
      text: `f(x) = ${formulaStr}`,
      fontSize: 18,
      fontFamily: 1, // Hand-drawn
      strokeColor: '#06b6d4',
      isDeleted: false,
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
    };

    // Freehand curve points
    const curvePoints = plotData.points.map((pt) => [pt.px, pt.py]);
    const curveEl = {
      id: `math_curve_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'freedraw',
      x: spawnX,
      y: spawnY + 45,
      width: Math.abs(element.width || 440),
      height: 200,
      points: curvePoints,
      strokeColor: '#38bdf8',
      strokeWidth: 2,
      isDeleted: false,
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
    };

    doodleAPI.updateScene({ elements: [...all, labelEl, curveEl], commitToHistory: true });
    doodleAPI.setSelectedElements?.({ [labelEl.id]: true, [curveEl.id]: true });
    doodleAPI.onToast?.('Stamped math formula & curve onto canvas!');
    setIsStamped(true);
    setTimeout(() => setIsStamped(false), 2000);
  };

  const handleDelete = (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (doodleAPI) {
      const allElements = doodleAPI.getSceneElements?.() || [];
      const updated = allElements.map((el) =>
        el.id === element.id
          ? { ...el, isDeleted: true, version: (el.version || 1) + 1, versionNonce: Math.floor(Math.random() * 100000) }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: true });
      doodleAPI.setSelectedElements?.({});
    }
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current || !plotData.toMathX || !compiledFn) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const mathX = plotData.toMathX(px);
    try {
      const mathY = compiledFn(mathX, params.a ?? 1, params.b ?? 1, params.c ?? 0);
      if (isFinite(mathY)) {
        setHoverPoint({
          x: Number(mathX.toFixed(2)),
          y: Number(mathY.toFixed(2)),
          px,
          py: plotData.toScreenY(mathY),
        });
      }
    } catch {
      setHoverPoint(null);
    }
  };

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e4e4e7';
  const cardBg = isDark ? '#141418' : '#ffffff';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: cardBg,
        borderRadius: '8px',
        color: isDark ? '#f4f4f5' : '#18181b',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        border: `1px solid ${borderColor}`,
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => {
        if (['input', 'button', 'select'].includes(e.target.tagName?.toLowerCase())) {
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        if (!['input', 'button'].includes(e.target.tagName?.toLowerCase())) {
          doodleAPI?.setSelectedElements?.({ [element.id]: true });
        }
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Activity size={15} style={{ color: '#06b6d4', flexShrink: 0 }} />

          {/* Editable Title */}
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              defaultValue={title}
              onBlur={(e) => handleTitleSave(e.target.value.trim() || 'Math Function & Graph')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave(e.target.value.trim() || 'Math Function & Graph');
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: isDark ? '#1f1f28' : '#f1f5f9',
                color: isDark ? '#f4f4f5' : '#18181b',
                border: '1px solid #06b6d4',
                borderRadius: '4px',
                padding: '2px 6px',
                outline: 'none',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename math card"
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#f4f4f5' : '#18181b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </span>
              <Pencil size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
            </div>
          )}

          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
              flexShrink: 0,
            }}
          >
            2D Curve
          </span>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Controls toggle */}
          <button
            type="button"
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            style={{
              background: isControlsOpen ? 'rgba(6, 182, 212, 0.2)' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
              border: `1px solid ${borderColor}`,
              borderRadius: '5px',
              padding: '4px 7px',
              fontSize: '11px',
              color: isControlsOpen ? '#38bdf8' : (isDark ? '#e4e4e7' : '#27272a'),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Adjust formula parameters and domain"
          >
            <Sliders size={11} />
            <span>Scale</span>
          </button>

          {/* Preset Selector */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPresetsOpen(!isPresetsOpen);
              }}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${borderColor}`,
                borderRadius: '5px',
                padding: '4px 8px',
                fontSize: '11px',
                color: isDark ? '#e4e4e7' : '#27272a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Example Math Presets"
            >
              <Sparkles size={11} style={{ color: '#38bdf8' }} />
              <span>Presets</span>
              <ChevronDown size={11} />
            </button>

            {isPresetsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  width: '220px',
                  background: isDark ? '#1c1c22' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  zIndex: 20,
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {MATH_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '11px',
                      color: isDark ? '#e4e4e7' : '#27272a',
                      cursor: 'pointer',
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f4f4f5',
                      background: selectedPresetId === p.id ? (isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)') : 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: isDark ? '#a1a1aa' : '#71717a', fontFamily: 'monospace' }}>
                      {formatMathFormulaText(p.latex)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stamp to Canvas */}
          <button
            type="button"
            onClick={handleStampToCanvas}
            style={{
              background: isStamped ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: `1px solid ${borderColor}`,
              borderRadius: '5px',
              padding: '4px 6px',
              color: isStamped ? '#10b981' : isDark ? '#a1a1aa' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
            title="Convert math plot to native Doodle Canvas vector curve and text"
          >
            <FileText size={12} />
            <span style={{ fontSize: '10px' }}>Stamp</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Delete card from canvas"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Write Your Own Math Formula Bar */}
      <div
        style={{
          padding: '8px 12px',
          background: isDark ? '#0c0c0e' : '#f8fafc',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: '#38bdf8',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            f(x) =
          </span>
          <input
            ref={formulaInputRef}
            type="text"
            value={formulaStr}
            onChange={(e) => handleFormulaChange(e.target.value)}
            placeholder="Type formula, e.g. sin(x) + cos(2*x), x^2 - 4..."
            style={{
              flex: 1,
              background: isDark ? '#181820' : '#ffffff',
              border: `1px solid ${compiledFn ? (isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1') : '#ef4444'}`,
              borderRadius: '5px',
              padding: '5px 10px',
              fontSize: '12px',
              fontFamily: '"Fira Code", Consolas, monospace',
              color: isDark ? '#f4f4f5' : '#18181b',
              outline: 'none',
              pointerEvents: 'auto',
            }}
          />
        </div>

        {/* Math Quick-Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {['x^2', 'sin(x)', 'cos(x)', 'sqrt(x)', '1/x', 'exp(-x)', 'abs(x)', 'pi'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => insertChip(chip)}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: isDark ? '#cbd5e1' : '#475569',
                cursor: 'pointer',
              }}
              title={`Insert ${chip}`}
            >
              +{chip}
            </button>
          ))}
          {hoverPoint && (
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#10b981', fontFamily: 'monospace', fontWeight: 600 }}>
              (x: {hoverPoint.x}, y: {hoverPoint.y})
            </span>
          )}
        </div>
      </div>

      {/* Domain, Range & Parameters Panel (Collapsible) */}
      {isControlsOpen && (
        <div
          style={{
            padding: '8px 12px',
            background: isDark ? '#16161c' : '#f1f5f9',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '11px',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Domain sliders */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>X-Domain:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Min</span>
              <input
                type="number"
                value={xRange[0]}
                onChange={(e) => setXRange([Number(e.target.value), xRange[1]])}
                style={{ width: '48px', padding: '2px 4px', fontSize: '11px', background: isDark ? '#1f1f28' : '#fff', color: isDark ? '#fff' : '#000', border: `1px solid ${borderColor}`, borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Max</span>
              <input
                type="number"
                value={xRange[1]}
                onChange={(e) => setXRange([xRange[0], Number(e.target.value)])}
                style={{ width: '48px', padding: '2px 4px', fontSize: '11px', background: isDark ? '#1f1f28' : '#fff', color: isDark ? '#fff' : '#000', border: `1px solid ${borderColor}`, borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* Parameter sliders (a, b, c) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {['a', 'b', 'c'].map((pKey) => (
              <div key={pKey} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: '#a78bfa' }}>{pKey}:</span>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={params[pKey] ?? 1}
                  onChange={(e) => handleParamChange(pKey, e.target.value)}
                  style={{ width: '60px' }}
                />
                <span style={{ fontFamily: 'monospace', width: '28px' }}>{params[pKey] ?? 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2D Coordinate Graph SVG Viewport */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: isDark ? '#0f0f13' : '#fafafa',
          minHeight: '150px',
          overflow: 'hidden',
          cursor: 'crosshair',
          userSelect: 'none',
          pointerEvents: 'auto',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPoint(null)}
      >
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          viewBox="0 0 440 200"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad_${element.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="1">
            {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400].map((gx) => (
              <line key={`gx_${gx}`} x1={gx} y1={0} x2={gx} y2={200} />
            ))}
            {[30, 60, 90, 120, 150, 170].map((gy) => (
              <line key={`gy_${gy}`} x1={0} y1={gy} x2={440} y2={gy} />
            ))}
          </g>

          {/* X and Y Axes */}
          <line
            x1={0}
            y1={plotData.originY}
            x2={440}
            y2={plotData.originY}
            stroke={isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'}
            strokeWidth="1.5"
          />
          <line
            x1={plotData.originX}
            y1={0}
            x2={plotData.originX}
            y2={200}
            stroke={isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'}
            strokeWidth="1.5"
          />

          {/* Function Curve */}
          {plotData.pathD && (
            <path
              d={plotData.pathD}
              fill="none"
              stroke={`url(#grad_${element.id})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Coordinate Point */}
          {hoverPoint && (
            <g>
              <line
                x1={hoverPoint.px}
                y1={0}
                x2={hoverPoint.px}
                y2={200}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <circle
                cx={hoverPoint.px}
                cy={hoverPoint.py}
                r="4.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Live Calculator & Evaluator Footer */}
      <div
        style={{
          padding: '6px 12px',
          background: isDark ? '#14141a' : '#f1f5f9',
          borderTop: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calculator size={12} style={{ color: '#06b6d4' }} />
          <span>Solve f(</span>
          <input
            type="number"
            value={calcX}
            onChange={(e) => setCalcX(e.target.value)}
            style={{
              width: '44px',
              padding: '1px 4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              background: isDark ? '#1e1e26' : '#fff',
              color: isDark ? '#38bdf8' : '#0284c7',
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              textAlign: 'center',
            }}
          />
          <span>) =</span>
          <strong style={{ color: '#10b981' }}>{calcResult !== null ? calcResult : '...'}</strong>
        </div>

        <div style={{ color: isDark ? '#71717a' : '#94a3b8', fontSize: '10px' }}>
          Supports + - * / ^ sin cos tan exp log sqrt abs pi
        </div>
      </div>
    </div>
  );
}

export default MathGraphCard;
