'use strict';

// SYLLABUS: Interactive System Development (Electron) – BrowserWindow & window management
// Creates the main application window with secure defaults.

const { BrowserWindow } = require('electron');
const path = require('path');

function resolveStartUrl() {
  // Part 3 loads a local placeholder; later parts load the React dev/build URL.
  if (process.env.LS_PLACEHOLDER === '1') {
    return { file: path.join(__dirname, '..', 'placeholder', 'index.html') };
  }
  if (process.env.LS_CLIENT_URL) {
    return { url: process.env.LS_CLIENT_URL };
  }
  return { file: path.join(__dirname, '..', 'placeholder', 'index.html') };
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // show when ready-to-show to avoid flicker
    title: 'LogSentinel',
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  const target = resolveStartUrl();
  if (target.url) {
    win.loadURL(target.url);
  } else {
    win.loadFile(target.file);
  }

  return win;
}

module.exports = { createMainWindow };
