import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Owner } from '../api/types';

interface AuthState {
  owner: Owner | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** جلسة المالك: التوكن في localStorage، والتحقق منه عند الإقلاع عبر `/auth/me`؛ أي 401 يُخرج فوراً. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.set(null);
    setOwner(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (!cancelled) setOwner(me);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password);
    tokenStore.set(result.token);
    setOwner(result.owner);
  }, []);

  const value = useMemo(() => ({ owner, loading, login, logout }), [owner, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
