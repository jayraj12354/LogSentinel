import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ls_token');
    if (token) {
      api
        .get('/auth/me')
        .then(({ data }) => { setUser(data); window.api?.setAuthToken(token); })
        .catch(() => {
          localStorage.removeItem('ls_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (creds) => {
    const { data: { token, user } } = await api.post('/auth/login', creds);
    localStorage.setItem('ls_token', token);
    window.api?.setAuthToken(token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('ls_token');
    window.api?.setAuthToken(null);
    setUser(null);
  };

  useEffect(() => {
    window.addEventListener('ls:unauthorized', logout);
    return () => window.removeEventListener('ls:unauthorized', logout);
  }, []);

  const value = { user, loading, login, logout, isAuthenticated: !!user, isAdmin: user?.role === 'ADMIN' };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth used outside AuthProvider');
  return ctx;
};
