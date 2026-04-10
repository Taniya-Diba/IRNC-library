import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('library_admin_token');
    if (!token) { setLoading(false); return; }
    authApi.verify()
      .then(() => setAdmin({ token }))
      .catch(() => localStorage.removeItem('library_admin_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('library_admin_token', data.token);
    setAdmin({ token: data.token, email: data.email });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('library_admin_token');
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
