import { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';
import { refreshAll } from './hooks/useApi';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Sources from './pages/Sources';
import Rules from './pages/Rules';
import Policies from './pages/Policies';
import Users from './pages/Users';

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Desktop app hooks: menu shortcuts and live alerts from the Electron main process.
  useEffect(() => {
    if (!window.api) return undefined;
    const offs = [
      window.api.onNavigate(({ route }) => navigate(route)),
      window.api.onRefresh(refreshAll),
      window.api.onAlert(refreshAll),
    ];
    return () => offs.forEach((off) => off());
  }, [navigate]);

  return (
    <div className={isAuthenticated ? 'shell' : 'shell shell-bare'}>
      {isAuthenticated && <Navbar />}
      <main className="main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="logs" element={<Logs />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="sources" element={<AdminOnly><Sources /></AdminOnly>} />
            <Route path="rules" element={<AdminOnly><Rules /></AdminOnly>} />
            <Route path="policies" element={<AdminOnly><Policies /></AdminOnly>} />
            <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
