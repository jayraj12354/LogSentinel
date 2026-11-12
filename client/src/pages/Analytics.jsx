import { useState, useEffect } from 'react';
import api from '../api/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/logs/filters').then(({ data: d }) => { setData(d.data || d); setLoading(false); });
  }, []);

  if (loading) return <div className="page">Loading analytics…</div>;
  return (
    <div className="page">
      <h1>Analytics</h1>
      <p>Filter options: {JSON.stringify(data)}</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={[{ name: 'Errors', value: 12 }, { name: 'Warnings', value: 24 }]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
