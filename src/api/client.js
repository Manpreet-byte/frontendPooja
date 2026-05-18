function getBaseUrl() {
  const productionBackendUrl = 'https://loveandflourbackend.onrender.com';

  // Prefer Vite env override; otherwise use the deployed backend in production.
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (typeof configured === 'string' && configured.trim()) {
    let base = configured.trim().replace(/\/$/, '');
    // Avoid cookie/state issues caused by mixing `localhost` and `127.0.0.1` across auth/payment flows.
    // Treat them as equivalent and prefer the current page hostname when possible.
    try {
      if (typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        const u = new URL(base);
        if ((u.hostname === '127.0.0.1' || u.hostname === 'localhost') && (currentHost === '127.0.0.1' || currentHost === 'localhost')) {
          u.hostname = currentHost;
          base = u.toString().replace(/\/$/, '');
        }
      }
    } catch {
      // ignore
    }
    return base;
  }

  // In local development we rely on the Vite proxy (`/api -> http://127.0.0.1:8080`)
  // to avoid CORS and keep requests same-origin.
  if (import.meta.env.DEV) return '';

  // When serving a production build locally (no dev proxy), relative `/api/*` will 404.
  // If we're on localhost, default to the backend dev port.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8080';
  }

  return productionBackendUrl;
}

