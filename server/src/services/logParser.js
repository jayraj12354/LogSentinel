'use strict';

const GENERIC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\s+(DEBUG|INFO|WARN|ERROR|CRITICAL)\s+\[([^\]]+)\]\s+(.*)$/;
const ACCESS = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?$/;
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function stripNul(line) {
  return line.split(String.fromCharCode(0)).join('');
}

function validIp(candidate) {
  const parts = candidate.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

function extractIp(text) {
  let match;
  while ((match = IP_RE.exec(text)) !== null) {
    if (validIp(match[0])) return match[0];
  }
  return null;
}

function parseGeneric(line) {
  const m = GENERIC.exec(line);
  if (!m) return null;
  const [, loggedAt, level, component, message] = m;
  return {
    loggedAt: new Date(loggedAt),
    level,
    message,
    ip: extractIp(message),
    raw: { component, text: message },
  };
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function parseAccessDate(value) {
  const m = /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([+-])(\d{2})(\d{2})$/.exec(value);
  if (!m) return null;
  const [, day, mon, year, hh, mm, ss, sign, oh, om] = m;
  const mo = MONTHS[mon.toLowerCase()];
  if (mo === undefined) return null;
  const date = new Date(Date.UTC(Number(year), mo, Number(day), Number(hh), Number(mm), Number(ss)));
  const offset = (Number(oh) * 60 + Number(om)) * 60000;
  return sign === '-' ? new Date(date.getTime() + offset) : new Date(date.getTime() - offset);
}

function parseAccess(line) {
  const m = ACCESS.exec(line);
  if (!m) return null;
  const [, ip, dateStr, method, path, status, bytes, referrer, userAgent] = m;
  const loggedAt = parseAccessDate(dateStr);
  if (!loggedAt) return null;
  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch (e) {
    decodedPath = path;
  }
  const statusN = Number(status);
  const level = statusN >= 500 ? 'ERROR' : statusN >= 400 ? 'WARN' : 'INFO';
  return {
    loggedAt,
    level,
    message: `${method} ${decodedPath} ${status} "${userAgent || ''}"`,
    ip,
    raw: { method, path: decodedPath, status: statusN, bytes: bytes === '-' ? null : Number(bytes), referrer: referrer || null, userAgent: userAgent || null },
  };
}

function parseLine(line, format) {
  const cleaned = stripNul(line);
  if (!cleaned.trim()) return null;
  if (format === 'ACCESS') return parseAccess(cleaned);
  return parseGeneric(cleaned);
}

module.exports = { parseLine };
