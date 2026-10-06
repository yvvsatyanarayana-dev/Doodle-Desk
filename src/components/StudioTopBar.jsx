import React, { useState, useRef, useEffect, memo } from 'react';
import {
  FolderOpen,
  Save,
  Plus,
  FilePlus,
  Download,
  Moon,
  Sun,
  ChevronDown,
  FileText,
  Copy,
  Printer,
  Minus,
  Square,
  X,
  Search,
  Layers,
  Play,
  Grid,
  MapPin,
  Check,
  Radio,
  FolderKanban,
  Users,
  LogIn,
  Wifi,
  WifiOff,
  Link,
  PhoneOff,
  Trash2,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { WorkspaceIconBadge } from './WorkspaceIcons';
import WorkspaceDropdown from './WorkspaceDropdown';
import LiveCollabDropdown from './LiveCollabDropdown';
import ExportDropdown from './ExportDropdown';
import { ThemedConfirmDialog } from './ThemedConfirmDialog';

function StudioTopBarComponent({
  currentFileName,
  isDirty,
  theme,
  canvasStyle = 'standard',
  onSetCanvasStyle,
  onThemeToggle,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExport,
  onExportPdf,
  onCopyToClipboard,
  onPrint,
  onOpenCommandPalette,
  onOpenTemplates,
  onTogglePresentation,
  onToggleMiniMap,
  isMiniMapOpen,
  onRenameTitle,
  activeWorkspace,
  workspaces = [],
  activeWorkspaceId,
  activeFile,
  activeFileId,
  onSwitchWorkspace,
  onOpenWorkspaces,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onExportWorkspace,
  onImportWorkspace,
  onCreateFile,
  onSwitchFile,
  onRenameFile,
  onDuplicateFile,
  onDeleteFile,
  collabStatus = 'disconnected',
  collabConnectionError = '',
  collabPeersCount = 0,
  collabRoomId = null,
  onOpenLiveCollab,
  onStartCollab,
  onJoinCollab,
  onLeaveCollab,
  myProfile,
  setMyProfile,
  collaborators,
  chatMessages = [],
  onOpenLiveChat,
  sendChatMessage,
  onFollowCollaborator,
}) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportDropPos, setExportDropPos] = useState({ top: 0, right: 0 });
  const [isCollabMenuOpen, setIsCollabMenuOpen] = useState(false);
  const [collabDropPos, setCollabDropPos] = useState({ top: 0, right: 0 });
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [wsDropPos, setWsDropPos] = useState({ top: 0, left: 0 });
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isCanvasMenuOpen, setIsCanvasMenuOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isQuickFileSwitcherOpen, setIsQuickFileSwitcherOpen] = useState(false);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null);
  const [titleDraft, setTitleDraft] = useState(currentFileName || 'Untitled');

  useEffect(() => {
    setTitleDraft(currentFileName || 'Untitled');
  }, [currentFileName]);

  const handleCommitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== currentFileName) {
      onRenameTitle?.(trimmed);
    } else {
      setTitleDraft(currentFileName || 'Untitled');
    }
    setIsEditingTitle(false);
  };

  const exportMenuRef = useRef(null);
  const exportPillRef = useRef(null);
  const collabMenuRef = useRef(null);
  const collabPillRef = useRef(null);
  const workspaceMenuRef = useRef(null);
  const workspacePillRef = useRef(null);
  const quickFileMenuRef = useRef(null);
  const fileMenuRef = useRef(null);
  const canvasMenuRef = useRef(null);

  const isDark = theme === 'dark';
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Check initial maximized state
  useEffect(() => {
    if (isElectron && window.electronAPI.isWindowMaximized) {
      window.electronAPI.isWindowMaximized().then(val => setIsMaximized(!!val));
    }
  }, [isElectron]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
      if (collabMenuRef.current && !collabMenuRef.current.contains(e.target)) {
        setIsCollabMenuOpen(false);
      }
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setIsFileMenuOpen(false);
      }
      if (canvasMenuRef.current && !canvasMenuRef.current.contains(e.target)) {
        setIsCanvasMenuOpen(false);
      }
      if (quickFileMenuRef.current && !quickFileMenuRef.current.contains(e.target)) {
        setIsQuickFileSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = () => {
    if (isElectron) window.electronAPI.minimizeWindow();
  };

  const handleMaximize = async () => {
    if (isElectron) {
      const state = await window.electronAPI.maximizeWindow();
      setIsMaximized(state);
    }
  };

  const handleClose = () => {
    if (isElectron) {
      window.electronAPI.closeWindow();
    } else {
      try {
        window.close();
      } catch (e) {
        console.warn('Window close warning:', e);
      }
    }
  };

  const canvasStyles = [
    { id: 'standard', name: 'Standard Whiteboard' },
    { id: 'blueprint', name: 'Blueprint Grid' },
    { id: 'dotgrid', name: 'Dot Grid Notebook' },
    { id: 'isometric', name: 'Isometric 3D Grid' },
    { id: 'parchment', name: 'Warm Parchment Paper' },
    { id: 'engineering', name: 'Engineering Dark' },
  ];

  return (
    <header className="studio-topbar app-drag-region">
      {/* Left: Brand Badge & Document Info */}
      <div className="studio-topbar-left app-no-drag">
        <div
          className="studio-brand-badge"
          onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
          ref={fileMenuRef}
          title="Doodle Desk Menu"
        >
          <span className="studio-brand-title">Doodle Desk</span>
          <ChevronDown size={12} className="studio-chevron" />

          {/* File Menu Dropdown */}
          {isFileMenuOpen && (
            <div className="studio-dropdown-menu file-dropdown">
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  if (onCreateFile) {
                    onCreateFile(activeWorkspaceId);
                  } else {
                    onNew();
                  }
                }}
              >
                <FilePlus size={14} />
                <span>New File in Workspace</span>
                <kbd>Ctrl+N</kbd>
              </button>
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  onCreateWorkspace?.();
                }}
              >
                <Layers size={14} />
                <span>New Workspace Board...</span>
              </button>
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  onOpen();
                }}
              >
                <FolderOpen size={14} />
                <span>Open...</span>
                <kbd>Ctrl+O</kbd>
              </button>
              <div className="studio-dropdown-divider" />
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  onSave();
                }}
              >
                <Save size={14} />
                <span>Save</span>
                <kbd>Ctrl+S</kbd>
              </button>
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  onSaveAs();
                }}
              >
                <Save size={14} />
                <span>Save As...</span>
                <kbd>Ctrl+Shift+S</kbd>
              </button>
              <div className="studio-dropdown-divider" />
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  onPrint();
                }}
              >
                <Printer size={14} />
                <span>Print Canvas...</span>
                <kbd>Ctrl+P</kbd>
              </button>
              <div className="studio-dropdown-divider" />
              <button
                className="studio-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFileMenuOpen(false);
                  handleClose();
                }}
              >
                <LogOut size={14} />
                <span>Exit App</span>
                <kbd>Alt+F4</kbd>
              </button>
            </div>
          )}
        </div>

        {/* Workspace Switcher — fixed-positioned dropdown panel */}
        <div ref={workspaceMenuRef} style={{ position: 'relative' }}>
          <button
            ref={workspacePillRef}
            className="studio-workspace-pill app-no-drag"
            onClick={() => {
              if (!isWorkspaceMenuOpen && workspacePillRef.current) {
                const rect = workspacePillRef.current.getBoundingClientRect();
                const topbar = document.querySelector('.studio-topbar');
                const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : rect.bottom;
                const computedTop = topbarBottom + 16;
                // Move workspace dropdown to the left edge so it never touches the center tool bar
                setWsDropPos({
                  top: computedTop,
                  left: 12,
                });
              }
              setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
            }}
            title="Switch workspace"
          >
            <WorkspaceIconBadge
              icon={activeWorkspace?.icon}
              color={activeWorkspace?.color || '#6366f1'}
              size={12}
              style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0 }}
            />
            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeWorkspace?.name || 'Workspace'}
            </span>
            <ChevronDown size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
          </button>

          {isWorkspaceMenuOpen && (
            <>
              {/* Transparent backdrop to close on outside click */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                onClick={() => setIsWorkspaceMenuOpen(false)}
              />
              {/* Dropdown panel */}
              <div style={{
                position: 'fixed',
                top: wsDropPos.top,
                left: wsDropPos.left,
                zIndex: 99999,
                animation: 'scaleIn 0.15s ease-out',
                transformOrigin: 'top left',
              }}>
                <WorkspaceDropdown
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  activeFileId={activeFileId || activeFile?.id}
                  theme={theme}
                  isDark={isDark}
                  onSwitchWorkspace={onSwitchWorkspace}
                  onCreateWorkspace={onCreateWorkspace}
                  onUpdateWorkspace={onUpdateWorkspace}
                  onDuplicateWorkspace={onDuplicateWorkspace}
                  onDeleteWorkspace={onDeleteWorkspace}
                  onExportWorkspace={onExportWorkspace}
                  onImportWorkspace={onImportWorkspace}
                  onCreateFile={onCreateFile}
                  onSwitchFile={onSwitchFile}
                  onRenameFile={onRenameFile}
                  onDuplicateFile={onDuplicateFile}
                  onDeleteFile={onDeleteFile}
                  onClose={() => setIsWorkspaceMenuOpen(false)}
                />
              </div>
            </>
          )}
        </div>

        <div className="studio-doc-divider" />

        {/* Document Status & Editable Title with Quick File Switcher */}
        <div ref={quickFileMenuRef} className="studio-doc-info" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`studio-doc-dot ${isDirty ? 'dirty' : 'saved'}`} />
          {isEditingTitle ? (
            <input
              type="text"
              className="studio-doc-name-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleCommitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(currentFileName || 'Untitled');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span
                className="studio-doc-name editable"
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename drawing file"
              >
                {currentFileName}
              </span>
              <button
                type="button"
                className="app-no-drag"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQuickFileSwitcherOpen((prev) => !prev);
                }}
                title="Switch file in workspace"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: isDark ? '#71717a' : '#64748b',
                  borderRadius: '4px',
                  transition: 'color 0.12s, background 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDark ? '#e4e4e7' : '#0f172a';
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isDark ? '#71717a' : '#64748b';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <ChevronDown size={11} />
              </button>
            </div>
          )}

          {/* Quick + button to create a new file in 1 click */}
          <button
            type="button"
            className="app-no-drag"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFile?.(activeWorkspaceId);
            }}
            title="Create new file in this workspace (Ctrl+N)"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
              cursor: 'pointer',
              padding: '3px 5px',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              color: isDark ? '#a1a1aa' : '#475569',
              fontSize: '11px',
              transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)';
              e.currentTarget.style.color = isDark ? '#fff' : '#4f46e5';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              e.currentTarget.style.color = isDark ? '#a1a1aa' : '#475569';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
            }}
          >
            <Plus size={11} />
          </button>

          {/* Quick File Switcher Dropdown */}
          {isQuickFileSwitcherOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '-130px',
                marginTop: '16px',
                width: '240px',
                boxSizing: 'border-box',
                background: isDark ? '#131316' : '#ffffff',
                border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'),
                borderRadius: '10px',
                boxShadow: isDark
                  ? '0 20px 50px rgba(0,0,0,0.85)'
                  : '0 20px 45px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)',
                zIndex: 99999,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                animation: 'scaleIn 0.12s ease-out',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '4px 6px 6px',
                borderBottom: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#a1a1aa' : '#475569' }}>
                  Files in {activeWorkspace?.name || 'Workspace'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onCreateFile?.(activeWorkspaceId);
                    setIsQuickFileSwitcherOpen(false);
                  }}
                  style={{
                    background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                    border: '1px solid ' + (isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'),
                    borderRadius: '5px',
                    color: isDark ? '#c7d2fe' : '#4f46e5',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Plus size={10} /> New File
                </button>
              </div>

              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: '2px 0',
                boxSizing: 'border-box',
                scrollbarWidth: 'none',
              }}>
                {(activeWorkspace?.files || []).map((file) => {
                  const isSelected = file.id === (activeFileId || activeFile?.id);
                  const shapes = (file.elements || []).filter((el) => !el.isDeleted).length;
                  const canDelete = (activeWorkspace?.files || []).length > 1;
                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        onSwitchFile?.(file.id, activeWorkspaceId);
                        setIsQuickFileSwitcherOpen(false);
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                        background: isSelected
                          ? (isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.08)')
                          : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                        border: isSelected
                          ? (isDark ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(99,102,241,0.3)')
                          : (isDark ? '1px solid transparent' : '1px solid #f1f5f9'),
                        borderRadius: '6px',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: isSelected
                          ? (isDark ? '#fff' : '#4f46e5')
                          : (isDark ? '#d4d4d8' : '#0f172a'),
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1 }}>
                        <FileText size={12} style={{ color: isSelected ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#71717a' : '#94a3b8'), flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: '10px', color: isDark ? '#71717a' : '#64748b' }}>
                          {shapes} {shapes === 1 ? 'shape' : 'shapes'}
                        </span>
                        {canDelete && onDeleteFile && (
                          <button
                            type="button"
                            title="Delete file"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteFile(file);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              borderRadius: '4px',
                              color: isDark ? '#71717a' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.12s, background 0.12s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = isDark ? '#71717a' : '#94a3b8';
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {confirmDeleteFile && (
            <ThemedConfirmDialog
              isOpen={!!confirmDeleteFile}
              title="Delete File"
              subtitle="Confirm Action"
              message={`Delete file "${confirmDeleteFile.name}"?`}
              confirmText="Delete File"
              cancelText="Cancel"
              danger={true}
              onConfirm={() => {
                onDeleteFile?.(confirmDeleteFile.id, activeWorkspaceId);
                setConfirmDeleteFile(null);
              }}
              onCancel={() => setConfirmDeleteFile(null)}
            />
          )}
        </div>
      </div>

      {/* Center: Minimalist Command Capsule & Studio Tools */}
      <div className="studio-topbar-center app-no-drag">
        <div className="studio-center-capsule">
          <button
            className="studio-capsule-search"
            onClick={onOpenCommandPalette}
            title="Command Palette (Ctrl+K)"
          >
            <Search size={13} className="studio-search-icon" />
            <span className="studio-search-text">Search actions or tools...</span>
            <kbd className="studio-search-kbd">Ctrl+K</kbd>
          </button>




          <button
            className="studio-capsule-btn"
            onClick={onTogglePresentation}
            title="Presentation Slides Mode (Ctrl+Alt+P)"
          >
            <Play size={13} />
          </button>

          <div className="studio-canvas-menu-wrapper" ref={canvasMenuRef}>
            <button
              className={`studio-capsule-btn ${isCanvasMenuOpen ? 'active' : ''}`}
              onClick={() => setIsCanvasMenuOpen(!isCanvasMenuOpen)}
              title="Canvas Paper & Grid Style"
            >
              <Grid size={13} />
            </button>

            {isCanvasMenuOpen && (
              <div className="studio-dropdown-menu canvas-style-dropdown">
                <div className="studio-dropdown-header">Canvas Paper & Grid</div>
                {canvasStyles.map(st => (
                  <button
                    key={st.id}
                    className={`studio-dropdown-item ${canvasStyle === st.id ? 'active' : ''}`}
                    onClick={() => {
                      onSetCanvasStyle?.(st.id);
                      setIsCanvasMenuOpen(false);
                    }}
                  >
                    <span>{st.name}</span>
                    {canvasStyle === st.id && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions & Custom Window Controls */}
      <div className="studio-topbar-right app-no-drag">

        {/* Live Collaboration — fixed dropdown panel (anchored between tools bar and library button) */}
        <div ref={collabMenuRef} style={{ position: 'relative' }}>
          <button
            ref={collabPillRef}
            className="studio-action-btn studio-collab-action-btn"
            onClick={() => {
              if (!isCollabMenuOpen && collabPillRef.current) {
                const rect = collabPillRef.current.getBoundingClientRect();
                const topbar = document.querySelector('.studio-topbar');
                const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : rect.bottom;
                const libraryEl = document.querySelector('.layer-ui__wrapper__top-right') || document.querySelector('.sidebar-trigger');
                const libRect = libraryEl?.getBoundingClientRect();
                const libRightOffset = libRect ? window.innerWidth - libRect.left : 52;
                // Move to right: neatly between library button and center tool bar
                setCollabDropPos({
                  top: topbarBottom + 16,
                  right: Math.max(64, libRightOffset + 12),
                });
              }
              setIsCollabMenuOpen(!isCollabMenuOpen);
            }}
            title="Live Collaboration"
            data-active={collabStatus !== 'disconnected'}
          >
            {collabStatus !== 'disconnected' ? <Wifi size={13} /> : <Radio size={13} />}
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Live</span>
            {collabStatus !== 'disconnected' && (
              <span className="studio-collab-badge">{collabPeersCount + 1}</span>
            )}
            <ChevronDown size={12} />
          </button>

          {isCollabMenuOpen && (
            <>
              {/* Transparent backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                onClick={() => setIsCollabMenuOpen(false)}
              />
              {/* Panel */}
              <div style={{
                position: 'fixed',
                top: collabDropPos.top,
                right: collabDropPos.right,
                zIndex: 99999,
                animation: 'scaleIn 0.15s ease-out',
                transformOrigin: 'top right',
                maxHeight: `calc(100dvh - ${collabDropPos.top + 12}px)`,
              }}>
                <LiveCollabDropdown
                  status={collabStatus}
                  connectionError={collabConnectionError}
                  roomId={collabRoomId}
                  myProfile={myProfile}
                  setMyProfile={setMyProfile}
                  collaborators={collaborators || new Map()}
                  chatMessages={chatMessages}
                  onOpenLiveChat={onOpenLiveChat}
                  theme={theme}
                  isDark={isDark}
                  startHosting={() => {
                    onStartCollab?.();
                    setIsCollabMenuOpen(false);
                  }}
                  joinSession={(roomId) => {
                    onJoinCollab?.(roomId);
                    setIsCollabMenuOpen(false);
                  }}
                  leaveSession={onLeaveCollab}
                  onFollowCollaborator={onFollowCollaborator}
                  onClose={() => setIsCollabMenuOpen(false)}
                />
              </div>
            </>
          )}
        </div>

        {/* Quick Export Dropdown — fixed-positioned panel with backdrop (same as workspace) */}
        <div ref={exportMenuRef} style={{ position: 'relative' }}>
          <button
            ref={exportPillRef}
            className="studio-action-btn studio-primary-btn"
            onClick={() => {
              if (!isExportMenuOpen && exportPillRef.current) {
                const rect = exportPillRef.current.getBoundingClientRect();
                const topbar = document.querySelector('.studio-topbar');
                const topbarBottom = topbar ? topbar.getBoundingClientRect().bottom : rect.bottom;
                const libraryEl = document.querySelector('.layer-ui__wrapper__top-right') || document.querySelector('.sidebar-trigger');
                const libRect = libraryEl?.getBoundingClientRect();
                const libRightOffset = libRect ? window.innerWidth - libRect.left : 52;
                // Move to right: neatly between library button and center tool bar
                setExportDropPos({
                  top: topbarBottom + 16,
                  right: Math.max(64, libRightOffset + 12),
                });
              }
              setIsExportMenuOpen(!isExportMenuOpen);
            }}
            title="Export canvas"
          >
            <Download size={13} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Export</span>
            <ChevronDown size={12} />
          </button>

          {isExportMenuOpen && (
            <>
              {/* Transparent backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                onClick={() => setIsExportMenuOpen(false)}
              />
              {/* Panel */}
              <div
                style={{
                  position: 'fixed',
                  top: exportDropPos.top,
                  right: exportDropPos.right,
                  zIndex: 99999,
                  animation: 'scaleIn 0.15s ease-out',
                  transformOrigin: 'top right',
                }}
              >
                <ExportDropdown
                  onExport={onExport}
                  onExportPdf={onExportPdf}
                  onCopyToClipboard={onCopyToClipboard}
                  theme={theme}
                  isDark={isDark}
                  onClose={() => setIsExportMenuOpen(false)}
                />
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="studio-icon-btn studio-theme-btn"
          onClick={onThemeToggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Custom Window Controls (Frameless Studio Window) */}
        {isElectron && (
          <div
            className="studio-window-controls app-no-drag"
            style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="studio-win-btn win-min"
              onClick={handleMinimize}
              title="Minimize"
            >
              <Minus size={13} />
            </button>
            <button
              className="studio-win-btn win-max"
              onClick={handleMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square size={11} />
            </button>
            <button
              className="studio-win-btn win-close"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleClose();
              }}
              style={{ WebkitAppRegion: 'no-drag', pointerEvents: 'auto' }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export const StudioTopBar = memo(StudioTopBarComponent);

