export default function ChartCard({ title, subtitle, children, right = null }) {
  return (
    <div className="panel" style={{ margin: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="section-kicker">{title}</div>
          {subtitle ? <p className="muted" style={{ marginTop: 6 }}>{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

