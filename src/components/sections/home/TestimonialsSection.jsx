import { useEffect, useMemo, useRef, useState } from 'react';
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

function normalizeTestimonial(item, index) {
  return {
    id: item?.id ?? `cms-${index}`,
    quote: item?.testimonial_text ?? item?.quote ?? '',
    student_name: item?.student_name ?? item?.name ?? '',
    avatar_url: item?.avatar_url ?? '',
  };
}

export default function TestimonialsSection({ cms }) {
  const [remote, setRemote] = useState(null);
  const fallback = useMemo(() => (homeTestimonials ?? []).filter(Boolean).slice(0, 8), []);
  const hoverStepLockRef = useRef(null);
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
        const list = (data?.testimonials ?? []).map(normalizeTestimonial);
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

  const handleSideCardHover = (direction) => {
    if (hoverStepLockRef.current === direction) return;
    hoverStepLockRef.current = direction;
    setActiveIndex((current) => (current + direction + total) % total);
  };

  const releaseSideCardHover = (direction) => {
    if (hoverStepLockRef.current === direction) {
      hoverStepLockRef.current = null;
    }
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
            {total > 1 ? (
              <button
                type="button"
                className="icon-button testimonials-nav testimonials-nav-prev"
                aria-label="Previous testimonial"
                onClick={() => setActiveIndex((current) => (current - 1 + total) % total)}
              >
                ‹
              </button>
            ) : null}

            <div className="testimonials-window">
              {cards.map((entry, index) => {
                if (!entry.item) return null;
                const displayName = entry.item.student_name ? String(entry.item.student_name) : `Student ${entry.visualIndex}`;
                return (
                  <article
                    key={`${entry.item.id ?? index}-${entry.position}`}
                    className={`testimonial-card testimonial-card-${entry.position}`}
                    aria-hidden={entry.position !== 'center'}
                    onPointerEnter={entry.position === 'left' ? () => handleSideCardHover(-1) : entry.position === 'right' ? () => handleSideCardHover(1) : undefined}
                    onPointerLeave={entry.position === 'left' ? () => releaseSideCardHover(-1) : entry.position === 'right' ? () => releaseSideCardHover(1) : undefined}
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

            {total > 1 ? (
              <button
                type="button"
                className="icon-button testimonials-nav testimonials-nav-next"
                aria-label="Next testimonial"
                onClick={() => setActiveIndex((current) => (current + 1) % total)}
              >
                ›
              </button>
            ) : null}
          </div>

          {total > 1 ? (
            <div className="testimonials-controls">
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
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
