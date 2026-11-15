const { BrowserWindow } = require('electron');
const path = require('path');

function createAlertWindow(mainWindow, alertId) {
  const win = new BrowserWindow({
    width: 500,
    height: 400,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  if (require('../config').useVite) {
    win.loadURL(`http://localhost:5173/#/alerts?id=${alertId}`);
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'), { hash: `/alerts?id=${alertId}` });
  }
  win.once('ready-to-show', () => win.show());
  return win;
}

module.exports = { createAlertWindow };
