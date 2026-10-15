import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { HelpModal } from '../src/components/HelpModal.jsx';

describe('HelpModal', () => {
  it('shows the searchable user guide and preserves the keyboard shortcuts tab', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<HelpModal isOpen={true} onClose={vi.fn()} theme="dark" />);
    });

    expect(container.querySelector('h2')?.textContent).toBe('Doodle Desk Guide');
    expect(container.querySelectorAll('.doodle-guide-section')).toHaveLength(10);

    const search = container.querySelector('input[aria-label="Search user guide"]');
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setValue.call(search, 'Doodle Vault');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelectorAll('.doodle-guide-section')).toHaveLength(1);
    expect(container.textContent).toContain('Changing the vault does not move existing files.');

    act(() => {
      container.querySelector('#doodle-guide-tab-shortcuts').click();
    });
    expect(container.querySelector('.doodle-help-shortcuts-content')).toBeTruthy();
    expect(container.querySelector('#doodle-guide-tab-shortcuts').getAttribute('aria-selected')).toBe('true');

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
