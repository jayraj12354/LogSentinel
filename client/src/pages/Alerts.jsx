import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, refreshAll } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import Badge from '../components/Badge';
import Pager from '../components/Pager';
import { fmtTime, fmtNum } from '../utils/format';

const STATUSES = [['OPEN', 'Open'], ['ACKNOWLEDGED', 'Acknowledged'], ['RESOLVED', 'Resolved'], ['', 'All']];

export default function Alerts() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('id');
  const [status, setStatus] = useState(selected ? '' : 'OPEN');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams({ page, pageSize: 25, ...(status && { status }), ...(severity && { severity }) });
  const list = useApi(`/alerts?${qs}`);
  const select = (id) => setParams(id ? { id } : {});

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>Alerts</h1>
          <p className="muted">Raised when a policy’s threshold is crossed. Acknowledge an alert when you start on it, and resolve it when it’s handled.</p>
        </div>
      </header>

      <div className="filters">
        <div className="segmented" role="group" aria-label="Status">
          {STATUSES.map(([v, label]) => (
            <button key={label} className={status === v ? 'on' : ''} aria-pressed={status === v} onClick={() => { setStatus(v); setPage(1); }}>{label}</button>
          ))}
        </div>
        <select aria-label="Severity" value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}>
          <option value="">Any severity</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      <div className={selected ? 'with-panel' : ''}>
        <div>
          {list.error && <p className="notice notice-error">{list.error}</p>}
          {list.data && list.data.length === 0 && (
            <p className="empty">{status === 'OPEN' ? 'No open alerts. Nothing needs attention right now.' : 'No alerts match these filters.'}</p>
          )}
          {list.data && list.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Severity</th><th>Alert</th><th>IP or source</th><th>Events</th><th>Raised</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {list.data.map((a) => (
                    <tr key={a.id} className={String(a.id) === selected ? 'row-open' : ''} onClick={() => select(a.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && select(a.id)}>
                      <td><Badge value={a.severity} /></td>
                      <td>{a.title}</td>
                      <td className="mono">{a.ip || a.source?.name || '—'}</td>
                      <td>{fmtNum(a.eventCount)}</td>
                      <td className="nowrap">{fmtTime(a.triggeredAt)}</td>
                      <td><Badge value={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager meta={list.meta} onPage={setPage} />
        </div>
        {selected && <AlertPanel id={selected} onClose={() => select(null)} />}
      </div>
    </div>
  );
}

function AlertPanel({ id, onClose }) {
  const { isAdmin } = useAuth();
  const { data: a, error } = useApi(`/alerts/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const act = async (verb) => {
    setBusy(true);
    setActionError('');
    try {
      await api.patch(`/alerts/${id}/${verb}`);
      refreshAll();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="panel" aria-label="Alert details">
      <button className="btn btn-quiet panel-close" onClick={onClose} aria-label="Close details">Close</button>
      {error && <p className="notice notice-error">{error}</p>}
      {a && (
        <>
          <Badge value={a.severity} />
          <h2>{a.title}</h2>
          <dl className="facts">
            <dt>Status</dt><dd><Badge value={a.status} /></dd>
            <dt>Policy</dt><dd>{a.policy?.name}: {a.policy?.thresholdCount}+ {a.policy?.category} lines within {a.policy?.windowSeconds}s, grouped by {a.policy?.groupBy === 'IP' ? 'IP' : 'source'}</dd>
            {a.ip && <><dt>IP address</dt><dd className="mono">{a.ip}</dd></>}
            {a.source && <><dt>Source</dt><dd>{a.source.name}</dd></>}
            <dt>Events</dt><dd>{fmtNum(a.eventCount)}</dd>
            <dt>Window</dt><dd>{fmtTime(a.windowStart)} to {fmtTime(a.windowEnd)}</dd>
            <dt>Raised</dt><dd>{fmtTime(a.triggeredAt)}</dd>
            {a.acknowledger && <><dt>Handled by</dt><dd>{a.acknowledger.username}, {fmtTime(a.acknowledgedAt)}</dd></>}
          </dl>
          {actionError && <p className="notice notice-error">{actionError}</p>}
          {isAdmin && a.status !== 'RESOLVED' && (
            <div className="actions">
              {a.status === 'OPEN' && <button className="btn" disabled={busy} onClick={() => act('ack')}>Acknowledge</button>}
              <button className="btn btn-primary" disabled={busy} onClick={() => act('resolve')}>Resolve</button>
            </div>
          )}
          {!isAdmin && <p className="muted">Only administrators can acknowledge or resolve alerts.</p>}
        </>
      )}
    </aside>
  );
}
