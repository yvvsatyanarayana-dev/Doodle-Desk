/**
 * digitalLogicSim.js
 * Digital Logic Circuit Simulator (Gates, Truth Tables, Flip-Flops).
 * 100% Offline, Deterministic Boolean Logic Engine.
 */

import { createElement, createTextElement } from '../elements.js';

export const GATE_TYPES = {
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  NAND: 'NAND',
  NOR: 'NOR',
  XOR: 'XOR',
};

export function evaluateGate(type, inputA = 0, inputB = 0) {
  const a = inputA ? 1 : 0;
  const b = inputB ? 1 : 0;

  switch (type) {
    case GATE_TYPES.AND:
      return a & b;
    case GATE_TYPES.OR:
      return a | b;
    case GATE_TYPES.NOT:
      return a ? 0 : 1;
    case GATE_TYPES.NAND:
      return (a & b) ? 0 : 1;
    case GATE_TYPES.NOR:
      return (a | b) ? 0 : 1;
    case GATE_TYPES.XOR:
      return a ^ b;
    default:
      return 0;
  }
}

export function generateTruthTable(type) {
  if (type === GATE_TYPES.NOT) {
    return [
      { a: 0, out: evaluateGate(type, 0) },
      { a: 1, out: evaluateGate(type, 1) },
    ];
  }

  return [
    { a: 0, b: 0, out: evaluateGate(type, 0, 0) },
    { a: 0, b: 1, out: evaluateGate(type, 0, 1) },
    { a: 1, b: 0, out: evaluateGate(type, 1, 0) },
    { a: 1, b: 1, out: evaluateGate(type, 1, 1) },
  ];
}

/**
 * Generates an interactive logic circuit on canvas.
 */
export function generateLogicCircuitElements(gateType = 'AND', originX = 140, originY = 140, isDark = true) {
  const elements = [];
  const strokeColor = isDark ? '#ffffff' : '#18181b';
  const accent = '#10b981';

  // Gate Card
  const gateBox = createElement('rectangle', originX + 160, originY + 30, 100, 70, {
    strokeColor: accent,
    backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
    fillStyle: 'solid',
    strokeWidth: 2,
  });
  elements.push(gateBox);
  elements.push(createTextElement(originX + 185, originY + 52, `${gateType} Gate`, {
    fontSize: 12,
    strokeColor: isDark ? '#34d399' : '#065f46',
  }));

  // Input A
  const inputA = createElement('ellipse', originX, originY + 15, 45, 45, {
    strokeColor,
    backgroundColor: isDark ? '#27272a' : '#f4f4f5',
    fillStyle: 'solid',
  });
  elements.push(inputA);
  elements.push(createTextElement(originX + 14, originY + 30, 'In A', {
    fontSize: 10,
    strokeColor,
  }));

  // Input B (if not NOT gate)
  let inputB = null;
  if (gateType !== GATE_TYPES.NOT) {
    inputB = createElement('ellipse', originX, originY + 75, 45, 45, {
      strokeColor,
      backgroundColor: isDark ? '#27272a' : '#f4f4f5',
      fillStyle: 'solid',
    });
    elements.push(inputB);
    elements.push(createTextElement(originX + 14, originY + 90, 'In B', {
      fontSize: 10,
      strokeColor,
    }));
  }

  // Output
  const output = createElement('ellipse', originX + 320, originY + 42, 45, 45, {
    strokeColor: accent,
    backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
    fillStyle: 'solid',
  });
  elements.push(output);
  elements.push(createTextElement(originX + 332, originY + 57, 'Out', {
    fontSize: 10,
    strokeColor: isDark ? '#34d399' : '#065f46',
  }));

  // Connectors
  elements.push(createElement('arrow', originX + 45, originY + 37, 115, 15, {
    strokeColor: isDark ? '#a1a1aa' : '#71717a',
    strokeWidth: 1.8,
    startBinding: { elementId: inputA.id, focus: 0, gap: 4 },
    endBinding: { elementId: gateBox.id, focus: 0, gap: 4 },
  }));

  if (inputB) {
    elements.push(createElement('arrow', originX + 45, originY + 97, 115, -15, {
      strokeColor: isDark ? '#a1a1aa' : '#71717a',
      strokeWidth: 1.8,
      startBinding: { elementId: inputB.id, focus: 0, gap: 4 },
      endBinding: { elementId: gateBox.id, focus: 0, gap: 4 },
    }));
  }

  elements.push(createElement('arrow', originX + 260, originY + 65, 60, 0, {
    strokeColor: isDark ? '#a1a1aa' : '#71717a',
    strokeWidth: 1.8,
    startBinding: { elementId: gateBox.id, focus: 0, gap: 4 },
    endBinding: { elementId: output.id, focus: 0, gap: 4 },
  }));

  return elements;
}
