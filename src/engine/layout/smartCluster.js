/**
 * Smart Magnetic Cluster Enclosure Engine
 * Automatically computes tight, aesthetically padded enclosure frames
 * around any group of canvas elements with auto-hugging reactive physics.
 */

import { generateId, ELEMENT_TYPES } from '../elements.js';

export const CLUSTER_DEFAULTS = {
  PADDING: 28,
  HEADER_HEIGHT: 36,
  BORDER_COLOR: '#6366f1',
  BG_COLOR: 'rgba(99, 102, 241, 0.05)',
};

/**
 * Computes tight bounding box for a set of canvas elements.
 */
export function computeClusterBounds(elements, padding = CLUSTER_DEFAULTS.PADDING, headerHeight = CLUSTER_DEFAULTS.HEADER_HEIGHT) {
  const activeElements = (elements || []).filter(el => !el.isDeleted && !el.isHidden);
  if (activeElements.length === 0) {
    return { x: 0, y: 0, width: 320, height: 220, minX: 0, minY: 0, maxX: 320, maxY: 220 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of activeElements) {
    const x = el.x ?? 0;
    const y = el.y ?? 0;
    const w = el.width ?? 100;
    const h = el.height ?? 60;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  const width = Math.round((maxX - minX) + padding * 2);
  const height = Math.round((maxY - minY) + padding * 2 + headerHeight);
  const x = Math.round(minX - padding);
  const y = Math.round(minY - padding - headerHeight);

  return { x, y, width, height, minX, minY, maxX, maxY };
}

/**
 * Creates a smart cluster frame element enclosing target elements.
 */
export function createSmartCluster(targetElements, options = {}) {
  const padding = options.padding ?? CLUSTER_DEFAULTS.PADDING;
  const headerHeight = options.headerHeight ?? CLUSTER_DEFAULTS.HEADER_HEIGHT;
  const bounds = computeClusterBounds(targetElements, padding, headerHeight);

  const clusterId = `cluster_${generateId()}`;
  const clusterName = options.name || options.title || 'Smart Cluster';
  const childIds = (targetElements || []).map(el => el.id);

  const clusterElement = {
    id: clusterId,
    type: ELEMENT_TYPES.FRAME,
    isCluster: true,
    name: clusterName,
    title: clusterName,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    strokeColor: options.strokeColor || CLUSTER_DEFAULTS.BORDER_COLOR,
    backgroundColor: options.backgroundColor || CLUSTER_DEFAULTS.BG_COLOR,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'dashed',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 }, // Smooth rounded aesthetic
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 100000),
    isDeleted: false,
    childElementIds: childIds,
  };

  // Associate enclosed elements with this cluster
  const updatedChildElements = (targetElements || []).map(el => ({
    ...el,
    frameId: clusterId,
    version: (el.version || 1) + 1,
    versionNonce: Math.floor(Math.random() * 100000),
  }));

  return { clusterElement, updatedChildElements };
}

/**
 * Recomputes cluster frame dimensions to hug all children dynamically.
 */
export function recomputeClusterAutoHug(clusterElement, allElements, padding = CLUSTER_DEFAULTS.PADDING) {
  if (!clusterElement || !clusterElement.isCluster) return clusterElement;

  const childIds = new Set(clusterElement.childElementIds || []);
  const childElements = (allElements || []).filter(el =>
    !el.isDeleted && (childIds.has(el.id) || el.frameId === clusterElement.id)
  );

  if (childElements.length === 0) return clusterElement;

  const bounds = computeClusterBounds(childElements, padding, CLUSTER_DEFAULTS.HEADER_HEIGHT);

  return {
    ...clusterElement,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    version: (clusterElement.version || 1) + 1,
    versionNonce: Math.floor(Math.random() * 100000),
  };
}
