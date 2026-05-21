import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import SafeImage from '../components/SafeImage';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getAnalyticsSessionId() {
  try {
    const key = 'lf:session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `mem-${Date.now().toString(36)}`;
  }
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Razorpay unavailable'));
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector('script[data-razorpay="checkout"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpay = 'checkout';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

function readOrderHistory() {
  try {
    const raw = localStorage.getItem('love-and-flour-order-history');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrderHistory(ids) {
  try {
    localStorage.setItem('love-and-flour-order-history', JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function rememberOrderId(orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) return;
  const existing = readOrderHistory();
  if (existing.includes(id)) return;
  const next = [id, ...existing].slice(0, 50);
  writeOrderHistory(next);
}

function readPendingOrder() {
  try {
    const raw = localStorage.getItem('love-and-flour-pending-order');
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const id = parsed.orderId;
    if (!id) return null;
    return { orderId: id, createdAt: parsed.createdAt ?? null };
  } catch {
    return null;
  }
}

function writePendingOrder(orderId) {
  try {
    localStorage.setItem('love-and-flour-pending-order', JSON.stringify({ orderId, createdAt: Date.now() }));
  } catch {
    // ignore
  }
}

function clearPendingOrder() {
  try {
    localStorage.removeItem('love-and-flour-pending-order');
  } catch {
    // ignore
  }
}

async function pollOrderUntilFinal({ token, orderId, maxMs = 120000 }) {
  const start = Date.now();
  let attempt = 0;
  // Exponential-ish backoff with ceiling.
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const data = await api.orders.get(token, orderId);
    const status = data?.order?.status;
    if (status === 'paid' || status === 'failed') return data;
    const delay = Math.min(5000, 800 + attempt * 350);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
  }
  const err = new Error('Payment verification is taking longer than expected. Please check your order status later.');
  err.code = 'VERIFY_TIMEOUT';
  throw err;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const items = useCartStore((s) => s.items);
  const removeCourse = useCartStore((s) => s.removeCourse);
  const clearCart = useCartStore((s) => s.clearCart);
  const persistedCoupon = useCartStore((s) => s.couponCode);
  const setPersistedCoupon = useCartStore((s) => s.setCouponCode);

  const [couponCode, setCouponCode] = useState(() => persistedCoupon ?? '');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [couponPreview, setCouponPreview] = useState(null); // {discount_amount, final_total, message}
  const couponDebounceRef = useRef(null);
  const lastCouponValidatedRef = useRef('');
  const couponRequestSeq = useRef(0);
  const courseSlugToIdRef = useRef(null); // Map<string, number> (lazy-filled)

  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingGst, setBillingGst] = useState('');

  const [status, setStatus] = useState('idle'); // idle | creating | paying | verifying | success | error
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // {order, items, payment}
  const [pendingOrder, setPendingOrder] = useState(() => readPendingOrder());

  useEffect(() => {
    if (user?.name && !billingName) setBillingName(user.name);
    if (user?.email && !billingEmail) setBillingEmail(user.email);
  }, [user, billingName, billingEmail]);

  useEffect(() => {
    // If cart changes, any coupon preview might no longer be accurate.
    setCouponPreview(null);
    setCouponMessage('');
    lastCouponValidatedRef.current = '';
    if (couponApplied) setCouponApplied('');
  }, [items]);

  useEffect(() => {
    // Keep store coupon in sync for login redirects / refresh.
    setPersistedCoupon(couponCode);
  }, [couponCode, setPersistedCoupon]);

  const canCheckout = useMemo(() => items.length > 0 && status === 'idle', [items.length, status]);

  const checkoutPayload = useMemo(() => {
    const payload = {
      provider: 'razorpay',
      items: items.map((it) => ({ course_id: it.id, quantity: 1 })),
    };
    const code = couponApplied || couponCode;
    if (code && String(code).trim()) payload.coupon_code = String(code).trim();
    const billing = {};
    if (billingName) billing.name = billingName;
    if (billingEmail) billing.email = billingEmail;
    if (billingPhone) billing.phone = billingPhone;
    if (billingGst) billing.gst_number = billingGst;
    if (Object.keys(billing).length) payload.billing = billing;
    return payload;
  }, [items, couponApplied, couponCode, billingName, billingEmail, billingPhone, billingGst]);

  const resolveCourseIdsForCheckout = async (cartItems) => {
    const list = Array.isArray(cartItems) ? cartItems : [];
    if (!list.length) return [];

    if (!courseSlugToIdRef.current) {
      const data = await api.public.courses.list().catch(() => null);
      const map = new Map();
      for (const c of data?.courses ?? []) {
        if (c?.slug && c?.id) map.set(String(c.slug), Number(c.id));
      }
      try {
        const w = await api.public.workshops.list();
        for (const course of w?.workshops ?? w?.courses ?? []) {
          if (course?.slug && course?.id) map.set(String(course.slug), Number(course.id));
        }
      } catch (err) {
        // Back-compat: older backends may not expose /api/public/workshops
        if (err?.status !== 404) throw err;
      }
      courseSlugToIdRef.current = map;
    }

    const map = courseSlugToIdRef.current ?? new Map();
    const missingSlugs = Array.from(
      new Set(
        list
          .map((it) => String(it?.slug ?? '').trim())
          .filter((slug) => slug && !map.has(slug)),
      ),
    );

    if (missingSlugs.length) {
      await Promise.all(
        missingSlugs.map(async (slug) => {
          // Try both endpoints; some deployments split "courses" vs "workshops".
          const fromCourses = await api.public.courses.detail(slug).catch(() => null);
          const resolved =
            fromCourses?.course ??
            fromCourses?.workshop ??
            (await api.public.workshops.detail(slug).then((r) => r?.workshop ?? r?.course ?? null).catch(() => null));
          if (resolved?.slug && resolved?.id) map.set(String(resolved.slug), Number(resolved.id));
        }),
      );
    }

    return list.map((it) => {
      const slug = String(it?.slug ?? '').trim();
      const mappedId = slug ? map.get(slug) : null;
      const fallbackId = Number(it?.id);
      const finalId = mappedId ? Number(mappedId) : fallbackId;
      if (!Number.isFinite(finalId) || finalId <= 0) {
        throw new Error('Unable to find this workshop for checkout. Please refresh and try again.');
      }
      return { course_id: finalId, quantity: 1 };
    });
  };

  const validateCoupon = async ({ code, applyIfValid }) => {
    const normalized = String(code ?? '').trim();
    setCouponMessage('');
    setCouponPreview(null);
    if (!normalized) {
      if (applyIfValid) setCouponApplied('');
      return;
    }
    if (applyIfValid && normalized === couponApplied) {
      setCouponMessage('Coupon already applied.');
      return;
    }

    const reqId = (couponRequestSeq.current += 1);
    try {
      const resolvedItems = await resolveCourseIdsForCheckout(items);
      const res = await api.coupons.validate(token, { coupon_code: normalized, items: resolvedItems });
      if (reqId !== couponRequestSeq.current) return;
      lastCouponValidatedRef.current = normalized;

      if (res?.valid) {
        setCouponPreview({
          discount_amount: res?.discount_amount ?? res?.discountAmount ?? null,
          final_total: res?.final_total ?? res?.finalTotal ?? null,
          message: res?.message ?? 'Coupon applied.',
        });
        if (applyIfValid) setCouponApplied(normalized);
        setPersistedCoupon(normalized);
        setCouponMessage(res?.message || 'Coupon applied.');
        return;
      }

      if (applyIfValid) setCouponApplied('');
      setCouponMessage(res?.message || 'Invalid coupon.');
    } catch (err) {
      if (reqId !== couponRequestSeq.current) return;
      if (err?.status === 404) {
        // If validate endpoint doesn't exist, keep coupon for checkout submission (server will validate on checkout).
        if (applyIfValid) setCouponApplied(normalized);
        setPersistedCoupon(normalized);
        setCouponMessage('Coupon will be validated during checkout.');
        return;
      }
      if (applyIfValid) setCouponApplied('');
      setCouponMessage(err?.message || 'Coupon validation failed.');
    }
  };

  const tryValidateCoupon = async () => {
    const code = String(couponCode ?? '').trim();
    return validateCoupon({ code, applyIfValid: true });
  };

  useEffect(() => {
    if (status !== 'idle') return;
    const code = String(couponCode ?? '').trim();
    if (!code) return;
    if (code === lastCouponValidatedRef.current) return;
    if (couponDebounceRef.current) window.clearTimeout(couponDebounceRef.current);
    couponDebounceRef.current = window.setTimeout(() => {
      validateCoupon({ code, applyIfValid: false });
    }, 450);
    return () => {
      if (couponDebounceRef.current) window.clearTimeout(couponDebounceRef.current);
    };
  }, [couponCode, status, items.length]);

  const dispatchEnrollmentRefresh = () => {
    try {
      window.dispatchEvent(new CustomEvent('lf:enrollments_refresh', { detail: { at: Date.now() } }));
    } catch {
      // ignore
    }
  };

  const startCheckout = async () => {
    if (status !== 'idle') return;
    setError('');
    setCreated(null);
    setStatus('creating');
    try {
      const resolvedItems = await resolveCourseIdsForCheckout(items);
      const data = await api.orders.create(token, { ...checkoutPayload, items: resolvedItems });
      setCreated(data);
      const createdOrderId = data?.orderId ?? data?.order?.id;
      if (createdOrderId) {
        rememberOrderId(createdOrderId);
        writePendingOrder(createdOrderId);
        setPendingOrder({ orderId: createdOrderId, createdAt: Date.now() });
      }
      api.analytics.track({
        event_type: 'checkout_started',
        entity_type: 'order',
        entity_id: createdOrderId ?? null,
        metadata: { session_id: getAnalyticsSessionId() },
      });
      setStatus('paying');

      await loadRazorpayScript();

      const rpKey = data?.key ?? data?.payment?.key ?? data?.payment?.razorpayKeyId;
      const rpOrderId = data?.razorpayOrderId ?? data?.payment?.razorpayOrderId;
      const amountSubunits = Number(data?.amount ?? data?.payment?.amount ?? data?.payment?.amountCents ?? 0);
      const currency = data?.currency ?? data?.payment?.currency ?? 'INR';
      const internalOrderId = data?.orderId ?? data?.order?.id;
      if (!rpKey || !rpOrderId) {
        throw new Error('Payment setup failed. Missing Razorpay order details.');
      }

      const options = {
        key: rpKey,
        amount: amountSubunits,
        currency,
        name: 'Love & Flour',
        description: 'Course checkout',
        order_id: rpOrderId,
        prefill: {
          name: billingName || user?.name || '',
          email: billingEmail || user?.email || '',
          contact: billingPhone || '',
        },
        notes: {
          internal_order_id: String(internalOrderId ?? ''),
        },
        theme: {
          color: '#c97a4a',
        },
        handler: async (response) => {
          // Do NOT trust client-side success. Always verify with backend, then poll order status until final.
          setStatus('verifying');
          setError('');
          try {
            const verifyPayload = {
              orderId: internalOrderId,
              razorpay_order_id: response?.razorpay_order_id,
              razorpay_payment_id: response?.razorpay_payment_id,
              razorpay_signature: response?.razorpay_signature,
            };
            await api.payments.verify(token, verifyPayload);
          } catch (verifyErr) {
            // If verify endpoint isn't available (404), we still poll for webhook fulfillment.
            if (verifyErr?.status !== 404) throw verifyErr;
          }

          const finalData = await pollOrderUntilFinal({ token, orderId: internalOrderId });
          if (finalData?.order?.status === 'paid') {
            api.analytics.track({
              event_type: 'purchase_verified',
              entity_type: 'order',
              entity_id: internalOrderId ?? null,
              metadata: { session_id: getAnalyticsSessionId() },
            });
            clearCart();
            clearPendingOrder();
            setPendingOrder(null);
            dispatchEnrollmentRefresh();
            refreshProfile().catch(() => null);
            setStatus('success');
            navigate(`/order-success?orderId=${encodeURIComponent(internalOrderId)}`, { replace: true });
            return;
          }
          clearPendingOrder();
          setPendingOrder(null);
          throw new Error('Payment verification failed.');
        },
        modal: {
          ondismiss: () => {
            // User closed modal before completing payment.
            setStatus('idle');
          },
        },
      };

      // eslint-disable-next-line no-undef
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setStatus('idle');
        setError('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err) {
      setStatus('idle');
      setError(err?.message || 'Checkout failed.');
    }
  };

  const totals = created?.order
    ? {
        currency: created.order.currency,
        subtotal: created.order.subtotalCents,
        discount: created.order.discountCents,
        tax: created.order.taxCents,
        total: created.order.totalCents,
      }
    : null;

  const resumeVerification = async () => {
    if (!pendingOrder?.orderId || status !== 'idle') return;
    setStatus('verifying');
    setError('');
    try {
      const finalData = await pollOrderUntilFinal({ token, orderId: pendingOrder.orderId });
      if (finalData?.order?.status === 'paid') {
        clearCart();
        clearPendingOrder();
        setPendingOrder(null);
        dispatchEnrollmentRefresh();
        refreshProfile().catch(() => null);
        setStatus('success');
        navigate(`/order-success?orderId=${encodeURIComponent(pendingOrder.orderId)}`, { replace: true });
        return;
      }
      if (finalData?.order?.status === 'failed') {
        clearPendingOrder();
        setPendingOrder(null);
        setStatus('idle');
        setError('Payment failed. Please try again.');
        return;
      }
      setStatus('idle');
    } catch (err) {
      setStatus('idle');
      setError(err?.message || 'Unable to verify payment right now.');
    }
  };

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Checkout" title="Secure checkout" subtitle="Confirm your workshops and complete payment." />

        {items.length === 0 ? (
          <div className="panel">
            <p className="muted">Your cart is empty.</p>
            {pendingOrder?.orderId ? (
              <div style={{ marginTop: 12 }}>
                <p className="muted">You have a recent order that may still be verifying.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                  <Link className="button button-ghost" to={`/orders/${encodeURIComponent(pendingOrder.orderId)}`}>
                    View order
                  </Link>
                  <button className="button button-solid" type="button" onClick={resumeVerification} disabled={status !== 'idle'}>
                    {status === 'verifying' ? 'Verifying…' : 'Check payment status'}
                  </button>
                </div>
              </div>
            ) : null}
            <Link className="button button-solid" to="/courses">
              Browse workshops
            </Link>
          </div>
        ) : (
          <div className="grid checkout-grid">
            <section className="panel">
              <h2 className="h3">Your workshops</h2>
              <ul className="cart-list checkout-cart">
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
                        </div>
                        <button className="cart-remove" type="button" onClick={() => removeCourse(item.id)} disabled={status !== 'idle'}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="panel">
              <h2 className="h3">Payment</h2>

              <div className="field">
                <span className="field-label">Coupon</span>
                <div className="checkout-row">
                  <input
                    className="input"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Optional"
                    disabled={status !== 'idle'}
                  />
                  <button className="button button-ghost" type="button" onClick={tryValidateCoupon} disabled={status !== 'idle' || !couponCode.trim()}>
                    Apply
                  </button>
                </div>
                {couponMessage ? <p className="muted">{couponMessage}</p> : null}
                {couponPreview?.discount_amount != null || couponPreview?.final_total != null ? (
                  <p className="muted">
                    Preview:{' '}
                    {couponPreview?.discount_amount != null ? `Discount ${formatMoney(couponPreview.discount_amount, totals?.currency ?? 'INR')}` : null}
                    {couponPreview?.final_total != null ? ` · New total ${formatMoney(couponPreview.final_total, totals?.currency ?? 'INR')}` : null}
                  </p>
                ) : null}
              </div>

              <div className="grid checkout-billing">
                <label className="field">
                  <span className="field-label">Name</span>
                  <input className="input" value={billingName} onChange={(e) => setBillingName(e.target.value)} disabled={status !== 'idle'} />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <input className="input" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} disabled={status !== 'idle'} />
                </label>
                <label className="field">
                  <span className="field-label">Phone</span>
                  <input className="input" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} disabled={status !== 'idle'} />
                </label>
                <label className="field">
                  <span className="field-label">GST number (optional)</span>
                  <input className="input" value={billingGst} onChange={(e) => setBillingGst(e.target.value)} disabled={status !== 'idle'} />
                </label>
              </div>

              {totals ? (
                <div className="checkout-totals">
                  <div className="checkout-line">
                    <span className="muted">Subtotal</span>
                    <span>{formatMoney(totals.subtotal, totals.currency)}</span>
                  </div>
                  <div className="checkout-line">
                    <span className="muted">Discount</span>
                    <span>-{formatMoney(totals.discount, totals.currency)}</span>
                  </div>
                  <div className="checkout-line">
                    <span className="muted">Tax</span>
                    <span>{formatMoney(totals.tax, totals.currency)}</span>
                  </div>
                  <div className="checkout-line checkout-total">
                    <span>Total</span>
                    <span>{formatMoney(totals.total, totals.currency)}</span>
                  </div>
                </div>
              ) : (
                <p className="muted">Total will be calculated securely at checkout.</p>
              )}

              {error ? <p className="form-error">{error}</p> : null}

              <button className="button button-solid" type="button" onClick={startCheckout} disabled={!canCheckout}>
                {status === 'creating' ? 'Preparing…' : status === 'paying' ? 'Opening Razorpay…' : status === 'verifying' ? 'Verifying…' : 'Pay securely'}
              </button>

              <p className="muted" style={{ marginTop: 12 }}>
                After payment, access is unlocked only after verified confirmation.
              </p>

              {created?.order?.id ? (
                <p className="muted">
                  Order created:{' '}
                  <Link className="link" to={`/orders/${created.order.id}`}>
                    #{created.order.id}
                  </Link>
                </p>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
