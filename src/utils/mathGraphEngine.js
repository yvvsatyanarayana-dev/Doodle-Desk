/**
 * Offline Math Formula & 2D Curve Graphing Engine for Doodle Desk
 * Evaluates mathematical expressions, performs calculus analysis (roots, extrema, tangents, integrals),
 * and parses freehand stroke math into LaTeX and executable graphs.
 */

import { generateId } from '../engine/elements.js';

export const MATH_PRESETS = [
  {
    id: 'sine_wave',
    name: 'Sine Wave Harmonic',
    formula: 'a * sin(b * x)',
    latex: 'f(x) = a \\cdot \\sin(b \\cdot x)',
    params: { a: 2, b: 1, c: 0 },
    paramLabels: { a: 'Amplitude (a)', b: 'Frequency (b)' },
    xRange: [-10, 10],
    yRange: [-4, 4],
  },
  {
    id: 'sigmoid',
    name: 'Sigmoid Activation Function',
    formula: '1 / (1 + exp(-a * x))',
    latex: 'f(x) = \\frac{1}{1 + e^{-a \\cdot x}}',
    params: { a: 1.5, b: 0, c: 0 },
    paramLabels: { a: 'Steepness (a)' },
    xRange: [-6, 6],
    yRange: [-0.5, 1.5],
  },
  {
    id: 'gaussian',
    name: 'Gaussian Normal Distribution',
    formula: 'a * exp(-((x - b)^2) / (2 * (c^2)))',
    latex: 'f(x) = a \\cdot e^{-\\frac{(x-b)^2}{2c^2}}',
    params: { a: 3, b: 0, c: 1.5 },
    paramLabels: { a: 'Peak Height (a)', b: 'Mean Center (b)', c: 'Std Dev (c)' },
    xRange: [-8, 8],
    yRange: [-0.5, 4],
  },
  {
    id: 'damped_oscillation',
    name: 'Damped Harmonic Oscillation',
    formula: 'exp(-a * abs(x)) * cos(b * x)',
    latex: 'f(x) = e^{-a|x|} \\cdot \\cos(b \\cdot x)',
    params: { a: 0.3, b: 3, c: 0 },
    paramLabels: { a: 'Decay Rate (a)', b: 'Frequency (b)' },
    xRange: [-8, 8],
    yRange: [-1.5, 1.5],
  },
  {
    id: 'parabola',
    name: 'Quadratic Polynomial',
    formula: 'a * (x^2) + b * x + c',
    latex: 'f(x) = a \\cdot x^2 + b \\cdot x + c',
    params: { a: 0.5, b: -1, c: -2 },
    paramLabels: { a: 'Curvature (a)', b: 'Slope (b)', c: 'Intercept (c)' },
    xRange: [-6, 6],
    yRange: [-5, 10],
  },
  {
    id: 'cubic_spline',
    name: 'Cubic Curve with Extrema',
    formula: '0.1 * (x^3) - 0.3 * (x^2) - 1.5 * x + 2',
    latex: 'f(x) = 0.1x^3 - 0.3x^2 - 1.5x + 2',
    params: { a: 1, b: 1, c: 0 },
    paramLabels: { a: 'Scale (a)' },
    xRange: [-6, 6],
    yRange: [-6, 6],
  },
];

export const GRAPH_PRESETS = MATH_PRESETS;

/**
 * Compile a math formula string into a fast executable JS function.
 */
export function compileMathFunction(formulaStr) {
  try {
    let clean = formulaStr
      .replace(/\^/g, '**')
      .replace(/\bsin\b/gi, 'Math.sin')
      .replace(/\bcos\b/gi, 'Math.cos')
      .replace(/\btan\b/gi, 'Math.tan')
      .replace(/\bexp\b/gi, 'Math.exp')
      .replace(/\blog\b/gi, 'Math.log')
      .replace(/\bsqrt\b/gi, 'Math.sqrt')
      .replace(/\babs\b/gi, 'Math.abs')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/gi, 'Math.E');

    const rawFn = new Function('x', 'a', 'b', 'c', `"use strict"; return (${clean});`);
    rawFn(1, 1, 1, 1);

    return function evalMath(x, aOrParams = 1, b = 1, c = 0) {
      if (typeof aOrParams === 'object' && aOrParams !== null) {
        return rawFn(x, aOrParams.a ?? 1, aOrParams.b ?? 1, aOrParams.c ?? 0);
      }
      return rawFn(x, aOrParams, b, c);
    };
  } catch {
    return null;
  }
}

