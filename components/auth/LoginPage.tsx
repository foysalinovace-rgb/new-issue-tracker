import React, { useLayoutEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthProvider';
import './auth.css';

export function LoginPage() {
  const { signIn, error: sessionError } = useAuth();
  const [email, setEmail] = useState('support@inovacetech.com');
  const [password, setPassword] = useState('Admin@123');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useLayoutEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await signIn(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <main className="login-page"><section className="login-card">
    <h1>Welcome back.</h1><p>Sign in to your workspace to continue.</p>
    <form onSubmit={submit}>
      {(error || sessionError) && <div className="auth-error" role="alert">{error || sessionError}</div>}
      <label htmlFor="login-email">Email address</label><div className="login-field"><Mail size={17} /><input id="login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" disabled={busy} /></div>
      <label htmlFor="login-password">Password</label><div className="login-field"><LockKeyhole size={17} /><input id="login-password" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" disabled={busy} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
      <button className="login-submit" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={17} /></button>
    </form>
  </section><footer>Inovace Technologies Ltd.</footer></main>;
}
