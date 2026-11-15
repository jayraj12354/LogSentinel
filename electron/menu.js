const { Menu } = require('electron');

const go = (mainWindow, route) => () => { mainWindow.show(); mainWindow.webContents.send('shortcut:navigate', { route }); };

function build(mainWindow) {
  const template = [
    { role: 'appMenu' },
    { role: 'editMenu' }, // without this, copy/paste/select-all don't work in text fields on macOS
    {
      label: 'View',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+1', click: go(mainWindow, '/') },
        { label: 'Logs', accelerator: 'CmdOrCtrl+2', click: go(mainWindow, '/logs') },
        { label: 'Analytics', accelerator: 'CmdOrCtrl+3', click: go(mainWindow, '/analytics') },
        { label: 'Alerts', accelerator: 'CmdOrCtrl+4', click: go(mainWindow, '/alerts') },
        { type: 'separator' },
        { label: 'Refresh data', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.send('shortcut:refresh') },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { build };
