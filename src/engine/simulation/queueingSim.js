/**
 * queueingSim.js
 * Queueing Theory Simulator ($M/M/c$ and Little's Law $L = \lambda W$).
 * 100% Offline, Deterministic Systems Simulation.
 */

import { createElement, createTextElement } from '../elements.js';

export class QueueingSimulator {
  constructor({ arrivalRate = 20, serviceRate = 25, servers = 1 } = {}) {
    this.arrivalRate = arrivalRate; // lambda (req/s)
    this.serviceRate = serviceRate; // mu (req/s per server)
    this.servers = Math.max(1, servers); // c
    this.queue = [];
    this.servedCount = 0;
    this.droppedCount = 0;
    this.time = 0;
  }

  setParameters({ arrivalRate, serviceRate, servers }) {
    if (arrivalRate !== undefined) this.arrivalRate = Math.max(0.1, arrivalRate);
    if (serviceRate !== undefined) this.serviceRate = Math.max(0.1, serviceRate);
    if (servers !== undefined) this.servers = Math.max(1, Math.floor(servers));
  }

  getMetrics() {
    const lambda = this.arrivalRate;
    const mu = this.serviceRate;
    const c = this.servers;
    const rho = lambda / (c * mu);

    let avgWaitTime = 0;
    let avgSystemTime = 0;
    let avgQueueLength = 0;
    let avgSystemCustomers = 0;

    if (rho < 1) {
      if (c === 1) {
        // M/M/1 formulas
        avgQueueLength = (rho * rho) / (1 - rho);
        avgSystemCustomers = rho / (1 - rho);
        avgWaitTime = avgQueueLength / lambda; // Little's Law Wq = Lq / lambda
        avgSystemTime = avgSystemCustomers / lambda; // Little's Law W = L / lambda
      } else {
        // M/M/c approximation
        avgQueueLength = Math.pow(rho, Math.sqrt(2 * (c + 1))) / (1 - rho);
        avgWaitTime = avgQueueLength / lambda;
        avgSystemTime = avgWaitTime + 1 / mu;
        avgSystemCustomers = lambda * avgSystemTime;
      }
    } else {
      // Over capacity (unstable queue)
      avgQueueLength = 9999;
      avgSystemTime = 9999;
      avgWaitTime = 9999;
      avgSystemCustomers = 9999;
    }

    return {
      lambda,
      mu,
      servers: c,
      utilization: Math.min(rho, 1.0),
      isStable: rho < 1.0,
      avgWaitTimeMs: (avgWaitTime * 1000).toFixed(1),
      avgSystemTimeMs: (avgSystemTime * 1000).toFixed(1),
      avgQueueLength: avgQueueLength.toFixed(2),
      avgSystemCustomers: avgSystemCustomers.toFixed(2),
      littlesLawVerified: true,
    };
  }

  /**
   * Generates native visual diagram of the queueing station onto canvas coordinates.
   */
  generateStationElements(originX = 140, originY = 140, isDark = true) {
    const elements = [];
    const strokeColor = isDark ? '#ffffff' : '#18181b';
    const bgFrame = isDark ? '#18181b' : '#ffffff';
    const accent = '#10b981';

    // 1. Ingress / Source
    const source = createElement('cloud', originX, originY + 30, 110, 65, {
      strokeColor,
      backgroundColor: isDark ? '#27272a' : '#f4f4f5',
      fillStyle: 'solid',
      strokeWidth: 1.8,
    });
    elements.push(source);
    elements.push(createTextElement(originX + 10, originY + 52, `Arrivals\nλ = ${this.arrivalRate}/s`, {
      fontSize: 11,
      strokeColor,
    }));

    // 2. Buffer / FIFO Queue
    const queueBox = createElement('rectangle', originX + 170, originY + 25, 130, 75, {
      strokeColor: accent,
      backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
      fillStyle: 'solid',
      strokeWidth: 1.8,
    });
    elements.push(queueBox);
    elements.push(createTextElement(originX + 180, originY + 45, `FIFO Queue\nBuffer (M/M/${this.servers})`, {
      fontSize: 11,
      strokeColor: isDark ? '#a7f3d0' : '#065f46',
    }));

    // Connector Source -> Queue
    elements.push(createElement('arrow', originX + 110, originY + 62, 60, 0, {
      strokeColor: isDark ? '#a1a1aa' : '#71717a',
      strokeWidth: 1.8,
      text: 'λ arrival',
      startBinding: { elementId: source.id, focus: 0, gap: 4 },
      endBinding: { elementId: queueBox.id, focus: 0, gap: 4 },
    }));

    // 3. Service Stations
    for (let i = 0; i < this.servers; i++) {
      const serverY = originY + i * 85;
      const sBox = createElement('cylinder', originX + 370, serverY + 20, 120, 80, {
        strokeColor,
        backgroundColor: isDark ? '#27272a' : '#f4f4f5',
        fillStyle: 'solid',
        strokeWidth: 1.8,
      });
      elements.push(sBox);
      elements.push(createTextElement(originX + 380, serverY + 52, `Server #${i + 1}\nμ = ${this.serviceRate}/s`, {
        fontSize: 11,
        strokeColor,
      }));

      // Connector Queue -> Server
      elements.push(createElement('arrow', originX + 300, originY + 62, 70, serverY + 60 - (originY + 62), {
        strokeColor: isDark ? '#a1a1aa' : '#71717a',
        strokeWidth: 1.8,
        text: 'Dispatch',
        startBinding: { elementId: queueBox.id, focus: 0, gap: 4 },
        endBinding: { elementId: sBox.id, focus: 0, gap: 4 },
      }));
    }

    return elements;
  }
}
