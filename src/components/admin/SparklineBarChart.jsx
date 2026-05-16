import { useMemo } from 'react';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function SparklineBarChart({ data, height = 140, valueKey = 'value', labelKey = 'label' }) {
  const points = useMemo(() => (Array.isArray(data) ? data : []).filter(Boolean), [data]);
  const values = useMemo(() => points.map((p) => Number(p?.[valueKey] ?? 0)), [points, valueKey]);
  const max = Math.max(1, ...values);
  const width = 520;
  const barGap = 4;
  const barWidth = points.length ? Math.max(6, Math.floor((width - barGap * (points.length - 1)) / points.length)) : 8;
  const viewW = points.length ? points.length * barWidth + (points.length - 1) * barGap : width;
  const viewH = height;

  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} width="100%" height={height} role="img" aria-label="Chart">
      <defs>
        <linearGradient id="lafBar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(201, 122, 74, 0.92)" />
          <stop offset="100%" stopColor="rgba(201, 122, 74, 0.22)" />
        </linearGradient>
      </defs>
      {points.map((p, i) => {
        const v = Number(p?.[valueKey] ?? 0);
        const h = clamp((v / max) * (viewH - 24), 2, viewH - 24);
        const x = i * (barWidth + barGap);
        const y = viewH - h;
        const label = String(p?.[labelKey] ?? '');
        return (
          <g key={label || i}>
            <rect x={x} y={y} width={barWidth} height={h} rx="6" fill="url(#lafBar)" />
          </g>
        );
      })}
    </svg>
  );
}

