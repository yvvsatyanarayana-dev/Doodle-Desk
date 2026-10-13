import { afterEach, describe, expect, it } from 'vitest';
import {
  createSmartComponent,
  instantiateSmartComponent,
  readSmartComponents,
  SMART_COMPONENTS_STORAGE_KEY,
  updateSmartComponentInstances,
  writeSmartComponents,
} from '../src/engine/components/smartComponents.js';

afterEach(() => {
  localStorage.clear();
});

describe('Reusable smart components', () => {
  it('persists and validates the component library', () => {
    const component = createSmartComponent([
      { id: 'shape', type: 'rectangle', x: 12, y: 16, width: 80, height: 40 },
    ], 'Card');

    writeSmartComponents([component]);
    expect(readSmartComponents()).toEqual([component]);

    localStorage.setItem(SMART_COMPONENTS_STORAGE_KEY, '{"invalid":true}');
    expect(() => readSmartComponents()).toThrow('saved component library is invalid');
  });

  it('creates independent instances and remaps internal bindings and groups', () => {
    const component = createSmartComponent([
      { id: 'box', type: 'rectangle', x: 10, y: 20, width: 100, height: 60, groupIds: ['source-group'] },
      { id: 'label', type: 'text', x: 25, y: 35, width: 50, height: 20, containerId: 'box', groupIds: ['source-group'] },
      {
        id: 'connector',
        type: 'arrow',
        x: 110,
        y: 30,
        width: 60,
        height: 10,
        startBinding: { elementId: 'box', focus: 0, gap: 1 },
        groupIds: ['source-group'],
      },
    ], 'Connected card');

    const first = instantiateSmartComponent(component, 200, 300);
    const second = instantiateSmartComponent(component, 500, 600);
    const firstBox = first.elements.find(element => element.type === 'rectangle');
    const firstLabel = first.elements.find(element => element.type === 'text');
    const firstConnector = first.elements.find(element => element.type === 'arrow');
    const secondBox = second.elements.find(element => element.type === 'rectangle');
    const secondLabel = second.elements.find(element => element.type === 'text');

    expect(firstLabel.containerId).toBe(firstBox.id);
    expect(firstConnector.startBinding.elementId).toBe(firstBox.id);
    expect(firstBox.id).not.toBe(secondBox.id);
    expect(firstLabel.groupIds[0]).toBe(firstBox.groupIds[0]);
    expect(secondLabel.groupIds[0]).toBe(secondBox.groupIds[0]);
    expect(firstBox.groupIds[0]).not.toBe(secondBox.groupIds[0]);
    expect(firstBox.componentInstanceId).not.toBe(secondBox.componentInstanceId);
  });

  it('keeps moved instances anchored when applying an updated master', () => {
    const component = createSmartComponent([
      { id: 'box', type: 'rectangle', x: 10, y: 20, width: 100, height: 60 },
      { id: 'label', type: 'text', x: 25, y: 35, width: 50, height: 20, containerId: 'box' },
    ], 'Card');
    const inserted = instantiateSmartComponent(component, 200, 300);
    const movedElements = inserted.elements.map(element => ({
      ...element,
      x: element.x + 500,
      y: element.y + 250,
    }));
    const changedMaster = createSmartComponent(movedElements, 'Card', inserted.files, component.id);
    changedMaster.elements = changedMaster.elements.map(element =>
      element.type === 'rectangle' ? { ...element, width: 140 } : element
    );

    const updated = updateSmartComponentInstances(movedElements, changedMaster);
    const updatedBox = updated.elements.find(element => element.type === 'rectangle');

    expect(updated.instanceCount).toBe(1);
    expect(updatedBox.x).toBe(700);
    expect(updatedBox.y).toBe(550);
    expect(updatedBox.width).toBe(140);
  });

  it('copies image assets to distinct instance file IDs', () => {
    const files = { asset: { id: 'asset', dataURL: 'data:image/png;base64,AA==' } };
    const component = createSmartComponent([
      { id: 'image-element', type: 'image', x: 20, y: 30, width: 40, height: 25, fileId: 'asset' },
    ], 'Image', files);

    const first = instantiateSmartComponent(component, 0, 0);
    const second = instantiateSmartComponent(component, 100, 100);
    const firstElement = first.elements[0];
    const secondElement = second.elements[0];

    expect(firstElement.fileId).not.toBe(secondElement.fileId);
    expect(first.files[firstElement.fileId].dataURL).toBe(files.asset.dataURL);
    expect(second.files[secondElement.fileId].dataURL).toBe(files.asset.dataURL);
  });
});
