import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDateStandard, formatDateTimeStandard } from '../../utils/formatDate';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function startOfMonthLocal(dt) {
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function addMonthsLocal(dt, delta) {
  return new Date(dt.getFullYear(), dt.getMonth() + delta, 1);
}

function addDaysLocal(dt, days) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + days);
}

function sameDayLocal(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(monthStartLocal) {
  const dayOfWeek = monthStartLocal.getDay(); // Sunday=0
  const gridStart = addDaysLocal(monthStartLocal, -dayOfWeek);
  const days = [];
  for (let i = 0; i < 42; i += 1) days.push(addDaysLocal(gridStart, i));
  return days;
}

function parseIso(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toIsoFromLocalParts({ date, hour, minute }) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const h = Number(hour);
  const m = Number(minute);
  const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return dt.toISOString();
}

function monthLabel(dt) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(dt);
}

export default function DateTimePicker({ value, onChange, disabled = false, label = null }) {
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);

  const parsed = useMemo(() => parseIso(value), [value]);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const [viewMonth, setViewMonth] = useState(() => startOfMonthLocal(parsed ?? new Date()));
  const [pickedDate, setPickedDate] = useState(() => (parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : null));
  const [hour, setHour] = useState(() => (parsed ? pad2(parsed.getHours()) : '09'));
  const [minute, setMinute] = useState(() => (parsed ? pad2(parsed.getMinutes()) : '00'));

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
    if (!open) return;
    const updatePlacement = () => {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;
      const rect = anchor.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      const topSpace = rect.top;
      const bottomSpace = viewportH - rect.bottom;
      const needed = Math.min(popoverRect.height, viewportH - 24);
      const nextPlacement = bottomSpace < needed + 10 && topSpace > bottomSpace ? 'top' : 'bottom';
      setPlacement(nextPlacement);
    };

    // Measure after paint so the popover has a real height.
    const raf = window.requestAnimationFrame(updatePlacement);
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  useEffect(() => {
    if (!parsed) return;
    setViewMonth(startOfMonthLocal(parsed));
    setPickedDate(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    setHour(pad2(parsed.getHours()));
    setMinute(pad2(parsed.getMinutes()));
  }, [parsed?.getTime()]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth.getTime()]);
  const today = useMemo(() => new Date(), []);

  const display = parsed ? formatDateTimeStandard(parsed) : 'Select date & time';

  const apply = () => {
    const iso = toIsoFromLocalParts({ date: pickedDate ?? new Date(), hour, minute });
    onChange?.(iso);
    setOpen(false);
  };

  const clear = () => {
    onChange?.('');
    setOpen(false);
  };

  return (
    <div className="date-time-picker">
      {label ? <span className="field-label">{label}</span> : null}
      <button
        type="button"
        className="dtp-field"
        ref={anchorRef}
        onClick={() => (disabled ? null : setOpen((v) => !v))}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={`dtp-value${parsed ? '' : ' is-placeholder'}`}>{parsed ? display : 'Select date & time'}</span>
        <span className="dtp-icon" aria-hidden="true">
          📅
        </span>
      </button>

      {open ? (
        <div
          className={`dtp-popover${placement === 'top' ? ' is-top' : ''}`}
          ref={popoverRef}
          role="dialog"
          aria-label="Choose date and time"
        >
          <div className="dtp-head">
            <div className="dtp-month">
              <button type="button" className="icon-button dtp-nav" onClick={() => setViewMonth((m) => addMonthsLocal(m, -1))} disabled={disabled} aria-label="Previous month">
                ‹
              </button>
              <div className="dtp-month-label">{monthLabel(viewMonth)}</div>
              <button type="button" className="icon-button dtp-nav" onClick={() => setViewMonth((m) => addMonthsLocal(m, 1))} disabled={disabled} aria-label="Next month">
                ›
              </button>
            </div>
          </div>

          <div className="dtp-dow">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
              <div key={d} className="dtp-dow-cell">
                {d}
              </div>
            ))}
          </div>

          <div className="dtp-grid" role="grid" aria-label={monthLabel(viewMonth)}>
            {days.map((day) => {
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const isSelected = sameDayLocal(day, pickedDate);
              const isToday = sameDayLocal(day, today);
              const cls = ['dtp-day', inMonth ? '' : 'is-out', isSelected ? 'is-selected' : '', isToday ? 'is-today' : ''].filter(Boolean).join(' ');
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={cls}
                  onClick={() => setPickedDate(new Date(day.getFullYear(), day.getMonth(), day.getDate()))}
                  disabled={disabled}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="dtp-time">
            <div className="dtp-time-label">Time</div>
            <div className="dtp-time-fields">
              <label className="sr-only" htmlFor="dtp-hour">
                Hour
              </label>
              <select id="dtp-hour" className="input dtp-time-select" value={hour} onChange={(e) => setHour(e.target.value)} disabled={disabled}>
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={pad2(h)}>
                    {pad2(h)}
                  </option>
                ))}
              </select>
              <span className="dtp-colon" aria-hidden="true">
                :
              </span>
              <label className="sr-only" htmlFor="dtp-minute">
                Minute
              </label>
              <select id="dtp-minute" className="input dtp-time-select" value={minute} onChange={(e) => setMinute(e.target.value)} disabled={disabled}>
                {Array.from({ length: 60 }).map((_, m) => (
                  <option key={m} value={pad2(m)}>
                    {pad2(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="muted dtp-hint">Selected date: {pickedDate ? formatDateStandard(pickedDate) : '—'}</div>
          </div>

          <div className="dtp-actions">
            <button type="button" className="button button-ghost" onClick={clear} disabled={disabled}>
              Clear
            </button>
            <button type="button" className="button button-solid" onClick={apply} disabled={disabled}>
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
