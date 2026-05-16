import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const setSession = useAuthStore((s) => s.setSession);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const disabled = useMemo(() => status === 'loading', [status]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const oauth = params.get('oauth');
    if (!token || oauth !== 'google') return;
    setSession({ token, user: null });
    navigate('/', { replace: true });
  }, [location.search, navigate, setSession]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
    const from = location.state?.from;
    const nextPath =
      typeof from?.pathname === 'string' && from.pathname && from.pathname !== '/login'
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/';
    navigate(nextPath, { replace: true });
  };

  return (
    <main className="section">
      <div className="container auth-shell">
        <SectionHeading badge="Account" title="Login" subtitle="Welcome back. Continue your baking journey." />

        <form className="panel auth-card" onSubmit={onSubmit}>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => {
              window.location.assign(api.auth.googleStartUrl({ mode: 'login' }));
            }}
            disabled={disabled}
          >
            Continue with Google
          </button>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="button button-solid" type="submit" disabled={disabled}>
            {disabled ? 'Logging in…' : 'Login'}
          </button>

          <p className="muted auth-alt">
            New here? <Link className="link" to="/signup">Create an account</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
