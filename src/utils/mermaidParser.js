/**
 * mermaidParser.js
 * Native client-side parser & layout engine to convert Mermaid syntax into
 * Doodle Desk native canvas elements without external network requests.
 */

import { generateId, ELEMENT_TYPES, defaultElementProps } from '../engine/elements.js';

// Pre-defined templates for quick insertion
export const MERMAID_PRESETS = [
  {
    id: 'flowchart',
    title: 'Flowchart',
    desc: 'Standard process logic with start, process steps, and finish.',
    code: `flowchart TD
  Start[Start Project] --> Plan[Plan Architecture]
  Plan --> Develop[Develop Features]
  Develop --> Review{Code Review}
  Review -->|Approved| Deploy[Deploy to Prod]
  Review -->|Changes Needed| Develop
  Deploy --> Complete([Project Complete])`,
  },
  {
    id: 'decision_tree',
    title: 'Decision Tree',
    desc: 'Branching logic with conditionals and decision diamonds.',
    code: `flowchart TD
  User((User Request)) --> Auth{Is Authenticated?}
  Auth -->|Yes| Perms{Has Permission?}
  Auth -->|No| Login[Redirect to Login]
  Perms -->|Yes| Serve[Serve Resource]
  Perms -->|No| Deny[403 Forbidden]
  Login --> Auth`,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    desc: 'Multi-tier system with client, API gateway, cache, and DB.',
    code: `flowchart LR
  Client[Web Client] --> Gateway[API Gateway]
  Gateway --> ServiceA[Auth Service]
  Gateway --> ServiceB[Data Service]
  ServiceB --> Cache[(Redis Cache)]
  ServiceB --> Database[(PostgreSQL DB)]`,
  },
  {
    id: 'sequence',
    title: 'Sequence Diagram',
    desc: 'Interactive message exchange between entities over time.',
    code: `sequenceDiagram
  Client->>Server: POST /login (credentials)
  Server->>Database: Query user record
  Database-->>Server: User found & verified
  Server-->>Client: 200 OK (JWT Token)
  Client->>Server: GET /dashboard (with Token)
  Server-->>Client: Dashboard HTML & Data`,
  },
  {
    id: 'state_machine',
    title: 'State Machine',
    desc: 'System states and transition events.',
    code: `flowchart TD
  Idle([Idle]) -->|Submit| Processing[Processing]
  Processing -->|Success| Completed([Completed])
  Processing -->|Error| Failed([Failed])
  Failed -->|Retry| Processing`,
  },
];

/**
 * Parses Mermaid text and returns Doodle Desk elements and bounds
 * @param {string} code
 * @param {object} options
 * @returns {{ elements: Array, bounds: object, error: string|null, type: string }}
 */
export function parseMermaidToElements(code, options = {}) {
  const {
    originX = 100,
    originY = 100,
    theme = 'dark',
  } = options;

  if (!code || !code.trim()) {
    return { elements: [], bounds: null, error: 'Empty Mermaid diagram markup.', type: 'unknown' };
  }

  const cleanCode = code.trim();

  // Detect sequence diagram
  if (/^\s*sequenceDiagram/i.test(cleanCode)) {
    return parseSequenceDiagram(cleanCode, originX, originY, theme);
  }

  // Default to flowchart / graph
  return parseFlowchartDiagram(cleanCode, originX, originY, theme);
}

/**
 * Parse Flowchart / Graph diagrams
 */
