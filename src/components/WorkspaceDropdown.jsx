import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, Copy, Trash2, Download, Upload, Check, X, Pencil, Search, ChevronDown, ChevronRight, FileText,
} from 'lucide-react';
import {
  WorkspaceIconBadge, WORKSPACE_THEME_ICONS, WORKSPACE_COLORS,
} from './WorkspaceIcons';
import { ThemedConfirmDialog } from './ThemedConfirmDialog';

// Reusable small icon action button with full light & dark theme support
function ActionBtn({ onClick, title, danger, isDark = true, children }) {
  const isLightTheme = !isDark;
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '5px',
        color: danger ? '#ef4444' : (isLightTheme ? '#64748b' : '#71717a'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? (isLightTheme ? 'rgba(239,68,68,0.1)' : 'rgba(248,113,113,0.15)')
          : (isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)');
        e.currentTarget.style.color = danger
          ? (isLightTheme ? '#dc2626' : '#fca5a5')
          : (isLightTheme ? '#0f172a' : '#d4d4d8');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = danger ? '#ef4444' : (isLightTheme ? '#64748b' : '#71717a');
      }}
    >
      {children}
    </button>
  );
}

export default function WorkspaceDropdown({
  workspaces = [],
  activeWorkspaceId,
  activeFileId,
  theme = 'dark',
  isDark = theme !== 'light',
  onSwitchWorkspace,
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
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('palette');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Workspace inline edit
  const [editingWsId, setEditingWsId] = useState(null);
  const [editWsName, setEditWsName] = useState('');
  const [editingIconWsId, setEditingIconWsId] = useState(null);

  // File inline edit
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileName, setEditFileName] = useState('');

  // Expand state for files inside workspaces (active workspace expanded by default)
  const [expandedWorkspaces, setExpandedWorkspaces] = useState(() => ({
    [activeWorkspaceId]: true,
  }));

  const fileInputRef = useRef(null);
  const editWsInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // Always keep active workspace expanded
  useEffect(() => {
    if (activeWorkspaceId) {
      setExpandedWorkspaces((prev) => ({ ...prev, [activeWorkspaceId]: true }));
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (editingWsId && editWsInputRef.current) {
      editWsInputRef.current.focus();
      editWsInputRef.current.select();
    }
  }, [editingWsId]);

  useEffect(() => {
    if (editingFileId && editFileInputRef.current) {
      editFileInputRef.current.focus();
      editFileInputRef.current.select();
    }
  }, [editingFileId]);

  const toggleExpand = (wsId, e) => {
    e?.stopPropagation();
    setExpandedWorkspaces((prev) => ({ ...prev, [wsId]: !prev[wsId] }));
  };

  const filtered = workspaces.filter((w) =>
    (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.files || []).some((f) => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStartCreateWs = () => {
    setIsCreatingWs(true);
    setNewWsName('Board ' + (workspaces.length + 1));
    const ri = WORKSPACE_THEME_ICONS[Math.floor(Math.random() * WORKSPACE_THEME_ICONS.length)].id;
    const rc = WORKSPACE_COLORS[Math.floor(Math.random() * WORKSPACE_COLORS.length)].id;
    setSelectedIcon(ri);
    setSelectedColor(rc);
  };

  const handleConfirmCreateWs = () => {
    if (!newWsName.trim()) return;
    onCreateWorkspace?.({ name: newWsName.trim(), icon: selectedIcon, color: selectedColor, initialElements: [] });
    setIsCreatingWs(false);
  };

  const handleStartEditWs = (ws, e) => {
    e?.stopPropagation();
    setEditingWsId(ws.id);
    setEditWsName(ws.name);
    setEditingIconWsId(null);
  };

  const handleSaveEditWs = (id) => {
    const trimmed = editWsName.trim();
    if (trimmed) onUpdateWorkspace?.(id, { name: trimmed });
    setEditingWsId(null);
  };

  const handleStartEditFile = (file, e) => {
    e?.stopPropagation();
    setEditingFileId(file.id);
    setEditFileName(file.name);
  };

  const handleSaveEditFile = (fileId, wsId) => {
    const trimmed = editFileName.trim();
    if (trimmed) {
      onRenameFile?.(fileId, trimmed, wsId);
    }
    setEditingFileId(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onImportWorkspace?.(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const isLightTheme = !isDark;

  // Harmonious Theme tokens for Light and Dark modes
  const T = isLightTheme
    ? {
        bg: '#ffffff',
        bgRow: '#f8fafc',
        bgRowHover: '#f1f5f9',
        bgFileRow: '#ffffff',
        bgFileActive: 'rgba(99, 102, 241, 0.08)',
        border: 'rgba(0, 0, 0, 0.08)',
        borderActive: 'rgba(0, 0, 0, 0.16)',
        borderCurrent: 'rgba(99, 102, 241, 0.35)',
        borderFileActive: 'rgba(99, 102, 241, 0.35)',
        text: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        textDim: '#94a3b8',
        inputBg: '#f1f5f9',
        inputBorder: 'rgba(0, 0, 0, 0.12)',
        accent: '#6366f1',
        accentFaint: 'rgba(99, 102, 241, 0.1)',
        accentBorder: 'rgba(99, 102, 241, 0.35)',
        btnBg: '#f1f5f9',
        btnBorder: 'rgba(0, 0, 0, 0.1)',
        btnText: '#1e293b',
        filesSectionBg: '#f8fafc',
        divider: 'rgba(0, 0, 0, 0.06)',
        shadow: '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }
    : {
        bg: '#111113',
        bgRow: 'rgba(255, 255, 255, 0.03)',
        bgRowHover: 'rgba(255, 255, 255, 0.06)',
        bgFileRow: 'rgba(255, 255, 255, 0.02)',
        bgFileActive: 'rgba(99, 102, 241, 0.12)',
        border: 'rgba(255, 255, 255, 0.08)',
        borderActive: 'rgba(255, 255, 255, 0.16)',
        borderCurrent: 'rgba(255, 255, 255, 0.18)',
        borderFileActive: 'rgba(99, 102, 241, 0.3)',
        text: '#e4e4e7',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        textDim: '#52525b',
        inputBg: 'rgba(255, 255, 255, 0.05)',
        inputBorder: 'rgba(255, 255, 255, 0.12)',
        accent: '#6366f1',
        accentFaint: 'rgba(99, 102, 241, 0.15)',
        accentBorder: 'rgba(99, 102, 241, 0.35)',
        btnBg: 'rgba(255, 255, 255, 0.08)',
        btnBorder: 'rgba(255, 255, 255, 0.12)',
        btnText: '#e4e4e7',
        filesSectionBg: 'rgba(0, 0, 0, 0.25)',
        divider: 'rgba(255, 255, 255, 0.06)',
        shadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.04)',
      };

  return (
    <div
      style={{
        background: T.bg,
        border: '1px solid ' + T.border,
        borderRadius: '14px',
        boxShadow: T.shadow,
        width: '340px',
        maxHeight: '520px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui,-apple-system,sans-serif',
        color: T.text,
        fontSize: '13px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Toolbar ─────────────────────────────── */}
      <div style={{
        padding: '8px 10px 6px',
        borderBottom: '1px solid ' + T.divider,
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search workspaces & files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px 6px 26px',
              borderRadius: '8px',
              background: T.inputBg,
              border: '1px solid ' + T.inputBorder,
              color: T.text,
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Quick New File in Active Workspace */}
        <button
          onClick={() => {
            onCreateFile?.(activeWorkspaceId);
            onClose?.();
          }}
          title="Create a new file in current workspace"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: isLightTheme ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.18)',
            color: isLightTheme ? '#4f46e5' : '#a5b4fc',
            border: '1px solid ' + (isLightTheme ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.35)'),
            borderRadius: '8px',
            padding: '5px 8px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={12} /> + File
        </button>

        {/* New Workspace */}
        <button
          onClick={handleStartCreateWs}
          title="Create a new workspace board"
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: T.btnBg,
            color: T.btnText,
            border: '1px solid ' + T.btnBorder,
            borderRadius: '8px',
            padding: '5px 8px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus size={12} /> Board
        </button>

        {/* Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import workspace (.doodlews)"
          style={{
            display: 'flex', alignItems: 'center',
            background: T.btnBg,
            color: T.textMuted,
            border: '1px solid ' + T.btnBorder,
            borderRadius: '8px',
            padding: '5px 7px',
            fontSize: '12px', cursor: 'pointer',
          }}
        >
          <Upload size={12} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".doodlews,.json" style={{ display: 'none' }} />
      </div>

      {/* ── Create Workspace Form ─────────────────── */}
      {isCreatingWs && (
        <div style={{
          margin: '6px 8px',
          padding: '12px',
          borderRadius: '10px',
          background: T.bgRow,
          border: '1px solid ' + T.border,
          display: 'flex', flexDirection: 'column', gap: '10px',
          animation: 'scaleIn 0.12s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Workspace Board</span>
            <button onClick={() => setIsCreatingWs(false)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} /></button>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Board name…"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmCreateWs(); if (e.key === 'Escape') setIsCreatingWs(false); }}
              style={{
                flex: 1,
                background: T.inputBg,
                border: '1px solid ' + T.inputBorder,
                borderRadius: '7px', padding: '6px 10px',
                fontSize: '13px', color: T.text, outline: 'none',
              }}
            />
            <button
              onClick={handleConfirmCreateWs}
              style={{
                background: isLightTheme ? '#6366f1' : 'rgba(255,255,255,0.12)',
                color: '#fff', border: '1px solid ' + (isLightTheme ? '#4f46e5' : 'rgba(255,255,255,0.2)'),
                borderRadius: '7px', padding: '0 14px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Create
            </button>
          </div>
          {/* Icon picker */}
          <div>
            <div style={{ fontSize: '10px', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Icon</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {WORKSPACE_THEME_ICONS.map(({ id, label, Icon }) => {
                const sel = selectedIcon === id;
                return (
                  <button key={id} type="button" onClick={() => setSelectedIcon(id)} title={label}
                    style={{
                      width: 28, height: 28, borderRadius: 6, cursor: 'pointer', border: 'none',
                      background: sel ? T.accentFaint : (isLightTheme ? '#f1f5f9' : 'rgba(255,255,255,0.05)'),
                      outline: sel ? ('1.5px solid ' + T.accent) : ('1px solid ' + T.border),
                      color: sel ? T.accent : T.textMuted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>
          </div>
          {/* Color picker */}
          <div>
            <div style={{ fontSize: '10px', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Accent Color</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {WORKSPACE_COLORS.map(({ id, name }) => {
                const sel = selectedColor === id;
                return (
                  <button key={id} type="button" onClick={() => setSelectedColor(id)} title={name}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', padding: 0,
                      background: id, border: sel ? (isLightTheme ? '2.5px solid #0f172a' : '2.5px solid #fff') : '2px solid transparent',
                      transform: sel ? 'scale(1.25)' : 'scale(1)', transition: 'all 0.12s',
                      boxShadow: sel ? ('0 0 8px ' + id + '99') : 'none',
                    }} />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Workspace List ──────────────────────── */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtered.map((ws) => {
          const isWsActive = ws.id === activeWorkspaceId;
          const isEditingWs = editingWsId === ws.id;
          const isEditingIcon = editingIconWsId === ws.id;
          const files = ws.files || [];
          const isExpanded = !!expandedWorkspaces[ws.id];

          // Compute shapes count across all files in this workspace
          const totalShapes = files.reduce(
            (acc, f) => acc + (f.elements || []).filter((el) => !el.isDeleted).length,
            0
          );

          return (
            <div
              key={ws.id}
              style={{
                borderRadius: '10px',
                background: isWsActive ? (isLightTheme ? '#f8fafc' : 'rgba(255,255,255,0.04)') : T.bgRow,
                border: isWsActive ? ('1px solid ' + T.borderCurrent) : ('1px solid ' + T.border),
                overflow: 'hidden',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              {/* Workspace Header Row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  gap: 8,
                }}
                onClick={() => {
                  if (isEditingWs || isEditingIcon) return;
                  if (!isWsActive) {
                    onSwitchWorkspace?.(ws.id);
                  }
                  toggleExpand(ws.id);
                }}
              >
                {/* Left side: Expand toggle + Icon + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <button
                    onClick={(e) => toggleExpand(ws.id, e)}
                    style={{
                      background: 'none', border: 'none', color: T.textMuted,
                      cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                    }}
                    title={isExpanded ? 'Collapse files' : 'Expand files'}
                  >
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>

                  {/* Icon badge — click to edit */}
                  <div
                    onClick={(e) => { e.stopPropagation(); setEditingIconWsId(isEditingIcon ? null : ws.id); setEditingWsId(null); }}
                    title="Change icon & color"
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                  >
                    <WorkspaceIconBadge icon={ws.icon} color={ws.color || T.accent} size={14} />
                  </div>

                  {/* Name & File count */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditingWs ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={editWsInputRef}
                          value={editWsName}
                          onChange={(e) => setEditWsName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditWs(ws.id); if (e.key === 'Escape') setEditingWsId(null); }}
                          onBlur={() => handleSaveEditWs(ws.id)}
                          style={{
                            background: T.inputBg, border: '1.5px solid ' + T.accent,
                            borderRadius: '6px', padding: '3px 8px',
                            fontSize: '13px', color: T.text, outline: 'none', minWidth: '120px',
                          }}
                        />
                        <button onClick={() => handleSaveEditWs(ws.id)} style={{ background: T.accent, border: 'none', borderRadius: 5, color: '#fff', padding: '3px 8px', cursor: 'pointer', display: 'flex' }}>
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.name}
                        </span>
                        {isWsActive && (
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                            borderRadius: '999px',
                            background: isLightTheme ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.2)',
                            color: isLightTheme ? '#4f46e5' : '#a5b4fc',
                            border: '1px solid ' + (isLightTheme ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.3)'),
                            letterSpacing: '0.05em', flexShrink: 0,
                          }}>
                            CURRENT
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: T.textMuted, marginTop: '2px' }}>
                      {files.length} {files.length === 1 ? 'file' : 'files'} · {totalShapes} shapes
                    </div>
                  </div>
                </div>

                {/* Right side: Workspace actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <ActionBtn isDark={isDark} title="Add new file" onClick={() => onCreateFile?.(ws.id)}>
                    <Plus size={12} />
                  </ActionBtn>
                  <ActionBtn isDark={isDark} title="Rename workspace" onClick={(e) => handleStartEditWs(ws, e)}>
                    <Pencil size={12} />
                  </ActionBtn>
                  {onDuplicateWorkspace && (
                    <ActionBtn isDark={isDark} title="Duplicate workspace" onClick={() => onDuplicateWorkspace(ws.id)}>
                      <Copy size={12} />
                    </ActionBtn>
                  )}
                  {onExportWorkspace && (
                    <ActionBtn isDark={isDark} title="Export workspace (.doodlews)" onClick={() => onExportWorkspace(ws.id)}>
                      <Download size={12} />
                    </ActionBtn>
                  )}
                  {onDeleteWorkspace && workspaces.length > 1 && (
                    <ActionBtn isDark={isDark} danger title="Delete workspace" onClick={() => setConfirmDelete({ type: 'workspace', wsId: ws.id, name: ws.name })}>
                      <Trash2 size={12} />
                    </ActionBtn>
                  )}
                </div>
              </div>

              {/* Inline icon & color editor */}
              {isEditingIcon && (
                <div
                  style={{
                    margin: '0 8px 8px', padding: '10px',
                    borderRadius: '8px',
                    background: isLightTheme ? '#f1f5f9' : 'rgba(0,0,0,0.4)',
                    border: '1px solid ' + T.border,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Icon & Color</span>
                    <button onClick={() => setEditingIconWsId(null)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {WORKSPACE_THEME_ICONS.map(({ id, label, Icon }) => {
                      const sel = ws.icon === id;
                      return (
                        <button key={id} type="button"
                          onClick={() => { onUpdateWorkspace?.(ws.id, { icon: id }); setEditingIconWsId(null); }}
                          title={label}
                          style={{
                            width: 26, height: 26, borderRadius: 6, cursor: 'pointer', border: 'none', padding: 0,
                            background: sel ? T.accentFaint : (isLightTheme ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                            outline: sel ? ('1.5px solid ' + T.accent) : ('1px solid ' + T.border),
                            color: sel ? T.accent : T.textMuted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <Icon size={12} />
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: T.textMuted }}>Color</span>
                    {WORKSPACE_COLORS.map(({ id, name }) => {
                      const sel = (ws.color || T.accent) === id;
                      return (
                        <button key={id} type="button"
                          onClick={() => onUpdateWorkspace?.(ws.id, { color: id })}
                          title={name}
                          style={{
                            width: 16, height: 16, borderRadius: '50%', cursor: 'pointer', padding: 0,
                            background: id, border: sel ? (isLightTheme ? '2px solid #0f172a' : '2px solid #fff') : '2px solid transparent',
                            transform: sel ? 'scale(1.3)' : 'scale(1)', transition: 'all 0.1s',
                          }} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Files in this Workspace ───────────── */}
              {isExpanded && (
                <div style={{
                  borderTop: '1px solid ' + T.divider,
                  background: T.filesSectionBg,
                  padding: '4px 6px 6px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 6px 2px',
                  }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: T.textDim,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      Files ({files.length})
                    </span>
                    <button
                      onClick={() => onCreateFile?.(ws.id)}
                      title="New file in this workspace"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: T.textMuted,
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = isLightTheme ? '#0f172a' : '#fff'; e.currentTarget.style.background = isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'none'; }}
                    >
                      <Plus size={11} /> New File
                    </button>
                  </div>

                  {files.map((file) => {
                    const isFileActive = isWsActive && (file.id === ws.activeFileId || file.id === activeFileId);
                    const isEditingThisFile = editingFileId === file.id;
                    const fileShapes = (file.elements || []).filter((el) => !el.isDeleted).length;

                    return (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '7px',
                          background: isFileActive ? T.bgFileActive : T.bgFileRow,
                          border: isFileActive ? ('1px solid ' + T.borderFileActive) : '1px solid transparent',
                          cursor: isEditingThisFile ? 'default' : 'pointer',
                          transition: 'background 0.12s',
                          gap: 6,
                        }}
                        onClick={() => {
                          if (isEditingThisFile) return;
                          onSwitchFile?.(file.id, ws.id);
                          onClose?.();
                        }}
                        onMouseEnter={(e) => {
                          if (!isFileActive) e.currentTarget.style.background = isLightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isFileActive) e.currentTarget.style.background = T.bgFileRow;
                        }}
                      >
                        {/* File Name & Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                          <FileText
                            size={13}
                            style={{
                              color: isFileActive ? T.accent : T.textMuted,
                              flexShrink: 0,
                            }}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditingThisFile ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  ref={editFileInputRef}
                                  value={editFileName}
                                  onChange={(e) => setEditFileName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditFile(file.id, ws.id);
                                    if (e.key === 'Escape') setEditingFileId(null);
                                  }}
                                  onBlur={() => handleSaveEditFile(file.id, ws.id)}
                                  style={{
                                    background: T.inputBg,
                                    border: '1px solid ' + T.accent,
                                    borderRadius: '5px',
                                    padding: '2px 6px',
                                    fontSize: '12px',
                                    color: T.text,
                                    outline: 'none',
                                    minWidth: '100px',
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveEditFile(file.id, ws.id)}
                                  style={{
                                    background: T.accent,
                                    border: 'none',
                                    borderRadius: 4,
                                    color: '#fff',
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                  }}
                                >
                                  <Check size={11} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: isFileActive ? 600 : 400,
                                  color: isFileActive ? (isLightTheme ? '#4f46e5' : '#fff') : T.text,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {file.name}
                                </span>
                                {isFileActive && (
                                  <span style={{
                                    fontSize: '8px',
                                    fontWeight: 700,
                                    padding: '0 4px',
                                    borderRadius: '4px',
                                    background: isLightTheme ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.25)',
                                    color: isLightTheme ? '#4f46e5' : '#c7d2fe',
                                    letterSpacing: '0.04em',
                                    flexShrink: 0,
                                  }}>
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                            )}
                            <div style={{ fontSize: '9px', color: T.textMuted, marginTop: '1px' }}>
                              {fileShapes} {fileShapes === 1 ? 'shape' : 'shapes'}
                            </div>
                          </div>
                        </div>

                        {/* File Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <ActionBtn isDark={isDark} title="Rename file" onClick={(e) => handleStartEditFile(file, e)}>
                            <Pencil size={11} />
                          </ActionBtn>
                          {onDuplicateFile && (
                            <ActionBtn isDark={isDark} title="Duplicate file" onClick={() => onDuplicateFile(file.id, ws.id)}>
                              <Copy size={11} />
                            </ActionBtn>
                          )}
                          {onDeleteFile && files.length > 1 && (
                            <ActionBtn
                              isDark={isDark}
                              danger
                              title="Delete file"
                              onClick={() => setConfirmDelete({ type: 'file', fileId: file.id, wsId: ws.id, name: file.name })}
                            >
                              <Trash2 size={11} />
                            </ActionBtn>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add File button inside files section */}
                  <button
                    onClick={() => onCreateFile?.(ws.id)}
                    style={{
                      marginTop: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '5px',
                      borderRadius: '6px',
                      background: isLightTheme ? '#ffffff' : 'rgba(255,255,255,0.03)',
                      border: '1px dashed ' + (isLightTheme ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'),
                      color: T.textMuted,
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isLightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = isLightTheme ? '#0f172a' : '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isLightTheme ? '#ffffff' : 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.color = T.textMuted;
                    }}
                  >
                    <Plus size={11} /> New File in this Workspace
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: T.textMuted, fontSize: '12px' }}>
            No workspaces or files match "{searchQuery}"
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────── */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid ' + T.divider,
        fontSize: '10px', color: T.textDim, textAlign: 'center',
      }}>
        Saved offline on your device · Multi-file workspace
      </div>

      {confirmDelete && (
        <ThemedConfirmDialog
          isOpen={!!confirmDelete}
          title={confirmDelete.type === 'file' ? 'Delete File' : 'Delete Workspace'}
          subtitle="Confirm Action"
          message={
            confirmDelete.type === 'file'
              ? `Delete file "${confirmDelete.name}"?`
              : `Delete workspace "${confirmDelete.name}" and all its files?`
          }
          confirmText={confirmDelete.type === 'file' ? 'Delete File' : 'Delete Workspace'}
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            if (confirmDelete.type === 'file') {
              onDeleteFile?.(confirmDelete.fileId, confirmDelete.wsId);
            } else if (confirmDelete.type === 'workspace') {
              onDeleteWorkspace?.(confirmDelete.wsId);
            }
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
