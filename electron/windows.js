const { BrowserWindow, screen, dialog, app } = require('electron');
const path = require('path');
const { getSetting, setSetting } = require('./store');

const windows = new Set();
let isQuitting = false;

function setIsQuitting(val) {
  isQuitting = val;
}

function getIsQuitting() {
  return isQuitting;
}

function getValidBounds(savedBounds) {
  if (!savedBounds) {
    return { width: 1200, height: 800 };
  }

  const { width = 1200, height = 800, x, y } = savedBounds;
  if (x === undefined || y === undefined) {
    return { width, height };
  }

  const displays = screen.getAllDisplays();
  const isVisible = displays.some(display => {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
    return x >= dx - 20 && x + width <= dx + dw + 20 && y >= dy - 20 && y + height <= dy + dh + 20;
  });

  if (isVisible) {
    return { width, height, x, y };
  }

  // Fallback to primary display center
  return { width, height };
}

function createWindow(initialFilePath = null) {
  const savedState = getSetting('windowState', { width: 1200, height: 800, isMaximized: false });
  const bounds = getValidBounds(savedState);

  const isMac = process.platform === 'darwin';

  const win = new BrowserWindow({
    ...bounds,
    minWidth: 480,
    minHeight: 360,
    title: 'Doodle Desk',
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../build/icon.ico')
      : path.join(__dirname, '../build/icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: getSetting('theme', 'system') === 'light' ? '#ffffff' : '#121212',
    autoHideMenuBar: true,
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: false, // needed for full local resource & preload IPC capabilities
      spellcheck: getSetting('spellcheck', true),
      webSecurity: true,
    },
    show: false,
  });

  if (!isMac) {
    win.setMenu(null);
    win.removeMenu();
  }

  if (savedState.isMaximized) {
    win.maximize();
  }

  windows.add(win);
  win._isDirty = false;

  // Debounced tracking of window bounds on resize/move to prevent disk thrashing
  let saveStateTimeout = null;
  const saveState = () => {
    try {
      if (!win.isDestroyed() && !win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) {
        const currentBounds = win.getBounds();
        setSetting('windowState', {
          ...currentBounds,
          isMaximized: false,
        });
      } else if (!win.isDestroyed() && win.isMaximized()) {
        setSetting('windowState', {
          ...win.getBounds(),
          isMaximized: true,
        });
      }
    } catch (e) {
      console.warn('Failed to save window state:', e);
    }
  };

  const debouncedSaveState = () => {
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(saveState, 250);
  };

  win.on('resize', debouncedSaveState);
  win.on('move', debouncedSaveState);

  // Crash resilience & recovery handlers
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
    if (details.reason !== 'clean-exit' && !win.isDestroyed()) {
      win.reload();
    }
  });

  win.webContents.on('unresponsive', () => {
    console.warn('Window became unresponsive');
  });

  // Prevent closing if unsaved changes exist
  win.on('close', (e) => {
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    if (win._forceClose) {
      return; // allow close
    }

    // A clean document can close immediately. Only dirty documents need the
    // renderer's save/discard confirmation round-trip.
    if (!win._isDirty) return;

    // Ask renderer if dirty
    e.preventDefault();
    win.webContents.send('window:request-close', { isQuitting });
  });

  win.on('closed', () => {
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    windows.delete(win);
  });

  // Load Vite Dev Server in development or built files in production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
    if (initialFilePath) {
      win.webContents.send('file:open-path', initialFilePath);
    }
  });

  return win;
}

function getAllWindows() {
  return Array.from(windows);
}

function getFocusedWindow() {
  return BrowserWindow.getFocusedWindow() || (windows.size > 0 ? Array.from(windows)[0] : null);
}

module.exports = {
  createWindow,
  getAllWindows,
  getFocusedWindow,
  setIsQuitting,
  getIsQuitting,
};
