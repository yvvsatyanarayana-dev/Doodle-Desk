/**
 * Autonomous Topology Beautifier & One-Click Layout Morphing Engine
 * Advanced topological ranking, force-directed physics, and smooth 60fps canvas morphing.
 */

import { generateId } from '../elements.js';

export const TOPOLOGY_MODES = {
  SUGIYAMA_HIERARCHICAL: 'sugiyama-hierarchical',
  FORCE_DIRECTED: 'force-directed',
  ORTHOGONAL_TIERS: 'orthogonal-tiers',
  RADIAL_MINDMAP: 'radial-mindmap',
  GRID_ORGANIZER: 'grid-organizer',
};

// ── Graph Extraction ──
export function buildGraphFromElements(elements) {
  const nodeMap = new Map();
  const edges = [];
  const nonNodes = [];

  for (const el of elements) {
    if (el.isDeleted || el.isHidden) continue;
    if (el.type === 'arrow' || el.type === 'line') {
      const fromId = el.startBinding?.elementId;
      const toId = el.endBinding?.elementId;
      if (fromId && toId && fromId !== toId) {
        edges.push({ id: el.id, from: fromId, to: toId, element: el });
      } else {
        nonNodes.push(el);
      }
    } else {
      nodeMap.set(el.id, {
        id: el.id,
        element: el,
        width: Math.max(80, Math.abs(el.width || 120)),
        height: Math.max(50, Math.abs(el.height || 80)),
        inDegree: 0,
        outDegree: 0,
        neighbors: [],
      });
    }
  }

  // Calculate degrees and neighbor relations
  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (fromNode && toNode) {
      fromNode.outDegree++;
      fromNode.neighbors.push(edge.to);
      toNode.inDegree++;
      toNode.neighbors.push(edge.from);
    }
  }

  return { nodes: Array.from(nodeMap.values()), nodeMap, edges, nonNodes };
}

// ── 1. Sugiyama Hierarchical DAG Layout ──
export function calculateSugiyamaLayout(graph, options = {}) {
  const { nodeMap, edges, nodes } = graph;
  if (nodes.length === 0) return new Map();

  const rankSeparation = options.rankSeparation || 120;
  const nodeSeparation = options.nodeSeparation || 80;

  // Step A: Layer Assignment (Longest Path / Rank)
  const ranks = new Map();
  const visited = new Set();

  // Find root nodes (inDegree === 0)
  const roots = nodes.filter(n => n.inDegree === 0);
  const queue = roots.length > 0 ? [...roots] : [nodes[0]];

  for (const root of queue) {
    ranks.set(root.id, 0);
  }

  // BFS / Topological longest path ranking
  let maxRank = 0;
  const adjList = new Map();
  for (const edge of edges) {
    if (!adjList.has(edge.from)) adjList.set(edge.from, []);
    adjList.get(edge.from).push(edge.to);
  }

  // Rank assignment with cycle detection fallback
  const processQueue = [...queue];
  let iterations = 0;
  while (processQueue.length > 0 && iterations < nodes.length * 3) {
    iterations++;
    const current = processQueue.shift();
    const currentRank = ranks.get(current.id) || 0;
    const targets = adjList.get(current.id) || [];

    for (const targetId of targets) {
      const targetNode = nodeMap.get(targetId);
      if (!targetNode) continue;
      const existingRank = ranks.get(targetId) || 0;
      const newRank = Math.max(existingRank, currentRank + 1);
      ranks.set(targetId, newRank);
      if (newRank > maxRank) maxRank = newRank;
      if (!visited.has(targetId)) {
        visited.add(targetId);
        processQueue.push(targetNode);
      }
    }
  }

  // Assign any unreached nodes
  for (const n of nodes) {
    if (!ranks.has(n.id)) {
      ranks.set(n.id, 0);
    }
  }

  // Step B: Group nodes by rank
  const rankBuckets = Array.from({ length: maxRank + 1 }, () => []);
  for (const n of nodes) {
    const r = Math.min(maxRank, ranks.get(n.id) || 0);
    rankBuckets[r].push(n);
  }

  // Step C: Barycenter Crossing Reduction (ordering within layers)
  for (let r = 1; r <= maxRank; r++) {
    const currentLayer = rankBuckets[r];
    const prevLayer = rankBuckets[r - 1];
    const prevPosMap = new Map(prevLayer.map((node, idx) => [node.id, idx]));

    // Calculate average parent position
    currentLayer.sort((a, b) => {
      const parentsA = edges.filter(e => e.to === a.id).map(e => prevPosMap.get(e.from) ?? 0);
      const parentsB = edges.filter(e => e.to === b.id).map(e => prevPosMap.get(e.from) ?? 0);
      const avgA = parentsA.length > 0 ? parentsA.reduce((s, v) => s + v, 0) / parentsA.length : 0;
      const avgB = parentsB.length > 0 ? parentsB.reduce((s, v) => s + v, 0) / parentsB.length : 0;
      return avgA - avgB;
    });
  }

  // Step D: Coordinate Assignment
  const targetPositions = new Map();
  // Find scene origin
  let minX = Infinity, minY = Infinity;
  for (const n of nodes) {
    if (n.element.x < minX) minX = n.element.x;
    if (n.element.y < minY) minY = n.element.y;
  }
  const originX = minX !== Infinity ? minX : 100;
  const originY = minY !== Infinity ? minY : 100;

  // Calculate max width per rank to balance horizontal alignment
  let currentY = originY;
  for (let r = 0; r <= maxRank; r++) {
    const layer = rankBuckets[r];
    if (layer.length === 0) continue;

    const layerTotalWidth = layer.reduce((acc, n) => acc + n.width, 0) + (layer.length - 1) * nodeSeparation;
    let currentX = originX - layerTotalWidth / 2;

    let maxHeightInLayer = 0;
    for (const n of layer) {
      targetPositions.set(n.id, { x: Math.round(currentX), y: Math.round(currentY) });
      currentX += n.width + nodeSeparation;
      if (n.height > maxHeightInLayer) maxHeightInLayer = n.height;
    }
    currentY += maxHeightInLayer + rankSeparation;
  }

  return targetPositions;
}

