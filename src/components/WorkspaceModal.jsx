import React, { useState, useRef, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Check,
  X,
  Pencil,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  Palette,
  Layout,
  Rocket,
  Lightbulb,
  Kanban,
  Compass,
  Code2,
  Folder,
  Cpu,
  Flame,
  Zap,
  Workflow,
  Target,
  Smartphone,
  Box,
  BrainCircuit,
  PenTool,
} from 'lucide-react';
import { WORKSPACE_THEME_ICONS, WORKSPACE_COLORS, WorkspaceIconBadge } from './WorkspaceIcons';
import { ThemedConfirmDialog } from './ThemedConfirmDialog';

export { WORKSPACE_THEME_ICONS, WORKSPACE_COLORS, WorkspaceIconBadge } from './WorkspaceIcons';

export default function WorkspaceModal({
  isOpen,
  onClose,
  workspaces = [],
  activeWorkspaceId,
  onSwitchWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onUpdateWorkspaceMetadata,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onExportWorkspace,
  onImportWorkspace,
  theme = 'dark',
}) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('palette');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(null);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editingIconWorkspaceId, setEditingIconWorkspaceId] = useState(null);

  const fileInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Safe handler aliases to prevent prop mismatch bugs
  const handleUpdate = onUpdateWorkspace || onUpdateWorkspaceMetadata;
  const handleSwitch = onSwitchWorkspace || onSelectWorkspace;

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  if (!isOpen) return null;

  const filtered = workspaces.filter((w) =>
    (w.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewName(`Board ${workspaces.length + 1}`);
    const randomIcon = WORKSPACE_THEME_ICONS[Math.floor(Math.random() * WORKSPACE_THEME_ICONS.length)].id;
    const randomColor = WORKSPACE_COLORS[Math.floor(Math.random() * WORKSPACE_COLORS.length)].id;
    setSelectedIcon(randomIcon);
    setSelectedColor(randomColor);
  };

  const handleConfirmCreate = () => {
    if (!newName.trim()) return;
    if (onCreateWorkspace) {
      onCreateWorkspace({
        name: newName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        initialElements: [],
      });
    }
    setIsCreating(false);
  };

  const handleStartEdit = (ws, e) => {
    if (e?.stopPropagation) e.stopPropagation();
    setEditingId(ws.id);
    setEditName(ws.name);
  };

  const handleSaveEdit = (id) => {
    const trimmed = editName.trim();
    if (trimmed && handleUpdate) {
      handleUpdate(id, { name: trimmed });
    }
    setEditingId(null);
  };

  const handleSelectIconForWorkspace = (id, iconId) => {
    if (handleUpdate) {
      handleUpdate(id, { icon: iconId });
    }
    setEditingIconWorkspaceId(null);
  };

  const handleSelectColorForWorkspace = (id, colorHex) => {
    if (handleUpdate) {
      handleUpdate(id, { color: colorHex });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (onImportWorkspace) {
        onImportWorkspace(event.target.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isLightTheme = theme === 'light';
  const T = isLightTheme
    ? {
        bg: '#ffffff',
        bgSubtle: '#f8fafc',
        border: 'rgba(0, 0, 0, 0.09)',
        borderSubtle: 'rgba(0, 0, 0, 0.06)',
        borderCurrent: 'rgba(99, 102, 241, 0.45)',
        text: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        textDim: '#94a3b8',
        inputBg: '#f1f5f9',
        inputBorder: 'rgba(0, 0, 0, 0.12)',
        btnBg: '#f1f5f9',
        btnBorder: 'rgba(0, 0, 0, 0.1)',
        btnText: '#1e293b',
        cardBg: '#ffffff',
        cardActiveBg: 'rgba(99, 102, 241, 0.08)',
        cardBorder: 'rgba(0, 0, 0, 0.08)',
        cardHover: '#f8fafc',
        shadow: '0 25px 60px -15px rgba(0, 0, 0, 0.18), 0 0 35px rgba(99, 102, 241, 0.08)',
        headerBg: 'linear-gradient(180deg, rgba(0,0,0,0.01) 0%, transparent 100%)',
      }
    : {
        bg: '#18181b',
        bgSubtle: 'rgba(0, 0, 0, 0.2)',
        border: 'rgba(255, 255, 255, 0.12)',
        borderSubtle: 'rgba(255, 255, 255, 0.06)',
        borderCurrent: 'rgba(59, 130, 246, 0.4)',
        text: '#f4f4f5',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        textDim: '#52525b',
        inputBg: 'rgba(255, 255, 255, 0.05)',
        inputBorder: 'rgba(255, 255, 255, 0.1)',
        btnBg: 'rgba(255, 255, 255, 0.06)',
        btnBorder: 'rgba(255, 255, 255, 0.1)',
        btnText: '#d4d4d8',
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardActiveBg: 'rgba(59, 130, 246, 0.1)',
        cardBorder: 'rgba(255, 255, 255, 0.07)',
        cardHover: 'rgba(255, 255, 255, 0.06)',
        shadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(59, 130, 246, 0.1)',
        headerBg: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
      };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '720px',
          maxWidth: '95vw',
          maxHeight: '88vh',
          backgroundColor: T.bg,
          borderRadius: '18px',
          border: '1px solid ' + T.border,
          boxShadow: T.shadow,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: T.text,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid ' + T.borderSubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: T.headerBg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: isLightTheme ? 'rgba(99, 102, 241, 0.12)' : 'rgba(59, 130, 246, 0.15)',
                border: '1px solid ' + (isLightTheme ? 'rgba(99, 102, 241, 0.25)' : 'rgba(59, 130, 246, 0.3)'),
                color: isLightTheme ? '#4f46e5' : '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderKanban size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, letterSpacing: '-0.01em', color: T.text }}>
                Workspaces & Projects
              </h2>
              <p style={{ fontSize: '12px', color: T.textMuted, margin: '3px 0 0' }}>
                Organize, switch, and back up multiple drawing boards seamlessly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: T.textMuted,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search, Create, Import */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid ' + T.borderSubtle,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: T.bgSubtle,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: T.textMuted,
              }}
            />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                backgroundColor: T.inputBg,
                border: '1px solid ' + T.inputBorder,
                color: T.text,
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleStartCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>New Workspace</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".doodlews,.json"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Workspace (.doodlews)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: T.btnBg,
              color: T.btnText,
              border: '1px solid ' + T.btnBorder,
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Upload size={14} />
            <span>Import</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* New Workspace Creation Form */}
          {isCreating && (
            <div
              style={{
                padding: '18px',
                borderRadius: '14px',
                backgroundColor: isLightTheme ? '#f8fafc' : 'rgba(59, 130, 246, 0.06)',
                border: '1px solid ' + (isLightTheme ? 'rgba(99, 102, 241, 0.25)' : 'rgba(59, 130, 246, 0.25)'),
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: isLightTheme ? '#4f46e5' : '#93c5fd' }}>Create New Board</span>
                <button
                  onClick={() => setIsCreating(false)}
                  style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 0 }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Name & Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmCreate();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: T.inputBg,
                    border: '1px solid ' + T.inputBorder,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: T.text,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleConfirmCreate}
                  style={{
                    backgroundColor: isLightTheme ? '#6366f1' : '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create
                </button>
              </div>

              {/* Theme Vector Icon Selector */}
              <div>
                <span style={{ fontSize: '11px', color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Choose App Theme Icon:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {WORKSPACE_THEME_ICONS.map((item) => {
                    const isSelected = selectedIcon === item.id;
                    const ItemIcon = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        title={item.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? (isLightTheme ? 'rgba(99, 102, 241, 0.15)' : 'rgba(59, 130, 246, 0.25)') : (isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)'),
                          border: isSelected ? ('1.5px solid ' + (isLightTheme ? '#6366f1' : '#3b82f6')) : ('1px solid ' + T.border),
                          color: isSelected ? (isLightTheme ? '#6366f1' : '#60a5fa') : T.textMuted,
                          cursor: 'pointer',
                          transition: 'all 0.1s',
                        }}
                      >
                        <ItemIcon size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <span style={{ fontSize: '11px', color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Accent Color:
                </span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {WORKSPACE_COLORS.map((col) => {
                    const isSelected = selectedColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setSelectedColor(col.id)}
                        title={col.name}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: col.id,
                          border: isSelected ? (isLightTheme ? '2px solid #0f172a' : '2px solid #ffffff') : '2px solid transparent',
                          transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                          cursor: 'pointer',
                          boxShadow: isSelected ? `0 0 10px ${col.id}` : 'none',
                          transition: 'all 0.1s',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Workspaces List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              const files = ws.files || [];
              const totalShapes = files.length > 0
                ? files.reduce((acc, f) => acc + (f.elements || []).filter((el) => !el.isDeleted).length, 0)
                : (ws.elements || []).filter((el) => !el.isDeleted).length;
              const fileCount = files.length > 0 ? files.length : 1;
              const isEditing = editingId === ws.id;
              const isChangingIcon = editingIconWorkspaceId === ws.id;

              return (
                <div
                  key={ws.id}
                  onClick={() => {
                    if (isEditing || isChangingIcon) return;
                    if (handleSwitch) {
                      handleSwitch(ws.id);
                      onClose();
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: isActive ? T.cardActiveBg : T.cardBg,
                    border: isActive ? ('1.5px solid ' + T.borderCurrent) : ('1px solid ' + T.cardBorder),
                    cursor: isEditing ? 'default' : 'pointer',
                    transition: 'all 0.15s ease',
                    gap: isChangingIcon ? '12px' : '0px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {/* Left: Icon & Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      {/* Clickable Icon Badge */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingIconWorkspaceId(isChangingIcon ? null : ws.id);
                        }}
                        title="Click to change workspace icon"
                        style={{ cursor: 'pointer' }}
                      >
                        <WorkspaceIconBadge icon={ws.icon} color={ws.color || (isLightTheme ? '#6366f1' : '#3b82f6')} size={18} />
                      </div>

                      {/* Name display or inline edit */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing ? (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(ws.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onBlur={() => handleSaveEdit(ws.id)}
                              style={{
                                backgroundColor: T.inputBg,
                                border: '1.5px solid ' + (isLightTheme ? '#6366f1' : '#3b82f6'),
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '13px',
                                color: T.text,
                                outline: 'none',
                                minWidth: '160px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(ws.id)}
                              style={{
                                backgroundColor: '#10b981',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#fff',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: T.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ws.name}
                            </span>
                            {isActive && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '999px',
                                  backgroundColor: isLightTheme ? 'rgba(99, 102, 241, 0.12)' : 'rgba(59, 130, 246, 0.25)',
                                  color: isLightTheme ? '#4f46e5' : '#60a5fa',
                                  border: '1px solid ' + (isLightTheme ? 'rgba(99, 102, 241, 0.25)' : 'rgba(59, 130, 246, 0.4)'),
                                  letterSpacing: '0.04em',
                                }}
                              >
                                CURRENT
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '3px', display: 'flex', gap: '8px' }}>
                          <span>{fileCount} {fileCount === 1 ? 'file' : 'files'} · {totalShapes} {totalShapes === 1 ? 'shape' : 'shapes'}</span>
                          <span>•</span>
                          <span>Updated {new Date(ws.updatedAt || ws.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Icons */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Rename Button */}
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(ws, e)}
                        title="Rename Workspace"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: T.textMuted,
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                      >
                        <Pencil size={14} />
                      </button>

                      {/* Duplicate Button */}
                      {onDuplicateWorkspace && (
                        <button
                          type="button"
                          onClick={() => onDuplicateWorkspace(ws.id)}
                          title="Duplicate Workspace"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.textMuted,
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      )}

                      {/* Export Button */}
                      {onExportWorkspace && (
                        <button
                          type="button"
                          onClick={() => onExportWorkspace(ws.id)}
                          title="Export Workspace (.doodlews)"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.textMuted,
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                          }}
                        >
                          <Download size={14} />
                        </button>
                      )}

                      {/* Delete Button (disabled if only 1 workspace) */}
                      {onDeleteWorkspace && workspaces.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteWs({ id: ws.id, name: ws.name })}
                          title="Delete Workspace"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '6px',
                            opacity: 0.8,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Icon & Color Quick-Editor when icon badge clicked */}
                  {isChangingIcon && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: isLightTheme ? '#f1f5f9' : 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid ' + T.border,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        marginTop: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: isLightTheme ? '#4f46e5' : '#93c5fd', fontWeight: 600 }}>Change Theme Icon & Color</span>
                        <button
                          onClick={() => setEditingIconWorkspaceId(null)}
                          style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 0 }}
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* Icon options */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {WORKSPACE_THEME_ICONS.map((item) => {
                          const isSelected = ws.icon === item.id;
                          const ItemIcon = item.Icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectIconForWorkspace(ws.id, item.id)}
                              title={item.label}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '6px',
                                backgroundColor: isSelected ? (isLightTheme ? 'rgba(99, 102, 241, 0.15)' : 'rgba(59, 130, 246, 0.25)') : (isLightTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                                border: isSelected ? ('1.5px solid ' + (isLightTheme ? '#6366f1' : '#3b82f6')) : ('1px solid ' + T.border),
                                color: isSelected ? (isLightTheme ? '#6366f1' : '#60a5fa') : T.textMuted,
                                cursor: 'pointer',
                              }}
                            >
                              <ItemIcon size={14} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Color options */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: T.textMuted }}>Color:</span>
                        {WORKSPACE_COLORS.map((col) => {
                          const isSelected = (ws.color || (isLightTheme ? '#6366f1' : '#3b82f6')) === col.id;
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => handleSelectColorForWorkspace(ws.id, col.id)}
                              title={col.name}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: col.id,
                                border: isSelected ? (isLightTheme ? '2px solid #0f172a' : '2px solid #ffffff') : '2px solid transparent',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px',
                  color: T.textMuted,
                  fontSize: '13px',
                }}
              >
                No workspaces found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid ' + T.borderSubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: T.bgSubtle,
          }}
        >
          <span style={{ fontSize: '11px', color: T.textMuted }}>
            All workspaces are saved offline directly on your device.
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              backgroundColor: T.btnBg,
              border: '1px solid ' + T.btnBorder,
              borderRadius: '8px',
              color: T.text,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>

      {confirmDeleteWs && (
        <ThemedConfirmDialog
          isOpen={!!confirmDeleteWs}
          title="Delete Workspace"
          subtitle="Confirm Action"
          message={`Delete workspace "${confirmDeleteWs.name}" and all its files?`}
          confirmText="Delete Workspace"
          cancelText="Cancel"
          danger={true}
          onConfirm={() => {
            onDeleteWorkspace?.(confirmDeleteWs.id);
            setConfirmDeleteWs(null);
          }}
          onCancel={() => setConfirmDeleteWs(null)}
        />
      )}
    </div>
  );
}
