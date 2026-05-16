import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import ChartCard from '../../../components/admin/ChartCard';
import { computeRange } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function RetentionAnalyticsPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [retention, setRetention] = useState(null);

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.admin.analytics
      .retention(token, range)
      .then((res) => {
        if (!active) return;
        setRetention(res?.retention ?? res ?? null);
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load retention analytics.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [token, range.from, range.to]);

  const exportCsv = () => {
    const rows = (retention?.cohorts ?? []).map((c) => [c.cohort, c.users, c.retained_7d, c.rate_7d, c.retained_30d, c.rate_30d]);
    downloadCsv({
      filename: `retention_${range.from}_${range.to}.csv`,
      headers: ['cohort', 'users', 'retained_7d', 'rate_7d_pct', 'retained_30d', 'rate_30d_pct'],
      rows,
    });
  };

  const exportPdf = () => {
    const rows = (retention?.cohorts ?? [])
      .map((c) => `<tr><td>${c.cohort}</td><td>${c.users}</td><td>${c.rate_7d ?? '—'}%</td><td>${c.rate_30d ?? '—'}%</td></tr>`)
      .join('');
    exportHtmlToPdf({
      title: `Retention (${range.from} → ${range.to})`,
      html: `<table><thead><tr><th>Cohort</th><th>Users</th><th>7d</th><th>30d</th></tr></thead><tbody>${rows}</tbody></table>`,
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
            <button className="button button-ghost" type="button" onClick={exportCsv} disabled={!retention}>
              Export CSV
            </button>
            <button className="button button-ghost" type="button" onClick={exportPdf} disabled={!retention}>
              Export PDF
            </button>
          </div>
        }
      />
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="Retention" subtitle={retention?.note ?? 'Cohort retention proxy.'}>
          {retention?.cohorts?.length ? (
            <div className="admin-table">
              <div className="admin-row admin-head">
                <div className="admin-cell-wrap">Cohort</div>
                <div className="admin-cell-wrap">Users</div>
                <div className="admin-cell-wrap">Retained 7d</div>
                <div className="admin-cell-wrap">Retained 30d</div>
              </div>
              {retention.cohorts.map((c) => (
                <div key={c.cohort} className="admin-row">
                  <div className="admin-cell-wrap">{c.cohort}</div>
                  <div className="admin-cell-wrap">{Number(c.users ?? 0).toLocaleString()}</div>
                  <div className="admin-cell-wrap">{c.rate_7d == null ? '—' : `${c.rate_7d}%`}</div>
                  <div className="admin-cell-wrap">{c.rate_30d == null ? '—' : `${c.rate_30d}%`}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No cohort data.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

