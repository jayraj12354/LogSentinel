const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');
const DEFAULTS = {
  notifications: true,
  minSeverity: 'MEDIUM',
  minimizeToTray: true,
  launchAtStartup: false,
  soundAlerts: false,
  theme: 'system',
};

let settings = { ...DEFAULTS };

function load() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) };
  } catch (e) { settings = { ...DEFAULTS }; }
  return settings;
}

function save() {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function get() { return settings; }

function set(patch) { settings = { ...settings, ...patch }; save(); return settings; }

module.exports = { load, get, set, SETTINGS_PATH, DEFAULTS };
