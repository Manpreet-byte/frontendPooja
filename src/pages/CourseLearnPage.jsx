import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { cacheLessonForOffline, enqueueOfflineProgressEvent, flushOfflineProgressQueue, getCachedLesson } from '../utils/offlineLearning';

export default function CourseLearnPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [status, setStatus] = useState('loading'); // loading | ok | not_enrolled | error
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progressSummary, setProgressSummary] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [discussionTab, setDiscussionTab] = useState('comments'); // comments | qa
  const [commentsStatus, setCommentsStatus] = useState('idle'); // idle | loading | error
  const [commentsError, setCommentsError] = useState('');
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [qaStatus, setQaStatus] = useState('idle'); // idle | loading | error
  const [qaError, setQaError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionBody, setQuestionBody] = useState('');
  const [questionSending, setQuestionSending] = useState(false);
  const [openQuestionId, setOpenQuestionId] = useState(null);
  const [repliesStatus, setRepliesStatus] = useState('idle');
  const [repliesError, setRepliesError] = useState('');
  const [replies, setReplies] = useState([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState('idle'); // idle | loading | error
  const [aiError, setAiError] = useState('');
  const [aiConversationId, setAiConversationId] = useState(null);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiDraft, setAiDraft] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const startedLessonIds = useRef(new Set());
  const videoRef = useRef(null);
  const lastProgressSentAtRef = useRef(0);
  const progressSendTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onRefresh = () => setRefreshKey((v) => v + 1);
    window.addEventListener('lf:enrollments_refresh', onRefresh);
    return () => window.removeEventListener('lf:enrollments_refresh', onRefresh);
  }, []);

  useEffect(() => {
    let active = true;
    if (!token || !slug) return;
    setStatus('loading');
    setError('');

    // Resolve course_id via public slug endpoint (so we can call /api/user/courses/:id/lessons).
    Promise.all([api.public.courses.detail(slug), api.feed.enrollments(token), api.user.recordings.list(token)])
      .then(async ([c, e, r]) => {
        if (!active) return;
        const resolvedCourse = c?.course ?? null;
        setCourse(resolvedCourse);

        const enrollments = e?.enrollments ?? [];
        const enrolled = enrollments.some((row) => String(row?.slug ?? '') === String(slug));
        if (!enrolled) {
          setStatus('not_enrolled');
          return;
        }

        const courseId = resolvedCourse?.id;
        if (!courseId) {
          setError('Course not found');
          setStatus('error');
          return;
        }

        try {
          const [lessonData, progressData] = await Promise.all([
            api.user.lessons.listForCourse(token, courseId),
            api.user.progress.course(token, courseId),
          ]);
          if (!active) return;

          setLessons(lessonData?.lessons ?? []);
          setProgressSummary(progressData?.summary ?? null);
          setRecordings((r?.recordings ?? []).filter((rec) => String(rec?.course_slug ?? '') === String(slug)));
          setStatus('ok');
        } catch (err) {
          if (!active) return;
          if (err?.status === 401) setStatus('error');
          else if (err?.status === 403) setStatus('not_enrolled');
          else setStatus('error');
          setError(err?.message ?? 'Failed to load lessons');
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load course');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [token, slug, refreshKey]);

  // Background sync: when coming online, flush queued progress events.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!token || !userId) return undefined;
    const onOnline = () => flushOfflineProgressQueue({ token, userId }).catch(() => null);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [token, userId]);

  const title = useMemo(() => {
    if (!slug) return 'Course';
    return `Course: ${slug}`;
  }, [slug]);

  const currentLessonId = useMemo(() => {
    const raw = searchParams.get('lesson');
    const id = raw ? Number(raw) : null;
    if (id && Number.isFinite(id) && id > 0) return id;
    return null;
  }, [searchParams]);

  const lessonById = useMemo(() => {
    const map = new Map();
    for (const l of lessons) map.set(Number(l.id), l);
    return map;
  }, [lessons]);

  const orderedLessonIds = useMemo(() => lessons.map((l) => Number(l.id)), [lessons]);

  const activeLesson = useMemo(() => {
    if (!lessons.length) return null;
    if (currentLessonId && lessonById.has(currentLessonId)) return lessonById.get(currentLessonId);

    // Continue learning:
    // 1) the most recently updated in-progress lesson (has progress but not completed)
    // 2) else first incomplete
    // 3) else first lesson
    const incomplete = lessons.filter((l) => !l?.progress?.completed_at);
    const inProgress = incomplete
      .filter((l) => l?.progress && (Number(l.progress.progress_percentage ?? 0) > 0 || l.progress.started_at))
      .slice()
      .sort((a, b) => {
        const aMs = a?.progress?.updated_at ? new Date(a.progress.updated_at).getTime() : 0;
        const bMs = b?.progress?.updated_at ? new Date(b.progress.updated_at).getTime() : 0;
        return bMs - aMs;
      });
    if (inProgress.length) return inProgress[0];
    return incomplete[0] ?? lessons[0];
  }, [currentLessonId, lessonById, lessons]);

  // Ensure URL reflects selected lesson for share/reload.
  useEffect(() => {
    if (!activeLesson?.id) return;
    const activeId = String(activeLesson.id);
    if (searchParams.get('lesson') === activeId) return;
    const next = new URLSearchParams(searchParams);
    next.set('lesson', activeId);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

  // Progress tracking: mark lesson started when it becomes active.
  useEffect(() => {
    if (!token) return;
    const id = activeLesson?.id ? Number(activeLesson.id) : null;
    if (!id) return;
    if (startedLessonIds.current.has(id)) return;
    startedLessonIds.current.add(id);
    api.user.lessons.start(token, id, {}).catch(async () => {
      // Offline queue
      if (!userId) return;
      await enqueueOfflineProgressEvent({
        userId,
        event: { type: 'lesson_start', lesson_id: id, occurred_at: new Date().toISOString() },
      });
    });
  }, [token, activeLesson?.id]);

  // Auto-save progress for video lessons (no UI changes).
  useEffect(() => {
    if (!token) return undefined;
    if (!activeLesson?.id) return undefined;
    if (activeLesson.lesson_type !== 'video') return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    const sendProgress = async () => {
      const now = Date.now();
      if (now - lastProgressSentAtRef.current < 12000) return; // throttle
      lastProgressSentAtRef.current = now;
      const duration = Number(video.duration ?? 0);
      const current = Number(video.currentTime ?? 0);
      const pct = duration > 0 ? Math.min(99, Math.floor((current / duration) * 100)) : 0;
      api.user.lessons
        .start(token, activeLesson.id, { progress_percentage: pct, last_position_seconds: Math.floor(current) })
        .catch(async () => {
          if (!userId) return;
          await enqueueOfflineProgressEvent({
            userId,
            event: {
              type: 'lesson_progress',
              lesson_id: Number(activeLesson.id),
              progress_percentage: pct,
              last_position_seconds: Math.floor(current),
              occurred_at: new Date().toISOString(),
            },
          });
        });
    };

    const onTimeUpdate = () => {
      if (progressSendTimerRef.current) return;
      progressSendTimerRef.current = window.setTimeout(() => {
        progressSendTimerRef.current = null;
        sendProgress();
      }, 800);
    };
    const onPause = () => sendProgress();
    const onEnded = () => sendProgress();

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      if (progressSendTimerRef.current) window.clearTimeout(progressSendTimerRef.current);
      progressSendTimerRef.current = null;
    };
  }, [token, activeLesson?.id, activeLesson?.lesson_type]);

  const goToLesson = (lessonId) => {
    const next = new URLSearchParams(searchParams);
    next.set('lesson', String(lessonId));
    setSearchParams(next);
  };

  const completeLesson = async () => {
    if (!token || !activeLesson?.id) return;
    setError('');
    try {
      const result = await api.user.lessons.complete(token, activeLesson.id);
      const nextSummary = result?.progress ?? null;
      if (nextSummary) setProgressSummary(nextSummary);
      // Refresh lessons list to update completion badges.
      if (course?.id) {
        const lessonData = await api.user.lessons.listForCourse(token, course.id);
        setLessons(lessonData?.lessons ?? []);
      }

      // If course is now completed, try fetching certificate (optional).
      if (course?.id && (nextSummary?.isCompleted || nextSummary?.is_completed)) {
        api.user.certificates
          .byCourse(token, course.id)
          .then((data) => setCertificate(data?.certificate ?? null))
          .catch(() => {});
      }
    } catch (err) {
      // Queue completion offline (no optimistic unlock).
      if (userId) {
        await enqueueOfflineProgressEvent({
          userId,
          event: { type: 'lesson_complete', lesson_id: Number(activeLesson.id), occurred_at: new Date().toISOString() },
        });
        setError('Saved offline. This will sync when you’re back online.');
      } else {
        setError(err?.message ?? 'Failed to mark lesson complete');
      }
    }
  };

  // Discussion: lesson comments (enrollment-protected).
  useEffect(() => {
    if (!token) return;
    if (status !== 'ok') return;
    if (discussionTab !== 'comments') return;
    const lessonId = activeLesson?.id ? Number(activeLesson.id) : null;
    if (!lessonId) return;
    let active = true;
    setCommentsStatus('loading');
    setCommentsError('');
    api.community.comments
      .listForLesson(token, lessonId)
      .then((data) => {
        if (!active) return;
        setComments(data?.comments ?? []);
        setCommentsStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setCommentsStatus('error');
        setCommentsError(err?.message ?? 'Failed to load comments');
      });
    return () => {
      active = false;
    };
  }, [token, status, discussionTab, activeLesson?.id]);

  const sendComment = async () => {
    if (!token) return;
    const lessonId = activeLesson?.id ? Number(activeLesson.id) : null;
    if (!lessonId) return;
    const body = String(commentDraft ?? '').trim();
    if (body.length < 2) return;
    setCommentSending(true);
    setCommentsError('');
    try {
      const data = await api.community.comments.create(token, lessonId, { body_text: body });
      setComments(data?.comments ?? []);
      setCommentDraft('');
      api.analytics.track({ event_type: 'lesson_comment.posted', entity_type: 'lesson', entity_id: lessonId }).catch(() => null);
    } catch (err) {
      setCommentsError(err?.message ?? 'Failed to post comment');
    } finally {
      setCommentSending(false);
    }
  };

  // Discussion: course Q&A (enrollment-protected).
  useEffect(() => {
    if (!token) return;
    if (status !== 'ok') return;
    if (discussionTab !== 'qa') return;
    if (!course?.id) return;
    let active = true;
    setQaStatus('loading');
    setQaError('');
    api.community.questions
      .listForCourse(token, course.id, { limit: 20 })
      .then((data) => {
        if (!active) return;
        setQuestions(data?.questions ?? []);
        setQaStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setQaStatus('error');
        setQaError(err?.message ?? 'Failed to load questions');
      });
    return () => {
      active = false;
    };
  }, [token, status, discussionTab, course?.id]);

  useEffect(() => {
    if (!token) return;
    if (!openQuestionId) return;
    let active = true;
    setRepliesStatus('loading');
    setRepliesError('');
    api.community.questions.replies
      .get(token, openQuestionId)
      .then((data) => {
        if (!active) return;
        setReplies(data?.replies ?? []);
        setRepliesStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setRepliesStatus('error');
        setRepliesError(err?.message ?? 'Failed to load replies');
      });
    return () => {
      active = false;
    };
  }, [token, openQuestionId]);

  const sendQuestion = async () => {
    if (!token || !course?.id) return;
    const titleText = String(questionTitle ?? '').trim();
    const bodyText = String(questionBody ?? '').trim();
    if (titleText.length < 3 || bodyText.length < 3) return;
    setQuestionSending(true);
    setQaError('');
    try {
      const payload = { title: titleText, body_text: bodyText, lesson_id: activeLesson?.id ?? null };
      const data = await api.community.questions.create(token, course.id, payload);
      const created = data?.question ?? null;
      setQuestions((list) => (created ? [created, ...(Array.isArray(list) ? list : [])] : list));
      setQuestionTitle('');
      setQuestionBody('');
      api.analytics.track({ event_type: 'course_question.posted', entity_type: 'course', entity_id: course.id }).catch(() => null);
    } catch (err) {
      setQaError(err?.message ?? 'Failed to post question');
    } finally {
      setQuestionSending(false);
    }
  };

  const sendReply = async () => {
    if (!token || !openQuestionId) return;
    const body = String(replyDraft ?? '').trim();
    if (body.length < 2) return;
    setReplySending(true);
    setRepliesError('');
    try {
      const data = await api.community.questions.replies.create(token, openQuestionId, { body_text: body });
      setReplies(data?.replies ?? []);
      setReplyDraft('');
      api.analytics.track({ event_type: 'course_reply.posted', entity_type: 'question', entity_id: openQuestionId }).catch(() => null);
    } catch (err) {
      setRepliesError(err?.message ?? 'Failed to post reply');
    } finally {
      setReplySending(false);
    }
  };

  // AI assistant removed from this project (placeholder infrastructure cleaned up).
  // Keep state variables intact to avoid refactors, but disable actions.
  const aiSend = async () => {
    setAiError('AI assistant is disabled in this build.');
  };

  const aiQuick = async () => {
    setAiError('AI assistant is disabled in this build.');
  };

  const isCourseCompleted = useMemo(() => {
    return Boolean(progressSummary?.isCompleted || progressSummary?.is_completed);
  }, [progressSummary]);

  const certificateId = certificate?.id ?? certificate?.certificate_id ?? null;
  const certificateStatus = certificate?.status ?? (certificate ? 'issued' : 'processing');

  const activeIndex = useMemo(() => {
    if (!activeLesson?.id) return -1;
    return orderedLessonIds.indexOf(Number(activeLesson.id));
  }, [activeLesson?.id, orderedLessonIds]);

  const prevLessonId = activeIndex > 0 ? orderedLessonIds[activeIndex - 1] : null;
  const nextLessonId = activeIndex >= 0 && activeIndex < orderedLessonIds.length - 1 ? orderedLessonIds[activeIndex + 1] : null;

  if (!token) return <Navigate to="/login" replace />;
  if (status === 'not_enrolled') return <Navigate to={`/courses/${encodeURIComponent(slug ?? '')}`} replace />;

  return (
    <main className="section">
      <div className="container">
        <div className="page-topline">
          <Link className="button" to={`/courses/${encodeURIComponent(slug ?? '')}`}>
            ← Back to course
          </Link>
        </div>

        <SectionHeading badge="Learning" title={course?.title ?? title} subtitle="Course learning access (enrollment protected)." />

        {status === 'loading' ? <p className="muted">Loading course access…</p> : null}
        {status === 'error' ? <p className="form-error">{error}</p> : null}

        {status === 'ok' ? (
          <div className="grid" style={{ gap: 16 }}>
            <div className="panel">
              <h3 className="h3">Lessons</h3>
              {progressSummary ? (
                <p className="muted">
                  Progress: {progressSummary.progressPercentage ?? progressSummary.progress_percentage ?? 0}% (
                  {progressSummary.completedLessons ?? progressSummary.completed_lessons ?? 0}/
                  {progressSummary.totalLessons ?? progressSummary.total_lessons ?? lessons.length})
                </p>
              ) : (
                <p className="muted">Progress: {lessons.length ? '0%' : '—'}</p>
              )}

              {lessons.length ? (
                <ul className="list">
                  {lessons.map((l) => {
                    const selected = Number(l.id) === Number(activeLesson?.id);
                    const completed = Boolean(l?.progress?.completed_at);
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          className={`button button-ghost ${selected ? 'button-solid' : ''}`}
                          onClick={() => goToLesson(l.id)}
                        >
                          {completed ? '✓ ' : ''}
                          {l.title}
                        </button>
                        {userId ? (
                          <button
                            type="button"
                            className="button button-ghost"
                            style={{ marginLeft: 8 }}
                            onClick={() => cacheLessonForOffline({ userId, courseId: course?.id, lesson: l }).catch(() => null)}
                          >
                            Save offline
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">No lessons available yet.</p>
              )}
            </div>

            <div className="panel">
              <h3 className="h3">{activeLesson?.title ?? 'Lesson'}</h3>
              {activeLesson?.summary ? <p className="muted">{activeLesson.summary}</p> : null}
              {error ? <p className="form-error">{error}</p> : null}

              {activeLesson ? (
                <>
                  {activeLesson.lesson_type === 'video' && activeLesson.video_url ? (
                    <div style={{ marginTop: 12 }}>
                      <video ref={videoRef} controls preload="metadata" style={{ width: '100%', borderRadius: 12 }}>
                        <source src={activeLesson.video_url} />
                      </video>
                    </div>
                  ) : null}

                  {activeLesson.lesson_type === 'text' && activeLesson.content_html ? (
                    <div className="panel prose-block" style={{ marginTop: 12 }} dangerouslySetInnerHTML={{ __html: activeLesson.content_html }} />
                  ) : null}

                  {activeLesson.lesson_type === 'resource' && activeLesson.resource_url ? (
                    <div style={{ marginTop: 12 }}>
                      <a className="link" href={activeLesson.resource_url} target="_blank" rel="noreferrer">
                        Download resource
                      </a>
                    </div>
                  ) : null}

                  {!activeLesson.content_html && !activeLesson.video_url && !activeLesson.resource_url ? (
                    <p className="muted" style={{ marginTop: 12 }}>
                      Lesson content will appear here once it’s added.
                    </p>
                  ) : null}

                  {typeof navigator !== 'undefined' && navigator.onLine === false ? (
                    <div className="panel" style={{ marginTop: 12 }}>
                      <p className="muted" style={{ margin: 0 }}>
                        You’re offline. Some lesson types (video) may not load. Saved text/resources can still be opened.
                      </p>
                      {userId && course?.id && activeLesson?.id ? (
                        <button
                          className="button button-ghost"
                          type="button"
                          style={{ marginTop: 10 }}
                          onClick={async () => {
                            const cached = await getCachedLesson({ userId, courseId: course.id, lessonId: activeLesson.id });
                            if (!cached) setError('No offline copy saved for this lesson yet.');
                          }}
                        >
                          Check offline copy
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <button className="button button-ghost" type="button" onClick={() => prevLessonId && goToLesson(prevLessonId)} disabled={!prevLessonId}>
                      Previous
                    </button>
                    <button className="button button-ghost" type="button" onClick={() => nextLessonId && goToLesson(nextLessonId)} disabled={!nextLessonId}>
                      Next
                    </button>
                    <button className="button button-solid" type="button" onClick={completeLesson}>
                      Mark complete
                    </button>
                    {certificateId ? (
                      <Link className="button button-ghost" to={`/certificates/${encodeURIComponent(certificateId)}`}>
                        View certificate
                      </Link>
                    ) : null}
                  </div>

                  {isCourseCompleted ? (
                    <div style={{ marginTop: 12 }}>
                      <p className="muted">
                        Course completed. {certificateId ? 'Your certificate is ready.' : certificateStatus === 'unavailable' ? 'Certificate unavailable.' : 'Certificate is being issued.'}
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                        <Link className="button button-ghost" to="/certificates">
                          View all certificates
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className="panel" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <h4 className="h4" style={{ margin: 0 }}>Community</h4>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`button button-ghost${discussionTab === 'comments' ? ' button-solid' : ''}`}
                          onClick={() => {
                            setOpenQuestionId(null);
                            setDiscussionTab('comments');
                          }}
                        >
                          Comments
                        </button>
                        <button
                          type="button"
                          className={`button button-ghost${discussionTab === 'qa' ? ' button-solid' : ''}`}
                          onClick={() => setDiscussionTab('qa')}
                        >
                          Q&amp;A
                        </button>
                      </div>
                    </div>

                    {discussionTab === 'comments' ? (
                      <div style={{ marginTop: 12 }}>
                        {commentsError ? <p className="form-error">{commentsError}</p> : null}
                        {commentsStatus === 'loading' ? <p className="muted">Loading comments…</p> : null}
                        {commentsStatus !== 'loading' && !comments.length ? <p className="muted">Be the first to comment on this lesson.</p> : null}
                        {comments.length ? (
                          <ul className="list">
                            {comments.slice().reverse().map((c) => (
                              <li key={c.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                  <div style={{ minWidth: 0 }}>
                                    <strong>{c.author_name ?? 'Student'}</strong>
                                    <div className="muted" style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: c.body_html ?? '' }} />
                                  </div>
                                  <div className="muted" style={{ whiteSpace: 'nowrap' }}>
                                    {c.created_at ? String(c.created_at).slice(0, 10) : ''}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <div style={{ marginTop: 12 }}>
                          <label className="field">
                            <span className="field-label">Add a comment</span>
                            <textarea
                              className="input textarea"
                              rows={3}
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              placeholder="Share a question, tip, or what you’re baking today…"
                              disabled={commentSending}
                            />
                          </label>
                          <div className="button-row">
                            <button className="button button-solid" type="button" onClick={sendComment} disabled={commentSending || commentsStatus === 'loading'}>
                              {commentSending ? 'Posting…' : 'Post comment'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {discussionTab === 'qa' ? (
                      <div style={{ marginTop: 12 }}>
                        {qaError ? <p className="form-error">{qaError}</p> : null}
                        {qaStatus === 'loading' ? <p className="muted">Loading questions…</p> : null}

                        <div className="panel" style={{ marginTop: 12 }}>
                          <h4 className="h4">Ask a question</h4>
                          <label className="field">
                            <span className="field-label">Title</span>
                            <input className="input" value={questionTitle} onChange={(e) => setQuestionTitle(e.target.value)} disabled={questionSending} />
                          </label>
                          <label className="field">
                            <span className="field-label">Details</span>
                            <textarea className="input textarea" rows={4} value={questionBody} onChange={(e) => setQuestionBody(e.target.value)} disabled={questionSending} />
                          </label>
                          <div className="button-row">
                            <button className="button button-solid" type="button" onClick={sendQuestion} disabled={questionSending || qaStatus === 'loading'}>
                              {questionSending ? 'Posting…' : 'Post question'}
                            </button>
                          </div>
                        </div>

                        {!questions.length && qaStatus !== 'loading' ? <p className="muted" style={{ marginTop: 12 }}>No questions yet. Ask the first one.</p> : null}

                        {questions.length ? (
                          <ul className="list" style={{ marginTop: 12 }}>
                            {questions.map((q) => {
                              const open = Number(openQuestionId) === Number(q.id);
                              return (
                                <li key={q.id}>
                                  <button
                                    type="button"
                                    className={`button button-ghost${open ? ' button-solid' : ''}`}
                                    style={{ width: '100%', textAlign: 'left' }}
                                    onClick={() => setOpenQuestionId(open ? null : q.id)}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                      <div style={{ minWidth: 0 }}>
                                        <strong>{q.title}</strong>
                                        <div className="muted" style={{ marginTop: 4 }}>
                                          {q.author_name ? `by ${q.author_name}` : '—'} · {q.reply_count ? `${q.reply_count} replies` : 'no replies'}
                                        </div>
                                      </div>
                                      <div className="muted" style={{ whiteSpace: 'nowrap' }}>{q.updated_at ? String(q.updated_at).slice(0, 10) : ''}</div>
                                    </div>
                                  </button>

                                  {open ? (
                                    <div className="panel" style={{ marginTop: 10 }}>
                                      <div className="muted" dangerouslySetInnerHTML={{ __html: q.body_html ?? '' }} />
                                      {repliesError ? <p className="form-error" style={{ marginTop: 10 }}>{repliesError}</p> : null}
                                      {repliesStatus === 'loading' ? <p className="muted" style={{ marginTop: 10 }}>Loading replies…</p> : null}
                                      {repliesStatus !== 'loading' && !replies.length ? <p className="muted" style={{ marginTop: 10 }}>No replies yet.</p> : null}
                                      {replies.length ? (
                                        <ul className="list" style={{ marginTop: 10 }}>
                                          {replies.map((r) => (
                                            <li key={r.id}>
                                              <strong>{r.author_name ?? 'Student'}</strong>
                                              <div className="muted" style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: r.body_html ?? '' }} />
                                            </li>
                                          ))}
                                        </ul>
                                      ) : null}

                                      <div style={{ marginTop: 12 }}>
                                        <label className="field">
                                          <span className="field-label">Reply</span>
                                          <textarea className="input textarea" rows={3} value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} disabled={replySending} />
                                        </label>
                                        <div className="button-row">
                                          <button className="button button-solid" type="button" onClick={sendReply} disabled={replySending}>
                                            {replySending ? 'Posting…' : 'Post reply'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="panel" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <h4 className="h4" style={{ margin: 0 }}>AI assistant</h4>
                      <button className="button button-ghost" type="button" onClick={() => setAiOpen((v) => !v)}>
                        {aiOpen ? 'Hide' : 'Open'}
                      </button>
                    </div>
                    <p className="muted" style={{ marginTop: 8 }}>
                      Disabled in this build.
                    </p>

                    {aiOpen ? (
                      <div style={{ marginTop: 12 }}>
                        {aiError ? <p className="form-error">{aiError}</p> : null}
                        <button className="button button-solid" type="button" onClick={aiQuick}>
                          Learn more
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="muted">Select a lesson to begin.</p>
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
                            <a className="link" href={r.recording_url} target="_blank" rel="noreferrer">
                              Open recording
                            </a>
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
          </div>
        ) : null}
      </div>
    </main>
  );
}
