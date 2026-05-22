import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import usePageTitle from '../utils/usePageTitle';

export default function RetrievePasswordPage() {
  usePageTitle('Retrieve password · Love & Flour');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      await api.auth.forgotPassword({ email });
      setStatus('done');
      setMessage('If that email exists in our system, a reset link has been sent.');
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || 'Something went wrong.');
    }
  };

  return (
    <main className="section auth-page">
      <div className="container auth-shell">
        <SectionHeading badge="Account" title="Reset password" subtitle="We’ll send a one-time reset link to your email." />

        <div className="auth-layout">
          <div className="auth-panel" style={{ margin: '0 auto', maxWidth: 540 }}>
            <form className="panel auth-card" onSubmit={onSubmit}>
              <h1 className="auth-card-title">Reset password</h1>
              <p className="muted auth-card-subtitle">Enter the email address for your account.</p>

              <label className="field">
                <span className="field-label">Email</span>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>

              {message ? (
                <p className={status === 'error' ? 'form-error' : 'muted'} role="status">
                  {message}
                </p>
              ) : null}

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="button button-solid" type="submit" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending…' : 'Send reset link'}
                </button>
                <button type="button" className="button" onClick={() => navigate('/login')}>
                  Back to login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
