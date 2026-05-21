import { useMemo } from 'react';
import { computeRange, formatRangeLabel } from '../../../utils/admin/dateRange';

export default function DateRangeFilters({
  preset,
  from,
  to,
  onPreset,
  onFrom,
  onTo,
  disabled = false,
  right = null,
}) {
  const derived = useMemo(() => computeRange({ preset, from, to }), [preset, from, to]);

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`button button-ghost${preset === 'today' ? ' button-solid' : ''}`}
          type="button"
          onClick={() => onPreset('today')}
          disabled={disabled}
        >
          Today
        </button>
        <button
          className={`button button-ghost${preset === 'last_7' ? ' button-solid' : ''}`}
          type="button"
          onClick={() => onPreset('last_7')}
          disabled={disabled}
        >
          7 days
        </button>
        <button
          className={`button button-ghost${preset === 'last_30' ? ' button-solid' : ''}`}
          type="button"
          onClick={() => onPreset('last_30')}
          disabled={disabled}
        >
          30 days
        </button>
        <button
          className={`button button-ghost${preset === 'custom' ? ' button-solid' : ''}`}
          type="button"
          onClick={() => onPreset('custom')}
          disabled={disabled}
        >
          Custom
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {preset === 'custom' ? (
          <>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">From</span>
              <input className="input" type="date" value={from} onChange={(e) => onFrom(e.target.value)} disabled={disabled} />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">To</span>
              <input className="input" type="date" value={to} onChange={(e) => onTo(e.target.value)} disabled={disabled} />
            </label>
          </>
        ) : (
          <span className="muted" style={{ whiteSpace: 'nowrap' }}>
            Range: {formatRangeLabel(derived)}
          </span>
        )}
        {right}
      </div>
    </div>
  );
}
