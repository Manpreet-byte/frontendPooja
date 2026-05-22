import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import ErrorBoundary from './components/ErrorBoundary';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Service workers can aggressively cache JS in ways that break Vite HMR and cause
  // "Invalid hook call" issues during development. Keep SW strictly production-only.
  if (import.meta.env.DEV) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  } else {
    window.addEventListener('load', () => {
      const base = import.meta.env.BASE_URL || '/';
      const swUrl = `${String(base).replace(/\/?$/, '/') }sw.js`.replace(/\/{2,}/g, '/');
      navigator.serviceWorker
        .register(swUrl)
        .catch(() => {
          // SW registration is best-effort.
        });
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
