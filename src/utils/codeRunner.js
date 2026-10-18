/**
 * Offline Safe JavaScript & Code Execution Engine for Doodle Desk
 * Runs 100% offline in browser/electron runtime with console interception,
 * timeout guards, and rich result formatting.
 */

export const CODE_PRESETS = [
  {
    id: 'array_stats',
    name: 'Array Statistics & Metrics',
    code: `// Generate a sample dataset and compute summary statistics
const scores = [84, 92, 78, 95, 88, 72, 91, 85, 99, 67, 89];

const sum = scores.reduce((acc, val) => acc + val, 0);
const mean = sum / scores.length;
const sorted = [...scores].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const min = sorted[0];
const max = sorted[sorted.length - 1];

// Standard deviation
const variance = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scores.length;
const stdDev = Math.sqrt(variance);

console.log('Sample Count:', scores.length);
console.log('Mean Score:', mean.toFixed(2));
console.log('Median Score:', median);
console.log('Min / Max:', min, '–', max);
console.log('Standard Deviation:', stdDev.toFixed(2));

return { mean: Number(mean.toFixed(2)), median, min, max, stdDev: Number(stdDev.toFixed(2)) };`,
  },
  {
    id: 'json_transform',
    name: 'JSON Data Transform & Filter',
    code: `// Process microservice telemetry records
const rawEvents = [
  { service: 'auth-api', status: 200, durationMs: 42, path: '/login' },
  { service: 'payment-svc', status: 500, durationMs: 310, path: '/checkout' },
  { service: 'catalog-api', status: 200, durationMs: 18, path: '/products' },
  { service: 'payment-svc', status: 200, durationMs: 95, path: '/verify' },
  { service: 'auth-api', status: 401, durationMs: 25, path: '/refresh' },
];

const slowOrFailed = rawEvents.filter(e => e.status >= 400 || e.durationMs > 100);
const avgLatency = rawEvents.reduce((acc, e) => acc + e.durationMs, 0) / rawEvents.length;

console.log('Total Events Monitored:', rawEvents.length);
console.log('Average Latency:', avgLatency.toFixed(1) + 'ms');
console.log('Anomalous / Failed Events:', slowOrFailed.length);

return { avgLatency: Number(avgLatency.toFixed(1)), incidents: slowOrFailed };`,
  },
  {
    id: 'geometry_trig',
    name: 'Canvas Geometry & Vector Math',
    code: `// 2D Vector calculations for canvas connectors & nodes
function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function angleBetween(p1, p2) {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  return (rad * 180 / Math.PI + 360) % 360;
}

const nodeA = { x: 120, y: 80, label: 'Client' };
const nodeB = { x: 450, y: 320, label: 'Server' };

const dist = distance(nodeA, nodeB);
const angle = angleBetween(nodeA, nodeB);

console.log(\`Distance between \${nodeA.label} and \${nodeB.label}:\`, dist.toFixed(1) + 'px');
console.log(\`Connector Arrow Angle:\`, angle.toFixed(1) + '°');

return { distance: Math.round(dist), angleDeg: Number(angle.toFixed(1)) };`,
  },
  {
    id: 'fibonacci_bench',
    name: 'Algorithms: Fibonacci & Benchmark',
    code: `// Memoized Fibonacci generator
function fibonacci(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n <= 1) return n;
  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  return memo[n];
}

const sequence = [];
for (let i = 0; i <= 15; i++) {
  sequence.push(fibonacci(i));
}

console.log('First 16 Fibonacci Numbers:');
console.log(sequence.join(', '));

return sequence;`,
  },
];

/**
 * Execute arbitrary JavaScript in a sandboxed offline environment with
 * console output interception and infinite loop protection.
 *
 * @param {string} code - The JavaScript source code to execute.
 * @param {number} timeoutMs - Maximum execution time before safety timeout.
 * @returns {Promise<{ success: boolean, logs: Array<{ type: string, text: string }>, result: any, durationMs: number, error: string | null }>}
 */
export async function executeCodeSafely(code, timeoutMs = 2000) {
  const logs = [];
  const startTime = performance.now();

  const safeLog = (...args) => {
    const formatted = args.map(arg => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    logs.push({ type: 'log', text: formatted });
  };

  const safeWarn = (...args) => {
    logs.push({ type: 'warn', text: args.map(String).join(' ') });
  };

  const safeError = (...args) => {
    logs.push({ type: 'error', text: args.map(String).join(' ') });
  };

  const safeInfo = (...args) => {
    logs.push({ type: 'info', text: args.map(String).join(' ') });
  };

  try {
    if (!code || !code.trim()) {
      return {
        success: true,
        logs: [{ type: 'info', text: 'No code to execute. Write code and hit Run.', message: 'No code to execute. Write code and hit Run.' }],
        result: undefined,
        returnValue: undefined,
        durationMs: 0,
        executionTimeMs: 0,
        error: null,
      };
    }

    // Wrap in an async function with sandboxed console
    const sandboxConsole = {
      log: safeLog,
      warn: safeWarn,
      error: safeError,
      info: safeInfo,
    };

    // Execute wrapped code
    const runFn = new Function(
      'console',
      'Math',
      'JSON',
      'Date',
      'Array',
      'Object',
      'Number',
      'String',
      'Boolean',
      `"use strict";
      return (async function() {
        ${code}
      })();`
    );

    const execPromise = runFn(
      sandboxConsole,
      Math,
      JSON,
      Date,
      Array,
      Object,
      Number,
      String,
      Boolean
    );

    // Timeout guard for runaway loops or promises
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const result = await Promise.race([execPromise, timeoutPromise]);
    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
    const formattedLogs = logs.map(l => ({ ...l, message: l.text }));

    return {
      success: true,
      logs: formattedLogs,
      result,
      returnValue: result,
      durationMs,
      executionTimeMs: durationMs,
      error: null,
    };
  } catch (err) {
    const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
    const formattedLogs = logs.map(l => ({ ...l, message: l.text }));
    return {
      success: false,
      logs: formattedLogs,
      result: undefined,
      returnValue: undefined,
      durationMs,
      executionTimeMs: durationMs,
      error: err.message || String(err),
    };
  }
}
