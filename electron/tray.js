const { app, Tray, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function init(mainWindow) {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'placeholder.png'));
  tray = new Tray(icon);
  tray.setToolTip('LogSentinel');
  tray.on('click', () => { if (mainWindow) mainWindow.show(); });
}

module.exports = { init };
