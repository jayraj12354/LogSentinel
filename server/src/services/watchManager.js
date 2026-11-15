'use strict';

const { LogWatcher } = require('./LogWatcher');
const { pool } = require('../config/db');

class WatchManager {
  constructor() {
    this._watchers = new Map();
  }

  async start(sourceId, filePath, onLine) {
    if (this._watchers.has(sourceId)) return false;

    // Continue line numbering from existing entries to avoid duplicate PKs
    const { rows } = await pool.query(
      'SELECT COALESCE(MAX(line_no), 0) AS maxLine FROM log_entries WHERE source_id = $1',
      [sourceId]
    );
    const startLineNo = rows[0].maxline;

    const watcher = new LogWatcher(filePath, startLineNo);
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
