import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import api from '../api/api';
import Badge from '../components/Badge';
import Pager from '../components/Pager';
import { fmtTime, fmtNum, toCsv } from '../utils/format';

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
const PAGE_SIZE = 50;

const CSV_COLUMNS = [
  { label: 'Time', get: (l) => l.loggedAt },
  { label: 'Source', get: (l) => l.sourceId },
  { label: 'Line', get: (l) => l.lineNo },
  { label: 'Level', get: (l) => l.level },
  { label: 'Category', get: (l) => l.category },
  { label: 'IP', get: (l) => l.ip },
  { label: 'Message', get: (l) => l.message },
];

export default function Logs() {
  const [filters, setFilters] = useState({ sourceId: '', level: '', category: '', ip: '', q: '' });
  const [text, setText] = useState({ ip: '', q: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [notice, setNotice] = useState('');

  const options = useApi('/logs/filters');
  const qs = new URLSearchParams({ page, pageSize: PAGE_SIZE, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const logs = useApi(`/logs?${qs}`);
  const sources = Object.fromEntries((options.data?.sources || []).map((s) => [s.id, s.name]));

  const set = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const applyText = (e) => { e.preventDefault(); setFilters((f) => ({ ...f, ...text })); setPage(1); };
  const clear = () => { setFilters({ sourceId: '', level: '', category: '', ip: '', q: '' }); setText({ ip: '', q: '' }); setPage(1); };
  const active = Object.values(filters).some(Boolean);

  const exportCsv = async () => {
    // Exports up to 200 matching lines (the API's page-size cap), newest first.
    const body = await api.get(`/logs?${new URLSearchParams({ ...Object.fromEntries(qs), page: 1, pageSize: 200 })}`);
    const rows = body.data.map((l) => ({ ...l, sourceId: sources[l.sourceId] || l.sourceId }));
    const csv = toCsv(rows, CSV_COLUMNS);
    if (window.api) {
      const r = await window.api.saveText({ defaultName: 'logsentinel-logs.csv', content: csv });
      if (r?.data?.filePath) setNotice(`Saved ${rows.length} lines to ${r.data.filePath}`);
    } else {
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'logsentinel-logs.csv' });
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>Logs</h1>
          <p className="muted">{logs.meta ? `${fmtNum(logs.meta.total)} ${active ? 'matching lines' : 'lines stored'}` : ' '}</p>
        </div>
        <button className="btn" onClick={exportCsv} disabled={!logs.meta?.total}>Export CSV</button>
      </header>
      {notice && <p className="notice">{notice}</p>}

      <form className="filters" onSubmit={applyText}>
        <select aria-label="Source" value={filters.sourceId} onChange={(e) => set('sourceId', e.target.value)}>
          <option value="">All sources</option>
          {(options.data?.sources || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Level" value={filters.level} onChange={(e) => set('level', e.target.value)}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
        </select>
        <select aria-label="Category" value={filters.category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>
          {(options.data?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input aria-label="IP address" placeholder="IP address" value={text.ip} onChange={(e) => setText((t) => ({ ...t, ip: e.target.value }))} />
        <input className="grow" type="search" aria-label="Search messages" placeholder="Search messages" value={text.q} onChange={(e) => setText((t) => ({ ...t, q: e.target.value }))} />
        <button className="btn" type="submit">Search</button>
        {active && <button className="btn btn-quiet" type="button" onClick={clear}>Clear filters</button>}
      </form>

      {logs.error && <p className="notice notice-error">{logs.error}</p>}
      {logs.data && logs.data.length === 0 && (
        <p className="empty">{active ? 'No lines match these filters.' : 'No logs yet. An administrator can import a file from Log sources.'}</p>
      )}
      {logs.data && logs.data.length > 0 && (
        <div className="table-wrap">
          <table className="table logs-table">
            <thead>
              <tr><th>Time</th><th>Source</th><th>Level</th><th>Category</th><th>IP</th><th>Message</th></tr>
            </thead>
            <tbody>
              {logs.data.map((l) => {
                const key = `${l.sourceId}-${l.lineNo}`;
                return [
                  <tr key={key} className={open === key ? 'row-open' : ''} onClick={() => setOpen(open === key ? null : key)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(open === key ? null : key)}>
                    <td className="nowrap">{fmtTime(l.loggedAt)}</td>
                    <td className="nowrap">{sources[l.sourceId] || l.sourceId}</td>
                    <td><Badge value={l.level} /></td>
                    <td>{l.category || <span className="muted">—</span>}</td>
                    <td className="mono nowrap">{l.ip || <span className="muted">—</span>}</td>
                    <td className="mono msg">{l.message}</td>
                  </tr>,
                  open === key && (
                    <tr key={`${key}-raw`} className="row-detail">
                      <td colSpan={6}>
                        <p className="muted">Line {l.lineNo} of {sources[l.sourceId] || `source ${l.sourceId}`}</p>
                        <pre>{JSON.stringify(l.raw, null, 2)}</pre>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager meta={logs.meta} onPage={setPage} />
    </div>
  );
}
