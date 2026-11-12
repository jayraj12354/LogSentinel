import { useState, useEffect } from 'react';
import api from '../api/api';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/logs?pageSize=25').then(({ data }) => { setLogs(data.data || data); setLoading(false); });
  }, []);

  if (loading) return <div className="page">Loading logs…</div>;
  return (
    <div className="page">
      <h1>Logs</h1>
      <table>
        <thead>
          <tr><th>Time</th><th>Source</th><th>Level</th><th>Category</th><th>Message</th><th>IP</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={`${l.sourceId}-${l.lineNo}`}>
              <td>{l.loggedAt}</td><td>{l.sourceId}</td><td>{l.level}</td><td>{l.category || '—'}</td><td>{l.message}</td><td>{l.ip || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
