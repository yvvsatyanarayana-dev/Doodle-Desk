import { describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageLearningStudioModal } from '../src/components/LanguageLearningStudioModal.jsx';

describe('LanguageLearningStudioModal', () => {
  const mockDoodleAPI = {
    getSceneElements: vi.fn(() => []),
    updateScene: vi.fn(),
  };

  const renderComponent = (ui) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(ui);
    });
    return { container, root };
  };

  it('renders modal header, tabs, and German gender colors', () => {
    const { container } = renderComponent(
      <LanguageLearningStudioModal
        isOpen={true}
        onClose={vi.fn()}
        doodleAPI={mockDoodleAPI}
      />
    );

    expect(container.textContent).toContain('Human Language Learning Studio');
    expect(container.textContent).toContain('German Studio');
    expect(container.textContent).toContain('English (Word Power Roots)');
    expect(container.textContent).toContain('Custom Card Builder');

    // Check gender articles in header
    expect(container.textContent).toContain('der');
    expect(container.textContent).toContain('die');
    expect(container.textContent).toContain('das');
  });

  it('filters German vocabulary and switches to English Word Power Roots tab', () => {
    const { container } = renderComponent(
      <LanguageLearningStudioModal
        isOpen={true}
        onClose={vi.fn()}
        doodleAPI={mockDoodleAPI}
      />
    );

    expect(container.textContent).toContain('Apfel');

    // Find and click English tab button
    const buttons = Array.from(container.querySelectorAll('button'));
    const englishBtn = buttons.find((b) => b.textContent.includes('English (Word Power Roots)'));
    expect(englishBtn).toBeDefined();

    act(() => {
      englishBtn.click();
    });

    expect(container.textContent).toContain('Word Power Made Easy');
    expect(container.textContent).toContain('ROOT: PHIL');
    expect(container.textContent).toContain('Philosopher');
  });

  it('inserts a study card into canvas when clicking Canvas button', () => {
    const onToast = vi.fn();
    const { container } = renderComponent(
      <LanguageLearningStudioModal
        isOpen={true}
        onClose={vi.fn()}
        doodleAPI={mockDoodleAPI}
        onToast={onToast}
      />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const canvasBtn = buttons.find((b) => b.textContent.includes('Canvas') || b.textContent.includes('Add'));
    expect(canvasBtn).toBeDefined();

    act(() => {
      canvasBtn.click();
    });

    expect(mockDoodleAPI.updateScene).toHaveBeenCalled();
    expect(onToast).toHaveBeenCalled();
  });

  it('launches 3D Flashcard practice deck with formatted deck table', () => {
    const onOpenFlashcards = vi.fn();
    const { container } = renderComponent(
      <LanguageLearningStudioModal
        isOpen={true}
        onClose={vi.fn()}
        doodleAPI={mockDoodleAPI}
        onOpenFlashcards={onOpenFlashcards}
      />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const practiceBtn = buttons.find((b) => b.textContent.includes('Practice in 3D Flashcards'));
    expect(practiceBtn).toBeDefined();

    act(() => {
      practiceBtn.click();
    });

    expect(onOpenFlashcards).toHaveBeenCalled();
    const passedDeck = onOpenFlashcards.mock.calls[0][0];
    expect(passedDeck.docType).toBe('interactive_table');
    expect(passedDeck.title).toContain('German');
  });

  it('switches to Custom Card Builder and creates a custom study card', () => {
    const onToast = vi.fn();
    const { container } = renderComponent(
      <LanguageLearningStudioModal
        isOpen={true}
        onClose={vi.fn()}
        doodleAPI={mockDoodleAPI}
        onToast={onToast}
      />
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const customTabBtn = buttons.find((b) => b.textContent.includes('Custom Card Builder'));
    expect(customTabBtn).toBeDefined();

    act(() => {
      customTabBtn.click();
    });

    expect(container.textContent).toContain('Create Custom Language Study Card');

    const inputs = Array.from(container.querySelectorAll('input'));
    const wordInput = inputs.find((i) => i.placeholder.includes('Wörterbuch'));
    expect(wordInput).toBeDefined();

    act(() => {
      wordInput.value = 'Wörterbuch';
      wordInput.dispatchEvent(new Event('input', { bubbles: true }));
      wordInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const createButtons = Array.from(container.querySelectorAll('button'));
    const insertBtn = createButtons.find((b) => b.textContent.includes('Insert Custom Card to Canvas'));
    expect(insertBtn).toBeDefined();

    act(() => {
      insertBtn.click();
    });

    expect(mockDoodleAPI.updateScene).toHaveBeenCalled();
  });
});
