import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { ensurePushSubscribed } from '../utils/push';
import usePageTitle from '../utils/usePageTitle';

export default function ProfilePage() {
  usePageTitle('Profile · Love & Flour');
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const error = useAuthStore((s) => s.error);
  const [status, setStatus] = useState('idle'); // idle | saving
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pushStatus, setPushStatus] = useState('idle'); // idle | loading | done
  const [pushMsg, setPushMsg] = useState('');

  useEffect(() => {
    useAuthStore.getState().refreshProfile();
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.id]);

  const canSave = useMemo(() => Boolean(token && status === 'idle'), [token, status]);

  const onSave = async () => {
    if (!token || status !== 'idle') return;
    setStatus('saving');
    setMessage('');
    try {
      await api.profile.update(token, { name, phone });
      await useAuthStore.getState().refreshProfile();
      setMessage('Profile updated.');
    } catch (err) {
      setMessage(err?.message ?? 'Unable to save profile.');
    } finally {
      setStatus('idle');
    }
  };

  const enablePush = async () => {
    if (!token || pushStatus === 'loading') return;
    setPushStatus('loading');
    setPushMsg('');
    try {
      const res = await ensurePushSubscribed({ token });
      if (res?.ok) setPushMsg('Notifications enabled on this device.');
      else if (res?.reason === 'denied') setPushMsg('Notifications permission denied in browser settings.');
      else if (res?.reason === 'missing_public_key') setPushMsg('Push is not configured (missing VAPID public key).');
      else setPushMsg('Unable to enable notifications on this device.');
    } catch (err) {
      setPushMsg(err?.message ?? 'Unable to enable notifications.');
    } finally {
      setPushStatus('done');
      setTimeout(() => setPushStatus('idle'), 1500);
    }
  };

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Account" title="Profile" subtitle="Your account details from the backend." />

        <div className="panel profile-card">
          {token ? null : (
            <p className="form-error" role="alert">
              You are not logged in.
            </p>
          )}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className={message.includes('updated') ? 'muted' : 'form-error'} role="status" aria-live="polite">
              {message}
            </p>
          ) : null}
          {user ? (
            <>
              <div className="profile-header">
                <div className="profile-avatar" aria-hidden="true">
                  {(user?.name ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase()}
                </div>
                <div className="profile-header-main">
                  <div className="h3 profile-name">{user?.name ?? 'Profile'}</div>
                  <div className="muted profile-email">{user.email}</div>
                </div>
                <div className="profile-header-actions">
                  <span className="pill">{String(user.role ?? 'user')}</span>
                  <Link className="button button-ghost" to="/dashboard">
                    Open dashboard
                  </Link>
                  {user.role === 'admin' ? (
                    <Link className="button button-ghost" to="/admin/dashboard">
                      Admin panel
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="profile-grid">
                <label className="field">
                  <span className="field-label">Name</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    disabled={!canSave}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Phone</span>
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={!canSave}
                    placeholder="Optional"
                  />
                </label>
                <div className="profile-meta">
                  <p className="section-kicker">Email</p>
                  <p className="muted profile-meta-value">{user.email}</p>
                </div>
                <div className="profile-meta">
                  <p className="section-kicker">Role</p>
                  <p className="muted profile-meta-value">{user.role}</p>
                </div>
              </div>

              <div className="profile-block">
                <p className="section-kicker">Notifications</p>
                <p className="muted profile-block-copy">
                  Enable push notifications on this device for reminders, order updates, and recordings.
                </p>
                {pushMsg ? <p className="muted profile-block-copy">{pushMsg}</p> : null}
                <div className="button-row">
                  <button className="button button-ghost" type="button" onClick={enablePush} disabled={!token || pushStatus === 'loading'}>
                    {pushStatus === 'loading' ? 'Enabling…' : 'Enable notifications'}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div className="profile-actions">
            <button className="button button-solid" type="button" onClick={onSave} disabled={!canSave}>
              {status === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            <button className="button button-ghost" type="button" onClick={logout} disabled={status === 'saving'}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
