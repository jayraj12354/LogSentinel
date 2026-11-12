const { BrowserWindow } = require('electron');

function createAlertWindow(alertId) {
  const win = new BrowserWindow({ width: 500, height: 400, parent: BrowserWindow.getFocusedWindow(), modal: true, show: false, webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false } });
  win.loadURL(`http://localhost:5173/#/alerts/${alertId}`);
  win.once('ready-to-show', () => win.show());
  return win;
}

module.exports = { createAlertWindow };
