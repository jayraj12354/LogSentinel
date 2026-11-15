'use strict';

const { ipcMain, Notification } = require('electron');
const settings = require('./settings');

const SEVERITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function shouldSuppress(severity, minSeverity) {
  return SEVERITY_ORDER[severity] < SEVERITY_ORDER[minSeverity];
}

function attach(mainWindow) {
  ipcMain.handle('notifications:show', async (_e, { title, body, severity }) => {
    const s = settings.get();
    if (!s.notifications) return { ok: true };
    if (severity && shouldSuppress(severity, s.minSeverity)) return { ok: true };
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, silent: !s.soundAlerts });
      n.show();
    }
    return { ok: true };
  });

  ipcMain.on('alert:new', (_e, alert) => {
    const s = settings.get();
    if (s.notifications && Notification.isSupported() && !shouldSuppress(alert.severity, s.minSeverity)) {
      new Notification({ title: alert.title, body: `${alert.severity} alert detected`, silent: !s.soundAlerts }).show();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('alert:new', alert);
    }
  });
}

module.exports = { attach };
