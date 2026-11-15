'use strict';

const { ipcMain, dialog } = require('electron');
const fs = require('fs');

function registerIpc(mainWindow) {
  ipcMain.handle('file:saveText', async (_e, { defaultName, content, filters }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'log-sentinel-export.txt',
      filters: filters || [{ name: 'Text Files', extensions: ['txt'] }],
    });
    if (result.canceled) return { ok: true, data: { canceled: true, filePath: null } };
    fs.writeFileSync(result.filePath, content || '');
    return { ok: true, data: { canceled: false, filePath: result.filePath } };
  });

  ipcMain.handle('report:exportPdf', async (_e, { defaultName } = {}) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: { code: 'INTERNAL', message: 'no window' } };
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'log-sentinel-report.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (result.canceled) return { ok: true, data: { canceled: true, filePath: null } };
    const pdfData = await mainWindow.webContents.printToPDF({});
    fs.writeFileSync(result.filePath, pdfData);
    return { ok: true, data: { canceled: false, filePath: result.filePath } };
  });

  ipcMain.handle('capture:dashboard', async (_e) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: { code: 'INTERNAL', message: 'no window' } };
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'log-sentinel-dashboard.png',
      filters: [{ name: 'PNG Images', extensions: ['png'] }],
    });
    if (result.canceled) return { ok: true, data: { canceled: true, filePath: null } };
    const image = await mainWindow.webContents.capturePage();
    fs.writeFileSync(result.filePath, image.toPNG());
    return { ok: true, data: { canceled: false, filePath: result.filePath } };
  });
}

module.exports = { registerIpc };
