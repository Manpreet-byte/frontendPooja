import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useShallow } from 'zustand/shallow';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import SafeImage from './SafeImage';

function parsePriceTextToCents(priceText) {
  // Best-effort: extracts first number from strings like "INR 1299" or "₹1,299".
  const raw = String(priceText ?? '');
  const match = raw.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function CartDrawer({ open, onClose }) {
  const [items, removeCourse, clearCart, couponCode, setCouponCode, clearCouponCode] = useCartStore(
    useShallow((s) => [s.items, s.removeCourse, s.clearCart, s.couponCode, s.setCouponCode, s.clearCouponCode]),
  );
  const token = useAuthStore((s) => s.token);
  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [validating, setValidating] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus?.();
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);
  const totals = useMemo(() => {
    const currency = items.find((i) => i.currency)?.currency ?? 'INR';
    const subtotal = items.reduce((sum, it) => {
      const cents = it.amountCents != null ? Number(it.amountCents) : parsePriceTextToCents(it.priceText);
      return sum + (Number.isFinite(cents) ? cents : 0);
    }, 0);
    return { currency, subtotal };
  }, [items]);

  useEffect(() => {
    setCouponInput(couponCode ?? '');
    setCouponMessage('');
    setPreview(null);
  }, [couponCode, open]);

  if (!open) {
    return null;
  }

  const applyCoupon = async () => {
    const code = String(couponInput ?? '').trim();
    setCouponMessage('');
    setPreview(null);
    if (!code) {
      clearCouponCode();
      return;
    }
    setCouponCode(code);
    if (!token) {
      setCouponMessage('Coupon will be validated at checkout after login.');
      return;
    }
    setValidating(true);
    try {
      const res = await api.coupons.validate(token, { coupon_code: code, items: items.map((it) => ({ course_id: it.id, quantity: 1 })) });
      if (res?.valid) {
        setPreview(res);
        setCouponMessage(res?.message ?? 'Coupon applied.');
      } else {
        setCouponMessage(res?.message ?? 'Invalid coupon.');
      }
    } catch (err) {
      setCouponMessage(err?.message ?? 'Unable to validate coupon right now.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="cart-drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Course cart"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cart-drawer-header">
          <div>
            <p className="section-kicker">Your cart</p>
            <h2 className="h3">Online workshops</h2>
            <p className="cart-drawer-summary">{items.length} selected workshop{items.length === 1 ? '' : 's'}</p>
          </div>
          <button ref={closeButtonRef} className="icon-button cart-close" type="button" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>

        {items.length ? (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item-media">
                    {item.featuredImage ? <SafeImage src={item.featuredImage} alt={item.title} loading="eager" /> : null}
                  </div>
                  <div className="cart-item-body">
                    <div className="cart-item-head">
                      <div className="cart-item-copy">
                        <p className="cart-item-title">{item.title}</p>
                        {item.priceText ? <p className="cart-item-price">{item.priceText}</p> : null}
                        <p className="cart-item-meta">Added to cart</p>
                      </div>
                      <button className="cart-remove" type="button" onClick={() => removeCourse(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-drawer-footer">
            <div className="cart-summary">
              <span>{items.length} workshop{items.length === 1 ? '' : 's'} selected</span>
              <button className="button button-ghost" type="button" onClick={clearCart}>
                Clear cart
              </button>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <span className="field-label">Coupon</span>
              <div className="checkout-row">
                <input
                  className="input"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Optional"
                />
                <button className="button button-ghost" type="button" onClick={applyCoupon} disabled={!items.length || validating}>
                  {validating ? 'Checking…' : 'Apply'}
                </button>
              </div>
              {couponMessage ? (
                <p className="muted" role="status" aria-live="polite">
                  {couponMessage}
                </p>
              ) : null}
              {preview?.valid && preview?.final_total != null ? (
                <p className="muted">Preview total: {formatMoney(preview.final_total, preview.currency ?? totals.currency)}</p>
              ) : null}
            </div>

            <div className="checkout-totals" style={{ marginTop: 12 }}>
              <div className="checkout-line">
                <span className="muted">Subtotal</span>
                <span>{formatMoney(totals.subtotal, totals.currency)}</span>
              </div>
              {preview?.valid && preview?.discount_amount != null ? (
                <div className="checkout-line">
                  <span className="muted">Discount</span>
                  <span>-{formatMoney(preview.discount_amount, preview.currency ?? totals.currency)}</span>
                </div>
              ) : null}
            </div>

            <Link className="button button-solid cart-checkout" to="/checkout" onClick={onClose}>
              Proceed to checkout
            </Link>
          </div>
          </>
        ) : (
          <div className="cart-empty">
            <p className="muted">Your cart is empty right now.</p>
            <Link className="button button-solid" to="/courses" onClick={onClose}>
              Browse workshops
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
