import { useState, useEffect, useCallback, useRef } from 'react';
import { serializeAsJSON } from '../engine/elements.js';
import { loadFromBlob, exportToBlob, exportToSvg } from '../engine/io/export.js';

export function useFileActions({ doodleAPI, canvasAPI }) {
  const activeAPI = doodleAPI || canvasAPI;
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState(null); // 'new' | 'open' | 'close' | 'quit'
  const [pendingOpenPath, setPendingOpenPath] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Sync document state with Electron Window
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.updateDocumentState({
        filePath: currentFilePath,
        isDirty,
      });
    }
  }, [currentFilePath, isDirty]);

  // Mark document dirty on user edits
  const onSceneChange = useCallback((elements, appState) => {
    // Only mark dirty if user has actually interacted and elements exist
    if (!isDirty && elements && elements.length > 0) {
      setIsDirty(true);
    }
  }, [isDirty]);

  // Helper to load file content from path
  const loadFileFromDisk = useCallback(async (filePath) => {
    if (!filePath || !activeAPI || !window.electronAPI) return;

    try {
      const ext = filePath.split('.').pop().toLowerCase();
      const isBinary = ext === 'png';

      const readRes = await window.electronAPI.readFile(filePath, isBinary);
      if (!readRes.success) {
        throw new Error(readRes.error);
      }

      if (filePath.endsWith('.doodlelib') || (filePath.endsWith('.json') && filePath.includes('lib'))) {
        // Library file
        const libData = JSON.parse(readRes.data);
        if (libData.libraryItems) {
          activeAPI.updateLibrary({
            libraryItems: libData.libraryItems,
            merge: true,
          });
          window.electronAPI.showNotification('Library Imported', `Imported items from ${filePath.split(/[\\/]/).pop()}`);
        }
        return;
      }

      if (isBinary) {
        // Base64 PNG with embedded Doodle scene
        const byteCharacters = atob(readRes.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        const sceneData = await loadFromBlob(blob, null, null);
        activeAPI.updateScene(sceneData);
        if (sceneData.files) {
          activeAPI.addFiles(Object.values(sceneData.files));
        }
      } else if (ext === 'svg') {
        const blob = new Blob([readRes.data], { type: 'image/svg+xml' });
        const sceneData = await loadFromBlob(blob, null, null);
        activeAPI.updateScene(sceneData);
        if (sceneData.files) {
          activeAPI.addFiles(Object.values(sceneData.files));
        }
      } else {
        // Diagram JSON
        const sceneData = JSON.parse(readRes.data);
        activeAPI.updateScene({
          elements: sceneData.elements || [],
          appState: sceneData.appState || {},
        });
        if (sceneData.files) {
          activeAPI.addFiles(Object.values(sceneData.files));
        }
      }

      setCurrentFilePath(filePath);
      setIsDirty(false);
      window.electronAPI.addRecentFile(filePath);
    } catch (err) {
      console.error('Failed to load file:', err);
      alert(`Could not open file: ${err.message}`);
    }
  }, [activeAPI]);

  // Execute clean New action
  const performNew = useCallback(() => {
    if (!activeAPI) return;
    activeAPI.resetScene();
    activeAPI.updateScene({
      elements: [],
      appState: {
        showWelcomeScreen: true,
      },
    });
    setCurrentFilePath(null);
    setIsDirty(false);
  }, [activeAPI]);

  // New File handler
  const handleNew = useCallback(() => {
    if (isDirty) {
      setPendingCloseAction('new');
      setShowUnsavedModal(true);
    } else {
      performNew();
    }
  }, [isDirty, performNew]);

  // Open File Dialog handler
  const handleOpen = useCallback(async (explicitPath = null) => {
    if (isDirty) {
      setPendingCloseAction('open');
      setPendingOpenPath(explicitPath);
      setShowUnsavedModal(true);
      return;
    }

    if (explicitPath) {
      await loadFileFromDisk(explicitPath);
    } else if (window.electronAPI) {
      const filePath = await window.electronAPI.showOpenDialog();
      if (filePath) {
        await loadFileFromDisk(filePath);
      }
    }
  }, [isDirty, loadFileFromDisk]);

  // Save File handler
  const handleSave = useCallback(async () => {
    if (!activeAPI || !window.electronAPI) return false;

    if (!currentFilePath) {
      return await handleSaveAs();
    }

    try {
      const elements = activeAPI.getSceneElements();
      const appState = activeAPI.getAppState();
      const files = activeAPI.getFiles();

      const json = serializeAsJSON(elements, appState, files, 'local');
      const res = await window.electronAPI.writeFile(currentFilePath, json, false);
      if (res.success) {
        setIsDirty(false);
        return true;
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert(`Failed to save: ${err.message}`);
      return false;
    }
  }, [currentFilePath, activeAPI]);

  // Save As handler
  const handleSaveAs = useCallback(async () => {
    if (!activeAPI || !window.electronAPI) return false;

    try {
      const elements = activeAPI.getSceneElements();
      const appState = activeAPI.getAppState();
      const files = activeAPI.getFiles();

      const defaultName = currentFilePath
        ? currentFilePath.split(/[\\/]/).pop()
        : 'drawing.doodle';

      const savePath = await window.electronAPI.showSaveDialog({ defaultPath: defaultName });
      if (!savePath) return false;

      const json = serializeAsJSON(elements, appState, files, 'local');
      const res = await window.electronAPI.writeFile(savePath, json, false);
      if (res.success) {
        setCurrentFilePath(savePath);
        setIsDirty(false);
        return true;
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error('Save As failed:', err);
      alert(`Failed to save as: ${err.message}`);
      return false;
    }
  }, [currentFilePath, activeAPI]);

  // Save a Copy handler
  const handleSaveCopy = useCallback(async () => {
    if (!activeAPI || !window.electronAPI) return false;

    try {
      const elements = activeAPI.getSceneElements();
      const appState = activeAPI.getAppState();
      const files = activeAPI.getFiles();

      const defaultName = currentFilePath
        ? `Copy of ${currentFilePath.split(/[\\/]/).pop()}`
        : 'drawing copy.doodle';

      const savePath = await window.electronAPI.showSaveDialog({ defaultPath: defaultName });
      if (!savePath) return false;

      const json = serializeAsJSON(elements, appState, files, 'local');
      const res = await window.electronAPI.writeFile(savePath, json, false);
      if (res.success) {
        window.electronAPI.showNotification('Copy Saved', `Saved copy to ${savePath.split(/[\\/]/).pop()}`);
        return true;
      }
    } catch (err) {
      console.error('Save Copy failed:', err);
      alert(`Failed to save copy: ${err.message}`);
      return false;
    }
  }, [currentFilePath, activeAPI]);

  // Copy PNG / SVG to Clipboard
  const handleCopyToClipboard = useCallback(async (optionsOrFormat = 'png') => {
    if (!activeAPI) return false;

    let format = 'png';
    let scale = 2;
    let background = true;

    if (typeof optionsOrFormat === 'string') {
      format = optionsOrFormat.toLowerCase();
    } else if (typeof optionsOrFormat === 'object' && optionsOrFormat !== null) {
      if (optionsOrFormat.format) format = String(optionsOrFormat.format).toLowerCase();
      if (optionsOrFormat.scale !== undefined) scale = optionsOrFormat.scale;
      if (optionsOrFormat.background !== undefined) background = optionsOrFormat.background;
    }

    try {
      const elements = activeAPI.getSceneElements();
      const appState = activeAPI.getAppState();
      const files = activeAPI.getFiles();

      const active = elements ? elements.filter(el => !el.isDeleted) : [];
      if (active.length === 0) {
        alert('Canvas is empty. Nothing to copy.');
        return false;
      }

      if (format === 'svg') {
        const svgXml = await exportToSvg(elements, appState, files, {
          exportBackground: background,
          viewBackgroundColor: appState.viewBackgroundColor,
        });

        let copied = false;
        if (window.electronAPI?.writeClipboardText) {
          copied = await window.electronAPI.writeClipboardText(svgXml);
        }
        if (!copied && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(svgXml);
            copied = true;
          } catch (clipErr) {
            console.warn('navigator.clipboard.writeText failed:', clipErr);
          }
        }

        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification('Clipboard', 'Copied SVG vector to clipboard');
        }
        return true;
      } else {
        const blob = await exportToBlob(elements, appState, files, {
          exportBackground: background,
          exportScale: scale,
        });
        if (!blob) {
          alert('Export failed: unable to create image.');
          return false;
        }

        let copied = false;
        if (window.electronAPI?.writeClipboardImage) {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          copied = await window.electronAPI.writeClipboardImage(dataUrl);
        }

        if (!copied && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            copied = true;
          } catch (clipErr) {
            console.warn('navigator.clipboard.write failed:', clipErr);
          }
        }

        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification('Clipboard', 'Copied PNG image to clipboard');
        }
        return true;
      }
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      alert(`Failed to copy to clipboard: ${err.message}`);
      return false;
    }
  }, [activeAPI]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (window.electronAPI?.exportPDF) {
      const defaultName = currentFilePath
        ? currentFilePath.replace(/\.[^/.]+$/, '') + '.pdf'
        : 'drawing.pdf';
      return await window.electronAPI.exportPDF({ defaultPath: defaultName, landscape: true });
    } else {
      window.print();
    }
  }, [currentFilePath]);

  // Export to PNG / SVG / PDF Image or File
  const handleExport = useCallback(async (optionsOrFormat = 'png') => {
    if (!activeAPI) return;

    let format = 'png';
    let scale = 2;
    let background = true;
    let embedScene = true;

    if (typeof optionsOrFormat === 'string') {
      format = optionsOrFormat.toLowerCase();
    } else if (typeof optionsOrFormat === 'object' && optionsOrFormat !== null) {
      if (optionsOrFormat.format) format = String(optionsOrFormat.format).toLowerCase();
      if (optionsOrFormat.scale !== undefined) scale = optionsOrFormat.scale;
      if (optionsOrFormat.background !== undefined) background = optionsOrFormat.background;
      if (optionsOrFormat.embedScene !== undefined) embedScene = optionsOrFormat.embedScene;
      if (optionsOrFormat.clipboardOnly) {
        return handleCopyToClipboard(optionsOrFormat);
      }
    }

    if (format === 'pdf') {
      return handleExportPDF();
    }

    try {
      const elements = activeAPI.getSceneElements();
      const appState = activeAPI.getAppState();
      const files = activeAPI.getFiles();

      const active = elements ? elements.filter(el => !el.isDeleted) : [];
      if (active.length === 0) {
        alert('Canvas is empty. Nothing to export.');
        return;
      }

      const defaultExt = format === 'svg' ? 'svg' : (embedScene ? 'doodle.png' : 'png');
      const defaultName = `drawing.${defaultExt}`;

      if (window.electronAPI) {
        const savePath = await window.electronAPI.showSaveDialog({
          defaultPath: defaultName,
          filters: format === 'svg'
            ? [{ name: 'SVG Vector Image (*.svg)', extensions: ['svg'] }]
            : [{ name: 'PNG Image (*.png)', extensions: ['png', 'doodle.png'] }],
        });

        if (!savePath) return;

        if (format === 'svg') {
          const svgXml = await exportToSvg(elements, appState, files, {
            exportBackground: background,
            viewBackgroundColor: appState.viewBackgroundColor,
          });
          await window.electronAPI.writeFile(savePath, svgXml, false);
        } else {
          const blob = await exportToBlob(elements, appState, files, {
            exportBackground: background,
            exportScale: scale,
          });
          if (!blob) { alert('Export failed: canvas is empty'); return; }

          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result;
              resolve(typeof res === 'string' ? res.split(',')[1] : '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          await window.electronAPI.writeFile(savePath, base64, true);
        }

        window.electronAPI.showNotification('Export Complete', `Saved to ${savePath.split(/[\\/]/).pop()}`);
      } else {
        // Web fallback (Browser direct download)
        if (format === 'svg') {
          const svgXml = await exportToSvg(elements, appState, files, {
            exportBackground: background,
            viewBackgroundColor: appState.viewBackgroundColor,
          });
          const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultName;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const blob = await exportToBlob(elements, appState, files, {
            exportBackground: background,
            exportScale: scale,
          });
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultName;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message}`);
    }
  }, [activeAPI, handleCopyToClipboard, handleExportPDF]);

  // Print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Process Unsaved Changes Modal Decisions
  const resolveUnsavedModal = useCallback(async (decision) => {
    // decision: 'save' | 'discard' | 'cancel'
    setShowUnsavedModal(false);

    if (decision === 'cancel') {
      if (pendingCloseAction === 'close' || pendingCloseAction === 'quit') {
        window.electronAPI?.respondToCloseRequest('cancel');
      }
      setPendingCloseAction(null);
      setPendingOpenPath(null);
      return;
    }

    if (decision === 'save') {
      const saved = await handleSave();
      if (!saved) {
        // User cancelled save dialog
        if (pendingCloseAction === 'close' || pendingCloseAction === 'quit') {
          window.electronAPI?.respondToCloseRequest('cancel');
        }
        return;
      }
    }

    // Execute target action after save or discard
    if (pendingCloseAction === 'new') {
      performNew();
    } else if (pendingCloseAction === 'open') {
      if (pendingOpenPath) {
        await loadFileFromDisk(pendingOpenPath);
      } else if (window.electronAPI) {
        const filePath = await window.electronAPI.showOpenDialog();
        if (filePath) await loadFileFromDisk(filePath);
      }
    } else if (pendingCloseAction === 'close' || pendingCloseAction === 'quit') {
      window.electronAPI?.respondToCloseRequest(decision === 'save' ? 'saved' : 'discard');
    }

    setPendingCloseAction(null);
    setPendingOpenPath(null);
  }, [pendingCloseAction, pendingOpenPath, handleSave, performNew, loadFileFromDisk]);

  // Bind Main IPC Events
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanups = [
      window.electronAPI.on('file:new', handleNew),
      window.electronAPI.on('file:open-dialog', () => handleOpen()),
      window.electronAPI.on('file:open-path', (filePath) => handleOpen(filePath)),
      window.electronAPI.on('file:save', handleSave),
      window.electronAPI.on('file:save-as', handleSaveAs),
      window.electronAPI.on('file:save-copy', handleSaveCopy),
      window.electronAPI.on('file:export', (opts) => handleExport(opts)),
      window.electronAPI.on('file:export-pdf', handleExportPDF),
      window.electronAPI.on('file:copy-to-clipboard', (opts) => handleCopyToClipboard(opts)),
      window.electronAPI.on('file:print', handlePrint),
      window.electronAPI.on('window:request-close', ({ isQuitting }) => {
        if (isDirty) {
          setPendingCloseAction(isQuitting ? 'quit' : 'close');
          setShowUnsavedModal(true);
        } else {
          window.electronAPI.respondToCloseRequest('discard');
        }
      }),
    ];

    return () => {
      cleanups.forEach(fn => fn && fn());
    };
  }, [
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleSaveCopy,
    handleExport,
    handleExportPDF,
    handleCopyToClipboard,
    handlePrint,
    isDirty,
  ]);

  return {
    currentFilePath,
    isDirty,
    showUnsavedModal,
    onSceneChange,
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleSaveCopy,
    handleExport,
    handleExportPDF,
    handleCopyToClipboard,
    handlePrint,
    resolveUnsavedModal,
    loadFileFromDisk,
  };
}
