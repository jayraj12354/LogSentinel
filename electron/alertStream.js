const { ipcMain } = require('electron');

function attach(mainWindow) {
  ipcMain.on('alert:emit', (_e, alert) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('alert:new', alert);
  });
}

module.exports = { attach };
