import { useState, useEffect, useRef, useCallback } from 'react';
import { cancelIdleTask, scheduleIdleTask } from '../utils/idleTask.js';

const RECOVERY_STORAGE_KEY = 'doodle_desktop_recovery_data';
const RECOVERY_META_KEY = 'doodle_desktop_recovery_meta';

export function useAutoSave({ doodleAPI, canvasAPI, currentFilePath, isDirty, onDirectSave }) {
  const activeAPI = doodleAPI || canvasAPI;
  const [autoSaveMode, setAutoSaveMode] = useState('interval'); // 'interval' | 'direct' | 'off'
  const [intervalSec, setIntervalSec] = useState(5);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [recoveryMeta, setRecoveryMeta] = useState(null);

  // Load preferences
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('autoSaveMode', 'interval').then(mode => setAutoSaveMode(mode || 'interval'));
      window.electronAPI.getSetting('autoSaveIntervalSec', 5).then(sec => setIntervalSec(sec || 5));
    }
  }, []);

  // Check for crash recovery on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(RECOVERY_STORAGE_KEY);
      const savedMetaStr = localStorage.getItem(RECOVERY_META_KEY);
      if (savedData && savedMetaStr) {
        const meta = JSON.parse(savedMetaStr);
        // Only prompt if there is unsaved work recorded
        if (meta && meta.elementsCount > 0) {
          setHasRecoverySession(true);
          setRecoveryMeta(meta);
        }
      }
    } catch (e) {
      console.error('Failed to check recovery data:', e);
    }
  }, []);

  const lastSnapshotVersionRef = useRef(null);
  const latestOptionsRef = useRef(null);
  latestOptionsRef.current = {
    activeAPI,
    autoSaveMode,
    currentFilePath,
    isDirty,
    onDirectSave,
  };

  // Periodic Auto-Save / Recovery Snapshot timer
  useEffect(() => {
    if (autoSaveMode === 'off' || !activeAPI) return;

    let pendingTask = null;
    const writeSnapshot = () => {
      pendingTask = null;
      const {
        activeAPI: currentAPI,
        autoSaveMode: currentMode,
        currentFilePath: currentPath,
        isDirty: currentIsDirty,
        onDirectSave: saveDirectly,
      } = latestOptionsRef.current || {};
      if (!currentAPI || !currentIsDirty) return;

      try {
        const elements = currentAPI.getSceneElements?.() || [];
        if (!elements || elements.length === 0) return;

        let versionSig = 0;
        for (let i = 0; i < elements.length; i++) {
          versionSig += (elements[i].version || 1);
        }

        if (lastSnapshotVersionRef.current === versionSig && currentMode !== 'direct') {
          return;
        }

        const appState = currentAPI.getAppState();
        const files = currentAPI.getFiles();

        if (currentMode === 'direct' && currentPath && saveDirectly) {
          saveDirectly();
        }

        lastSnapshotVersionRef.current = versionSig;
        const snapshot = {
          elements,
          appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          },
          files,
          filePath: currentPath,
          timestamp: Date.now(),
        };

        try {
          localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
        } catch (storageErr) {
          try {
            const fallbackSnapshot = { ...snapshot, files: {} };
            localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(fallbackSnapshot));
          } catch (innerErr) {
            console.warn('LocalStorage quota fully exceeded:', innerErr);
          }
        }

        try {
          localStorage.setItem(RECOVERY_META_KEY, JSON.stringify({
            filePath: currentPath,
            timestamp: Date.now(),
            elementsCount: elements.length,
          }));
        } catch {}
      } catch (err) {
        console.error('AutoSave snapshot failed:', err);
      }
    };

    const timer = setInterval(() => {
      if (!latestOptionsRef.current?.isDirty || pendingTask) return;
      pendingTask = scheduleIdleTask(writeSnapshot, 1200);
    }, Math.max(2, intervalSec) * 1000);

    const flushPendingSnapshot = () => {
      if (!latestOptionsRef.current?.isDirty) return;
      cancelIdleTask(pendingTask);
      writeSnapshot();
    };
    window.addEventListener('beforeunload', flushPendingSnapshot);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', flushPendingSnapshot);
      cancelIdleTask(pendingTask);
    };
  }, [autoSaveMode, intervalSec, activeAPI]);

  const clearRecovery = useCallback(() => {
    try {
      localStorage.removeItem(RECOVERY_STORAGE_KEY);
      localStorage.removeItem(RECOVERY_META_KEY);
      setHasRecoverySession(false);
      setRecoveryMeta(null);
    } catch (e) {}
  }, []);

  const restoreRecovery = useCallback(() => {
    try {
      const dataStr = localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (dataStr && activeAPI) {
        const parsed = JSON.parse(dataStr);
        if (parsed.elements) {
          activeAPI.updateScene({
            elements: parsed.elements,
            appState: parsed.appState,
          });
          if (parsed.files) {
            activeAPI.addFiles(Object.values(parsed.files));
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore recovery session:', e);
    } finally {
      clearRecovery();
    }
  }, [activeAPI, clearRecovery]);

  return {
    autoSaveMode,
    setAutoSaveMode,
    hasRecoverySession,
    recoveryMeta,
    restoreRecovery,
    clearRecovery,
  };
}
