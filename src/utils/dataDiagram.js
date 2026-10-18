import {
  createElement,
  createLinearElement,
  createTextElement,
  ELEMENT_TYPES,
  generateId,
} from '../engine/elements.js';

export const MAX_DATA_DIAGRAM_RECORDS = 500;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizedKey = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

function findKey(record, candidates) {
  const keys = Object.keys(record);
  for (const candidate of candidates) {
    const match = keys.find((key) => normalizedKey(key) === candidate);
    if (match) return match;
  }
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = '';
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('The CSV file has an unclosed quoted value.');
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV file needs a header row and at least one data row.');

  const headers = rows[0].map((header, index) => header.trim() || `Column ${index + 1}`);
  const seenHeaders = new Set();
  const uniqueHeaders = headers.map((header, index) => {
    let name = header;
    let suffix = 2;
    while (headers.slice(0, index).includes(name) || seenHeaders.has(name)) {
      name = `${header}_${suffix}`;
      suffix += 1;
    }
    seenHeaders.add(name);
    return name;
  });

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length > uniqueHeaders.length && values.slice(uniqueHeaders.length).some((value) => value.trim())) {
      throw new Error(`CSV row ${rowIndex + 2} has more values than the header row.`);
    }
    return Object.fromEntries(uniqueHeaders.map((header, index) => [header, values[index] ?? '']));
  });
}

export function parseDataDiagramFile(text, fileName = '') {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('The selected file is empty.');
  }

  let rows;
  if (/\.csv$/i.test(fileName)) {
    rows = parseCsv(text.replace(/^\uFEFF/, ''));
  } else {
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch (error) {
      throw new Error(`Could not parse JSON: ${error.message}`);
    }
    rows = Array.isArray(parsed) ? parsed : (parsed?.records || parsed?.data);
    if (!Array.isArray(rows)) {
      throw new Error('JSON must be an array of records or an object containing a "records" or "data" array.');
    }
    if (rows.some((row) => !isRecord(row))) {
      throw new Error('Each JSON array item must be an object with named fields.');
    }
  }

  if (!rows.length) throw new Error('No data rows were found in this file.');
  if (rows.length > MAX_DATA_DIAGRAM_RECORDS) {
    throw new Error(`This import supports up to ${MAX_DATA_DIAGRAM_RECORDS} records. Split the file and import a smaller set.`);
  }
  return rows;
}

