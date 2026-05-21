import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import AnalyticsOverview from '../../../components/admin/analytics/AnalyticsOverview';
import { computeRange, formatRangeLabel } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function AnalyticsOverviewPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [data, setData] = useState({
    dashboard: null,
    revenue: null,
    enrollments: null,
    conversions: null,
    topCourses: null,
    users: null,
    retention: null,
  });

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);
  const rangeLabel = useMemo(() => {
    if (rangePreset === 'today') return 'Today';
    if (rangePreset === 'last_7') return 'Last 7 days';
    if (rangePreset === 'last_30') return 'Last 30 days';
    return formatRangeLabel(range);
  }, [rangePreset, range.from, range.to]);

  const canLoad = Boolean(token);

  useEffect(() => {
    if (!canLoad) return;
    let active = true;
    setStatus('loading');
    setError('');
    Promise.allSettled([
      api.admin.analytics.dashboard(token),
      api.admin.analytics.revenue(token, range),
      api.admin.analytics.enrollments(token, range),
      api.admin.analytics.conversions(token, range),
      api.admin.analytics.topCourses(token, range),
      api.admin.analytics.users(token, range),
      api.admin.analytics.retention(token, range),
    ])
      .then((results) => {
        if (!active) return;
        const [dash, rev, enr, conv, top, users, retention] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
        setData({
          dashboard: dash?.dashboard ?? dash ?? null,
          revenue: rev?.revenue ?? rev ?? null,
          enrollments: enr?.enrollments ?? enr ?? null,
          conversions: conv?.conversions ?? conv ?? null,
          topCourses: top?.top_courses ?? top ?? null,
          users: users?.users ?? users ?? null,
          retention: retention?.retention ?? retention ?? null,
        });
        const firstErr = results.find((r) => r.status === 'rejected')?.reason;
        setError(firstErr?.message ?? '');
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load analytics.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [canLoad, token, range.from, range.to]);

  const onExportCsv = () => {
    const rows = (data.revenue?.daily ?? []).map((d) => [d.day, d.revenue_cents, d.payments]);
    downloadCsv({
      filename: `revenue_${range.from}_${range.to}.csv`,
      headers: ['day', 'revenue_cents', 'payments'],
      rows,
    });
  };

  const onExportPdf = () => {
    const rows = (data.revenue?.daily ?? []).map((d) => `<tr><td>${d.day}</td><td>${d.revenue_cents}</td><td>${d.payments ?? 0}</td></tr>`).join('');
    exportHtmlToPdf({
      title: `Revenue export (${rangeLabel})`,
      html: `<table><thead><tr><th>Day</th><th>Revenue (cents)</th><th>Payments</th></tr></thead><tbody>${rows}</tbody></table>`,
    });
  };

  return (
    <div>
      <DateRangeFilters
        preset={rangePreset}
        from={rangeFrom}
        to={rangeTo}
        onPreset={setRangePreset}
        onFrom={setRangeFrom}
        onTo={setRangeTo}
        disabled={!canLoad || status === 'loading'}
        right={
          <button className="button button-solid" type="button" disabled={!canLoad || status === 'loading'} onClick={() => setRangePreset((p) => p)}>
            {status === 'loading' ? 'Loading…' : 'Refresh'}
          </button>
        }
      />

      {!canLoad ? <p className="form-error" style={{ marginTop: 12 }}>Login as an admin to view analytics.</p> : null}
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}

      <div style={{ marginTop: 16 }}>
        <AnalyticsOverview
          dashboard={data.dashboard}
          revenue={data.revenue}
          enrollments={data.enrollments}
          conversions={data.conversions}
          topCourses={data.topCourses}
          users={data.users}
          retention={data.retention}
          rangeLabel={rangeLabel}
          onExportCsv={onExportCsv}
          onExportPdf={onExportPdf}
        />
      </div>
    </div>
  );
}
