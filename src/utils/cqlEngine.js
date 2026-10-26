/**
 * cqlEngine.js
 * Canvas Query Language (CQL) & Knowledge Graph Brain Engine.
 * 100% Offline, Structured Visual Query Parser and Evaluator.
 */

/**
 * Normalizes an element into a unified Knowledge Entity model.
 */
export function toEntity(el, allElements = []) {
  if (!el) return null;
  const id = el.id || '';
  const type = el.type || 'rectangle';
  const name = el.name || el.text || `${type}-${id.slice(0, 4)}`;
  const status = el.customData?.status || (el.isLocked ? 'locked' : 'open');
  const owner = el.customData?.owner || el.owner || 'unassigned';
  const tags = Array.isArray(el.customData?.tags)
    ? el.customData.tags
    : typeof el.tags === 'string'
    ? el.tags.split(',').map(t => t.trim().toLowerCase())
    : [];

  // Determine connections (arrows starting or ending at this element)
  const incoming = [];
  const outgoing = [];

  allElements.forEach(other => {
    if (other && (other.type === 'arrow' || other.type === 'line')) {
      if (other.startBinding?.elementId === id) {
        outgoing.push({ arrowId: other.id, targetId: other.endBinding?.elementId, label: other.text || '' });
      }
      if (other.endBinding?.elementId === id) {
        incoming.push({ arrowId: other.id, sourceId: other.startBinding?.elementId, label: other.text || '' });
      }
    }
  });

  return {
    id,
    type,
    name,
    rawText: el.text || '',
    status,
    owner,
    tags,
    frameId: el.frameId || null,
    inDegree: incoming.length,
    outDegree: outgoing.length,
    degree: incoming.length + outgoing.length,
    incoming,
    outgoing,
    element: el,
  };
}

/**
 * Extracts full Knowledge Entity Model from canvas elements.
 */
export function extractEntityGraph(elements = []) {
  const active = elements.filter(el => el && !el.isDeleted && !el.isHidden);
  const entities = active.map(el => toEntity(el, active)).filter(Boolean);
  const entityMap = new Map(entities.map(e => [e.id, e]));

  return {
    entities,
    entityMap,
    count: entities.length,
    frames: entities.filter(e => e.type === 'frame'),
    components: entities.filter(e => e.type !== 'arrow' && e.type !== 'line' && e.type !== 'frame'),
    connectors: entities.filter(e => e.type === 'arrow' || e.type === 'line'),
  };
}

/**
 * Parses and executes a Canvas Query Language (CQL) query against canvas elements.
 * 
 * Syntax examples:
 * - SHOW frames
 * - SHOW components WHERE type="cylinder"
 * - SHOW nodes WHERE status="open"
 * - SHOW components CONNECTED_TO "auth"
 * - FIND database
 * - COUNT elements WHERE type="frame"
 */
