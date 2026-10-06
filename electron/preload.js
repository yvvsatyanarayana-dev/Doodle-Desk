const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  readFile: (filePath, asBinary = false) => ipcRenderer.invoke('fs:read-file', { filePath, asBinary }),
  writeFile: (filePath, content, asBinary = false) => ipcRenderer.invoke('fs:write-file', { filePath, content, asBinary }),
  exportPDF: (options) => ipcRenderer.invoke('fs:export-pdf', options),
  printCanvas: (options) => ipcRenderer.invoke('app:print-canvas', options),

  // Window state
  updateDocumentState: (info) => ipcRenderer.invoke('window:set-doc-state', info),
  respondToCloseRequest: (action) => ipcRenderer.invoke('window:close-response', action),
  openNewWindow: (filePath) => ipcRenderer.invoke('window:open-new', filePath),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Settings
  getSettings: () => ipcRenderer.invoke('store:get-all'),
  getSetting: (key, def) => ipcRenderer.invoke('store:get', { key, def }),
  setSetting: (key, val) => ipcRenderer.invoke('store:set', { key, val }),
  resetSettings: () => ipcRenderer.invoke('store:reset'),

  // Recents
  getRecentFiles: () => ipcRenderer.invoke('store:get-recents'),
  addRecentFile: (filePath) => ipcRenderer.invoke('store:add-recent', filePath),
  clearRecentFiles: () => ipcRenderer.invoke('store:clear-recents'),

  // Updates & Notifications
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  showNotification: (title, body) => ipcRenderer.invoke('app:notification', { title, body }),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Clipboard & External
  writeClipboardText: (text) => ipcRenderer.invoke('clipboard:write-text', text),
  writeClipboardImage: (dataUrl) => ipcRenderer.invoke('clipboard:write-image', dataUrl),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // Platform info
  platform: process.platform,

  // Listeners from Main Process
  on: (channel, callback) => {
    const validChannels = [
      'file:new',
      'file:open-dialog',
      'file:open-path',
      'file:save',
      'file:save-as',
      'file:save-copy',
      'file:export',
      'file:export-pdf',
      'file:copy-to-clipboard',
      'file:print',
      'file:print-canvas',
      'app:preferences',
      'edit:undo',
      'edit:redo',
      'view:zoom-in',
      'view:zoom-out',
      'view:zoom-reset',
      'view:toggle-grid',
      'view:toggle-zen',
      'view:toggle-theme',
      'window:request-close',
      'updater:status',
      'theme:system-changed',
    ];

    if (validChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },
});
