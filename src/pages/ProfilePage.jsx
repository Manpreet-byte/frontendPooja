import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { ensurePushSubscribed } from '../utils/push';

export default function ProfilePage() {
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

        <div className="panel auth-card">
          {token ? null : <p className="form-error">You are not logged in.</p>}
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className={message.includes('updated') ? 'muted' : 'form-error'}>{message}</p> : null}
          {user ? (
            <>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: 'rgba(201, 122, 74, 0.12)',
                    border: '1px solid rgba(99, 77, 55, 0.14)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                  }}
                  aria-hidden="true"
                >
                  {(user?.name ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="h3" style={{ margin: 0 }}>{user?.name ?? 'Profile'}</div>
                  <div className="muted" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

              <div className="profile-grid" style={{ marginTop: 18 }}>
                <div>
                  <p className="section-kicker">Name</p>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!canSave} />
                </div>
                <div>
                  <p className="section-kicker">Phone</p>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canSave} placeholder="Optional" />
                </div>
                <div>
                  <p className="section-kicker">Email</p>
                  <p className="muted" style={{ marginTop: 8 }}>{user.email}</p>
                </div>
                <div>
                  <p className="section-kicker">Role</p>
                  <p className="muted" style={{ marginTop: 8 }}>{user.role}</p>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <p className="section-kicker">Notifications</p>
                <p className="muted" style={{ marginTop: 8 }}>
                  Enable push notifications on this device for reminders, order updates, and recordings.
                </p>
                {pushMsg ? <p className="muted" style={{ marginTop: 8 }}>{pushMsg}</p> : null}
                <div className="button-row" style={{ marginTop: 10 }}>
                  <button className="button button-ghost" type="button" onClick={enablePush} disabled={!token || pushStatus === 'loading'}>
                    {pushStatus === 'loading' ? 'Enabling…' : 'Enable notifications'}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
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