function parseFlowchartDiagram(code, originX, originY, theme) {
  try {
    const lines = code.split('\n');
    let direction = 'TD'; // Default top-down

    // Read header line (e.g. flowchart TD or graph LR)
    const firstLine = lines[0].trim();
    const headerMatch = firstLine.match(/^(?:flowchart|graph)\s+([A-Z]{2})/i);
    if (headerMatch) {
      direction = headerMatch[1].toUpperCase();
    }

    const nodesMap = new Map(); // id -> { id, label, shape }
    const edges = []; // { source, target, label, style }

    // Helper to get or register node
    const getOrCreateNode = (id, label = id, shape = 'rectangle') => {
      const cleanId = id.trim();
      if (!nodesMap.has(cleanId)) {
        nodesMap.set(cleanId, {
          id: cleanId,
          label: label.trim(),
          shape,
        });
      } else if (label !== cleanId) {
        // Update label or shape if previously registered with just ID
        const existing = nodesMap.get(cleanId);
        if (existing.label === cleanId && label !== cleanId) {
          existing.label = label.trim();
        }
        if (shape !== 'rectangle') {
          existing.shape = shape;
        }
      }
      return nodesMap.get(cleanId);
    };

    // Regex to match a node pattern: id[label], id(label), id([label]), id[(label)], id((label)), id{label}
    const extractNodeFromToken = (token) => {
      if (!token) return null;
      const t = token.trim();

      // Database [(text)]
      let m = t.match(/^([a-zA-Z0-9_-]+)\[\((.*?)\)\]$/);
      if (m) return getOrCreateNode(m[1], m[2], 'database');

      // Pill ([text])
      m = t.match(/^([a-zA-Z0-9_-]+)\[\((.*?)\)\]$/);
      if (m) return getOrCreateNode(m[1], m[2], 'pill');

      // Pill alternate ([text])
      m = t.match(/^([a-zA-Z0-9_-]+)\(\[(.*?)\]\)$/);
      if (m) return getOrCreateNode(m[1], m[2], 'pill');

      // Circle ((text))
      m = t.match(/^([a-zA-Z0-9_-]+)\(\((.*?)\)\)$/);
      if (m) return getOrCreateNode(m[1], m[2], 'ellipse');

      // Diamond {text} or {{text}}
      m = t.match(/^([a-zA-Z0-9_-]+)\{\{(.*?)\}\}$/) || t.match(/^([a-zA-Z0-9_-]+)\{(.*?)\}$/);
      if (m) return getOrCreateNode(m[1], m[2], 'diamond');

      // Rounded rectangle (text)
      m = t.match(/^([a-zA-Z0-9_-]+)\((.*?)\)$/);
      if (m) return getOrCreateNode(m[1], m[2], 'rounded');

      // Rectangle [text]
      m = t.match(/^([a-zA-Z0-9_-]+)\[(.*?)\]$/);
      if (m) return getOrCreateNode(m[1], m[2], 'rectangle');

      // Plain ID
      m = t.match(/^([a-zA-Z0-9_-]+)$/);
      if (m) return getOrCreateNode(m[1], m[1], 'rectangle');

      return null;
    };

    // Parse each line for connections and definitions
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line || line.startsWith('%%') || /^flowchart|^graph/i.test(line) || /^subgraph|^end/i.test(line)) {
        continue;
      }

      // Check for arrows with label syntax
      let edgeFound = false;
      let leftToken = '', arrowType = '', label = '', rightToken = '';

      // 1. Arrow with pipe label: A -->|Label| B
      const pipeMatch = line.match(/^(.*?)\s*(-->|-.->|==>|---|--o|--x)\s*\|(.*?)\|\s*(.*)$/);
      if (pipeMatch) {
        leftToken = pipeMatch[1].trim();
        arrowType = pipeMatch[2].trim();
        label = pipeMatch[3].trim();
        rightToken = pipeMatch[4].trim();
        edgeFound = true;
      }

      // 2. Arrow with inline label: A -- Label --> B
      if (!edgeFound) {
        const inlineMatch = line.match(/^(.*?)\s*(--\s*(.*?)\s*-->|-\.\s*(.*?)\s*\.->|==\s*(.*?)\s*==>)\s*(.*)$/);
        if (inlineMatch) {
          leftToken = inlineMatch[1].trim();
          arrowType = '-->';
          label = (inlineMatch[3] || inlineMatch[4] || inlineMatch[5] || '').trim();
          rightToken = inlineMatch[6].trim();
          edgeFound = true;
        }
      }

      // 3. Simple arrow: A --> B, A --- B, A -.-> B, A ==> B
      if (!edgeFound) {
        const simpleMatch = line.match(/^(.*?)\s*(-->|---|-.->|==>)\s*(.*)$/);
        if (simpleMatch) {
          leftToken = simpleMatch[1].trim();
          arrowType = simpleMatch[2].trim();
          label = '';
          rightToken = simpleMatch[3].trim();
          edgeFound = true;
        }
      }

      if (edgeFound) {
        const sourceNode = extractNodeFromToken(leftToken);
        const targetNode = extractNodeFromToken(rightToken);

        if (sourceNode && targetNode) {
          const isDashed = arrowType.includes('-.');
          const isThick = arrowType.includes('==');
          const isLine = arrowType.trim() === '---';

          edges.push({
            source: sourceNode.id,
            target: targetNode.id,
            label,
            isDashed,
            isThick,
            hasArrow: !isLine,
          });
        }
      } else {
        // Individual node declaration like: Start[Start here]
        extractNodeFromToken(line);
      }
    }

    if (nodesMap.size === 0) {
      return { elements: [], bounds: null, error: 'No valid diagram nodes found.', type: 'flowchart' };
    }

    // Layout calculation: Rank / Layer assignment (Topological DAG with cycle detection)
    const nodesList = Array.from(nodesMap.values());
    const adj = new Map(); // id -> array of target ids

    nodesList.forEach((n) => {
      adj.set(n.id, []);
    });

    edges.forEach((e) => {
      if (adj.has(e.source)) {
        adj.get(e.source).push(e.target);
      }
    });

    // 1. Detect cycle / feedback edges using DFS so loops don't invert layers
    const dfsState = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
    const feedbackEdges = new Set();

    const dfsCycle = (u) => {
      dfsState.set(u, 1);
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (dfsState.get(v) === 1) {
          feedbackEdges.add(`${u}->${v}`);
        } else if (!dfsState.get(v)) {
          dfsCycle(v);
        }
      }
      dfsState.set(u, 2);
    };

    nodesList.forEach((n) => {
      if (!dfsState.get(n.id)) {
        dfsCycle(n.id);
      }
    });

    // 2. Compute forward in-degrees only
    const forwardInDegree = new Map();
    nodesList.forEach((n) => forwardInDegree.set(n.id, 0));

    edges.forEach((e) => {
      if (!feedbackEdges.has(`${e.source}->${e.target}`)) {
        forwardInDegree.set(e.target, (forwardInDegree.get(e.target) || 0) + 1);
      }
    });

    // 3. Assign layers using forward DAG edges
    const layers = new Map();
    const queue = [];

    nodesList.forEach((n) => {
      if ((forwardInDegree.get(n.id) || 0) === 0) {
        queue.push(n.id);
        layers.set(n.id, 0);
      }
    });

    if (queue.length === 0 && nodesList.length > 0) {
      queue.push(nodesList[0].id);
      layers.set(nodesList[0].id, 0);
    }

    while (queue.length > 0) {
      const u = queue.shift();
      const currentLayer = layers.get(u) || 0;
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!feedbackEdges.has(`${u}->${v}`)) {
          const nextLayer = Math.max(currentLayer + 1, layers.get(v) || 0);
          if (layers.get(v) !== nextLayer) {
            layers.set(v, nextLayer);
            queue.push(v);
          }
        }
      }
    }

    // Catch any disconnected nodes
    nodesList.forEach((n) => {
      if (!layers.has(n.id)) {
        layers.set(n.id, 0);
      }
    });

    // Group nodes by layer
    const layerGroups = new Map();
    let maxLayer = 0;
    nodesList.forEach((n) => {
      const layer = layers.get(n.id) || 0;
      if (!layerGroups.has(layer)) {
        layerGroups.set(layer, []);
      }
      layerGroups.get(layer).push(n);
      if (layer > maxLayer) maxLayer = layer;
    });

    // Sizing & Spacing
    const nodePositions = new Map(); // id -> { x, y, width, height }
    const isHorizontal = direction === 'LR' || direction === 'RL';

    const defaultWidth = 140;
    const defaultHeight = 56;
    const gapX = isHorizontal ? 100 : 50;
    const gapY = isHorizontal ? 50 : 80;

    // Calculate dimensions for each layer
    for (let l = 0; l <= maxLayer; l++) {
      const group = layerGroups.get(l) || [];
      const layerCount = group.length;

      group.forEach((node, idx) => {
        // Dynamic node width based on text length
        const labelLen = node.label.length;
        const width = Math.max(defaultWidth, Math.min(320, labelLen * 10 + 36));
        const height = node.shape === 'diamond' ? Math.max(70, width * 0.6) : defaultHeight;

        let x = 0;
        let y = 0;

        if (isHorizontal) {
          x = originX + l * (defaultWidth + gapX);
          const totalLayerHeight = layerCount * height + (layerCount - 1) * gapY;
          y = originY + idx * (height + gapY) - totalLayerHeight / 2 + 150;
        } else {
          y = originY + l * (defaultHeight + gapY);
          const totalLayerWidth = layerCount * width + (layerCount - 1) * gapX;
          x = originX + idx * (width + gapX) - totalLayerWidth / 2 + 250;
        }

        nodePositions.set(node.id, { x, y, width, height });
      });
    }

    // Build Doodle Elements
    const elements = [];
    const isDark = theme !== 'light';

    const shapeStroke = isDark ? '#e4e4e7' : '#18181b';
    const shapeBg = isDark ? '#222226' : '#f8fafc';
    const textFill = isDark ? '#f4f4f5' : '#0f172a';
    const arrowStroke = isDark ? '#a1a1aa' : '#475569';

    // 1. Generate Nodes
    nodesList.forEach((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const boxId = generateId();
      const textId = generateId();

      let doodleType = ELEMENT_TYPES.RECTANGLE;
      let roundness = null;

      if (node.shape === 'diamond') {
        doodleType = ELEMENT_TYPES.DIAMOND;
      } else if (node.shape === 'ellipse') {
        doodleType = ELEMENT_TYPES.ELLIPSE;
      } else if (node.shape === 'pill' || node.shape === 'rounded') {
        roundness = { type: 3 };
      }

      const shapeEl = {
        ...defaultElementProps(),
        id: boxId,
        type: doodleType,
        x: Math.round(pos.x),
        y: Math.round(pos.y),
        width: Math.round(pos.width),
        height: Math.round(pos.height),
        strokeColor: shapeStroke,
        backgroundColor: shapeBg,
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        roundness,
        boundElements: [{ type: 'text', id: textId }],
        seed: Math.floor(Math.random() * 100000),
      };

      const textEl = {
        ...defaultElementProps(),
        id: textId,
        type: ELEMENT_TYPES.TEXT,
        x: Math.round(pos.x + 10),
        y: Math.round(pos.y + pos.height / 2 - 10),
        width: Math.round(pos.width - 20),
        height: 24,
        text: node.label,
        originalText: node.label,
        fontSize: 15,
        fontFamily: 5, // Doodlefont
        textAlign: 'center',
        verticalAlign: 'middle',
        strokeColor: textFill,
        containerId: boxId,
        lineHeight: 1.25,
        seed: Math.floor(Math.random() * 100000),
      };

      elements.push(shapeEl, textEl);
    });

    // 2. Generate Edges / Arrows
    edges.forEach((edge) => {
      const src = nodePositions.get(edge.source);
      const tgt = nodePositions.get(edge.target);
      if (!src || !tgt) return;

      const arrowId = generateId();

      // Check if this is an upward / loop edge (tgt is above or at src in TD)
      if (!isHorizontal && tgt.y <= src.y) {
        const leftX = Math.min(src.x, tgt.x) - 45;
        const startX = src.x;
        const startY = src.y + src.height / 2;
        const endX = tgt.x;
        const endY = tgt.y + tgt.height / 2;

        const arrowEl = {
          ...defaultElementProps(),
          id: arrowId,
          type: ELEMENT_TYPES.ARROW,
          x: Math.round(leftX),
          y: Math.round(endY),
          width: Math.round(Math.abs(startX - leftX)),
          height: Math.round(Math.abs(startY - endY)),
          points: [
            [Math.round(startX - leftX), Math.round(startY - endY)],
            [0, Math.round(startY - endY)],
            [0, 0],
            [Math.round(endX - leftX), 0],
          ],
          strokeColor: arrowStroke,
          strokeWidth: edge.isThick ? 3 : 1.5,
          strokeStyle: edge.isDashed ? 'dashed' : 'solid',
          roughness: 1,
          endArrowhead: edge.hasArrow ? 'arrow' : null,
          seed: Math.floor(Math.random() * 100000),
        };

        elements.push(arrowEl);

        if (edge.label) {
          const labelTextEl = {
            ...defaultElementProps(),
            id: generateId(),
            type: ELEMENT_TYPES.TEXT,
            x: Math.round(leftX - (edge.label.length * 7) / 2),
            y: Math.round((startY + endY) / 2 - 10),
            width: Math.round(edge.label.length * 8),
            height: 20,
            text: edge.label,
            originalText: edge.label,
            fontSize: 13,
            fontFamily: 5,
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor: textFill,
            backgroundColor: shapeBg,
            lineHeight: 1.2,
            seed: Math.floor(Math.random() * 100000),
          };
          elements.push(labelTextEl);
        }
        return;
      }

      let startX, startY, endX, endY;

      if (isHorizontal) {
        startX = src.x + src.width;
        startY = src.y + src.height / 2;
        endX = tgt.x;
        endY = tgt.y + tgt.height / 2;
      } else {
        startX = src.x + src.width / 2;
        startY = src.y + src.height;
        endX = tgt.x + tgt.width / 2;
        endY = tgt.y;
      }

      const dx = endX - startX;
      const dy = endY - startY;

      const arrowEl = {
        ...defaultElementProps(),
        id: arrowId,
        type: ELEMENT_TYPES.ARROW,
        x: Math.round(startX),
        y: Math.round(startY),
        width: Math.round(Math.abs(dx)),
        height: Math.round(Math.abs(dy)),
        points: [[0, 0], [Math.round(dx), Math.round(dy)]],
        strokeColor: arrowStroke,
        strokeWidth: edge.isThick ? 3 : 1.5,
        strokeStyle: edge.isDashed ? 'dashed' : 'solid',
        roughness: 1,
        endArrowhead: edge.hasArrow ? 'arrow' : null,
        seed: Math.floor(Math.random() * 100000),
      };

      elements.push(arrowEl);

      // Edge label
      if (edge.label) {
        const midX = startX + dx * 0.5;
        const midY = startY + dy * 0.5 - 14;
        const labelTextEl = {
          ...defaultElementProps(),
          id: generateId(),
          type: ELEMENT_TYPES.TEXT,
          x: Math.round(midX - (edge.label.length * 7) / 2),
          y: Math.round(midY),
          width: Math.round(edge.label.length * 8),
          height: 20,
          text: edge.label,
          originalText: edge.label,
          fontSize: 13,
          fontFamily: 5,
          textAlign: 'center',
          verticalAlign: 'middle',
          strokeColor: textFill,
          backgroundColor: shapeBg,
          lineHeight: 1.2,
          seed: Math.floor(Math.random() * 100000),
        };
        elements.push(labelTextEl);
      }
    });

    // Compute overall bounds
    const bounds = computeElementsBounds(elements);

    return {
      elements,
      bounds,
      error: null,
      type: 'flowchart',
    };
  } catch (err) {
    console.error('Mermaid flowchart parse error:', err);
    return {
      elements: [],
      bounds: null,
      error: `Could not parse flowchart: ${err.message}`,
      type: 'flowchart',
    };
  }
}

