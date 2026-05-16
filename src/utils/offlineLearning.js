import { idbDelete, idbGet, idbListByIndex, idbPut } from './idb';
import { api } from '../api/client';

function lessonKey({ userId, courseId, lessonId }) {
  return `${userId}:${courseId}:${lessonId}`;
}

function queueId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function cacheLessonForOffline({ userId, courseId, lesson }) {
  if (!userId || !courseId || !lesson?.id) return;
  const entry = {
    key: lessonKey({ userId, courseId, lessonId: lesson.id }),
    user_id: userId,
    course_id: courseId,
    lesson_id: Number(lesson.id),
    title: lesson.title ?? '',
    lesson_type: lesson.lesson_type ?? '',
    // Only cache safe content:
    content_html: lesson.lesson_type === 'text' ? lesson.content_html ?? '' : '',
    resource_url: lesson.lesson_type === 'resource' ? lesson.resource_url ?? '' : '',
    updated_at: new Date().toISOString(),
  };
  return idbPut('offline_lessons', entry);
}

export async function getCachedLesson({ userId, courseId, lessonId }) {
  const key = lessonKey({ userId, courseId, lessonId });
  return idbGet('offline_lessons', key);
}

export async function listCachedLessonsForCourse({ userId, courseId }) {
  const list = await idbListByIndex('offline_lessons', 'by_user', userId, { limit: 500 });
  return list.filter((x) => Number(x.course_id) === Number(courseId));
}

export async function enqueueOfflineProgressEvent({ userId, event }) {
  const id = queueId();
  const row = {
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
    event,
  };
  await idbPut('sync_queue', row);
  return id;
}

export async function flushOfflineProgressQueue({ token, userId }) {
  if (!token || !userId) return { ok: false };
  const items = await idbListByIndex('sync_queue', 'by_user', userId, { limit: 200 });
  if (!items.length) return { ok: true, synced: 0 };
  const payload = {
    events: items.map((i) => ({ client_event_id: i.id, ...i.event })),
  };
  const result = await api.user.offlineProgressSync(token, payload);
  const okIds = new Set((result?.results ?? []).filter((r) => r.ok).map((r) => r.client_event_id));
  await Promise.all(items.filter((i) => okIds.has(i.id)).map((i) => idbDelete('sync_queue', i.id)));
  return { ok: true, synced: okIds.size, total: items.length, result };
}

