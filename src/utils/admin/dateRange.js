function toDateOnlyISO(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseIsoDateOnly(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  // Expect YYYY-MM-DD; construct as UTC to avoid timezone shifts.
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, monthIndex, day));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function formatDateLabel(value) {
  const dt = parseIsoDateOnly(value);
  if (!dt) return '';
  const day = String(dt.getUTCDate());
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][dt.getUTCMonth()] ?? '';
  const year = String(dt.getUTCFullYear());
  return `${day} ${month} ${year}`.trim();
}

export function formatRangeLabel({ from, to }) {
  const a = formatDateLabel(from) || '—';
  const b = formatDateLabel(to) || '—';
  return `${a} - ${b}`;
}

export function computeRange({ preset, from, to, now = new Date() }) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const end = toDateOnlyISO(today);

  if (preset === 'today') return { from: end, to: end, preset };
  if (preset === 'last_7') {
    const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { from: toDateOnlyISO(start), to: end, preset };
  }
  if (preset === 'last_30') {
    const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    return { from: toDateOnlyISO(start), to: end, preset };
  }
  if (preset === 'custom') {
    return { from: String(from ?? ''), to: String(to ?? ''), preset };
  }
  return { from: '', to: '', preset: 'last_30' };
}
