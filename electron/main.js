'use strict';

// SYLLABUS: Interactive System Development (Electron) – Main process & app lifecycle
// Entry point for the Electron desktop shell. Creates windows and manages lifecycle.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createMainWindow } = require('./windows/mainWindow');

// Keep a global reference to avoid garbage collection closing the window.
let mainWindow = null;

function onReady() {
  mainWindow = createMainWindow();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// SYLLABUS: Interactive System Development (Electron) – Lifecycle events
app.whenReady().then(onReady);

app.on('window-all-closed', () => {
  // On macOS apps commonly stay active until Cmd+Q.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Re-create a window on macOS dock click when none are open.
  if (BrowserWindow.getAllWindows().length === 0) {
    onReady();
  }
});
