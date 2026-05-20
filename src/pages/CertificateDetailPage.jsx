import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatDateStandard } from '../utils/formatDate';

function formatDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return formatDateStandard(d) || '—';
}

export default function CertificateDetailPage() {
  const { courseId } = useParams();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | loading | error
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    if (!token || !courseId) return;
    let active = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        // Route is `/certificates/:courseId` for historical reasons; value may be certificate id or course id.
        let res = null;
        try {
          res = await api.user.certificates.get(token, courseId);
        } catch (err) {
          if (err?.status !== 404) throw err;
        }
        if (!res) res = await api.user.certificates.byCourse(token, courseId);
        if (!active) return;
        setCertificate(res?.certificate ?? null);
      } catch (err) {
        if (!active) return;
        setError(err?.message ?? 'Failed to load certificate');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [token, courseId]);

  const certId = certificate?.id ?? certificate?.certificate_id ?? null;
  const courseTitle = certificate?.course_title ?? certificate?.course?.title ?? 'Course certificate';
  const studentName = certificate?.student_name ?? user?.name ?? '—';
  const verificationCode = certificate?.certificate_code ?? certificate?.verification_code ?? '';
  const issuedAt = certificate?.issued_at ?? certificate?.completed_at ?? null;
  const statusText = certificate?.status ?? 'issued';

  const download = async () => {
    if (!token || !certId || downloadStatus === 'loading') return;
    setDownloadStatus('loading');
    setDownloadError('');
    try {
      const blob = await api.user.certificates.downloadBlob(token, certId);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
      setDownloadStatus('idle');
    } catch (err) {
      if (err?.status === 404) setDownloadError('Certificate download is not available yet.');
      else setDownloadError(err?.message ?? 'Failed to download certificate.');
      setDownloadStatus('error');
    }
  };

  const verifyHref = useMemo(() => {
    if (!verificationCode) return '';
    return `/certificates/verify/${encodeURIComponent(verificationCode)}`;
  }, [verificationCode]);

  return (
    <main className="section">
      <div className="container">
        <div className="page-topline">
          <Link className="button" to="/certificates">
            ← All certificates
          </Link>
        </div>

        <SectionHeading
          badge="Certificate"
          title={courseTitle}
          subtitle="Completion certificate details."
        />

        {loading ? <p className="muted">Loading certificate…</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {downloadError ? <p className="form-error">{downloadError}</p> : null}

        {certificate ? (
          <div className="panel">
            <div className="profile-grid">
              <div>
                <p className="section-kicker">Student</p>
                <p className="h4">{studentName}</p>
                <p className="muted">{user?.email ?? ''}</p>
              </div>
              <div>
                <p className="section-kicker">Issued</p>
                <p className="muted">{formatDate(issuedAt)}</p>
              </div>
              <div>
                <p className="section-kicker">Status</p>
                <p className="muted">{statusText}</p>
              </div>
              <div>
                <p className="section-kicker">Verification code</p>
                <p className="muted">{verificationCode || '—'}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  {certId ? (
                    <button className="button button-solid" type="button" onClick={download} disabled={downloadStatus === 'loading'}>
                      {downloadStatus === 'loading' ? 'Downloading…' : 'Download'}
                    </button>
                  ) : null}
                  {verifyHref ? (
                    <Link className="button button-ghost" to={verifyHref}>
                      Verify (public)
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
