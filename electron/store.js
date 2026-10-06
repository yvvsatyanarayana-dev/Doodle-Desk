const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

const schema = {
  theme: {
    type: 'string',
    enum: ['system', 'light', 'dark'],
    default: 'dark',
  },
  autoSaveMode: {
    type: 'string',
    enum: ['interval', 'direct', 'off'],
    default: 'interval',
  },
  autoSaveIntervalSec: {
    type: 'number',
    default: 5,
  },
  defaultExportScale: {
    type: 'number',
    default: 2,
  },
  defaultExportBg: {
    type: 'boolean',
    default: true,
  },
  defaultExportDarkMode: {
    type: 'boolean',
    default: false,
  },
  defaultExportEmbedScene: {
    type: 'boolean',
    default: true,
  },
  recentFiles: {
    type: 'array',
    default: [],
  },
  trayEnabled: {
    type: 'boolean',
    default: false,
  },
  openAtLogin: {
    type: 'boolean',
    default: false,
  },
  hardwareAcceleration: {
    type: 'boolean',
    default: true,
  },
  spellcheck: {
    type: 'boolean',
    default: true,
  },
  windowState: {
    type: 'object',
    default: {
      width: 1200,
      height: 800,
      isMaximized: false,
    },
  },
};

const store = new Store({ schema });

function getSettings() {
  return store.store;
}

function getSetting(key, defaultValue) {
  return store.get(key, defaultValue);
}

function setSetting(key, value) {
  store.set(key, value);
}

function resetSettings() {
  store.clear();
  return store.store;
}

function addRecentFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return;
  const normalized = path.normalize(filePath);
  let recents = store.get('recentFiles', []);
  recents = recents.filter(f => f.path !== normalized);
  recents.unshift({
    path: normalized,
    name: path.basename(normalized),
    lastOpened: Date.now(),
  });
  // Limit to 15 entries
  recents = recents.slice(0, 15);
  store.set('recentFiles', recents);
  return recents;
}

function getRecentFiles() {
  const recents = store.get('recentFiles', []);
  // Filter out files that no longer exist
  const existing = recents.filter(f => {
    try {
      return fs.existsSync(f.path);
    } catch {
      return false;
    }
  });
  if (existing.length !== recents.length) {
    store.set('recentFiles', existing);
  }
  return existing;
}

function clearRecentFiles() {
  store.set('recentFiles', []);
}

module.exports = {
  store,
  getSettings,
  getSetting,
  setSetting,
  resetSettings,
  addRecentFile,
  getRecentFiles,
  clearRecentFiles,
};
