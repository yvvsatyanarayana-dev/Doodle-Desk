import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { InteractiveTableCard } from '../src/components/InteractiveTableCard.jsx';

describe('InteractiveTableCard (Pure Canvas Shape)', () => {
  const sampleElement = {
    id: 'test_table_1',
    type: 'embeddable',
    docType: 'interactive_table',
    title: 'Words & Meaning',
    strokeColor: '#1e1e1e',
    strokeWidth: 2,
    backgroundColor: '#ffffff',
    x: 100,
    y: 100,
    width: 640,
    height: 400,
    tableData: {
      columns: [
        { id: 'col_1', title: 'Words', width: 260 },
        { id: 'col_2', title: 'Meaning', width: 380 },
      ],
      rows: [
        { id: 'row_1', cells: { col_1: 'Ubiquitous', col_2: 'Present everywhere.' } },
        { id: 'row_2', cells: { col_1: 'Resilient', col_2: 'Able to withstand difficulties.' } },
      ],
      autoArrange: true,
    },
  };

  it('renders clean shape table headers and rows without window app bars or row numbers', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockAPI = {
      getSceneElements: vi.fn(() => [sampleElement]),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={sampleElement}
          doodleAPI={mockAPI}
          isDark={false}
        />
      );
    });

    // Contains headers and contents
    expect(container.textContent).toContain('Words');
    expect(container.textContent).toContain('Meaning');
    expect(container.textContent).toContain('Ubiquitous');
    expect(container.textContent).toContain('Present everywhere.');

    // Does NOT contain window app chrome or row numbers
    expect(container.textContent).not.toContain('Vocabulary & Notes Table');
    expect(container.textContent).not.toContain('Auto-fit On');
    expect(container.textContent).not.toContain('Tip:');

    // Checks native shape hand-drawn SVG vector styling
    const tableShape = container.querySelector('.interactive-table-shape');
    expect(tableShape).toBeTruthy();
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(container.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(4);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('allows adding and deleting rows smoothly via action bar and hover controls', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockAPI = {
      getSceneElements: vi.fn(() => [sampleElement]),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={sampleElement}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    const tableShape = container.querySelector('.interactive-table-shape');

    // Trigger hover
    act(() => {
      tableShape.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    // Floating action bar has Add Row and Delete Row
    const addRowBtn = container.querySelector('button[title*="Add Row"]');
    expect(addRowBtn).toBeTruthy();

    act(() => {
      addRowBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockAPI.updateScene).toHaveBeenCalled();
    let updatedCall = mockAPI.updateScene.mock.calls[0][0];
    let updatedTable = updatedCall.elements.find(el => el.id === sampleElement.id);
    expect(updatedTable.tableData.rows.length).toBe(3);

    // Delete Row
    const delRowBtn = container.querySelector('button[title*="Delete Active Row"]');
    expect(delRowBtn).toBeTruthy();

    act(() => {
      delRowBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    updatedCall = mockAPI.updateScene.mock.calls[1][0];
    updatedTable = updatedCall.elements.find(el => el.id === sampleElement.id);
    expect(updatedTable.tableData.rows.length).toBe(2);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('allows adding and deleting columns smoothly', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockAPI = {
      getSceneElements: vi.fn(() => [sampleElement]),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={sampleElement}
          doodleAPI={mockAPI}
          isDark={false}
        />
      );
    });

    const tableShape = container.querySelector('.interactive-table-shape');

    act(() => {
      tableShape.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    // Add Column
    const addColBtn = container.querySelector('button[title*="Add Column"]');
    expect(addColBtn).toBeTruthy();

    act(() => {
      addColBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(mockAPI.updateScene).toHaveBeenCalled();
    let updatedCall = mockAPI.updateScene.mock.calls[0][0];
    let updatedTable = updatedCall.elements.find(el => el.id === sampleElement.id);
    expect(updatedTable.tableData.columns.length).toBe(3);

    // Delete Column
    const delColBtn = container.querySelector('button[title*="Delete Active Column"]');
    expect(delColBtn).toBeTruthy();

    act(() => {
      delColBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    updatedCall = mockAPI.updateScene.mock.calls[1][0];
    updatedTable = updatedCall.elements.find(el => el.id === sampleElement.id);
    expect(updatedTable.tableData.columns.length).toBe(2);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('allows clicking into a cell and editing text inline', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockAPI = {
      getSceneElements: vi.fn(() => [sampleElement]),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={sampleElement}
          doodleAPI={mockAPI}
          isDark={false}
        />
      );
    });

    // Find cell with "Ubiquitous"
    const cellDiv = [...container.querySelectorAll('div')].find(el => el.textContent === 'Ubiquitous');
    expect(cellDiv).toBeTruthy();

    act(() => {
      cellDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Textarea is focused for in-place editing
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('Ubiquitous');

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(textarea, 'Ubiquitous (Everywhere)');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(mockAPI.updateScene).toHaveBeenCalled();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('matches canvas shape style with matching grid lines, cross-hatch fill, and flex rows', () => {
    const customHatchElement = {
      ...sampleElement,
      id: 'table_hatch_1',
      strokeColor: '#e03131',
      strokeWidth: 3,
      backgroundColor: '#ffc9c9',
      fillStyle: 'cross-hatch',
      fontFamily: 5,
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockAPI = {
      getSceneElements: vi.fn(() => [customHatchElement]),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={customHatchElement}
          doodleAPI={mockAPI}
          isDark={false}
        />
      );
    });

    const tableShape = container.querySelector('.interactive-table-shape');
    expect(tableShape).toBeTruthy();
    expect(tableShape.style.fontFamily).toContain('Doodlefont');

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const outerBox = container.querySelectorAll('svg path')[0];
    expect(outerBox.getAttribute('stroke')).toBe('#e03131');

    // Cross-hatch SVG pattern is rendered
    const crossHatchPattern = container.querySelector('pattern[id*="table-crosshatch"]');
    expect(crossHatchPattern).toBeTruthy();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('keeps floating toolbar rock-solid when selected and includes Flashcards study button', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mockAPI = {
      getSceneElements: vi.fn(() => [sampleElement]),
      updateScene: vi.fn(),
      setSelectedElements: vi.fn(),
    };

    // Render with table selected in appState
    act(() => {
      root.render(
        <InteractiveTableCard
          element={sampleElement}
          doodleAPI={mockAPI}
          appState={{ selectedElementIds: { [sampleElement.id]: true } }}
          isDark={false}
        />
      );
    });

    // Toolbar bridge is rendered automatically without needing mouse hover
    const toolbarBridge = container.querySelector('.table-toolbar-bridge');
    expect(toolbarBridge).toBeTruthy();

    // Contains normal table operations
    expect(container.querySelector('button[title*="Add Column"]')).toBeTruthy();
    expect(container.querySelector('button[title*="Add Row"]')).toBeTruthy();
    expect(container.querySelector('button[title*="Delete Active Column"]')).toBeTruthy();
    expect(container.querySelector('button[title*="Delete Active Row"]')).toBeTruthy();

    // Flashcard option is present directly on the toolbar
    const flashcardButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.toLowerCase().includes('flashcard')
    );
    expect(flashcardButton).toBeTruthy();

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
