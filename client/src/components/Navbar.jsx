import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';

const MONITOR = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/logs', label: 'Logs' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/alerts', label: 'Alerts', count: true },
];
const SETUP = [
  { to: '/sources', label: 'Log sources' },
  { to: '/rules', label: 'Rules' },
  { to: '/policies', label: 'Alert policies' },
  { to: '/users', label: 'Users' },
];

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { meta } = useApi('/alerts?status=OPEN&pageSize=1');
  const open = meta?.total || 0;

  const link = (l) => (
    <NavLink key={l.to} to={l.to} end={l.end} className="rail-link">
      {l.label}
      {l.count && open > 0 && <span className="rail-count" aria-label={`${open} open alerts`}>{open}</span>}
    </NavLink>
  );

  return (
    <nav className="rail" aria-label="Main">
      <div className="rail-brand">
        <svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true">
          <path d="M0 8h10l3-6 4 12 3-9 2 3h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        LogSentinel
      </div>
      <div className="rail-group">{MONITOR.map(link)}</div>
      {isAdmin && (
        <div className="rail-group">
          <p className="rail-heading">Setup</p>
          {SETUP.map(link)}
        </div>
      )}
      <div className="rail-user">
        <span>
          <strong>{user?.username}</strong>
          <span className="muted">{user?.role === 'ADMIN' ? 'Administrator' : 'Viewer'}</span>
        </span>
        <button className="btn btn-quiet" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
      </div>
    </nav>
  );
}
