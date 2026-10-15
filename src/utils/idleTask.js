export function scheduleIdleTask(callback, timeout = 1000) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return {
      type: 'idle',
      id: window.requestIdleCallback(callback, { timeout }),
    };
  }

  return {
    type: 'timeout',
    id: window.setTimeout(callback, 0),
  };
}

export function cancelIdleTask(task) {
  if (!task || typeof window === 'undefined') return;

  if (task.type === 'idle' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(task.id);
  } else if (task.type === 'timeout') {
    window.clearTimeout(task.id);
  }
}
