import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApi } from '../hooks/useApi';
import api from '../api/api';
import { fmtHour, fmtTime, fmtNum } from '../utils/format';

const axis = { tick: { fontSize: 11, fill: 'var(--muted)' }, axisLine: false, tickLine: false };
const tip = { contentStyle: { borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 } };

function SqlToggle({ name }) {
  const [sql, setSql] = useState(null);
  const [error, setError] = useState('');
  const toggle = () => {
    if (sql !== null) return setSql(null);
    api.get(`/analytics/${name}/sql`).then(setSql).catch((e) => setError(e.message));
  };
  return (
    <>
      <button className="btn btn-quiet btn-small" onClick={toggle} aria-expanded={sql !== null}>{sql !== null ? 'Hide SQL' : 'Show SQL'}</button>
      {error && <p className="notice notice-error">{error}</p>}
      {sql !== null && <pre className="sql">{sql}</pre>}
    </>
  );
}

function Panel({ title, about, sqlName, state, children, emptyText }) {
  const empty = Array.isArray(state.data) && state.data.length === 0;
  return (
    <section className="analysis">
      <header>
        <h2>{title}</h2>
        <p className="muted">{about}</p>
      </header>
      {state.error && <p className="notice notice-error">{state.error}</p>}
      {state.data && (empty ? <p className="empty">{emptyText}</p> : children)}
      {sqlName && <SqlToggle name={sqlName} />}
    </section>
  );
}

export default function Analytics() {
  const offenders = useApi('/analytics/top_offenders');
  const errors = useApi('/analytics/moving_average_errors');
  const failThenSuccess = useApi('/analytics/fail_then_success');
  const summary = useApi('/analytics/summary');

  const offenderData = (offenders.data || []).map((r) => ({ ip: r.ip, failures: Number(r.failures) }));
  const errorData = (errors.data || []).map((r) => ({ hour: r.hour, errors: Number(r.errors) }));

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">
            {summary.data ? `Across ${fmtNum(summary.data.totalEntries)} stored log lines.` : ' '}
          </p>
        </div>
      </header>

      <Panel title="Failed sign-ins by IP" about="The ten addresses with the most failed logins. A tall bar usually means a password-guessing attack." sqlName="top_offenders" state={offenders} emptyText="No failed sign-ins recorded.">
        <ResponsiveContainer width="100%" height={Math.max(120, offenderData.length * 34)}>
          <BarChart data={offenderData} layout="vertical" margin={{ left: 24, right: 24 }}>
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey="ip" {...axis} width={110} tick={{ ...axis.tick, fontFamily: 'var(--mono)' }} />
            <Tooltip {...tip} cursor={{ fill: 'var(--grid)' }} />
            <Bar dataKey="failures" name="Failed sign-ins" fill="var(--crit)" barSize={16} radius={[0, 3, 3, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Errors per hour" about="Lines logged at error level, hour by hour. Spikes point at outages or failing deploys." sqlName="moving_average_errors" state={errors} emptyText="No log lines yet.">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={errorData} margin={{ left: -12, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="hour" tickFormatter={fmtHour} {...axis} minTickGap={40} />
            <YAxis {...axis} allowDecimals={false} width={44} />
            <Tooltip {...tip} labelFormatter={fmtTime} />
            <Line type="monotone" dataKey="errors" name="Errors" stroke="var(--hot)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Failed, then signed in" about="An IP that failed to log in and then succeeded within ten minutes. This can mean a guessed password, so check each one." sqlName="fail_then_success" state={failThenSuccess} emptyText="No IP failed and then succeeded within ten minutes.">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>IP</th><th>Failed at</th><th>Signed in at</th></tr></thead>
            <tbody>
              {(failThenSuccess.data || []).map((r, i) => (
                <tr key={i}><td className="mono">{r.ip}</td><td>{fmtTime(r.failed_at)}</td><td>{fmtTime(r.success_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
