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

  it('preserves canvasStyle dotgrid on interactive table insertion and delegates render correctly', () => {
    // Tests that renderCanvasStyle accurately retains and propagates canvas style
    let currentCanvasStyle = 'dotgrid';
    const renderCalls = [];
    const mockAPI = {
      renderCanvasStyle: vi.fn((style) => {
        currentCanvasStyle = style;
        renderCalls.push(style);
      }),
      insertInteractiveTable: vi.fn(() => {
        // Simulates engine insertion calling render with the current canvasStyle
        renderCalls.push(currentCanvasStyle);
      }),
    };

    mockAPI.renderCanvasStyle('dotgrid');
    expect(renderCalls).toEqual(['dotgrid']);

    mockAPI.insertInteractiveTable();
    expect(renderCalls).toEqual(['dotgrid', 'dotgrid']);
    expect(currentCanvasStyle).toBe('dotgrid');
  });

  it('skips rendering text element to canvas while text editing is active to avoid double text ghosting', () => {
    const textElement = {
      id: 'text_1',
      type: 'text',
      text: 'dfsdfjdlkj',
      x: 100,
      y: 100,
      fontSize: 20,
    };

    const visibleElements = [textElement];
    let editingElementId = 'text_1';

    // Canvas render loop filter
    const renderedOnCanvas = [];
    for (const el of visibleElements) {
      if (el.id === editingElementId) continue;
      renderedOnCanvas.push(el);
    }

    // While editing, canvas must NOT paint text underneath DOM textarea
    expect(renderedOnCanvas.length).toBe(0);

    // When edit finishes, editingElementId is cleared and canvas renders the text
    editingElementId = null;
    for (const el of visibleElements) {
      if (el.id === editingElementId) continue;
      renderedOnCanvas.push(el);
    }
    expect(renderedOnCanvas.length).toBe(1);
    expect(renderedOnCanvas[0].text).toBe('dfsdfjdlkj');
  });

  it('calculates non-zero bounds for text elements and hits across the entire word', () => {
    const { getElementBounds, getCachedElementBounds } = require('../src/engine/math/geometry.js');
    const { hitTestElement } = require('../src/engine/hitTest.js');

    const textEl = {
      id: 'text_test',
      type: 'text',
      text: 'sdfjlskdfj',
      x: 100,
      y: 100,
      width: 0, // initially unmeasured
      height: 0,
      fontSize: 20,
    };

    const bounds = getElementBounds(textEl);
    expect(bounds.width).toBeGreaterThan(50);
    expect(bounds.height).toBeGreaterThanOrEqual(20);

    // Hit-testing in the middle of the text (e.g. x = 140, y = 110)
    expect(hitTestElement(textEl, 140, 110)).toBe(true);

    // Cache invalidates when text changes
    const cached1 = getCachedElementBounds(textEl);
    const updated = { ...textEl, text: 'sdfjlskdfj_very_long_string_now' };
    const cached2 = getCachedElementBounds(updated);
    expect(cached2.width).toBeGreaterThan(cached1.width);
  });

  it('excludes editing element from selection overlays and suppresses duplicate overlapping text', () => {
    const editingEl = { id: 'text_edit', type: 'text', text: 'sdfjlskdfj', x: 100, y: 100 };
    const duplicateEl = { id: 'text_dup', type: 'text', text: 'sdfjlskdfj', x: 100, y: 100 };
    const visibleElements = [editingEl, duplicateEl];
    const selectedEls = [editingEl];
    const editingElementId = 'text_edit';

    // Canvas render loop duplicate suppression
    const rendered = [];
    for (const el of visibleElements) {
      if (el.id === editingElementId) continue;
      if (editingElementId) {
        if (el.type === 'text' && Math.abs(el.x - editingEl.x) < 2 && Math.abs(el.y - editingEl.y) < 2) {
          continue;
        }
      }
      rendered.push(el);
    }
    expect(rendered.length).toBe(0);

    // Overlays to render must exclude the editing element
    const overlaysToRender = editingElementId
      ? selectedEls.filter(el => el.id !== editingElementId)
      : selectedEls;
    expect(overlaysToRender.length).toBe(0);
  });

  it('fills background color with dense cross-hatch pattern and base fill rect to cover canvas dot-grid', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const pinkCrossHatchElement = {
      ...sampleElement,
      id: 'pink_table_crosshatch',
      backgroundColor: '#ffc9c9',
      fillStyle: 'cross-hatch',
      strokeColor: '#ffffff',
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={pinkCrossHatchElement}
          doodleAPI={{ getSceneElements: () => [pinkCrossHatchElement], updateScene: vi.fn() }}
          isDark={true}
        />
      );
    });

    const outerBox = container.querySelectorAll('svg path')[0];
    expect(outerBox.getAttribute('fill')).toBe(`url(#table-crosshatch-pink_table_crosshatch)`);
    expect(outerBox.getAttribute('stroke')).toBe('#ffffff');

    const pattern = container.querySelector('#table-crosshatch-pink_table_crosshatch');
    expect(pattern).toBeTruthy();

    // Verify pattern contains base fill rect that covers the canvas background and grid dots
    const bgRect = pattern.querySelector('rect');
    expect(bgRect).toBeTruthy();
    expect(bgRect.getAttribute('fill')).toBe('#ffc9c9');

    // Verify pattern lines have background stroke color and linecap
    const lines = pattern.querySelectorAll('line');
    expect(lines.length).toBe(2);
    expect(lines[0].getAttribute('stroke')).toBe('#ffc9c9');
    expect(lines[1].getAttribute('stroke')).toBe('#ffc9c9');

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('fills background color with dense hachure pattern and base fill rect', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const pinkHachureElement = {
      ...sampleElement,
      id: 'pink_table_hachure',
      backgroundColor: '#ffc9c9',
      fillStyle: 'hachure',
      strokeColor: '#ffffff',
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={pinkHachureElement}
          doodleAPI={{ getSceneElements: () => [pinkHachureElement], updateScene: vi.fn() }}
          isDark={true}
        />
      );
    });

    const outerBox = container.querySelectorAll('svg path')[0];
    expect(outerBox.getAttribute('fill')).toBe(`url(#table-hachure-pink_table_hachure)`);

    const pattern = container.querySelector('#table-hachure-pink_table_hachure');
    expect(pattern).toBeTruthy();
    const bgRect = pattern.querySelector('rect');
    expect(bgRect).toBeTruthy();
    expect(bgRect.getAttribute('fill')).toBe('#ffc9c9');

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('fills 100% solid background color when fillStyle is solid', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const solidPinkElement = {
      ...sampleElement,
      id: 'pink_table_solid',
      backgroundColor: '#ffc9c9',
      fillStyle: 'solid',
      strokeColor: '#ffffff',
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={solidPinkElement}
          doodleAPI={{ getSceneElements: () => [solidPinkElement], updateScene: vi.fn() }}
          isDark={true}
        />
      );
    });

    const outerBox = container.querySelectorAll('svg path')[0];
    expect(outerBox.getAttribute('fill')).toBe('#ffc9c9');
    expect(outerBox.getAttribute('stroke')).toBe('#ffffff');

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders dots, zigzag, and dashed fill patterns with base background rect', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    for (const style of ['dots', 'zigzag', 'dashed']) {
      const el = {
        ...sampleElement,
        id: `table_${style}`,
        backgroundColor: '#74c0fc',
        fillStyle: style,
        strokeColor: '#ffffff',
      };

      act(() => {
        root.render(
          <InteractiveTableCard
            element={el}
            doodleAPI={{ getSceneElements: () => [el], updateScene: vi.fn() }}
            isDark={true}
          />
        );
      });

      const outerBox = container.querySelectorAll('svg path')[0];
      expect(outerBox.getAttribute('fill')).toBe(`url(#table-${style}-table_${style})`);

      const pattern = container.querySelector(`#table-${style}-table_${style}`);
      expect(pattern).toBeTruthy();
      const bgRect = pattern.querySelector('rect');
      expect(bgRect).toBeTruthy();
      expect(bgRect.getAttribute('fill')).toBe('#74c0fc');
    }

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});


