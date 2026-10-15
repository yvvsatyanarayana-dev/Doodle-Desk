import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { CanvasContextMenu } from '../src/engine/components/CanvasContextMenu.jsx';

describe('CanvasContextMenu', () => {
  it('shows canvas actions and disables selection-only actions when nothing is selected', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <CanvasContextMenu
          x={24}
          y={32}
          hasSelection={false}
          canEdit={false}
          canPaste
          hasStyles={false}
          selectedLocked={false}
          onAction={vi.fn()}
          onClose={vi.fn()}
          theme="dark"
        />
      );
    });

    expect(container.querySelector('[aria-label="Canvas actions"]')).toBeTruthy();
    expect(container.querySelector('[data-theme="dark"]')).toBeTruthy();
    expect([...container.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.includes('Paste')).disabled).toBe(false);
    expect([...container.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.includes('Duplicate')).disabled).toBe(true);
    expect(container.querySelector('.canvas-context-menu-footer')).toBeTruthy();
    expect([...container.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.includes('Delete')).disabled).toBe(true);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('keeps an enabled delete action visible outside the scrolling menu list', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <CanvasContextMenu
          x={24}
          y={32}
          hasSelection
          canEdit
          canPaste={false}
          hasStyles={false}
          selectedLocked={false}
          onAction={onAction}
          onClose={onClose}
          theme="dark"
        />
      );
    });

    const deleteButton = container.querySelector('.canvas-context-menu-footer [role="menuitem"]');
    expect(deleteButton.textContent).toContain('Delete');
    expect(deleteButton.disabled).toBe(false);
    expect(deleteButton.closest('.canvas-context-menu-list')).toBeNull();
    act(() => deleteButton.click());
    expect(onAction).toHaveBeenCalledWith('delete');
    expect(onClose).toHaveBeenCalledOnce();

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('applies a link to the selected object and closes the menu', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <CanvasContextMenu
          x={24}
          y={32}
          hasSelection
          canEdit
          canPaste={false}
          hasStyles={false}
          selectedLocked={false}
          onAction={onAction}
          onClose={onClose}
          theme="light"
        />
      );
    });

    const addLink = [...container.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.includes('Add link'));
    act(() => addLink.click());
    const input = container.querySelector('.canvas-context-link-form input');
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setValue.call(input, 'https://example.com');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const form = container.querySelector('.canvas-context-link-form');
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(onAction).toHaveBeenCalledWith('saveLink', 'https://example.com');
    expect(onClose).toHaveBeenCalledOnce();

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
