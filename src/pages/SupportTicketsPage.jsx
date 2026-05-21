import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { formatDateTimeStandard } from '../utils/formatDate';

const categories = [
  { value: 'payment', label: 'Payment' },
  { value: 'access', label: 'Access issue' },
  { value: 'technical', label: 'Technical' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'live_workshop', label: 'Live workshop' },
  { value: 'refund', label: 'Refund request' },
  { value: 'other', label: 'Other' },
];

export default function SupportTicketsPage() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');

  const navigate = useNavigate();
  const canLoad = useMemo(() => Boolean(token), [token]);

  const load = async () => {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const data = await api.support.tickets.listMine(token, { limit: 50 });
      setTickets(data?.tickets ?? []);
      setStatus('ready');
    } catch (err) {
      setError(err?.message ?? 'Failed to load support tickets');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  const createTicket = async () => {
    if (!token) return;
    const subj = String(subject ?? '').trim();
    const msg = String(messageText ?? '').trim();
    if (subj.length < 3 || msg.length < 3) return;
    setCreating(true);
    setError('');
    try {
      const data = await api.support.tickets.create(token, { category, subject: subj, message_text: msg });
      const ticketId = data?.ticket?.id ?? data?.ticket?.ticket_id ?? data?.ticket_id ?? data?.ticket?.id;
      setFormOpen(false);
      setSubject('');
      setMessageText('');
      await load();
      if (ticketId) navigate(`/support/${encodeURIComponent(ticketId)}`);
    } catch (err) {
      setError(err?.message ?? 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="section">
      <div className="container">
        <SectionHeading badge="Support" title="Help desk" subtitle="Create a ticket and our team will get back to you." />

        {status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <button className="button button-solid" type="button" onClick={load}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="panel" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div className="h3" style={{ margin: 0 }}>My support tickets</div>
              <div className="muted" style={{ marginTop: 6 }}>Payment, access, technical issues, and workshop support.</div>
            </div>
            <button className="button button-solid" type="button" onClick={() => setFormOpen((v) => !v)} disabled={status === 'loading'}>
              {formOpen ? 'Close' : 'New ticket'}
            </button>
          </div>

          {formOpen ? (
            <div className="panel" style={{ marginTop: 12 }}>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="admin-split">
                <label className="field">
                  <span className="field-label">Category</span>
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} disabled={creating}>
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Subject</span>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={creating} placeholder="Eg. Unable to access course after payment" />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Message</span>
                <textarea className="input textarea" rows={5} value={messageText} onChange={(e) => setMessageText(e.target.value)} disabled={creating} placeholder="Add details so we can help quickly…" />
              </label>
              <div className="button-row">
                <button className="button button-solid" type="button" onClick={createTicket} disabled={creating}>
                  {creating ? 'Creating…' : 'Create ticket'}
                </button>
              </div>
            </div>
          ) : null}

          {status === 'loading' ? <p className="muted" style={{ marginTop: 12 }}>Loading tickets…</p> : null}

          {status !== 'loading' && !tickets.length ? (
            <div style={{ marginTop: 12 }}>
              <p className="muted">No tickets yet.</p>
              <Link className="link" to="/courses">
                Browse workshops
              </Link>
            </div>
          ) : null}

          {tickets.length ? (
            <div className="table-shell" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>#{t.id} · {t.subject}</td>
                      <td>{t.status}</td>
                      <td>{t.category}</td>
                      <td>{t.updated_at ? formatDateTimeStandard(t.updated_at) : '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link className="link" to={`/support/${encodeURIComponent(t.id)}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
