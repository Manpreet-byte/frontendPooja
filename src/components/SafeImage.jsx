import { useEffect, useMemo, useState } from 'react';

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

function deriveFallbackSrcs(src) {
  const safe = normalizeImageSrc(src);
  if (!safe) return [];

  const candidates = [safe];

  // WordPress often emits thumbnail URLs such as `image-225x300.jpg`.
  // If the resized file is missing or blocked, retry the original filename.
  try {
    const url = new URL(safe, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
    const match = url.pathname.match(/^(.*)-\d+x\d+(\.[a-z0-9]+)$/i);
    if (match) {
      candidates.push(`${url.origin}${match[1]}${match[2]}${url.search}${url.hash}`);
    }
  } catch {
    // ignore
  }

  return Array.from(new Set(candidates));
}

export default function SafeImage({ src, alt = '', className, loading = 'lazy', fallbackSrcs = [], ...rest }) {
  const [index, setIndex] = useState(0);

  const candidateSrcs = useMemo(() => {
    const base = deriveFallbackSrcs(src);
    const extras = Array.isArray(fallbackSrcs) ? fallbackSrcs.map((item) => normalizeImageSrc(item)).filter(Boolean) : [];
    return Array.from(new Set([...base, ...extras]));
  }, [src, fallbackSrcs]);

  useEffect(() => {
    setIndex(0);
  }, [candidateSrcs]);

  const safeSrc = candidateSrcs[index] ?? '';
  const failed = !safeSrc;

  if (!safeSrc || failed) return null;

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        setIndex((current) => (current + 1 < candidateSrcs.length ? current + 1 : current));
      }}
      {...rest}
    />
  );
}
