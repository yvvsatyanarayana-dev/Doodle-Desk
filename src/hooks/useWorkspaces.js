import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'doodle_desk_workspaces_v1';
const ACTIVE_ID_KEY = 'doodle_desk_active_workspace_id_v1';

// Normalizes legacy or newly structured workspace objects into the multi-file architecture
function normalizeWorkspace(ws, index = 0) {
  if (!ws || typeof ws !== 'object') {
    return createDefaultWorkspace();
  }

  const wsId = ws.id || `ws-${Date.now().toString(36)}-${index}`;
  const wsName = ws.name || (index === 0 ? 'Main Board' : `Board ${index + 1}`);
  const wsIcon = ws.icon || 'palette';
  const wsColor = ws.color || '#3b82f6';

  // Legacy binary files map (images embedded in canvas)
  const legacyBinaryFiles = (!Array.isArray(ws.files) && ws.files && typeof ws.files === 'object') ? ws.files : {};

  let fileList = [];
  if (Array.isArray(ws.files) && ws.files.length > 0) {
    fileList = ws.files.map((f, fIdx) => ({
      id: f.id || `file-${wsId}-${fIdx + 1}`,
      name: f.name || `Drawing ${fIdx + 1}`,
      elements: Array.isArray(f.elements) ? f.elements : [],
      appState: f.appState || { viewBackgroundColor: '#121212' },
      binaryFiles: f.binaryFiles || f.files || {},
      createdAt: f.createdAt || Date.now(),
      updatedAt: f.updatedAt || Date.now(),
    }));
  } else if (Array.isArray(ws.documents) && ws.documents.length > 0) {
    fileList = ws.documents.map((f, fIdx) => ({
      id: f.id || `file-${wsId}-${fIdx + 1}`,
      name: f.name || `Drawing ${fIdx + 1}`,
      elements: Array.isArray(f.elements) ? f.elements : [],
      appState: f.appState || { viewBackgroundColor: '#121212' },
      binaryFiles: f.binaryFiles || {},
      createdAt: f.createdAt || Date.now(),
      updatedAt: f.updatedAt || Date.now(),
    }));
  } else {
    // Migration: Legacy single-canvas workspace converted into first file
    fileList = [
      {
        id: `file-${wsId}-1`,
        name: ws.currentFileName || 'Untitled 1',
        elements: Array.isArray(ws.elements) ? ws.elements : [],
        appState: ws.appState || { viewBackgroundColor: '#121212' },
        binaryFiles: legacyBinaryFiles,
        createdAt: ws.createdAt || Date.now(),
        updatedAt: ws.updatedAt || Date.now(),
      },
    ];
  }

  // Ensure activeFileId points to a valid file
  let activeFileId = ws.activeFileId;
  if (!activeFileId || !fileList.some((f) => f.id === activeFileId)) {
    activeFileId = fileList[0].id;
  }

  const activeFile = fileList.find((f) => f.id === activeFileId) || fileList[0];

  return {
    ...ws,
    id: wsId,
    name: wsName,
    icon: wsIcon,
    color: wsColor,
    activeFileId,
    files: fileList,
    // Mirrored for backward-compatibility with code reading ws.elements/ws.appState
    elements: activeFile.elements || [],
    appState: activeFile.appState || { viewBackgroundColor: '#121212' },
    createdAt: ws.createdAt || Date.now(),
    updatedAt: ws.updatedAt || Date.now(),
  };
}

