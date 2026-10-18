import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { InteractiveTableFlashcardsModal } from '../src/components/InteractiveTableFlashcardsModal.jsx';
import { InteractiveTableCard } from '../src/components/InteractiveTableCard.jsx';

describe('Interactive Table Flashcards Feature', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const mockTableElement = {
    id: 'vocab_table_1',
    type: 'embeddable',
    docType: 'interactive_table',
    title: 'Spanish Vocabulary Study Table',
    strokeColor: '#6366f1',
    fontFamily: 3,
    tableData: {
      columns: [
        { id: 'col_q', title: 'Spanish Word', width: 220 },
        { id: 'col_a', title: 'English Meaning', width: 320 },
        { id: 'col_notes', title: 'Example / Notes', width: 280 },
      ],
      rows: [
        { id: 'row_1', cells: { col_q: 'Hola', col_a: 'Hello', col_notes: 'Informal greeting' } },
        { id: 'row_2', cells: { col_q: 'Gracias', col_a: 'Thank you', col_notes: 'Polite expression' } },
        { id: 'row_3', cells: { col_q: 'Por favor', col_a: 'Please', col_notes: 'When asking' } },
      ],
    },
  };

  it('renders flashcard modal using interactive table columns for question and answer', () => {
    act(() => {
      root.render(
        <InteractiveTableFlashcardsModal
          isOpen={true}
          onClose={vi.fn()}
          tableElement={mockTableElement}
          isDark={true}
        />
      );
    });

    // Header title and table title
    expect(container.textContent).toContain('Table Flashcards');
    expect(container.textContent).toContain('Spanish Vocabulary Study Table');

    // First card question (Hola) is visible
    expect(container.textContent).toContain('Hola');
    expect(container.textContent).toContain('Card 1 of 3');
    expect(container.textContent).toContain('SPANISH WORD');
  });

  it('flips the card to reveal the answer when clicked or flipped', () => {
    act(() => {
      root.render(
        <InteractiveTableFlashcardsModal
          isOpen={true}
          onClose={vi.fn()}
          tableElement={mockTableElement}
          isDark={false}
        />
      );
    });

    // Check front is active
    expect(container.textContent).toContain('Hola');

    // Find and click the Flip button
    const flipBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Flip')
    );
    expect(flipBtn).toBeTruthy();

    act(() => {
      flipBtn.click();
    });

    // Answer is now visible on the back face
    expect(container.textContent).toContain('Hello');
    expect(container.textContent).toContain('ENGLISH MEANING');
    expect(container.textContent).toContain('Got It!');
    expect(container.textContent).toContain('Still Learning');
  });

  it('allows swapping Question and Answer columns', () => {
    act(() => {
      root.render(
        <InteractiveTableFlashcardsModal
          isOpen={true}
          onClose={vi.fn()}
          tableElement={mockTableElement}
          isDark={true}
        />
      );
    });

    // Initially: Question = Spanish Word (Hola), Answer = English Meaning (Hello)
    const swapBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Swap')
    );
    expect(swapBtn).toBeTruthy();

    act(() => {
      swapBtn.click();
    });

    // Now front question is English Meaning ("Hello")
    expect(container.textContent).toContain('Hello');
  });

  it('tracks Got It! (Mastered) and Still Learning ratings and advances cards', () => {
    act(() => {
      root.render(
        <InteractiveTableFlashcardsModal
          isOpen={true}
          onClose={vi.fn()}
          tableElement={mockTableElement}
          isDark={true}
        />
      );
    });

    // Flip to answer
    const flipBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Flip')
    );
    act(() => {
      flipBtn.click();
    });

    // Click "Got It!"
    const gotItBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Got It!')
    );
    expect(gotItBtn).toBeTruthy();

    act(() => {
      gotItBtn.click();
    });

    // Mastered count increases
    expect(container.textContent).toContain('1 Mastered');
  });

  it('navigates through Next and Prev cards smoothly', () => {
    act(() => {
      root.render(
        <InteractiveTableFlashcardsModal
          isOpen={true}
          onClose={vi.fn()}
          tableElement={mockTableElement}
          isDark={false}
        />
      );
    });

    expect(container.textContent).toContain('Card 1 of 3');
    expect(container.textContent).toContain('Hola');

    const nextBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Next'
    );
    expect(nextBtn).toBeTruthy();

    act(() => {
      nextBtn.click();
    });

    expect(container.textContent).toContain('Card 2 of 3');
    expect(container.textContent).toContain('Gracias');

    const prevBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Prev'
    );
    expect(prevBtn).toBeTruthy();

    act(() => {
      prevBtn.click();
    });

    expect(container.textContent).toContain('Card 1 of 3');
    expect(container.textContent).toContain('Hola');
  });

  it('provides a Flashcards button directly on InteractiveTableCard toolbar', () => {
    const mockAPI = {
      getSceneElements: vi.fn(() => [mockTableElement]),
      updateScene: vi.fn(),
      setSelectedElements: vi.fn(),
    };

    act(() => {
      root.render(
        <InteractiveTableCard
          element={mockTableElement}
          doodleAPI={mockAPI}
          isDark={true}
        />
      );
    });

    const tableShape = container.querySelector('.interactive-table-shape');
    expect(tableShape).toBeTruthy();

    // Trigger hover to reveal toolbar
    act(() => {
      tableShape.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    // Flashcards button is present on the interactive table floating toolbar
    const flashcardsBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Flashcards')
    );
    expect(flashcardsBtn).toBeTruthy();

    // Clicking it opens the Flashcard modal
    act(() => {
      flashcardsBtn.click();
    });

    const overlay = container.querySelector('.interactive-table-flashcards-overlay');
    expect(overlay).toBeTruthy();
    expect(container.textContent).toContain('Table Flashcards');
    expect(container.textContent).toContain('Hola');
  });

  it('renders Interactive Table Flashcards in CanvasExtraToolsDropdown with colored icon', async () => {
    const { CanvasExtraToolsDropdown } = await import('../src/components/CanvasExtraToolsDropdown.jsx');
    const onOpenFlashcards = vi.fn();

    // Create trigger element that CanvasExtraToolsDropdown expects
    const trigger = document.createElement('button');
    trigger.className = 'App-toolbar__extra-tools-trigger';
    document.body.appendChild(trigger);

    act(() => {
      root.render(
        <CanvasExtraToolsDropdown
          onOpenFlashcards={onOpenFlashcards}
        />
      );
    });

    // Click trigger with pointerdown to open dropdown
    act(() => {
      trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    });

    const menuItems = Array.from(container.querySelectorAll('.canvas-tool-menu-item'));
    const flashcardItem = menuItems.find((el) => el.textContent.includes('Interactive Table Flashcards'));
    expect(flashcardItem).toBeTruthy();

    // Verify colored icon is present
    const icon = flashcardItem.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon.style.color).toBe('rgb(251, 191, 36)'); // #fbbf24

    // Clicking it calls onOpenFlashcards
    act(() => {
      flashcardItem.click();
    });
    expect(onOpenFlashcards).toHaveBeenCalled();

    trigger.remove();
  });
});

