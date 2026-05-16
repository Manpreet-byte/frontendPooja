import { useMemo } from 'react';

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function TopCoursesTable({ data }) {
  const byRevenue = useMemo(() => (data?.by_revenue ?? data?.byRevenue ?? data?.top_by_revenue ?? []), [data]);
  const byEnrollments = useMemo(() => (data?.by_enrollments ?? data?.byEnrollments ?? []), [data]);
  const rows = byRevenue.length ? byRevenue : byEnrollments;

  if (!rows?.length) return <p className="muted">No course analytics for this range.</p>;

  return (
    <div className="admin-table">
      <div className="admin-row admin-head">
        <div className="admin-cell-wrap">Course</div>
        <div className="admin-cell-wrap">{byRevenue.length ? 'Revenue' : 'Enrollments'}</div>
        <div className="admin-cell-wrap">Orders</div>
      </div>
      {rows.slice(0, 12).map((r) => (
        <div key={r.course_id ?? r.courseId ?? r.title} className="admin-row">
          <div className="admin-cell-wrap">{r.title ?? 'Course'}</div>
          <div className="admin-cell-wrap">
            {byRevenue.length ? formatMoney(r.revenue_cents ?? 0, 'INR') : Number(r.enrollments ?? 0).toLocaleString()}
          </div>
          <div className="admin-cell-wrap">{r.orders == null ? '—' : Number(r.orders).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

