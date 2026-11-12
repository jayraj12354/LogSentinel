const { contextBridge, ipcRenderer } = require('electron');

const api = {
  openLogFile: () => ipcRenderer.invoke('dialog:openLogFile'),
  saveText: (opts) => ipcRenderer.invoke('file:saveText', opts),
  exportPdf: (opts) => ipcRenderer.invoke('report:exportPdf', opts),
  captureDashboard: () => ipcRenderer.invoke('capture:dashboard'),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  openAlertWindow: (alertId) => ipcRenderer.invoke('window:openAlertDetail', { alertId }),
  showInFolder: (filePath) => ipcRenderer.invoke('shell:showItem', { filePath }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  setAuthToken: (token) => ipcRenderer.invoke('auth:setToken', { token }),
  getServerStatus: () => ipcRenderer.invoke('server:getStatus'),
  getPathForFile: (file) => require('@electron/remote').app.getPath('userData') + '/' + file,
  onServerStatus: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('server:status', h); return () => ipcRenderer.off('server:status', h); },
  onNavigate: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('shortcut:navigate', h); return () => ipcRenderer.off('shortcut:navigate', h); },
  onRefresh: (cb) => { const h = () => cb(); ipcRenderer.on('shortcut:refresh', h); return () => ipcRenderer.off('shortcut:refresh', h); },
  onAlert: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('alert:new', h); return () => ipcRenderer.off('alert:new', h); },
  onSettingsChanged: (cb) => { const h = (e, d) => cb(d); ipcRenderer.on('settings:changed', h); return () => ipcRenderer.off('settings:changed', h); },
};

contextBridge.exposeInMainWorld('api', api);