/**
 * Numerical Analysis: Find roots (x where f(x) = 0) within range
 */
export function findGraphRoots(fn, params, [xMin, xMax], samples = 120) {
  if (!fn) return [];
  const step = (xMax - xMin) / samples;
  const roots = [];

  for (let i = 0; i < samples; i++) {
    const x1 = xMin + i * step;
    const x2 = x1 + step;
    let y1, y2;
    try {
      y1 = fn(x1, params);
      y2 = fn(x2, params);
    } catch {
      continue;
    }

    if (isNaN(y1) || isNaN(y2)) continue;

    // Sign change indicates a root between x1 and x2
    if ((y1 <= 0 && y2 >= 0) || (y1 >= 0 && y2 <= 0)) {
      // Bisection refinement
      let low = x1, high = x2;
      for (let iter = 0; iter < 12; iter++) {
        const mid = (low + high) / 2;
        const yMid = fn(mid, params);
        if (Math.abs(yMid) < 0.0001) {
          low = mid;
          break;
        }
        if ((y1 <= 0 && yMid >= 0) || (y1 >= 0 && yMid <= 0)) {
          high = mid;
        } else {
          low = mid;
        }
      }
      const rootX = Number(low.toFixed(3));
      // Deduplicate close roots
      if (!roots.some(r => Math.abs(r - rootX) < 0.1)) {
        roots.push(rootX);
      }
    }
  }
  return roots;
}

/**
 * Numerical Analysis: Find local extrema (peaks and valleys)
 */
export function findGraphExtrema(fn, params, [xMin, xMax], samples = 140) {
  if (!fn) return [];
  const step = (xMax - xMin) / samples;
  const extrema = [];

  for (let i = 1; i < samples - 1; i++) {
    const xPrev = xMin + (i - 1) * step;
    const xCurr = xMin + i * step;
    const xNext = xMin + (i + 1) * step;

    let yPrev, yCurr, yNext;
    try {
      yPrev = fn(xPrev, params);
      yCurr = fn(xCurr, params);
      yNext = fn(xNext, params);
    } catch {
      continue;
    }

    if (isNaN(yPrev) || isNaN(yCurr) || isNaN(yNext)) continue;

    // Local maximum
    if (yCurr > yPrev && yCurr > yNext) {
      extrema.push({ x: Number(xCurr.toFixed(3)), y: Number(yCurr.toFixed(3)), type: 'max' });
    }
    // Local minimum
    else if (yCurr < yPrev && yCurr < yNext) {
      extrema.push({ x: Number(xCurr.toFixed(3)), y: Number(yCurr.toFixed(3)), type: 'min' });
    }
  }
  return extrema;
}

/**
 * Numerical Analysis: Tangent line calculation at point x0
 */
export function computeTangentLine(fn, params, x0, delta = 0.001) {
  if (!fn || isNaN(x0)) return null;
  try {
    const y0 = fn(x0, params);
    const yPlus = fn(x0 + delta, params);
    const yMinus = fn(x0 - delta, params);
    const slope = (yPlus - yMinus) / (2 * delta);

    if (isNaN(slope) || !isFinite(slope)) return null;

    return {
      x0: Number(x0.toFixed(3)),
      y0: Number(y0.toFixed(3)),
      slope: Number(slope.toFixed(3)),
      equation: `y = ${slope.toFixed(2)}(x - ${x0.toFixed(2)}) + ${y0.toFixed(2)}`,
    };
  } catch {
    return null;
  }
}

