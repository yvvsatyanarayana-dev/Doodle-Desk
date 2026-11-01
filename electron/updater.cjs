const { autoUpdater } = require('electron-updater');
const { Notification, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');

let lastStatus = {
  status: 'idle',
  version: app ? app.getVersion() : '1.0.0',
};

let isSilentBackgroundCheck = false;

function setupAutoUpdater(getMainWindow) {
  // Configure electron-updater defaults
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    lastStatus = { status: 'checking', version: app.getVersion() };
    if (!isSilentBackgroundCheck) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:status', lastStatus);
      }
    }
  });

  autoUpdater.on('update-available', (info) => {
    lastStatus = {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', lastStatus);
    }
    if (Notification.isSupported()) {
      const iconPath = path.join(__dirname, '../build/icon.png');
      new Notification({
        title: 'Doodle Desk Update Available',
        body: `Version ${info.version} is downloading in the background.`,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
      }).show();
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    lastStatus = {
      status: 'downloading',
      percent: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond || 0,
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
      version: lastStatus.version,
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', lastStatus);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    lastStatus = {
      status: 'not-available',
      version: info?.version || app.getVersion(),
    };
    if (!isSilentBackgroundCheck) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:status', lastStatus);
      }
    }
  });

  autoUpdater.on('error', (err) => {
    // Sanitize user-facing message from raw HTTP 404/network dumps
    let userFriendlyError = 'Could not check for updates.';
    const rawMsg = err?.message || '';
    if (rawMsg.includes('404') || rawMsg.includes('Cannot find latest')) {
      userFriendlyError = 'No new update releases published yet.';
    } else if (rawMsg.includes('net::ERR_') || rawMsg.includes('ENOTFOUND') || rawMsg.includes('ETIMEDOUT')) {
      userFriendlyError = 'Network connection unavailable.';
    }

    lastStatus = {
      status: 'error',
      error: userFriendlyError,
    };
    // In silent background checks, never harass the user with 404 or connection errors
    if (!isSilentBackgroundCheck) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:status', lastStatus);
      }
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    lastStatus = {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', lastStatus);
    }

    dialog.showMessageBox(win || null, {
      type: 'info',
      buttons: ['Restart and Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: `A new version of Doodle Desk (${info.version}) has been downloaded.`,
      detail: 'Restart the application now to apply updates.',
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });
}

function checkUpdate(manual = false, win = null) {
  isSilentBackgroundCheck = !manual;
  // Development mode safety check
  if (!app.isPackaged) {
    const devStatus = {
      status: 'dev-mode',
      version: app.getVersion(),
      message: 'Running in development mode. Auto-updates connect to GitHub Releases in production builds.',
    };
    lastStatus = devStatus;
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', devStatus);
    }
    if (manual && win && !win.isDestroyed()) {
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Check for Updates',
        message: 'Doodle Desk is running in local development mode.',
        detail: `Version: ${app.getVersion()}\nAutomated releases and differential updates are managed via GitHub Actions.`,
      });
    }
    return Promise.resolve(devStatus);
  }

  try {
    return autoUpdater.checkForUpdates()
      .then((updateCheckResult) => {
        return updateCheckResult;
      })
      .catch((err) => {
        lastStatus = { status: 'error', error: err.message };
        if (win && !win.isDestroyed()) {
          win.webContents.send('updater:status', lastStatus);
        }
        if (manual && win && !win.isDestroyed()) {
          dialog.showMessageBox(win, {
            type: 'info',
            title: 'Check for Updates',
            message: 'You are using the latest version of Doodle Desk.',
            detail: `Version: ${app.getVersion()}`,
          });
        }
        return { status: 'error', error: err.message };
      });
  } catch (err) {
    lastStatus = { status: 'error', error: err.message };
    if (manual && win && !win.isDestroyed()) {
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not connect to the update server.',
        detail: err.message,
      });
    }
    return Promise.resolve({ status: 'error', error: err.message });
  }
}

function getLastStatus() {
  return lastStatus;
}

function quitAndInstall() {
  autoUpdater.quitAndInstall(false, true);
}

module.exports = {
  setupAutoUpdater,
  checkUpdate,
  getLastStatus,
  quitAndInstall,
};
