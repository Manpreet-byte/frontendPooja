import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

function initialsFromName(name) {
  const safe = String(name ?? '').trim();
  if (!safe) return 'I';
  const parts = safe.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'I';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export default function InstructorDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [dash, setDash] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const canLoad = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!canLoad) return;
    let active = true;
    setStatus('loading');
    setError('');
    Promise.allSettled([api.instructor.dashboard(token), api.instructor.analytics(token)])
      .then((results) => {
        if (!active) return;
        const [d, a] = results;
        if (d.status === 'fulfilled') setDash(d.value?.dashboard ?? d.value ?? null);
        if (a.status === 'fulfilled') setAnalytics(a.value?.analytics ?? a.value ?? null);
        const err = results.find((r) => r.status === 'rejected')?.reason;
        if (err) setError(err?.message ?? 'Failed to load instructor dashboard');
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load instructor dashboard');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [canLoad, token]);

  const courses = dash?.courses ?? [];
  const qa = dash?.qa_inbox ?? [];
  const byCourse = analytics?.by_course ?? [];

  return (
    <main className="section dashboard-page">
      <div className="container admin-dashboard">
        {error ? <p className="form-error">{error}</p> : null}

        <div className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-brand">
              <div className="admin-avatar" aria-hidden="true">
                {initialsFromName(user?.name)}
              </div>
              <div>
                <div className="admin-name">{user?.name ?? 'Instructor'}</div>
                <div className="muted admin-email">{user?.email ?? ''}</div>
              </div>
            </div>

            <div className="admin-sidebar-body">
              <p className="section-kicker">Instructor</p>
              <div className="admin-nav" aria-label="Instructor navigation">
                <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`} to="/instructor/dashboard">
                  Overview
                </NavLink>
                <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`} to="/admin/dashboard">
                  Admin dashboard
                </NavLink>
              </div>
            </div>
          </aside>

          <section className="admin-main">
            <div className="panel admin-topbar">
              <div className="admin-topbar-left">
                <div className="h3" style={{ margin: 0 }}>Instructor overview</div>
              </div>
              <div className="admin-topbar-right">
                <button className="button button-ghost" type="button" onClick={() => window.location.reload()} disabled={status === 'loading'}>
                  {status === 'loading' ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="panel admin-shell" style={{ marginTop: 16 }}>
              <div className="grid" style={{ gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="panel" style={{ background: 'rgba(201, 122, 74, 0.08)' }}>
                  <p className="muted">My courses</p>
                  <p className="h2" style={{ marginTop: 6 }}>{courses.length}</p>
                </div>
                <div className="panel">
                  <p className="muted">Open questions</p>
                  <p className="h2" style={{ marginTop: 6 }}>{qa.length}</p>
                </div>
                <div className="panel">
                  <p className="muted">Revenue (all time)</p>
                  <p className="h2" style={{ marginTop: 6 }}>
                    {byCourse.reduce((sum, r) => sum + Number(r.revenue_cents ?? 0), 0) / 100}
                  </p>
                  <p className="muted" style={{ marginTop: 6 }}>INR</p>
                </div>
              </div>

              <div className="admin-two-col" style={{ marginTop: 16 }}>
                <div className="panel" style={{ margin: 0 }}>
                  <h3 className="h3">Courses</h3>
                  {!courses.length ? <p className="muted">No courses assigned yet.</p> : null}
                  {courses.length ? (
                    <div className="admin-table">
                      <div className="admin-row admin-head">
                        <div>ID</div>
                        <div>Course</div>
                        <div>Status</div>
                        <div>Students</div>
                      </div>
                      {courses.map((c) => (
                        <div key={c.id} className="admin-row">
                          <div>{c.id}</div>
                          <div className="admin-cell-wrap">
                            <Link className="link" to={`/courses/${encodeURIComponent(c.slug)}`}>{c.title}</Link>
                          </div>
                          <div>{c.workflow_status ?? (c.is_published ? 'published' : 'draft')}</div>
                          <div>{c.active_students ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="panel" style={{ margin: 0 }}>
                  <h3 className="h3">Q&amp;A inbox</h3>
                  {!qa.length ? <p className="muted">No open questions right now.</p> : null}
                  {qa.length ? (
                    <ul className="list">
                      {qa.map((q) => (
                        <li key={q.id}>
                          <strong>{q.course_title}</strong>
                          <div className="muted" style={{ marginTop: 4 }}>{q.title}</div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

