function toDateOnlyISO(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
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

