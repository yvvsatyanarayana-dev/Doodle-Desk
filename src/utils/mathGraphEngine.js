/**
 * Offline Math Formula & 2D Curve Graphing Engine for Doodle Desk
 * Evaluates mathematical expressions and generates 2D coordinate plots
 * completely offline with zero external network or CDN dependencies.
 */

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
];

export const GRAPH_PRESETS = MATH_PRESETS;

/**
 * Compile a math formula string into a fast executable JS function.
 * Supports: sin, cos, tan, exp, log, sqrt, abs, pow, pi, e, and ^ exponentiation.
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

    // Create function(x, a, b, c)
    const rawFn = new Function('x', 'a', 'b', 'c', `"use strict"; return (${clean});`);
    // Test execution with dummy value
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
 * Generate 2D graph points and SVG coordinate path for rendering.
 */
export function generateGraphPlot({
  fn: inputFn,
  formula,
  params = { a: 1, b: 1, c: 0 },
  xRange = [-10, 10],
  yRange = [-5, 5],
  width = 420,
  height = 240,
  padding = 32,
  sampleCount = 200,
}) {
  const fn = inputFn || (formula ? compileMathFunction(formula) : null);
  if (!fn) {
    return {
      success: false,
      pathD: '',
      svgPath: '',
      points: [],
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

    // Clamp for path drawing
    const clampedPy = Math.max(padding - 20, Math.min(height - padding + 20, py));

    if (!isDrawing) {
      pathD += `M ${px.toFixed(1)} ${clampedPy.toFixed(1)} `;
      isDrawing = true;
    } else {
      pathD += `L ${px.toFixed(1)} ${clampedPy.toFixed(1)} `;
    }
  }

  return {
    success: true,
    pathD,
    svgPath: pathD,
    points,
    originX: Math.max(padding, Math.min(width - padding, originX)),
    originY: Math.max(padding, Math.min(height - padding, originY)),
    toScreenX,
    toScreenY,
    toMathX,
  };
}

/**
 * Format math formula into clean readable math text (Greek symbols, powers, fractions)
 */
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
