const { app, ipcMain, Notification } = require('electron');

const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function attach(mainWindow, settings) {
  ipcMain.handle('notifications:show', async (_e, { title, body, severity = 'MEDIUM' }) => {
    if (!settings.notifications) return { ok: true, data: { shown: false } };
    if (SEVERITY_RANK[severity] < SEVERITY_RANK[settings.minSeverity]) {
      return { ok: true, data: { shown: false } };
    }
    if (Notification.isSupported()) {
      new Notification({ title, body, silent: !settings.soundAlerts }).show();
    }
    return { ok: true, data: { shown: true } };
  });
}

module.exports = { attach };
