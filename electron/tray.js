'use strict';

const { app, Tray, nativeImage, Menu } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let alertCount = 0;

function init(window) {
  mainWindow = window;
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'placeholder.png'));
  tray = new Tray(icon);
  tray.setToolTip('LogSentinel');
  tray.on('click', () => { if (mainWindow) mainWindow.show(); });
  tray.on('right-click', () => tray.popUpContextMenu(buildMenu()));
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'Show LogSentinel', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
  ]);
}

function setAlertCount(count) {
  alertCount = count;
  if (tray) {
    tray.setToolTip(alertCount > 0 ? `LogSentinel (${alertCount})` : 'LogSentinel');
  }
}

module.exports = { init, setAlertCount };
