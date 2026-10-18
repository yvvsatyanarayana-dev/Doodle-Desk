/**
 * 2.5D Isometric 3D Architecture View Engine (100% Offline)
 * Calculates multi-tier layer elevations, 3D camera projections,
 * auto-stratification of system architecture diagrams, and vertical 3D risers.
 */

export const ISOMETRIC_CAMERA_PRESETS = {
  isometric: {
    id: 'isometric',
    name: 'True Isometric',
    pitch: 60,
    yaw: 45,
    perspective: 1400,
    elevationSpacing: 80,
  },
  architecture: {
    id: 'architecture',
    name: 'Multi-Tier Stack',
    pitch: 55,
    yaw: 30,
    perspective: 1200,
    elevationSpacing: 110,
  },
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic Angle',
    pitch: 42,
    yaw: 22,
    perspective: 1000,
    elevationSpacing: 130,
  },
  side: {
    id: 'side',
    name: 'Side Profile',
    pitch: 75,
    yaw: 80,
    perspective: 1600,
    elevationSpacing: 95,
  },
  top: {
    id: 'top',
    name: 'Top-Down 2D',
    pitch: 0,
    yaw: 0,
    perspective: 0,
    elevationSpacing: 0,
  },
};

export const ARCHITECTURE_TIERS = [
  { id: 0, name: 'Data & Storage', subtitle: 'Databases, S3, Caches, Event Logs', color: '#10b981', defaultZ: 0, order: 0 },
  { id: 1, name: 'Services & Compute', subtitle: 'Microservices, Workers, Logic', color: '#06b6d4', defaultZ: 60, order: 1 },
  { id: 2, name: 'API & Gateway', subtitle: 'Ingress, GraphQL, Auth, Load Balancers', color: '#6366f1', defaultZ: 120, order: 2 },
  { id: 3, name: 'Client & UI', subtitle: 'Web Apps, Mobile, Desktop, CDN', color: '#ec4899', defaultZ: 180, order: 3 },
];

export const LAYER_COLOR_PRESETS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
];

