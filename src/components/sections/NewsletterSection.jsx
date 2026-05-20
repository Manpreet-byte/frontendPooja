import { useState } from 'react';
import SectionHeading from '../SectionHeading';
import { api } from '../../api/client';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [message, setMessage] = useState('');

  return (
    <section id="newsletter" className="section section-newsletter">
      <div className="container">
        <SectionHeading
          badge="Newsletter"
          title="Get the Latest Recipes"
          subtitle="Join our community of baking enthusiasts and receive weekly recipes, exclusive tips, and special offers."
        />

        <form
          className="newsletter-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (status === 'saving') return;
            setStatus('saving');
            setMessage('');
            try {
              await api.public.newsletter.subscribe({ email });
              setStatus('done');
              setMessage('Thank you for subscribing!');
              setEmail('');
            } catch (err) {
              setStatus('error');
              setMessage(err?.message ?? 'Unable to subscribe right now.');
            }
          }}
        >
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={status === 'saving'}
          />
          <button className="button button-solid" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>

        {message ? (
          <p className={status === 'error' ? 'form-error' : 'muted'} style={{ marginTop: 10 }}>
            {message}
          </p>
        ) : null}
        <p className="fineprint newsletter-fineprint">No spam, unsubscribe anytime. We respect your privacy.</p>
      </div>
    </section>
  );
}
