import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function NotificationsBell({ token, enabled = true }) {
  if (!enabled) return null;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hasUnread = unread > 0;

  const compactList = useMemo(() => (Array.isArray(notifications) ? notifications.slice(0, 8) : []), [notifications]);
  const panelId = useMemo(() => `lf-notifications-${Math.random().toString(36).slice(2, 10)}`, []);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.user.notifications.list(token, { limit: 50 });
      setNotifications(data?.notifications ?? []);
      setUnread(Number(data?.unread_count ?? 0));
    } catch (err) {
      if (err?.status === 403) setError('Forbidden.');
      else if (err?.status === 401) setError('Session expired. Please log in again.');
      else
      setError(err?.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    // Keep unread badge fresh (near realtime polling for admin).
    const tick = () =>
      api.user.notifications
        .list(token, { limit: 1 })
        .then((data) => {
          if (!active) return;
          setUnread(Number(data?.unread_count ?? 0));
        })
        .catch(() => {});

    tick();
    const id = window.setInterval(tick, 3_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [token, location.pathname]);

  useEffect(() => {
    if (!open) return;
    load();
    panelRef.current?.focus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus?.();
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

  useEffect(() => {
    if (!open) return undefined;
    // Avoid the dropdown getting cut off behind body scrollbars on mobile.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!token) return undefined;
    let active = true;
    const tick = () => {
      if (!active) return;
      load().catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 3_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await api.user.notifications.readAll(token);
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
    <div ref={wrapRef} className="notifications">
      <button
        ref={buttonRef}
        className="icon-button notifications-trigger"
        type="button"
        aria-label={hasUnread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        aria-controls={panelId}
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
        <div
          id={panelId}
          ref={panelRef}
          className="panel notifications-panel"
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
        >
          <div className="notifications-head">
            <div className="notifications-title">
              <div className="h4">Notifications</div>
              {hasUnread ? <div className="muted notifications-subtitle">{unread} unread</div> : null}
            </div>
            <div className="notifications-actions">
              <button className="button button-ghost" type="button" onClick={markAllRead} disabled={!notifications.length || loading}>
                Mark all read
              </button>
              <button
                className="icon-button notifications-close"
                type="button"
                aria-label="Close notifications"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus?.();
                }}
              >
                ×
              </button>
            </div>
          </div>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? <p className="muted">Loading…</p> : null}

          {!loading && !compactList.length ? <p className="muted">No notifications yet.</p> : null}

          {compactList.length ? (
            <ul className="notifications-list" aria-label="Recent notifications">
              {compactList.map((n) => {
                const isUnread = !n?.read_at;
                return (
                  <li key={n.id}>
                    <button type="button" className="notifications-item" onClick={() => openNotification(n)}>
                      <div className="notifications-item-head">
                        <div className="notifications-item-title" data-unread={isUnread ? 'true' : 'false'}>
                          {n.title ?? 'Update'}
                        </div>
                        {isUnread ? <span className="pill notifications-new">New</span> : null}
                      </div>
                      {n.message ? <div className="muted notifications-item-body">{n.message}</div> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="notifications-foot">
            <Link className="link" to="/dashboard" onClick={() => setOpen(false)}>
              Go to dashboard
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