// ── 2. Force-Directed Physics Layout (Fruchterman-Reingold) ──
export function calculateForceDirectedLayout(graph, options = {}) {
  const { nodeMap, edges, nodes } = graph;
  if (nodes.length === 0) return new Map();

  const iterations = options.iterations || 80;
  const k = options.springLength || 180; // Ideal distance
  const repulsiveForce = options.repulsion || 8500;
  const damping = 0.88;

  // Initialize positions around bounding center
  let centerX = 0, centerY = 0;
  for (const n of nodes) {
    centerX += n.element.x;
    centerY += n.element.y;
  }
  centerX /= nodes.length;
  centerY /= nodes.length;

  const positions = new Map();
  const velocities = new Map();

  for (const n of nodes) {
    positions.set(n.id, { x: n.element.x, y: n.element.y });
    velocities.set(n.id, { vx: 0, vy: 0 });
  }

  // Physics simulation steps
  for (let step = 0; step < iterations; step++) {
    const temp = 1.0 - (step / iterations); // Simulated annealing temperature

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const idA = nodes[i].id;
        const idB = nodes[j].id;
        const posA = positions.get(idA);
        const posB = positions.get(idB);

        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distSq = Math.max(100, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);

        const force = repulsiveForce / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const velA = velocities.get(idA);
        const velB = velocities.get(idB);
        velA.vx += fx;
        velA.vy += fy;
        velB.vx -= fx;
        velB.vy -= fy;
      }
    }

    // Attraction along connected edges
    for (const edge of edges) {
      const posA = positions.get(edge.from);
      const posB = positions.get(edge.to);
      if (!posA || !posB) continue;

      const dx = posA.x - posB.x;
      const dy = posA.y - posB.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

      const springForce = (dist - k) * 0.05;
      const fx = (dx / dist) * springForce;
      const fy = (dy / dist) * springForce;

      const velA = velocities.get(edge.from);
      const velB = velocities.get(edge.to);
      velA.vx -= fx;
      velA.vy -= fy;
      velB.vx += fx;
      velB.vy += fy;
    }

    // Centering gravitational pull toward origin
    for (const n of nodes) {
      const pos = positions.get(n.id);
      const vel = velocities.get(n.id);
      const cdx = centerX - pos.x;
      const cdy = centerY - pos.y;
      vel.vx += cdx * 0.008;
      vel.vy += cdy * 0.008;

      // Apply velocities with temperature limiting
      const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
      const maxDisplacement = 40 * temp;
      if (speed > maxDisplacement) {
        vel.vx = (vel.vx / speed) * maxDisplacement;
        vel.vy = (vel.vy / speed) * maxDisplacement;
      }

      pos.x += vel.vx;
      pos.y += vel.vy;
      vel.vx *= damping;
      vel.vy *= damping;
    }
  }

  // Format final output rounded to integer coordinates
  const result = new Map();
  for (const [id, pos] of positions) {
    result.set(id, { x: Math.round(pos.x), y: Math.round(pos.y) });
  }
  return result;
}

