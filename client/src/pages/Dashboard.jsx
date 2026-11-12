import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>Welcome, <strong>{user?.username}</strong> ({user?.role}).</p>
      {isAdmin ? <p>You have admin access to sources, rules, policies, and users.</p> : <p>You have read-only access to logs, analytics, and alerts.</p>}
    </div>
  );
}
