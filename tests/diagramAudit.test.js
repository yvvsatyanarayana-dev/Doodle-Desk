import { describe, expect, it } from 'vitest';
import { auditDiagram } from '../src/engine/diagramAudit.js';

describe('diagram health check', () => {
  it('reports connector bindings to missing elements', () => {
    const { issues, summary } = auditDiagram([
      {
        id: 'arrow',
        type: 'arrow',
        x: 0,
        y: 0,
        width: 100,
        height: 0,
        startBinding: { elementId: 'source' },
        endBinding: { elementId: 'removed' },
      },
      { id: 'source', type: 'rectangle', x: 0, y: 0, width: 40, height: 30 },
    ]);

    expect(issues.filter((issue) => issue.type === 'broken-binding')).toHaveLength(1);
    expect(issues.find((issue) => issue.type === 'broken-binding')).toMatchObject({
      elementId: 'arrow',
      severity: 'error',
    });
    expect(summary.errors).toBe(1);
  });

  it('reports malformed bindings with an empty target id', () => {
    const { issues } = auditDiagram([
      {
        id: 'line',
        type: 'line',
        x: 0,
        y: 0,
        width: 40,
        height: 0,
        startBinding: { elementId: '' },
      },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('broken-binding');
  });

  it('reports blank text and small readable labels but skips deleted and hidden objects', () => {
    const { issues, summary } = auditDiagram([
      { id: 'blank', type: 'text', text: '  ', x: 0, y: 0, width: 20, height: 20, fontSize: 16 },
      { id: 'tiny', type: 'text', text: 'label', x: 0, y: 0, width: 20, height: 20, fontSize: 9 },
      { id: 'hidden', type: 'text', text: '', x: 0, y: 0, width: 20, height: 20, isHidden: true },
      { id: 'deleted', type: 'text', text: '', x: 0, y: 0, width: 20, height: 20, isDeleted: true },
    ]);

    expect(issues.map((issue) => issue.type)).toEqual(['empty-text', 'small-text']);
    expect(summary).toEqual({ elementsChecked: 2, errors: 0, warnings: 1, info: 1 });
  });

  it('reports invalid geometry and duplicate visible element ids', () => {
    const { issues } = auditDiagram([
      { id: 'same', type: 'rectangle', x: Number.NaN, y: 0, width: 30, height: 20 },
      { id: 'same', type: 'ellipse', x: 10, y: 10, width: 20, height: 20 },
    ]);

    expect(issues.map((issue) => issue.type)).toContain('invalid-geometry');
    expect(issues.find((issue) => issue.type === 'duplicate-id')).toMatchObject({
      severity: 'error',
      elementId: null,
    });
  });

  it('returns a clean summary for healthy scenes', () => {
    expect(auditDiagram([
      { id: 'shape', type: 'rectangle', x: 0, y: 0, width: 100, height: 80 },
      { id: 'label', type: 'text', text: 'Readable', x: 0, y: 100, width: 80, height: 24, fontSize: 16 },
    ]).summary).toEqual({ elementsChecked: 2, errors: 0, warnings: 0, info: 0 });
  });
});
