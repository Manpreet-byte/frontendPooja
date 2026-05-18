import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { cacheLessonForOffline, flushOfflineProgressQueue } from '../utils/offlineLearning';
import usePageTitle from '../utils/usePageTitle';
import SelectMenu from '../components/SelectMenu';

function initialsFromName(name) {
  const safe = String(name ?? '').trim();
  if (!safe) return 'U';
  const parts = safe.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  usePageTitle('Dashboard · Love & Flour');
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [tab, setTab] = useState('overview'); // overview | orders | profile | support | certificates
  const [recordings, setRecordings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activity, setActivity] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('active'); // active | completed | expired | all
  const [courseQuery, setCourseQuery] = useState('');
  const [offlineStatus, setOfflineStatus] = useState(''); // user-facing message
  const [reco, setReco] = useState(null);
  const lastLoadKey = useRef(0);

  const [ordersStatus, setOrdersStatus] = useState('idle'); // idle | loading | error
  const [ordersError, setOrdersError] = useState('');
  const [orders, setOrders] = useState([]);

  const [profileStatus, setProfileStatus] = useState('idle'); // idle | saving
  const [profileMsg, setProfileMsg] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  const [supportStatus, setSupportStatus] = useState('idle'); // idle | loading | error | creating
  const [supportError, setSupportError] = useState('');
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportForm, setSupportForm] = useState({ category: 'general', subject: '', message_text: '' });

  const [certStatus, setCertStatus] = useState('idle'); // idle | loading | error
  const [certError, setCertError] = useState('');
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) return;
    let active = true;
    const key = (lastLoadKey.current += 1);
    setStatus('loading');
    setError('');

    Promise.allSettled([
      api.user.dashboard(token),
      api.feed.enrollments(token),
      api.user.courses.list(token, { include_expired: true, include_inactive: true }),
    ])
      .then((results) => {
        if (!active) return;
        if (key !== lastLoadKey.current) return;

        const [dashR, enrR, coursesR] = results;
        if (dashR.status === 'fulfilled') setDashboard(dashR.value?.dashboard ?? dashR.value ?? null);
        if (enrR.status === 'fulfilled') setEnrollments(enrR.value?.enrollments ?? []);
        if (coursesR.status === 'fulfilled') setCourses(coursesR.value?.courses ?? []);

        const errors = results
          .filter((r) => r.status === 'rejected')
          .map((r) => r.reason?.message ?? 'Failed to load some dashboard data');
        if (errors.length) setError(errors[0]);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load dashboard');
      })
      .finally(() => {
        if (!active) return;
        setStatus('idle');
      });

    // Defer non-critical calls to reduce perceived lag on mobile.
    setTimeout(() => {
      if (!active) return;
      api.user.recordings.list(token).then((data) => {
        if (!active) return;
        setRecordings(data?.recordings ?? []);
      }).catch(() => null);
      api.user.activity(token).then((data) => {
        if (!active) return;
        setActivity(data ?? null);
      }).catch(() => null);
      api.recommendations.mine(token).then((data) => {
        if (!active) return;
        setReco(data ?? null);
      }).catch(() => null);
    }, 250);

    refreshProfile().catch(() => null);
    return () => {
      active = false;
    };
  }, [hydrated, token, refreshProfile]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user?.name ?? '');
    setProfilePhone(user?.phone ?? '');
  }, [user?.id]);

  const loadOrders = async () => {
    if (!token) return;
    setOrdersStatus('loading');
    setOrdersError('');
    try {
      const data = await api.orders.listMine(token);
      setOrders(data?.orders ?? []);
      setOrdersStatus('idle');
    } catch (err) {
      setOrders([]);
      setOrdersError(err?.message ?? 'Failed to load orders.');
      setOrdersStatus('error');
    }
  };

  const loadSupport = async () => {
    if (!token) return;
    setSupportStatus('loading');
    setSupportError('');
    try {
      const data = await api.support.tickets.listMine(token, { limit: 50 });
      setSupportTickets(data?.tickets ?? []);
      setSupportStatus('idle');
    } catch (err) {
      setSupportTickets([]);
      setSupportError(err?.message ?? 'Failed to load support tickets.');
      setSupportStatus('error');
    }
  };

  const loadCertificates = async () => {
    if (!token) return;
    setCertStatus('loading');
    setCertError('');
    try {
      const data = await api.user.certificates.list(token);
      setCertificates(data?.certificates ?? []);
      setCertStatus('idle');
    } catch (err) {
      setCertificates([]);
      setCertError(err?.message ?? 'Failed to load certificates.');
      setCertStatus('error');
    }
  };

  useEffect(() => {
    if (!token) return;
    if (tab === 'orders' && ordersStatus === 'idle' && !orders.length) loadOrders();
    if (tab === 'support' && supportStatus === 'idle' && !supportTickets.length) loadSupport();
    if (tab === 'certificates' && certStatus === 'idle' && !certificates.length) loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  const now = useMemo(() => new Date(), []);
  const activeEnrollments = useMemo(() => {
    const list = Array.isArray(enrollments) ? enrollments : [];
    return list.filter((e) => {
      const expiry = e?.expiry_date ? new Date(e.expiry_date) : null;
      if (!expiry || Number.isNaN(expiry.getTime())) return true;
      return expiry.getTime() >= now.getTime();
    });
  }, [enrollments, now]);

  const availableRecordings = useMemo(() => {
    const list = Array.isArray(recordings) ? recordings : [];
    return list.filter((r) => !r?.is_expired);
  }, [recordings]);

  const normalizedCourses = useMemo(() => {
    const list = Array.isArray(courses) ? courses.slice() : [];
    return list.map((c) => {
      const expiry = c?.expiry_date ? new Date(c.expiry_date) : null;
      const expired = expiry && !Number.isNaN(expiry.getTime()) ? expiry.getTime() < now.getTime() : false;
      const completed = Boolean(c?.progress?.is_completed || c?.progress?.isCompleted);
      const status = expired ? 'expired' : completed ? 'completed' : 'active';
      return { ...c, _status: status };
    });
  }, [courses, now]);

  const filteredCourses = useMemo(() => {
    const q = String(courseQuery ?? '').trim().toLowerCase();
    return normalizedCourses
      .filter((c) => (courseFilter === 'all' ? true : c._status === courseFilter))
      .filter((c) => (!q ? true : String(c?.title ?? '').toLowerCase().includes(q)));
  }, [normalizedCourses, courseFilter, courseQuery]);

  const kpis = dashboard?.kpis ?? null;
  const continueLearning = dashboard?.continue_learning ?? null;
  const recommended = reco?.recommended ?? [];
  const trending = reco?.trending ?? [];
  const isLoading = status === 'loading';

  const headerSubtitle = useMemo(() => {
    if (!user?.name) return 'Welcome back.';
    const first = String(user.name).trim().split(/\s+/)[0];
    return `Welcome back, ${first}.`;
  }, [user?.name]);

  const dashboardTabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'orders', label: 'Orders' },
      { id: 'profile', label: 'Profile' },
      { id: 'support', label: 'Support' },
      { id: 'certificates', label: 'Certificates' },
    ],
    [],
  );

  return (
    <main className="section dashboard-page">
      <div className="container admin-dashboard">
        {!token ? <p className="form-error">Please login to view your dashboard.</p> : null}
        {error ? (
          <div className="panel dashboard-banner" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 900 }}>Some sections couldn’t load.</div>
                <div className="muted" style={{ marginTop: 4 }}>{error}</div>
              </div>
              <button className="button button-solid" type="button" onClick={() => window.location.reload()} disabled={isLoading}>
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <div className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-brand">
              <div className="admin-avatar" aria-hidden="true">
                {initialsFromName(user?.name)}
              </div>
              <div>
                <div className="admin-name">{user?.name ?? 'Your account'}</div>
                <div className="muted admin-email">{user?.email ?? ''}</div>
              </div>
            </div>

            <div className="admin-sidebar-body">
              <p className="section-kicker">Dashboard</p>
              <div className="admin-nav" aria-label="Dashboard navigation">
                {dashboardTabs.map((t) => (
                  <button
                    key={t.id}
                    className={`admin-nav-link${tab === t.id ? ' is-active' : ''}`}
                    type="button"
                    onClick={() => setTab(t.id)}
                    disabled={!token}
                  >
                    {t.label}
                  </button>
                ))}
                <div className="mobile-nav-divider" aria-hidden="true" />
                <Link className="admin-nav-link" to="/courses">
                  Browse workshops
                </Link>
                <Link className="admin-nav-link" to="/recipe-library">
                  Recipe library
                </Link>
              </div>
            </div>
          </aside>

          <section className="admin-main">
            <div className="panel admin-topbar">
              <div className="admin-topbar-left">
                <div>
                  <div className="h3" style={{ margin: 0 }}>
                    {tab === 'overview'
                      ? 'Your dashboard'
                      : dashboardTabs.find((t) => t.id === tab)?.label ?? 'Dashboard'}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>{headerSubtitle}</div>
                </div>
              </div>
              <div className="admin-topbar-right">
                <button className="button button-ghost" type="button" onClick={() => window.location.reload()} disabled={isLoading}>
                  {isLoading ? 'Loading…' : 'Refresh'}
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={!token || isLoading}
                  onClick={async () => {
                    if (!token || !userId) return;
                    setOfflineStatus('');
                    try {
                      const data = await api.user.offlineSync(token);
                      const lessons = data?.lessons ?? [];
                      await Promise.all(
                        lessons.map((l) =>
                          cacheLessonForOffline({
                            userId,
                            courseId: l.course_id,
                            lesson: { ...l, id: l.id, course_id: l.course_id, lesson_type: l.lesson_type },
                          }),
                        ),
                      );
                      setOfflineStatus(`Saved ${lessons.length} lessons for offline.`);
                    } catch (err) {
                      setOfflineStatus(err?.message ?? 'Offline sync failed.');
                    }
                    flushOfflineProgressQueue({ token, userId }).catch(() => null);
                  }}
                >
                  Sync offline
                </button>
                <div className="admin-user-pill">
                  <div className="admin-pill-avatar" aria-hidden="true">
                    {initialsFromName(user?.name)}
                  </div>
                  <div className="admin-pill-meta">
                    <div className="admin-pill-email">{user?.email ?? ''}</div>
                    <div className="muted admin-pill-role">{user?.role ?? ''}</div>
                  </div>
                </div>
              </div>
            </div>
            {offlineStatus ? (
              <div className="panel" style={{ marginTop: 12 }}>
                <p className="muted" style={{ margin: 0 }}>{offlineStatus}</p>
              </div>
            ) : null}

            {tab === 'overview' ? (
            <div className="panel admin-shell" style={{ marginTop: 16 }}>
              <div className="admin-metrics-grid">
                <div className={`admin-metric-card${isLoading ? ' dashboard-skeleton' : ''}`} aria-busy={isLoading}>
                  <div className="muted">Active enrollments</div>
                  <div className="admin-metric-value">{kpis ? Number(kpis.active_enrollments ?? 0) : activeEnrollments.length}</div>
                  <div className="muted">Workshops available to learn</div>
                </div>
                <div className={`admin-metric-card${isLoading ? ' dashboard-skeleton' : ''}`} aria-busy={isLoading}>
                  <div className="muted">Recordings</div>
                  <div className="admin-metric-value">{kpis ? Number(kpis.available_recordings ?? 0) : availableRecordings.length}</div>
                  <div className="muted">Available replays</div>
                </div>
                <div className={`admin-metric-card${isLoading ? ' dashboard-skeleton' : ''}`} aria-busy={isLoading}>
                  <div className="muted">Certificates earned</div>
                  <div className="admin-metric-value">{kpis ? Number(kpis.certificates_earned ?? 0) : '—'}</div>
                  <div className="muted">Your achievements</div>
                </div>
                <div className={`admin-metric-card${isLoading ? ' dashboard-skeleton' : ''}`} aria-busy={isLoading}>
                  <div className="muted">Completed courses</div>
                  <div className="admin-metric-value">{kpis ? Number(kpis.completed_courses ?? 0) : '—'}</div>
                  <div className="muted">Milestones reached</div>
                </div>
              </div>

              <div className="grid" style={{ gap: 16, marginTop: 16 }}>
                <div className="panel">
                  <h3 className="h3">Continue learning</h3>
                  {continueLearning ? (
                    <div className="dashboard-continue">
                      <div className="dashboard-continue-media" aria-hidden="true">
                        {continueLearning.featured_image_url ? (
                          <img src={continueLearning.featured_image_url} alt="" />
                        ) : (
                          <div className="dashboard-continue-fallback">{initialsFromName(continueLearning.course_title)}</div>
                        )}
                      </div>
                      <div className="dashboard-continue-body">
                        <p className="h4" style={{ margin: 0 }}>{continueLearning.course_title}</p>
                        <p className="muted" style={{ marginTop: 6 }}>
                          Next up: {continueLearning.lesson_title}{' '}
                          {continueLearning.progress_percentage ? `· ${continueLearning.progress_percentage}%` : ''}
                        </p>
                        <div className="dashboard-progress" aria-label="Course progress">
                          <div className="dashboard-progress-bar" style={{ width: `${Math.min(100, Math.max(0, Number(continueLearning.progress_percentage ?? 0)))}%` }} />
                        </div>
                        <div className="dashboard-actions">
                          <Link className="button button-solid" to={`/course/${encodeURIComponent(continueLearning.course_slug)}/learn?lesson=${encodeURIComponent(continueLearning.lesson_id)}`}>
                            Resume
                          </Link>
                          <Link className="button button-ghost" to={`/courses/${encodeURIComponent(continueLearning.course_slug)}`}>
                            View course
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="dashboard-empty">
                      <p className="muted" style={{ margin: 0 }}>Pick up where you left off once you start a lesson.</p>
                      <div className="dashboard-actions" style={{ marginTop: 10 }}>
                        <Link className="button button-solid" to="/courses">
                          Browse workshops
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="panel">
                  <h3 className="h3">My courses</h3>
                  <div className="admin-split" style={{ marginTop: 10 }}>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">Filter</span>
                      <SelectMenu
                        ariaLabel="Course filter"
                        value={courseFilter}
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'expired', label: 'Expired' },
                          { value: 'all', label: 'All' },
                        ]}
                        onChange={(val) => setCourseFilter(String(val))}
                      />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span className="field-label">Search</span>
                      <input className="input" value={courseQuery} onChange={(e) => setCourseQuery(e.target.value)} placeholder="Search your courses" />
                    </label>
                  </div>
                  {filteredCourses.length ? (
                    <ul className="list dashboard-course-list" style={{ marginTop: 12 }}>
                      {filteredCourses.slice(0, 8).map((c) => {
                        const pct = c?.progress?.progress_percentage ?? 0;
                        const isCompleted = Boolean(c?.progress?.is_completed);
                        return (
                          <li key={c.course_id} className="dashboard-course-item">
                            <div className="dashboard-course-head">
                              <strong className="dashboard-course-title">{c.title}</strong>
                              <span className="muted dashboard-course-meta">
                                {c._status === 'expired'
                                  ? c.expiry_date
                                    ? `(expired on ${String(c.expiry_date).slice(0, 10)})`
                                    : '(expired)'
                                  : c.expiry_date
                                    ? `(valid till ${String(c.expiry_date).slice(0, 10)})`
                                    : '(active)'}
                              </span>
                            </div>
                            <div className="dashboard-progress" aria-label="Course progress" style={{ marginTop: 10 }}>
                              <div className="dashboard-progress-bar" style={{ width: `${Math.min(100, Math.max(0, Number(pct ?? 0)))}%` }} />
                            </div>
                            <div className="muted" style={{ marginTop: 6 }}>
                              {isCompleted ? 'Completed' : `Progress: ${pct}%`}
                            </div>
                            <div className="dashboard-actions" style={{ marginTop: 10 }}>
                              {c._status === 'expired' ? (
                                <Link className="button button-ghost" to={`/courses/${encodeURIComponent(c.slug)}`}>
                                  View course
                                </Link>
                              ) : (
                                <Link className="button button-solid" to={`/course/${encodeURIComponent(c.slug)}/learn`}>
                                  Continue
                                </Link>
                              )}
                              <Link className="button button-ghost" to={`/courses/${encodeURIComponent(c.slug)}`}>
                                Details
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="dashboard-empty" style={{ marginTop: 12 }}>
                      <p className="muted" style={{ margin: 0 }}>No courses found.</p>
                      <div className="dashboard-actions" style={{ marginTop: 10 }}>
                        <Link className="button button-solid" to="/courses">
                          Browse workshops
                        </Link>
                      </div>
                    </div>
                  )}
                  {filteredCourses.length > 8 ? (
                    <p className="muted" style={{ marginTop: 12 }}>
                      Showing 8 of {filteredCourses.length}. Use filters/search to narrow down.
                    </p>
                  ) : null}
                </div>

                <div className="panel">
                  <h3 className="h3">Active enrollments</h3>
                  {activeEnrollments.length ? (
                    <ul className="list">
                      {activeEnrollments.map((e) => (
                        <li key={e.enrollment_id}>
                          <strong>{e.title}</strong>{' '}
                          <span className="muted">
                            {e.expiry_date ? `(valid till ${String(e.expiry_date).slice(0, 10)})` : '(active)'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No active enrollments yet.</p>
                  )}
                </div>

                <div className="panel">
                  <h3 className="h3">Recordings</h3>
                  {recordings.length ? (
                    <ul className="list">
                      {recordings.map((r) => (
                        <li key={r.recording_id}>
                          <div>
                            <strong>{r.course_title}</strong>
                            <div className="muted">{r.session_title ? r.session_title : `Session ${r.live_session_id}`}</div>
                            {r.is_expired ? (
                              <div className="muted">
                                Expired {r.expires_at ? `(expired on ${String(r.expires_at).slice(0, 10)})` : ''}
                              </div>
                            ) : (
                              <>
                                <div className="dashboard-actions" style={{ marginTop: 10 }}>
                                  <a className="button button-solid" href={r.recording_url} target="_blank" rel="noreferrer">
                                    Watch recording
                                  </a>
                                </div>
                                {r.expires_at ? <div className="muted">Valid till {String(r.expires_at).slice(0, 10)}</div> : null}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No recordings available yet.</p>
                  )}
                </div>

                {(recommended.length || trending.length) ? (
                  <div className="panel">
                    <h3 className="h3">Recommended for you</h3>
                    <p className="muted">Based on your learning and what’s trending.</p>
                    <div className="dashboard-reco-grid">
                      {(recommended.length ? recommended : trending).slice(0, 6).map((c) => (
                        <Link key={c.id} className="dashboard-reco-card" to={`/courses/${encodeURIComponent(c.slug)}`}>
                          <div className="dashboard-reco-title">{c.title}</div>
                          {c.summary ? (
                            <div className="muted dashboard-reco-summary">
                              {String(c.summary).slice(0, 90)}
                              {String(c.summary).length > 90 ? '…' : ''}
                            </div>
                          ) : (
                            <div className="muted dashboard-reco-summary">Open to see details and pricing.</div>
                          )}
                          <div className="dashboard-reco-cta" aria-hidden="true">
                            View workshop →
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid" style={{ gap: 16, marginTop: 16 }}>
                <div className="panel">
                  <h3 className="h3">Recent activity</h3>
                  {activity?.lesson_milestones?.length ? (
                    <ul className="list">
                      {activity.lesson_milestones.slice(0, 8).map((m) => (
                        <li key={`${m.lesson_id}-${m.updated_at}`}>
                          <strong>{m.lesson_title}</strong> <span className="muted">· {m.course_title}</span>
                          <div className="muted">
                            {m.completed_at ? `Completed · ${String(m.completed_at).slice(0, 10)}` : 'In progress'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Your recent lesson activity will appear here.</p>
                  )}
                </div>

                <div className="panel">
                  <h3 className="h3">Upcoming workshops</h3>
                  {dashboard?.recent_activity?.upcoming_sessions?.length ? (
                    <ul className="list">
                      {dashboard.recent_activity.upcoming_sessions.map((s) => (
                        <li key={s.id}>
                          <strong>{s.session_title ?? s.course_title}</strong>
                          <div className="muted">
                            {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : '—'} · {s.status}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No upcoming live sessions right now.</p>
                  )}
                </div>
              </div>
            </div>
            ) : null}

            {tab === 'orders' ? (
              <div className="panel admin-shell" style={{ marginTop: 16 }}>
                <h3 className="h3" style={{ marginTop: 0 }}>Your orders</h3>
                {ordersStatus === 'loading' ? <p className="muted">Loading orders…</p> : null}
                {ordersError ? <p className="form-error">{ordersError}</p> : null}
                {ordersStatus !== 'loading' && !ordersError ? (
                  <>
                    <div className="button-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <button className="button button-ghost" type="button" onClick={loadOrders} disabled={!token || ordersStatus === 'loading'}>
                        Refresh
                      </button>
                      <Link className="button button-solid" to="/checkout">
                        Go to checkout
                      </Link>
                    </div>
                    <div className="admin-table" style={{ marginTop: 12 }}>
                      <div className="admin-row admin-head">
                        <div>ID</div>
                        <div>Status</div>
                        <div>Total</div>
                        <div>Created</div>
                        <div />
                      </div>
                      {(orders ?? []).map((o) => (
                        <div key={o.id} className="admin-row">
                          <div>{o.id}</div>
                          <div>{o.status}</div>
                          <div>{o.total_cents != null ? `${o.currency ?? ''} ${(Number(o.total_cents) / 100).toFixed(2)}` : '—'}</div>
                          <div className="admin-cell-wrap">{String(o.created_at ?? '').slice(0, 19).replace('T', ' ')}</div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Link className="button button-ghost" to={`/orders/${encodeURIComponent(o.id)}`}>
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!orders?.length ? <p className="muted" style={{ marginTop: 10 }}>No orders yet.</p> : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {tab === 'profile' ? (
              <div className="panel admin-shell" style={{ marginTop: 16 }}>
                <h3 className="h3" style={{ marginTop: 0 }}>Profile</h3>
                {profileMsg ? (
                  <p className={profileMsg.includes('updated') ? 'muted' : 'form-error'} role="status" aria-live="polite">
                    {profileMsg}
                  </p>
                ) : null}
                <div className="admin-split" style={{ marginTop: 12 }}>
                  <label className="field">
                    <span className="field-label">Name</span>
                    <input className="input" value={profileName} onChange={(e) => setProfileName(e.target.value)} disabled={!token || profileStatus !== 'idle'} />
                  </label>
                  <label className="field">
                    <span className="field-label">Phone</span>
                    <input className="input" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="Optional" disabled={!token || profileStatus !== 'idle'} />
                  </label>
                </div>
                <div className="button-row" style={{ marginTop: 12 }}>
                  <button
                    className="button button-solid"
                    type="button"
                    disabled={!token || profileStatus !== 'idle'}
                    onClick={async () => {
                      if (!token || profileStatus !== 'idle') return;
                      setProfileStatus('saving');
                      setProfileMsg('');
                      try {
                        await api.profile.update(token, { name: profileName, phone: profilePhone });
                        await refreshProfile();
                        setProfileMsg('Profile updated.');
                      } catch (err) {
                        setProfileMsg(err?.message ?? 'Unable to save profile.');
                      } finally {
                        setProfileStatus('idle');
                      }
                    }}
                  >
                    {profileStatus === 'saving' ? 'Saving…' : 'Save changes'}
                  </button>
                  <button className="button button-ghost" type="button" onClick={logout} disabled={profileStatus === 'saving'}>
                    Logout
                  </button>
                </div>
              </div>
            ) : null}

            {tab === 'support' ? (
              <div className="panel admin-shell" style={{ marginTop: 16 }}>
                <h3 className="h3" style={{ marginTop: 0 }}>Support</h3>
                <p className="muted">Create a ticket or check your previous requests.</p>
                {supportError ? <p className="form-error">{supportError}</p> : null}
                <div className="admin-two-col" style={{ marginTop: 12 }}>
                  <div>
                    <h4 className="h4">New ticket</h4>
                    <div className="admin-split">
                      <label className="field">
                        <span className="field-label">Category</span>
                        <SelectMenu
                          ariaLabel="Support category"
                          value={supportForm.category}
                          options={[
                            { value: 'general', label: 'General' },
                            { value: 'payment', label: 'Payment' },
                            { value: 'access', label: 'Course access' },
                            { value: 'certificate', label: 'Certificate' },
                          ]}
                          onChange={(val) => setSupportForm((s) => ({ ...s, category: String(val) }))}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Subject</span>
                        <input className="input" value={supportForm.subject} onChange={(e) => setSupportForm((s) => ({ ...s, subject: e.target.value }))} />
                      </label>
                    </div>
                    <label className="field" style={{ marginTop: 12 }}>
                      <span className="field-label">Message</span>
                      <textarea className="input textarea" rows={5} value={supportForm.message_text} onChange={(e) => setSupportForm((s) => ({ ...s, message_text: e.target.value }))} />
                    </label>
                    <div className="button-row" style={{ marginTop: 12 }}>
                      <button
                        className="button button-solid"
                        type="button"
                        disabled={!token || supportStatus === 'creating' || !supportForm.subject.trim() || !supportForm.message_text.trim()}
                        onClick={async () => {
                          if (!token) return;
                          setSupportStatus('creating');
                          setSupportError('');
                          try {
                            await api.support.tickets.create(token, supportForm);
                            setSupportForm({ category: 'general', subject: '', message_text: '' });
                            await loadSupport();
                          } catch (err) {
                            setSupportError(err?.message ?? 'Failed to create ticket.');
                          } finally {
                            setSupportStatus('idle');
                          }
                        }}
                      >
                        {supportStatus === 'creating' ? 'Creating…' : 'Create ticket'}
                      </button>
                      <button className="button button-ghost" type="button" onClick={loadSupport} disabled={!token || supportStatus === 'loading'}>
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="h4">My tickets</h4>
                    {supportStatus === 'loading' ? <p className="muted">Loading tickets…</p> : null}
                    <div className="admin-table">
                      <div className="admin-row admin-head">
                        <div>ID</div>
                        <div>Subject</div>
                        <div>Status</div>
                        <div />
                      </div>
                      {(supportTickets ?? []).map((t) => (
                        <div key={t.id} className="admin-row">
                          <div>{t.id}</div>
                          <div className="admin-cell-wrap">{t.subject}</div>
                          <div>{t.status}</div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Link className="button button-ghost" to={`/support/${encodeURIComponent(t.id)}`}>
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!supportTickets?.length ? <p className="muted" style={{ marginTop: 10 }}>No support tickets yet.</p> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === 'certificates' ? (
              <div className="panel admin-shell" style={{ marginTop: 16 }}>
                <h3 className="h3" style={{ marginTop: 0 }}>Certificates</h3>
                {certStatus === 'loading' ? <p className="muted">Loading certificates…</p> : null}
                {certError ? <p className="form-error">{certError}</p> : null}
                <div className="admin-table" style={{ marginTop: 12 }}>
                  <div className="admin-row admin-head">
                    <div>ID</div>
                    <div>Course</div>
                    <div>Issued</div>
                    <div />
                  </div>
                  {(certificates ?? []).map((c) => (
                    <div key={c.id ?? c.certificate_id ?? c.course_id} className="admin-row">
                      <div>{c.id ?? c.certificate_id ?? '—'}</div>
                      <div className="admin-cell-wrap">{c.course_title ?? c.title ?? `Course #${c.course_id ?? ''}`}</div>
                      <div className="admin-cell-wrap">{c.issued_at ? String(c.issued_at).slice(0, 10) : '—'}</div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {c.id ? (
                          <button
                            className="button button-ghost"
                            type="button"
                            disabled={!token}
                            onClick={async () => {
                              if (!token) return;
                              try {
                                const blob = await api.user.certificates.downloadBlob(token, c.id);
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `certificate_${c.id}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch {
                                // ignore
                              }
                            }}
                          >
                            Download
                          </button>
                        ) : null}
                        <Link className="button" to="/certificates">
                          Open certificates page
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {!certificates?.length && certStatus !== 'loading' && !certError ? (
                  <p className="muted" style={{ marginTop: 10 }}>No certificates yet.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
