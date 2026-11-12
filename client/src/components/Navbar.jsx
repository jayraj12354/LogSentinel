import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="brand">LogSentinel</div>
      <div className="links">
        <NavLink to="/" end className="link" activeClassName="active">Dashboard</NavLink>
        <NavLink to="/logs" className="link" activeClassName="active">Logs</NavLink>
        <NavLink to="/analytics" className="link" activeClassName="active">Analytics</NavLink>
        <NavLink to="/alerts" className="link" activeClassName="active">Alerts</NavLink>
        {isAdmin && <NavLink to="/sources" className="link" activeClassName="active">Sources</NavLink>}
        {isAdmin && <NavLink to="/rules" className="link" activeClassName="active">Rules</NavLink>}
        {isAdmin && <NavLink to="/policies" className="link" activeClassName="active">Policies</NavLink>}
        {isAdmin && <NavLink to="/users" className="link" activeClassName="active">Users</NavLink>}
      </div>
      <div className="user">
        <span>{user?.username} ({user?.role})</span>
        <button className="btn btn-outline" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
      </div>
    </nav>
  );
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return null;
  if (!isAuthenticated) { navigate('/login'); return null; }
  return <Outlet />;
}
