'use strict';

// SYLLABUS: Interactive System Development (Electron) – Preload & contextIsolation
// Exposes a minimal, safe API surface via contextBridge. ipcRenderer is never exposed.
// Part 8 will add the full IPC contract; Part 3 establishes the secure pattern.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Minimal placeholder; expanded in Part 8 per Section 10 contract.
  ping: () => 'pong',
  getAppInfo: async () => ({
    platform: process.platform,
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    },
  }),
});