function createDefaultWorkspace() {
  const fileId = `file-default-1`;
  return {
    id: 'ws-default',
    name: 'Main',
    icon: 'palette',
    color: '#3b82f6',
    activeFileId: fileId,
    files: [
      {
        id: fileId,
        name: 'Untitled 1',
        elements: [],
        appState: {
          viewBackgroundColor: '#121212',
        },
        binaryFiles: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    elements: [],
    appState: {
      viewBackgroundColor: '#121212',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function useWorkspaces({ doodleAPI, canvasAPI }) {
  const activeAPI = doodleAPI || canvasAPI;
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((ws, i) => normalizeWorkspace(ws, i));
        }
      }
    } catch (e) {
      console.warn('Failed to load workspaces from storage:', e);
    }
    return [createDefaultWorkspace()];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    try {
      const savedActive = localStorage.getItem(ACTIVE_ID_KEY);
      if (savedActive) return savedActive;
    } catch {}
    return 'ws-default';
  });

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || createDefaultWorkspace();
  const activeFile = activeWorkspace.files?.find((f) => f.id === activeWorkspace.activeFileId) || activeWorkspace.files?.[0] || null;

  const isSwitchingRef = useRef(false);
  const lastSnapshotSigRef = useRef(null);
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  activeWorkspaceIdRef.current = activeWorkspaceId;
  const activeFileIdRef = useRef(activeFile?.id);
  activeFileIdRef.current = activeFile?.id;

  // Persist workspaces list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
      localStorage.setItem(ACTIVE_ID_KEY, activeWorkspaceId);
    } catch (e) {
      console.warn('Failed to persist workspaces:', e);
    }
  }, [workspaces, activeWorkspaceId]);

  // Save current canvas state into the active file inside active workspace
  const saveActiveWorkspaceSnapshot = useCallback((force = false) => {
    if (!activeAPI || isSwitchingRef.current) return;
    try {
      const elements = activeAPI.getSceneElements?.() || [];
      const appState = activeAPI.getAppState?.() || {};
      const binaryFiles = activeAPI.getFiles?.() || {};

      let sig = elements.length;
      for (let i = 0; i < elements.length; i++) {
        sig += (elements[i].version || 1);
      }

      if (!force && lastSnapshotSigRef.current === sig) {
        return;
      }
      lastSnapshotSigRef.current = sig;

      const currentWsId = activeWorkspaceIdRef.current;
      const currentFileId = activeFileIdRef.current;

      setWorkspaces((prev) =>
        prev.map((ws) => {
          if (ws.id !== currentWsId) return ws;

          const updatedFiles = (ws.files || []).map((file) => {
            if (file.id === currentFileId || (!currentFileId && file.id === ws.activeFileId)) {
              return {
                ...file,
                elements,
                appState: {
                  viewBackgroundColor: appState.viewBackgroundColor,
                  gridSize: appState.gridSize,
                  zoom: appState.zoom,
                  scrollX: appState.scrollX,
                  scrollY: appState.scrollY,
                },
                binaryFiles,
                updatedAt: Date.now(),
              };
            }
            return file;
          });

          return {
            ...ws,
            files: updatedFiles,
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
              zoom: appState.zoom,
              scrollX: appState.scrollX,
              scrollY: appState.scrollY,
            },
            updatedAt: Date.now(),
          };
        })
      );
    } catch (err) {
      console.warn('Failed to snapshot active workspace file:', err);
    }
  }, [activeAPI]);

  // Periodic workspace snapshot timer (every 6s) to persist state
  useEffect(() => {
    if (!activeAPI) return;
    const timer = setInterval(() => {
      saveActiveWorkspaceSnapshot(false);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeAPI, saveActiveWorkspaceSnapshot]);

  // Save on page exit / unload
  useEffect(() => {
    const handleUnload = () => {
      saveActiveWorkspaceSnapshot(true);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [saveActiveWorkspaceSnapshot]);

  // Switch to another file within a workspace (or across workspaces)
  const switchFile = useCallback(
    (targetFileId, targetWsId = activeWorkspaceIdRef.current) => {
      if (!activeAPI) return;

      const ws = workspaces.find((w) => w.id === targetWsId);
      if (!ws) return;
      const targetFile = ws.files?.find((f) => f.id === targetFileId);
      if (!targetFile) return;

      // If already active file in active workspace, do nothing
      if (targetWsId === activeWorkspaceIdRef.current && targetFileId === activeFileIdRef.current) {
        return;
      }

      // 1. Snapshot current active file
      saveActiveWorkspaceSnapshot(true);

      isSwitchingRef.current = true;
      activeWorkspaceIdRef.current = targetWsId;
      activeFileIdRef.current = targetFileId;

      // 2. Update workspace active file and switch active workspace if needed
      setActiveWorkspaceId(targetWsId);
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === targetWsId
            ? {
                ...w,
                activeFileId: targetFileId,
                elements: targetFile.elements || [],
                appState: targetFile.appState || { viewBackgroundColor: '#121212' },
                updatedAt: Date.now(),
              }
            : w
        )
      );

      // 3. Load target file scene into Doodle Engine
      setTimeout(() => {
        try {
          lastSnapshotSigRef.current = null;
          activeAPI.resetScene();
          activeAPI.updateScene({
            elements: targetFile.elements || [],
            appState: {
              ...(targetFile.appState || {}),
              activeTool: { type: 'selection' },
              showWelcomeScreen: (targetFile.elements || []).filter((el) => !el.isDeleted).length === 0,
            },
            commitToHistory: false,
          });

          if (targetFile.binaryFiles && Object.keys(targetFile.binaryFiles).length > 0) {
            activeAPI.addFiles?.(Object.values(targetFile.binaryFiles));
          }
        } finally {
          isSwitchingRef.current = false;
        }
      }, 40);
    },
    [activeAPI, workspaces, saveActiveWorkspaceSnapshot]
  );

  // Switch to another workspace smoothly (loads that workspace's active file)
  const switchWorkspace = useCallback(
    (targetId) => {
      if (targetId === activeWorkspaceId || !activeAPI) return;
      const targetWorkspace = workspaces.find((w) => w.id === targetId);
      if (!targetWorkspace) return;

      const targetFile =
        targetWorkspace.files?.find((f) => f.id === targetWorkspace.activeFileId) ||
        targetWorkspace.files?.[0];

      if (targetFile) {
        switchFile(targetFile.id, targetId);
      } else {
        // Fallback for empty file list
        saveActiveWorkspaceSnapshot(true);
        setActiveWorkspaceId(targetId);
      }
    },
    [activeWorkspaceId, activeAPI, workspaces, saveActiveWorkspaceSnapshot, switchFile]
  );

  // Create a brand new file inside a workspace
  const createFile = useCallback(
    (workspaceId = activeWorkspaceIdRef.current, customName = '') => {
      // 1. Snapshot current active file
      saveActiveWorkspaceSnapshot(true);

      const targetWs = workspaces.find((w) => w.id === workspaceId) || activeWorkspace;
      const existingCount = targetWs?.files?.length || 0;
      const newFileId = `file-${workspaceId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const fileName = customName.trim() || `Untitled ${existingCount + 1}`;

      const newFile = {
        id: newFileId,
        name: fileName,
        elements: [],
        appState: {
          viewBackgroundColor: targetWs?.appState?.viewBackgroundColor || '#121212',
        },
        binaryFiles: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      activeWorkspaceIdRef.current = workspaceId;
      activeFileIdRef.current = newFileId;

      if (workspaceId !== activeWorkspaceId) {
        setActiveWorkspaceId(workspaceId);
      }

      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id !== workspaceId) return w;
          const updatedFiles = [...(w.files || []), newFile];
          return {
            ...w,
            files: updatedFiles,
            activeFileId: newFileId,
            elements: [],
            appState: newFile.appState,
            updatedAt: Date.now(),
          };
        })
      );

      // Reset Doodle Engine to brand new empty drawing
      if (activeAPI) {
        isSwitchingRef.current = true;
        setTimeout(() => {
          try {
            lastSnapshotSigRef.current = null;
            activeAPI.resetScene();
            activeAPI.updateScene({
              elements: [],
              appState: {
                viewBackgroundColor: newFile.appState.viewBackgroundColor || '#121212',
                showWelcomeScreen: true,
              },
              commitToHistory: false,
            });
          } finally {
            isSwitchingRef.current = false;
          }
        }, 40);
      }

      return newFileId;
    },
    [saveActiveWorkspaceSnapshot, workspaces, activeWorkspace, activeWorkspaceId, activeAPI]
  );

  // Rename a file
  const renameFile = useCallback(
    (fileId, newName, workspaceId = activeWorkspaceIdRef.current) => {
      const trimmed = (newName || '').trim();
      if (!trimmed) return;

      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id !== workspaceId) return w;
          return {
            ...w,
            files: (w.files || []).map((f) => (f.id === fileId ? { ...f, name: trimmed, updatedAt: Date.now() } : f)),
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  // Duplicate a file
  const duplicateFile = useCallback(
    (fileId, workspaceId = activeWorkspaceIdRef.current) => {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) return;
      const source = ws.files?.find((f) => f.id === fileId);
      if (!source) return;

      const newFileId = `file-${workspaceId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const clone = {
        ...source,
        id: newFileId,
        name: `${source.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === workspaceId
            ? {
                ...w,
                files: [...(w.files || []), clone],
                updatedAt: Date.now(),
              }
            : w
        )
      );

      return newFileId;
    },
    [workspaces]
  );

  // Delete a file from workspace
  const deleteFile = useCallback(
    (fileId, workspaceId = activeWorkspaceIdRef.current) => {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (!ws) return false;

      if ((ws.files || []).length <= 1) {
        alert('Each workspace must have at least one file. You can create a new file before deleting this one.');
        return false;
      }

      const remainingFiles = (ws.files || []).filter((f) => f.id !== fileId);
      const isDeletingActive = ws.activeFileId === fileId;
      const nextActiveFile = isDeletingActive ? remainingFiles[0] : ws.files.find((f) => f.id === ws.activeFileId) || remainingFiles[0];

      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === workspaceId
            ? {
                ...w,
                files: remainingFiles,
                activeFileId: nextActiveFile.id,
                elements: nextActiveFile.elements || [],
                appState: nextActiveFile.appState || { viewBackgroundColor: '#121212' },
                updatedAt: Date.now(),
              }
            : w
        )
      );

      // If we deleted the file currently showing on screen, load the next active file
      if (workspaceId === activeWorkspaceIdRef.current && isDeletingActive && activeAPI) {
        switchFile(nextActiveFile.id, workspaceId);
      }

      return true;
    },
    [workspaces, activeAPI, switchFile]
  );

  // Create a brand new workspace
  const createWorkspace = useCallback(
    ({ name = 'New Workspace', icon = '📝', color = '#10b981', initialElements = [] } = {}) => {
      saveActiveWorkspaceSnapshot(true);

      const newWsId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const firstFileId = `file-${newWsId}-1`;

      const firstFile = {
        id: firstFileId,
        name: 'Untitled 1',
        elements: initialElements,
        appState: {
          viewBackgroundColor: '#121212',
        },
        binaryFiles: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const newWs = {
        id: newWsId,
        name: name.trim() || 'Untitled Workspace',
        icon: icon || '📝',
        color: color || '#10b981',
        activeFileId: firstFileId,
        files: [firstFile],
        elements: initialElements,
        appState: firstFile.appState,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWsId);
      activeWorkspaceIdRef.current = newWsId;
      activeFileIdRef.current = firstFileId;

      if (activeAPI) {
        isSwitchingRef.current = true;
        setTimeout(() => {
          try {
            lastSnapshotSigRef.current = null;
            activeAPI.resetScene();
            activeAPI.updateScene({
              elements: initialElements,
              appState: {
                showWelcomeScreen: initialElements.length === 0,
              },
            });
          } finally {
            isSwitchingRef.current = false;
          }
        }, 50);
      }

      return newWsId;
    },
    [saveActiveWorkspaceSnapshot, activeAPI]
  );

  // Rename or re-style a workspace
  const updateWorkspaceMetadata = useCallback((id, updates) => {
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.id === id ? { ...ws, ...updates, updatedAt: Date.now() } : ws))
    );
  }, []);

  // Duplicate an existing workspace (with all its files)
  const duplicateWorkspace = useCallback(
    (id) => {
      const source = workspaces.find((w) => w.id === id);
      if (!source) return;

      const newWsId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const clonedFiles = (source.files || []).map((f, idx) => ({
        ...f,
        id: `file-${newWsId}-${idx + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      const clone = {
        ...source,
        id: newWsId,
        name: `${source.name} (Copy)`,
        activeFileId: clonedFiles[0]?.id || `file-${newWsId}-1`,
        files: clonedFiles,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspaces((prev) => [...prev, clone]);
      return newWsId;
    },
    [workspaces]
  );

  // Delete a workspace
  const deleteWorkspace = useCallback(
    (id) => {
      if (workspaces.length <= 1) {
        alert('You must have at least one workspace.');
        return false;
      }

      const remaining = workspaces.filter((w) => w.id !== id);
      setWorkspaces(remaining);

      // If active workspace was deleted, switch to the first remaining
      if (activeWorkspaceId === id) {
        const nextWs = remaining[0];
        const nextFile = nextWs.files?.find((f) => f.id === nextWs.activeFileId) || nextWs.files?.[0];
        setActiveWorkspaceId(nextWs.id);
        activeWorkspaceIdRef.current = nextWs.id;
        activeFileIdRef.current = nextFile?.id;

        if (activeAPI && nextFile) {
          activeAPI.resetScene();
          activeAPI.updateScene({
            elements: nextFile.elements || [],
            appState: {
              ...(nextFile.appState || {}),
              showWelcomeScreen: (nextFile.elements || []).filter((el) => !el.isDeleted).length === 0,
            },
          });
          if (nextFile.binaryFiles) {
            activeAPI.addFiles?.(Object.values(nextFile.binaryFiles));
          }
        }
      }
      return true;
    },
    [workspaces, activeWorkspaceId, activeAPI]
  );

  // Export workspace as JSON file (includes all files in workspace)
  const exportWorkspace = useCallback(
    (id) => {
      const ws = workspaces.find((w) => w.id === id);
      if (!ws) return;

      const dataStr = JSON.stringify(ws, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ws.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.doodlews`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [workspaces]
  );

  // Import workspace from JSON
  const importWorkspace = useCallback(
    (jsonContent) => {
      try {
        const parsed = JSON.parse(jsonContent);
        if (!parsed.name) {
          throw new Error('Invalid workspace data format.');
        }

        const normalized = normalizeWorkspace(parsed, workspaces.length);
        const newId = `ws-imp-${Date.now().toString(36)}`;
        const imported = {
          ...normalized,
          id: newId,
          name: `${normalized.name} (Imported)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setWorkspaces((prev) => [...prev, imported]);
        switchWorkspace(newId);
        return true;
      } catch (err) {
        console.error('Import failed:', err);
        alert(`Failed to import workspace: ${err.message}`);
        return false;
      }
    },
    [switchWorkspace, workspaces.length]
  );

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    activeFile,
    activeFileId: activeFile?.id,
    switchWorkspace,
    createWorkspace,
    updateWorkspaceMetadata,
    duplicateWorkspace,
    deleteWorkspace,
    exportWorkspace,
    importWorkspace,
    saveActiveWorkspaceSnapshot,
    // Multi-file actions:
    createFile,
    switchFile,
    renameFile,
    duplicateFile,
    deleteFile,
  };
}

export default useWorkspaces;
