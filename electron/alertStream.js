const { ipcMain } = require('electron');
const http = require('http');

function attach(mainWindow, serverUrl = 'http://localhost:4000') {
  // Connect to the server's SSE alert stream and forward to renderer via IPC
  const req = http.get(`${serverUrl}/api/v1/alerts/stream`, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const alert = JSON.parse(line.slice(6));
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('alert:new', alert);
            }
          } catch (e) {
            // Ignore malformed SSE data
          }
        }
      }
    });
  });

  req.on('error', () => {
    // Server may not be running yet; retry later
  });

  // Retry connection every 5 seconds if it fails
  const retryTimer = setInterval(() => {
    if (req.aborted || req.socket?.destroyed) {
      http.get(`${serverUrl}/api/v1/alerts/stream`, (newRes) => {
        let buffer = '';
        newRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const alert = JSON.parse(line.slice(6));
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('alert:new', alert);
                }
              } catch (e) { /* ignore */ }
            }
          }
        });
      });
    }
  }, 5000);

  // Also listen for IPC alert:emit from local sources
  ipcMain.on('alert:emit', (_e, alert) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('alert:new', alert);
  });

  return { retryTimer };
}

module.exports = { attach };
