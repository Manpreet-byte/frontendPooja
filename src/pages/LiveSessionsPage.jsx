import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { formatDateTimeStandard } from '../utils/formatDate';

function formatDateTime(value) {
  return formatDateTimeStandard(value);
}

function deriveStatus(session, nowMs) {
  const backend = String(session?.derived_state ?? session?.derivedState ?? '').toLowerCase();
  if (backend) return backend === 'sold-out' ? 'sold_out' : backend;
  const raw = String(session?.status ?? '').toLowerCase();
  if (['archived', 'cancelled', 'canceled'].includes(raw)) return raw === 'canceled' ? 'cancelled' : raw;

  const startAt = session?.starts_at ?? session?.start_time ?? session?.scheduled_at ?? session?.startTime ?? null;
  const endAt = session?.end_time ?? session?.endTime ?? null;
  const startMs = startAt ? new Date(startAt).getTime() : null;
  const endMs = endAt ? new Date(endAt).getTime() : null;

  const seatLimit = Number(session?.seat_limit ?? session?.seatLimit ?? 0);
  const enrolledCount = Number(session?.enrolled_count ?? session?.enrolledCount ?? 0);
  if (seatLimit > 0 && enrolledCount >= seatLimit) return 'sold_out';

  if (endMs && Number.isFinite(endMs) && nowMs >= endMs) return 'ended';
  if (startMs && Number.isFinite(startMs) && nowMs >= startMs) return 'live';
  return 'upcoming';
}

function statusLabel(status) {
  if (status === 'live') return 'Live now';
  if (status === 'sold_out') return 'Sold out';
  if (status === 'ended') return 'Ended';
  if (status === 'recording-processing') return 'Recording processing';
  if (status === 'recording-ready') return 'Recording ready';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'archived') return 'Archived';
  return 'Upcoming';
}

export default function LiveSessionsPage() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    api.public.liveSessions
      .list()
      .then((data) => {
        if (!active) return;
        setSessions(data?.live_sessions ?? data?.liveSessions ?? []);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 404) {
          setSessions([]);
          setStatus('ready');
          return;
        }
        setError(err?.message || 'Unable to load live workshops.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const nowMs = Date.now();
  const normalized = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions.slice() : [];
    list.sort((a, b) => {
      const aStart = new Date(a?.start_time ?? a?.scheduled_at ?? 0).getTime();
      const bStart = new Date(b?.start_time ?? b?.scheduled_at ?? 0).getTime();
      return aStart - bStart;
    });
    return list;
  }, [sessions]);

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Live" title="Live workshops" subtitle="Discover upcoming sessions, join live, and watch recordings after they’re available." />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Loading live workshops…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <button className="button button-solid" type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : normalized.length ? (
          <div className="grid cards-grid">
            {normalized.map((s) => {
              const derived = deriveStatus(s, nowMs);
              const title = s?.title ?? s?.session_title ?? 'Live workshop';
              const slug = s?.slug ?? s?.session_slug ?? s?.course_slug ?? '';
              const href = slug ? `/live-sessions/${encodeURIComponent(slug)}` : '#';
              const instructor = s?.instructor ?? s?.instructor_name ?? '';
              const thumb = s?.thumbnail_url ?? s?.banner_url ?? s?.featured_image_url ?? s?.thumbnailUrl ?? '';
              const start = s?.starts_at ?? s?.start_time ?? s?.scheduled_at ?? null;
              const seatLimit = Number(s?.seat_limit ?? s?.seatLimit ?? 0);
              const enrolledCount = Number(s?.enrolled_count ?? s?.enrolledCount ?? 0);

              return (
                <article key={s?.id ?? slug ?? title} className="card course-card">
                  <div className="course-card-media">
                    {thumb ? <img src={thumb} alt={title} loading="lazy" /> : <div className="course-card-fallback" aria-hidden="true" />}
                  </div>
                  <div className="course-card-body">
                    <Link className="course-card-link" to={href} aria-disabled={!slug}>
                      <h3 className="h3">{title}</h3>
                      <p className="muted" style={{ marginTop: 8 }}>
                        {instructor ? `${instructor} · ` : ''}
                        {start ? formatDateTime(start) : 'Schedule coming soon'}
                      </p>
                      <p className="muted" style={{ marginTop: 8 }}>
                        Status: {statusLabel(derived)}
                        {seatLimit > 0 ? ` · Seats ${Math.max(0, seatLimit - enrolledCount)} left` : ''}
                      </p>
                    </Link>
                    <div className="course-card-footer">
                      <div className="course-card-actions">
                        <Link className="button button-ghost course-card-view" to={href} aria-disabled={!slug}>
                          View details
                        </Link>
                        <Link className="button button-solid course-card-add" to={href} aria-disabled={!slug}>
                          {derived === 'live' ? 'Join' : derived === 'sold_out' ? 'Sold out' : derived === 'completed' ? 'View' : 'Enroll'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel">
            <p className="muted">No live workshops are scheduled right now.</p>
            <Link className="button button-solid" to="/courses">
              Browse workshops
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
