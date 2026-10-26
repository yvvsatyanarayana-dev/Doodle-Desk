import { describe, it, expect } from 'vitest';
import {
  buildTrafficNetwork,
  NetworkTrafficEngine,
  NODE_HEALTH,
  PACKET_PROTOCOLS,
} from '../src/engine/simulation/trafficSimulator.js';

describe('trafficSimulator engine', () => {
  const mockElements = [
    { id: 'node_gateway', type: 'rectangle', text: 'API Gateway', x: 100, y: 100, width: 140, height: 70 },
    { id: 'node_db', type: 'ellipse', text: 'PostgreSQL DB', x: 400, y: 100, width: 120, height: 80 },
    {
      id: 'arrow_1',
      type: 'arrow',
      text: 'SQL Query',
      startBinding: { elementId: 'node_gateway' },
      endBinding: { elementId: 'node_db' },
    },
  ];

  it('builds traffic network with classified protocols', () => {
    const net = buildTrafficNetwork(mockElements);
    expect(net.nodes.length).toBe(2);
    expect(net.edges.length).toBe(1);

    const edge = net.edges[0];
    expect(edge.fromId).toBe('node_gateway');
    expect(edge.toId).toBe('node_db');
    expect(edge.protocol.name).toBe(PACKET_PROTOCOLS.SQL.name);
  });

  it('simulates packet movement, delivery, and node failure drop rates', () => {
    const engine = new NetworkTrafficEngine();
    engine.updateElements(mockElements);
    engine.isRunning = true;
    engine.speedMultiplier = 2;

    // Initially all nodes are healthy
    expect(engine.nodeHealth.get('node_db')).toBe(NODE_HEALTH.HEALTHY);

    // Spawn and step packet
    engine.packets.push({
      id: 'test_pkt_1',
      edgeId: 'arrow_1',
      fromId: 'node_gateway',
      toId: 'node_db',
      progress: 0.95,
      speed: 0.1,
      color: '#34d399',
      status: 'in_flight',
    });

    engine.step();
    expect(engine.totalDelivered).toBe(1);
    expect(engine.totalDropped).toBe(0);

    // Mark destination as failed
    engine.setNodeHealth('node_db', NODE_HEALTH.FAILED);

    engine.packets.push({
      id: 'test_pkt_2',
      edgeId: 'arrow_1',
      fromId: 'node_gateway',
      toId: 'node_db',
      progress: 0.95,
      speed: 0.1,
      color: '#34d399',
      status: 'in_flight',
    });

    engine.step();
    expect(engine.totalDropped).toBe(1);
    expect(engine.bursts.some(b => b.color === '#ef4444')).toBe(true);

    const metrics = engine.getMetrics();
    expect(metrics.dropped).toBe(1);
    expect(metrics.delivered).toBe(1);
    expect(metrics.errorRate).toBe('50.0%');
  });

  it('cycles node health when toggled', () => {
    const engine = new NetworkTrafficEngine();
    engine.updateElements(mockElements);

    const next1 = engine.toggleNodeHealth('node_db');
    expect(next1).toBe(NODE_HEALTH.FAILED);

    const next2 = engine.toggleNodeHealth('node_db');
    expect(next2).toBe(NODE_HEALTH.DEGRADED);

    const next3 = engine.toggleNodeHealth('node_db');
    expect(next3).toBe(NODE_HEALTH.HEALTHY);
  });
});
