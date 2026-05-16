export default function FunnelMetrics({ data }) {
  const visitors = Number(data?.visitors ?? 0);
  const carts = Number(data?.carts ?? 0);
  const checkouts = Number(data?.checkouts ?? 0);
  const purchases = Number(data?.purchases ?? 0);

  const rate = (a, b) => (a > 0 ? Math.round((b / a) * 10000) / 100 : null);

  return (
    <div>
      <div className="admin-table">
        <div className="admin-row admin-head">
          <div className="admin-cell-wrap">Step</div>
          <div className="admin-cell-wrap">Count</div>
          <div className="admin-cell-wrap">Conversion</div>
        </div>
        <div className="admin-row">
          <div className="admin-cell-wrap">Visitors</div>
          <div className="admin-cell-wrap">{visitors.toLocaleString()}</div>
          <div className="admin-cell-wrap">—</div>
        </div>
        <div className="admin-row">
          <div className="admin-cell-wrap">Add to cart</div>
          <div className="admin-cell-wrap">{carts.toLocaleString()}</div>
          <div className="admin-cell-wrap">{rate(visitors, carts) == null ? '—' : `${rate(visitors, carts)}%`}</div>
        </div>
        <div className="admin-row">
          <div className="admin-cell-wrap">Checkout</div>
          <div className="admin-cell-wrap">{checkouts.toLocaleString()}</div>
          <div className="admin-cell-wrap">{rate(carts || visitors, checkouts) == null ? '—' : `${rate(carts || visitors, checkouts)}%`}</div>
        </div>
        <div className="admin-row">
          <div className="admin-cell-wrap">Purchase</div>
          <div className="admin-cell-wrap">{purchases.toLocaleString()}</div>
          <div className="admin-cell-wrap">{rate(visitors, purchases) == null ? '—' : `${rate(visitors, purchases)}%`}</div>
        </div>
      </div>
      {data?.note ? <p className="muted" style={{ marginTop: 10 }}>{data.note}</p> : null}
    </div>
  );
}

