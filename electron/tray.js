const { app, Tray, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let alertCount = 0;

function setCounter(n) {
  alertCount = Math.max(0, n);
  if (!tray) return;
  const label = alertCount > 0 ? `LogSentinel (${alertCount})` : 'LogSentinel';
  tray.setToolTip(label);
}

function init(mainWindow) {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'placeholder.png'));
  tray = new Tray(icon);
  tray.setToolTip('LogSentinel');
  if (icon.isEmpty()) tray.setTitle('LogSentinel'); // no icon file shipped; show text so the menu-bar item is visible
  tray.on('click', () => {
    if (mainWindow) mainWindow.show();
    if (alertCount > 0) setCounter(0);
  });
}

module.exports = { init, setCounter };
