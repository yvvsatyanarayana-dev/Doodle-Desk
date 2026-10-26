/**
 * Network Traffic & Particle Data-Flow Simulation Engine
 * Simulates real-time data packets traveling along architecture connector edges,
 * tracking throughput, latency, and interactive node failures.
 */

export const PACKET_PROTOCOLS = {
  HTTP: { name: 'HTTP / REST', color: '#38bdf8', defaultSpeed: 0.015 },
  SQL: { name: 'SQL Query', color: '#34d399', defaultSpeed: 0.012 },
  KAFKA: { name: 'Event Stream', color: '#a855f7', defaultSpeed: 0.02 },
  CACHE: { name: 'Cache Hit', color: '#fbbf24', defaultSpeed: 0.03 },
};

export const NODE_HEALTH = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  FAILED: 'failed',
};

/**
 * Extracts network graph (services and connector routes) from canvas elements.
 */
export function buildTrafficNetwork(elements) {
  const activeElements = (elements || []).filter(el => !el.isDeleted && !el.isHidden);
  const nodeElements = activeElements.filter(el => !['arrow', 'line', 'freedraw'].includes(el.type));
  const nodeMap = new Map(nodeElements.map(el => [el.id, el]));

  const edges = [];
  for (const el of activeElements) {
    if ((el.type === 'arrow' || el.type === 'line') && el.startBinding?.elementId && el.endBinding?.elementId) {
      const fromNode = nodeMap.get(el.startBinding.elementId);
      const toNode = nodeMap.get(el.endBinding.elementId);

      if (fromNode && toNode) {
        // Classify protocol by arrow label or target
        let protocol = PACKET_PROTOCOLS.HTTP;
        const text = (el.text || el.label || '').toLowerCase();
        if (text.includes('sql') || text.includes('db') || text.includes('query')) {
          protocol = PACKET_PROTOCOLS.SQL;
        } else if (text.includes('kafka') || text.includes('event') || text.includes('stream')) {
          protocol = PACKET_PROTOCOLS.KAFKA;
        } else if (text.includes('redis') || text.includes('cache')) {
          protocol = PACKET_PROTOCOLS.CACHE;
        }

        edges.push({
          id: el.id,
          fromId: fromNode.id,
          toId: toNode.id,
          fromNode,
          toNode,
          element: el,
          protocol,
        });
      }
    }
  }

  return {
    nodes: nodeElements,
    edges,
    nodeMap,
  };
}

export class NetworkTrafficEngine {
  constructor() {
    this.network = { nodes: [], edges: [], nodeMap: new Map() };
    this.packets = [];
    this.bursts = []; // Red error or green success particle bursts
    this.nodeHealth = new Map(); // nodeId -> 'healthy' | 'degraded' | 'failed'
    this.isRunning = false;
    this.speedMultiplier = 1;
    this.totalDelivered = 0;
    this.totalDropped = 0;
    this.lastSpawnTime = 0;
  }

  updateElements(elements) {
    this.network = buildTrafficNetwork(elements);
    // Preserve existing node health statuses
    for (const node of this.network.nodes) {
      if (!this.nodeHealth.has(node.id)) {
        this.nodeHealth.set(node.id, NODE_HEALTH.HEALTHY);
      }
    }
  }

  toggleNodeHealth(nodeId) {
    const current = this.nodeHealth.get(nodeId) || NODE_HEALTH.HEALTHY;
    let next = NODE_HEALTH.HEALTHY;
    if (current === NODE_HEALTH.HEALTHY) next = NODE_HEALTH.FAILED;
    else if (current === NODE_HEALTH.FAILED) next = NODE_HEALTH.DEGRADED;
    else next = NODE_HEALTH.HEALTHY;

    this.nodeHealth.set(nodeId, next);
    return next;
  }

  setNodeHealth(nodeId, status) {
    this.nodeHealth.set(nodeId, status);
  }

  spawnPackets() {
    if (!this.isRunning || this.network.edges.length === 0) return;

    for (const edge of this.network.edges) {
      const sourceHealth = this.nodeHealth.get(edge.fromId);
      if (sourceHealth === NODE_HEALTH.FAILED) continue;

      // Spawn probability modulated by speed multiplier
      const chance = (sourceHealth === NODE_HEALTH.DEGRADED ? 0.015 : 0.04) * this.speedMultiplier;
      if (Math.random() < chance) {
        this.packets.push({
          id: `pkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          edgeId: edge.id,
          fromId: edge.fromId,
          toId: edge.toId,
          progress: 0,
          speed: edge.protocol.defaultSpeed * (sourceHealth === NODE_HEALTH.DEGRADED ? 0.4 : 1) * this.speedMultiplier,
          color: edge.protocol.color,
          status: 'in_flight',
        });
      }
    }
  }

  step() {
    if (!this.isRunning) return;

    this.spawnPackets();

    const activePackets = [];
    for (const pkt of this.packets) {
      pkt.progress += pkt.speed;

      if (pkt.progress >= 1) {
        // Reached destination
        const destHealth = this.nodeHealth.get(pkt.toId) || NODE_HEALTH.HEALTHY;
        if (destHealth === NODE_HEALTH.FAILED) {
          this.totalDropped++;
          this.bursts.push({
            nodeId: pkt.toId,
            color: '#ef4444',
            life: 0,
            maxLife: 20,
          });
        } else {
          this.totalDelivered++;
          this.bursts.push({
            nodeId: pkt.toId,
            color: pkt.color,
            life: 0,
            maxLife: 15,
          });
        }
      } else {
        activePackets.push(pkt);
      }
    }

    this.packets = activePackets;

    // Advance particle bursts
    this.bursts = this.bursts
      .map(b => ({ ...b, life: b.life + 1 }))
      .filter(b => b.life < b.maxLife);
  }

  getMetrics() {
    const total = this.totalDelivered + this.totalDropped;
    const errorRate = total > 0 ? ((this.totalDropped / total) * 100).toFixed(1) : '0.0';
    return {
      inFlight: this.packets.length,
      delivered: this.totalDelivered,
      dropped: this.totalDropped,
      errorRate: `${errorRate}%`,
      reqPerSec: Math.round(this.packets.length * 12 * this.speedMultiplier),
    };
  }
}
