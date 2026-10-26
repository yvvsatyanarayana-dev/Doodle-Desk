/**
 * schemaParsers.js
 * Universal Schema & API Drop-to-Diagram parsers for SQL DDL and OpenAPI/Swagger.
 * Converts schemas and route definitions into linked visual diagram records.
 */

/**
 * Parses SQL DDL script containing CREATE TABLE statements and foreign keys.
 * @param {string} sql
 * @returns {Array<Object>} Diagram rows
 */
export function parseSqlDdl(sql) {
  if (typeof sql !== 'string' || !sql.trim()) return [];

  // Remove single line and block comments
  const cleanSql = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"']?\w+[`"']?\.)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\)(?:;|\s*$)/gi;
  const tables = [];
  let match;

  while ((match = tableRegex.exec(cleanSql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns = [];
    const foreignKeys = [];

    // Split body by commas outside parentheses
    const lines = body.split(/,(?![^(]*\))/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // FOREIGN KEY (col) REFERENCES otherTable(otherCol)
      const fkMatch = line.match(/(?:CONSTRAINT\s+[`"']?\w+[`"']?\s+)?FOREIGN\s+KEY\s*\([`"']?(\w+)[`"']?\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?(\w+)[`"']?\)/i);
      if (fkMatch) {
        foreignKeys.push({ col: fkMatch[1], targetTable: fkMatch[2], targetCol: fkMatch[3] });
        continue;
      }

      // Inline primary key or column definition
      const colMatch = line.match(/^[`"']?(\w+)[`"']?\s+([A-Za-z0-9_()]+)(.*)$/);
      if (colMatch && !/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|CHECK)/i.test(colMatch[1])) {
        const colName = colMatch[1];
        const colType = colMatch[2];
        const rest = colMatch[3];
        const isPk = /PRIMARY\s+KEY/i.test(rest) || /PRIMARY\s+KEY/i.test(line);

        const inlineRef = rest.match(/REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?(\w+)[`"']?\)/i);
        if (inlineRef) {
          foreignKeys.push({ col: colName, targetTable: inlineRef[1], targetCol: inlineRef[2] });
        }

        columns.push(`${colName} (${colType})${isPk ? ' 🔑' : ''}`);
      }
    }

    tables.push({
      tableName,
      columns,
      foreignKeys,
    });
  }

  if (tables.length === 0) {
    throw new Error('No valid CREATE TABLE statements found in the SQL script.');
  }

  // Convert to connected DAG records
  return tables.map(t => ({
    id: t.tableName,
    label: `🗄️ ${t.tableName}`,
    parent_id: t.foreignKeys[0]?.targetTable || '',
    type: 'sql_table',
    columns: t.columns.slice(0, 4).join(' | '),
    total_columns: String(t.columns.length),
    references: t.foreignKeys.map(fk => `${fk.col} ➜ ${fk.targetTable}`).join(', ') || 'None',
  }));
}

/**
 * Parses OpenAPI 3.0 or Swagger 2.0 specs (JSON object) into API route cards.
 * @param {Object} doc
 * @returns {Array<Object>} Diagram rows
 */
export function parseOpenApiSpec(doc) {
  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid OpenAPI/Swagger document.');
  }

  const paths = doc.paths || {};
  const routes = [];

  for (const [routePath, methods] of Object.entries(paths)) {
    if (typeof methods !== 'object' || !methods) continue;
    for (const [method, details] of Object.entries(methods)) {
      const m = method.toLowerCase();
      if (['get', 'post', 'put', 'delete', 'patch'].includes(m)) {
        const tag = (Array.isArray(details.tags) && details.tags[0]) || 'API Gateway';
        routes.push({
          id: `${m.toUpperCase()} ${routePath}`,
          label: `${m.toUpperCase()} ${routePath}`,
          parent_id: tag,
          service_group: tag,
          summary: details.summary || details.operationId || routePath,
          status: details.deprecated ? 'Deprecated' : 'Active',
        });
      }
    }
  }

  if (routes.length === 0) {
    throw new Error('No API endpoints found under "paths" in the OpenAPI spec.');
  }

  return routes;
}

/**
 * Parses GraphQL Schema Definition Language (SDL) into diagram records.
 * @param {string} sdl
 * @returns {Array<Object>} Diagram rows
 */
export function parseGraphQlSdl(sdl) {
  if (typeof sdl !== 'string' || !sdl.trim()) {
    throw new Error('Invalid GraphQL SDL content.');
  }

  // Remove comments
  const clean = sdl.replace(/#.*$/gm, '');
  const typeRegex = /(?:type|interface|input|enum)\s+(\w+)(?:\s+implements\s+([\w\s,&]+))?\s*\{([^}]*)\}/g;
  const types = [];
  let match;

  while ((match = typeRegex.exec(clean)) !== null) {
    const typeName = match[1];
    const implementsRaw = match[2] || '';
    const body = match[3];

    const fields = [];
    const fieldLines = body.split('\n');
    for (const rawLine of fieldLines) {
      const line = rawLine.trim();
      if (!line) continue;
      const fieldMatch = line.match(/^(\w+)(?:\([^)]*\))?\s*:\s*(\[?\w+!?\]?!?)/);
      if (fieldMatch) {
        fields.push(`${fieldMatch[1]}: ${fieldMatch[2]}`);
      }
    }

    const interfaces = implementsRaw.split(/[&,]/).map(s => s.trim()).filter(Boolean);

    types.push({
      id: typeName,
      label: `📦 ${typeName}`,
      parent_id: interfaces[0] || (typeName.endsWith('Input') ? 'Input' : (typeName === 'Query' || typeName === 'Mutation' ? 'Root' : '')),
      type: 'graphql_type',
      fields: fields.slice(0, 5).join(' | '),
      total_fields: String(fields.length),
      implements: interfaces.join(', ') || 'None',
    });
  }

  if (types.length === 0) {
    throw new Error('No valid GraphQL types or interfaces found.');
  }

  return types;
}

/**
 * Parses Terraform HCL configuration into cloud infrastructure diagram records.
 * @param {string} hcl
 * @returns {Array<Object>} Diagram rows
 */
export function parseTerraformHcl(hcl) {
  if (typeof hcl !== 'string' || !hcl.trim()) {
    throw new Error('Invalid Terraform HCL content.');
  }

  // Remove comments
  const clean = hcl.replace(/#.*$/gm, '').replace(/\/\/.*$/gm, '');
  const blockRegex = /(resource|module|data)\s+(?:"([^"]+)"\s+)?"([^"]+)"\s*\{([\s\S]*?)\}/g;
  const items = [];
  let match;

  while ((match = blockRegex.exec(clean)) !== null) {
    const kind = match[1];
    const typeOrModule = match[2] || kind;
    const name = match[3];
    const body = match[4];

    // Detect references to other resources (e.g., aws_vpc.main.id)
    const refMatch = body.match(/(?:aws|azurerm|google|module)_[\w.]+/g);
    const primaryRef = refMatch ? refMatch[0].split('.')[1] || refMatch[0].split('.')[0] : '';

    items.push({
      id: `${typeOrModule}.${name}`,
      label: `☁️ ${name} (${typeOrModule})`,
      parent_id: primaryRef,
      type: 'terraform_resource',
      kind,
      resource_type: typeOrModule,
      name,
    });
  }

  if (items.length === 0) {
    throw new Error('No valid Terraform resource or module blocks found.');
  }

  return items;
}

/**
 * Converts canvas elements to Mermaid diagram syntax.
 * @param {Array<Object>} elements
 * @returns {string} Mermaid diagram code
 */
export function exportToMermaid(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return 'graph TD\n  Empty[Empty Canvas]';

  const active = elements.filter(el => !el.isDeleted && !el.isHidden);
  const sanitize = (str) => (str || 'Node').replace(/["\n\r[\]{}()]/g, ' ').trim();
  const nodeMap = new Map();
  const nodes = [];
  const connections = [];

  active.forEach((el, index) => {
    if (el.type === 'arrow' || el.type === 'line') return;
    const nodeId = `node_${index}`;
    nodeMap.set(el.id, nodeId);
    const label = sanitize(el.text || el.name || `${el.type} ${index + 1}`);

    if (el.type === 'frame') {
      nodes.push(`  subgraph ${nodeId} ["${label}"]\n  end`);
    } else if (el.type === 'diamond') {
      nodes.push(`  ${nodeId}{"${label}"}`);
    } else if (el.type === 'ellipse') {
      nodes.push(`  ${nodeId}(("${label}"))`);
    } else if (el.type === 'cylinder') {
      nodes.push(`  ${nodeId}[("${label}")]`);
    } else {
      nodes.push(`  ${nodeId}["${label}"]`);
    }
  });

  // Connectors
  active.forEach(el => {
    if (el.type === 'arrow') {
      const fromId = el.startBinding?.elementId ? nodeMap.get(el.startBinding.elementId) : null;
      const toId = el.endBinding?.elementId ? nodeMap.get(el.endBinding.elementId) : null;
      const arrowText = el.text ? `|"${sanitize(el.text)}"|` : '';
      if (fromId && toId) {
        connections.push(`  ${fromId} -->${arrowText} ${toId}`);
      }
    }
  });

  return ['flowchart TD', ...nodes, ...connections].join('\n');
}

/**
 * Converts canvas elements to PlantUML syntax.
 * @param {Array<Object>} elements
 * @returns {string} PlantUML code
 */
export function exportToPlantUML(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return '@startuml\n@enduml';

  const active = elements.filter(el => !el.isDeleted && !el.isHidden);
  const sanitize = (str) => (str || 'Node').replace(/["\n\r]/g, ' ').trim();
  const nodeMap = new Map();
  const lines = ['@startuml', '!theme plain', 'skinparam defaultTextAlignment center'];

  active.forEach((el, index) => {
    if (el.type === 'arrow' || el.type === 'line') return;
    const nodeId = `n${index}`;
    nodeMap.set(el.id, nodeId);
    const label = sanitize(el.text || el.name || el.type);

    if (el.type === 'frame') {
      lines.push(`package "${label}" as ${nodeId} {`);
      lines.push('}');
    } else if (el.type === 'cylinder' || el.text?.toLowerCase().includes('database') || el.text?.toLowerCase().includes('sql')) {
      lines.push(`database "${label}" as ${nodeId}`);
    } else if (el.type === 'cloud' || el.text?.toLowerCase().includes('cloud') || el.text?.toLowerCase().includes('api')) {
      lines.push(`cloud "${label}" as ${nodeId}`);
    } else {
      lines.push(`rectangle "${label}" as ${nodeId}`);
    }
  });

  active.forEach(el => {
    if (el.type === 'arrow') {
      const fromId = el.startBinding?.elementId ? nodeMap.get(el.startBinding.elementId) : null;
      const toId = el.endBinding?.elementId ? nodeMap.get(el.endBinding.elementId) : null;
      const arrowLabel = el.text ? ` : ${sanitize(el.text)}` : '';
      if (fromId && toId) {
        lines.push(`${fromId} --> ${toId}${arrowLabel}`);
      }
    }
  });

  lines.push('@enduml');
  return lines.join('\n');
}

/**
 * Converts canvas elements to C4 Model DSL syntax.
 * @param {Array<Object>} elements
 * @returns {string} C4 Model syntax
 */
export function exportToC4Model(elements) {
  if (!Array.isArray(elements) || elements.length === 0) return '// C4 Model\nworkspace {\n}';

  const active = elements.filter(el => !el.isDeleted && !el.isHidden);
  const sanitize = (str) => (str || 'Component').replace(/["\n\r]/g, ' ').trim();
  const nodeMap = new Map();
  const elementsCode = [];
  const relationshipsCode = [];

  active.forEach((el, index) => {
    if (el.type === 'arrow' || el.type === 'line') return;
    const id = `el_${index}`;
    nodeMap.set(el.id, id);
    const name = sanitize(el.text || el.name || `Component ${index + 1}`);

    const lower = name.toLowerCase();
    if (lower.includes('user') || lower.includes('customer') || lower.includes('admin') || lower.includes('person')) {
      elementsCode.push(`    ${id} = person "${name}" "User of the system"`);
    } else if (el.type === 'cylinder' || lower.includes('db') || lower.includes('database') || lower.includes('redis') || lower.includes('sql')) {
      elementsCode.push(`    ${id} = container "${name}" "Stores relational/document data" "Database"`);
    } else if (el.type === 'frame') {
      elementsCode.push(`    ${id} = softwareSystem "${name}" "Software Boundary / Subsystem"`);
    } else {
      elementsCode.push(`    ${id} = component "${name}" "Application component / microservice" "React/Node"`);
    }
  });

  active.forEach(el => {
    if (el.type === 'arrow') {
      const fromId = el.startBinding?.elementId ? nodeMap.get(el.startBinding.elementId) : null;
      const toId = el.endBinding?.elementId ? nodeMap.get(el.endBinding.elementId) : null;
      const label = el.text ? sanitize(el.text) : 'Interacts with';
      if (fromId && toId) {
        relationshipsCode.push(`    ${fromId} -> ${toId} "${label}"`);
      }
    }
  });

  return [
    'workspace {',
    '  model {',
    ...elementsCode,
    ...relationshipsCode,
    '  }',
    '  views {',
    '    systemContext el_0 "SystemContext" {',
    '      include *',
    '      autoLayout',
    '    }',
    '  }',
    '}',
  ].join('\n');
}

/**
 * Generates an Architecture Decision Record (ADR) from selected canvas elements.
 * @param {Array<Object>} elements
 * @param {Object} options
 * @returns {string} Markdown with YAML frontmatter
 */
export function generateArchitectureDecisionRecord(elements = [], options = {}) {
  const active = elements.filter(el => !el.isDeleted && !el.isHidden);
  const now = new Date().toISOString().split('T')[0];
  const frames = active.filter(el => el.type === 'frame');
  const mainTitle = options.title || frames[0]?.name || active.find(el => el.text)?.text || 'Architectural System Evolution';
  const components = active.filter(el => el.type !== 'arrow' && el.type !== 'line').map(el => el.text || el.name).filter(Boolean);
  const connectors = active.filter(el => el.type === 'arrow').map(el => el.text).filter(Boolean);

  return `---
title: "ADR: ${mainTitle}"
date: ${now}
status: "Accepted"
deciders: ["Engineering Team", "Architecture Council"]
consulted: ["DevOps", "Security"]
informed: ["All Engineers"]
tags: ["architecture", "doodle-desk", "system-design"]
---

# ADR: ${mainTitle}

## Status
**Accepted** — ${now}

## Context & Problem Statement
The system requires an updated architectural topology to support scalable workload distribution, decoupled data pipelines, and clear subsystem boundaries. Current visual state was designed and exported directly from Doodle Desk.

### Analyzed Architectural Entities (${components.length})
${components.length > 0 ? components.map(c => `- **${c}**`).join('\n') : '- Core system runtime components'}

## Decision Drivers
- High availability and offline-first resiliency
- Clear separation of concerns between presentation and processing services
- Deterministic data flow across asynchronous communication boundaries
- Minimal architectural surface area and eliminated circular dependencies

## Considered Options
1. Monolithic coupled pipeline
2. **Decoupled Event-Driven Microservices (Chosen)**
3. Shared database integration

## Decision Outcome
Chosen option: **Decoupled Event-Driven Architecture** because it maximizes modularity, allows independent scaling of critical paths, and preserves verifiable isolation between sub-graphs.

### Key Interactions & Connectors
${connectors.length > 0 ? connectors.map(c => `- \`${c}\``).join('\n') : '- Direct asynchronous service messaging & RPC contracts'}

## Consequences
### Positive
- Component interfaces can evolve independently without breaking downstream consumers.
- Improved observability and simplified fault isolation.
- Fully compatible with offline simulation and formal verification tools in Doodle Desk.

### Negative / Trade-offs
- Increased operational monitoring requirements for distributed components.
- Event schema versioning discipline required.

---
*Generated by Doodle Desk Architecture Decision Engine*
`;
}

/**
 * Generates a Markdown cheat sheet of keyboard shortcuts.
 * @param {Object} customBindings
 * @returns {string} Markdown cheat sheet
 */
export function exportShortcutsToMarkdown(customBindings = {}) {
  const defaultShortcuts = [
    { category: 'General', name: 'Command Palette', shortcut: 'Ctrl + K' },
    { category: 'General', name: 'Search Canvas (CQL Query)', shortcut: 'Ctrl + Shift + F' },
    { category: 'General', name: 'Preferences', shortcut: 'Ctrl + ,' },
    { category: 'General', name: 'Toggle Library', shortcut: 'Shift + L' },
    { category: 'General', name: 'Presentation Mode', shortcut: 'Alt + P' },
    { category: 'Tools', name: 'Selection Tool', shortcut: 'V' },
    { category: 'Tools', name: 'Rectangle', shortcut: 'R' },
    { category: 'Tools', name: 'Diamond / Decision', shortcut: 'D' },
    { category: 'Tools', name: 'Ellipse', shortcut: 'O' },
    { category: 'Tools', name: 'Arrow Connector', shortcut: 'A' },
    { category: 'Tools', name: 'Frame / Screen', shortcut: 'F' },
    { category: 'Tools', name: 'Freehand Pen', shortcut: 'P' },
    { category: 'Tools', name: 'Text Label', shortcut: 'T' },
    { category: 'Tools', name: 'Eraser', shortcut: 'E' },
    { category: 'Architecture', name: 'Smart Auto-Layout', shortcut: 'Shift + A' },
    { category: 'Architecture', name: '3D Spatial Holo-Canvas', shortcut: 'Shift + 3' },
    { category: 'Architecture', name: 'AI Copilot Assistant', shortcut: 'Ctrl + I' },
    { category: 'Architecture', name: 'Formal Spec / TLA+ Verifier', shortcut: 'Shift + X' },
    { category: 'Architecture', name: 'Simulation Center', shortcut: 'Shift + S' },
  ];

  const lines = [
    '# ⌨️ Doodle Desk — Keyboard Shortcuts Cheat Sheet',
    '',
    '> **Tip:** Press `Ctrl+K` anytime to launch the Command Palette.',
    '',
    '| Category | Action | Shortcut |',
    '|---|---|---|',
  ];

  defaultShortcuts.forEach(s => {
    const key = customBindings[s.name] || s.shortcut;
    lines.push(`| **${s.category}** | ${s.name} | \`${key}\` |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('*Exported from Doodle Desk Desktop*');
  return lines.join('\n');
}

