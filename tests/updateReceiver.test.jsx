import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateReceiverToast } from '../src/components/UpdateReceiverToast';

describe('UpdateReceiverToast (GitHub Actions Update Receiver)', () => {
  let container;
  let root;
  let listeners = {};

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    listeners = {};

    window.electronAPI = {
      on: vi.fn((channel, callback) => {
        listeners[channel] = callback;
        return () => {
          delete listeners[channel];
        };
      }),
      getUpdateStatus: vi.fn().mockResolvedValue({ status: 'idle' }),
      quitAndInstall: vi.fn(),
      checkForUpdates: vi.fn().mockResolvedValue({ status: 'not-available' }),
      getAppVersion: vi.fn().mockResolvedValue('1.0.0'),
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    delete window.electronAPI;
  });

  it('renders nothing when update status is idle', async () => {
    await act(async () => {
      root.render(<UpdateReceiverToast />);
    });
    expect(container.querySelector('.doodle-update-toast')).toBeNull();
  });

  it('renders downloading progress bar when updater:status emits downloading', async () => {
    await act(async () => {
      root.render(<UpdateReceiverToast />);
    });

    expect(window.electronAPI.on).toHaveBeenCalledWith('updater:status', expect.any(Function));

    // Simulate update downloading event from Electron Main
    await act(async () => {
      listeners['updater:status']({
        status: 'downloading',
        version: '1.0.1',
        percent: 65,
        bytesPerSecond: 2500000,
      });
    });

    const toast = container.querySelector('.doodle-update-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Downloading Update v1.0.1');
    expect(toast.textContent).toContain('65%');
    expect(toast.textContent).toContain('2.4 MB/s');

    const progressBar = container.querySelector('.update-toast-progress-bar');
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe('65%');
  });

  it('renders restart button and triggers quitAndInstall when update is downloaded', async () => {
    await act(async () => {
      root.render(<UpdateReceiverToast />);
    });

    // Simulate update downloaded event from Electron Main
    await act(async () => {
      listeners['updater:status']({
        status: 'downloaded',
        version: '1.0.1',
        releaseNotes: 'Fixed bugs and added features',
      });
    });

    const toast = container.querySelector('.doodle-update-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Update Ready: v1.0.1');

    const restartBtn = container.querySelector('.update-toast-btn.primary');
    expect(restartBtn).not.toBeNull();
    expect(restartBtn.textContent).toContain('Restart and Install');

    await act(async () => {
      restartBtn.click();
    });

    expect(window.electronAPI.quitAndInstall).toHaveBeenCalledOnce();
  });

  it('dismisses toast when close button is clicked', async () => {
    await act(async () => {
      root.render(<UpdateReceiverToast />);
    });

    await act(async () => {
      listeners['updater:status']({
        status: 'available',
        version: '1.0.1',
      });
    });

    expect(container.querySelector('.doodle-update-toast')).not.toBeNull();

    const closeBtn = container.querySelector('.update-toast-close');
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.click();
    });

    expect(container.querySelector('.doodle-update-toast')).toBeNull();
  });
});
