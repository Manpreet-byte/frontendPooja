import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import ChartCard from '../../../components/admin/ChartCard';
import TopCoursesTable from '../../../components/admin/analytics/TopCoursesTable';
import { computeRange } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function TopCoursesAnalyticsPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [topCourses, setTopCourses] = useState(null);

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.admin.analytics
      .topCourses(token, range)
      .then((res) => {
        if (!active) return;
        setTopCourses(res?.top_courses ?? res ?? null);
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load top courses.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [token, range.from, range.to]);

  const exportCsv = () => {
    const rows = (topCourses?.by_revenue ?? []).map((r) => [r.course_id, r.title, r.revenue_cents, r.orders]);
    downloadCsv({ filename: `top_courses_${range.from}_${range.to}.csv`, headers: ['course_id', 'title', 'revenue_cents', 'orders'], rows });
  };

  const exportPdf = () => {
    const rows = (topCourses?.by_revenue ?? [])
      .map((r) => `<tr><td>${r.title ?? ''}</td><td>${r.revenue_cents ?? 0}</td><td>${r.orders ?? 0}</td></tr>`)
      .join('');
    exportHtmlToPdf({
      title: `Top courses (${range.from} → ${range.to})`,
      html: `<table><thead><tr><th>Course</th><th>Revenue (cents)</th><th>Orders</th></tr></thead><tbody>${rows}</tbody></table>`,
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
            <button className="button button-ghost" type="button" onClick={exportCsv} disabled={!topCourses}>
              Export CSV
            </button>
            <button className="button button-ghost" type="button" onClick={exportPdf} disabled={!topCourses}>
              Export PDF
            </button>
          </div>
        }
      />
      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="Top courses" subtitle="By revenue (captured payments).">
          <TopCoursesTable data={topCourses} />
        </ChartCard>
      </div>
    </div>
  );
}

