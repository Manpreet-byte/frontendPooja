import { useEffect, useMemo, useRef, useState } from 'react';

export default function SelectMenu({ value, options, onChange, disabled = false, placeholder = 'Select…', ariaLabel }) {
  const list = Array.isArray(options) ? options : [];
  const selected = useMemo(() => list.find((opt) => String(opt.value) === String(value)) ?? null, [list, value]);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(
      0,
      list.findIndex((opt) => String(opt.value) === String(value)),
    );
    setActiveIndex(idx === -1 ? 0 : idx);
  }, [open, list, value]);

  useEffect(() => {
    if (!open) return;
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-active="true"]');
    if (el?.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(list.length - 1, Math.max(0, i) + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(0, list.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = list[activeIndex];
      if (opt) onChange?.(opt.value);
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={`select-menu${disabled ? ' is-disabled' : ''}${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        className="input select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`select-value${selected ? '' : ' is-placeholder'}`}>{selected ? selected.label : placeholder}</span>
        <span className="select-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="select-popover" role="listbox" tabIndex={-1} ref={listRef} onKeyDown={onListKeyDown}>
          {list.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${opt.value}`}
                type="button"
                className={`select-option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                role="option"
                aria-selected={isSelected}
                data-active={isActive ? 'true' : 'false'}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
              >
                <span className="select-option-label">{opt.label}</span>
                {isSelected ? <span className="select-check" aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

