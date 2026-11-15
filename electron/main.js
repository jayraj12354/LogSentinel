'use strict';

const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const config = require('./config');
const menu = require('./menu');
const tray = require('./tray');
const settings = require('./settings');
const { registerIpc } = require('./ipc/registerIpc');
const serverManager = require('./serverManager');
const alertStream = require('./alertStream');
const notifications = require('./notifications');
const { createMainWindow } = require('./windows/mainWindow');

let mainWindow = null;

function createWindow() {
  mainWindow = createMainWindow();

  mainWindow.on('close', (event) => {
    const s = settings.get();
    if (s.minimizeToTray && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    mainWindow = null;
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  menu.build(mainWindow);
  tray.init(mainWindow);
  settings.load();
  registerIpc(mainWindow);
  serverManager.attach(mainWindow);
  alertStream.attach(mainWindow);
  notifications.attach(mainWindow);

  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('shortcut:refresh');
    }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });

module.exports = { getMainWindow: () => mainWindow };
