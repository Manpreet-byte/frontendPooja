function escapeCsv(value) {
  const s = String(value ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/\"/g, '""')}"`;
  return s;
}

export function downloadCsv({ filename, headers, rows }) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const lines = [];
  if (safeHeaders.length) lines.push(safeHeaders.map(escapeCsv).join(','));
  for (const row of safeRows) {
    lines.push((Array.isArray(row) ? row : []).map(escapeCsv).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function exportHtmlToPdf({ title, html }) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) return;
  win.document.open();
  win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${String(title ?? 'Export')}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #2e241b; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(46,36,27,0.12); }
      th { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>${String(title ?? 'Export')}</h1>
    ${String(html ?? '')}
    <script>
      window.focus();
      setTimeout(() => window.print(), 50);
    </script>
  </body>
</html>`);
  win.document.close();
}

