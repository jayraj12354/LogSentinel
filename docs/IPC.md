# LogSentinel — Electron IPC Contract

Preload exposes `window.api` only. `ipcRenderer` is never exposed to the renderer. Every `on*` returns an unsubscribe function.

## Request–Response (ipcMain.handle / ipcRenderer.invoke)

| Channel | Payload | data | Part |
|---------|---------|------|------|
| `dialog:openLogFile` | — | `{ canceled, filePath }` | 8 |
| `app:getInfo` | — | `{ name, version, electron, chrome, node, platform, isPackaged }` | 8 |
| `window:toggleFullscreen` | — | `{ fullscreen }` | 8 |
| `window:openAlertDetail` | `{ alertId }` | `{ opened: true }` | 8 |
| `shell:showItem` | `{ filePath }` | `{ shown: true }` | 8 |
| `settings:get` | — | settings object | 8 |
| `settings:set` | partial settings | updated settings | 8 |
| `auth:setToken` | `{ token \| null }` | `{ stored }` | 8 |
| `server:getStatus` | — | `{ running, pid?, port, lastCheck }` | 8 |
| `tray:setCount` | `{ count }` (whole number ≥ 0: open alerts) | `{ count }` | 11 |
| `file:saveText` | `{ defaultName, content, filters? }` | `{ canceled, filePath }` | 11 |
| `report:exportPdf` | `{ defaultName? }` | `{ canceled, filePath }` | 11 |
| `capture:dashboard` | — | `{ filePath }` | 11 |

## Events (main → renderer via webContents.send)

| Channel | Payload | Part |
|---------|---------|------|
| `server:status` | `{ running, lastCheck }` | 8 |
| `shortcut:navigate` | `{ route }` | 8 |
| `settings:changed` | settings object | 8 |
| `shortcut:refresh` | — | 11 |
| `alert:new` | alert object | 11 |

## Preload Surface (`window.api`)

`openLogFile()`, `saveText(opts)`, `exportPdf(opts)`, `captureDashboard()`, `getAppInfo()`, `toggleFullscreen()`, `openAlertWindow(alertId)`, `showInFolder(filePath)`, `getSettings()`, `setSettings(patch)`, `setAuthToken(token)`, `setAlertCount(count)`, `getServerStatus()`, `getPathForFile(file)`, `onServerStatus(cb)`, `onNavigate(cb)`, `onRefresh(cb)`, `onAlert(cb)`, `onSettingsChanged(cb)`.

## Settings Defaults

Stored in `userData/settings.json`:
`{ notifications: true, minSeverity: "MEDIUM", minimizeToTray: true, launchAtStartup: false, soundAlerts: false, theme: "system" }`

## Security

- All invoke handlers return `{ ok: true, data }` or `{ ok: false, error: { code, message } }` — never throw into renderer.
- Every handler checks `event.senderFrame.url` is the app origin.
- Every handler validates payload types.
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
