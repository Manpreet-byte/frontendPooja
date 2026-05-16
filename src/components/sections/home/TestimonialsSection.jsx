import { useEffect, useMemo, useState } from 'react';
import SectionHeading from '../../SectionHeading';
import { homeTestimonials } from '../../../data/seededContent';
import { api } from '../../../api/client';

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return (parts.map((part) => part[0]?.toUpperCase()).join('') || 'S').slice(0, 2);
}

export default function TestimonialsSection({ cms }) {
  const [remote, setRemote] = useState(null);
  const fallback = useMemo(() => (homeTestimonials ?? []).filter(Boolean).slice(0, 8), []);
  const items = useMemo(() => {
    if (Array.isArray(cms) && cms.length) return cms.slice(0, 12);
    if (Array.isArray(remote) && remote.length) return remote.slice(0, 12);
    return fallback;
  }, [cms, remote, fallback]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    api.public.testimonials
      .list()
      .then((data) => {
        if (!active) return;
        const list = (data?.testimonials ?? []).map((t) => ({
          id: t.id,
          quote: t.testimonial_text,
          student_name: t.student_name,
          avatar_url: t.avatar_url,
        }));
        setRemote(list);
      })
      .catch(() => {
        if (active) setRemote(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) {
      return undefined;
    }

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      return undefined;
    }

    if (paused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const total = items.length;
  const clampedIndex = total ? ((activeIndex % total) + total) % total : 0;
  const at = (offset) => {
    if (!total) return null;
    return items[(clampedIndex + offset + total) % total];
  };

  const cards = total
    ? [
        { item: at(-1), position: 'left', visualIndex: ((clampedIndex - 1 + total) % total) + 1 },
        { item: at(0), position: 'center', visualIndex: clampedIndex + 1 },
        { item: at(1), position: 'right', visualIndex: ((clampedIndex + 1) % total) + 1 },
      ]
    : [];

  return (
    <section className="section home-testimonials">
      <div className="container">
        <SectionHeading
          badge="Testimonials"
          title="What students say"
          subtitle="A few words from bakers who’ve attended workshops and recreated successfully."
        />

        <div
          className="testimonials-carousel"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="testimonials-shell" aria-roledescription="carousel">
            <div className="testimonials-window">
              {cards.map((entry, index) => {
                if (!entry.item) return null;
                const displayName = entry.item.student_name ? String(entry.item.student_name) : `Student ${entry.visualIndex}`;
                return (
                  <article
                    key={`${entry.item.id ?? index}-${entry.position}`}
                    className={`testimonial-card testimonial-card-${entry.position}`}
                    aria-hidden={entry.position !== 'center'}
                  >
                    <div className="testimonial-avatar" aria-hidden="true">
                      {initialsFromName(displayName)}
                    </div>
                    <h3 className="testimonial-name">{displayName}</h3>
                    <p className="testimonial-role">Workshop Student</p>
                    <p className="testimonial-quote">{entry.item.quote}</p>
                  </article>
                );
              })}
            </div>
          </div>

          {total > 1 ? (
            <div className="testimonials-controls">
              <button
                type="button"
                className="icon-button testimonials-nav"
                aria-label="Previous testimonial"
                onClick={() => setActiveIndex((current) => (current - 1 + total) % total)}
              >
                ‹
              </button>

              <div className="testimonials-dots" role="tablist" aria-label="Choose testimonial">
                {items.map((t, index) => (
                  <button
                    key={t.id ?? index}
                    type="button"
                    className={`testimonial-dot${index === clampedIndex ? ' is-active' : ''}`}
                    aria-label={`Testimonial ${index + 1}`}
                    aria-pressed={index === clampedIndex}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="icon-button testimonials-nav"
                aria-label="Next testimonial"
                onClick={() => setActiveIndex((current) => (current + 1) % total)}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
