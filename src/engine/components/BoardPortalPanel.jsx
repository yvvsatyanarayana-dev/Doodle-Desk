import React from 'react';
import { ArrowUpRight, PanelTop } from 'lucide-react';

export function BoardPortalPanel({ workspaces, activeWorkspaceId, activeFileId, onCreate, onClose }) {
  return (
    <aside className="doodle-layers-panel doodle-feature-panel" aria-label="Board portals">
      <header className="doodle-layers-header">
        <div className="doodle-layers-heading">
          <PanelTop size={16} />
          <div>
            <strong>Board portals</strong>
            <span>Link boards into this canvas</span>
          </div>
        </div>
        <button type="button" className="doodle-layers-icon-button" onClick={onClose} aria-label="Close board portals">×</button>
      </header>
      <div className="doodle-layers-list">
        {(workspaces || []).map(workspace => (
          <section className="doodle-portal-workspace" key={workspace.id}>
            <strong>{workspace.name}</strong>
            {(workspace.files || []).map(file => {
              const isCurrent = workspace.id === activeWorkspaceId && file.id === activeFileId;
              return (
                <button
                  type="button"
                  className="doodle-portal-target"
                  key={file.id}
                  onClick={() => onCreate(workspace, file)}
                  title={isCurrent ? 'Create a portal to this board' : `Create a portal to ${file.name}`}
                >
                  <span><PanelTop size={14} />{file.name}</span>
                  <ArrowUpRight size={14} />
                </button>
              );
            })}
          </section>
        ))}
        {(!workspaces || workspaces.length === 0) && (
          <p className="doodle-layers-empty">Create a board in Workspaces to link it here.</p>
        )}
      </div>
      <footer className="doodle-layers-footer">Portals navigate to the live board</footer>
    </aside>
  );
}