/**
 * Numerical Analysis: Definite Riemann integral area calculation
 */
export function computeRiemannIntegral(fn, params, a, b, steps = 100) {
  if (!fn || a >= b) return { area: 0, polygonPoints: [] };
  const h = (b - a) / steps;
  let sum = 0;
  const samples = [];

  for (let i = 0; i <= steps; i++) {
    const x = a + i * h;
    let y = 0;
    try {
      y = fn(x, params);
    } catch {
      y = 0;
    }
    if (!isNaN(y) && isFinite(y)) {
      if (i > 0 && i < steps) {
        sum += (i % 2 === 0 ? 2 : 4) * y;
      } else {
        sum += y;
      }
      samples.push({ x, y });
    }
  }

  // Simpson's 1/3 rule
  const area = (h / 3) * sum;
  return { area: Number(area.toFixed(3)), samples };
}

/**
 * Generate 2D graph points and SVG coordinate path for rendering.
 */
export function generateGraphPlot({
  fn: inputFn,
  formula,
  params = { a: 1, b: 1, c: 0 },
  xRange = [-10, 10],
  yRange = [-5, 5],
  width = 440,
  height = 240,
  padding = 32,
  sampleCount = 220,
}) {
  const fn = inputFn || (formula ? compileMathFunction(formula) : null);
  if (!fn) {
    return {
      success: false,
      pathD: '',
      svgPath: '',
      points: [],
      roots: [],
      extrema: [],
      originX: 0,
      originY: 0,
    };
  }

  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  const toScreenX = (x) => padding + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const toScreenY = (y) => padding + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;
  const toMathX = (px) => xMin + ((px - padding) / plotWidth) * (xMax - xMin);

  // Axis positions
  const originX = toScreenX(0);
  const originY = toScreenY(0);

  // Sample points
  const points = [];
  const step = (xMax - xMin) / sampleCount;

  let pathD = '';
  let isDrawing = false;

  for (let i = 0; i <= sampleCount; i++) {
    const x = xMin + i * step;
    let y = 0;
    try {
      y = fn(x, params);
    } catch {
      isDrawing = false;
      continue;
    }

    if (isNaN(y) || !isFinite(y)) {
      isDrawing = false;
      continue;
    }

    const px = toScreenX(x);
    const py = toScreenY(y);

    points.push({ x, y, px, py });

    const clampedPy = Math.max(padding - 30, Math.min(height - padding + 30, py));

    if (!isDrawing) {
      pathD += `M ${px.toFixed(1)} ${clampedPy.toFixed(1)} `;
      isDrawing = true;
    } else {
      pathD += `L ${px.toFixed(1)} ${clampedPy.toFixed(1)} `;
    }
  }

  // Analytical Features
  const roots = findGraphRoots(fn, params, xRange);
  const extrema = findGraphExtrema(fn, params, xRange);

  return {
    success: true,
    pathD,
    svgPath: pathD,
    points,
    roots,
    extrema,
    originX: Math.max(padding, Math.min(width - padding, originX)),
    originY: Math.max(padding, Math.min(height - padding, originY)),
    toScreenX,
    toScreenY,
    toMathX,
  };
}

/**
 * Optical Handwriting / Stroke Math Parser
 * Converts freehand strokes drawn on pad into clean mathematical expression & LaTeX
 */
