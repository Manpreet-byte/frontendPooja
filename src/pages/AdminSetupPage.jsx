import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [secret, setSecret] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const disabled = useMemo(() => status === 'loading', [status]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const data = await api.admin.bootstrap({ secret, name, email, password });
      setSession({ token: data.token, user: data.user });
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Failed to create admin');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <main className="section">
      <div className="container auth-shell">
        <SectionHeading
          badge="Admin"
          title="Admin setup"
          subtitle="One-time setup to create the first admin account (requires server bootstrap secret)."
        />

        <form className="panel auth-card" onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Bootstrap secret</span>
            <input className="input" value={secret} onChange={(e) => setSecret(e.target.value)} required />
          </label>

          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              minLength={8}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="button button-solid" type="submit" disabled={disabled}>
            {disabled ? 'Creating…' : 'Create admin'}
          </button>
        </form>
      </div>
    </main>
  );
}