export const ARCHITECTURE_PRESET_TEMPLATES = {
  cloud_4tier: {
    id: 'cloud_4tier',
    name: 'Cloud Native (4 Tiers)',
    description: 'Client UI → API Gateway → Services & Logic → Data & Storage',
    layers: [
      { id: 'layer_0', name: 'Data & Storage', subtitle: 'Databases, S3, Caches, Event Logs', color: '#10b981', order: 0 },
      { id: 'layer_1', name: 'Services & Compute', subtitle: 'Microservices, Workers, Logic', color: '#06b6d4', order: 1 },
      { id: 'layer_2', name: 'API & Gateway', subtitle: 'Ingress, GraphQL, Auth, Load Balancers', color: '#6366f1', order: 2 },
      { id: 'layer_3', name: 'Client & UI', subtitle: 'Web Apps, Mobile, Desktop, CDN', color: '#ec4899', order: 3 },
    ],
  },
  modern_ai_5tier: {
    id: 'modern_ai_5tier',
    name: 'AI & LLM Architecture (5 Tiers)',
    description: 'UI → Gateway → Agent Orchestrator → Model Inference → Vector DB',
    layers: [
      { id: 'layer_0', name: 'Vector DB & Storage', subtitle: 'Pinecone, Qdrant, Chroma, S3', color: '#10b981', order: 0 },
      { id: 'layer_1', name: 'Model & Inference', subtitle: 'LLM Cluster, GPU Workers, Embeddings', color: '#8b5cf6', order: 1 },
      { id: 'layer_2', name: 'Agent Orchestration', subtitle: 'LangChain, Semantic Kernel, Tools', color: '#06b6d4', order: 2 },
      { id: 'layer_3', name: 'API & Guardrails', subtitle: 'Ingress, Rate Limiter, Safety Filters', color: '#6366f1', order: 3 },
      { id: 'layer_4', name: 'User Client & Chat UI', subtitle: 'Chatbot, Next.js, Web & Mobile', color: '#f43f5e', order: 4 },
    ],
  },
  event_driven_6tier: {
    id: 'event_driven_6tier',
    name: 'Event-Driven Mesh (6 Tiers)',
    description: 'Clients → Edge → Event Stream → Consumers → Caches → Primary Storage',
    layers: [
      { id: 'layer_0', name: 'Cold & Lakehouse', subtitle: 'Snowflake, BigQuery, Parquet, S3', color: '#059669', order: 0 },
      { id: 'layer_1', name: 'Operational DBs', subtitle: 'PostgreSQL, DynamoDB, MongoDB', color: '#10b981', order: 1 },
      { id: 'layer_2', name: 'Consumers & Services', subtitle: 'Microservices, Lambda, Flink Jobs', color: '#0ea5e9', order: 2 },
      { id: 'layer_3', name: 'Event Bus & Kafka', subtitle: 'Kafka, RabbitMQ, EventBridge', color: '#f59e0b', order: 3 },
      { id: 'layer_4', name: 'API Edge & Auth', subtitle: 'Kong, Envoy, Cloudflare Workers', color: '#6366f1', order: 4 },
      { id: 'layer_5', name: 'Client Presentation', subtitle: 'React, Vue, iOS, Android', color: '#ec4899', order: 5 },
    ],
  },
  classic_3tier: {
    id: 'classic_3tier',
    name: 'Classic Web (3 Tiers)',
    description: 'Presentation → Business Logic → Database Layer',
    layers: [
      { id: 'layer_0', name: 'Database Tier', subtitle: 'PostgreSQL, MySQL, SQL Server', color: '#10b981', order: 0 },
      { id: 'layer_1', name: 'Application Server', subtitle: 'Node.js, Python, Go, Java API', color: '#6366f1', order: 1 },
      { id: 'layer_2', name: 'Presentation Tier', subtitle: 'React, Tailwind, HTML5 UI', color: '#ec4899', order: 2 },
    ],
  },
};

export function normalizeLayer(l, idx = 0) {
  if (!l || typeof l !== 'object') {
    return {
      id: `layer_${idx}`,
      name: `Layer ${idx}`,
      subtitle: 'Custom architectural layer',
      color: '#6366f1',
      order: idx,
      visible: true,
    };
  }
  return {
    ...l,
    id: l.id || `layer_${idx}`,
    name: l.name || `Layer ${idx}`,
    subtitle: l.subtitle || '',
    color: l.color || '#6366f1',
    order: typeof l.order === 'number' && !Number.isNaN(l.order) ? l.order : (typeof l.id === 'number' ? l.id : idx),
    visible: l.visible !== false,
  };
}

export function sanitizeLayers(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      { id: 'layer_0', name: 'Data & Storage', subtitle: 'Databases, S3, Caches, Event Logs', color: '#10b981', order: 0, visible: true },
      { id: 'layer_1', name: 'Services & Compute', subtitle: 'Microservices, Workers, Logic', color: '#06b6d4', order: 1, visible: true },
      { id: 'layer_2', name: 'API & Gateway', subtitle: 'Ingress, GraphQL, Auth, Load Balancers', color: '#6366f1', order: 2, visible: true },
      { id: 'layer_3', name: 'Client & UI', subtitle: 'Web Apps, Mobile, Desktop, CDN', color: '#ec4899', order: 3, visible: true },
    ];
  }
  return raw
    .filter((item) => Boolean(item) && typeof item === 'object')
    .map((item, idx) => normalizeLayer(item, idx));
}

export function createCustomLayer(name = 'New Layer', color = '#06b6d4', order = 0) {
  return {
    id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: (name || '').trim() || 'New Layer',
    subtitle: 'Custom architectural layer',
    color: color || '#06b6d4',
    order: typeof order === 'number' && !Number.isNaN(order) ? order : 0,
    visible: true,
  };
}

