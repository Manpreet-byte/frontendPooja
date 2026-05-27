import { useEffect, useMemo, useState } from 'react';
import { getBackendBaseUrl } from '../utils/backendBase';

function normalizeImageSrc(src) {
  const raw = String(src ?? '').trim();
  if (!raw) return '';

  const base = String(import.meta.env.BASE_URL ?? '/');
  const backendBase = getBackendBaseUrl();

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
    // Media + uploads are served by the backend, not the static frontend host.
    if (raw.startsWith('/api/') || raw.startsWith('/uploads/')) {
      return `${backendBase}${raw}`;
    }
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

  const candidates = [];

  // WordPress often emits thumbnail URLs such as `image-225x300.jpg`.
  // If the resized file is missing or blocked, retry the original filename.
  try {
    const url = new URL(safe, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
    const pathname = url.pathname;
    const fileMatch = pathname.match(/^(.*\/)([^/]+)$/);
    const dir = fileMatch?.[1] ?? '';
    const filename = fileMatch?.[2] ?? '';
    const extMatch = filename.match(/(\.[a-z0-9]+)$/i);
    const ext = extMatch?.[1] ?? '';
    const name = ext ? filename.slice(0, -ext.length) : filename;

    const pushCandidate = (nextName) => {
      const next = `${url.origin}${dir}${nextName}${ext}${url.search}${url.hash}`;
      candidates.push(next);
    };

    const pushNameVariants = (baseName) => {
      if (!baseName) return;
      pushCandidate(baseName);
      const trimmed = baseName.replace(/[-_]+$/, '');
      if (trimmed && trimmed !== baseName) pushCandidate(trimmed);
    };

    const sizeMatch = name.match(/^(.*)-\d+x\d+$/i);
    if (sizeMatch) {
      // Prefer the original asset for better quality; fall back to the resized variant if needed.
      // Some WP filenames end with extra separators (e.g. `foo--675x675.jpg` -> `foo-.jpg`),
      // so we also try a trimmed variant.
      pushNameVariants(sizeMatch[1]);
    }

    const scaledMatch = name.match(/^(.*)-scaled$/i);
    if (scaledMatch) {
      pushNameVariants(scaledMatch[1]);
    }

    candidates.push(safe);
  } catch {
    candidates.push(safe);
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
