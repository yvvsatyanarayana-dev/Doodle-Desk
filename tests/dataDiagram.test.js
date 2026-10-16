import { describe, expect, it } from 'vitest';
import {
  buildDataDiagram,
  MAX_DATA_DIAGRAM_RECORDS,
  parseDataDiagramFile,
} from '../src/utils/dataDiagram.js';

describe('dataDiagram', () => {
  it('parses quoted CSV values, escaped quotes, duplicate headers, and multiline cells', () => {
    const rows = parseDataDiagramFile(
      'id,name,name,notes\r\n1,"API, edge","Gateway","first line\nsecond ""line"""',
      'services.csv',
    );

    expect(rows).toEqual([{
      id: '1',
      name: 'API, edge',
      name_2: 'Gateway',
      notes: 'first line\nsecond "line"',
    }]);
  });

  it('accepts JSON record arrays and data/records wrappers', () => {
    expect(parseDataDiagramFile('[{"id":"a"}]', 'items.json')).toEqual([{ id: 'a' }]);
    expect(parseDataDiagramFile('{"data":[{"id":"b"}]}', 'items.json')).toEqual([{ id: 'b' }]);
    expect(parseDataDiagramFile('{"records":[{"id":"c"}]}', 'items.json')).toEqual([{ id: 'c' }]);
  });

  it('builds editable node cards and directed connections from record dependencies', () => {
    const result = buildDataDiagram([
      { id: 'api', name: 'API', dependsOn: 'database' },
      { id: 'database', name: 'Database' },
    ]);
    const arrows = result.elements.filter((element) => element.type === 'arrow');
    const cards = result.elements.filter((element) => element.type === 'rectangle');
    const texts = result.elements.filter((element) => element.type === 'text');

    expect(result.nodeCount).toBe(2);
    expect(result.connectionCount).toBe(1);
    expect(arrows[0].startBinding.elementId).toBe(cards[0].id);
    expect(arrows[0].endBinding.elementId).toBe(cards[1].id);
    expect(texts.find((element) => element.text.startsWith('API')).text).toContain('dependsOn: database');
    expect(cards[0].boundElements).toContainEqual({ id: texts[0].id, type: 'text' });
    expect(cards[0].boundElements).toContainEqual({ id: arrows[0].id, type: 'arrow' });
    expect(cards[0].groupIds).toEqual(texts[0].groupIds);
  });

  it('builds connections from edge-list rows and keeps unconnected data as nodes', () => {
    const result = buildDataDiagram([
      { from: 'client', to: 'api', fromLabel: 'Client', toLabel: 'API' },
      { id: 'cache', name: 'Cache' },
    ]);

    expect(result.nodeCount).toBe(3);
    expect(result.connectionCount).toBe(1);
    expect(result.elements.filter((element) => element.type === 'text').map((element) => element.text))
      .toEqual(['Client', 'API', 'Cache']);
  });

  it('rejects malformed, empty, primitive, and oversized input with useful errors', () => {
    expect(() => parseDataDiagramFile('')).toThrow('empty');
    expect(() => parseDataDiagramFile('{"items":[]}')).toThrow('"records" or "data" array');
    expect(() => parseDataDiagramFile('[1,2]', 'items.json')).toThrow('Each JSON array item');
    expect(() => parseDataDiagramFile(`id,name\n${Array.from({ length: MAX_DATA_DIAGRAM_RECORDS + 1 }, (_, index) => `${index},Name`).join('\n')}`, 'items.csv'))
      .toThrow(`up to ${MAX_DATA_DIAGRAM_RECORDS} records`);
    expect(() => buildDataDiagram([])).toThrow('at least one record');
  });
});
