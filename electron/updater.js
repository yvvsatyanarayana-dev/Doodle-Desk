const { autoUpdater } = require('electron-updater');
const { Notification, dialog } = require('electron');

function setupAutoUpdater(getMainWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', { status: 'available', version: info.version });
    }
    if (Notification.isSupported()) {
      new Notification({
        title: 'Doodle Desk Update Available',
        body: `Version ${info.version} is downloading in the background.`,
      }).show();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', { status: 'not-available', version: info?.version });
    }
  });

  autoUpdater.on('error', (err) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', { status: 'error', error: err.message });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', { status: 'downloaded', version: info.version });
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
  try {
    autoUpdater.checkForUpdates().catch(err => {
      if (manual && win && !win.isDestroyed()) {
        dialog.showMessageBox(win, {
          type: 'info',
          title: 'Check for Updates',
          message: 'You are using the latest version of Doodle Desk.',
          detail: `Version: ${require('../package.json').version}`,
        });
      }
    });
  } catch (err) {
    if (manual && win && !win.isDestroyed()) {
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not connect to the update server.',
        detail: err.message,
      });
    }
  }
}

module.exports = {
  setupAutoUpdater,
  checkUpdate,
};
