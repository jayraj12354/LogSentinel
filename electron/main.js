const { app, BrowserWindow } = require('electron');
function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { preload: require('path').join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  win.loadURL('http://localhost:5173');
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
