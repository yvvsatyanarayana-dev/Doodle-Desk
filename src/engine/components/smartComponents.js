import { generateId, versionNonce } from '../elements.js';
import { getCommonBounds } from '../math/geometry.js';

export const SMART_COMPONENTS_STORAGE_KEY = 'doodle_smart_components_v1';

function componentElement(element, x, y) {
  const sceneElement = { ...element };
  delete sceneElement.componentId;
  delete sceneElement.componentInstanceId;
  delete sceneElement.componentElementKey;
  delete sceneElement.componentOriginX;
  delete sceneElement.componentOriginY;
  return { ...sceneElement, x, y };
}

export function readSmartComponents() {
  if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
  const stored = globalThis.localStorage.getItem(SMART_COMPONENTS_STORAGE_KEY);
  if (!stored) return [];
  const parsed = JSON.parse(stored);
  if (!Array.isArray(parsed) || parsed.some(component =>
    !component || typeof component.id !== 'string' ||
    typeof component.name !== 'string' || !Array.isArray(component.elements)
  )) {
    throw new Error('The saved component library is invalid.');
  }
  return parsed;
}

export function writeSmartComponents(components) {
  if (!Array.isArray(components)) throw new TypeError('Components must be an array.');
  try {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
    globalThis.localStorage.setItem(SMART_COMPONENTS_STORAGE_KEY, JSON.stringify(components));
    return components;
  } catch (error) {
    console.error('Unable to save the smart component library', error);
    throw error;
  }
}

export function createSmartComponent(elements, name, files = {}, id = generateId()) {
  const active = elements.filter(element => !element.isDeleted);
  if (active.length === 0) throw new Error('Select at least one object to create a component.');
  const trimmedName = String(name || '').trim();
  if (!trimmedName) throw new Error('Enter a name for this component.');
  const bounds = getCommonBounds(active);
  if (!bounds) throw new Error('The selected objects do not have valid bounds.');

  const elementKeys = new Map(active.map(element => [
    element.id,
    element.componentElementKey || element.id,
  ]));
  const remapId = (id) => elementKeys.get(id) || id;
  const componentElements = active.map(element => {
    const key = elementKeys.get(element.id);
    const template = componentElement(element, element.x - bounds.x, element.y - bounds.y);
    if (Array.isArray(template.boundElements)) {
      template.boundElements = template.boundElements.map(binding => ({ ...binding, id: remapId(binding.id) }));
    }
    if (template.containerId) template.containerId = remapId(template.containerId);
    if (template.frameId) template.frameId = remapId(template.frameId);
    if (template.startBinding?.elementId) {
      template.startBinding = { ...template.startBinding, elementId: remapId(template.startBinding.elementId) };
    }
    if (template.endBinding?.elementId) {
      template.endBinding = { ...template.endBinding, elementId: remapId(template.endBinding.elementId) };
    }
    return { ...template, id: key, componentElementKey: key };
  });
  const componentFiles = {};
  for (const element of active) {
    if (element.type !== 'image') continue;
    const sourceId = element.fileId || element.id;
    if (files[sourceId]) componentFiles[sourceId] = { ...files[sourceId] };
  }

  return {
    id,
    name: trimmedName,
    elements: componentElements,
    files: componentFiles,
    width: bounds.width,
    height: bounds.height,
    updatedAt: Date.now(),
  };
}

function makeInstanceElements(component, x, y, instanceId, existingByKey = new Map()) {
  const elementIds = new Map();
  const groupIds = new Map();
  const fileIds = new Map();

  for (const element of component.elements) {
    const key = element.componentElementKey || element.id;
    elementIds.set(key, existingByKey.get(key)?.id || generateId());
    for (const groupId of element.groupIds || []) {
      if (!groupIds.has(groupId)) groupIds.set(groupId, generateId());
    }
    if (element.type === 'image') {
      const old = existingByKey.get(key);
      fileIds.set(key, old?.fileId || old?.id || generateId());
    }
  }

  const elements = component.elements.map(template => {
    const key = template.componentElementKey || template.id;
    const existing = existingByKey.get(key);
    const element = componentElement(
      template,
      x + template.x,
      y + template.y
    );
    const id = elementIds.get(key);
    const remapId = (value) => elementIds.get(value) || value;
    if (Array.isArray(element.boundElements)) {
      element.boundElements = element.boundElements.map(binding => ({
        ...binding,
        id: remapId(binding.id),
      }));
    }
    if (element.containerId) element.containerId = remapId(element.containerId);
    if (element.frameId) element.frameId = remapId(element.frameId);
    if (element.startBinding?.elementId) {
      element.startBinding = { ...element.startBinding, elementId: remapId(element.startBinding.elementId) };
    }
    if (element.endBinding?.elementId) {
      element.endBinding = { ...element.endBinding, elementId: remapId(element.endBinding.elementId) };
    }
    element.groupIds = (element.groupIds || []).map(groupId => groupIds.get(groupId) || groupId);
    if (element.type === 'image') element.fileId = fileIds.get(key);

    return {
      ...element,
      id,
      componentId: component.id,
      componentInstanceId: instanceId,
      componentElementKey: key,
      componentOriginX: x,
      componentOriginY: y,
      version: (existing?.version || 0) + 1,
      versionNonce: versionNonce(),
      updated: Date.now(),
    };
  });

  const files = {};
  for (const template of component.elements) {
    if (template.type !== 'image') continue;
    const key = template.componentElementKey || template.id;
    const sourceId = template.fileId || template.id;
    const source = component.files?.[sourceId];
    if (source) {
      const targetId = fileIds.get(key);
      files[targetId] = { ...source, id: targetId };
    }
  }
  return { elements, files };
}

export function instantiateSmartComponent(component, x, y) {
  if (!component?.elements?.length) throw new Error('This component has no objects to insert.');
  return makeInstanceElements(component, x, y, generateId());
}

export function updateSmartComponentInstances(elements, component) {
  const instances = new Map();
  for (const element of elements) {
    if (element.isDeleted || element.componentId !== component.id || !element.componentInstanceId) continue;
    if (!instances.has(element.componentInstanceId)) instances.set(element.componentInstanceId, []);
    instances.get(element.componentInstanceId).push(element);
  }
  if (instances.size === 0) return { elements, files: {}, instanceCount: 0 };

  const replacements = new Map();
  const files = {};
  for (const [instanceId, members] of instances) {
    const bounds = getCommonBounds(members);
    const originX = bounds?.x ?? Math.min(...members.map(element => element.x));
    const originY = bounds?.y ?? Math.min(...members.map(element => element.y));
    const existingByKey = new Map(members.map(element => [
      element.componentElementKey || element.id,
      element,
    ]));
    const instance = makeInstanceElements(component, originX, originY, instanceId, existingByKey);
    replacements.set(instanceId, instance.elements);
    Object.assign(files, instance.files);
  }

  const nextElements = [];
  const insertedInstances = new Set();
  for (const element of elements) {
    const replacement = element.componentInstanceId && replacements.get(element.componentInstanceId);
    if (!replacement) {
      nextElements.push(element);
      continue;
    }
    if (insertedInstances.has(element.componentInstanceId)) continue;
    nextElements.push(...replacement);
    insertedInstances.add(element.componentInstanceId);
  }
  return { elements: nextElements, files, instanceCount: instances.size };
}
