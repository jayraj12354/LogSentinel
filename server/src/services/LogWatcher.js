'use strict';

const fs = require('fs');
const { EventEmitter } = require('events');

class LogWatcher extends EventEmitter {
  constructor(filePath, startLineNo = 0) {
    super();
    this.filePath = filePath;
    this._running = false;
    this._lineNo = startLineNo;
    this._watcher = null;
    this._buffer = '';
    this._offset = 0;
  }

  async start() {
    if (this._running) return;
    this._running = true;

    // Determine current file size to start reading from the end
    const stat = fs.statSync(this.filePath);
    this._offset = stat.size;

    this._watcher = fs.watch(this.filePath, (eventType) => {
      if (eventType !== 'change') return;
      this._readNewLines();
    });

    // Read any lines already present after the offset
    this._readNewLines();
  }

  _readNewLines() {
    if (!this._running) return;
    try {
      const stat = fs.statSync(this.filePath);
      if (stat.size <= this._offset) return;

      const fd = fs.openSync(this.filePath, 'r');
      let chunk;
      try {
        chunk = Buffer.alloc(stat.size - this._offset);
        fs.readSync(fd, chunk, 0, chunk.length, this._offset);
        this._offset = stat.size;
      } finally {
        fs.closeSync(fd);
      }

      this._buffer += chunk.toString('utf8');
      const lines = this._buffer.split('\n');

      // Keep the last incomplete line in the buffer
      this._buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        this._lineNo += 1;
        this.emit('line', { lineNo: this._lineNo, text: line });
      }
    } catch (e) {
      // File may be temporarily locked; retry on next change event
    }
  }

  stop() {
    this._running = false;
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }
}

module.exports = { LogWatcher };
