import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { formatDateTimeStandard } from '../utils/formatDate';

function formatDateTime(value) {
  return formatDateTimeStandard(value);
}

function safeMs(value) {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}

function deriveStatus(session, nowMs) {
  const backend = String(session?.derived_state ?? session?.derivedState ?? '').toLowerCase();
  if (
    [
      'upcoming',
      'live',
      'ended',
      'recording-processing',
      'recording-ready',
      'sold-out',
      'cancelled',
    ].includes(backend)
  ) {
    // Small UX helper: upcoming within 10 minutes => starting soon.
    if (backend === 'upcoming') {
      const startMs = safeMs(session?.start_time ?? session?.scheduled_at ?? session?.startTime);
      if (startMs && startMs - nowMs <= 10 * 60 * 1000 && startMs - nowMs > 0) return 'starting_soon';
    }
    return backend === 'sold-out' ? 'sold_out' : backend;
  }

  const raw = String(session?.status ?? '').toLowerCase();
  if (['archived', 'cancelled', 'canceled'].includes(raw)) return raw === 'canceled' ? 'cancelled' : raw;

  const startMs = safeMs(session?.start_time ?? session?.scheduled_at ?? session?.startTime);
  const endMs = safeMs(session?.end_time ?? session?.endTime);

  const seatLimit = Number(session?.seat_limit ?? session?.seatLimit ?? 0);
  const enrolledCount = Number(session?.enrolled_count ?? session?.enrolledCount ?? 0);
  if (seatLimit > 0 && enrolledCount >= seatLimit) return 'sold_out';

  if (endMs && nowMs >= endMs) return 'ended';
  if (startMs && nowMs >= startMs) return 'live';
  if (startMs && startMs - nowMs <= 10 * 60 * 1000 && startMs - nowMs > 0) return 'starting_soon';
  return 'upcoming';
}

function statusLabel(status) {
  if (status === 'live') return 'Live now';
  if (status === 'starting_soon') return 'Starting soon';
  if (status === 'ended') return 'Ended';
  if (status === 'recording-processing') return 'Recording processing';
  if (status === 'recording-ready') return 'Recording ready';
  if (status === 'sold_out') return 'Sold out';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'archived') return 'Archived';
  return 'Upcoming';
}

