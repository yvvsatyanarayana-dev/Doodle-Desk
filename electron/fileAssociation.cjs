const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let queuedFilesToOpen = [];

function isSupportedFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.doodle' || ext === '.doodlelib' || ext === '.json' || ext === '.png' || ext === '.svg';
}

function parseFilePathFromArgv(argv) {
  if (!argv || !Array.isArray(argv)) return [];
  const files = [];

  for (const arg of argv) {
    if (!arg || typeof arg !== 'string') continue;
    if (arg.startsWith('--') || arg.startsWith('-')) continue;
    if (arg.includes('node_modules') || arg.includes('electron.exe') || arg.endsWith('main.js') || arg === '.') continue;

    // Check protocol link
    if (arg.startsWith('doodle-desk://')) {
      try {
        const url = new URL(arg);
        const target = url.searchParams.get('path') || decodeURIComponent(url.pathname);
        if (target && fs.existsSync(target)) {
          files.push(path.normalize(target));
        }
      } catch (err) {
        console.error('Failed to parse protocol url:', arg, err);
      }
      continue;
    }

    // Check regular file path
    try {
      if (fs.existsSync(arg) && fs.statSync(arg).isFile() && isSupportedFile(arg)) {
        files.push(path.normalize(arg));
      }
    } catch {
      // Ignore invalid paths
    }
  }

  return files;
}

function queueFileToOpen(filePath) {
  if (filePath && isSupportedFile(filePath)) {
    queuedFilesToOpen.push(path.normalize(filePath));
  }
}

function getQueuedFiles() {
  const files = [...queuedFilesToOpen];
  queuedFilesToOpen = [];
  return files;
}

function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('doodle-desk', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('doodle-desk');
  }
}

function parseCollabRoomFromArgv(argv) {
  if (!argv || !Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (!arg || typeof arg !== 'string') continue;
    if (arg.startsWith('doodle-desk://')) {
      try {
        const url = new URL(arg.replace(/^doodle-desk:\/\//i, 'https://app/'));
        const fromParam = url.searchParams.get('room');
        if (fromParam) return fromParam.trim().toUpperCase();
        const segments = url.pathname.split('/').filter(Boolean);
        const joinIdx = segments.findIndex((s) => /^(join|room)$/i.test(s));
        if (joinIdx !== -1 && segments[joinIdx + 1]) {
          return decodeURIComponent(segments[joinIdx + 1]).trim().toUpperCase();
        }
        const last = segments[segments.length - 1];
        if (last && /^DOODLE-[A-Z0-9]+$/i.test(last)) {
          return decodeURIComponent(last).trim().toUpperCase();
        }
      } catch (err) {
        console.error('Failed to parse collab protocol url:', arg, err);
      }
    }
  }
  return null;
}

module.exports = {
  isSupportedFile,
  parseFilePathFromArgv,
  parseCollabRoomFromArgv,
  queueFileToOpen,
  getQueuedFiles,
  registerProtocol,
};
