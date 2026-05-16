import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function OrderSuccessPage() {
  const token = useAuthStore((s) => s.token);
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState('idle');
  const [invoiceError, setInvoiceError] = useState('');

  const canLoad = useMemo(() => Boolean(orderId && token), [orderId, token]);

  useEffect(() => {
    if (!canLoad) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.orders
      .get(token, orderId)
      .then((res) => {
        if (!active) return;
        setData(res);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Unable to load order.');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [canLoad, token, orderId]);

  const order = data?.order;

  const onDownloadInvoice = async () => {
    if (!token || !order?.id || invoiceStatus === 'loading') return;
    setInvoiceStatus('loading');
    setInvoiceError('');
    try {
      const blob = await api.orders.invoiceBlob(token, order.id);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-order-${order.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      setInvoiceStatus('idle');
    } catch (err) {
      if (err?.status === 404) setInvoiceError('Invoice is not available yet for this order.');
      else setInvoiceError(err?.message || 'Unable to download invoice.');
      setInvoiceStatus('idle');
    }
  };

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Order" title="Payment confirmed" subtitle="Your purchase is verified and your access is being unlocked." />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Loading order…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <Link className="button button-solid" to="/orders">
              View orders
            </Link>
          </div>
        ) : (
          <div className="panel">
            <div className="checkout-totals">
              <div className="checkout-line">
                <span className="muted">Order</span>
                <span>#{order?.id}</span>
              </div>
              <div className="checkout-line">
                <span className="muted">Status</span>
                <span>{order?.status}</span>
              </div>
              <div className="checkout-line checkout-total">
                <span>Total</span>
                <span>{formatMoney(order?.total_cents ?? order?.totalCents, order?.currency)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              <Link className="button button-solid" to="/dashboard">
                Go to dashboard
              </Link>
              <button className="button button-ghost" type="button" onClick={onDownloadInvoice} disabled={invoiceStatus === 'loading'}>
                {invoiceStatus === 'loading' ? 'Downloading…' : 'Download invoice'}
              </button>
              <Link className="button button-ghost" to={`/orders/${order?.id}`}>
                View order details
              </Link>
              <Link className="button button-ghost" to="/courses">
                Browse more
              </Link>
            </div>
            {invoiceError ? <p className="muted" style={{ marginTop: 12 }}>{invoiceError}</p> : null}
          </div>
        )}
      </div>
    </main>
  );
}
