import { useState } from 'react';
import ResourcePage from '../components/ResourcePage';
import Badge from '../components/Badge';
import api from '../api/api';

const SEVERITIES = [['LOW', 'Low'], ['MEDIUM', 'Medium'], ['HIGH', 'High'], ['CRITICAL', 'Critical']];

function RuleTester() {
  const [pattern, setPattern] = useState('');
  const [sample, setSample] = useState('');
  const [result, setResult] = useState(null);

  const test = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/rules/test', { pattern, sample, flags: 'i' });
      setResult(data.error ? { bad: true, text: `That pattern isn’t a valid regular expression: ${data.error}` } : { ok: data.matched, text: data.matched ? 'The line matches.' : 'The line doesn’t match.' });
    } catch (err) {
      setResult({ bad: true, text: err.message });
    }
  };

  return (
    <form className="tester" onSubmit={test}>
      <h2>Try a pattern</h2>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="t-pattern">Pattern</label>
          <input id="t-pattern" className="mono" value={pattern} onChange={(e) => { setPattern(e.target.value); setResult(null); }} placeholder="failed password|invalid user" required />
        </div>
        <div className="field field-wide">
          <label htmlFor="t-sample">Log line</label>
          <input id="t-sample" className="mono" value={sample} onChange={(e) => { setSample(e.target.value); setResult(null); }} placeholder="Failed password for invalid user admin from 203.0.113.45" required />
        </div>
      </div>
      <div className="actions">
        <button className="btn" type="submit">Test pattern</button>
        {result && <span className={result.bad ? 'result result-bad' : result.ok ? 'result result-ok' : 'result'} role="status">{result.text}</span>}
      </div>
    </form>
  );
}

export default function Rules() {
  return (
    <ResourcePage
      title="Rules"
      about="Rules tag log lines with a category when their message matches a pattern (a case-insensitive regular expression). Alert policies then count lines by category. New rules apply to lines imported or watched from now on."
      path="/rules"
      noun="rule"
      defaults={{ name: '', pattern: '', category: '', severity: 'MEDIUM' }}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'Login failure' },
        { name: 'pattern', label: 'Pattern', required: true, mono: true, placeholder: 'failed password|invalid user' },
        { name: 'category', label: 'Category', required: true, mono: true, placeholder: 'AUTH_FAILURE', help: 'Policies use this name to count matching lines.' },
        { name: 'severity', label: 'Severity', type: 'select', options: SEVERITIES },
      ]}
      columns={[
        { label: 'Name', render: (r) => r.name },
        { label: 'Pattern', className: 'mono msg', render: (r) => r.pattern },
        { label: 'Category', className: 'mono', render: (r) => r.category },
        { label: 'Severity', render: (r) => <Badge value={r.severity} /> },
      ]}
      deleteName={(r) => r.name}
    >
      {() => <RuleTester />}
    </ResourcePage>
  );
}