// ── 3. Orthogonal Architecture Tiers Layout ──
export function calculateOrthogonalTiersLayout(graph, options = {}) {
  const { nodes, edges } = graph;
  if (nodes.length === 0) return new Map();

  const tierSpacingY = options.tierSpacing || 160;
  const nodeSpacingX = options.nodeSpacing || 90;

  // Classify into 4 architectural tiers:
  // Tier 0: Ingress, Client, CDN, Gateway
  // Tier 1: Microservices, Logic, Processors
  // Tier 2: Caching, Queues, Workers
  // Tier 3: Databases, Storage, Object Store
  const tiers = [[], [], [], []];

  for (const n of nodes) {
    const text = (n.element.text || n.element.name || '').toLowerCase();
    if (text.includes('client') || text.includes('user') || text.includes('gateway') || text.includes('cdn') || text.includes('ui') || text.includes('web') || text.includes('app')) {
      tiers[0].push(n);
    } else if (text.includes('db') || text.includes('database') || text.includes('sql') || text.includes('postgres') || text.includes('mongo') || text.includes('s3') || text.includes('storage')) {
      tiers[3].push(n);
    } else if (text.includes('cache') || text.includes('redis') || text.includes('queue') || text.includes('kafka') || text.includes('rabbit') || text.includes('worker')) {
      tiers[2].push(n);
    } else {
      tiers[1].push(n);
    }
  }

  // Fallback: If heuristic didn't distribute across tiers, use in/out degree
  const hasGoodSpread = tiers.filter(t => t.length > 0).length >= 2;
  if (!hasGoodSpread) {
    tiers[0].length = 0;
    tiers[1].length = 0;
    tiers[2].length = 0;
    tiers[3].length = 0;

    for (const n of nodes) {
      if (n.inDegree === 0) tiers[0].push(n);
      else if (n.outDegree === 0) tiers[3].push(n);
      else if (n.inDegree > n.outDegree) tiers[2].push(n);
      else tiers[1].push(n);
    }
  }

  // Anchor to current bounding box center
  let minX = Infinity, minY = Infinity;
  for (const n of nodes) {
    if (n.element.x < minX) minX = n.element.x;
    if (n.element.y < minY) minY = n.element.y;
  }
  const startX = minX !== Infinity ? minX : 100;
  let startY = minY !== Infinity ? minY : 100;

  const positions = new Map();
  for (let t = 0; t < 4; t++) {
    const tierNodes = tiers[t];
    if (tierNodes.length === 0) continue;

    const rowWidth = tierNodes.reduce((sum, n) => sum + n.width, 0) + (tierNodes.length - 1) * nodeSpacingX;
    let curX = startX - rowWidth / 2;
    let maxH = 0;

    for (const n of tierNodes) {
      positions.set(n.id, { x: Math.round(curX), y: Math.round(startY) });
      curX += n.width + nodeSpacingX;
      if (n.height > maxH) maxH = n.height;
    }
    startY += maxH + tierSpacingY;
  }

  return positions;
}

// ── 4. Radial Mind-Map Layout ──
export function calculateRadialMindmapLayout(graph, options = {}) {
  const { nodes, nodeMap } = graph;
  if (nodes.length === 0) return new Map();

  // Root node: Highest total degree or center of scene
  let root = nodes[0];
  let maxDegree = -1;
  for (const n of nodes) {
    const totalDeg = n.inDegree + n.outDegree;
    if (totalDeg > maxDegree) {
      maxDegree = totalDeg;
      root = n;
    }
  }

  const baseRadius = options.radius || 240;
  const positions = new Map();
  const rootX = root.element.x;
  const rootY = root.element.y;
  positions.set(root.id, { x: Math.round(rootX), y: Math.round(rootY) });

  const remaining = nodes.filter(n => n.id !== root.id);
  const angleStep = (Math.PI * 2) / Math.max(1, remaining.length);

  remaining.forEach((n, idx) => {
    const angle = idx * angleStep;
    // Vary radius slightly to avoid circular collision
    const dynamicRadius = baseRadius + (idx % 2 === 1 ? 50 : 0);
    const px = rootX + Math.cos(angle) * dynamicRadius;
    const py = rootY + Math.sin(angle) * dynamicRadius;
    positions.set(n.id, { x: Math.round(px), y: Math.round(py) });
  });

  return positions;
}

