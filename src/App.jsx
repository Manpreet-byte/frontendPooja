import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import CartDrawer from './components/CartDrawer';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { api } from './api/client';

const HomePage = lazy(() => import('./pages/HomePage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const LiveSessionsPage = lazy(() => import('./pages/LiveSessionsPage'));
const LiveSessionDetailPage = lazy(() => import('./pages/LiveSessionDetailPage'));
const CourseLearnPage = lazy(() => import('./pages/CourseLearnPage'));
const RecipeLibraryPage = lazy(() => import('./pages/RecipeLibraryPage'));
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const WpPageDetailPage = lazy(() => import('./pages/WpPageDetailPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ShippingPage = lazy(() => import('./pages/ShippingPage'));
const CancellationPage = lazy(() => import('./pages/CancellationPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const WorkWithUsPage = lazy(() => import('./pages/WorkWithUsPage'));
const Elementor7819Page = lazy(() => import('./pages/Elementor7819Page'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const RetrievePasswordPage = lazy(() => import('./pages/RetrievePasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const CertificatesPage = lazy(() => import('./pages/CertificatesPage'));
const CertificateDetailPage = lazy(() => import('./pages/CertificateDetailPage'));
const CertificateVerifyPage = lazy(() => import('./pages/CertificateVerifyPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SupportTicketsPage = lazy(() => import('./pages/SupportTicketsPage'));
const SupportTicketDetailPage = lazy(() => import('./pages/SupportTicketDetailPage'));
const InstructorDashboardPage = lazy(() => import('./pages/InstructorDashboardPage'));
const AdminSetupPage = lazy(() => import('./pages/AdminSetupPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function getAnalyticsSessionId() {
  try {
    const key = 'lf:session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `mem-${Date.now().toString(36)}`;
  }
}

function ProtectedRoute({ children }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!hydrated) return null;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function AdminRoute({ children }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!hydrated) return null;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function UserDashboardRoute({ children }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!hydrated) return null;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
}

function InstructorRoute({ children }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!hydrated) return null;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  const role = user?.role;
  if (role !== 'instructor' && role !== 'admin' && role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [persistHydrated, setPersistHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    setCartOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    const content = document.getElementById('content');
    if (content?.focus) content.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setPersistHydrated(true));
    // In case hydration already finished before this effect runs.
    if (useAuthStore.persist.hasHydrated()) setPersistHydrated(true);
    return typeof unsub === 'function' ? unsub : undefined;
  }, []);

  // Anonymous analytics for conversion funnel (backend aggregates).
  useEffect(() => {
    const sessionId = getAnalyticsSessionId();
    api.analytics.track({
      event_type: 'page_view',
      metadata: {
        session_id: sessionId,
        path: location.pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      },
    });
  }, [location.pathname]);

  useEffect(() => {
    const onCartEvent = (event) => {
      const detail = event?.detail ?? {};
      const sessionId = getAnalyticsSessionId();
      const kind = String(detail.kind ?? '');
      const eventType = kind === 'add' ? 'cart_add' : kind === 'remove' ? 'cart_remove' : null;
      if (!eventType) return;
      api.analytics.track({
        event_type: eventType,
        entity_type: detail.entity_type ?? 'course',
        entity_id: detail.entity_id ?? null,
        metadata: { session_id: sessionId, path: location.pathname },
      });
    };
    window.addEventListener('lf:cart_event', onCartEvent);
    return () => window.removeEventListener('lf:cart_event', onCartEvent);
  }, [location.pathname]);

  useEffect(() => {
    // One-time session bootstrap to prevent route flicker and restore sessions.
    if (!persistHydrated) return;
    useAuthStore.getState().hydrateSession();
  }, [persistHydrated]);

  // Back-compat: if something else sets token, ensure we validate it once hydrated.
  const shouldValidate = useMemo(() => Boolean(token && hydrated), [token, hydrated]);
  useEffect(() => {
    if (!shouldValidate) return;
    useAuthStore.getState().refreshProfile();
  }, [shouldValidate]);

  const isAboutPage = location.pathname === '/about';
  const isCourseDetailPage = location.pathname.startsWith('/courses/') && location.pathname !== '/courses';

  return (
    <div className={`page${isAboutPage ? ' page-white' : ''}${isCourseDetailPage ? ' course-detail-theme' : ''}`}>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <SiteHeader onCartClick={() => setCartOpen(true)} />
      <div id="content" tabIndex={-1}>
        <Suspense
          fallback={
            <main className="section">
              <div className="container">
                <p className="muted">Loading…</p>
              </div>
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/live-sessions" element={<LiveSessionsPage />} />
            <Route path="/live-sessions/:slug" element={<LiveSessionDetailPage />} />
            <Route
              path="/course/:slug/learn"
              element={
                <ProtectedRoute>
                  <CourseLearnPage />
                </ProtectedRoute>
              }
            />
            <Route path="/recipe-library" element={<RecipeLibraryPage />} />
            <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/retrieve-password" element={<RetrievePasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/certificates/verify/:certificateCode" element={<CertificateVerifyPage />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
          <Route
            path="/order-success"
            element={
              <ProtectedRoute>
                <OrderSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <UserDashboardRoute>
                <DashboardPage />
              </UserDashboardRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <SupportTicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support/:id"
            element={
              <ProtectedRoute>
                <SupportTicketDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <CertificatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates/:courseId"
            element={
              <ProtectedRoute>
                <CertificateDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/setup" element={<AdminSetupPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics/*"
            element={
              <AdminRoute>
                <AdminAnalyticsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/instructor/dashboard"
            element={
              <InstructorRoute>
                <InstructorDashboardPage />
              </InstructorRoute>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/cancellation" element={<CancellationPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/work-with-us" element={<WorkWithUsPage />} />
          <Route path="/elementor-7819" element={<Elementor7819Page />} />
          <Route path="/newsletter" element={<NewsletterPage />} />
          <Route path="/pages/:slug" element={<WpPageDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <SiteFooter />
    </div>
  );
}
