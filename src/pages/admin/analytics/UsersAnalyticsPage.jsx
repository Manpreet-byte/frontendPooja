import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import DateRangeFilters from '../../../components/admin/analytics/DateRangeFilters';
import ChartCard from '../../../components/admin/ChartCard';
import SparklineLineChart from '../../../components/admin/SparklineLineChart';
import { computeRange } from '../../../utils/admin/dateRange';
import { downloadCsv, exportHtmlToPdf } from '../../../utils/admin/exporters';

export default function UsersAnalyticsPage({ rangePreset, rangeFrom, rangeTo, setRangePreset, setRangeFrom, setRangeTo }) {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [users, setUsers] = useState(null);

  const range = useMemo(() => computeRange({ preset: rangePreset, from: rangeFrom, to: rangeTo }), [rangePreset, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    setError('');
    api.admin.analytics
      .users(token, range)
      .then((res) => {
        if (!active) return;
        setUsers(res?.users ?? res ?? null);
        setStatus('idle');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load users analytics.');
        setStatus('idle');
      });
    return () => {
      active = false;
    };
  }, [token, range.from, range.to]);

  const newUsersSeries = (users?.new_users_daily ?? []).map((d) => ({ label: d.day, value: Number(d.users ?? 0) }));
  const activeUsersSeries = (users?.active_users_daily ?? []).map((d) => ({ label: d.day, value: Number(d.users ?? 0) }));

  const exportCsv = () => {
    const rows = (users?.new_users_daily ?? []).map((d) => [d.day, d.users]);
    downloadCsv({ filename: `new_users_${range.from}_${range.to}.csv`, headers: ['day', 'new_users'], rows });
  };

  const exportPdf = () => {
    const rows = (users?.top_users_by_spend ?? [])
      .map((u) => `<tr><td>${u.email ?? ''}</td><td>${u.name ?? ''}</td><td>${u.spend_cents ?? 0}</td><td>${u.orders ?? 0}</td></tr>`)
      .join('');
    exportHtmlToPdf({
      title: `Top users by spend`,
      html: `<table><thead><tr><th>Email</th><th>Name</th><th>Spend (cents)</th><th>Orders</th></tr></thead><tbody>${rows}</tbody></table>`,
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
            <button className="button button-ghost" type="button" onClick={exportCsv} disabled={!users}>
              Export CSV
            </button>
            <button className="button button-ghost" type="button" onClick={exportPdf} disabled={!users}>
              Export PDF
            </button>
          </div>
        }
      />

      {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}

      <div className="admin-two-col" style={{ marginTop: 16 }}>
        <ChartCard title="New users" subtitle="Signups per day.">
          {newUsersSeries.length ? <SparklineLineChart data={newUsersSeries} height={180} /> : <p className="muted">No signup data.</p>}
        </ChartCard>
        <ChartCard title="Active users" subtitle="Distinct users by last login date.">
          {activeUsersSeries.length ? <SparklineLineChart data={activeUsersSeries} height={180} /> : <p className="muted">No activity data.</p>}
        </ChartCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartCard title="Top users by spend" subtitle="Lifetime captured spend (not range-limited).">
          {users?.top_users_by_spend?.length ? (
            <div className="admin-table">
              <div className="admin-row admin-head">
                <div className="admin-cell-wrap">Email</div>
                <div className="admin-cell-wrap">Name</div>
                <div className="admin-cell-wrap">Spend (cents)</div>
                <div className="admin-cell-wrap">Orders</div>
              </div>
              {users.top_users_by_spend.slice(0, 15).map((u) => (
                <div key={u.user_id ?? u.email} className="admin-row">
                  <div className="admin-cell-wrap">{u.email ?? ''}</div>
                  <div className="admin-cell-wrap">{u.name ?? ''}</div>
                  <div className="admin-cell-wrap">{Number(u.spend_cents ?? 0).toLocaleString()}</div>
                  <div className="admin-cell-wrap">{Number(u.orders ?? 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No spend data.</p>
          )}
          {users?.engagement?.note ? <p className="muted" style={{ marginTop: 10 }}>{users.engagement.note}</p> : null}
        </ChartCard>
      </div>
    </div>
  );
}