export function reorderLayers(layers, fromIndex, toIndex) {
  const safe = sanitizeLayers(layers);
  const clampedTo = Math.max(0, Math.min(safe.length - 1, toIndex));
  const result = [...safe];
  const [removed] = result.splice(fromIndex, 1);
  if (removed) {
    result.splice(clampedTo, 0, removed);
  }
  return result.map((layer, idx) => ({
    ...layer,
    order: idx,
  }));
}

export const DEMO_ARCHITECTURE_ELEMENTS = [
  // Tier 3: Client & UI Layer
  {
    id: 'demo_web_app',
    type: 'rectangle',
    x: 180,
    y: 60,
    width: 140,
    height: 60,
    backgroundColor: '#f43f5e',
    strokeColor: '#fda4af',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'React Web Client',
    fontSize: 14,
    elevationTier: 3,
  },
  {
    id: 'demo_mobile_app',
    type: 'rectangle',
    x: 360,
    y: 60,
    width: 140,
    height: 60,
    backgroundColor: '#ec4899',
    strokeColor: '#fbcfe8',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'iOS / Android App',
    fontSize: 14,
    elevationTier: 3,
  },
  // Tier 2: API Gateway Layer
  {
    id: 'demo_api_gateway',
    type: 'rectangle',
    x: 270,
    y: 190,
    width: 160,
    height: 64,
    backgroundColor: '#6366f1',
    strokeColor: '#818cf8',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'API Gateway & Auth',
    fontSize: 14,
    elevationTier: 2,
  },
  // Tier 1: Microservices Layer
  {
    id: 'demo_order_service',
    type: 'rectangle',
    x: 160,
    y: 330,
    width: 150,
    height: 60,
    backgroundColor: '#06b6d4',
    strokeColor: '#67e8f9',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'Order Microservice',
    fontSize: 14,
    elevationTier: 1,
  },
  {
    id: 'demo_user_service',
    type: 'rectangle',
    x: 370,
    y: 330,
    width: 150,
    height: 60,
    backgroundColor: '#0ea5e9',
    strokeColor: '#7dd3fc',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'User & IAM Service',
    fontSize: 14,
    elevationTier: 1,
  },
  // Tier 0: Database & Storage Layer
  {
    id: 'demo_primary_db',
    type: 'rectangle',
    x: 190,
    y: 470,
    width: 140,
    height: 64,
    backgroundColor: '#10b981',
    strokeColor: '#6ee7b7',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'PostgreSQL Primary',
    fontSize: 14,
    elevationTier: 0,
  },
  {
    id: 'demo_redis_cache',
    type: 'rectangle',
    x: 370,
    y: 470,
    width: 140,
    height: 64,
    backgroundColor: '#059669',
    strokeColor: '#34d399',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text: 'Redis Cluster Cache',
    fontSize: 14,
    elevationTier: 0,
  },
  // Cross-Tier Connector Arrows
  {
    id: 'arrow_client_to_api',
    type: 'arrow',
    startBinding: { elementId: 'demo_web_app' },
    endBinding: { elementId: 'demo_api_gateway' },
    strokeColor: '#fda4af',
    strokeWidth: 2,
  },
  {
    id: 'arrow_mobile_to_api',
    type: 'arrow',
    startBinding: { elementId: 'demo_mobile_app' },
    endBinding: { elementId: 'demo_api_gateway' },
    strokeColor: '#fbcfe8',
    strokeWidth: 2,
  },
  {
    id: 'arrow_api_to_order',
    type: 'arrow',
    startBinding: { elementId: 'demo_api_gateway' },
    endBinding: { elementId: 'demo_order_service' },
    strokeColor: '#818cf8',
    strokeWidth: 2,
  },
  {
    id: 'arrow_api_to_user',
    type: 'arrow',
    startBinding: { elementId: 'demo_api_gateway' },
    endBinding: { elementId: 'demo_user_service' },
    strokeColor: '#818cf8',
    strokeWidth: 2,
  },
  {
    id: 'arrow_order_to_db',
    type: 'arrow',
    startBinding: { elementId: 'demo_order_service' },
    endBinding: { elementId: 'demo_primary_db' },
    strokeColor: '#67e8f9',
    strokeWidth: 2,
  },
  {
    id: 'arrow_user_to_cache',
    type: 'arrow',
    startBinding: { elementId: 'demo_user_service' },
    endBinding: { elementId: 'demo_redis_cache' },
    strokeColor: '#7dd3fc',
    strokeWidth: 2,
  },
];

