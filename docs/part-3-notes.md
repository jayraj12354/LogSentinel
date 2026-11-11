# Part 3 — Electron A: Shell, Lifecycle, Windows & Core APIs

Scope delivered (ISD, depends on Part 1):
- Electron app package (`electron/package.json`, `main.js`) with lifecycle handling (`whenReady`, `window-all-closed`, `activate`).
- Main `BrowserWindow` with secure defaults: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, preload wired.
- Secure preload (`preload.js`) exposing only `window.api` via `contextBridge` (no `ipcRenderer` exposed). Minimal placeholder API now; full Section 10 IPC contract comes in Part 8.
- Local placeholder UI (`electron/placeholder/index.html`) that reads app info through the preload bridge.
- Basic config module (`electron/config.js`).

How to run:
- `cd electron && npm install && npm run dev` (or `npm start`)

Notes / deviations:
- Part 3 uses a local placeholder page by default (React/Vite UI arrives in Part 7). The main window loader prefers `LS_CLIENT_URL` if set.
- Full IPC handlers/events per Section 10 and server integration are deferred to Part 8/11 as specified by the plan.
