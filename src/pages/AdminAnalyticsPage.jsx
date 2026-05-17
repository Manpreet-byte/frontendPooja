import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import AnalyticsOverviewPage from './admin/analytics/AnalyticsOverviewPage';
import RevenueAnalyticsPage from './admin/analytics/RevenueAnalyticsPage';
import EnrollmentAnalyticsPage from './admin/analytics/EnrollmentAnalyticsPage';
import FunnelAnalyticsPage from './admin/analytics/FunnelAnalyticsPage';
import TopCoursesAnalyticsPage from './admin/analytics/TopCoursesAnalyticsPage';
import RetentionAnalyticsPage from './admin/analytics/RetentionAnalyticsPage';
import UsersAnalyticsPage from './admin/analytics/UsersAnalyticsPage';
import usePageTitle from '../utils/usePageTitle';

const nav = [
  { to: '/admin/dashboard', label: '← Admin dashboard' },
  { to: '/admin/analytics', label: 'Overview', end: true },
  { to: '/admin/analytics/revenue', label: 'Revenue' },
  { to: '/admin/analytics/enrollments', label: 'Enrollments' },
  { to: '/admin/analytics/funnel', label: 'Funnel' },
  { to: '/admin/analytics/top-courses', label: 'Top courses' },
  { to: '/admin/analytics/users', label: 'Users' },
  { to: '/admin/analytics/retention', label: 'Retention' },
];

export default function AdminAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  usePageTitle('Admin analytics · Love & Flour');
  const [rangePreset, setRangePreset] = useState('last_30'); // today | last_7 | last_30 | custom
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const initials = useMemo(() => {
    const safe = String(user?.name ?? user?.email ?? '').trim();
    if (!safe) return 'A';
    const parts = safe.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return `${first}${last}`.toUpperCase();
  }, [user?.name, user?.email]);

  const shared = {
    rangePreset,
    rangeFrom,
    rangeTo,
    setRangePreset,
    setRangeFrom,
    setRangeTo,
  };

  const title = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.includes('/revenue')) return 'Revenue analytics';
    if (pathname.includes('/enrollments')) return 'Enrollment analytics';
    if (pathname.includes('/funnel')) return 'Funnel analytics';
    if (pathname.includes('/top-courses')) return 'Top courses';
    if (pathname.includes('/users')) return 'User analytics';
    if (pathname.includes('/retention')) return 'Retention';
    return 'Analytics overview';
  }, [location.pathname]);

  return (
    <main className="section admin-page">
      <div className="container admin-dashboard">
        <div className="admin-layout">
          <aside className="panel admin-sidebar">
            <div className="admin-sidebar-brand">
              <div className="admin-avatar" aria-hidden="true">
                {initials}
              </div>
              <div>
                <div className="admin-name">{user?.name ?? 'Admin'}</div>
                <div className="muted admin-email">{user?.email ?? ''}</div>
              </div>
            </div>

            <div className="admin-sidebar-body">
              <p className="section-kicker">Analytics</p>
              <div className="admin-nav">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </aside>

          <section className="admin-main">
            <div className="panel admin-topbar">
              <div className="admin-topbar-left">
                <div className="h3" style={{ margin: 0 }}>{title}</div>
              </div>
            </div>

            <div className="panel admin-shell" style={{ marginTop: 16 }}>
              <Routes>
                <Route index element={<AnalyticsOverviewPage {...shared} />} />
                <Route path="revenue" element={<RevenueAnalyticsPage {...shared} />} />
                <Route path="enrollments" element={<EnrollmentAnalyticsPage {...shared} />} />
                <Route path="funnel" element={<FunnelAnalyticsPage {...shared} />} />
                <Route path="top-courses" element={<TopCoursesAnalyticsPage {...shared} />} />
                <Route path="users" element={<UsersAnalyticsPage {...shared} />} />
                <Route path="retention" element={<RetentionAnalyticsPage {...shared} />} />
              </Routes>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
