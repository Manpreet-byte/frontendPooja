import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatDateTimeStandard } from '../utils/formatDate';

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function downloadInvoice({ token, orderId }) {
  const blob = await api.orders.invoiceBlob(token, orderId);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-order-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState('idle'); // idle | loading | error | done
  const [invoiceError, setInvoiceError] = useState('');

  const canLoad = useMemo(() => Boolean(token && id), [token, id]);

  const load = async () => {
    if (!canLoad) return;
    setStatus('loading');
    setError('');
    try {
      const res = await api.orders.get(token, id);
      setData(res);
      setStatus('ready');
    } catch (err) {
      setError(err?.message || 'Unable to load order.');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, token, id]);

  const order = data?.order ?? data?.data?.order ?? null;
  const items = data?.items ?? order?.items ?? data?.order?.items ?? [];
  const payments = data?.payments ?? [];
  const currency = order?.currency ?? 'INR';
  const totalCents = order?.total_amount ?? order?.total_cents ?? order?.totalCents ?? order?.totalCents ?? null;

  const onDownloadInvoice = async () => {
    if (!token || !order?.id || invoiceStatus === 'loading') return;
    setInvoiceStatus('loading');
    setInvoiceError('');
    try {
      await downloadInvoice({ token, orderId: order.id });
      setInvoiceStatus('done');
    } catch (err) {
      if (err?.status === 404) setInvoiceError('Invoice is not available yet for this order.');
      else setInvoiceError(err?.message || 'Unable to download invoice.');
      setInvoiceStatus('error');
    } finally {
      window.setTimeout(() => setInvoiceStatus('idle'), 1200);
    }
  };

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Order" title={`Order #${id ?? ''}`} subtitle="Review payment status and download invoices when available." />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Loading order…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="button button-solid" type="button" onClick={load}>
                Retry
              </button>
              <Link className="button button-ghost" to="/orders">
                Back to orders
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="panel">
              <div className="checkout-totals">
                <div className="checkout-line">
                  <span className="muted">Status</span>
                  <span>{order?.status ?? '-'}</span>
                </div>
                <div className="checkout-line">
                  <span className="muted">Created</span>
                  <span>{order?.created_at ? formatDateTimeStandard(order.created_at) : '-'}</span>
                </div>
                <div className="checkout-line checkout-total">
                  <span>Total paid</span>
                  <span>{totalCents == null ? '-' : formatMoney(totalCents, currency)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button className="button button-solid" type="button" onClick={onDownloadInvoice} disabled={invoiceStatus === 'loading'}>
                  {invoiceStatus === 'loading' ? 'Downloading…' : 'Download invoice'}
                </button>
                <button className="button button-ghost" type="button" onClick={load}>
                  Refresh status
                </button>
                <Link className="button button-ghost" to="/dashboard">
                  Go to dashboard
                </Link>
              </div>

              {invoiceError ? <p className="muted" style={{ marginTop: 12 }}>{invoiceError}</p> : null}
            </div>

            {Array.isArray(items) && items.length ? (
              <div className="panel" style={{ marginTop: 16 }}>
                <h2 className="h3">Items</h2>
                <div className="table-shell">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Workshop</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id ?? `${it.course_id}-${it.title}`}>
                          <td>{it.title ?? it.course_title ?? it.course?.title ?? `Course #${it.course_id ?? ''}`}</td>
                          <td>{it.quantity ?? 1}</td>
                          <td style={{ textAlign: 'right' }}>
                            {it.total_amount != null || it.total_cents != null || it.totalCents != null
                              ? formatMoney(it.total_amount ?? it.total_cents ?? it.totalCents, currency)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {Array.isArray(payments) && payments.length ? (
              <div className="panel" style={{ marginTop: 16 }}>
                <h2 className="h3">Payments</h2>
                <div className="table-shell">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Reference</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id ?? `${p.provider}-${p.provider_payment_id}`}>
                          <td>{p.provider ?? '-'}</td>
                          <td>{p.status ?? '-'}</td>
                          <td>{p.provider_payment_id ?? p.providerOrderId ?? '-'}</td>
                          <td>{p.created_at ? formatDateTimeStandard(p.created_at) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
