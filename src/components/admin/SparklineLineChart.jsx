import { useMemo } from 'react';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function SparklineLineChart({ data, height = 140, valueKey = 'value', labelKey = 'label' }) {
  const points = useMemo(() => (Array.isArray(data) ? data : []).filter(Boolean), [data]);
  const values = useMemo(() => points.map((p) => Number(p?.[valueKey] ?? 0)), [points, valueKey]);
  const max = Math.max(1, ...values);
  const width = 520;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const viewW = width;
  const viewH = height;

  const path = useMemo(() => {
    if (!points.length) return '';
    return points
      .map((p, i) => {
        const v = Number(p?.[valueKey] ?? 0);
        const x = i * step;
        const y = viewH - 10 - clamp((v / max) * (viewH - 26), 0, viewH - 26);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [points, valueKey, step, viewH, max]);

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} width="100%" height={height} role="img" aria-label="Chart">
      <defs>
        <linearGradient id="lafLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(201, 122, 74, 0.25)" />
          <stop offset="60%" stopColor="rgba(201, 122, 74, 0.92)" />
          <stop offset="100%" stopColor="rgba(230, 145, 165, 0.72)" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="url(#lafLine)" strokeWidth="3" strokeLinecap="round" />
      {points.map((p, i) => {
        const v = Number(p?.[valueKey] ?? 0);
        const x = i * step;
        const y = viewH - 10 - clamp((v / max) * (viewH - 26), 0, viewH - 26);
        const label = String(p?.[labelKey] ?? '');
        return <circle key={label || i} cx={x} cy={y} r="3.2" fill="rgba(46,36,27,0.55)" />;
      })}
    </svg>
  );
}

