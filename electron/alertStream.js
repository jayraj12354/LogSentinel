const { ipcMain, net, Notification } = require('electron');
const { setCounter } = require('./tray');

const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function attach(mainWindow, settings) {
  ipcMain.on('alert:emit', (_e, alert) => {
    dispatchAlert(mainWindow, alert, settings);
  });

  connectSSE(mainWindow, settings);
}

let token = null;
function setToken(t) { token = t; }

// shortcut: an open stream keeps the token it connected with until it drops; fine for a single local user.
function connectSSE(mainWindow, settings) {
  const retry = () => setTimeout(() => connectSSE(mainWindow, settings), 3000);
  if (!token) return retry(); // stream needs auth; wait for the renderer to log in
  let buffer = '';
  const req = net.request({ method: 'GET', url: 'http://localhost:4000/api/v1/alerts/stream' });
  req.setHeader('Authorization', `Bearer ${token}`);
  req.on('response', (res) => {
    if (res.statusCode !== 200) { res.on('data', () => {}); return retry(); }
    res.on('end', retry);
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        let eventType = null;
        let data = null;
        for (const line of block.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7);
          else if (line.startsWith('data: ')) data = line.slice(6);
        }
        if (eventType === 'alert' && data) {
          try {
            dispatchAlert(mainWindow, JSON.parse(data), settings);
          } catch (e) {}
        }
      }
    });
  });
  req.on('error', retry);
  req.end();
}

function dispatchAlert(mainWindow, alert, settings) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const sev = alert.severity || 'MEDIUM';
  const minSev = settings && settings.minSeverity ? settings.minSeverity : 'MEDIUM';
  const shouldNotify = SEVERITY_RANK[sev] >= SEVERITY_RANK[minSev];
  if (shouldNotify && settings && settings.notifications !== false && Notification.isSupported()) {
    new Notification({
      title: alert.title || 'LogSentinel Alert',
      body: `Severity: ${sev} · Events: ${alert.event_count || 0}`,
      silent: true,
    }).show();
  }
  setCounter((global._lsAlertCount || 0) + 1);
  global._lsAlertCount = (global._lsAlertCount || 0) + 1;
  mainWindow.webContents.send('alert:new', alert);
}

module.exports = { attach, setToken };