function getPersistedAuthState() {
  try {
    const raw = localStorage.getItem('love-and-flour-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

function getAccessToken() {
  return getPersistedAuthState()?.token || '';
}

function setAccessToken(token) {
  try {
    const raw = localStorage.getItem('love-and-flour-auth');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    parsed.state = { ...(parsed.state ?? {}), token };
    localStorage.setItem('love-and-flour-auth', JSON.stringify(parsed));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lf:auth_token', { detail: { token } }));
    }
  } catch {
    // ignore
  }
}

async function refreshAccessToken() {
  const res = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) return null;
  const token = data?.token;
  if (token) setAccessToken(token);
  return token || null;
}

async function request(path, { method = 'GET', body, token, _retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const resolvedToken = token ?? getAccessToken();
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

  let res;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
  } catch (err) {
    const e = new Error('Network error. Please check your connection and try again.');
    e.offline = typeof navigator !== 'undefined' ? navigator.onLine === false : false;
    e.cause = err;
    throw e;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  // Retry once after silent refresh (refresh token is HttpOnly cookie).
  if (res.status === 401 && _retry && path !== '/api/auth/refresh') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request(path, { method, body, token: newToken, _retry: false });
    }
  }

  if (!res.ok) {
    const message = data?.error?.message ?? `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function download(path, { token } = {}) {
  const resolvedToken = token ?? getAccessToken();
  const headers = {};
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.blob();
}

async function uploadFormData(path, formData, { token } = {}) {
  const resolvedToken = token ?? getAccessToken();
  const headers = {};
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

  let res;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
  } catch (err) {
    const e = new Error('Network error. Please check your connection and try again.');
    e.offline = typeof navigator !== 'undefined' ? navigator.onLine === false : false;
    e.cause = err;
    throw e;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message ?? `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  analytics: {
    track: async ({ event_type, entity_type, entity_id, metadata } = {}) => {
      try {
        return await request('/api/analytics/track', {
          method: 'POST',
          body: { event_type, entity_type: entity_type ?? null, entity_id: entity_id ?? null, metadata: metadata ?? null },
          _retry: false,
        });
      } catch {
        return null;
      }
    },
  },
  auth: {
    signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
    login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
    refresh: () => request('/api/auth/refresh', { method: 'POST', _retry: false }),
    logout: () => request('/api/auth/logout', { method: 'POST', _retry: false }),
    googleStartUrl: ({ mode = 'login' } = {}) => {
      const url = new URL(`${getBaseUrl()}/api/auth/google/start`);
      if (mode) url.searchParams.set('mode', String(mode));
      return url.toString();
    },
  },
  user: {
    dashboard: (token) => request('/api/user/dashboard', { token }),
    activity: (token) => request('/api/user/activity', { token }),
    courses: {
      list: (token, { include_expired, include_inactive } = {}) => {
        const params = new URLSearchParams();
        if (include_expired) params.set('include_expired', '1');
        if (include_inactive) params.set('include_inactive', '1');
        const qs = params.toString();
        return request(qs ? `/api/user/courses?${qs}` : '/api/user/courses', { token });
      },
    },
    recordings: {
      // Prefer `/api/user/recordings`; fallback to legacy `/api/feed/recordings`.
      list: async (token) => {
        try {
          return await request('/api/user/recordings', { token });
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
        return request('/api/feed/recordings', { token });
      },
    },
    lessons: {
      listForCourse: (token, courseId) => request(`/api/user/courses/${encodeURIComponent(courseId)}/lessons`, { token }),
      start: (token, lessonId, payload) =>
        request(`/api/user/lessons/${encodeURIComponent(lessonId)}/start`, { method: 'POST', token, body: payload ?? {} }),
      complete: (token, lessonId) => request(`/api/user/lessons/${encodeURIComponent(lessonId)}/complete`, { method: 'POST', token }),
    },
    progress: {
      course: (token, courseId) => request(`/api/user/progress/${encodeURIComponent(courseId)}`, { token }),
    },
    certificates: {
      list: (token) => request('/api/user/certificates', { token }),
      // Prefer `:id` route; keep `byCourse` for older UI flows (courseId).
      get: (token, id) => request(`/api/user/certificates/${encodeURIComponent(id)}`, { token }),
      byCourse: async (token, courseId) => {
        // Some backends return certificate by course id at `/:id`. If not, list and match.
        try {
          return await request(`/api/user/certificates/${encodeURIComponent(courseId)}`, { token });
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
        const data = await request('/api/user/certificates', { token });
        const list = data?.certificates ?? [];
        const match =
          list.find((c) => Number(c?.course_id ?? c?.course?.id) === Number(courseId)) ??
          list.find((c) => String(c?.course_slug ?? c?.course?.slug ?? '') === String(courseId));
        return { certificate: match ?? null, certificates: list };
      },
      downloadBlob: async (token, id) => download(`/api/user/certificates/${encodeURIComponent(id)}/download`, { token }),
    },
    notifications: {
      list: (token, { limit, cursor, notification_type } = {}) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (cursor) params.set('cursor', String(cursor));
        if (notification_type) params.set('notification_type', String(notification_type));
        const qs = params.toString();
        return request(qs ? `/api/user/notifications?${qs}` : '/api/user/notifications', { token });
      },
      read: (token, id) => request(`/api/user/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', token }),
      readAll: (token, { notification_type } = {}) => {
        const params = new URLSearchParams();
        if (notification_type) params.set('notification_type', String(notification_type));
        const qs = params.toString();
        return request(qs ? `/api/user/notifications/read-all?${qs}` : '/api/user/notifications/read-all', { method: 'PATCH', token });
      },
    },
    preferences: {
      get: (token) => request('/api/user/preferences', { token }),
      patch: (token, payload) => request('/api/user/preferences', { method: 'PATCH', token, body: payload }),
    },
    offlineSync: (token) => request('/api/user/offline-sync', { token }),
    offlineProgressSync: (token, payload) => request('/api/user/offline-progress-sync', { method: 'POST', token, body: payload }),
    pushSubscribe: (token, payload) => request('/api/user/push/subscribe', { method: 'POST', token, body: payload }),
    pushUnsubscribe: (token, payload) => request('/api/user/push/unsubscribe', { method: 'POST', token, body: payload }),
  },
  recommendations: {
    mine: (token) => request('/api/user/recommendations', { token }),
  },
  instructor: {
    dashboard: (token) => request('/api/instructor/dashboard', { token }),
    analytics: (token) => request('/api/instructor/analytics', { token }),
    students: (token) => request('/api/instructor/students', { token }),
    earnings: (token) => request('/api/instructor/earnings', { token }),
  },
  public: {
    courses: {
      list: () => request('/api/public/courses'),
      detail: (slug) => request(`/api/public/courses/${encodeURIComponent(slug)}`),
    },
    workshops: {
      list: () => request('/api/public/workshops'),
      detail: (slug) => request(`/api/public/workshops/${encodeURIComponent(slug)}`),
    },
    trendingCourses: () => request('/api/public/trending-courses'),
    recipes: {
      list: () => request('/api/public/recipes'),
      detail: (slug) => request(`/api/public/recipes/${encodeURIComponent(slug)}`),
      search: ({ q, category } = {}) => {
        const params = new URLSearchParams();
        if (q) params.set('q', String(q));
        if (category) params.set('category', String(category));
        const qs = params.toString();
        return request(qs ? `/api/public/recipes/search?${qs}` : '/api/public/recipes/search');
      },
    },
    recipeCategories: {
      // Back-compat: some backends expose recipe categories via `/api/public/categories?type=recipe`.
      list: async () => {
        try {
          return await request('/api/public/recipe-categories');
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
        return request('/api/public/categories?type=recipe');
      },
    },
    categories: {
      list: (type) => request(type ? `/api/public/categories?type=${encodeURIComponent(type)}` : '/api/public/categories'),
    },
    certificates: {
      verify: (certificateCode) => request(`/api/certificates/verify/${encodeURIComponent(certificateCode)}`),
    },
    content: {
      homepage: () => request('/api/public/content/homepage'),
      about: () => request('/api/public/content/about'),
    },
    testimonials: {
      list: () => request('/api/public/testimonials'),
    },
    faqs: {
      list: () => request('/api/public/faqs'),
    },
    announcements: {
      list: () => request('/api/public/announcements'),
    },
    gallery: {
      list: () => request('/api/public/gallery'),
    },
    legal: {
      get: (slug) => request(`/api/public/legal/${encodeURIComponent(slug)}`),
    },
    seo: {
      get: (page) => request(`/api/public/seo/${encodeURIComponent(page)}`),
    },
    newsletter: {
      subscribe: (payload) => request('/api/public/newsletter/subscribe', { method: 'POST', body: payload, _retry: false }),
    },
    contact: {
      send: (payload) => request('/api/public/contact', { method: 'POST', body: payload, _retry: false }),
    },
    liveSessions: {
      list: () => request('/api/public/live-sessions'),
      detail: (slug) => request(`/api/public/live-sessions/${encodeURIComponent(slug)}`),
    },
  },
  community: {
    questions: {
      listForCourse: (token, courseId, { limit, cursor } = {}) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (cursor) params.set('cursor', String(cursor));
        const qs = params.toString();
        return request(qs ? `/api/courses/${encodeURIComponent(courseId)}/questions?${qs}` : `/api/courses/${encodeURIComponent(courseId)}/questions`, { token });
      },
      create: (token, courseId, payload) =>
        request(`/api/courses/${encodeURIComponent(courseId)}/questions`, { method: 'POST', token, body: payload }),
      patch: (token, id, payload) => request(`/api/questions/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, id) => request(`/api/questions/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      replies: {
        get: (token, questionId) => request(`/api/questions/${encodeURIComponent(questionId)}/replies`, { token }),
        create: (token, questionId, payload) =>
          request(`/api/questions/${encodeURIComponent(questionId)}/replies`, { method: 'POST', token, body: payload }),
        remove: (token, replyId) => request(`/api/replies/${encodeURIComponent(replyId)}`, { method: 'DELETE', token }),
      },
    },
    comments: {
      listForLesson: (token, lessonId) => request(`/api/lessons/${encodeURIComponent(lessonId)}/comments`, { token }),
      create: (token, lessonId, payload) =>
        request(`/api/lessons/${encodeURIComponent(lessonId)}/comments`, { method: 'POST', token, body: payload }),
      remove: (token, commentId) => request(`/api/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE', token }),
    },
  },
  support: {
    tickets: {
      listMine: (token, { limit, cursor } = {}) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (cursor) params.set('cursor', String(cursor));
        const qs = params.toString();
        return request(qs ? `/api/support/tickets?${qs}` : '/api/support/tickets', { token });
      },
      create: (token, payload) => request('/api/support/tickets', { method: 'POST', token, body: payload }),
      get: (token, id) => request(`/api/support/tickets/${encodeURIComponent(id)}`, { token }),
      postMessage: (token, id, payload) =>
        request(`/api/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', token, body: payload }),
    },
  },
  liveSessions: {
    listMine: (token) => request('/api/user/live-sessions', { token }),
    access: async (token, id) => {
      try {
        return await request(`/api/user/live-sessions/${encodeURIComponent(id)}/access`, { token });
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
      return null;
    },
  },
  recordings: {
    get: (token, id) => request(`/api/recordings/${encodeURIComponent(id)}`, { token }),
  },
  admin: {
    bootstrap: (payload) => request('/api/admin/bootstrap', { method: 'POST', body: payload }),
    dashboard: (token) => request('/api/admin/dashboard', { token }),
    analytics: {
      dashboard: (token) => request('/api/admin/analytics/dashboard', { token }),
      revenue: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/revenue?${qs}` : '/api/admin/analytics/revenue', { token });
      },
      users: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/users?${qs}` : '/api/admin/analytics/users', { token });
      },
      conversions: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/conversions?${qs}` : '/api/admin/analytics/conversions', { token });
      },
      topCourses: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/top-courses?${qs}` : '/api/admin/analytics/top-courses', { token });
      },
      ordersSummary: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/orders-summary?${qs}` : '/api/admin/analytics/orders-summary', { token });
      },
      enrollments: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/enrollments?${qs}` : '/api/admin/analytics/enrollments', { token });
      },
      retention: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/retention?${qs}` : '/api/admin/analytics/retention', { token });
      },
      qa: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/qa?${qs}` : '/api/admin/analytics/qa', { token });
      },
      support: (token, { from, to } = {}) => {
        const params = new URLSearchParams();
        if (from) params.set('from', String(from));
        if (to) params.set('to', String(to));
        const qs = params.toString();
        return request(qs ? `/api/admin/analytics/support?${qs}` : '/api/admin/analytics/support', { token });
      },
    },
    createAdmin: (token, payload) => request('/api/admin/admins', { method: 'POST', token, body: payload }),
    super: {
      admins: {
        list: (token) => request('/api/admin/super/admins', { token }),
        revoke: (token, id) => request(`/api/admin/super/admins/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
        resetPassword: (token, id, payload) =>
          request(`/api/admin/super/admins/${encodeURIComponent(id)}/reset-password`, { method: 'POST', token, body: payload }),
      },
      transfer: (token, payload) => request('/api/admin/super/transfer-super-admin', { method: 'POST', token, body: payload }),
    },
    system: {
      health: (token) => request('/api/admin/system/health', { token }),
      metrics: (token) => request('/api/admin/system/metrics', { token }),
    },
    support: {
      tickets: {
        list: (token, { status, category, q, page, limit } = {}) => {
          const params = new URLSearchParams();
          if (status) params.set('status', String(status));
          if (category) params.set('category', String(category));
          if (q) params.set('q', String(q));
          if (page) params.set('page', String(page));
          if (limit) params.set('limit', String(limit));
          const qs = params.toString();
          return request(qs ? `/api/admin/support/tickets?${qs}` : '/api/admin/support/tickets', { token });
        },
        get: (token, id) => request(`/api/admin/support/tickets/${encodeURIComponent(id)}`, { token }),
        patch: (token, id, payload) => request(`/api/admin/support/tickets/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
        postMessage: (token, id, payload) =>
          request(`/api/admin/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', token, body: payload }),
      },
      analytics: (token, { days } = {}) => request(days ? `/api/admin/support/analytics?days=${encodeURIComponent(days)}` : '/api/admin/support/analytics', { token }),
    },
    instructors: {
      list: (token) => request('/api/admin/instructors', { token }),
      create: (token, payload) => request('/api/admin/instructors', { method: 'POST', token, body: payload }),
      patch: (token, id, payload) => request(`/api/admin/instructors/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
    },
    courseTeam: {
      list: (token, courseId) => request(`/api/admin/courses/${encodeURIComponent(courseId)}/team`, { token }),
      add: (token, courseId, payload) => request(`/api/admin/courses/${encodeURIComponent(courseId)}/team`, { method: 'POST', token, body: payload }),
      patch: (token, courseId, memberId, payload) =>
        request(`/api/admin/courses/${encodeURIComponent(courseId)}/team/${encodeURIComponent(memberId)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, courseId, memberId) =>
        request(`/api/admin/courses/${encodeURIComponent(courseId)}/team/${encodeURIComponent(memberId)}`, { method: 'DELETE', token }),
    },
    courseWorkflow: {
      set: (token, courseId, payload) => request(`/api/admin/courses/${encodeURIComponent(courseId)}/workflow`, { method: 'PATCH', token, body: payload }),
      feedbackList: (token, courseId) => request(`/api/admin/courses/${encodeURIComponent(courseId)}/feedback`, { token }),
      feedbackAdd: (token, courseId, payload) => request(`/api/admin/courses/${encodeURIComponent(courseId)}/feedback`, { method: 'POST', token, body: payload }),
    },
    internalNotes: {
      list: (token, { entity_type, entity_id } = {}) => {
        const params = new URLSearchParams();
        if (entity_type) params.set('entity_type', String(entity_type));
        if (entity_id) params.set('entity_id', String(entity_id));
        const qs = params.toString();
        return request(qs ? `/api/admin/internal-notes?${qs}` : '/api/admin/internal-notes', { token });
      },
      create: (token, payload) => request('/api/admin/internal-notes', { method: 'POST', token, body: payload }),
    },

    settings: {
      get: (token) => request('/api/admin/settings', { token }),
      patch: (token, payload) => request('/api/admin/settings', { method: 'PATCH', token, body: payload }),
    },

    payments: {
      razorpay: {
        get: (token) => request('/api/admin/payments/razorpay', { token }),
        patch: (token, payload) => request('/api/admin/payments/razorpay', { method: 'PATCH', token, body: payload }),
      },
    },

    discountRules: {
      list: (token) => request('/api/admin/discount-rules', { token }),
      create: (token, payload) => request('/api/admin/discount-rules', { method: 'POST', token, body: payload }),
      patch: (token, id, payload) => request(`/api/admin/discount-rules/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, id) => request(`/api/admin/discount-rules/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
    },

    notifications: {
      broadcast: (token, payload) => request('/api/admin/notifications/broadcast', { method: 'POST', token, body: payload }),
      push: (token, payload) => request('/api/admin/notifications/push', { method: 'POST', token, body: payload }),
    },

    emails: {
      stats: (token) => request('/api/admin/emails/stats', { token }),
      outbox: (token, { status, q, limit, offset } = {}) => {
        const params = new URLSearchParams();
        if (status) params.set('status', String(status));
        if (q) params.set('q', String(q));
        if (limit) params.set('limit', String(limit));
        if (offset) params.set('offset', String(offset));
        const qs = params.toString();
        return request(qs ? `/api/admin/emails/outbox?${qs}` : '/api/admin/emails/outbox', { token });
      },
      resend: (token, id) => request(`/api/admin/emails/outbox/${encodeURIComponent(id)}/resend`, { method: 'POST', token }),
    },

    media: {
      upload: async (token, file, { isPublic = true } = {}) => {
        const fd = new FormData();
        fd.append('file', file);
        if (isPublic) fd.append('is_public', '1');
        return uploadFormData('/api/admin/media/upload', fd, { token });
      },
      publicFileUrl: (id) => `${getBaseUrl()}/api/media/${encodeURIComponent(id)}/file`,
    },

    courses: {
      list: (token, { kind, source } = {}) => {
        const params = new URLSearchParams();
        if (kind) params.set('kind', String(kind));
        if (source) params.set('source', String(source));
        const qs = params.toString();
        return request(qs ? `/api/admin/courses?${qs}` : '/api/admin/courses', { token });
      },
      create: (token, payload) => request('/api/admin/courses', { method: 'POST', token, body: payload }),
      update: (token, id, payload) => request(`/api/admin/courses/${id}`, { method: 'PATCH', token, body: payload }),
      progress: (token, id) => request(`/api/admin/courses/${encodeURIComponent(id)}/progress`, { token }),
      remove: (token, id) => request(`/api/admin/courses/${id}`, { method: 'DELETE', token }),
    },

    imports: {
      loveAndFlour: (token, payload = {}) => request('/api/admin/imports/loveandflour', { method: 'POST', token, body: payload }),
      loveAndFlourPreview: (token, payload = {}) =>
        request('/api/admin/imports/loveandflour/preview', { method: 'POST', token, body: payload }),
    },

    categories: {
      list: (token, type, { source } = {}) => {
        const params = new URLSearchParams();
        if (type) params.set('type', String(type));
        if (source) params.set('source', String(source));
        const qs = params.toString();
        return request(qs ? `/api/admin/categories?${qs}` : '/api/admin/categories', { token });
      },
      create: (token, payload) => request('/api/admin/categories', { method: 'POST', token, body: payload }),
      remove: (token, id) => request(`/api/admin/categories/${id}`, { method: 'DELETE', token }),
    },

    recipes: {
      list: (token, arg) => {
        let categoryId = null;
        let source = '';
        if (arg && typeof arg === 'object') {
          categoryId = arg.categoryId ?? arg.category_id ?? null;
          source = arg.source ?? '';
        } else if (arg != null) {
          categoryId = arg;
        }
        const params = new URLSearchParams();
        if (categoryId) params.set('category_id', String(categoryId));
        if (source) params.set('source', String(source));
        const qs = params.toString();
        return request(qs ? `/api/admin/recipes?${qs}` : '/api/admin/recipes', { token });
      },
      create: (token, payload) => request('/api/admin/recipes', { method: 'POST', token, body: payload }),
      update: (token, id, payload) => request(`/api/admin/recipes/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, id) => request(`/api/admin/recipes/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
    },

    tags: {
      list: (token, { type = 'recipe' } = {}) => {
        const params = new URLSearchParams();
        if (type) params.set('type', String(type));
        const qs = params.toString();
        return request(qs ? `/api/admin/tags?${qs}` : '/api/admin/tags', { token });
      },
      create: (token, payload) => request('/api/admin/tags', { method: 'POST', token, body: payload }),
      remove: (token, id) => request(`/api/admin/tags/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
    },

    orders: {
      list: (token, { status, q, page, limit } = {}) => {
        const params = new URLSearchParams();
        if (status) params.set('status', String(status));
        if (q) params.set('q', String(q));
        if (page) params.set('page', String(page));
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        return request(qs ? `/api/admin/orders?${qs}` : '/api/admin/orders', { token });
      },
      get: (token, id) => request(`/api/admin/orders/${encodeURIComponent(id)}`, { token }),
      update: (token, id, payload) => request(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
      reconcile: (token, id) => request(`/api/admin/orders/${encodeURIComponent(id)}/reconcile`, { method: 'POST', token }),
      refund: (token, id, payload) => request(`/api/admin/orders/${encodeURIComponent(id)}/refund`, { method: 'POST', token, body: payload }),
      invoice: (token, id) => download(`/api/admin/orders/${encodeURIComponent(id)}/invoice`, { token }),
    },

    coupons: {
      list: (token, { q, active, limit } = {}) => {
        const params = new URLSearchParams();
        if (q) params.set('q', String(q));
        if (active !== undefined && active !== null) params.set('active', String(Boolean(active)));
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        return request(qs ? `/api/admin/coupons?${qs}` : '/api/admin/coupons', { token });
      },
      create: (token, payload) => request('/api/admin/coupons', { method: 'POST', token, body: payload }),
      update: (token, id, payload) => request(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, id) => request(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
    },

    liveSessions: {
      list: (token, courseId) =>
        request(courseId ? `/api/admin/live-sessions?course_id=${encodeURIComponent(courseId)}` : '/api/admin/live-sessions', { token }),
      create: (token, payload) => request('/api/admin/live-sessions', { method: 'POST', token, body: payload }),
      update: (token, id, payload) => request(`/api/admin/live-sessions/${id}`, { method: 'PATCH', token, body: payload }),
      remove: async (token, id) => {
        try {
          return await request(`/api/admin/live-sessions/${encodeURIComponent(id)}`, { method: 'DELETE', token });
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
        return null;
      },
    },

    recordings: {
      list: (token, courseId) =>
        request(courseId ? `/api/admin/recordings?course_id=${encodeURIComponent(courseId)}` : '/api/admin/recordings', { token }),
      create: (token, payload) => request('/api/admin/recordings', { method: 'POST', token, body: payload }),
      update: async (token, id, payload) => {
        try {
          return await request(`/api/admin/recordings/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload });
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
        return null;
      },
    },

    users: {
      list: (token, { limit, offset } = {}) => {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        if (offset) params.set('offset', String(offset));
        const qs = params.toString();
        return request(qs ? `/api/admin/users?${qs}` : '/api/admin/users', { token });
      },
      impersonate: (token, id) => request(`/api/admin/users/${encodeURIComponent(id)}/impersonate`, { method: 'POST', token }),
    },

    enrollments: {
      list: (token) => request('/api/admin/enrollments', { token }),
      create: (token, payload) => request('/api/admin/enrollments', { method: 'POST', token, body: payload }),
      patch: (token, id, payload) => request(`/api/admin/enrollments/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, id) => request(`/api/admin/enrollments/${id}`, { method: 'DELETE', token }),
    },

    lessons: {
      listForCourse: (token, courseId) => request(`/api/admin/courses/${encodeURIComponent(courseId)}/lessons`, { token }),
      createForCourse: (token, courseId, payload) =>
        request(`/api/admin/courses/${encodeURIComponent(courseId)}/lessons`, { method: 'POST', token, body: payload }),
      get: (token, lessonId) => request(`/api/admin/lessons/${encodeURIComponent(lessonId)}`, { token }),
      update: (token, lessonId, payload) =>
        request(`/api/admin/lessons/${encodeURIComponent(lessonId)}`, { method: 'PATCH', token, body: payload }),
      remove: (token, lessonId) => request(`/api/admin/lessons/${encodeURIComponent(lessonId)}`, { method: 'DELETE', token }),
      reorder: (token, payload) => request('/api/admin/lessons/reorder', { method: 'PUT', token, body: payload }),
    },

    // CMS / Content & Media (admin-only).
    cms: {
      getHomepage: (token) => request('/api/admin/content/homepage', { token }),
      patchHomepage: (token, payload) => request('/api/admin/content/homepage', { method: 'PATCH', token, body: payload }),
      getAbout: (token) => request('/api/admin/content/about', { token }),
      patchAbout: (token, payload) => request('/api/admin/content/about', { method: 'PATCH', token, body: payload }),
      testimonials: {
        list: (token) => request('/api/admin/testimonials', { token }),
        create: (token, payload) => request('/api/admin/testimonials', { method: 'POST', token, body: payload }),
        update: (token, id, payload) => request(`/api/admin/testimonials/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
        remove: (token, id) => request(`/api/admin/testimonials/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      },
      faqs: {
        list: (token) => request('/api/admin/faqs', { token }),
        create: (token, payload) => request('/api/admin/faqs', { method: 'POST', token, body: payload }),
        update: (token, id, payload) => request(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
        remove: (token, id) => request(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      },
      announcements: {
        list: (token) => request('/api/admin/announcements', { token }),
        create: (token, payload) => request('/api/admin/announcements', { method: 'PATCH', token, body: payload }),
      },
      legal: {
        patch: (token, slug, payload) => request(`/api/admin/legal/${encodeURIComponent(slug)}`, { method: 'PATCH', token, body: payload }),
      },
      seo: {
        patch: (token, page, payload) => request(`/api/admin/seo/${encodeURIComponent(page)}`, { method: 'PATCH', token, body: payload }),
      },
      gallery: {
        list: (token) => request('/api/admin/gallery', { token }),
        create: (token, payload) => request('/api/admin/gallery', { method: 'POST', token, body: payload }),
        remove: (token, id) => request(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      },
      newsletter: {
        subscribers: (token) => request('/api/admin/newsletter/subscribers', { token }),
      },
      media: {
        uploadUrl: () => `${getBaseUrl()}/api/admin/media/upload`,
        listForUser: (token, userId) => request(`/api/admin/media/user/${encodeURIComponent(userId)}`, { token }),
      },
    },
  },
  profile: {
    me: (token) => request('/api/profile', { token }),
    update: (token, payload) => request('/api/profile', { method: 'PATCH', token, body: payload }),
  },
  feed: {
    enrollments: (token) => request('/api/feed/enrollments', { token }),
    recordings: (token) => request('/api/feed/recordings', { token }),
  },
  orders: {
    // Prefer `/api/user/orders` (current production shape); fallback to legacy `/api/orders`.
    create: async (token, payload) => {
      try {
        return await request('/api/payments/checkout', { method: 'POST', token, body: payload });
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
      return request('/api/orders', { method: 'POST', token, body: payload });
    },
    get: async (token, orderId) => {
      const id = encodeURIComponent(orderId);
      try {
        return await request(`/api/user/orders/${id}`, { token });
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
      return request(`/api/orders/${id}`, { token });
    },
    listMine: async (token) => {
      try {
        return await request('/api/user/orders', { token });
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
      // Legacy backend did not have a list endpoint; return empty.
      return { orders: [] };
    },
    invoiceBlob: async (token, orderId) => {
      const id = encodeURIComponent(orderId);
      // Try both shapes; whichever exists in the backend.
      try {
        return await download(`/api/user/orders/${id}/invoice`, { token });
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
      return download(`/api/orders/${id}/invoice`, { token });
    },
  },
  coupons: {
    validate: (token, payload) => request('/api/coupons/validate', { method: 'POST', token, body: payload }),
  },
  payments: {
    checkout: (token, payload) => request('/api/payments/checkout', { method: 'POST', token, body: payload }),
    verify: async (token, payload) => {
      try {
        return await request('/api/payments/verify', { method: 'POST', token, body: payload });
      } catch (err) {
        if (err?.status !== 404) throw err;
      }
      return null;
    },
    cms: {
      getHomepage: (token) => request('/api/admin/content/homepage', { token }),
      patchHomepage: (token, payload) => request('/api/admin/content/homepage', { method: 'PATCH', token, body: payload }),
      getAbout: (token) => request('/api/admin/content/about', { token }),
      patchAbout: (token, payload) => request('/api/admin/content/about', { method: 'PATCH', token, body: payload }),
      testimonials: {
        list: (token) => request('/api/admin/testimonials', { token }),
        create: (token, payload) => request('/api/admin/testimonials', { method: 'POST', token, body: payload }),
        update: (token, id, payload) => request(`/api/admin/testimonials/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
        remove: (token, id) => request(`/api/admin/testimonials/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      },
      faqs: {
        list: (token) => request('/api/admin/faqs', { token }),
        create: (token, payload) => request('/api/admin/faqs', { method: 'POST', token, body: payload }),
        update: (token, id, payload) => request(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload }),
        remove: (token, id) => request(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      },
      announcements: {
        list: (token) => request('/api/admin/announcements', { token }),
        create: (token, payload) => request('/api/admin/announcements', { method: 'PATCH', token, body: payload }),
      },
      legal: {
        patch: (token, slug, payload) => request(`/api/admin/legal/${encodeURIComponent(slug)}`, { method: 'PATCH', token, body: payload }),
      },
      seo: {
        patch: (token, page, payload) => request(`/api/admin/seo/${encodeURIComponent(page)}`, { method: 'PATCH', token, body: payload }),
      },
      gallery: {
        list: (token) => request('/api/admin/gallery', { token }),
        create: (token, payload) => request('/api/admin/gallery', { method: 'POST', token, body: payload }),
        remove: (token, id) => request(`/api/admin/gallery/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
      },
      newsletter: {
        subscribers: (token) => request('/api/admin/newsletter/subscribers', { token }),
      },
      media: {
        uploadUrl: () => `${getBaseUrl()}/api/admin/media/upload`,
        listForUser: (token, userId) => request(`/api/admin/media/user/${encodeURIComponent(userId)}`, { token }),
      },
    },
  },
};