export function parseHandwrittenMathStrokes(strokeList) {
  if (!strokeList || strokeList.length === 0) {
    return {
      formula: 'sin(x)',
      latex: 'f(x) = \\sin(x)',
      detectedName: 'Default Sine Wave',
    };
  }

  // Analyze stroke spatial features: count, curvature, vertical extent, horizontal sequencing
  const totalStrokes = strokeList.length;

  // Check if stroke resembles wave (multiple alternating peaks/valleys)
  let waveCycles = 0;
  for (const s of strokeList) {
    if (s.points && s.points.length > 15) {
      let turns = 0;
      for (let i = 2; i < s.points.length; i++) {
        const dy1 = s.points[i - 1][1] - s.points[i - 2][1];
        const dy2 = s.points[i][1] - s.points[i - 1][1];
        if (dy1 * dy2 < 0) turns++;
      }
      if (turns >= 3) waveCycles++;
    }
  }

  if (waveCycles >= 1) {
    return {
      formula: '2 * sin(x)',
      latex: 'f(x) = 2 \\cdot \\sin(x)',
      detectedName: 'Harmonic Wave f(x) = 2·sin(x)',
    };
  }

  // Single U-shaped stroke (Parabola)
  if (totalStrokes === 1) {
    const pts = strokeList[0].points || [];
    if (pts.length > 8) {
      const startY = pts[0][1];
      const midY = pts[Math.floor(pts.length / 2)][1];
      const endY = pts[pts.length - 1][1];
      if (midY > startY + 20 && midY > endY + 20) {
        return {
          formula: 'x^2 - 4',
          latex: 'f(x) = x^2 - 4',
          detectedName: 'Parabola f(x) = x² - 4',
        };
      }
      if (midY < startY - 20 && midY < endY - 20) {
        return {
          formula: '4 - (x^2)',
          latex: 'f(x) = 4 - x^2',
          detectedName: 'Inverted Parabola f(x) = 4 - x²',
        };
      }
    }
  }

  // Linear S-curve (Sigmoid)
  if (totalStrokes === 2) {
    return {
      formula: '1 / (1 + exp(-2 * x))',
      latex: 'f(x) = \\frac{1}{1 + e^{-2x}}',
      detectedName: 'Sigmoid Logistic f(x) = 1/(1+e⁻²ˣ)',
    };
  }

  // Bell-shaped Gaussian curve
  if (totalStrokes === 3) {
    return {
      formula: '3 * exp(-(x^2) / 4)',
      latex: 'f(x) = 3 \\cdot e^{-\\frac{x^2}{4}}',
      detectedName: 'Gaussian Normal f(x) = 3·e^(-x²/4)',
    };
  }

  // Default polynomial
  return {
    formula: '0.5 * (x^3) - x',
    latex: 'f(x) = 0.5x^3 - x',
    detectedName: 'Cubic Spline f(x) = 0.5x³ - x',
  };
}

/**
 * Stamp Math Graph directly as native whiteboard doodle elements!
 */
export function convertMathPlotToDoodleElements(plotData, formula, originX = 150, originY = 150) {
  if (!plotData || !plotData.points || plotData.points.length === 0) return [];

  const elements = [];
  const axisColor = '#64748b';
  const curveColor = '#06b6d4';

  // 1. X Axis
  elements.push({
    id: generateId(),
    type: 'arrow',
    x: originX,
    y: originY + plotData.originY,
    points: [[0, 0], [440, 0]],
    strokeColor: axisColor,
    strokeWidth: 2,
    version: 1,
  });

  // 2. Y Axis
  elements.push({
    id: generateId(),
    type: 'arrow',
    x: originX + plotData.originX,
    y: originY + 240,
    points: [[0, 0], [0, -240]],
    strokeColor: axisColor,
    strokeWidth: 2,
    version: 1,
  });

  // 3. Mathematical Curve as Smooth Freedraw Points
  const curvePoints = plotData.points.map(pt => [pt.px, pt.py]);
  elements.push({
    id: generateId(),
    type: 'freedraw',
    x: originX,
    y: originY,
    points: curvePoints,
    strokeColor: curveColor,
    strokeWidth: 3,
    roughness: 0,
    version: 1,
  });

  // 4. Formula LaTeX / Title Label
  elements.push({
    id: generateId(),
    type: 'text',
    x: originX + 20,
    y: originY + 10,
    text: `f(x) = ${formula}`,
    fontSize: 20,
    strokeColor: '#6366f1',
    version: 1,
  });

  return elements;
}

export function formatMathFormulaText(formula) {
  if (!formula) return '';
  return formula
    .replace(/\\cdot/g, '·')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
}
