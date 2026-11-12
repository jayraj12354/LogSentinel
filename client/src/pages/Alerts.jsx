import { useState, useEffect } from 'react';
import api from '../api/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/alerts?pageSize=25').then(({ data }) => { setAlerts(data.data || data); setLoading(false); });
  }, []);

  if (loading) return <div className="page">Loading alerts…</div>;
  return (
    <div className="page">
      <h1>Alerts</h1>
      <table>
        <thead>
          <tr><th>Title</th><th>Severity</th><th>Count</th><th>Status</th></tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td><td>{a.severity}</td><td>{a.eventCount}</td><td>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