/**
 * Parse Sequence Diagrams
 */
function parseSequenceDiagram(code, originX, originY, theme) {
  try {
    const lines = code.split('\n');
    const participants = [];
    const participantSet = new Set();
    const messages = [];

    const getParticipant = (name) => {
      const clean = name.trim();
      if (!participantSet.has(clean)) {
        participantSet.add(clean);
        participants.push(clean);
      }
      return clean;
    };

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('%%') || /^sequenceDiagram/i.test(line)) continue;

      // participant Name
      const partMatch = line.match(/^participant\s+(?:([^\s]+)\s+as\s+)?(.*)/i);
      if (partMatch) {
        const name = (partMatch[2] || partMatch[1]).trim();
        getParticipant(name);
        continue;
      }

      // Message: A->>B: text, A-->>B: text, A->B: text
      const msgMatch = line.match(/^([a-zA-Z0-9_-]+)\s*(->>|-->>|->|-->)\s*([a-zA-Z0-9_-]+)\s*:\s*(.*)/);
      if (msgMatch) {
        const from = getParticipant(msgMatch[1]);
        const to = getParticipant(msgMatch[3]);
        const isDotted = msgMatch[2].startsWith('--');
        const text = msgMatch[4]?.trim() || '';
        messages.push({ from, to, isDotted, text });
      }
    }

    if (participants.length === 0) {
      return { elements: [], bounds: null, error: 'No participants found in sequence diagram.', type: 'sequence' };
    }

    const elements = [];
    const isDark = theme !== 'light';
    const shapeStroke = isDark ? '#e4e4e7' : '#18181b';
    const shapeBg = isDark ? '#222226' : '#f8fafc';
    const textFill = isDark ? '#f4f4f5' : '#0f172a';
    const arrowStroke = isDark ? '#a1a1aa' : '#475569';
    const lifelineStroke = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

    const partWidth = 140;
    const partHeight = 48;
    const partGap = 160;
    const stepHeight = 56;
    const totalHeight = Math.max(260, 100 + messages.length * stepHeight + 60);

    const partPositions = new Map();

    // 1. Draw Participant Boxes & Lifelines
    participants.forEach((name, idx) => {
      const px = originX + idx * (partWidth + partGap);
      const py = originY;
      partPositions.set(name, px + partWidth / 2);

      const boxId = generateId();
      const textId = generateId();

      // Box
      elements.push({
        ...defaultElementProps(),
        id: boxId,
        type: ELEMENT_TYPES.RECTANGLE,
        x: Math.round(px),
        y: Math.round(py),
        width: partWidth,
        height: partHeight,
        strokeColor: shapeStroke,
        backgroundColor: shapeBg,
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 100000),
      });

      // Label
      elements.push({
        ...defaultElementProps(),
        id: textId,
        type: ELEMENT_TYPES.TEXT,
        x: Math.round(px + 10),
        y: Math.round(py + partHeight / 2 - 10),
        width: partWidth - 20,
        height: 24,
        text: name,
        originalText: name,
        fontSize: 15,
        fontFamily: 5,
        textAlign: 'center',
        verticalAlign: 'middle',
        strokeColor: textFill,
        containerId: boxId,
        seed: Math.floor(Math.random() * 100000),
      });

      // Lifeline
      const lineX = Math.round(px + partWidth / 2);
      elements.push({
        ...defaultElementProps(),
        id: generateId(),
        type: ELEMENT_TYPES.LINE,
        x: lineX,
        y: Math.round(py + partHeight),
        width: 1,
        height: totalHeight - partHeight,
        points: [[0, 0], [0, totalHeight - partHeight]],
        strokeColor: lifelineStroke,
        strokeStyle: 'dashed',
        strokeWidth: 1.5,
        roughness: 0,
        seed: Math.floor(Math.random() * 100000),
      });
    });

    // 2. Draw Message Arrows
    messages.forEach((msg, idx) => {
      const fromX = partPositions.get(msg.from);
      const toX = partPositions.get(msg.to);
      if (fromX == null || toX == null) return;

      const arrowY = originY + partHeight + 40 + idx * stepHeight;
      const dx = toX - fromX;

      // Arrow
      elements.push({
        ...defaultElementProps(),
        id: generateId(),
        type: ELEMENT_TYPES.ARROW,
        x: Math.round(fromX),
        y: Math.round(arrowY),
        width: Math.round(Math.abs(dx)),
        height: 1,
        points: [[0, 0], [Math.round(dx), 0]],
        strokeColor: arrowStroke,
        strokeStyle: msg.isDotted ? 'dashed' : 'solid',
        strokeWidth: 1.8,
        endArrowhead: 'arrow',
        roughness: 1,
        seed: Math.floor(Math.random() * 100000),
      });

      // Label text
      if (msg.text) {
        const midX = fromX + dx / 2;
        elements.push({
          ...defaultElementProps(),
          id: generateId(),
          type: ELEMENT_TYPES.TEXT,
          x: Math.round(midX - (msg.text.length * 7) / 2),
          y: Math.round(arrowY - 20),
          width: Math.round(msg.text.length * 8),
          height: 18,
          text: msg.text,
          originalText: msg.text,
          fontSize: 13,
          fontFamily: 5,
          textAlign: 'center',
          verticalAlign: 'middle',
          strokeColor: textFill,
          seed: Math.floor(Math.random() * 100000),
        });
      }
    });

    const bounds = computeElementsBounds(elements);

    return {
      elements,
      bounds,
      error: null,
      type: 'sequence',
    };
  } catch (err) {
    console.error('Mermaid sequence parse error:', err);
    return {
      elements: [],
      bounds: null,
      error: `Could not parse sequence diagram: ${err.message}`,
      type: 'sequence',
    };
  }
}

/**
 * Compute overall bounding box
 */
function computeElementsBounds(elements) {
  if (!elements || elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 0));
    maxY = Math.max(maxY, el.y + (el.height || 0));
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
