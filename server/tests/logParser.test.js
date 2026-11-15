'use strict';

const { parseLine } = require('../src/services/logParser');

describe('logParser', () => {
  it('reads a generic timestamp without a zone as UTC, whatever the server time zone', () => {
    const p = parseLine('2026-11-16T10:00:00 ERROR [auth] Failed password from 203.0.113.5', 'GENERIC');
    expect(p.loggedAt.toISOString()).toBe('2026-11-16T10:00:00.000Z');
    expect(p.ip).toBe('203.0.113.5');
  });
});
