export const fmtNum = (n) => Number(n || 0).toLocaleString();
export const plural = (n, word) => `${fmtNum(n)} ${word}${Number(n) === 1 ? '' : 's'}`;
export const fmtTime = (v) => (v ? new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');
export const fmtHour = (v) => new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });

// RFC 4180-style CSV: quote every field, double embedded quotes.
// Log text comes from outside; a leading = + - @ would run as a spreadsheet formula, so prefix it with '.
export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = String(v ?? '');
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  return [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(c.get(r))).join(','))].join('\n');
}
