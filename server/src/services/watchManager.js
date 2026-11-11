'use strict';

const { LogWatcher } = require('./LogWatcher');

class WatchManager {
  constructor() {
    this._watchers = new Map();
  }

  start(sourceId, filePath, onLine) {
    if (this._watchers.has(sourceId)) return false;
    const watcher = new LogWatcher(filePath);
    watcher.on('line', ({ lineNo, text }) => onLine(sourceId, lineNo, text));
    watcher.start().catch(() => {});
    this._watchers.set(sourceId, watcher);
    return true;
  }

  stop(sourceId) {
    const watcher = this._watchers.get(sourceId);
    if (!watcher) return false;
    watcher.stop();
    this._watchers.delete(sourceId);
    return true;
  }

  status(sourceId) {
    const watcher = this._watchers.get(sourceId);
    return { watching: !!watcher };
  }

  list() {
    return Array.from(this._watchers.keys());
  }
}

module.exports = { WatchManager };