export function parseAndExecuteCQL(elements = [], queryString = '') {
  const query = (queryString || '').trim();
  if (!query) {
    return {
      query: '',
      matchedElements: [],
      matchedIds: [],
      count: 0,
      message: 'Enter a CQL query (e.g. SHOW frames, FIND auth, WHERE type="database")',
    };
  }

  const { entities } = extractEntityGraph(elements);
  let targetEntities = [...entities];

  const lower = query.toLowerCase();

  // Mode 1: Quick keyword FIND
  if (lower.startsWith('find ')) {
    const term = lower.slice(5).trim().replace(/^["']|["']$/g, '');
    const matched = targetEntities.filter(e => {
      const matchName = e.name.toLowerCase().includes(term);
      const matchType = e.type.toLowerCase().includes(term);
      const matchOwner = e.owner.toLowerCase().includes(term);
      const matchTag = e.tags.some(t => t.includes(term));
      return matchName || matchType || matchOwner || matchTag;
    });

    return {
      query,
      matchedElements: matched.map(m => m.element),
      matchedIds: matched.map(m => m.id),
      count: matched.length,
      message: `Found ${matched.length} element${matched.length === 1 ? '' : 's'} matching "${term}"`,
    };
  }

  // Mode 2: Structured CQL (SHOW / SELECT / COUNT)
  const isCount = lower.startsWith('count ');
  let workingQuery = lower;
  if (workingQuery.startsWith('count ')) {
    workingQuery = workingQuery.replace(/^count\s+/, 'show ');
  } else if (!workingQuery.startsWith('show ')) {
    workingQuery = 'show ' + workingQuery;
  }

  // Extract base target (frames, components, connectors, nodes, all)
  const parts = workingQuery.split(/\s+/);
  const targetCategory = parts[1] || 'all';

  if (targetCategory === 'frames') {
    targetEntities = targetEntities.filter(e => e.type === 'frame');
  } else if (targetCategory === 'connectors' || targetCategory === 'arrows') {
    targetEntities = targetEntities.filter(e => e.type === 'arrow' || e.type === 'line');
  } else if (targetCategory === 'components' || targetCategory === 'nodes') {
    targetEntities = targetEntities.filter(e => e.type !== 'arrow' && e.type !== 'line');
  }

  // Check WHERE clause
  const whereIndex = lower.indexOf('where ');
  const connectedIndex = lower.indexOf('connected_to ');

  if (whereIndex !== -1) {
    const whereEnd = connectedIndex !== -1 ? connectedIndex : query.length;
    const whereClause = query.substring(whereIndex + 6, whereEnd).trim();

    // Split multiple conditions (AND)
    const conditions = whereClause.split(/\s+and\s+/i);

    conditions.forEach(cond => {
      const trimmed = cond.trim();
      // key="val" or key='val' or key=val
      const eqMatch = trimmed.match(/^([a-zA-Z_]+)\s*=\s*["']?([^"']+)["']?$/);
      // key CONTAINS "val"
      const containsMatch = trimmed.match(/^([a-zA-Z_]+)\s+contains\s+["']?([^"']+)["']?$/i);

      if (eqMatch) {
        const [, field, val] = eqMatch;
        const key = field.toLowerCase();
        const value = val.toLowerCase();

        targetEntities = targetEntities.filter(e => {
          if (key === 'type') return e.type.toLowerCase() === value;
          if (key === 'status') return e.status.toLowerCase() === value;
          if (key === 'owner') return e.owner.toLowerCase() === value;
          if (key === 'tag') return e.tags.includes(value);
          if (key === 'name') return e.name.toLowerCase() === value;
          return false;
        });
      } else if (containsMatch) {
        const [, field, val] = containsMatch;
        const key = field.toLowerCase();
        const value = val.toLowerCase();

        targetEntities = targetEntities.filter(e => {
          if (key === 'name') return e.name.toLowerCase().includes(value);
          if (key === 'text') return e.rawText.toLowerCase().includes(value);
          if (key === 'owner') return e.owner.toLowerCase().includes(value);
          return false;
        });
      }
    });
  }

  // Check CONNECTED_TO clause
  if (connectedIndex !== -1) {
    const targetTerm = query.substring(connectedIndex + 13).trim().replace(/^["']|["']$/g, '').toLowerCase();

    // Find the target nodes first
    const targetNodes = entities.filter(e => e.name.toLowerCase().includes(targetTerm));
    const targetNodeIds = new Set(targetNodes.map(t => t.id));

    targetEntities = targetEntities.filter(e => {
      // is this node connected to any targetNode?
      const connectsOut = e.outgoing.some(out => targetNodeIds.has(out.targetId));
      const connectsIn = e.incoming.some(inc => targetNodeIds.has(inc.sourceId));
      return connectsOut || connectsIn;
    });
  }

  const matched = targetEntities;
  const countMsg = isCount
    ? `Count result: ${matched.length} element${matched.length === 1 ? '' : 's'}`
    : `Found ${matched.length} element${matched.length === 1 ? '' : 's'}`;

  return {
    query,
    matchedElements: matched.map(m => m.element),
    matchedIds: matched.map(m => m.id),
    count: matched.length,
    message: countMsg,
  };
}

/**
 * Architectural Rules Engine for Knowledge Graph validation.
 */
export function evaluateKnowledgeRules(elements = []) {
  const { entities, entityMap } = extractEntityGraph(elements);
  const issues = [];

  // Rule 1: Decision frames must have owner
  const decisionFrames = entities.filter(e => e.type === 'frame' && /decision/i.test(e.name));
  decisionFrames.forEach(f => {
    if (f.owner === 'unassigned') {
      issues.push({
        id: `rule-owner-${f.id}`,
        severity: 'warning',
        elementId: f.id,
        rule: 'Decision Ownership',
        message: `Decision frame "${f.name}" has no assigned owner.`,
      });
    }
  });

  // Rule 2: Unlabelled arrows
  const arrows = entities.filter(e => e.type === 'arrow');
  arrows.forEach(a => {
    if (!a.rawText.trim()) {
      const src = entityMap.get(a.element.startBinding?.elementId);
      const dst = entityMap.get(a.element.endBinding?.elementId);
      const label = src && dst ? `from "${src.name}" to "${dst.name}"` : 'in diagram';
      issues.push({
        id: `rule-arrow-label-${a.id}`,
        severity: 'info',
        elementId: a.id,
        rule: 'Explicit Interaction Semantics',
        message: `Arrow ${label} has no communication protocol or payload label.`,
      });
    }
  });

  // Rule 3: Orphan components
  const components = entities.filter(e => e.type !== 'arrow' && e.type !== 'line' && e.type !== 'frame');
  components.forEach(c => {
    if (c.degree === 0) {
      issues.push({
        id: `rule-orphan-${c.id}`,
        severity: 'warning',
        elementId: c.id,
        rule: 'Isolated Component',
        message: `Component "${c.name}" has 0 incoming or outgoing connections.`,
      });
    }
  });

  // Rule 4: Critical Single Point of Failure (High Degree Hub)
  components.forEach(c => {
    if (c.degree >= 5) {
      issues.push({
        id: `rule-spof-${c.id}`,
        severity: 'critical',
        elementId: c.id,
        rule: 'Architectural SPOF Risk',
        message: `Component "${c.name}" mediates ${c.degree} connections. A failure here threatens global availability.`,
      });
    }
  });

  return {
    totalRulesEvaluated: 4,
    issuesCount: issues.length,
    issues,
  };
}
