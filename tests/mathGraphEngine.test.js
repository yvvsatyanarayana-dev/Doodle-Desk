import { describe, it, expect } from 'vitest';
import {
  compileMathFunction,
  generateGraphPlot,
  formatMathFormulaText,
  MATH_PRESETS,
} from '../src/utils/mathGraphEngine.js';

describe('mathGraphEngine', () => {
  describe('compileMathFunction', () => {
    it('compiles standard mathematical functions and operators correctly', () => {
      const fn = compileMathFunction('x^2 + 2*x + 1');
      expect(fn).toBeTruthy();
      expect(fn(0)).toBe(1);
      expect(fn(1)).toBe(4);
      expect(fn(2)).toBe(9);
      expect(fn(-1)).toBe(0);
    });

    it('supports trigonometric and transcendental functions', () => {
      const sinFn = compileMathFunction('sin(x)');
      expect(sinFn).toBeTruthy();
      expect(sinFn(0)).toBeCloseTo(0);
      expect(sinFn(Math.PI / 2)).toBeCloseTo(1);

      const expFn = compileMathFunction('exp(x)');
      expect(expFn).toBeTruthy();
      expect(expFn(0)).toBeCloseTo(1);
      expect(expFn(1)).toBeCloseTo(Math.E);

      const absFn = compileMathFunction('abs(x)');
      expect(absFn).toBeTruthy();
      expect(absFn(-5)).toBe(5);
    });

    it('evaluates formulas with parametric inputs a, b, c', () => {
      const fn = compileMathFunction('a * sin(b * x) + c');
      expect(fn).toBeTruthy();

      // Test with params object
      const val1 = fn(Math.PI / 2, { a: 3, b: 1, c: 2 });
      expect(val1).toBeCloseTo(5);

      // Test with positional arguments
      const val2 = fn(Math.PI / 2, 3, 1, 2);
      expect(val2).toBeCloseTo(5);
    });

    it('returns null gracefully on syntactically invalid expressions without throwing', () => {
      expect(compileMathFunction('(((')).toBeNull();
      expect(compileMathFunction('++**')).toBeNull();
      expect(compileMathFunction('invalidVar@@')).toBeNull();
    });
  });

  describe('MATH_PRESETS', () => {
    it('provides preset definitions that compile into valid functions', () => {
      expect(MATH_PRESETS.length).toBeGreaterThanOrEqual(4);
      for (const preset of MATH_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.formula).toBeTruthy();
        const compiled = compileMathFunction(preset.formula);
        expect(compiled).toBeTruthy();
        const result = compiled(1, preset.params);
        expect(typeof result).toBe('number');
        expect(isFinite(result)).toBe(true);
      }
    });
  });

  describe('generateGraphPlot', () => {
    it('generates svg path and sampled coordinate points', () => {
      const plot = generateGraphPlot({
        formula: 'sin(x)',
        xRange: [-Math.PI, Math.PI],
        yRange: [-1.5, 1.5],
        width: 400,
        height: 200,
        sampleCount: 50,
      });

      expect(plot.success).toBe(true);
      expect(plot.pathD).toMatch(/^M \d/);
      expect(plot.points.length).toBe(51);
      expect(plot.originX).toBeGreaterThan(0);
      expect(plot.originY).toBeGreaterThan(0);
      expect(typeof plot.toScreenX).toBe('function');
      expect(typeof plot.toScreenY).toBe('function');
      expect(typeof plot.toMathX).toBe('function');
    });

    it('handles functions with singularities / division by zero gracefully without crashing', () => {
      const plot = generateGraphPlot({
        formula: '1 / x',
        xRange: [-5, 5],
        yRange: [-5, 5],
        sampleCount: 40,
      });

      expect(plot.success).toBe(true);
      expect(plot.points.length).toBeGreaterThan(0);
      // Path was generated even though x=0 produced non-finite value
      expect(plot.pathD.length).toBeGreaterThan(0);
    });

    it('returns empty fallback if formula is invalid', () => {
      const plot = generateGraphPlot({
        formula: 'unclosed(((',
      });
      expect(plot.success).toBe(false);
      expect(plot.pathD).toBe('');
      expect(plot.points).toEqual([]);
    });
  });

  describe('formatMathFormulaText', () => {
    it('converts LaTeX symbols to readable Unicode typography', () => {
      expect(formatMathFormulaText('\\sin(x) \\cdot \\cos(x)')).toBe('sin(x) · cos(x)');
      expect(formatMathFormulaText('x^2 + y^3')).toBe('x² + y³');
      expect(formatMathFormulaText('\\pi \\cdot r^2')).toBe('π · r²');
      expect(formatMathFormulaText('\\frac{1}{2}')).toBe('(1 / 2)');
    });
  });
});
