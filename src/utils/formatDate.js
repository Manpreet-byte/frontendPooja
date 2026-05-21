function pad2(n) {
  return String(n).padStart(2, '0');
}

function monthShortLower(idx) {
  return ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][idx] ?? '';
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// Standard date format across the app: `19 apr 2026`
export function formatDateStandard(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${date.getDate()} ${monthShortLower(date.getMonth())} ${date.getFullYear()}`;
}

// Standard datetime format across the app: `19 apr 2026 05:39`
export function formatDateTimeStandard(value) {
  const date = toDate(value);
  if (!date) return '';
  return `${formatDateStandard(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
