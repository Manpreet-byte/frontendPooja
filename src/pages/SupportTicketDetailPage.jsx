import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function SupportTicketDetailPage() {
  const token = useAuthStore((s) => s.token);
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastLoadKey = useRef(0);

  const ticketId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  const load = async () => {
    if (!token || !ticketId) return;
    const key = (lastLoadKey.current += 1);
    setStatus('loading');
    setError('');
    try {
      const data = await api.support.tickets.get(token, ticketId);
      if (key !== lastLoadKey.current) return;
      setTicket(data?.ticket ?? null);
      setMessages(data?.messages ?? []);
      setStatus('ready');
    } catch (err) {
      if (key !== lastLoadKey.current) return;
      setError(err?.message ?? 'Failed to load ticket');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ticketId]);

  const send = async () => {
    if (!token || !ticketId) return;
    const text = String(draft ?? '').trim();
    if (text.length < 2) return;
    setSending(true);
    setError('');
    try {
      const data = await api.support.tickets.postMessage(token, ticketId, { message_text: text });
      setTicket(data?.ticket ?? ticket);
      setMessages(data?.messages ?? messages);
      setDraft('');
    } catch (err) {
      setError(err?.message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="section">
      <div className="container">
        <div className="page-topline">
          <Link className="button" to="/support">
            ← Back to tickets
          </Link>
        </div>

        <SectionHeading badge="Support" title={ticket ? `Ticket #${ticket.id}` : 'Support ticket'} subtitle="Conversation history is saved here." />

        {status === 'loading' ? (
          <div className="panel">
            <p className="muted">Loading ticket…</p>
          </div>
        ) : status === 'error' ? (
          <div className="panel">
            <p className="form-error">{error}</p>
            <button className="button button-solid" type="button" onClick={load}>
              Retry
            </button>
          </div>
        ) : (
          <div className="panel">
            <div className="admin-split" style={{ alignItems: 'center' }}>
              <div>
                <div className="h3" style={{ margin: 0 }}>{ticket?.subject ?? 'Ticket'}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Status: <strong>{ticket?.status ?? '—'}</strong> · Category: <strong>{ticket?.category ?? '—'}</strong> · Priority: <strong>{ticket?.priority ?? '—'}</strong>
                </div>
              </div>
              <button className="button button-ghost" type="button" onClick={load} disabled={sending}>
                Refresh
              </button>
            </div>

            {error ? <p className="form-error" style={{ marginTop: 12 }}>{error}</p> : null}

            <div className="panel" style={{ marginTop: 12 }}>
              {!messages.length ? <p className="muted">No messages yet.</p> : null}
              {messages.length ? (
                <ul className="list">
                  {messages.map((m) => {
                    const sender = m.sender_type === 'admin' ? 'Support' : m.sender_type === 'system' ? 'System' : 'You';
                    const isAdmin = m.sender_type === 'admin';
                    return (
                      <li key={m.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <strong>{sender}</strong>
                            {isAdmin ? <span className="pill" style={{ marginLeft: 8 }}>Reply</span> : null}
                            <div className="muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.message_text}</div>
                          </div>
                          <div className="muted" style={{ whiteSpace: 'nowrap' }}>
                            {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="field">
                <span className="field-label">Send a message</span>
                <textarea className="input textarea" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending || ticket?.status === 'closed'} />
              </label>
              <div className="button-row">
                <button className="button button-solid" type="button" onClick={send} disabled={sending || ticket?.status === 'closed'}>
                  {sending ? 'Sending…' : ticket?.status === 'closed' ? 'Ticket closed' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

