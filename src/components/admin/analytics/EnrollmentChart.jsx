import ChartCard from '../ChartCard';
import SparklineBarChart from '../SparklineBarChart';

export default function EnrollmentChart({ enrollments, rangeLabel, right = null }) {
  const series = (enrollments?.daily ?? []).map((d) => ({ label: d.day, value: Number(d.enrollments ?? 0) }));
  const total = enrollments?.totals?.total_enrollments ?? 0;
  const active = enrollments?.totals?.active_students ?? 0;

  return (
    <ChartCard title="Enrollments" subtitle={`New enrollments · ${rangeLabel}`} right={right}>
      <div className="admin-metrics-grid" style={{ marginTop: 0 }}>
        <div className="panel admin-metric-card">
          <div className="section-kicker">Total</div>
          <div className="admin-metric-value">{Number(total).toLocaleString()}</div>
        </div>
        <div className="panel admin-metric-card">
          <div className="section-kicker">Active students</div>
          <div className="admin-metric-value">{Number(active).toLocaleString()}</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        {series.length ? <SparklineBarChart data={series} height={180} /> : <p className="muted">No enrollment data.</p>}
      </div>
    </ChartCard>
  );
}