function formatCountdown(msLeft) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function LiveSessionDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const addCourse = useCartStore((s) => s.addCourse);
  const hasCourse = useCartStore((s) => s.hasCourse);

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);

  const [enrollStatus, setEnrollStatus] = useState('idle'); // idle | loading | ready | error
  const [enrolled, setEnrolled] = useState(false);

  const [accessStatus, setAccessStatus] = useState('idle'); // idle | loading | ready | error
  const [accessError, setAccessError] = useState('');
  const [access, setAccess] = useState(null);
  const [mySession, setMySession] = useState(null);

  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [recordings, setRecordings] = useState([]);

  const tickRef = useRef(null);
  const [tick, setTick] = useState(0);
  const nowMs = Date.now();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    setSession(null);
    api.public.liveSessions
      .detail(slug)
      .then((data) => {
        if (!active) return;
        const s = data?.live_session ?? data?.liveSession ?? data?.workshop ?? data?.session ?? data;
        setSession(s ?? null);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 404) {
          api.public.liveSessions
            .list()
            .then((data) => {
              if (!active) return;
              const list = data?.live_sessions ?? data?.liveSessions ?? [];
              const match =
                (list ?? []).find((row) => String(row?.slug ?? row?.session_slug ?? row?.course_slug ?? '') === String(slug)) ?? null;
              if (match) {
                setSession(match);
                setStatus('ready');
                return;
              }
              setError('Workshop not found.');
              setStatus('error');
            })
            .catch((fallbackErr) => {
              if (!active) return;
              setError(fallbackErr?.message || err?.message || 'Unable to load workshop.');
              setStatus('error');
            });
          return;
        }
        setError(err?.message || 'Unable to load workshop.');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const derived = useMemo(() => deriveStatus(session, nowMs), [session, nowMs, tick]);
  const startMs = useMemo(() => safeMs(session?.starts_at ?? session?.start_time ?? session?.scheduled_at ?? session?.startTime), [session]);
  const endMs = useMemo(() => safeMs(session?.end_time ?? session?.endTime), [session]);

  useEffect(() => {
    if (!startMs) return undefined;
    if (!['upcoming', 'starting_soon'].includes(derived)) return undefined;
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [startMs, derived]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onRefresh = () => {
      // Re-check enrollment/access after payment verification.
      setEnrollStatus('idle');
      setAccessStatus('idle');
      setAccess(null);
      setAccessError('');
    };
    window.addEventListener('lf:enrollments_refresh', onRefresh);
    return () => window.removeEventListener('lf:enrollments_refresh', onRefresh);
  }, []);

  const sessionId = session?.id ?? session?.live_session_id ?? null;
  const courseId = session?.course_id ?? session?.courseId ?? null;
  const title = session?.title ?? session?.session_title ?? 'Live workshop';
  const instructor = session?.instructor ?? session?.instructor_name ?? '';
  const banner = session?.thumbnail_url ?? session?.banner_url ?? session?.featured_image_url ?? '';
  const overviewHtml = session?.overview_html ?? session?.overviewHtml ?? session?.description_html ?? session?.descriptionHtml ?? '';
  const agendaHtml = session?.agenda_html ?? session?.agendaHtml ?? '';
  const startAt = session?.starts_at ?? session?.start_time ?? session?.scheduled_at ?? null;
  const endAt = session?.end_time ?? null;
  const seatLimit = Number(session?.seat_limit ?? session?.seatLimit ?? 0);
  const enrolledCount = Number(session?.enrolled_count ?? session?.enrolledCount ?? 0);

  // Enrollment check (backend authoritative).
  useEffect(() => {
    if (!sessionId) return;
    if (!hydrated) return;
    if (!token) {
      setEnrolled(false);
      setMySession(null);
      setEnrollStatus('ready');
      return;
    }
    let active = true;
    setEnrollStatus('loading');
    api.liveSessions
      .listMine(token)
      .then((data) => {
        if (!active) return;
        const list = data?.live_sessions ?? data?.liveSessions ?? data?.sessions ?? [];
        const row = (list ?? []).find((item) => Number(item?.id ?? item?.live_session_id) === Number(sessionId)) ?? null;
        setMySession(row);
        setEnrolled(Boolean(row));
        setEnrollStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 404) {
          // Enrollments endpoint not deployed in this env; default to locked.
          setEnrolled(false);
          setMySession(null);
          setEnrollStatus('ready');
          return;
        }
        setEnrolled(false);
        setMySession(null);
        setEnrollStatus('error');
      });
    return () => {
      active = false;
    };
  }, [token, hydrated, sessionId]);

  const countdownText = useMemo(() => {
    if (!startMs) return '';
    const diff = startMs - nowMs;
    if (diff <= 0) return '';
    return formatCountdown(diff);
  }, [startMs, nowMs, tick]);

  const joinWindowOk = useMemo(() => {
    if (!startMs) return false;
    const diff = startMs - nowMs;
    if (derived === 'live') return true;
    if (derived === 'starting_soon') return true;
    if (derived === 'upcoming') return diff <= 15 * 60 * 1000;
    return false;
  }, [derived, startMs, nowMs, tick]);

  const canAttemptJoin = Boolean(token && enrolled && sessionId && joinWindowOk);

  const loadAccess = async () => {
    if (accessStatus === 'loading') return;
    if (!token) {
      navigate('/login', { replace: true, state: { from: { pathname: `/live-sessions/${slug}` } } });
      return;
    }
    if (!enrolled) {
      setAccessError('This workshop is locked. Please complete enrollment to join.');
      return;
    }
    setAccessStatus('loading');
    setAccessError('');
    try {
      const res = await api.liveSessions.access(token, sessionId);
      const accessPayload = res?.access ?? res?.data ?? res;
      const joinUrl =
        accessPayload?.join?.zoom_join_url ??
        accessPayload?.join?.live_url ??
        accessPayload?.live_url ??
        accessPayload?.liveUrl ??
        '';
      if (joinUrl) {
        setAccess(accessPayload ?? null);
        setAccessStatus('ready');
        window.open(joinUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // If recording is ready, show recordings panel (no redirect).
      const canWatch = Boolean(accessPayload?.recordings?.can_watch);
      if (canWatch) {
        setAccess(accessPayload ?? null);
        setAccessStatus('ready');
        return;
      }

      setAccessStatus('error');
      setAccessError('Access is not available yet. Please try again shortly.');
    } catch (err) {
      if (err?.status === 401) {
        navigate('/login', { replace: true, state: { from: { pathname: `/live-sessions/${slug}` } } });
        return;
      }
      if (err?.status === 403) setAccessError('This workshop is locked. Please complete enrollment to join.');
      else if (err?.status === 404) setAccessError('Live access is not available yet. Please try again shortly.');
      else setAccessError(err?.message || 'Unable to load live access right now.');
      setAccessStatus('error');
    }
  };

  const startEnrollment = () => {
    if (!courseId) {
      setAccessError('Enrollment is not available yet for this workshop.');
      return;
    }
    if (!token) {
      navigate('/login', { replace: true, state: { from: { pathname: `/live-sessions/${slug}` } } });
      return;
    }
    const already = hasCourse(Number(courseId));
    if (!already) {
      addCourse({
        id: Number(courseId),
        slug: session?.course_slug ?? session?.courseSlug ?? slug,
        title,
        featuredImage: banner,
        excerptHtml: overviewHtml,
        priceText: session?.price_text ?? session?.priceText ?? '',
      });
    }
    navigate('/checkout');
  };

  // Recordings: backend-driven states.
  useEffect(() => {
    if (!token) return;
    if (!sessionId) return;
    let active = true;
    setRecordingStatus('loading');
    if (derived === 'recording-ready' || derived === 'recording-processing' || derived === 'ended') {
      api.liveSessions
        .access(token, sessionId)
        .then((data) => {
          if (!active) return;
          const payload = data?.access ?? data ?? null;
          const items = payload?.recordings?.items ?? [];
          setRecordings(items);
          setRecordingStatus('ready');
        })
        .catch(() => {
          if (!active) return;
          setRecordings([]);
          setRecordingStatus('ready');
        });
    } else {
      // Fallback for legacy backends.
      api.user.recordings
        .list(token)
        .then((data) => {
          if (!active) return;
          const list = data?.recordings ?? [];
          const filtered = list.filter((r) => Number(r?.live_session_id) === Number(sessionId));
          setRecordings(filtered);
          setRecordingStatus('ready');
        })
        .catch(() => {
          if (!active) return;
          setRecordings([]);
          setRecordingStatus('ready');
        });
    }
    return () => {
      active = false;
    };
  }, [token, sessionId, derived]);

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Live" title={title} subtitle={`${statusLabel(derived)}${startAt ? ` · ${formatDateTime(startAt)}` : ''}`} />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Loading workshop…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <Link className="button button-solid" to="/live-sessions">
              Back to live workshops
            </Link>
          </div>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            <div className="panel">
              {banner ? (
                <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                  <img src={banner} alt={title} style={{ width: '100%', display: 'block' }} />
                </div>
              ) : null}

              <div className="checkout-totals">
                <div className="checkout-line">
                  <span className="muted">Schedule</span>
                  <span>{startAt ? formatDateTime(startAt) : 'TBA'}</span>
                </div>
                <div className="checkout-line">
                  <span className="muted">Ends</span>
                  <span>{endAt ? formatDateTime(endAt) : endMs ? formatDateTime(endMs) : '—'}</span>
                </div>
                <div className="checkout-line">
                  <span className="muted">Instructor</span>
                  <span>{instructor || '—'}</span>
                </div>
                <div className="checkout-line">
                  <span className="muted">Seats</span>
                  <span>{seatLimit > 0 ? `${Math.max(0, seatLimit - enrolledCount)} left` : 'Limited'}</span>
                </div>
                {derived === 'upcoming' || derived === 'starting_soon' ? (
                  <div className="checkout-line checkout-total">
                    <span>Starts in</span>
                    <span>{countdownText || '—'}</span>
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                {derived === 'sold_out' ? (
                  <button className="button button-solid" type="button" disabled>
                    Sold out
                  </button>
                ) : !token ? (
                  <button className="button button-solid" type="button" onClick={startEnrollment}>
                    Login to enroll
                  </button>
                ) : enrollStatus === 'loading' ? (
                  <button className="button button-solid" type="button" disabled>
                    Checking access…
                  </button>
                ) : enrolled ? (
                  <button className="button button-solid" type="button" onClick={loadAccess} disabled={!canAttemptJoin || accessStatus === 'loading'}>
                    {accessStatus === 'loading'
                      ? 'Preparing access…'
                      : derived === 'recording-ready' || derived === 'recording-processing' || derived === 'ended'
                        ? 'View recordings'
                        : 'Join live workshop'}
                  </button>
                ) : (
                  <button className="button button-solid" type="button" onClick={startEnrollment}>
                    Enroll via checkout
                  </button>
                )}

                <Link className="button button-ghost" to="/live-sessions">
                  Browse live workshops
                </Link>

                {token ? (
                  <Link className="button button-ghost" to="/dashboard">
                    Dashboard
                  </Link>
                ) : null}
              </div>

              {accessError ? <p className="muted" style={{ marginTop: 12 }}>{accessError}</p> : null}

              {overviewHtml ? (
                <div style={{ marginTop: 18 }}>
                  <h2 className="h3">Overview</h2>
                  <div className="muted" dangerouslySetInnerHTML={{ __html: overviewHtml }} />
                </div>
              ) : null}

              {agendaHtml ? (
                <div style={{ marginTop: 18 }}>
                  <h2 className="h3">Agenda</h2>
                  <div className="muted" dangerouslySetInnerHTML={{ __html: agendaHtml }} />
                </div>
              ) : null}
            </div>

            {(derived === 'recording-ready' || derived === 'recording-processing' || derived === 'ended') && token ? (
              <div className="panel">
                <h2 className="h3">Recordings</h2>
                {recordingStatus === 'loading' ? (
                  <p className="muted">Checking recordings…</p>
                ) : recordings.length ? (
                  <ul className="cart-list">
                    {recordings.map((r) => (
                      <li key={r.recording_id ?? r.id} className="cart-item">
                        <div className="cart-item-body">
                          <div className="cart-item-head">
                            <div className="cart-item-copy">
                              <p className="cart-item-title">{r.session_title ?? r.title ?? 'Recording'}</p>
                              <p className="muted">{r.recorded_at ? formatDateTimeStandard(r.recorded_at) : ''}</p>
                            </div>
                            {r.recording_url ? (
                              <a className="button button-ghost" href={r.recording_url} target="_blank" rel="noreferrer">
                                Watch
                              </a>
                            ) : (
                              <button className="button button-ghost" type="button" disabled>
                                Processing recording
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    {derived === 'recording-ready'
                      ? 'Recording is ready, but the link is not available yet.'
                      : 'Processing recording… Please check back later.'}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
