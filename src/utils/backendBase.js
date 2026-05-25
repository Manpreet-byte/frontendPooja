const DEFAULT_BACKEND_BASE = 'https://loveandflourbackend.onrender.com';

function normalizeFirstUrl(raw) {
  const str = String(raw ?? '').trim();
  if (!str) return '';
  const first = str
    .split(/[,\n]+/g)
    .flatMap((part) => part.split(/\s+/g))
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!first) return '';
  let value = first;
  if (value.startsWith('http//')) value = `http://${value.slice('http//'.length)}`;
  if (value.startsWith('https//')) value = `https://${value.slice('https//'.length)}`;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function getBackendBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const normalized = normalizeFirstUrl(configured);
  return normalized || DEFAULT_BACKEND_BASE;
}

