import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

function readOrderHistory() {
  try {
    const raw = localStorage.getItem('love-and-flour-order-history');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function OrdersPage() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);

  const canLoad = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!canLoad) return;
    if (!api?.orders?.listMine || !api?.orders?.get) {
      setStatus('error');
      setError('Orders API is not available in this build.');
      return;
    }
    let active = true;
    setStatus('loading');
    setError('');
    setOrders([]);

    // Prefer backend list if available; fallback to local order history ids.
    api.orders
      .listMine(token)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.orders) ? data.orders : [];
        setOrders(list);
        setStatus('ready');
      })
      .catch(async (err) => {
        if (!active) return;
        if (err?.status !== 404) {
          setError(err?.message || 'Unable to load orders.');
          setStatus('error');
          return;
        }

        const ids = readOrderHistory();
        if (!ids.length) {
          setStatus('ready');
          setOrders([]);
          return;
        }

        try {
          const results = await Promise.allSettled(ids.slice(0, 20).map((id) => api.orders.get(token, id)));
          if (!active) return;
          const normalized = results
            .filter((r) => r.status === 'fulfilled' && r.value?.order)
            .map((r) => r.value.order);
          setOrders(normalized);
          setStatus('ready');
        } catch (e) {
          if (!active) return;
          setError(e?.message || 'Unable to load orders.');
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [canLoad, token]);

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Orders" title="Your purchases" subtitle="Track payments and access invoices when available." />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Loading orders…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <button className="button button-solid" type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        ) : orders.length ? (
          <div className="panel">
            <div className="table-shell">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(Boolean).map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.status}</td>
                      <td>{formatMoney(o.total_cents ?? o.totalCents, o.currency)}</td>
                      <td>{o.created_at ? formatDateTimeStandard(o.created_at) : '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link className="link" to={`/orders/${o.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="panel">
            <p className="muted">No orders yet.</p>
            <Link className="button button-solid" to="/courses">
              Browse workshops
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
