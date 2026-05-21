import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateLabel } from '../../../utils/admin/dateRange';

function parseIsoDateOnly(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, monthIndex, day));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toIsoDateOnly(dt) {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())).toISOString().slice(0, 10);
}

function startOfMonthUTC(dt) {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1));
}

function addMonthsUTC(dt, delta) {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + delta, 1));
}

function addDaysUTC(dt, days) {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + days));
}

function sameDayUTC(a, b) {
  if (!a || !b) return false;
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function isBetweenUTC(day, from, to) {
  if (!from || !to || !day) return false;
  const t = day.getTime();
  const a = from.getTime();
  const b = to.getTime();
  return t > Math.min(a, b) && t < Math.max(a, b);
}

function getMonthLabel(dt) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dt);
}

function buildMonthGrid(monthStartUtc) {
  // Start from Sunday.
  const dayOfWeek = monthStartUtc.getUTCDay(); // 0..6
  const gridStart = addDaysUTC(monthStartUtc, -dayOfWeek);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(addDaysUTC(gridStart, i));
  }
  return days;
}

export default function DateRangePicker({ from, to, onChange, disabled = false, compact = false }) {
  const popoverRef = useRef(null);
  const anchorRef = useRef(null);

  const fromDt = useMemo(() => parseIsoDateOnly(from), [from]);
  const toDt = useMemo(() => parseIsoDateOnly(to), [to]);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonthUTC(fromDt ?? new Date()));
  const [selecting, setSelecting] = useState('from'); // from | to

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e) => {
      const p = popoverRef.current;
      const a = anchorRef.current;
      if (!p || !a) return;
      if (p.contains(e.target) || a.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    const base = startOfMonthUTC(fromDt ?? new Date());
    setViewMonth(base);
  }, [fromDt?.getTime()]);

  const displayFrom = formatDateLabel(from) || '—';
  const displayTo = formatDateLabel(to) || '—';

  const selectDay = (dayUtc) => {
    if (disabled) return;
    if (!dayUtc) return;
    if (selecting === 'from') {
      const iso = toIsoDateOnly(dayUtc);
      onChange?.({ from: iso, to: '' });
      setSelecting('to');
      return;
    }
    const candidateTo = dayUtc;
    const start = fromDt;
    if (!start) {
      const iso = toIsoDateOnly(candidateTo);
      onChange?.({ from: iso, to: '' });
      setSelecting('to');
      return;
    }
    const a = start.getTime();
    const b = candidateTo.getTime();
    if (b < a) {
      onChange?.({ from: toIsoDateOnly(candidateTo), to: toIsoDateOnly(start) });
    } else {
      onChange?.({ from: toIsoDateOnly(start), to: toIsoDateOnly(candidateTo) });
    }
    setSelecting('from');
    setOpen(false);
  };

  const monthA = viewMonth;
  const monthB = addMonthsUTC(viewMonth, 1);
  const daysA = useMemo(() => buildMonthGrid(monthA), [monthA.getTime()]);
  const daysB = useMemo(() => buildMonthGrid(monthB), [monthB.getTime()]);
  const todayUtc = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const renderMonth = (monthStart, days) => (
    <div className="drp-month" key={monthStart.toISOString()}>
      <div className="drp-month-head">
        <div className="drp-month-label">{getMonthLabel(monthStart)}</div>
      </div>
      <div className="drp-dow">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
          <div key={d} className="drp-dow-cell">
            {d}
          </div>
        ))}
      </div>
      <div className="drp-grid" role="grid" aria-label={getMonthLabel(monthStart)}>
        {days.map((day) => {
          const inMonth = day.getUTCMonth() === monthStart.getUTCMonth();
          const isFrom = sameDayUTC(day, fromDt);
          const isTo = sameDayUTC(day, toDt);
          const inRange = isBetweenUTC(day, fromDt, toDt);
          const isToday = sameDayUTC(day, todayUtc);
          const cls = [
            'drp-day',
            inMonth ? '' : 'is-out',
            isFrom ? 'is-from' : '',
            isTo ? 'is-to' : '',
            inRange ? 'is-in-range' : '',
            isToday ? 'is-today' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              type="button"
              key={day.toISOString()}
              className={cls}
              onClick={() => selectDay(day)}
              disabled={disabled}
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`date-range-picker${compact ? ' is-compact' : ''}`}>
      <div className="drp-fields" ref={anchorRef}>
        <button type="button" className="drp-field" onClick={() => (disabled ? null : (setOpen((v) => !v), setSelecting('from')))} disabled={disabled}>
          <span className="drp-label">From</span>
          <span className="drp-value">{displayFrom}</span>
        </button>
        <span className="drp-sep" aria-hidden="true">
          –
        </span>
        <button type="button" className="drp-field" onClick={() => (disabled ? null : (setOpen(true), setSelecting('to')))} disabled={disabled}>
          <span className="drp-label">To</span>
          <span className="drp-value">{displayTo}</span>
        </button>
      </div>

      {open ? (
        <div className="drp-popover" ref={popoverRef} role="dialog" aria-label="Choose date range">
          <div className="drp-popover-head">
            <div className="drp-mode">
              <span className={`drp-chip${selecting === 'from' ? ' is-active' : ''}`}>Pick start</span>
              <span className={`drp-chip${selecting === 'to' ? ' is-active' : ''}`}>Pick end</span>
            </div>
            <div className="drp-nav">
              <button type="button" className="icon-button drp-nav-btn" onClick={() => setViewMonth((m) => addMonthsUTC(m, -1))} disabled={disabled} aria-label="Previous month">
                ‹
              </button>
              <button type="button" className="icon-button drp-nav-btn" onClick={() => setViewMonth((m) => addMonthsUTC(m, 1))} disabled={disabled} aria-label="Next month">
                ›
              </button>
            </div>
          </div>

          <div className="drp-calendars">
            {renderMonth(monthA, daysA)}
            {renderMonth(monthB, daysB)}
          </div>

          <div className="drp-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                onChange?.({ from: '', to: '' });
                setSelecting('from');
              }}
              disabled={disabled}
            >
              Clear
            </button>
            <button
              type="button"
              className="button button-solid"
              onClick={() => {
                const today = todayUtc;
                onChange?.({ from: toIsoDateOnly(today), to: toIsoDateOnly(today) });
                setSelecting('from');
                setOpen(false);
              }}
              disabled={disabled}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

