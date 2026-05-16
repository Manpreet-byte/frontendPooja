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

  const isDirty = useMemo(() => {
    if (!user) return false;
    const nextName = String(name ?? '').trim();
    const nextPhone = String(phone ?? '').trim();
    const prevName = String(user?.name ?? '').trim();
    const prevPhone = String(user?.phone ?? '').trim();
    return nextName !== prevName || nextPhone !== prevPhone;
  }, [name, phone, user]);

  const canSave = useMemo(() => Boolean(token && status === 'idle' && isDirty), [token, status, isDirty]);

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
          {token ? null : <p className="form-error">You are not logged in.</p>}
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className={message.includes('updated') ? 'muted profile-flash' : 'form-error profile-flash'}>{message}</p> : null}

          {!user ? (
            <p className="muted profile-loading">{token ? 'Loading profile…' : 'Log in to view your profile.'}</p>
          ) : (
            <>
              <div className="profile-head">
                <div className="profile-avatar" aria-hidden="true">
                  {(user?.name ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase()}
                </div>
                <div className="profile-meta">
                  <div className="profile-name">{user?.name ?? 'Profile'}</div>
                  <div className="profile-email">{user.email}</div>
                </div>
                <div className="profile-actions">
                  <span className="pill">{String(user.role ?? 'user')}</span>
                  <Link className="button button-ghost profile-quick" to="/dashboard">
                    Dashboard
                  </Link>
                  {user.role === 'admin' ? (
                    <Link className="button button-ghost profile-quick" to="/admin/dashboard">
                      Admin panel
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="profile-sections">
                <section className="profile-section" aria-label="Profile details">
                  <div className="profile-section-head">
                    <div>
                      <div className="profile-section-title">Details</div>
                      <p className="muted profile-section-subtitle">Update your name and phone number.</p>
                    </div>
                  </div>

                  <div className="profile-fields">
                    <label className="field">
                      <span className="field-label">Name</span>
                      <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!canSave} />
                    </label>
                    <label className="field">
                      <span className="field-label">Phone (optional)</span>
                      <input
                        className="input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!canSave}
                        placeholder="Optional"
                        inputMode="tel"
                      />
                    </label>
                    <div className="profile-kv">
                      <div className="field-label">Email</div>
                      <div className="profile-kv-value">{user.email}</div>
                    </div>
                    <div className="profile-kv">
                      <div className="field-label">Role</div>
                      <div className="profile-kv-value">{user.role}</div>
                    </div>
                  </div>

                  <div className="profile-buttons">
                    <button className="button button-solid" type="button" onClick={onSave} disabled={!canSave}>
                      {status === 'saving' ? 'Saving…' : 'Save changes'}
                    </button>
                    <button className="button button-ghost" type="button" onClick={logout} disabled={status === 'saving'}>
                      Logout
                    </button>
                    {!isDirty ? <span className="muted profile-hint">No changes to save.</span> : null}
                  </div>
                </section>

                <section className="profile-section" aria-label="Notifications settings">
                  <div className="profile-section-head">
                    <div>
                      <div className="profile-section-title">Notifications</div>
                      <p className="muted profile-section-subtitle">
                        Enable push notifications on this device for reminders, order updates, and recordings.
                      </p>
                    </div>
                  </div>

                  {pushMsg ? <p className="muted profile-note">{pushMsg}</p> : null}
                  <div className="profile-buttons">
                    <button className="button button-ghost" type="button" onClick={enablePush} disabled={!token || pushStatus === 'loading'}>
                      {pushStatus === 'loading' ? 'Enabling…' : 'Enable notifications'}
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
