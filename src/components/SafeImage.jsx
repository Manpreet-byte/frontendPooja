import { useMemo, useState } from 'react';

function normalizeImageSrc(src) {
  const raw = String(src ?? '').trim();
  if (!raw) return '';

  const base = String(import.meta.env.BASE_URL ?? '/');

  // Keep already-safe schemes.
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  // Fix common dev mismatch: content saved with localhost:7070/7071 but app runs on another port.
  if (typeof window !== 'undefined') {
    try {
      const u = new URL(raw, window.location.origin);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        if (u.port === '7070' || u.port === '7071') {
          return `${window.location.origin}${u.pathname}${u.search}${u.hash}`;
        }
      }
    } catch {
      // ignore
    }
  }

  // Protocol-relative URL.
  if (raw.startsWith('//')) {
    const proto = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return `${proto}${raw}`;
  }

  // Absolute path stays as-is.
  if (raw.startsWith('/')) {
    if (base && base !== '/' && !raw.startsWith(base)) {
      return `${base.replace(/\/?$/, '/')}${raw.replace(/^\/+/, '')}`;
    }
    return raw;
  }

  // Avoid route-relative paths (e.g. /recipes/foo + "img.png" => /recipes/img.png).
  return `${base.replace(/\/?$/, '/')}${raw.replace(/^\.?\//, '')}`;
}

export default function SafeImage({ src, alt = '', className, loading = 'lazy', ...rest }) {
  const [failed, setFailed] = useState(false);
  const safeSrc = useMemo(() => normalizeImageSrc(src), [src]);

  if (!safeSrc || failed) return null;

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
