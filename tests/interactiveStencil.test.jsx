import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { InteractiveStencilCard, STENCIL_PRESETS } from '../src/components/InteractiveStencilCard.jsx';
import { SmartAutoLayoutModal } from '../src/components/SmartAutoLayoutModal.jsx';

describe('InteractiveStencilCard Suite', () => {
  it('renders interactive toggle switch and toggles state on click', () => {
    const updateScene = vi.fn();
    const mockAPI = {
      getSceneElements: () => [{ id: 'stencil_1', type: 'embeddable', docType: 'interactive_stencil', stencilType: 'toggle' }],
      updateScene,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const element = {
      id: 'stencil_1',
      title: 'Dark Mode Switch',
      docType: 'interactive_stencil',
      stencilType: 'toggle',
      label: 'Enable Dark Mode',
      state: { enabled: false },
    };

    act(() => {
      root.render(<InteractiveStencilCard element={element} doodleAPI={mockAPI} isDark={true} />);
    });

    expect(container.textContent).toContain('Dark Mode Switch');
    expect(container.textContent).toContain('Enable Dark Mode');

    const toggleBtn = container.querySelector('button[aria-label="Toggle switch"]');
    expect(toggleBtn).toBeTruthy();

    act(() => {
      toggleBtn.click();
    });

    expect(updateScene).toHaveBeenCalled();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders interactive tabs and switches active tab on click', () => {
    const updateScene = vi.fn();
    const mockAPI = {
      getSceneElements: () => [],
      updateScene,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const element = {
      id: 'stencil_2',
      title: 'Segmented View',
      docType: 'interactive_stencil',
      stencilType: 'tabs',
      tabs: ['Frontend', 'Backend', 'Database'],
      state: { activeTab: 0 },
    };

    act(() => {
      root.render(<InteractiveStencilCard element={element} doodleAPI={mockAPI} isDark={true} />);
    });

    expect(container.textContent).toContain('Frontend');
    expect(container.textContent).toContain('Backend');
    expect(container.textContent).toContain('Database');
    expect(container.textContent).toContain('Active View: Frontend');

    const backendBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Backend');
    expect(backendBtn).toBeTruthy();

    act(() => {
      backendBtn.click();
    });

    expect(container.textContent).toContain('Active View: Backend');
    expect(updateScene).toHaveBeenCalled();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders interactive text input and allows typing directly on canvas', () => {
    const updateScene = vi.fn();
    const mockAPI = {
      getSceneElements: () => [{ id: 'stencil_3', type: 'embeddable', docType: 'interactive_stencil', stencilType: 'input' }],
      updateScene,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const element = {
      id: 'stencil_3',
      title: 'Text Input',
      docType: 'interactive_stencil',
      stencilType: 'input',
      label: 'API Query URL',
      placeholder: 'Enter query...',
      state: { textValue: '' },
    };

    act(() => {
      root.render(<InteractiveStencilCard element={element} doodleAPI={mockAPI} isDark={true} />);
    });

    expect(container.textContent).toContain('API Query URL');
    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Enter query...');

    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(input, 'https://api.domain.com/v1');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(updateScene).toHaveBeenCalled();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders interactive checklist and toggles checkmark items', () => {
    const updateScene = vi.fn();
    const mockAPI = {
      getSceneElements: () => [{ id: 'stencil_4', type: 'embeddable', docType: 'interactive_stencil', stencilType: 'checkbox' }],
      updateScene,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const element = {
      id: 'stencil_4',
      title: 'Checklist',
      docType: 'interactive_stencil',
      stencilType: 'checkbox',
      label: 'Launch Tasks',
      items: [
        { id: 't1', label: 'Security Review', checked: true },
        { id: 't2', label: 'E2E Testing', checked: false },
      ],
      state: {},
    };

    act(() => {
      root.render(<InteractiveStencilCard element={element} doodleAPI={mockAPI} isDark={true} />);
    });

    expect(container.textContent).toContain('Launch Tasks');
    expect(container.textContent).toContain('Security Review');
    expect(container.textContent).toContain('E2E Testing');
    expect(container.textContent).toContain('1/2 Done');

    // Click specifically on the second item's row
    const item2 = container.querySelector('[data-stencil-checkbox-id="t2"]');
    expect(item2).toBeTruthy();

    act(() => {
      item2.click();
    });

    expect(container.textContent).toContain('2/2 Done');
    expect(updateScene).toHaveBeenCalled();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders interactive action button with click state progression', () => {
    const updateScene = vi.fn();
    const mockAPI = {
      getSceneElements: () => [{ id: 'stencil_5', type: 'embeddable', docType: 'interactive_stencil', stencilType: 'button' }],
      updateScene,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const element = {
      id: 'stencil_5',
      title: 'Action Button',
      docType: 'interactive_stencil',
      stencilType: 'button',
      label: 'Deploy Mesh Node',
      state: { buttonState: 'idle' },
    };

    act(() => {
      root.render(<InteractiveStencilCard element={element} doodleAPI={mockAPI} isDark={true} />);
    });

    expect(container.textContent).toContain('Deploy Mesh Node');
    const btn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Deploy Mesh Node'));
    expect(btn).toBeTruthy();

    act(() => {
      btn.click();
    });

    expect(updateScene).toHaveBeenCalled();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('provides all 7 components in STENCIL_PRESETS for InteractiveStencilCard', () => {
    expect(STENCIL_PRESETS.length).toBe(7);
    const types = STENCIL_PRESETS.map(p => p.type);
    expect(types).toContain('toggle');
    expect(types).toContain('tabs');
    expect(types).toContain('dropdown');
    expect(types).toContain('input');
    expect(types).toContain('checkbox');
    expect(types).toContain('button');
    expect(types).toContain('phone');
  });

  it('renders Interactive UI Stencils inside SmartAutoLayoutModal and triggers insertion', () => {
    const insertInteractiveStencil = vi.fn();
    const mockAPI = {
      getSceneElements: () => [],
      getAppState: () => ({ selectedElementIds: {} }),
      insertInteractiveStencil,
      updateScene: vi.fn(),
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <SmartAutoLayoutModal
          isOpen={true}
          onClose={vi.fn()}
          doodleAPI={mockAPI}
          theme="dark"
        />
      );
    });

    expect(container.textContent).toContain('Layout Modes');
    expect(container.textContent).toContain('UI Stencils');

    // Click UI Stencils tab to switch view
    const stencilsTab = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('UI Stencils')
    );
    expect(stencilsTab).toBeTruthy();
    act(() => {
      stencilsTab.click();
    });

    expect(container.textContent).toContain('Toggle Switch');
    expect(container.textContent).toContain('Segmented Tabs');
    expect(container.textContent).toContain('Dropdown Selector');
    expect(container.textContent).toContain('Mobile Device');

    // Click Toggle Switch stencil button
    const toggleBtn = container.querySelector('[data-stencil-button="toggle"]');
    expect(toggleBtn).toBeTruthy();

    act(() => {
      toggleBtn.click();
    });

    expect(insertInteractiveStencil).toHaveBeenCalledWith('toggle');

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
