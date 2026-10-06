const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, nativeImage, Notification, Tray, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

const { createWindow, getAllWindows, getFocusedWindow, setIsQuitting } = require('./windows');
const { setupMenu, rebuildMenu } = require('./menu');
const { getSettings, getSetting, setSetting, resetSettings, addRecentFile, getRecentFiles, clearRecentFiles } = require('./store');
const { isSupportedFile, parseFilePathFromArgv, queueFileToOpen, getQueuedFiles, registerProtocol } = require('./fileAssociation');
const { setupAutoUpdater, checkUpdate } = require('./updater');

// Process-level crash & rejection prevention
process.on('uncaughtException', (err) => {
  console.error('Electron Main uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Electron Main unhandledRejection:', reason);
});

// Single-Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Windows Taskbar & App User Model ID
app.name = 'Doodle Desk';
if (process.platform === 'win32') {
  app.setAppUserModelId('Doodle Desk');
}

// Hardware acceleration & GPU performance settings
if (!getSetting('hardwareAcceleration', true)) {
  app.disableHardwareAcceleration();
} else {
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');
}

let tray = null;

function setupTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }

  if (!getSetting('trayEnabled', false)) return;

  try {
    const iconPath = path.join(__dirname, '../build/icon.png');
    if (!fs.existsSync(iconPath)) return;
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('Doodle Desk');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'New Drawing',
        click: () => {
          createWindow();
        },
      },
      {
        label: 'Show Doodle Desk',
        click: () => {
          const windows = getAllWindows();
          if (windows.length > 0) {
            const win = windows[0];
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          } else {
            createWindow();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          setIsQuitting(true);
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      const win = getFocusedWindow();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

// Second instance event handler (Windows / Linux)
app.on('second-instance', (event, argv, workingDirectory) => {
  const files = parseFilePathFromArgv(argv);
  if (files.length > 0) {
    for (const file of files) {
      createWindow(file);
    }
  } else {
    const focused = getFocusedWindow();
    if (focused) {
      if (focused.isMinimized()) focused.restore();
      focused.focus();
    } else {
      createWindow();
    }
  }
});

// macOS open-file event
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (app.isReady()) {
    createWindow(filePath);
  } else {
    queueFileToOpen(filePath);
  }
});

// Protocol handler (macOS / Windows open-url)
app.on('open-url', (event, url) => {
  event.preventDefault();
  const files = parseFilePathFromArgv([url]);
  if (files.length > 0) {
    if (app.isReady()) {
      for (const file of files) createWindow(file);
    } else {
      for (const file of files) queueFileToOpen(file);
    }
  }
});

app.whenReady().then(() => {
  registerProtocol();

  // Remove X-Frame-Options and relax Content-Security-Policy frame-ancestors for canvas web embeds
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    let modified = false;

    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (lower === 'x-frame-options' || lower === 'frame-options') {
        delete responseHeaders[key];
        modified = true;
      } else if (lower === 'content-security-policy') {
        responseHeaders[key] = responseHeaders[key].map((csp) => {
          if (/frame-ancestors/i.test(csp)) {
            modified = true;
            return csp.replace(/frame-ancestors\s+[^;]+(;|$)/gi, '');
          }
          return csp;
        });
      }
    }

    callback(modified ? { cancel: false, responseHeaders } : { cancel: false });
  });

  // Setup Menu
  setupMenu({
    onNew: () => {
      const win = getFocusedWindow();
      if (win) win.webContents.send('file:new');
      else createWindow();
    },
    onNewWindow: () => createWindow(),
    onOpen: (filePath) => {
      if (filePath) {
        createWindow(filePath);
      } else {
        const win = getFocusedWindow();
        if (win) win.webContents.send('file:open-dialog');
        else createWindow();
      }
    },
    onPreferences: (win) => {
      const target = win || getFocusedWindow() || createWindow();
      target.webContents.send('app:preferences');
    },
  });

  // Setup Auto-updater
  setupAutoUpdater(() => getFocusedWindow());

  // Setup Tray
  setupTray();

  // Handle open at login setting
  try {
    app.setLoginItemSettings({
      openAtLogin: getSetting('openAtLogin', false),
      openAsHidden: false,
    });
  } catch (e) {
    console.warn('Failed to configure openAtLogin:', e);
  }

  // OS-level Preferences: Native Theme & Spellcheck
  try {
    const savedTheme = getSetting('theme', 'system');
    nativeTheme.themeSource = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'system';
  } catch (e) {
    console.warn('Failed to configure nativeTheme:', e);
  }

  try {
    const savedSpellcheck = getSetting('spellcheck', true);
    session.defaultSession.setSpellCheckerEnabled(Boolean(savedSpellcheck));
  } catch (e) {
    console.warn('Failed to configure spellchecker:', e);
  }

  // Check initial argv for files
  const initialFiles = [...getQueuedFiles(), ...parseFilePathFromArgv(process.argv)];
  if (initialFiles.length > 0) {
    for (const file of initialFiles) {
      createWindow(file);
    }
  } else {
    createWindow();
  }

  // Silent update check after launch
  setTimeout(() => {
    checkUpdate(false, getFocusedWindow());
  }, 4000);

  // Native theme synchronization
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('theme:system-changed', { shouldUseDarkColors: isDark });
      }
    });
  });

  app.on('activate', () => {
    if (getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  setIsQuitting(true);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler Implementations
// -------------------------------------------------------------

// Open File Dialog
ipcMain.handle('dialog:open-file', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Doodle Desk Drawing',
    properties: ['openFile'],
    filters: [
      { name: 'Doodle Desk Files (*.doodle, *.png, *.svg)', extensions: ['doodle', 'png', 'svg', 'json', 'doodlelib'] },
      { name: 'Doodle Desk File (*.doodle)', extensions: ['doodle'] },
      { name: 'PNG Image (*.png)', extensions: ['png'] },
      { name: 'SVG Vector (*.svg)', extensions: ['svg'] },
      { name: 'Doodle Desk Library (*.doodlelib)', extensions: ['doodlelib'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
    ...options,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// Save File Dialog
ipcMain.handle('dialog:save-file', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const defaultFilters = [
    { name: 'Doodle Desk File (*.doodle)', extensions: ['doodle'] },
    { name: 'PNG Image (*.png)', extensions: ['png'] },
    { name: 'SVG Vector (*.svg)', extensions: ['svg'] },
    { name: 'Doodle Desk Library (*.doodlelib)', extensions: ['doodlelib'] },
    { name: 'All Files (*.*)', extensions: ['*'] },
  ];

  const result = await dialog.showSaveDialog(win, {
    title: 'Save Doodle Desk Drawing',
    defaultPath: options.defaultPath || 'Untitled.doodle',
    filters: options.filters || defaultFilters,
    ...options,
  });

  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
});

// Read File
ipcMain.handle('fs:read-file', async (event, { filePath, asBinary = false }) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    if (asBinary) {
      const buffer = await fs.promises.readFile(filePath);
      return { success: true, data: buffer.toString('base64'), isBase64: true };
    } else {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { success: true, data: content, isBase64: false };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Write File
ipcMain.handle('fs:write-file', async (event, { filePath, content, asBinary = false }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (asBinary) {
      const buffer = Buffer.from(content, 'base64');
      await fs.promises.writeFile(filePath, buffer);
    } else {
      await fs.promises.writeFile(filePath, content, 'utf-8');
    }

    // Add to recent files
    addRecentFile(filePath);
    if (process.platform === 'darwin') {
      app.addRecentDocument(filePath);
    }
    rebuildMenu();

    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export to PDF
ipcMain.handle('fs:export-pdf', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  try {
    const saveResult = await dialog.showSaveDialog(win, {
      title: 'Export to PDF',
      defaultPath: options.defaultPath || 'drawing.pdf',
      filters: [{ name: 'PDF Document (.pdf)', extensions: ['pdf'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, canceled: true };
    }

    const pdfData = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      landscape: options.landscape || true,
    });

    await fs.promises.writeFile(saveResult.filePath, pdfData);

    if (Notification.isSupported()) {
      const iconPath = path.join(__dirname, '../build/icon.png');
      new Notification({
        title: 'Export PDF Complete',
        body: `Saved to ${path.basename(saveResult.filePath)}`,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
      }).show();
    }

    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Native Print Canvas Handler (Self-contained Print Preview & OS Print Dialog)
ipcMain.handle('app:print-canvas', async (event, { dataUrl, title, isLandscape, theme } = {}) => {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const safeTitle = (title || 'Doodle Desk Canvas').replace(/[&<>"']/g, '');

  try {
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const imgFileName = `doodle-canvas-${timestamp}.png`;
    const htmlFileName = `doodle-canvas-${timestamp}.html`;
    const imgPath = path.join(tempDir, imgFileName);
    const htmlPath = path.join(tempDir, htmlFileName);

    // Save PNG image
    const base64Data = (dataUrl || '').replace(/^data:image\/\w+;base64,/, '');
    await fs.promises.writeFile(imgPath, Buffer.from(base64Data, 'base64'));

    const currentTheme = theme || getSetting('theme', 'dark');
    const isDark = currentTheme !== 'light';

    // Create self-contained printable HTML page with print-optimized CSS and matching app topbar
    const fileUrl = `file:///${imgPath.replace(/\\/g, '/')}`;
    const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Print</title>
  <style>
    @page {
      size: ${isLandscape ? 'landscape' : 'portrait'};
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: ${isDark ? '#18181b' : '#f4f4f5'};
      color: ${isDark ? '#f4f4f5' : '#18181b'};
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    }

    /* Studio TopBar matching Doodle Desk */
    .studio-topbar {
      height: 38px;
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 0 12px;
      background: ${isDark ? '#111113' : '#ffffff'};
      border-bottom: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'};
      user-select: none;
      flex-shrink: 0;
      -webkit-app-region: drag;
      z-index: 50;
    }

    .studio-topbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      height: 100%;
    }

    .studio-brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 4px;
      height: 26px;
      border-radius: 6px;
      color: ${isDark ? '#f4f4f5' : '#18181b'};
      font-size: 13px;
      font-weight: 650;
      letter-spacing: -0.2px;
    }

    .studio-brand-title {
      color: inherit;
      white-space: nowrap;
    }

    .studio-doc-divider {
      width: 1px;
      height: 16px;
      background: ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'};
    }

    .studio-doc-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: ${isDark ? '#a1a1aa' : '#71717a'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .studio-doc-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      flex-shrink: 0;
    }

    .studio-doc-name {
      color: ${isDark ? '#d4d4d8' : '#18181b'};
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .studio-topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 100%;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      -webkit-app-region: no-drag;
    }

    .studio-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 28px;
      padding: 0 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'};
      background: ${isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)'};
      color: ${isDark ? '#e4e4e7' : '#18181b'};
      transition: all 0.15s ease;
      -webkit-app-region: no-drag;
    }

    .studio-action-btn:hover {
      background: ${isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)'};
      color: ${isDark ? '#ffffff' : '#000000'};
      border-color: ${isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)'};
    }

    .studio-primary-btn {
      background: #5b56d6 !important;
      border-color: #6965db !important;
      color: #ffffff !important;
    }

    .studio-primary-btn:hover {
      background: #6965db !important;
      box-shadow: 0 2px 8px rgba(91, 86, 214, 0.35);
    }

    .studio-window-controls {
      display: flex;
      align-items: center;
      height: 100%;
      -webkit-app-region: no-drag;
    }

    .studio-win-btn {
      width: 44px;
      height: 38px;
      background: transparent;
      border: none;
      color: ${isDark ? '#a1a1aa' : '#71717a'};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease;
      -webkit-app-region: no-drag;
    }

    .studio-win-btn:hover {
      background: ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'};
      color: ${isDark ? '#ffffff' : '#18181b'};
    }

    .studio-win-btn.win-close:hover {
      background: #e81123 !important;
      color: #ffffff !important;
    }

    .preview-container {
      height: calc(100vh - 38px);
      width: 100vw;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: auto;
      background: ${isDark ? '#18181b' : '#f4f4f5'};
      box-sizing: border-box;
    }

    .canvas-sheet {
      background: #ffffff;
      padding: 10px;
      border-radius: 8px;
      box-shadow: ${isDark ? '0 12px 40px rgba(0, 0, 0, 0.6)' : '0 12px 36px rgba(0, 0, 0, 0.12)'};
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      max-height: 100%;
      box-sizing: border-box;
    }

    img {
      max-width: calc(100vw - 60px);
      max-height: calc(100vh - 38px - 60px);
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      border-radius: 4px;
    }

    @media print {
      @page {
        size: ${isLandscape ? 'landscape' : 'portrait'};
        margin: 10mm;
      }
      .studio-topbar { display: none !important; }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      .preview-container, .canvas-sheet {
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      img {
        max-width: 100% !important;
        max-height: 100% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <header class="studio-topbar">
    <div class="studio-topbar-left">
      <div class="studio-brand-badge" title="Doodle Desk">
        <span class="studio-brand-title">Doodle Desk</span>
      </div>
      <div class="studio-doc-divider"></div>
      <div class="studio-doc-info">
        <span class="studio-doc-dot"></span>
        <span class="studio-doc-name">Print Canvas &bull; ${safeTitle}</span>
      </div>
    </div>
    <div class="studio-topbar-right">
      <div class="action-buttons">
        <button class="studio-action-btn" onclick="handleClose()" title="Close Print (Esc)">Cancel</button>
        <button class="studio-action-btn studio-primary-btn" onclick="handlePrint()" title="Print (Ctrl+P)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Print...</span>
        </button>
      </div>
      <div class="studio-window-controls" id="win-controls">
        <button class="studio-win-btn win-min" onclick="handleMinimize()" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button id="win-max-btn" class="studio-win-btn win-max" onclick="handleMaximize()" title="Maximize">
          <svg id="win-max-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
          </svg>
        </button>
        <button class="studio-win-btn win-close" onclick="handleClose()" title="Close">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  </header>
  <div class="preview-container">
    <div class="canvas-sheet">
      <img src="${fileUrl}" alt="Canvas">
    </div>
  </div>
  <script>
    function handleClose() {
      if (window.electronAPI && window.electronAPI.closeWindow) {
        window.electronAPI.closeWindow();
      } else {
        window.close();
      }
    }

    function handleMinimize() {
      if (window.electronAPI && window.electronAPI.minimizeWindow) {
        window.electronAPI.minimizeWindow();
      }
    }

    async function handleMaximize() {
      if (window.electronAPI && window.electronAPI.maximizeWindow) {
        const isMax = await window.electronAPI.maximizeWindow();
        updateMaximizeIcon(isMax);
      }
    }

    function updateMaximizeIcon(isMax) {
      const icon = document.getElementById('win-max-icon');
      const btn = document.getElementById('win-max-btn');
      if (!icon) return;
      if (isMax) {
        icon.innerHTML = '<rect x="3.5" y="5.5" width="7" height="7"></rect><polyline points="5.5,3.5 12.5,3.5 12.5,10.5"></polyline>';
        icon.setAttribute('viewBox', '0 0 16 16');
        icon.setAttribute('stroke-width', '1.5');
        if (btn) btn.title = 'Restore';
      } else {
        icon.innerHTML = '<rect width="18" height="18" x="3" y="3" rx="2"></rect>';
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('stroke-width', '2');
        if (btn) btn.title = 'Maximize';
      }
    }

    function handlePrint() {
      window.print();
    }

    const topbar = document.querySelector('.studio-topbar');
    if (topbar) {
      topbar.addEventListener('dblclick', (e) => {
        if (e.target.closest('button') || e.target.closest('.action-buttons') || e.target.closest('.studio-window-controls')) return;
        handleMaximize();
      });
    }

    window.addEventListener('resize', async () => {
      if (window.electronAPI && window.electronAPI.isWindowMaximized) {
        const isMax = await window.electronAPI.isWindowMaximized();
        updateMaximizeIcon(isMax);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleClose();
      }
    });

    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;

    await fs.promises.writeFile(htmlPath, htmlContent, 'utf8');

    const isMac = process.platform === 'darwin';
    const printWin = new BrowserWindow({
      width: 960,
      height: 720,
      minWidth: 480,
      minHeight: 360,
      title: `${safeTitle} - Print`,
      icon: process.platform === 'win32'
        ? path.join(__dirname, '../build/icon.ico')
        : path.join(__dirname, '../build/icon.png'),
      frame: false,
      titleBarStyle: 'hidden',
      parent: parent || undefined,
      modal: false,
      autoHideMenuBar: true,
      trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
      backgroundColor: isDark ? '#111113' : '#ffffff',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWin.loadFile(htmlPath);

    printWin.on('closed', () => {
      fs.promises.unlink(imgPath).catch(() => {});
      fs.promises.unlink(htmlPath).catch(() => {});
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to prepare print canvas:', err);
    return { success: false, error: err.message };
  }
});

// Update Document State (Window Title & macOS represented file)
ipcMain.handle('window:set-doc-state', (event, { filePath, isDirty }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  win._isDirty = Boolean(isDirty);

  const fileName = filePath ? path.basename(filePath) : 'Untitled';
  const dirtyPrefix = isDirty ? '● ' : '';
  const title = `${dirtyPrefix}${fileName} - Doodle Desk`;

  win.setTitle(title);

  if (process.platform === 'darwin') {
    if (filePath) {
      win.setRepresentedFilename(filePath);
    } else {
      win.setRepresentedFilename('');
    }
    win.setDocumentEdited(Boolean(isDirty));
  }
});

// Window Controls (Minimize, Maximize, Close for Frameless Window)
ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  }
  return false;
});

ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.handle('window:is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && !win.isDestroyed() ? win.isMaximized() : false;
});

// Handle Window Close Response from Renderer
ipcMain.handle('window:close-response', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;

  if (action === 'discard' || action === 'saved') {
    win._forceClose = true;
    win.close();
  }
  // If 'cancel', do nothing
});

// Open New Window
ipcMain.handle('window:open-new', (event, filePath) => {
  createWindow(filePath);
});

// Settings IPC
ipcMain.handle('store:get-all', () => getSettings());
ipcMain.handle('store:get', (event, { key, def }) => getSetting(key, def));
ipcMain.handle('store:set', (event, { key, val }) => {
  setSetting(key, val);
  if (key === 'trayEnabled') setupTray();
  if (key === 'openAtLogin') {
    try {
      app.setLoginItemSettings({ openAtLogin: Boolean(val) });
    } catch {}
  }
  if (key === 'theme') {
    try {
      nativeTheme.themeSource = (val === 'dark' || val === 'light') ? val : 'system';
    } catch {}
  }
  if (key === 'spellcheck') {
    try {
      session.defaultSession.setSpellCheckerEnabled(Boolean(val));
    } catch {}
  }
});
ipcMain.handle('store:reset', () => resetSettings());

// Recents IPC
ipcMain.handle('store:get-recents', () => getRecentFiles());
ipcMain.handle('store:add-recent', (event, filePath) => {
  const list = addRecentFile(filePath);
  rebuildMenu();
  return list;
});
ipcMain.handle('store:clear-recents', () => {
  clearRecentFiles();
  rebuildMenu();
});

// Updater IPC
ipcMain.handle('updater:check', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  checkUpdate(true, win);
});

// Native Notification
ipcMain.handle('app:notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, '../build/icon.png');
    new Notification({
      title: title || 'Doodle Desk',
      body: body || '',
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
    }).show();
  }
});

// App Version
ipcMain.handle('app:get-version', () => app.getVersion());

// Clipboard write text
ipcMain.handle('clipboard:write-text', (event, text) => {
  try {
    const { clipboard } = require('electron');
    clipboard.writeText(typeof text === 'string' ? text : String(text || ''));
    return true;
  } catch (err) {
    console.error('Failed to write text to clipboard:', err);
    return false;
  }
});

// Clipboard write image
ipcMain.handle('clipboard:write-image', (event, dataUrl) => {
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    const { clipboard } = require('electron');
    clipboard.writeImage(img);
    return true;
  } catch (err) {
    console.error('Failed to write image to clipboard:', err);
    return false;
  }
});

// Shell open external link
ipcMain.handle('shell:open-external', async (event, url) => {
  if (typeof url === 'string') {
    // Safety: Never open internal app localhost/element links in external browser
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('element=')) {
      return false;
    }
    if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:')) {
      await shell.openExternal(url);
      return true;
    }
  }
  return false;
});

// Security: handle webContents creation
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e, navigationUrl) => {
    const parsed = new URL(navigationUrl);
    // Allow local vite dev server and file://
    if (parsed.origin !== 'http://localhost:5173' && parsed.protocol !== 'file:') {
      e.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    // Never launch external browser for internal app or element links
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('element=')) {
      return { action: 'deny' };
    }
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});
