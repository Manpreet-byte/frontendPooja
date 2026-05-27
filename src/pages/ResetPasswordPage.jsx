import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import usePageTitle from '../utils/usePageTitle';

function useQueryParam(name) {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get(name) || '';
  }, [location.search, name]);
}

export default function ResetPasswordPage() {
  usePageTitle('Reset password · Love & Flour');
  const navigate = useNavigate();
  const token = useQueryParam('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setMessage('Reset token is missing. Please use the link from your email again.');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      await api.auth.resetPassword({ token, password });
      setStatus('done');
      setMessage('Password updated. Please login with your new password.');
      window.setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Unable to reset password. Please request a new link.');
    }
  };

  return (
    <main className="section auth-page">
      <div className="container auth-shell">
        <SectionHeading badge="Account" title="Set a new password" subtitle="Choose a strong password you don’t use elsewhere." />

        <div className="auth-layout">
          <div className="auth-panel" style={{ margin: '0 auto', maxWidth: 540 }}>
            <form className="panel auth-card" onSubmit={onSubmit}>
              <h1 className="auth-card-title">Reset password</h1>
              <p className="muted auth-card-subtitle">Enter and confirm your new password.</p>

              <label className="field password-field">
                <span className="field-label">New password</span>
                <div className="password-input-wrap">
                  <input
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow((v) => !v)}
                  >
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="field password-field">
                <span className="field-label">Confirm password</span>
                <div className="password-input-wrap">
                  <input
                    className="input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </label>

              {message ? (
                <p className={status === 'error' ? 'form-error' : 'muted'} role="status">
                  {message}
                </p>
              ) : null}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="button button-solid" type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Saving…' : 'Update password'}
                </button>
                <Link className="button" to="/login">
                  Back to login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

