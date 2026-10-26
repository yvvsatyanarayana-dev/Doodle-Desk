import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Sparkles,
  Calculator,
  RotateCcw,
  Plus,
  Activity,
  Check,
  TrendingUp,
  Sliders,
  PenTool,
  Layers,
} from 'lucide-react';
import {
  compileMathFunction,
  generateGraphPlot,
  computeTangentLine,
  computeRiemannIntegral,
  parseHandwrittenMathStrokes,
  convertMathPlotToDoodleElements,
  MATH_PRESETS,
} from '../utils/mathGraphEngine.js';

export function FreehandMathRecognizerModal({
  isOpen,
  onClose,
  doodleAPI,
  theme = 'dark',
}) {
  const isDark = theme !== 'light';
  const api = doodleAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null);

  const [formulaStr, setFormulaStr] = useState('2 * sin(x)');
  const [latexStr, setLatexStr] = useState('f(x) = 2\\sin(x)');
  const [params, setParams] = useState({ a: 2, b: 1, c: 0 });
  const [xRange, setXRange] = useState([-8, 8]);
  const [yRange, setYRange] = useState([-4, 4]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [hoverX, setHoverX] = useState(0);
  const [showTangent, setShowTangent] = useState(true);
  const [showIntegral, setShowIntegral] = useState(false);
  const [integralRange, setIntegralRange] = useState([0, 3.14]);

  const padCanvasRef = useRef(null);

  // Compile math function
  const compiledFn = useMemo(() => {
    return compileMathFunction(formulaStr) || compileMathFunction('sin(x)');
  }, [formulaStr]);

  // Generate plot coordinates & analytical properties
  const plotData = useMemo(() => {
    return generateGraphPlot({
      fn: compiledFn,
      params,
      xRange,
      yRange,
      width: 480,
      height: 240,
      padding: 30,
    });
  }, [compiledFn, params, xRange, yRange]);

  // Tangent line at hover position
  const tangent = useMemo(() => {
    if (!showTangent) return null;
    return computeTangentLine(compiledFn, params, hoverX);
  }, [compiledFn, params, hoverX, showTangent]);

  // Riemann integral area
  const integral = useMemo(() => {
    if (!showIntegral) return null;
    return computeRiemannIntegral(compiledFn, params, integralRange[0], integralRange[1]);
  }, [compiledFn, params, integralRange, showIntegral]);

  // Redraw freehand pad canvas
  const redrawPad = useCallback(() => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      if (stroke.points && stroke.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
        }
        ctx.stroke();
      }
    }

    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0][0], currentStroke[0][1]);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i][0], currentStroke[i][1]);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    redrawPad();
  }, [redrawPad]);

  // Mouse handlers for handwriting pad
  const handlePadMouseDown = (e) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentStroke([[x, y]]);
  };

  const handlePadMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke(prev => [...prev, [x, y]]);
  };

  const handlePadMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      const newStrokes = [...strokes, { points: currentStroke }];
      setStrokes(newStrokes);
      // Auto recognize handwriting
      const recognized = parseHandwrittenMathStrokes(newStrokes);
      setFormulaStr(recognized.formula);
      setLatexStr(recognized.latex);
    }
    setCurrentStroke([]);
  };

  const handleClearPad = () => {
    setStrokes([]);
    setCurrentStroke([]);
    const canvas = padCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Insert live interactive Math Graph card
  const handleInsertCard = () => {
    if (!api) return;
    const canvasBounds = api.getCanvasBounds?.() || { width: 1200, height: 800 };
    const [spawnX, spawnY] = api.canvasToScene
      ? api.canvasToScene(canvasBounds.width / 2 - 240, canvasBounds.height / 2 - 180)
      : [250, 250];

    const docElement = {
      id: `math_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'embeddable',
      x: spawnX,
      y: spawnY,
      width: 480,
      height: 420,
      strokeColor: '#06b6d4',
      backgroundColor: isDark ? '#141418' : '#ffffff',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      docType: 'math_graph',
      title: 'Freehand Math Graph',
      formulaStr,
      latexStr,
      params,
      xRange,
      yRange,
      isDeleted: false,
    };

    const existing = api.getSceneElements?.() || [];
    api.updateScene({ elements: [...existing, docElement], commitToHistory: true });
    api.setAppState?.({ selectedElementIds: { [docElement.id]: true } });
    onClose();
  };

  // Stamp directly as whiteboard vector doodle elements
  const handleStampDoodle = () => {
    if (!api) return;
    const canvasBounds = api.getCanvasBounds?.() || { width: 1200, height: 800 };
    const [spawnX, spawnY] = api.canvasToScene
      ? api.canvasToScene(canvasBounds.width / 2 - 240, canvasBounds.height / 2 - 140)
      : [250, 250];

    const doodleElements = convertMathPlotToDoodleElements(plotData, formulaStr, spawnX, spawnY);
    const existing = api.getSceneElements?.() || [];
    api.updateScene({ elements: [...existing, ...doodleElements], commitToHistory: true });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(6px)',
          zIndex: 2200,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '920px',
          maxHeight: '90vh',
          background: isDark ? '#141417' : '#ffffff',
          border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
          borderRadius: '16px',
          boxShadow: isDark ? '0 24px 64px rgba(0, 0, 0, 0.75)' : '0 24px 64px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2300,
          overflow: 'hidden',
          fontFamily: "'Virgil', 'Doodlefont', sans-serif",
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isDark ? '#27272a' : '#f4f4f5',
                color: isDark ? '#ffffff' : '#18181b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7',
              }}
            >
              <Calculator size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>
                Freehand Math Equation Recognizer & Grapher
              </div>
              <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Handwrite or type mathematical functions • Real-time roots, extrema, tangent lines & integrals
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY (2 COLUMNS: LEFT PAD, RIGHT PLOT) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', flex: 1, overflowY: 'auto' }}>
          {/* Left Column: Handwriting Pad & Presets */}
          <div
            style={{
              padding: '16px',
              borderRight: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                ✍️ Draw / Scribble Math Below:
              </span>
              <button
                onClick={handleClearPad}
                title="Clear Drawing Pad"
                style={{
                  fontSize: '11px',
                  color: isDark ? '#94a3b8' : '#64748b',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={11} /> Clear
              </button>
            </div>

            {/* Handwriting Pad Canvas */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '160px',
                borderRadius: '10px',
                border: isDark ? '1px dashed #27272a' : '1px dashed #cbd5e1',
                background: isDark ? '#0c0c0e' : '#f8fafc',
                cursor: 'crosshair',
              }}
            >
              <canvas
                ref={padCanvasRef}
                width={326}
                height={160}
                onMouseDown={handlePadMouseDown}
                onMouseMove={handlePadMouseMove}
                onMouseUp={handlePadMouseUp}
                onMouseLeave={handlePadMouseUp}
                style={{ width: '100%', height: '100%' }}
              />
              {strokes.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
                    fontSize: '11.5px',
                    pointerEvents: 'none',
                  }}
                >
                  Scribble a wave, parabola, or equation
                </div>
              )}
            </div>

            {/* Detected Formula Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>
                Formula: f(x) =
              </span>
              <input
                type="text"
                value={formulaStr}
                onChange={e => setFormulaStr(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: isDark ? '1px solid #27272a' : '1px solid #cbd5e1',
                  background: isDark ? '#0c0c0e' : '#ffffff',
                  color: isDark ? '#ffffff' : '#0f172a',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Presets Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>
                Or Load Preset:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {MATH_PRESETS.slice(0, 4).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setFormulaStr(p.formula);
                      setLatexStr(p.latex);
                      setParams(p.params);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '10.5px',
                      border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                      background: isDark ? '#18181b' : '#f8fafc',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameters Sliders */}
            <div
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: isDark ? '#18181b' : '#f8fafc',
                border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                Live Variables:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>a = {params.a}</span>
                <input
                  type="range"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={params.a}
                  onChange={e => setParams(prev => ({ ...prev, a: Number(e.target.value) }))}
                  style={{ width: '120px', accentColor: '#06b6d4' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>b = {params.b}</span>
                <input
                  type="range"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={params.b}
                  onChange={e => setParams(prev => ({ ...prev, b: Number(e.target.value) }))}
                  style={{ width: '120px', accentColor: '#06b6d4' }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive 2D Graph */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* SVG Graph Canvas */}
            <div
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const px = e.clientX - rect.left;
                if (plotData?.toMathX) {
                  setHoverX(Number(plotData.toMathX(px).toFixed(2)));
                }
              }}
              style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                borderRadius: '12px',
                background: isDark ? '#0c0c0e' : '#f8fafc',
                border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              <svg width="100%" height="240" viewBox="0 0 480 240" style={{ display: 'block' }}>
                {/* Axes */}
                <line x1="30" y1={plotData.originY} x2="450" y2={plotData.originY} stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="1.5" />
                <line x1={plotData.originX} y1="30" x2={plotData.originX} y2="210" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="1.5" />

                {/* Shaded Integral Area */}
                {showIntegral && integral && (
                  <path
                    d={`M ${plotData.toScreenX(integralRange[0])} ${plotData.originY} ${plotData.points
                      .filter(pt => pt.x >= integralRange[0] && pt.x <= integralRange[1])
                      .map(pt => `L ${pt.px} ${pt.py}`)
                      .join(' ')} L ${plotData.toScreenX(integralRange[1])} ${plotData.originY} Z`}
                    fill="rgba(6, 182, 212, 0.2)"
                    stroke="none"
                  />
                )}

                {/* Curve */}
                {plotData.pathD && (
                  <path d={plotData.pathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
                )}

                {/* Roots (Red Dots) */}
                {plotData.roots?.map((rx, idx) => (
                  <circle key={`root_${idx}`} cx={plotData.toScreenX(rx)} cy={plotData.originY} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                ))}

                {/* Extrema (Blue Dots) */}
                {plotData.extrema?.map((ex, idx) => (
                  <circle key={`ext_${idx}`} cx={plotData.toScreenX(ex.x)} cy={plotData.toScreenY(ex.y)} r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                ))}

                {/* Tangent Line */}
                {showTangent && tangent && (
                  <line
                    x1={plotData.toScreenX(tangent.x0 - 2)}
                    y1={plotData.toScreenY(tangent.y0 - 2 * tangent.slope)}
                    x2={plotData.toScreenX(tangent.x0 + 2)}
                    y2={plotData.toScreenY(tangent.y0 + 2 * tangent.slope)}
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}
              </svg>
            </div>

            {/* Analysis Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isDark ? '#18181b' : '#f8fafc',
                  border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                  fontSize: '11px',
                }}
              >
                <div style={{ color: '#ef4444', fontWeight: 700 }}>Roots (f(x)=0)</div>
                <div style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 600, marginTop: '2px' }}>
                  {plotData.roots?.length > 0 ? plotData.roots.join(', ') : 'None in range'}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isDark ? '#18181b' : '#f8fafc',
                  border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                  fontSize: '11px',
                }}
              >
                <div style={{ color: '#3b82f6', fontWeight: 700 }}>Extrema (Peaks/Valleys)</div>
                <div style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 600, marginTop: '2px' }}>
                  {plotData.extrema?.length > 0 ? `${plotData.extrema.length} critical points` : 'None in range'}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isDark ? '#18181b' : '#f8fafc',
                  border: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
                  fontSize: '11px',
                }}
              >
                <div style={{ color: '#ec4899', fontWeight: 700 }}>Tangent Slope m = f'(x)</div>
                <div style={{ color: isDark ? '#ffffff' : '#0f172a', fontWeight: 600, marginTop: '2px' }}>
                  m = {tangent?.slope ?? 0} (at x={hoverX})
                </div>
              </div>
            </div>

            {/* Analysis Toggles */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={e => setShowTangent(e.target.checked)}
                  style={{ accentColor: '#ec4899' }}
                />
                Show Dynamic Tangent Line
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showIntegral}
                  onChange={e => setShowIntegral(e.target.checked)}
                  style={{ accentColor: '#06b6d4' }}
                />
                Shade Definite Integral (Area = {integral?.area ?? 0})
              </label>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
            background: isDark ? '#141417' : '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#06b6d4' }}>
            LaTeX: {latexStr}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleStampDoodle}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: isDark ? '1px solid #27272a' : '1px solid #cbd5e1',
                background: isDark ? '#27272a' : '#f4f4f5',
                color: isDark ? '#ffffff' : '#18181b',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PenTool size={13} />
              Stamp as Vector Doodle
            </button>

            <button
              onClick={handleInsertCard}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: isDark ? '1px solid #3f3f46' : 'none',
                background: isDark ? '#27272a' : '#18181b',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.4)' : '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Insert Interactive Card
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FreehandMathRecognizerModal;
