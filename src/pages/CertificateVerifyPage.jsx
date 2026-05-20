import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { formatDateStandard } from '../utils/formatDate';

function formatDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return formatDateStandard(d) || '—';
}

export default function CertificateVerifyPage() {
  const { certificateCode } = useParams();
  const code = useMemo(() => String(certificateCode ?? '').trim(), [certificateCode]);

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setError('Missing verification code.');
      return;
    }
    let active = true;
    setStatus('loading');
    setError('');
    setResult(null);
    api.public.certificates
      .verify(code)
      .then((data) => {
        if (!active) return;
        setResult(data ?? null);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        if (err?.status === 404) {
          setResult({ valid: false });
          setStatus('ready');
          return;
        }
        setError(err?.message || 'Unable to verify certificate.');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [code]);

  const valid = Boolean(result?.valid);
  const revoked = Boolean(result?.revoked);
  const studentName = result?.student_name ?? '—';
  const courseTitle = result?.course_title ?? '—';
  const issuedAt = result?.issued_at ?? null;

  return (
    <main className="section">
      <div className="container">
        <div className="page-topline">
          <Link className="button" to="/">
            ← Home
          </Link>
        </div>

        <SectionHeading badge="Verify" title="Certificate verification" subtitle="Verify a completion certificate using its code." />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Verifying certificate…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <Link className="button button-solid" to="/">
              Back to home
            </Link>
          </div>
        ) : valid && !revoked ? (
          <div className="panel">
            <div className="checkout-totals">
              <div className="checkout-line">
                <span className="muted">Status</span>
                <span>Valid</span>
              </div>
              <div className="checkout-line">
                <span className="muted">Student</span>
                <span>{studentName}</span>
              </div>
              <div className="checkout-line">
                <span className="muted">Course</span>
                <span>{courseTitle}</span>
              </div>
              <div className="checkout-line">
                <span className="muted">Issued</span>
                <span>{formatDate(issuedAt)}</span>
              </div>
              <div className="checkout-line checkout-total">
                <span>Code</span>
                <span>{result?.certificate_code ?? code}</span>
              </div>
            </div>
          </div>
        ) : revoked ? (
          <div className="panel">
            <p className="form-error">This certificate has been revoked.</p>
          </div>
        ) : (
          <div className="panel">
            <p className="form-error">Invalid certificate code.</p>
            <p className="muted">Please double-check the code and try again.</p>
          </div>
        )}
      </div>
    </main>
  );
}
