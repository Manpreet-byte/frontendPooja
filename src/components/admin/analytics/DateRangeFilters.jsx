import { useMemo } from 'react';
import { computeRange, formatRangeLabel } from '../../../utils/admin/dateRange';
import DateRangePicker from './DateRangePicker';

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
          <DateRangePicker
            from={from}
            to={to}
            disabled={disabled}
            onChange={({ from: nextFrom, to: nextTo }) => {
              onFrom(nextFrom);
              onTo(nextTo);
            }}
          />
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
