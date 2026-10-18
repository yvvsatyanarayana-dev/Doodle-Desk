import * as workerThreads from 'node:worker_threads';

// Polyfill worker_threads.markAsUncloneable for environments where Node or undici
// expects this API (Node < 22 or specific CI runners with jsdom)
if (typeof workerThreads.markAsUncloneable !== 'function') {
  workerThreads.markAsUncloneable = (val) => val;
}
