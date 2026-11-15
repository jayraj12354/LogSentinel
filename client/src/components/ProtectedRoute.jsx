import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading, login } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
