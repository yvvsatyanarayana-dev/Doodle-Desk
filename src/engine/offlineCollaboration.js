const OFFLINE_QUEUE_PREFIX = 'doodle_offline_collab_queue_v1';

function sceneMap(elements) {
  return new Map((elements || [])
    .filter(element => element && element.id && !element.isDeleted)
    .map(element => [element.id, element]));
}

function elementSignature(element) {
  if (!element) return null;
  const comparable = { ...element };
  delete comparable.version;
  delete comparable.versionNonce;
  delete comparable.updated;
  return JSON.stringify(comparable);
}

function hasChanged(element, baseline) {
  return elementSignature(element) !== elementSignature(baseline);
}

export function mergeOfflineScenes(baseElements, localElements, remoteElements, choices = {}) {
  const base = sceneMap(baseElements);
  const local = sceneMap(localElements);
  const remote = sceneMap(remoteElements);
  const ids = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  const mergedById = new Map();
  const conflicts = [];

  for (const id of ids) {
    const baseElement = base.get(id);
    const localElement = local.get(id);
    const remoteElement = remote.get(id);
    const localChanged = hasChanged(localElement, baseElement);
    const remoteChanged = hasChanged(remoteElement, baseElement);
    let selected;

    if (localChanged && remoteChanged && elementSignature(localElement) !== elementSignature(remoteElement)) {
      conflicts.push({
        id,
        label: localElement?.text || localElement?.name || remoteElement?.text || remoteElement?.name ||
          localElement?.type || remoteElement?.type || 'Canvas object',
        localElement: localElement || null,
        remoteElement: remoteElement || null,
      });
      selected = choices[id] === 'remote' ? remoteElement : localElement;
    } else if (localChanged) {
      selected = localElement;
    } else {
      selected = remoteElement;
    }

    if (selected) mergedById.set(id, selected);
  }

  const orderedIds = [
    ...(remoteElements || []).map(element => element?.id),
    ...(localElements || []).map(element => element?.id),
  ];
  const seen = new Set();
  const elements = [];
  for (const id of orderedIds) {
    if (!id || seen.has(id) || !mergedById.has(id)) continue;
    seen.add(id);
    elements.push(mergedById.get(id));
  }
  for (const [id, element] of mergedById) {
    if (!seen.has(id)) elements.push(element);
  }

  return { elements, conflicts };
}

export function offlineQueueStorageKey(workspaceId, fileId, roomId) {
  if (!workspaceId || !fileId || !roomId) return null;
  return `${OFFLINE_QUEUE_PREFIX}:${encodeURIComponent(workspaceId)}:${encodeURIComponent(fileId)}:${encodeURIComponent(roomId)}`;
}

export function readOfflineQueue(key) {
  if (!key || !globalThis.localStorage) return null;
  const serialized = globalThis.localStorage.getItem(key);
  if (!serialized) return null;
  const queue = JSON.parse(serialized);
  if (!queue || !Array.isArray(queue.baseElements) || !Array.isArray(queue.localElements)) {
    throw new Error('The saved offline collaboration queue is invalid.');
  }
  return queue;
}

export function writeOfflineQueue(key, queue) {
  if (!key || !globalThis.localStorage) throw new Error('Offline collaboration storage is unavailable.');
  globalThis.localStorage.setItem(key, JSON.stringify(queue));
}

export function clearOfflineQueue(key) {
  if (!key || !globalThis.localStorage) return;
  globalThis.localStorage.removeItem(key);
}
