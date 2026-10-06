import { useState, useEffect, useRef, useCallback } from 'react';

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

  // Periodic Auto-Save / Recovery Snapshot timer
  useEffect(() => {
    if (autoSaveMode === 'off' || !activeAPI) return;

    const timer = setInterval(() => {
      if (!isDirty) return;

      try {
        const elements = activeAPI.getSceneElements?.() || [];
        if (!elements || elements.length === 0) return;

        // Calculate lightweight version signature
        let versionSig = 0;
        for (let i = 0; i < elements.length; i++) {
          versionSig += (elements[i].version || 1);
        }

        // Skip serialization if scene has not mutated since last snapshot
        if (lastSnapshotVersionRef.current === versionSig && autoSaveMode !== 'direct') {
          return;
        }

        const appState = activeAPI.getAppState();
        const files = activeAPI.getFiles();

        if (elements && elements.length > 0) {
          // If direct mode and we have a path, save to file
          if (autoSaveMode === 'direct' && currentFilePath && onDirectSave) {
            onDirectSave();
          }

          lastSnapshotVersionRef.current = versionSig;

          // Always maintain crash recovery snapshot in storage
          const snapshot = {
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
            },
            files,
            filePath: currentFilePath,
            timestamp: Date.now(),
          };

          try {
            localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
          } catch (storageErr) {
            // QuotaExceeded fallback: store without heavy files payload so vector shapes are safe
            try {
              const fallbackSnapshot = { ...snapshot, files: {} };
              localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(fallbackSnapshot));
            } catch (innerErr) {
              console.warn('LocalStorage quota fully exceeded:', innerErr);
            }
          }

          try {
            localStorage.setItem(RECOVERY_META_KEY, JSON.stringify({
              filePath: currentFilePath,
              timestamp: Date.now(),
              elementsCount: elements.length,
            }));
          } catch {}
        }
      } catch (err) {
        console.error('AutoSave snapshot failed:', err);
      }
    }, Math.max(2, intervalSec) * 1000);

    return () => clearInterval(timer);
  }, [autoSaveMode, intervalSec, isDirty, currentFilePath, activeAPI, onDirectSave]);

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
