const path = require('path');
const { app, dialog } = require('electron');
const config = require('./config');

let server = null;

function attach(mainWindow) {
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.webContents.send('server:status', { running: false, lastCheck: new Date().toISOString() });
  });
}

// Runs the Express API inside the Electron process. Set LS_SPAWN_SERVER=0 when a separate
// dev server is already running (the root `npm run dev` script does this).
function startServer() {
  if (process.env.LS_SPAWN_SERVER === '0' || server) return;
  const serverEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'src', 'server.js')
    : path.join(__dirname, '..', 'server', 'src', 'server.js');
  try {
    server = require(serverEntry);
    server.on('error', (err) => {
      const detail = err.code === 'EADDRINUSE'
        ? `Port ${config.port} is already in use. Another copy of LogSentinel or another program is using it. Quit that program and open LogSentinel again.`
        : err.message;
      dialog.showErrorBox('LogSentinel couldn’t start its server', detail);
    });
  } catch (err) {
    dialog.showErrorBox('LogSentinel couldn’t start its server', err.message);
  }
}

function stopServer() {
  if (server) server.close();
  server = null;
}

module.exports = { attach, startServer, stopServer };
