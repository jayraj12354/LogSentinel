const { app, ipcMain, dialog } = require('electron');
const store = require('../settings');
const alertStream = require('../alertStream');
const serverManager = require('../serverManager');
const { setCounter } = require('../tray');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function registerIpc(mainWindow, settings) {
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
  ipcMain.handle('window:openAlertDetail', async (_e, { alertId }) => {
    const { createAlertWindow } = require('../windows/alertWindow');
    createAlertWindow(mainWindow, alertId);
    return { ok: true, data: { opened: true } };
  });
  ipcMain.handle('shell:showItem', async (_e, { filePath }) => { dialog.showItemInFolder(filePath); return { ok: true, data: { shown: true } }; });
  ipcMain.handle('settings:get', async () => ({ ok: true, data: settings }));
  ipcMain.handle('settings:set', async (_e, patch) => {
    // Only known keys, each with its default's type, reach settings.json.
    const bad = !patch || typeof patch !== 'object' || Object.entries(patch).some(([k, v]) => !(k in store.DEFAULTS) || typeof v !== typeof store.DEFAULTS[k]);
    if (bad) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'unknown setting or wrong type' } };
    return { ok: true, data: store.set(patch) };
  });
  ipcMain.handle('tray:setCount', async (_e, { count } = {}) => {
    if (!Number.isInteger(count) || count < 0) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'count must be a whole number' } };
    setCounter(count);
    return { ok: true, data: { count } };
  });
  ipcMain.handle('auth:setToken', async (_e, { token }) => { alertStream.setToken(token); return { ok: true, data: { stored: true } }; });
  ipcMain.handle('server:getStatus', async () => ({ ok: true, data: { ...serverManager.status(), lastCheck: new Date().toISOString() } }));

  ipcMain.handle('file:saveText', async (_e, { defaultName, content, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName || 'export.txt' });
    if (result.canceled) return { ok: true, data: { canceled: true } };
    let text = content || '';
    if (filters) {
      const lines = (content || '').split('\n');
      const keep = lines.filter((l) => {
        for (const [key, val] of Object.entries(filters)) {
          if (l && !l.toLowerCase().includes(String(val).toLowerCase())) return false;
        }
        return true;
      });
      text = keep.join('\n');
    }
    fs.writeFileSync(result.filePath, text, 'utf8');
    return { ok: true, data: { canceled: false, filePath: result.filePath } };
  });

  ipcMain.handle('report:exportPdf', async (_e, { defaultName, lines = [] } = {}) => {
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName || 'logsentinel-report.pdf' });
    if (result.canceled) return { ok: true, data: { canceled: true } };
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    page.drawText('LogSentinel report', { x: 50, y: 780, size: 20 });
    page.drawText(`Generated ${new Date().toLocaleString()}`, { x: 50, y: 755, size: 10 });
    let y = 720;
    for (const line of lines) {
      if (y < 50) { page = pdfDoc.addPage([595, 842]); y = 790; }
      // standard PDF fonts are WinAnsi-only; drop characters they can't encode
      page.drawText(String(line).replace(/[^\x20-\x7E]/g, '?').slice(0, 95), { x: 50, y, size: 10 });
      y -= 16;
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(result.filePath, Buffer.from(pdfBytes));
    return { ok: true, data: { canceled: false, filePath: result.filePath } };
  });

  ipcMain.handle('capture:dashboard', async (_e) => {
    const result = await dialog.showSaveDialog(mainWindow, { defaultPath: 'dashboard-screenshot.png' });
    if (result.canceled) return { ok: true, data: { canceled: true } };
    const image = await mainWindow.webContents.capturePage();
    const buf = image.toPNG();
    fs.writeFileSync(result.filePath, buf);
    return { ok: true, data: { canceled: false, filePath: result.filePath } };
  });
}

module.exports = { registerIpc };
