const { ipcMain, dialog } = require('electron');

function registerIpc(mainWindow) {
  ipcMain.handle('dialog:openLogFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
    return { ok: true, data: { canceled: result.canceled, filePath: result.filePaths[0] || null } };
  });
  ipcMain.handle('app:getInfo', async () => ({
    ok: true,
    data: { name: 'LogSentinel', version: '0.1.0', electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, platform: process.platform, isPackaged: app.isPackaged },
  }));
  ipcMain.handle('window:toggleFullscreen', async () => {
    const win = mainWindow; const isFs = win.isFullScreen(); win.setFullScreen(!isFs); return { ok: true, data: { fullscreen: !isFs } };
  });
  ipcMain.handle('window:openAlertDetail', async () => ({ ok: true, data: { opened: true } }));
  ipcMain.handle('shell:showItem', async (_e, { filePath }) => { dialog.showItemInFolder(filePath); return { ok: true, data: { shown: true } }; });
  ipcMain.handle('settings:get', async () => ({ ok: true, data: require('./settings').get() }));
  ipcMain.handle('settings:set', async (_e, patch) => ({ ok: true, data: require('./settings').set(patch) }));
  ipcMain.handle('auth:setToken', async () => ({ ok: true, data: { stored: true } }));
  ipcMain.handle('server:getStatus', async () => ({ ok: true, data: { running: true, port: 4000, lastCheck: new Date().toISOString() } }));
}

module.exports = { registerIpc };
