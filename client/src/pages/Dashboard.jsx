import { Link } from 'react-router-dom';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import Badge from '../components/Badge';
import { fmtHour, fmtTime, fmtNum, plural } from '../utils/format';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const summary = useApi('/analytics/summary');
  const trace = useApi('/analytics/events_per_hour');
  const offenders = useApi('/analytics/top_offenders');
  const alerts = useApi('/alerts?status=OPEN&pageSize=6');

  if (summary.error) return <div className="page"><p className="notice notice-error">{summary.error}</p></div>;
  if (!summary.data) return <div className="page"><p className="muted">Loading…</p></div>;

  const s = summary.data;
  const top = offenders.data?.[0];
  const openList = alerts.data || [];
  const empty = s.totalEntries === 0;

  const exportReport = () => {
    const lines = [
      `Log lines stored: ${fmtNum(s.totalEntries)}`,
      `Open alerts: ${s.openAlerts}`,
      '',
      'Top categories',
      ...s.topCategories.map((c) => `  ${c.category}: ${fmtNum(c.count)}`),
      '',
      'Most failed sign-ins by IP',
      ...(offenders.data || []).map((o) => `  ${o.ip}: ${o.failures}`),
      '',
      'Open alerts',
      ...openList.map((a) => `  [${a.severity}] ${a.title} - ${a.ip || 'n/a'} - ${a.eventCount} events - ${fmtTime(a.triggeredAt)}`),
    ];
    window.api.exportPdf({ defaultName: 'logsentinel-report.pdf', lines });
  };

  return (
    <div className="page page-wide">
      <header className="status">
        <h1 className="status-line">
          {empty ? 'No logs yet.' : s.openAlerts === 0 ? 'No open alerts.' : `${plural(s.openAlerts, 'open alert')}.`}
        </h1>
        <p className="status-sub">
          {empty
            ? 'Import a log file to start monitoring.'
            : top
              ? `${top.ip} failed to sign in ${plural(top.failures, 'time')}, more than any other address. ${fmtNum(s.totalEntries)} log lines stored.`
              : `${fmtNum(s.totalEntries)} log lines stored, no failed sign-ins recorded.`}
        </p>
        <div className="actions">
          {empty && isAdmin && <Link className="btn btn-primary" to="/sources">Import logs</Link>}
          {s.openAlerts > 0 && <Link className="btn btn-primary" to="/alerts">Review alerts</Link>}
          {window.api && !empty && <button className="btn" onClick={exportReport}>Export PDF report</button>}
          {window.api && <button className="btn btn-quiet" onClick={() => window.api.captureDashboard()}>Save screenshot</button>}
        </div>
      </header>

      {!empty && (
        <section className="trace" aria-label="Log activity per hour">
          <div className="trace-legend">
            <span className="key key-total">All log lines</span>
            <span className="key key-fail">Failed sign-ins</span>
            <span className="key key-err">Errors</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trace.data || []} margin={{ top: 8, right: 0, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="hour" tickFormatter={fmtHour} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip labelFormatter={fmtTime} contentStyle={{ borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 }} />
              <Area type="monotone" dataKey="total" name="All log lines" stroke="var(--ink)" strokeWidth={1.5} fill="var(--ink)" fillOpacity={0.06} isAnimationActive={false} />
              <Line type="monotone" dataKey="failures" name="Failed sign-ins" stroke="var(--crit)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="errors" name="Errors" stroke="var(--hot)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>
      )}

      {!empty && (
        <div className="split">
          <section>
            <h2>Open alerts</h2>
            {openList.length === 0 ? (
              <p className="muted">Nothing needs attention. New alerts appear here as soon as a policy is triggered.</p>
            ) : (
              <ul className="alert-list">
                {openList.map((a) => (
                  <li key={a.id}>
                    <Link to={`/alerts?id=${a.id}`}>
                      <Badge value={a.severity} />
                      <span className="alert-title">{a.title}</span>
                      <span className="mono">{a.ip || a.source?.name || ''}</span>
                      <span className="muted">{fmtTime(a.triggeredAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2>What the rules matched</h2>
            {s.topCategories.length === 0 ? (
              <p className="muted">No lines matched a rule yet.</p>
            ) : (
              <dl className="bars">
                {s.topCategories.map((c) => (
                  <div key={c.category}>
                    <dt>{c.category}</dt>
                    <dd><span style={{ width: `${(c.count / s.topCategories[0].count) * 100}%` }} /> {fmtNum(c.count)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
