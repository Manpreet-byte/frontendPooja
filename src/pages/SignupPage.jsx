import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import usePageTitle from '../utils/usePageTitle';

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle('Sign up · Love & Flour');
  const signup = useAuthStore((s) => s.signup);
  const setSession = useAuthStore((s) => s.setSession);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [heroIndex, setHeroIndex] = useState(0);

  const disabled = useMemo(() => status === 'loading', [status]);

  const heroImages = useMemo(
    () => [
      '/seed-media/803645d1e47482b4290bf28a0d2804ed00088ecc.jpg',
      '/seed-media/42849221d1bbdd7b1f8f4a1a4dd72ec14c4d431d.jpg',
      '/seed-media/90fe0f7b913d409627162b8ac6619ec5ac5722c3.jpg',
    ],
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenRaw = params.get('token');
    const oauth = params.get('oauth');
    if (!tokenRaw || oauth !== 'google') return;
    const token = String(tokenRaw).trim().replace(/\s+/g, '+');
    setSession({ token, user: null });
    navigate('/', { replace: true });
  }, [location.search, navigate, setSession]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const maybeName = params.get('name');
    const maybeEmail = params.get('email');
    if (maybeName && !name) setName(maybeName);
    if (maybeEmail && !email) setEmail(maybeEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await signup({ name, email, password });
    const from = location.state?.from;
    const nextPath =
      typeof from?.pathname === 'string' && from.pathname && from.pathname !== '/signup'
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/';
    navigate(nextPath, { replace: true });
  };

  useEffect(() => {
    if (heroImages.length < 2) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined;
    const timer = window.setInterval(() => setHeroIndex((v) => (v + 1) % heroImages.length), 3200);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  return (
    <main className="section auth-page">
      <div className="container auth-shell">
        <SectionHeading badge="Account" title="Sign up" subtitle="Create your account to enroll and save workshops." />

        <div className="auth-layout">
          <aside className="auth-visual" aria-hidden="true">
            {heroImages.map((src, index) => (
              <img
                key={src}
                className={`auth-visual-image${index === heroIndex ? ' is-active' : ''}`}
                src={src}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchpriority={index === 0 ? 'high' : 'auto'}
              />
            ))}
            <div className="auth-visual-content">
              <div className="auth-visual-kicker">Love & Flour</div>
              <h2 className="auth-visual-title">Create your account</h2>
              <p className="auth-visual-subtitle">Enroll in workshops, save recipes, and track your orders in one place.</p>
            </div>
          </aside>

          <div className="auth-panel">
            <div className="auth-panel-head">
              <div className="auth-tabs" role="tablist" aria-label="Account pages">
                <Link className="auth-tab" to="/login" role="tab" aria-selected="false">
                  Sign in
                </Link>
                <Link className="auth-tab is-active" to="/signup" role="tab" aria-selected="true">
                  Sign up
                </Link>
              </div>
            </div>

            <form className="panel auth-card" onSubmit={onSubmit}>
              <h1 className="auth-card-title">Sign up</h1>
              <p className="muted auth-card-subtitle">A fresh start for your baking goals.</p>

          <button
            className="button button-google"
            type="button"
            onClick={() => {
              window.location.assign(api.auth.googleStartUrl({ mode: 'signup' }));
            }}
            disabled={disabled}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 7.3 14.7 6 12 6 7.6 6 4 9.6 4 14s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.7 0-.5-.1-.9-.1-1.3H12Z"
              />
              <path fill="#34A853" d="M6.6 14.4l-3.2 2.4C4.9 19.6 8.2 22 12 22c2.7 0 4.9-.9 6.5-2.5l-3.1-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1Z" />
              <path fill="#4A90E2" d="M20.6 12.9c.1-.4.1-.9.1-1.3 0-.5-.1-.9-.1-1.3H12v2.6h4.9c-.2 1-1 2.4-2.5 3.1l3.1 2.4c1.8-1.6 3.1-4 3.1-7.1Z" />
              <path fill="#FBBC05" d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.2 7.7C2.4 9.3 2 11.1 2 12s.4 2.7 1.2 4.3l3.2-2.4Z" />
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <label className="field">
            <span className="field-label">Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
              required
            />
          </label>

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
              autoComplete="new-password"
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
            {disabled ? 'Creating…' : 'Create account'}
          </button>

              <p className="muted auth-alt auth-note">
                Already have an account? <Link className="link" to="/login">Login</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
