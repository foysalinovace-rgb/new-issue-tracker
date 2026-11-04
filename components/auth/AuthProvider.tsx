import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService, type WorkspaceUser } from '../../services/authService';
import { LoginPage } from './LoginPage';

type AuthState = { user: WorkspaceUser | null; loading: boolean; error: string; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export const useAuth = () => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is required');
  return auth;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const version = ++generation.current;
      try {
        const profile = await authService.getSession();
        if (mounted && version === generation.current) { authService.setCurrentUser(profile); setUser(profile); setError(''); }
      } catch (err) {
        if (mounted && version === generation.current) setError(err instanceof Error ? err.message : 'Could not reach the login server.');
      } finally { if (mounted && version === generation.current) setLoading(false); }
    };
    void sync();
    const refresh = () => { if (mounted) void sync(); };
    const storage = (event: StorageEvent) => { if (event.key === 'workspace-auth-event') refresh(); };
    window.addEventListener('workspace-auth-changed', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', storage);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, 30000);
    return () => { mounted = false; generation.current++; window.removeEventListener('workspace-auth-changed', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('storage', storage); clearInterval(timer); };
  }, []);
  const signIn = async (email: string, password: string) => {
    const profile = await authService.signIn(email, password);
    generation.current++;
    setUser(profile); setError(''); setLoading(false);
  };
  const signOut = async () => { await authService.signOut(); generation.current++; setUser(null); setError(''); setLoading(false); };
  return <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (/^\/(feedback|client-feedback)\//.test(location.pathname)) return <>{children}</>;
  if (loading) return <div className="auth-loading" role="status">Checking your session…</div>;
  if (location.pathname === '/login') {
    const from = location.state?.from;
    const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !/^\/(login|admin\/login)(\/|$)/.test(from) ? from : '/dashboard';
    return user ? <Navigate to={destination} replace /> : <LoginPage />;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
}

export function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'super_admin' ? <>{children}</> : <section className="panel p-8"><h1 className="text-xl font-bold">Admin access required</h1><p className="mt-2 text-slate-500">Sign in with the configured admin account to manage system settings.</p></section>;
}
