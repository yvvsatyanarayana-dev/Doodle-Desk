const { Menu, shell, app, dialog } = require('electron');
const { getRecentFiles, clearRecentFiles } = require('./store');
const { checkUpdate } = require('./updater');

function buildApplicationMenu({ onNew, onNewWindow, onOpen, onSave, onSaveAs, onExport, onPrint, onPreferences }) {
  const isMac = process.platform === 'darwin';
  const recentFiles = getRecentFiles();

  const recentMenuTemplate = recentFiles.length > 0
    ? [
        ...recentFiles.map(file => ({
          label: file.name,
          sublabel: file.path,
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.webContents.send('file:open-path', file.path);
            } else {
              onOpen?.(file.path);
            }
          },
        })),
        { type: 'separator' },
        {
          label: 'Clear Recent',
          click: () => {
            clearRecentFiles();
            rebuildMenu();
          },
        },
      ]
    : [{ label: 'No Recent Files', enabled: false }];

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: (item, win) => onPreferences?.(win),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: (item, win) => win ? win.webContents.send('file:new') : onNew?.(),
        },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => onNewWindow?.(),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: (item, win) => win ? win.webContents.send('file:open-dialog') : onOpen?.(),
        },
        {
          label: 'Open Recent',
          submenu: recentMenuTemplate,
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: (item, win) => win && win.webContents.send('file:save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: (item, win) => win && win.webContents.send('file:save-as'),
        },
        {
          label: 'Save a Copy...',
          click: (item, win) => win && win.webContents.send('file:save-copy'),
        },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            {
              label: 'Export PNG Image...',
              click: (item, win) => win && win.webContents.send('file:export', { format: 'png' }),
            },
            {
              label: 'Export SVG Image...',
              click: (item, win) => win && win.webContents.send('file:export', { format: 'svg' }),
            },
            {
              label: 'Export to PDF...',
              click: (item, win) => win && win.webContents.send('file:export-pdf'),
            },
            { type: 'separator' },
            {
              label: 'Copy PNG to Clipboard',
              click: (item, win) => win && win.webContents.send('file:copy-to-clipboard', { format: 'png' }),
            },
            {
              label: 'Copy SVG to Clipboard',
              click: (item, win) => win && win.webContents.send('file:copy-to-clipboard', { format: 'svg' }),
            },
          ],
        },
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: (item, win) => win && win.webContents.send('file:print-canvas'),
        },
        { type: 'separator' },
        ...(!isMac
          ? [
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: (item, win) => onPreferences?.(win),
              },
              { type: 'separator' },
            ]
          : []),
        {
          label: isMac ? 'Close Window' : 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
        ...(!isMac
          ? [
              {
                label: 'Exit',
                accelerator: 'CmdOrCtrl+Q',
                click: () => app.quit(),
              },
            ]
          : []),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: (item, win) => win && win.webContents.send('edit:undo'),
        },
        {
          label: 'Redo',
          accelerator: isMac ? 'CmdOrCtrl+Shift+Z' : 'CmdOrCtrl+Y',
          click: (item, win) => win && win.webContents.send('edit:redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: (item, win) => win && win.webContents.send('view:zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (item, win) => win && win.webContents.send('view:zoom-out'),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: (item, win) => win && win.webContents.send('view:zoom-reset'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Grid',
          accelerator: "CmdOrCtrl+'",
          click: (item, win) => win && win.webContents.send('view:toggle-grid'),
        },
        {
          label: 'Zen Mode',
          accelerator: 'Alt+Z',
          click: (item, win) => win && win.webContents.send('view:toggle-zen'),
        },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: (item, win) => win && win.webContents.send('view:toggle-theme'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(process.env.NODE_ENV === 'development'
          ? [
              { type: 'separator' },
              { role: 'reload' },
              { role: 'forceReload' },
              { role: 'toggleDevTools' },
            ]
          : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Doodle Desk Documentation',
          click: (item, win) => {
            dialog.showMessageBox(win || null, {
              type: 'info',
              title: 'Doodle Desk Documentation',
              message: 'Doodle Desk Help & Guides',
              detail: 'Doodle Desk is a native, offline-first hand-drawn diagramming studio.\nUse the toolbar at the top to draw shapes, text, arrows, and diagrams.',
            });
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: (item, win) => checkUpdate(true, win),
        },
        { type: 'separator' },
        {
          label: 'About Doodle Desk',
          click: (item, win) => {
            dialog.showMessageBox(win || null, {
              type: 'info',
              title: 'About Doodle Desk',
              message: 'Doodle Desk',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}\nOffline Diagramming Editor built with React & Electron.`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  if (isMac) {
    Menu.setApplicationMenu(menu);
  } else {
    Menu.setApplicationMenu(null);
  }
  return menu;
}

let menuCallbacks = {};

function setupMenu(callbacks) {
  menuCallbacks = callbacks;
  return buildApplicationMenu(callbacks);
}

function rebuildMenu() {
  return buildApplicationMenu(menuCallbacks);
}

module.exports = {
  setupMenu,
  rebuildMenu,
};
