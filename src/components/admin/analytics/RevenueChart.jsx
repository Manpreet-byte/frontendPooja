import ChartCard from '../ChartCard';
import SparklineLineChart from '../SparklineLineChart';

function formatMoney(cents, currency = 'INR') {
  const amount = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function RevenueChart({ revenue, rangeLabel, right = null }) {
  const series = (revenue?.daily ?? []).map((d) => ({ label: d.day, value: Number(d.revenue_cents ?? 0) / 100 }));
  const total = revenue?.totals?.total_sales_cents ?? 0;

  return (
    <ChartCard title="Revenue" subtitle={`Captured payments · ${rangeLabel}`} right={right}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div className="section-kicker">Total</div>
          <div className="h3" style={{ margin: 0 }}>{formatMoney(total, 'INR')}</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        {series.length ? <SparklineLineChart data={series} height={180} /> : <p className="muted">No revenue data.</p>}
      </div>
    </ChartCard>
  );
}

