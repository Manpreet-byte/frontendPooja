import { useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../SectionHeading';
import { api } from '../../api/client';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  return (
    <section id="contact" className="section section-contact">
      <div className="container">
        <SectionHeading
          badge="Get in Touch"
          title="Contact"
          subtitle="Questions about workshops, access, or collaborations? Send a message and we’ll get back to you."
        />

        <div className="contact-grid">
          <div className="contact-info">
            <div className="panel contact-card contact-card-hero">
              <div className="contact-card-hero-inner">
                <div>
                  <h3 className="h3" style={{ marginTop: 0 }}>We’re here to help</h3>
                  <p className="muted" style={{ marginTop: 8 }}>
                    For workshops, courses, and collaborations:
                  </p>
                  <a className="contact-link" href="mailto:contact@loveandflourbypooja.com">
                    contact@loveandflourbypooja.com
                  </a>
                </div>
              </div>
            </div>

            <div className="panel contact-card">
              <h3 className="h4" style={{ marginTop: 0 }}>Career opportunities</h3>
              <p className="muted">Interested in joining our team?</p>
              <a className="contact-link" href="mailto:careers@loveandflourbypooja.com">
                careers@loveandflourbypooja.com
              </a>
            </div>

            <div className="panel contact-card">
              <h3 className="h4" style={{ marginTop: 0 }}>Studio address</h3>
              <p className="muted" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>
                13II, Corporate Annexe{'\n'}
                Sonawala Road, Next to Udyog Bhawan,{'\n'}
                Goregaon East, Mumbai – 400063
              </p>
            </div>

            <div className="panel contact-card">
              <h3 className="h4" style={{ marginTop: 0 }}>Stay connected</h3>
              <div className="contact-social">
                <a className="icon-button" href="#" aria-label="Instagram (add link)">
                  IG
                </a>
                <a className="icon-button" href="#" aria-label="Facebook (add link)">
                  FB
                </a>
                <a className="icon-button" href="#" aria-label="YouTube (add link)">
                  YT
                </a>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                Or simply fill out the form and we’ll get back to you shortly.
              </p>
            </div>

            <div className="panel panel-gradient contact-card">
              <h3 className="h4" style={{ marginTop: 0 }}>Join the newsletter</h3>
              <p className="panel-gradient-text">
                Get weekly recipes, baking tips, and exclusive content delivered to your inbox.
              </p>
              <Link className="button button-ghost" to="/newsletter">
                Subscribe
              </Link>
            </div>
          </div>

          <form
            className="panel contact-form contact-form-modern"
            onSubmit={async (e) => {
              e.preventDefault();
              if (status === 'loading') return;
              setStatus('loading');
              setError('');
              try {
                await api.public.contact.send(form);
                setStatus('success');
                setForm({ name: '', email: '', subject: '', message: '' });
              } catch (err) {
                setStatus('error');
                setError(err?.message || 'Failed to send message. Please try again.');
              }
            }}
          >
            <div className="contact-form-head">
              <h3 className="h3" style={{ marginTop: 0 }}>Send a message</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                We usually reply within 24–48 hours.
              </p>
            </div>

            <div className="contact-form-grid">
              <label className="field">
                <span className="field-label">Your name</span>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                  placeholder="Enter your first name"
                  required
                />
              </label>

              <label className="field">
                <span className="field-label">Email</span>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Subject</span>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setForm((v) => ({ ...v, subject: e.target.value }))}
                placeholder="What’s this about?"
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Message</span>
              <textarea
                className="input textarea"
                rows={7}
                value={form.message}
                onChange={(e) => setForm((v) => ({ ...v, message: e.target.value }))}
                placeholder="Tell us a bit more so we can help quickly…"
                required
              />
            </label>

            <div className="button-row">
              <button className="button button-solid" type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending…' : 'Send message'}
              </button>
              <a className="button button-ghost" href="mailto:contact@loveandflourbypooja.com">
                Email directly
              </a>
            </div>

            {status === 'success' ? (
              <p className="muted" role="status" style={{ marginTop: 10 }}>
                Thanks! Your message has been sent.
              </p>
            ) : null}
            {status === 'error' && error ? (
              <p className="form-error" role="alert" style={{ marginTop: 10 }}>
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
