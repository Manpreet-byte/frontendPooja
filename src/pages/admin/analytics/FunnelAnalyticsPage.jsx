import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import ChartCard from '../../../components/admin/ChartCard';
import FunnelMetrics from '../../../components/admin/analytics/FunnelMetrics';
import { computeRange } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function FunnelAnalyticsPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [conversions, setConversions] = useState(null);

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.admin.analytics
      .conversions(token, range)
      .then((res) => {
        if (!active) return;
        setConversions(res?.conversions ?? res ?? null);
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load funnel analytics.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [token, range.from, range.to]);

  const exportCsv = () => {
    const c = conversions ?? {};
    downloadCsv({
      filename: `funnel_${range.from}_${range.to}.csv`,
      headers: ['visitors', 'carts', 'checkouts', 'purchases', 'visitors_to_purchase_rate'],
      rows: [[c.visitors ?? 0, c.carts ?? 0, c.checkouts ?? 0, c.purchases ?? 0, c.visitors_to_purchase_rate ?? '']],
    });
  };

  const exportPdf = () => {
    const c = conversions ?? {};
    exportHtmlToPdf({
      title: `Funnel (${range.from} → ${range.to})`,
      html: `<table><tbody>
        <tr><th>Visitors</th><td>${c.visitors ?? 0}</td></tr>
        <tr><th>Add to cart</th><td>${c.carts ?? 0}</td></tr>
        <tr><th>Checkout</th><td>${c.checkouts ?? 0}</td></tr>
        <tr><th>Purchase</th><td>${c.purchases ?? 0}</td></tr>
        <tr><th>Visitor → Purchase</th><td>${c.visitors_to_purchase_rate ?? '—'}%</td></tr>
      </tbody></table>`,
    });
  };

  return (
    <div className="admin-panel">
      <DateRangeFilters
        preset={rangePreset}
        from={rangeFrom}
        to={rangeTo}
        onPreset={setRangePreset}
        onFrom={setRangeFrom}
        onTo={setRangeTo}
        disabled={!token || status === 'loading'}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button button-ghost" type="button" onClick={exportCsv} disabled={!conversions}>
              Export CSV
            </button>
            <button className="button button-ghost" type="button" onClick={exportPdf} disabled={!conversions}>
              Export PDF
            </button>
          </div>
        }
      />
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="Conversion funnel" subtitle="Distinct sessions per step.">
          {conversions ? <FunnelMetrics data={conversions} /> : <p className="muted">No funnel data.</p>}
        </ChartCard>
      </div>
    </div>
  );
}

