export const CHANGE_TRACKING_STORAGE_KEY = 'doodle_change_tracking_v1';

function comparableElement(element) {
  const {
    id,
    version,
    versionNonce,
    updated,
    componentOriginX,
    componentOriginY,
    ...visualProperties
  } = element;
  return visualProperties;
}

export function createChangeSnapshot(elements) {
  return Object.fromEntries((elements || [])
    .filter(element => !element.isDeleted)
    .map(element => [element.id, {
      signature: JSON.stringify(comparableElement(element)),
      element: {
        id: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        angle: element.angle || 0,
        text: element.text || element.name || element.label || '',
      },
    }]));
}

export function compareSceneToSnapshot(elements, snapshot) {
  const baseline = snapshot || {};
  const current = createChangeSnapshot(elements);
  const changes = [];
  for (const [id, item] of Object.entries(current)) {
    if (!baseline[id]) changes.push({ id, status: 'added', element: item.element });
    else if (baseline[id].signature !== item.signature) {
      changes.push({ id, status: 'modified', element: item.element });
    }
  }
  for (const [id, item] of Object.entries(baseline)) {
    if (!current[id]) changes.push({ id, status: 'removed', element: item.element });
  }
  return changes;
}

export function readChangeSnapshot(workspaceId, fileId) {
  if (!workspaceId || !fileId) return null;
  const stored = globalThis.localStorage?.getItem(CHANGE_TRACKING_STORAGE_KEY);
  if (!stored) return null;
  const snapshots = JSON.parse(stored);
  if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) {
    throw new Error('Saved change tracking data is invalid.');
  }
  return snapshots[`${workspaceId}:${fileId}`] || null;
}

export function writeChangeSnapshot(workspaceId, fileId, snapshot) {
  if (!workspaceId || !fileId) throw new Error('A workspace and board are required to track changes.');
  if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
  const stored = globalThis.localStorage.getItem(CHANGE_TRACKING_STORAGE_KEY);
  const snapshots = stored ? JSON.parse(stored) : {};
  if (!snapshots || typeof snapshots !== 'object' || Array.isArray(snapshots)) {
    throw new Error('Saved change tracking data is invalid.');
  }
  snapshots[`${workspaceId}:${fileId}`] = snapshot;
  globalThis.localStorage.setItem(CHANGE_TRACKING_STORAGE_KEY, JSON.stringify(snapshots));
}

export function clearChangeSnapshot(workspaceId, fileId) {
  if (!workspaceId || !fileId || !globalThis.localStorage) return;
  const stored = globalThis.localStorage.getItem(CHANGE_TRACKING_STORAGE_KEY);
  if (!stored) return;
  const snapshots = JSON.parse(stored);
  delete snapshots[`${workspaceId}:${fileId}`];
  globalThis.localStorage.setItem(CHANGE_TRACKING_STORAGE_KEY, JSON.stringify(snapshots));
}
