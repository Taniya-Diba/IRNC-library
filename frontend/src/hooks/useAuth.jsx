import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auth as authApi } from '../lib/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY   = 'irnc_access_token';
const REFRESH_KEY = 'irnc_refresh_token';
const USER_KEY    = 'irnc_user';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshing            = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    authApi.verify()
      .then(data => { setUser(data.user); })
      .catch(async (err) => {
        if (err.code === 'TOKEN_EXPIRED' || err.message?.includes('expired')) {
          const refreshed = await attemptRefresh();
          if (!refreshed) clearAuth();
        } else {
          clearAuth();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // When api.js exhausts its refresh retry, it fires this event
  useEffect(() => {
    function handleExpired() { clearAuth(); }
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  function storeAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
    if (data.user)          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }

  async function attemptRefresh() {
    if (refreshing.current) return false;
    refreshing.current = true;
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return false;
      const data = await authApi.refresh(refreshToken);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshing.current = false;
    }
  }

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    storeAuth(data);
    return data.user;
  }, []);

  const register = useCallback(async (body) => {
    const data = await authApi.register(body);
    if (data.access_token) storeAuth(data);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
  }, []);

  const isAdmin  = useCallback(() => user?.role === 'admin',  [user]);
  const isMember = useCallback(() => user?.role === 'member', [user]);

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout,
      isAdmin, isMember,
      attemptRefresh, clearAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