// ── 5. Master Layout Generator ──
export function computeTopologyPositions(elements, mode = TOPOLOGY_MODES.SUGIYAMA_HIERARCHICAL, options = {}) {
  const graph = buildGraphFromElements(elements);
  switch (mode) {
    case TOPOLOGY_MODES.FORCE_DIRECTED:
      return calculateForceDirectedLayout(graph, options);
    case TOPOLOGY_MODES.ORTHOGONAL_TIERS:
      return calculateOrthogonalTiersLayout(graph, options);
    case TOPOLOGY_MODES.RADIAL_MINDMAP:
      return calculateRadialMindmapLayout(graph, options);
    case TOPOLOGY_MODES.SUGIYAMA_HIERARCHICAL:
    default:
      return calculateSugiyamaLayout(graph, options);
  }
}

// ── 6. 60fps Layout Morphing Animator with Spring Physics ──
export function morphElementsWithSpring({
  elements,
  targetPositions,
  duration = 580,
  onProgress,
  onComplete,
}) {
  const startPositions = new Map();
  for (const el of elements) {
    if (targetPositions.has(el.id)) {
      startPositions.set(el.id, { x: el.x, y: el.y });
    }
  }

  const startTime = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(progress);

    const updatedElements = elements.map(el => {
      const start = startPositions.get(el.id);
      const target = targetPositions.get(el.id);
      if (!start || !target) return el;

      const curX = Math.round(start.x + (target.x - start.x) * eased);
      const curY = Math.round(start.y + (target.y - start.y) * eased);

      return {
        ...el,
        x: curX,
        y: curY,
      };
    });

    onProgress?.(updatedElements);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      // Final snap to exact target coordinates
      const finalElements = elements.map(el => {
        const target = targetPositions.get(el.id);
        if (!target) return el;
        return {
          ...el,
          x: target.x,
          y: target.y,
        };
      });
      onComplete?.(finalElements);
    }
  }

  requestAnimationFrame(frame);
}