function asString(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function relationValues(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  return values.map((item) => String(item).trim()).filter(Boolean);
}

export function buildDataDiagram(rows, { originX = 0, originY = 0, theme = 'light' } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Choose a data file with at least one record first.');
  }
  if (rows.length > MAX_DATA_DIAGRAM_RECORDS) {
    throw new Error(`This import supports up to ${MAX_DATA_DIAGRAM_RECORDS} records.`);
  }
  if (rows.some((row) => !isRecord(row))) {
    throw new Error('Every imported record must be an object with named fields.');
  }

  const nodes = new Map();
  const edges = [];
  const endpointSourceKeys = ['source', 'from'];
  const endpointTargetKeys = ['target', 'to'];
  const edgeRows = rows.some((row) =>
    findKey(row, endpointSourceKeys) && findKey(row, endpointTargetKeys)
  );

  const getNode = (id, label = id, details = {}) => {
    const key = String(id ?? '').trim();
    if (!key) return null;
    if (!nodes.has(key)) nodes.set(key, { id: key, label: String(label || key), details });
    return nodes.get(key);
  };

  if (edgeRows) {
    for (const row of rows) {
      const sourceKey = findKey(row, endpointSourceKeys);
      const targetKey = findKey(row, endpointTargetKeys);
      if (!sourceKey || !targetKey) {
        const idKey = findKey(row, ['id', 'key', 'slug', 'code', 'uuid']);
        const labelKey = findKey(row, ['label', 'title', 'name', 'displayname']);
        const firstKey = Object.keys(row)[0];
        const id = asString(idKey ? row[idKey] : (labelKey ? row[labelKey] : row[firstKey])).trim();
        if (id) {
          const label = asString(labelKey ? row[labelKey] : id).trim() || id;
          const details = Object.fromEntries(
            Object.entries(row).filter(([key, value]) =>
              key !== idKey && key !== labelKey && value !== '' && value !== null && value !== undefined
            )
          );
          getNode(id, label, details);
        }
        continue;
      }
      const source = asString(row[sourceKey]).trim();
      const target = asString(row[targetKey]).trim();
      if (!source || !target) continue;
      const sourceLabelKey = findKey(row, ['sourcename', 'sourcelabel', 'fromname', 'fromlabel']);
      const targetLabelKey = findKey(row, ['targetname', 'targetlabel', 'toname', 'tolabel']);
      getNode(source, sourceLabelKey ? row[sourceLabelKey] : source);
      getNode(target, targetLabelKey ? row[targetLabelKey] : target);
      edges.push({ source, target });
    }
  } else {
    const idAliases = ['id', 'key', 'slug', 'code', 'uuid'];
    const labelAliases = ['label', 'title', 'name', 'displayname'];
    const parentAliases = ['parent', 'parentid'];
    const dependencyAliases = ['dependson', 'dependency', 'dependencies', 'relatedto'];
    const recordIds = [];

    rows.forEach((row, index) => {
      const idKey = findKey(row, idAliases);
      const labelKey = findKey(row, labelAliases);
      const firstKey = Object.keys(row)[0];
      const id = asString(idKey ? row[idKey] : (labelKey ? row[labelKey] : row[firstKey])).trim() || `Record ${index + 1}`;
      const label = asString(labelKey ? row[labelKey] : id).trim() || id;
      const details = Object.fromEntries(
        Object.entries(row).filter(([key, value]) =>
          key !== idKey && key !== labelKey && value !== '' && value !== null && value !== undefined
        )
      );
      getNode(id, label, details);
      recordIds.push(id);
    });

    rows.forEach((row, index) => {
      const id = recordIds[index];
      const parentKey = findKey(row, parentAliases);
      const dependencyKey = findKey(row, dependencyAliases);
      if (parentKey) {
        for (const parent of relationValues(row[parentKey])) {
          getNode(parent);
          edges.push({ source: parent, target: id });
        }
      } else if (dependencyKey) {
        for (const dependency of relationValues(row[dependencyKey])) {
          getNode(dependency);
          edges.push({ source: id, target: dependency });
        }
      }
    });
  }

  if (!nodes.size) throw new Error('No usable records or connections were found in this file.');
  const uniqueEdges = [...new Map(edges.map((edge) => [`${edge.source}\u0000${edge.target}`, edge])).values()]
    .filter((edge) => nodes.has(edge.source) && nodes.has(edge.target));
  const nodeList = [...nodes.values()];
  const adjacency = new Map(nodeList.map((node) => [node.id, []]));
  const indegree = new Map(nodeList.map((node) => [node.id, 0]));
  for (const edge of uniqueEdges) {
    adjacency.get(edge.source).push(edge.target);
    indegree.set(edge.target, indegree.get(edge.target) + 1);
  }

  const levels = new Map(nodeList.map((node) => [node.id, 0]));
  const queue = nodeList.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  for (let index = 0; index < queue.length; index += 1) {
    const source = queue[index];
    for (const target of adjacency.get(source)) {
      levels.set(target, Math.max(levels.get(target), levels.get(source) + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  if (queue.length !== nodeList.length) {
    nodeList.forEach((node, index) => levels.set(node.id, index));
  }

  const nodesByLevel = new Map();
  for (const node of nodeList) {
    const level = levels.get(node.id);
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level).push(node);
  }
  const positions = new Map();
  const nodeWidth = 250;
  const nodeHeight = 116;
  const columnGap = 100;
  const rowGap = 46;
  for (const [level, levelNodes] of nodesByLevel) {
    levelNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: originX + level * (nodeWidth + columnGap),
        y: originY + index * (nodeHeight + rowGap),
      });
    });
  }

  const backgroundColor = theme === 'dark' ? '#27272a' : '#ffffff';
  const strokeColor = theme === 'dark' ? '#818cf8' : '#6366f1';
  const textColor = theme === 'dark' ? '#f4f4f5' : '#18181b';
  const groupIds = new Map(nodeList.map((node) => [node.id, `data-${generateId()}`]));
  const shapeIds = new Map(nodeList.map((node) => [node.id, generateId()]));
  const textIds = new Map(nodeList.map((node) => [node.id, generateId()]));
  const elements = uniqueEdges.map((edge) => {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    return createLinearElement(
      ELEMENT_TYPES.ARROW,
      source.x + nodeWidth,
      source.y + nodeHeight / 2,
      target.x,
      target.y + nodeHeight / 2,
      {
        strokeColor,
        roughness: 0,
        startBinding: { elementId: shapeIds.get(edge.source), focus: 0, gap: 0 },
        endBinding: { elementId: shapeIds.get(edge.target), focus: 0, gap: 0 },
      },
    );
  });
  const boundEdgesByNode = new Map(nodeList.map((node) => [node.id, []]));
  uniqueEdges.forEach((edge, index) => {
    const binding = { id: elements[index].id, type: 'arrow' };
    boundEdgesByNode.get(edge.source).push(binding);
    if (edge.target !== edge.source) boundEdgesByNode.get(edge.target).push(binding);
  });

  for (const node of nodeList) {
    const position = positions.get(node.id);
    const groupId = groupIds.get(node.id);
    const shapeId = shapeIds.get(node.id);
    const textId = textIds.get(node.id);
    const detailLines = Object.entries(node.details)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${asString(value)}`);
    const text = [node.label, ...detailLines].join('\n');
    elements.push(createElement(ELEMENT_TYPES.RECTANGLE, position.x, position.y, nodeWidth, nodeHeight, {
      id: shapeId,
      backgroundColor,
      strokeColor,
      fillStyle: 'solid',
      roughness: 0,
      roundness: { type: 3 },
      groupIds: [groupId],
      boundElements: [{ id: textId, type: 'text' }, ...boundEdgesByNode.get(node.id)],
      dataDiagramRecordId: node.id,
    }));
    elements.push(createTextElement(position.x + 14, position.y + 12, text, {
      id: textId,
      width: nodeWidth - 28,
      height: nodeHeight - 24,
      fontSize: 15,
      strokeColor: textColor,
      containerId: shapeId,
      groupIds: [groupId],
      dataDiagramRecordId: node.id,
    }));
  }

  return {
    elements,
    nodeCount: nodeList.length,
    connectionCount: uniqueEdges.length,
    bounds: {
      x: originX,
      y: originY,
      width: Math.max(...[...nodesByLevel.keys()]) * (nodeWidth + columnGap) + nodeWidth,
      height: Math.max(...[...nodesByLevel.values()].map((levelNodes) => levelNodes.length)) * (nodeHeight + rowGap) - rowGap,
    },
  };
}

export function parseMarkdownToDiagramRows(markdownText, fileName = '') {
  if (typeof markdownText !== 'string' || !markdownText.trim()) {
    throw new Error('The selected Markdown file is empty.');
  }

  const lines = markdownText.split('\n');
  const rows = [];
  const headingStack = [];
  let currentRecord = null;
  let counter = 1;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const id = `node_${counter++}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}`;

      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }

      const parent = headingStack.length > 0 ? headingStack[headingStack.length - 1].id : '';

      currentRecord = {
        id,
        name: title,
        parent,
        level: `H${level}`,
        details: '',
      };
      rows.push(currentRecord);
      headingStack.push({ level, id, title });
    } else if (currentRecord && (/^[-*]\s+/.test(line.trim()))) {
      const bullet = line.trim().replace(/^[-*]\s+/, '');
      if (currentRecord.details) {
        currentRecord.details += `; ${bullet}`;
      } else {
        currentRecord.details = bullet;
      }
    }
  }

  if (rows.length === 0) {
    rows.push({
      id: 'doc_1',
      name: fileName.replace(/\.[^/.]+$/, '') || 'Document',
      details: lines.filter((l) => l.trim()).slice(0, 3).join(' ').slice(0, 60),
    });
  }

  return rows;
}

