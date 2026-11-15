import ResourcePage from '../components/ResourcePage';
import Badge from '../components/Badge';
import api from '../api/api';
import { useApi } from '../hooks/useApi';

const SEVERITIES = [['LOW', 'Low'], ['MEDIUM', 'Medium'], ['HIGH', 'High'], ['CRITICAL', 'Critical']];

export default function Policies() {
  const rules = useApi('/rules');
  const categories = [...new Set((rules.data || []).map((r) => r.category))];

  return (
    <>
      <datalist id="rule-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <ResourcePage
        title="Alert policies"
        about="A policy raises an alert when too many lines of one category arrive within a time window from the same IP or source. Only lines logged inside the window count, so policies react to watched, live logs."
        path="/policies"
        noun="policy"
        defaults={{ name: '', category: categories[0] || 'AUTH_FAILURE', thresholdCount: 5, windowSeconds: 300, groupBy: 'IP', severity: 'HIGH' }}
        fields={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Brute-force login' },
          { name: 'category', label: 'Category to count', required: true, mono: true, list: 'rule-categories', help: 'A category set by one of your rules.' },
          { name: 'thresholdCount', label: 'Alert at this many lines', type: 'number', required: true },
          { name: 'windowSeconds', label: 'Within (seconds)', type: 'number', required: true },
          { name: 'groupBy', label: 'Count per', type: 'select', options: [['IP', 'IP address'], ['SOURCE', 'Log source']] },
          { name: 'severity', label: 'Alert severity', type: 'select', options: SEVERITIES },
        ]}
        columns={[
          { label: 'Name', render: (p) => p.name },
          { label: 'Triggers when', render: (p) => <><span className="mono">{p.thresholdCount}+ {p.category}</span> lines within {p.windowSeconds}s from one {p.groupBy === 'IP' ? 'IP' : 'source'}</> },
          { label: 'Severity', render: (p) => <Badge value={p.severity} /> },
          {
            label: 'Enabled',
            render: (p, ctx) => (
              <label className="switch">
                <input type="checkbox" checked={p.isActive} disabled={ctx.busy} onChange={() => ctx.run(() => api.put(`/policies/${p.id}`, { isActive: !p.isActive }))} />
                <span className="sr-only">Enable {p.name}</span>
              </label>
            ),
          },
        ]}
        deleteName={(p) => p.name}
      />
    </>
  );
}
