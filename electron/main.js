const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');
const menu = require('./menu');
const tray = require('./tray');
const settings = require('./settings');
const { registerIpc } = require('./ipc/registerIpc');
const serverManager = require('./serverManager');
const alertStream = require('./alertStream');
const notifications = require('./notifications');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Load built React app in production, Vite dev server in development
  if (config.useVite) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  // Hide instead of destroy on macOS: tray/IPC handlers are registered once per window and can't be re-registered.
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  const lsSettings = settings.load();
  menu.build(mainWindow);
  tray.init(mainWindow);
  registerIpc(mainWindow, lsSettings);
  serverManager.attach(mainWindow);
  notifications.attach(mainWindow, lsSettings);
  alertStream.attach(mainWindow, lsSettings);
}

// One instance only: a second launch would fail to bind port 4000, so focus the running window instead.
const isPrimary = app.requestSingleInstanceLock();
if (!isPrimary) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// Quit cleanly on kill/Ctrl+C instead of leaving a window with no API behind it.
process.on('SIGTERM', () => app.quit());
process.on('SIGINT', () => app.quit());

app.whenReady().then(() => {
  if (!isPrimary) return;
  serverManager.startServer();
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { app.isQuitting = true; });
app.on('activate', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
app.on('will-quit', () => { serverManager.stopServer(); });

module.exports = { getMainWindow: () => mainWindow };
