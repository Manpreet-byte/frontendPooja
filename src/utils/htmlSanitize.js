const LEGACY_DOMAINS = ['loveandflourbypooja.com'];
const LEGACY_LOCAL_PORTS = ['7070', '7071'];
const DEFAULT_BACKEND_BASE = 'https://loveandflourbackend.onrender.com';

function getBackendBaseUrl() {
  const configured = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : '';
  const raw = String(configured ?? '').trim();
  if (!raw) return DEFAULT_BACKEND_BASE;
  const first = raw
    .split(/[,\n]+/g)
    .flatMap((part) => part.split(/\s+/g))
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!first) return DEFAULT_BACKEND_BASE;
  let v = first;
  if (v.startsWith('http//')) v = `http://${v.slice('http//'.length)}`;
  if (v.startsWith('https//')) v = `https://${v.slice('https//'.length)}`;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    return new URL(v).toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_BACKEND_BASE;
  }
}

function isLegacyUrl(url) {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return LEGACY_DOMAINS.includes(u.hostname);
  } catch {
    return false;
  }
}

function isLegacyLocalUrl(url) {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return isLocal && LEGACY_LOCAL_PORTS.includes(String(u.port));
  } catch {
    return false;
  }
}

function stripScripts(html) {
  const str = String(html ?? '');
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function rewriteLegacyUrlsRaw(html) {
  let out = String(html ?? '');
  // Strip old local dev ports so content keeps working when the app runs on a different port.
  for (const port of LEGACY_LOCAL_PORTS) {
    const re = new RegExp(`https?:\\\\/\\\\/(localhost|127\\\\.0\\\\.0\\\\.1):${port}`, 'gi');
    out = out.replace(re, '');
  }
  return out;
}

export function sanitizeHtmlForApp(html) {
  const raw = rewriteLegacyUrlsRaw(stripScripts(html));

  // Browser-side: normalize any remaining legacy links more safely with DOM parsing.
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="__root">${raw}</div>`, 'text/html');
    const root = doc.getElementById('__root');
    if (!root) return raw;

    root.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;

      // Fix legacy internal FAQ CTA: `/pages/contact-us` is not a real route in this app.
      // Always send users to the real contact page.
      const trimmedHref = String(href).trim();
      if (trimmedHref === '/pages/contact-us' || trimmedHref === 'pages/contact-us') {
        a.setAttribute('href', '/contact');
        a.removeAttribute('target');
        a.removeAttribute('rel');
        return;
      }
      if (/^https?:\/\/loveandflourbypooja\.com\/pages\/contact-us\/?/i.test(trimmedHref)) {
        a.setAttribute('href', '/contact');
        a.removeAttribute('target');
        a.removeAttribute('rel');
        return;
      }

      if (!isLegacyUrl(href) && !isLegacyLocalUrl(href)) return;
      try {
        const u = new URL(href, window.location.origin);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch {
        a.setAttribute('href', '/');
      }
      a.removeAttribute('target');
      a.removeAttribute('rel');
    });

    root.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      // Ensure backend-hosted paths work when rendered on a static frontend domain.
      if (src.startsWith('/api/') || src.startsWith('/uploads/')) {
        img.setAttribute('src', `${getBackendBaseUrl()}${src}`);
        return;
      }
      // For legacy domain images, keep the absolute URL so the browser can load it.
      if (!isLegacyLocalUrl(src)) return;
      try {
        const u = new URL(src, window.location.origin);
        img.setAttribute('src', u.pathname + u.search + u.hash);
      } catch {
        // If we can't parse, drop the image source (prevents leaking to legacy host).
        img.removeAttribute('src');
      }
    });

    // Final safety: drop any scripts that slipped through.
    root.querySelectorAll('script').forEach((s) => s.remove());
    return root.innerHTML;
  }

  return raw;
}
