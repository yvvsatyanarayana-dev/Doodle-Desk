/**
 * consensusSim.js
 * Distributed Consensus Visualizer (Raft / Paxos Algorithm).
 * 100% Offline, Deterministic Distributed Systems Simulator.
 */

import { createElement, createTextElement } from '../elements.js';

export class RaftConsensusSimulator {
  constructor({ nodeCount = 3 } = {}) {
    this.term = 1;
    this.nodes = [];
    this.leaderId = null;
    this.logs = [{ index: 1, term: 1, command: 'INIT_CLUSTER' }];
    this.initNodes(nodeCount);
  }

  initNodes(count) {
    const validCount = Math.min(5, Math.max(3, count));
    this.nodes = Array.from({ length: validCount }, (_, i) => ({
      id: `node-${i + 1}`,
      name: `Node ${i + 1}`,
      state: i === 0 ? 'Leader' : 'Follower', // Start with Node 1 as Leader
      term: this.term,
      votedFor: i === 0 ? `node-1` : null,
      logCount: 1,
      alive: true,
    }));
    this.leaderId = 'node-1';
  }

  step() {
    // If no leader or leader down, trigger election
    const currentLeader = this.nodes.find(n => n.id === this.leaderId && n.alive);
    if (!currentLeader) {
      this.term += 1;
      // Elect first alive node as candidate
      const candidate = this.nodes.find(n => n.alive);
      if (candidate) {
        candidate.state = 'Candidate';
        candidate.term = this.term;
        candidate.votedFor = candidate.id;

        // Count votes from alive nodes
        const aliveNodes = this.nodes.filter(n => n.alive);
        const votes = aliveNodes.length;
        const quorum = Math.floor(this.nodes.length / 2) + 1;

        if (votes >= quorum) {
          candidate.state = 'Leader';
          this.leaderId = candidate.id;
          aliveNodes.forEach(n => {
            if (n.id !== candidate.id) {
              n.state = 'Follower';
              n.term = this.term;
            }
          });
          return {
            event: 'NEW_LEADER_ELECTED',
            leader: candidate.name,
            term: this.term,
            votes,
            quorum,
          };
        }
      }
      return { event: 'SPLIT_VOTE', term: this.term };
    }

    // Normal heartbeat + log append
    const newIndex = this.logs.length + 1;
    this.logs.push({ index: newIndex, term: this.term, command: `CMD_TX_${newIndex}` });
    this.nodes.forEach(n => {
      if (n.alive) n.logCount = this.logs.length;
    });

    return {
      event: 'HEARTBEAT_AND_REPLICATE',
      leader: currentLeader.name,
      term: this.term,
      logIndex: newIndex,
    };
  }

  toggleNodeAlive(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.alive = !node.alive;
      if (!node.alive && this.leaderId === nodeId) {
        this.leaderId = null;
      }
    }
  }

  generateClusterElements(originX = 140, originY = 140, isDark = true) {
    const elements = [];
    const strokeColor = isDark ? '#ffffff' : '#18181b';
    const radius = 160;
    const centerX = originX + 220;
    const centerY = originY + 180;

    // Cluster Frame
    const frame = createElement('frame', originX, originY, 460, 360, {
      name: `Raft Consensus Cluster (Term ${this.term})`,
      strokeColor: isDark ? '#3f3f46' : '#d4d4d8',
      strokeWidth: 1.5,
    });
    elements.push(frame);

    const nodeElements = [];

    this.nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / this.nodes.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 55;
      const y = centerY + radius * Math.sin(angle) - 40;

      const isLeader = node.state === 'Leader';
      const isDead = !node.alive;

      const box = createElement('rectangle', x, y, 110, 80, {
        strokeColor: isDead ? '#ef4444' : isLeader ? '#10b981' : strokeColor,
        backgroundColor: isDead
          ? (isDark ? '#450a0a' : '#fef2f2')
          : isLeader
          ? (isDark ? '#064e3b' : '#ecfdf5')
          : (isDark ? '#27272a' : '#f4f4f5'),
        fillStyle: 'solid',
        strokeWidth: isLeader ? 2.5 : 1.8,
        frameId: frame.id,
      });
      elements.push(box);
      nodeElements.push(box);

      elements.push(createTextElement(x + 10, y + 16, `${node.name}\n[${node.state.toUpperCase()}]`, {
        fontSize: 11,
        strokeColor: isDead ? '#f87171' : isLeader ? '#34d399' : strokeColor,
        frameId: frame.id,
      }));
    });

    // Ring connectors between consecutive nodes
    for (let i = 0; i < nodeElements.length; i++) {
      const nextIdx = (i + 1) % nodeElements.length;
      const fromEl = nodeElements[i];
      const toEl = nodeElements[nextIdx];

      elements.push(createElement('arrow', fromEl.x + 55, fromEl.y + 40, toEl.x - fromEl.x, toEl.y - fromEl.y, {
        strokeColor: isDark ? '#71717a' : '#a1a1aa',
        strokeWidth: 1.5,
        text: 'Heartbeat/RPC',
        frameId: frame.id,
        startBinding: { elementId: fromEl.id, focus: 0, gap: 4 },
        endBinding: { elementId: toEl.id, focus: 0, gap: 4 },
      }));
    }

    return elements;
  }
}
