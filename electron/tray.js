const { app, Tray, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let alertCount = 0; // open alerts, as reported by the renderer (tray:setCount)

function setCounter(n) {
  alertCount = Math.max(0, n);
  if (!tray) return;
  const label = alertCount > 0 ? `LogSentinel (${alertCount})` : 'LogSentinel';
  tray.setToolTip(label);
}

function init(mainWindow) {
  // 'Template' suffix: macOS tints it for light/dark menu bars; trayTemplate@2x.png is picked up automatically.
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  tray = new Tray(icon);
  tray.setToolTip('LogSentinel');
  if (icon.isEmpty()) tray.setTitle('LogSentinel'); // no icon file shipped; show text so the menu-bar item is visible
  tray.on('click', () => {
    if (mainWindow) mainWindow.show();
  });
}

module.exports = { init, setCounter };
