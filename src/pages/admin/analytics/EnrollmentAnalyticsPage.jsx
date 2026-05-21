import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import EnrollmentChart from '../../../components/admin/analytics/EnrollmentChart';
import { computeRange, formatRangeLabel } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function EnrollmentAnalyticsPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [enrollments, setEnrollments] = useState(null);

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);
  const rangeLabel = useMemo(() => (rangePreset === 'custom' ? formatRangeLabel(range) : rangePreset.replace('_', ' ')), [rangePreset, range.from, range.to]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.admin.analytics
      .enrollments(token, range)
      .then((res) => {
        if (!active) return;
        setEnrollments(res?.enrollments ?? res ?? null);
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load enrollments.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [token, range.from, range.to]);

  const exportCsv = () => {
    const rows = (enrollments?.daily ?? []).map((d) => [d.day, d.enrollments]);
    downloadCsv({ filename: `enrollments_${range.from}_${range.to}.csv`, headers: ['day', 'enrollments'], rows });
  };

  const exportPdf = () => {
    const rows = (enrollments?.daily ?? []).map((d) => `<tr><td>${d.day}</td><td>${d.enrollments ?? 0}</td></tr>`).join('');
    exportHtmlToPdf({
      title: `Enrollments (${formatRangeLabel(range)})`,
      html: `<table><thead><tr><th>Day</th><th>Enrollments</th></tr></thead><tbody>${rows}</tbody></table>`,
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
            <button className="button button-ghost" type="button" onClick={exportCsv} disabled={!enrollments}>
              Export CSV
            </button>
            <button className="button button-ghost" type="button" onClick={exportPdf} disabled={!enrollments}>
              Export PDF
            </button>
          </div>
        }
      />
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
      <div style={{ marginTop: 16 }}>
        <EnrollmentChart enrollments={enrollments} rangeLabel={rangeLabel} />
      </div>
    </div>
  );
}
