import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function NotificationsBell({ token, enabled = true }) {
  if (!enabled) return null;
  const notificationType = 'admin_new_user';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hasUnread = unread > 0;

  const compactList = useMemo(() => (Array.isArray(notifications) ? notifications.slice(0, 8) : []), [notifications]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.user.notifications.list(token, { limit: 50, notification_type: notificationType });
      setNotifications(data?.notifications ?? []);
      setUnread(Number(data?.unread_count ?? 0));
    } catch (err) {
      setError(err?.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    // Keep unread badge fresh (admin realtime polling).
    const tick = () =>
      api.user.notifications
        .list(token, { limit: 1, notification_type: notificationType })
        .then((data) => {
          if (!active) return;
          setUnread(Number(data?.unread_count ?? 0));
        })
        .catch(() => {});

    tick();
    const id = window.setInterval(tick, 10_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [token, location.pathname]);

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointerDown(e) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await api.user.notifications.readAll(token, { notification_type: notificationType });
      setUnread(0);
      setNotifications((list) => (Array.isArray(list) ? list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) : list));
    } catch (err) {
      setError(err?.message ?? 'Failed to mark all as read');
    }
  };

  const openNotification = async (n) => {
    if (!token) return;
    const id = n?.id;
    if (id) {
      api.user.notifications
        .read(token, id)
        .then((data) => setUnread(Number(data?.unread_count ?? unread)))
        .catch(() => {});
    }
    const href = n?.link_url ? String(n.link_url) : '';
    setOpen(false);
    if (href.startsWith('/')) navigate(href);
    else if (href) window.open(href, '_blank', 'noreferrer');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        className="icon-button"
        type="button"
        aria-label={hasUnread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path
            d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Z"
            fill="currentColor"
          />
          <path
            d="M18 10a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {hasUnread ? <span className="cart-badge">{Math.min(99, unread)}</span> : null}
      </button>

      {open ? (
        <div className="panel" style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 340, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div className="h4" style={{ margin: 0 }}>Notifications</div>
            <button className="button button-ghost" type="button" onClick={markAllRead} disabled={!notifications.length || loading}>
              Mark all read
            </button>
          </div>

          {error ? <p className="form-error" style={{ marginTop: 10 }}>{error}</p> : null}
          {loading ? <p className="muted" style={{ marginTop: 10 }}>Loading…</p> : null}

          {!loading && !compactList.length ? <p className="muted" style={{ marginTop: 10 }}>No notifications yet.</p> : null}

          {compactList.length ? (
            <ul className="list" style={{ marginTop: 10 }}>
              {compactList.map((n) => {
                const isUnread = !n?.read_at;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="button button-ghost"
                      style={{ textAlign: 'left', width: '100%' }}
                      onClick={() => openNotification(n)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: isUnread ? 700 : 600 }}>{n.title ?? 'Update'}</div>
                          <div className="muted" style={{ marginTop: 4, whiteSpace: 'normal' }}>{n.message ?? ''}</div>
                        </div>
                        {isUnread ? <span className="pill" style={{ alignSelf: 'flex-start' }}>New</span> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div style={{ marginTop: 10 }}>
            <Link className="link" to="/dashboard" onClick={() => setOpen(false)}>
              Go to dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
