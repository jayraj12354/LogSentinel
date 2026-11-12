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

  mainWindow.loadFile(path.join(__dirname, 'placeholder', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  menu.build(mainWindow);
  tray.init(mainWindow);
  settings.load();
  registerIpc(mainWindow);
  serverManager.attach(mainWindow);
  alertStream.attach(mainWindow);
  notifications.attach(mainWindow);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

module.exports = { getMainWindow: () => mainWindow };