export function createArchitectureNode(tierId = 1, customName = '', index = 0, layers = null) {
  const activeLayers = Array.isArray(layers) && layers.length > 0 ? layers : ARCHITECTURE_TIERS;
  const layer =
    activeLayers.find((l) => l.id === tierId || l.order === tierId) ||
    activeLayers[tierId] ||
    activeLayers[0] || { color: '#06b6d4', name: 'Node', order: 1 };

  const defaultNames = {
    3: 'Frontend Component',
    2: 'API Gateway Route',
    1: 'Microservice Worker',
    0: 'Database Table / Cache',
  };

  const text = customName || (typeof tierId === 'number' && defaultNames[tierId]) || `${layer.name || 'Component'} Node`;
  const order = typeof layer.order === 'number' ? layer.order : (typeof tierId === 'number' ? tierId : 1);
  const baseX = 180 + (index % 4) * 160;
  const baseY = Math.max(60, 480 - order * 120);

  return {
    id: `arch_node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'rectangle',
    x: baseX,
    y: baseY,
    width: 140,
    height: 60,
    backgroundColor: layer.color || '#6366f1',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    fillStyle: 'solid',
    roughness: 0,
    text,
    fontSize: 13,
    elevationTier: order,
    layerId: layer.id,
    isDeleted: false,
    version: 1,
  };
}

/**
 * Calculates common bounding box of elements for centering in 3D viewport.
 */
export function calculateSceneBounds(elements) {
  const visible = elements.filter((el) => !el.isDeleted && !el.isHidden);
  if (visible.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600, centerX: 400, centerY: 300 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of visible) {
    const x = el.x || 0;
    const y = el.y || 0;
    const w = el.width || 40;
    const h = el.height || 40;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  const width = Math.max(100, maxX - minX);
  const height = Math.max(100, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Auto-stratifies architecture elements into tiered elevation layers.
 * Recognizes frames (e.g. "Frontend", "API", "Database"), or uses Y-position bands.
 * Dynamically supports user-defined custom layers.
 */
export function stratifyElementsIntoTiers(elements = [], customTierMap = {}, customLayers = null) {
  const visible = (elements || []).filter((el) => el && !el.isDeleted && !el.isHidden);
  const bounds = calculateSceneBounds(visible);

  const tierAssignments = new Map();
  const rawLayers = Array.isArray(customLayers) && customLayers.length > 0 ? customLayers : ARCHITECTURE_TIERS;
  const validLayers = (rawLayers || [])
    .filter((l) => l && typeof l === 'object')
    .map((l, idx) => ({
      ...l,
      id: l.id ?? `layer_${idx}`,
      name: l.name ?? `Layer ${idx}`,
      color: l.color ?? '#6366f1',
      order: typeof l.order === 'number' && !Number.isNaN(l.order) ? l.order : (typeof l.id === 'number' ? l.id : idx),
    }));

  const sortedLayers = (validLayers.length > 0 ? validLayers : ARCHITECTURE_TIERS).sort(
    (a, b) => ((a && a.order) ?? 0) - ((b && b.order) ?? 0)
  );
  const maxOrder = sortedLayers.length > 0 ? Math.max(...sortedLayers.map((l) => (l && l.order) ?? 0), 0) : 3;

  // Keyword rules for intelligent auto-detection
  const keywordTierMatch = (str = '') => {
    const s = String(str || '').toLowerCase();

    // Check custom layer names first
    for (const l of sortedLayers) {
      if (!l) continue;
      const lName = String(l.name || '').toLowerCase();
      const tokens = lName.split(/[\s,&/]+/).filter((t) => t.length > 2);
      for (const token of tokens) {
        if (s.includes(token)) {
          return l.order ?? 0;
        }
      }
    }

    // Fallback standard cloud keywords
    if (s.includes('db') || s.includes('database') || s.includes('storage') || s.includes('cache') || s.includes('redis') || s.includes('sql') || s.includes('s3') || s.includes('postgres')) {
      return sortedLayers[0]?.order ?? 0;
    }
    if (s.includes('ui') || s.includes('client') || s.includes('frontend') || s.includes('app') || s.includes('web') || s.includes('mobile')) {
      return sortedLayers[sortedLayers.length - 1]?.order ?? maxOrder;
    }
    if (s.includes('service') || s.includes('server') || s.includes('worker') || s.includes('backend') || s.includes('compute') || s.includes('queue')) {
      const idx = Math.min(sortedLayers.length - 1, Math.max(0, Math.floor(sortedLayers.length * 0.35)));
      return sortedLayers[idx]?.order ?? 1;
    }
    if (s.includes('api') || s.includes('gateway') || s.includes('auth') || s.includes('router') || s.includes('ingress')) {
      const idx = Math.min(sortedLayers.length - 1, Math.max(0, Math.floor(sortedLayers.length * 0.65)));
      return sortedLayers[idx]?.order ?? 2;
    }
    return null;
  };

  for (const el of visible) {
    if (!el || !el.id) continue;

    // 1. Custom user override
    if (customTierMap && customTierMap[el.id] !== undefined) {
      tierAssignments.set(el.id, customTierMap[el.id]);
      continue;
    }

    // 2. Element property elevation if previously stamped / saved
    if (typeof el.elevationTier === 'number' && !Number.isNaN(el.elevationTier)) {
      tierAssignments.set(el.id, el.elevationTier);
      continue;
    }

    // 3. Keyword match on text / title / frame name
    const textToScan = [el.text, el.name, el.customData?.title].filter(Boolean).join(' ');
    const matchedKeywordTier = keywordTierMatch(textToScan);
    if (matchedKeywordTier !== null) {
      tierAssignments.set(el.id, matchedKeywordTier);
      continue;
    }

    // 4. Proportional Y-Axis hierarchy (top of diagram is highest layer, bottom is lowest layer)
    const rawY = typeof el.y === 'number' && !Number.isNaN(el.y) ? el.y : 0;
    const rawMinY = typeof bounds?.minY === 'number' && !Number.isNaN(bounds.minY) ? bounds.minY : 0;
    const rawHeight = Math.max(1, typeof bounds?.height === 'number' && !Number.isNaN(bounds.height) ? bounds.height : 1);
    const normalizedY = Math.max(0, Math.min(1, (rawY - rawMinY) / rawHeight));
    const layerCount = sortedLayers.length;

    if (layerCount <= 1) {
      tierAssignments.set(el.id, sortedLayers[0]?.order ?? 0);
    } else {
      const safeNormY = Number.isNaN(normalizedY) ? 0.5 : normalizedY;
      const bandIndex = Math.min(layerCount - 1, Math.max(0, Math.floor(safeNormY * layerCount)));
      const targetLayer = sortedLayers[layerCount - 1 - bandIndex] || sortedLayers[0] || { order: 0 };
      tierAssignments.set(el.id, targetLayer?.order ?? 0);
    }
  }

  return tierAssignments;
}

/**
 * Finds vertical connections (arrows / lines) between different elevation tiers
 * so 3D risers / vertical connector beams can be drawn between layers.
 */
export function extract3DRisers(elements, tierMap, spacing = 90, layers = null) {
  const risers = [];
  const elementMap = new Map(elements.map((el) => [el.id, el]));

  const getElevation = (tierVal) => {
    if (typeof tierVal === 'number') return tierVal * spacing;
    if (Array.isArray(layers)) {
      const found = layers.find((l) => l.id === tierVal || l.order === tierVal);
      if (found) return (found.order ?? 0) * spacing;
    }
    return 0;
  };

  for (const el of elements) {
    if (el.isDeleted || el.isHidden) continue;
    if (el.type !== 'arrow' && el.type !== 'line') continue;

    // Check if arrow connects two distinct bound elements
    const startId = el.startBinding?.elementId;
    const endId = el.endBinding?.elementId;

    if (!startId || !endId || startId === endId) continue;

    const sourceEl = elementMap.get(startId);
    const targetEl = elementMap.get(endId);
    if (!sourceEl || !targetEl) continue;

    const sourceTier = tierMap.get(startId) ?? 0;
    const targetTier = tierMap.get(endId) ?? 0;

    // Only vertical 3D risers between different tiers
    if (sourceTier !== targetTier) {
      const sourceZ = getElevation(sourceTier);
      const targetZ = getElevation(targetTier);

      risers.push({
        id: `riser_${el.id}`,
        arrowId: el.id,
        source: {
          id: startId,
          x: sourceEl.x + (sourceEl.width || 40) / 2,
          y: sourceEl.y + (sourceEl.height || 40) / 2,
          z: sourceZ,
          tier: sourceTier,
        },
        target: {
          id: endId,
          x: targetEl.x + (targetEl.width || 40) / 2,
          y: targetEl.y + (targetEl.height || 40) / 2,
          z: targetZ,
          tier: targetTier,
        },
        strokeColor: el.strokeColor || '#818cf8',
        strokeWidth: el.strokeWidth || 2,
        heightDiff: targetZ - sourceZ,
      });
    }
  }

  return risers;
}

/**
 * Calculates CSS 3D transform strings for stage, camera, and elevated layer plates.
 */
export function computeCameraTransform({ pitch = 60, yaw = 45, zoom = 1, panX = 0, panY = 0, perspective = 1200 }) {
  const perspectiveCss = perspective > 0 ? `perspective(${perspective}px)` : 'none';
  const worldTransform = `rotateX(${pitch}deg) rotateZ(${yaw}deg) scale(${zoom}) translate3d(${panX}px, ${panY}px, 0)`;

  return {
    perspectiveCss,
    worldTransform,
  };
}

/**
 * Projects a 3D coordinate (X, Y, Z) into 2D screen coordinates based on camera yaw and pitch.
 */
export function project3DToScreen({ x, y, z, centerX, centerY, width, height, yaw, pitch, scale }) {
  const radYaw = ((yaw ?? 35) * Math.PI) / 180;
  const radPitch = ((pitch ?? 55) * Math.PI) / 180;
  const cosY = Math.cos(radYaw);
  const sinY = Math.sin(radYaw);
  const cosP = Math.cos(radPitch);
  const sinP = Math.sin(radPitch);

  const rx = x - (centerX ?? 400);
  const ry = y - (centerY ?? 300);
  const rz = z ?? 0;

  // Rotate around Z (Yaw)
  const x1 = rx * cosY - ry * sinY;
  const y1 = rx * sinY + ry * cosY;

  // Rotate around X (Pitch)
  const y2 = y1 * cosP - rz * sinP;
  const z2 = y1 * sinP + rz * cosP;

  const s = scale ?? 1;
  const sx = (width ?? 2000) / 2 + x1 * s;
  const sy = (height ?? 1250) / 2 + y2 * s;

  return { sx, sy, depth: z2 };
}

/**
 * Renders a high-resolution, crystal-clear 2.5D isometric snapshot onto an HTML5 Canvas,
 * converts to blob, triggers an automatic offline file download, and copies to clipboard if available.
 */
export async function export3DArchitectureSnapshot({
  elements = [],
  layers = [],
  tierMap = new Map(),
  pitch = 55,
  yaw = 35,
  elevationSpacing = 95,
  bounds = { minX: 0, minY: 0, width: 800, height: 600, centerX: 400, centerY: 300 },
  isDark = true,
  title = 'System Architecture 3D',
}) {
  if (typeof document === 'undefined') {
    return { filename: 'mock-snapshot.png', blob: null };
  }

  const canvas = document.createElement('canvas');
  const width = 2400;
  const height = 1500;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { filename: 'doodle-3d-architecture.png', blob: null };
  }

  // Background Gradient
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, width * 0.7);
  if (isDark) {
    bgGrad.addColorStop(0, '#1c1c24');
    bgGrad.addColorStop(1, '#0c0c10');
  } else {
    bgGrad.addColorStop(0, '#f8fafc');
    bgGrad.addColorStop(1, '#e2e8f0');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle 3D background grid dots
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)';
  const gridStep = 48;
  for (let gx = 0; gx < width; gx += gridStep) {
    for (let gy = 0; gy < height; gy += gridStep) {
      ctx.fillRect(gx, gy, 2, 2);
    }
  }

  const centerX = bounds.centerX || 400;
  const centerY = bounds.centerY || 300;
  const scale = Math.min(width / (bounds.width + 500), height / (bounds.height + 500)) * 1.5;

  const project = (x, y, z) => project3DToScreen({ x, y, z, centerX, centerY, width, height, yaw, pitch, scale });

  // Safe Layers
  const safeLayers = sanitizeLayers(layers);
  const sortedLayers = [...safeLayers].sort((a, b) => ((a && a.order) ?? 0) - ((b && b.order) ?? 0));

  // 1. Draw Ground Baseplate
  const pad = 140;
  const gP1 = project(bounds.minX - pad, bounds.minY - pad, -10);
  const gP2 = project(bounds.maxX + pad, bounds.minY - pad, -10);
  const gP3 = project(bounds.maxX + pad, bounds.maxY + pad, -10);
  const gP4 = project(bounds.minX - pad, bounds.maxY + pad, -10);

  ctx.beginPath();
  ctx.moveTo(gP1.sx, gP1.sy);
  ctx.lineTo(gP2.sx, gP2.sy);
  ctx.lineTo(gP3.sx, gP3.sy);
  ctx.lineTo(gP4.sx, gP4.sy);
  ctx.closePath();
  ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Draw Translucent Layer Floor Plates (from bottom to top)
  for (const layer of sortedLayers) {
    if (!layer) continue;
    const layerZ = (layer.order ?? 0) * elevationSpacing;
    const p1 = project(bounds.minX - 40, bounds.minY - 40, layerZ);
    const p2 = project(bounds.maxX + 40, bounds.minY - 40, layerZ);
    const p3 = project(bounds.maxX + 40, bounds.maxY + 40, layerZ);
    const p4 = project(bounds.minX - 40, bounds.maxY + 40, layerZ);

    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.lineTo(p3.sx, p3.sy);
    ctx.lineTo(p4.sx, p4.sy);
    ctx.closePath();

    ctx.fillStyle = isDark ? `${layer.color}18` : `${layer.color}25`;
    ctx.fill();
    ctx.strokeStyle = `${layer.color}66`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Floating Layer Tag Badge on Left Corner
    ctx.save();
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    const tagText = `${layer.name} (+${layerZ}px)`;
    const textWidth = ctx.measureText(tagText).width;
    const badgeX = p1.sx + 20;
    const badgeY = p1.sy - 15;

    ctx.fillStyle = isDark ? '#141418' : '#ffffff';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX - 12, badgeY - 22, textWidth + 36, 32, 8);
    } else {
      ctx.rect(badgeX - 12, badgeY - 22, textWidth + 36, 32);
    }
    ctx.fill();
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Color dot
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = layer.color;
    ctx.fillText(tagText, badgeX + 16, badgeY);
    ctx.restore();
  }

  // 3. Draw Vertical 3D Connector Risers (Inter-tier beams)
  const risers = extract3DRisers(elements, tierMap, elevationSpacing, sortedLayers);
  for (const r of risers) {
    const sP = project(r.source.x, r.source.y, r.source.z);
    const tP = project(r.target.x, r.target.y, r.target.z);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sP.sx, sP.sy);
    ctx.lineTo(tP.sx, tP.sy);
    ctx.strokeStyle = r.strokeColor || '#818cf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Collect & Sort Elements by 3D Depth (Painter's Algorithm)
  const renderableItems = [];
  for (const el of elements) {
    if (!el || el.isDeleted || el.isHidden || el.type === 'arrow') continue;
    const tier = tierMap.get(el.id) ?? 0;
    const z = tier * elevationSpacing;
    const cx = el.x + (el.width || 80) / 2;
    const cy = el.y + (el.height || 50) / 2;
    const proj = project(cx, cy, z);
    renderableItems.push({ el, tier, z, proj });
  }

  // Sort by depth ascending so closest renders last
  renderableItems.sort((a, b) => a.proj.depth - b.proj.depth);

  // 5. Draw 3D Component Boxes
  for (const item of renderableItems) {
    const { el, tier, z } = item;
    const layer = sortedLayers.find((l) => l && (l.order === tier || l.id === tier)) || sortedLayers[0];
    const w = el.width || 120;
    const h = el.height || 60;

    const pTL = project(el.x, el.y, z);
    const pTR = project(el.x + w, el.y, z);
    const pBR = project(el.x + w, el.y + h, z);
    const pBL = project(el.x, el.y + h, z);

    // Bottom Extrusion Shadow
    const pBL_shadow = project(el.x, el.y + h, z - 12);
    const pBR_shadow = project(el.x + w, el.y + h, z - 12);

    ctx.save();
    // Drop shadow under card
    ctx.beginPath();
    ctx.moveTo(pBL.sx, pBL.sy);
    ctx.lineTo(pBR.sx, pBR.sy);
    ctx.lineTo(pBR_shadow.sx, pBR_shadow.sy);
    ctx.lineTo(pBL_shadow.sx, pBL_shadow.sy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Top Face Card
    ctx.beginPath();
    ctx.moveTo(pTL.sx, pTL.sy);
    ctx.lineTo(pTR.sx, pTR.sy);
    ctx.lineTo(pBR.sx, pBR.sy);
    ctx.lineTo(pBL.sx, pBL.sy);
    ctx.closePath();

    ctx.fillStyle = el.backgroundColor || layer.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Component Text Label
    ctx.save();
    ctx.font = 'bold 18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerP = project(el.x + w / 2, el.y + h / 2, z);
    const label = el.text || el.name || 'Component';
    ctx.fillText(label, centerP.sx, centerP.sy);

    // Corner Tier Badge
    const badgeP = project(el.x + w - 4, el.y + 4, z);
    ctx.beginPath();
    ctx.arc(badgeP.sx, badgeP.sy, 11, 0, Math.PI * 2);
    ctx.fillStyle = layer.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`L${tier}`, badgeP.sx, badgeP.sy + 1);
    ctx.restore();
  }

  // 6. Header Badge & Branding Watermark
  ctx.save();
  ctx.font = 'bold 24px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
  ctx.fillText('⚡ DOODLE DESK • 2.5D ISOMETRIC ARCHITECTURE', 60, 70);

  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 0, 0, 0.55)';
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  ctx.fillText(`${sortedLayers.length} Stratified Tiers • Orbit: ${yaw}° | Tilt: ${pitch}° • ${dateStr}`, 60, 100);
  ctx.restore();

  // Convert to Blob and Download
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve({ filename: 'doodle-3d-architecture.png', blob: null });
      return;
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to create snapshot blob'));
        return;
      }
      try {
        const filename = `doodle-3d-architecture-${Date.now()}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        // Also attempt clipboard copy
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          }
        } catch {
          // Ignore clipboard permission issues
        }

        resolve({ filename, blob });
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}
