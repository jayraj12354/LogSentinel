import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ username, password });
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message === 'bad credentials' ? 'That username and password don’t match an account.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-trace" aria-hidden="true">
        <svg viewBox="0 0 600 120" preserveAspectRatio="none">
          <path d="M0 70 L120 70 L140 66 L160 74 L200 70 L260 70 L275 30 L290 104 L305 50 L318 82 L330 70 L600 70" />
        </svg>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>LogSentinel</h1>
        <p className="lede">Sign in to watch your logs and respond to alerts.</p>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <label htmlFor="u">Username</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        <label htmlFor="p">Password</label>
        <input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <button className="btn btn-primary btn-wide" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {import.meta.env.DEV && <p className="hint">Demo accounts: admin / admin123 or viewer / viewer123</p>}
      </form>
    </div>
  );
}
