import ChartCard from '../ChartCard';
import SparklineLineChart from '../SparklineLineChart';
import SparklineBarChart from '../SparklineBarChart';
import FunnelMetrics from './FunnelMetrics';
import TopCoursesTable from './TopCoursesTable';

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function AnalyticsOverview({
  dashboard,
  revenue,
  enrollments,
  conversions,
  topCourses,
  users,
  retention,
  rangeLabel,
  onExportCsv,
  onExportPdf,
}) {
  const totalRevenue = revenue?.totals?.total_sales_cents ?? dashboard?.revenue?.total_revenue_cents ?? 0;
  const totalEnrollments = enrollments?.totals?.total_enrollments ?? dashboard?.enrollments?.total_enrollments ?? 0;
  const activeUsers30d = users?.active_users_30d ?? dashboard?.users?.active_users_30d ?? 0;
  const visitorsToPurchase = conversions?.visitors_to_purchase_rate ?? dashboard?.conversion?.visitors_to_purchase_rate ?? null;

  const revenueSeries = (revenue?.daily ?? []).map((d) => ({ label: d.day, value: Number(d.revenue_cents ?? 0) / 100 }));
  const enrollmentSeries = (enrollments?.daily ?? []).map((d) => ({ label: d.day, value: Number(d.enrollments ?? 0) }));
  const activeUsersSeries = (users?.active_users_daily ?? []).map((d) => ({ label: d.day, value: Number(d.users ?? 0) }));

  return (
    <div className="admin-panel">
      <div className="admin-metrics-grid">
        <div className="panel admin-metric-card">
          <div className="section-kicker">Revenue ({rangeLabel})</div>
          <div className="admin-metric-value">{formatMoney(totalRevenue, 'INR')}</div>
        </div>
        <div className="panel admin-metric-card">
          <div className="section-kicker">Enrollments ({rangeLabel})</div>
          <div className="admin-metric-value">{Number(totalEnrollments).toLocaleString()}</div>
        </div>
        <div className="panel admin-metric-card">
          <div className="section-kicker">Active users (30d)</div>
          <div className="admin-metric-value">{Number(activeUsers30d).toLocaleString()}</div>
        </div>
        <div className="panel admin-metric-card">
          <div className="section-kicker">Visitor → Purchase</div>
          <div className="admin-metric-value">{visitorsToPurchase == null ? '—' : `${visitorsToPurchase}%`}</div>
        </div>
      </div>

      <div className="admin-two-col" style={{ marginTop: 16 }}>
        <ChartCard
          title="Revenue"
          subtitle="Captured payments over time."
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button button-ghost" type="button" onClick={onExportCsv}>
                Export CSV
              </button>
              <button className="button button-ghost" type="button" onClick={onExportPdf}>
                Export PDF
              </button>
            </div>
          }
        >
          {revenueSeries.length ? <SparklineLineChart data={revenueSeries} height={160} /> : <p className="muted">No revenue data.</p>}
        </ChartCard>

        <ChartCard title="Enrollments" subtitle="New enrollments over time.">
          {enrollmentSeries.length ? (
            <SparklineBarChart data={enrollmentSeries} height={160} />
          ) : (
            <p className="muted">No enrollment data.</p>
          )}
        </ChartCard>
      </div>

      <div className="admin-two-col" style={{ marginTop: 16 }}>
        <ChartCard title="Active users" subtitle="Distinct users by last login date.">
          {activeUsersSeries.length ? <SparklineLineChart data={activeUsersSeries} height={160} /> : <p className="muted">No activity data.</p>}
        </ChartCard>
        <ChartCard title="Conversion funnel" subtitle="Distinct sessions per step.">
          <FunnelMetrics data={conversions} />
        </ChartCard>
      </div>

      <div className="admin-two-col" style={{ marginTop: 16 }}>
        <ChartCard title="Top courses" subtitle="Best performing courses for the selected range.">
          <TopCoursesTable data={topCourses} />
        </ChartCard>
        <ChartCard title="Retention" subtitle="Cohort retention proxy based on last login." right={null}>
          {retention?.cohorts?.length ? (
            <div className="admin-table">
              <div className="admin-row admin-head">
                <div className="admin-cell-wrap">Cohort</div>
                <div className="admin-cell-wrap">Users</div>
                <div className="admin-cell-wrap">7d</div>
                <div className="admin-cell-wrap">30d</div>
              </div>
              {retention.cohorts.slice(0, 8).map((c) => (
                <div key={c.cohort} className="admin-row">
                  <div className="admin-cell-wrap">{c.cohort}</div>
                  <div className="admin-cell-wrap">{Number(c.users ?? 0).toLocaleString()}</div>
                  <div className="admin-cell-wrap">{c.rate_7d == null ? '—' : `${c.rate_7d}%`}</div>
                  <div className="admin-cell-wrap">{c.rate_30d == null ? '—' : `${c.rate_30d}%`}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{retention?.note ?? 'No retention data.'}</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

