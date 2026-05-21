import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import RevenueChart from '../../../components/admin/analytics/RevenueChart';
import { computeRange, formatRangeLabel } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function RevenueAnalyticsPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [revenue, setRevenue] = useState(null);

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);
  const rangeLabel = useMemo(() => (rangePreset === 'custom' ? formatRangeLabel(range) : rangePreset.replace('_', ' ')), [rangePreset, range.from, range.to]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.admin.analytics
      .revenue(token, range)
      .then((res) => {
        if (!active) return;
        setRevenue(res?.revenue ?? res ?? null);
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load revenue.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [token, range.from, range.to]);

  const exportCsv = () => {
    const rows = (revenue?.daily ?? []).map((d) => [d.day, d.revenue_cents, d.payments]);
    downloadCsv({ filename: `revenue_${range.from}_${range.to}.csv`, headers: ['day', 'revenue_cents', 'payments'], rows });
  };

  const exportPdf = () => {
    const rows = (revenue?.daily ?? []).map((d) => `<tr><td>${d.day}</td><td>${d.revenue_cents}</td><td>${d.payments ?? 0}</td></tr>`).join('');
    exportHtmlToPdf({
      title: `Revenue (${formatRangeLabel(range)})`,
      html: `<table><thead><tr><th>Day</th><th>Revenue (cents)</th><th>Payments</th></tr></thead><tbody>${rows}</tbody></table>`,
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
            <button className="button button-ghost" type="button" onClick={exportCsv} disabled={!revenue}>
              Export CSV
            </button>
            <button className="button button-ghost" type="button" onClick={exportPdf} disabled={!revenue}>
              Export PDF
            </button>
          </div>
        }
      />

      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
      <div style={{ marginTop: 16 }}>
        <RevenueChart revenue={revenue} rangeLabel={rangeLabel} />
      </div>
    </div>
  );
}
