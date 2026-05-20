import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatDateStandard } from '../utils/formatDate';

function formatDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return formatDateStandard(d) || '—';
}

export default function CertificatesPage() {
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError('');
    api.user.certificates
      .list(token)
      .then((data) => {
        if (!active) return;
        setCertificates(data?.certificates ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load certificates');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const normalized = useMemo(() => {
    const list = Array.isArray(certificates) ? certificates.slice() : [];
    list.sort((a, b) => {
      const aMs = a?.issued_at ? new Date(a.issued_at).getTime() : 0;
      const bMs = b?.issued_at ? new Date(b.issued_at).getTime() : 0;
      return bMs - aMs;
    });
    return list;
  }, [certificates]);

  const download = async (id) => {
    if (!token || !id || downloadingId) return;
    setDownloadingId(id);
    setDownloadError('');
    try {
      const blob = await api.user.certificates.downloadBlob(token, id);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err?.status === 404) setDownloadError('Certificate download is not available yet.');
      else setDownloadError(err?.message ?? 'Failed to download certificate.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Certificates" title="Your certificates" subtitle="Certificates unlock when you complete a course." />

        {loading ? <p className="muted">Loading certificates…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {downloadError ? <p className="form-error">{downloadError}</p> : null}

        <div className="panel">
          {normalized.length ? (
            <ul className="list">
              {normalized.map((c) => {
                const id = c.id ?? c.certificate_id;
                const courseTitle = c?.course_title ?? c?.course?.title ?? 'Course certificate';
                const status = c?.status ?? 'issued';
                const issuedAt = c?.issued_at ?? c?.completed_at ?? null;
                const viewId = id ?? c?.course?.id;
                return (
                <li key={c.id ?? c.certificate_id}>
                  <strong>{courseTitle}</strong>
                  <div className="muted">
                    {status === 'processing' ? 'Processing' : status === 'unavailable' ? 'Unavailable' : 'Issued'} · {formatDate(issuedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                    {viewId ? (
                      <Link className="link" to={`/certificates/${encodeURIComponent(viewId)}`}>
                        View certificate
                      </Link>
                    ) : null}
                    {id ? (
                      <button className="link" type="button" onClick={() => download(id)} disabled={downloadingId === id}>
                        {downloadingId === id ? 'Downloading…' : 'Download'}
                      </button>
                    ) : null}
                  </div>
                </li>
              )})}
            </ul>
          ) : (
            <p className="muted">No certificates yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
