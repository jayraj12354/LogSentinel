const { app } = require('electron');

function attach(mainWindow) {
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.send('server:status', { running: false, lastCheck: new Date().toISOString() });
  });
}

module.exports = { attach };
