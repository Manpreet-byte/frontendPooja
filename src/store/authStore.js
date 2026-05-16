import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: '',
      user: null,
      status: 'idle',
      error: '',
      hydrated: false,

      isAuthed: () => Boolean(get().token),

      login: async (payload) => {
        set({ status: 'loading', error: '' });
        try {
          const data = await api.auth.login(payload);
          set({ token: data.token, user: data.user, status: 'idle' });
          return data;
        } catch (err) {
          set({ status: 'idle', error: err?.message ?? 'Login failed' });
          throw err;
        }
      },

      signup: async (payload) => {
        set({ status: 'loading', error: '' });
        try {
          const data = await api.auth.signup(payload);
          set({ token: data.token, user: data.user, status: 'idle' });
          return data;
        } catch (err) {
          set({ status: 'idle', error: err?.message ?? 'Signup failed' });
          throw err;
        }
      },

      hydrateSession: async () => {
        if (get().hydrated) return;
        // App bootstrap:
        // 1) if token exists -> validate via /api/profile
        // 2) else (or if invalid) -> silent refresh via cookie, then validate
        set({ status: 'loading', error: '' });
        const finalize = (next) => set({ ...next, status: 'idle', hydrated: true });
        try {
          const existingToken = get().token;
          if (existingToken) {
            const prevUser = get().user;
            const user = await get().refreshProfile();
            if (user) return finalize({ user, token: existingToken });
            // If profile fetch failed for non-auth reasons, keep the existing session and retry later.
            if (prevUser) return finalize({ user: prevUser, token: existingToken });
          }

          // Try silent refresh (HttpOnly cookie).
          const refresh = await api.auth.refresh().catch(() => null);
          const nextToken = refresh?.token;
          const nextUser = refresh?.user ?? null;

          if (nextToken) {
            set({ token: nextToken, user: nextUser, status: 'loading', error: '' });
            const user = await get().refreshProfile();
            if (user) return finalize({ user, token: nextToken });
          }

          return finalize({ token: '', user: null });
        } catch {
          // Do not aggressively clear session on transient errors when we still have a token.
          const existingToken = get().token;
          if (existingToken) return finalize({ token: existingToken, user: get().user });
          return finalize({ token: '', user: null });
        }
      },

      refreshProfile: async () => {
        const token = get().token;
        if (!token) return null;
        set({ status: 'loading', error: '' });
        try {
          const data = await api.profile.me(token);
          set({ user: data.user, status: 'idle' });
          return data.user;
        } catch (err) {
          if (err?.status === 401) {
            // Token may be expired; try silent refresh and re-validate once.
            try {
              const refresh = await api.auth.refresh();
              if (refresh?.token) {
                set({ token: refresh.token, user: refresh.user ?? null, status: 'loading', error: '' });
                const retry = await api.profile.me(refresh.token);
                set({ user: retry.user, status: 'idle' });
                return retry.user;
              }
            } catch {
              // ignore
            }
            set({ token: '', user: null, status: 'idle', error: '' });
            return null;
          }
          // Transient failures should not log out the user on refresh.
          set({ status: 'idle', error: err?.message ?? 'Failed to load profile' });
          return get().user ?? null;
        }
      },

      logout: async () => {
        set({ status: 'loading', error: '' });
        try {
          await api.auth.logout();
        } catch {
          // ignore
        } finally {
          set({ token: '', user: null, error: '', status: 'idle' });
        }
      },

      setSession: ({ token, user }) => set({ token: token ?? '', user: user ?? null, status: 'idle', error: '' }),
    }),
    {
      name: 'love-and-flour-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

// Keep zustand state in sync if the API client refreshes the token (no circular import).
if (typeof window !== 'undefined') {
  window.addEventListener('lf:auth_token', (event) => {
    const token = event?.detail?.token;
    if (typeof token === 'string' && token) {
      const state = useAuthStore.getState();
      if (state.token !== token) state.setSession({ token, user: state.user });
    }
  });
}
