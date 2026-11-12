const { app, ipcMain } = require('electron');

function attach(mainWindow) {
  ipcMain.handle('notifications:show', async (_e, { title, body }) => {
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, silent: true });
      n.show();
    }
    return { ok: true };
  });
}

module.exports = { attach };