// ── 7. Architecture Blueprints Library ──
export const ARCHITECTURE_BLUEPRINTS = [
  {
    id: 'aws-serverless',
    title: 'AWS Serverless Microservices',
    category: 'Cloud Infrastructure',
    description: 'CloudFront CDN, API Gateway, Lambda Functions, DynamoDB, S3, and Cognito Auth',
    accentColor: '#f59e0b',
    elements: [
      { id: 'bp_cf', type: 'rectangle', text: 'CloudFront CDN\n(Edge Cache)', x: 100, y: 100, width: 160, height: 75, strokeColor: '#f59e0b', backgroundColor: '#fef3c7', fillStyle: 'solid' },
      { id: 'bp_apigw', type: 'rectangle', text: 'API Gateway\n(REST & Auth)', x: 320, y: 100, width: 160, height: 75, strokeColor: '#f59e0b', backgroundColor: '#fef3c7', fillStyle: 'solid' },
      { id: 'bp_auth_fn', type: 'rectangle', text: 'Auth Service\n(Lambda Node.js)', x: 540, y: 30, width: 170, height: 75, strokeColor: '#6366f1', backgroundColor: '#e0e7ff', fillStyle: 'solid' },
      { id: 'bp_order_fn', type: 'rectangle', text: 'Order Processor\n(Lambda Python)', x: 540, y: 170, width: 170, height: 75, strokeColor: '#6366f1', backgroundColor: '#e0e7ff', fillStyle: 'solid' },
      { id: 'bp_ddb', type: 'cylinder', text: 'DynamoDB\n(Single-Table NoSQL)', x: 770, y: 100, width: 170, height: 90, strokeColor: '#059669', backgroundColor: '#d1fae5', fillStyle: 'solid' },
      { id: 'bp_s3', type: 'cylinder', text: 'S3 Bucket\n(Static Assets)', x: 770, y: 230, width: 170, height: 85, strokeColor: '#059669', backgroundColor: '#d1fae5', fillStyle: 'solid' },
      // Connectors
      { id: 'bp_a1', type: 'arrow', x: 260, y: 137, points: [[0, 0], [60, 0]], startBinding: { elementId: 'bp_cf' }, endBinding: { elementId: 'bp_apigw' }, strokeColor: '#f59e0b', strokeWidth: 2 },
      { id: 'bp_a2', type: 'arrow', x: 480, y: 120, points: [[0, 0], [60, -50]], startBinding: { elementId: 'bp_apigw' }, endBinding: { elementId: 'bp_auth_fn' }, strokeColor: '#6366f1', strokeWidth: 2 },
      { id: 'bp_a3', type: 'arrow', x: 480, y: 150, points: [[0, 0], [60, 50]], startBinding: { elementId: 'bp_apigw' }, endBinding: { elementId: 'bp_order_fn' }, strokeColor: '#6366f1', strokeWidth: 2 },
      { id: 'bp_a4', type: 'arrow', x: 710, y: 70, points: [[0, 0], [60, 60]], startBinding: { elementId: 'bp_auth_fn' }, endBinding: { elementId: 'bp_ddb' }, strokeColor: '#059669', strokeWidth: 2 },
      { id: 'bp_a5', type: 'arrow', x: 710, y: 210, points: [[0, 0], [60, 40]], startBinding: { elementId: 'bp_order_fn' }, endBinding: { elementId: 'bp_s3' }, strokeColor: '#059669', strokeWidth: 2 },
    ],
  },
  {
    id: 'k8s-mesh',
    title: 'Kubernetes Microservices Mesh',
    category: 'Container Orchestration',
    description: 'Ingress NGINX, Auth Pod, Order Service, Payment Gateway, Redis Cache, PostgreSQL',
    accentColor: '#3b82f6',
    elements: [
      { id: 'bp_k8s_ing', type: 'rectangle', text: 'NGINX Ingress\n(TLS & Path Routing)', x: 100, y: 140, width: 170, height: 80, strokeColor: '#3b82f6', backgroundColor: '#dbeafe', fillStyle: 'solid' },
      { id: 'bp_k8s_svc1', type: 'rectangle', text: 'User Pod (Go)\n(JWT Auth & Profiles)', x: 340, y: 60, width: 180, height: 75, strokeColor: '#8b5cf6', backgroundColor: '#ede9fe', fillStyle: 'solid' },
      { id: 'bp_k8s_svc2', type: 'rectangle', text: 'Checkout Pod\n(Spring Boot Java)', x: 340, y: 220, width: 180, height: 75, strokeColor: '#8b5cf6', backgroundColor: '#ede9fe', fillStyle: 'solid' },
      { id: 'bp_k8s_redis', type: 'rectangle', text: 'Redis Cluster\n(Session & Rate Limiter)', x: 590, y: 60, width: 180, height: 75, strokeColor: '#ef4444', backgroundColor: '#fee2e2', fillStyle: 'solid' },
      { id: 'bp_k8s_pg', type: 'cylinder', text: 'PostgreSQL Primary\n(ACID Relational DB)', x: 590, y: 220, width: 180, height: 85, strokeColor: '#0284c7', backgroundColor: '#e0f2fe', fillStyle: 'solid' },
      // Connectors
      { id: 'bp_ka1', type: 'arrow', x: 270, y: 160, points: [[0, 0], [70, -60]], startBinding: { elementId: 'bp_k8s_ing' }, endBinding: { elementId: 'bp_k8s_svc1' }, strokeColor: '#3b82f6', strokeWidth: 2 },
      { id: 'bp_ka2', type: 'arrow', x: 270, y: 190, points: [[0, 0], [70, 50]], startBinding: { elementId: 'bp_k8s_ing' }, endBinding: { elementId: 'bp_k8s_svc2' }, strokeColor: '#3b82f6', strokeWidth: 2 },
      { id: 'bp_ka3', type: 'arrow', x: 520, y: 97, points: [[0, 0], [70, 0]], startBinding: { elementId: 'bp_k8s_svc1' }, endBinding: { elementId: 'bp_k8s_redis' }, strokeColor: '#ef4444', strokeWidth: 2 },
      { id: 'bp_ka4', type: 'arrow', x: 520, y: 257, points: [[0, 0], [70, 0]], startBinding: { elementId: 'bp_k8s_svc2' }, endBinding: { elementId: 'bp_k8s_pg' }, strokeColor: '#0284c7', strokeWidth: 2 },
    ],
  },
  {
    id: 'modern-rag-pipeline',
    title: 'Modern AI / LLM RAG Pipeline',
    category: 'Artificial Intelligence',
    description: 'User Query, Guardrails, Vector Embeddings, Pinecone DB, LLM Agent, Semantic Cache',
    accentColor: '#10b981',
    elements: [
      { id: 'bp_rag_q', type: 'rectangle', text: 'User Query\n(Prompt & Context)', x: 100, y: 120, width: 160, height: 75, strokeColor: '#10b981', backgroundColor: '#d1fae5', fillStyle: 'solid' },
      { id: 'bp_rag_emb', type: 'rectangle', text: 'Embedding Model\n(text-embedding-3-large)', x: 320, y: 120, width: 180, height: 75, strokeColor: '#10b981', backgroundColor: '#d1fae5', fillStyle: 'solid' },
      { id: 'bp_rag_vdb', type: 'cylinder', text: 'Vector Database\n(Pinecone / Qdrant)', x: 560, y: 50, width: 180, height: 85, strokeColor: '#6366f1', backgroundColor: '#e0e7ff', fillStyle: 'solid' },
      { id: 'bp_rag_llm', type: 'rectangle', text: 'LLM Reasoning Core\n(Claude 3.7 / GPT-4o)', x: 560, y: 200, width: 180, height: 80, strokeColor: '#ec4899', backgroundColor: '#fce7f3', fillStyle: 'solid' },
      { id: 'bp_rag_out', type: 'rectangle', text: 'Structured Answer\n(Stream Response + Citations)', x: 800, y: 130, width: 180, height: 75, strokeColor: '#059669', backgroundColor: '#ecfdf5', fillStyle: 'solid' },
      // Connectors
      { id: 'bp_ra1', type: 'arrow', x: 260, y: 157, points: [[0, 0], [60, 0]], startBinding: { elementId: 'bp_rag_q' }, endBinding: { elementId: 'bp_rag_emb' }, strokeColor: '#10b981', strokeWidth: 2 },
      { id: 'bp_ra2', type: 'arrow', x: 500, y: 140, points: [[0, 0], [60, -50]], startBinding: { elementId: 'bp_rag_emb' }, endBinding: { elementId: 'bp_rag_vdb' }, strokeColor: '#6366f1', strokeWidth: 2 },
      { id: 'bp_ra3', type: 'arrow', x: 650, y: 135, points: [[0, 0], [0, 65]], startBinding: { elementId: 'bp_rag_vdb' }, endBinding: { elementId: 'bp_rag_llm' }, strokeColor: '#6366f1', strokeWidth: 2 },
      { id: 'bp_ra4', type: 'arrow', x: 740, y: 230, points: [[0, 0], [60, -60]], startBinding: { elementId: 'bp_rag_llm' }, endBinding: { elementId: 'bp_rag_out' }, strokeColor: '#ec4899', strokeWidth: 2 },
    ],
  },
];

// Helper to instantiate blueprint elements with unique fresh IDs and position offset
export function instantiateBlueprint(blueprint, spawnX = 200, spawnY = 200) {
  const idMap = new Map();
  for (const el of blueprint.elements) {
    idMap.set(el.id, generateId());
  }

  // Calculate base offset
  let minX = Infinity, minY = Infinity;
  for (const el of blueprint.elements) {
    if (el.x < minX) minX = el.x;
    if (el.y < minY) minY = el.y;
  }

  return blueprint.elements.map(el => {
    const newId = idMap.get(el.id);
    const offsetX = el.x - minX;
    const offsetY = el.y - minY;

    const instantiated = {
      ...el,
      id: newId,
      x: spawnX + offsetX,
      y: spawnY + offsetY,
      version: 1,
      isDeleted: false,
    };

    if (el.startBinding?.elementId) {
      instantiated.startBinding = {
        ...el.startBinding,
        elementId: idMap.get(el.startBinding.elementId) || el.startBinding.elementId,
      };
    }
    if (el.endBinding?.elementId) {
      instantiated.endBinding = {
        ...el.endBinding,
        elementId: idMap.get(el.endBinding.elementId) || el.endBinding.elementId,
      };
    }

    return instantiated;
  });
}
