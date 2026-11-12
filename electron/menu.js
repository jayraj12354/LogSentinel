const { Menu, app } = require('electron');

function build(mainWindow) {
  const template = [
    { label: 'App', submenu: [{ label: 'About', click: () => mainWindow.webContents.send('shortcut:navigate', { route: '/' }) }, { type: 'separator' }, { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] },
    { label: 'View', submenu: [{ label: 'Toggle Fullscreen', accelerator: 'F11', click: () => mainWindow.webContents.send('window:toggleFullscreen') }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { build };
