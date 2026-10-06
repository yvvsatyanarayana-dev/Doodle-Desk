import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { StudioTopBar } from '../src/components/StudioTopBar';

describe('StudioTopBar', () => {
  it('routes the frameless close control to Electron window close', () => {
    const closeWindow = vi.fn();
    const previousElectronAPI = window.electronAPI;
    window.electronAPI = { closeWindow };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<StudioTopBar theme="dark" currentFileName="Test" isDirty={false} />);
    });

    const closeButton = container.querySelector('.studio-win-btn.win-close');
    expect(closeButton).not.toBeNull();
    act(() => closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    expect(closeWindow).toHaveBeenCalledOnce();

    act(() => root.unmount());
    document.body.removeChild(container);
    if (previousElectronAPI === undefined) delete window.electronAPI;
    else window.electronAPI = previousElectronAPI;
  });

  it('renders the file menu without a duplicate Preferences action', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <StudioTopBar
          currentFileName="Test Drawing"
          isDirty={false}
          theme="dark"
          onSetCanvasStyle={() => {}}
          onThemeToggle={() => {}}
          onNew={() => {}}
          onOpen={() => {}}
          onSave={() => {}}
          onSaveAs={() => {}}
          onExport={() => {}}
          onExportPdf={() => {}}
          onCopyToClipboard={() => {}}
          onPrint={() => {}}
          onOpenCommandPalette={() => {}}
          onOpenTemplates={() => {}}
          onTogglePresentation={() => {}}
          onToggleMiniMap={() => {}}
          isMiniMapOpen={false}
          onRenameTitle={() => {}}
          activeWorkspace={{ name: 'Workspace', icon: '✏️', color: '#6366f1' }}
          workspaces={[]}
          activeWorkspaceId="workspace-1"
          onSwitchWorkspace={() => {}}
          onOpenWorkspaces={() => {}}
          onCreateWorkspace={() => {}}
          onUpdateWorkspace={() => {}}
          onDuplicateWorkspace={() => {}}
          onDeleteWorkspace={() => {}}
          onExportWorkspace={() => {}}
          onImportWorkspace={() => {}}
          collabStatus="disconnected"
          collabPeersCount={0}
          collabRoomId={null}
          onOpenLiveCollab={() => {}}
          onStartCollab={() => {}}
          onJoinCollab={() => {}}
          onLeaveCollab={() => {}}
          myProfile={{ name: 'You' }}
          setMyProfile={() => {}}
          collaborators={[]}
          chatMessages={[]}
          sendChatMessage={() => {}}
          onFollowCollaborator={() => {}}
        />
      );
    });

    const brand = container.querySelector('.studio-brand-badge');
    expect(brand).not.toBeNull();

    expect(() => {
      act(() => {
        brand.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }).not.toThrow();

    expect(container.textContent).toContain('Print Canvas...');
    expect(container.textContent).not.toContain('Preferences');
    root.unmount();
    document.body.removeChild(container);
  });
});
