import { useEffect, useState } from 'react';
import SectionHeading from '../SectionHeading';
import mediaMap from '../../data/seed/media-map.json';
import SafeImage from '../SafeImage';

const DEFAULT_ABOUT_IMAGE =
  mediaMap['https://loveandflourbypooja.com/wp-content/uploads/2025/10/Home-Banner-Image.webp'] ??
  '/seed-media/accbad363cc9f4ff9ccbc04833046ebde7acb79d.webp';

function AnimatedCount({ end, suffix = '', duration = 1200 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [duration, end]);

  const label = value >= 1000 ? `${Math.round(value / 1000)}K` : String(value);

  return (
    <span>
      {label}
      {suffix}
    </span>
  );
}

export default function AboutSection({ featuredImage } = {}) {
  return (
    <section id="about" className="section section-about">
      <div className="container about-grid">
        <div className="about-content">
          <SectionHeading
            align="left"
            badge="About Me"
            title="Meet Pooja"
            subtitle="Welcome to Love & Flour, where every recipe is crafted with passion and perfection."
          />
          <div className="prose">
            <p>
              What started as a hobby in my small kitchen has blossomed into a community of thousands of baking
              enthusiasts.
            </p>
            <p>
              From classic cookies to elaborate celebration cakes, each recipe is tested and perfected to ensure you get
              the best results every time.
            </p>
            <p>
              My philosophy is simple: baking should be joyful, not stressful. Whether you're a beginner or an
              experienced baker, you'll find clear instructions, helpful tips, and plenty of encouragement here.
            </p>
          </div>
        </div>

        <div className="about-media">
          <SafeImage src={featuredImage || DEFAULT_ABOUT_IMAGE} alt="Baking workspace" loading="lazy" />
          <div className="about-float">
            <p className="about-float-number"><AnimatedCount end={10000} suffix="+" /></p>
            <p className="about-float-label">Happy Bakers</p>
          </div>
        </div>
      </div>

      <div className="container about-stats">
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M6.2 4.5h9.8c1 0 1.7.8 1.7 1.7v11.6c0 1-.8 1.7-1.7 1.7H6.2c-1 0-1.7-.8-1.7-1.7V6.2c0-1 .8-1.7 1.7-1.7Z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
              <path
                d="M8 8h6.6M8 11.5h6.6M8 15h4.2"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="h3"><AnimatedCount end={162} suffix="+" /> Recipes</h3>
          <p className="muted">Tested and perfected recipes for every occasion.</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M8.2 11a3.2 3.2 0 1 1 6.4 0v1.2a3.2 3.2 0 0 1-6.4 0V11Z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4.8 19.3a7.2 7.2 0 0 1 14.4 0"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 7.2h4M18 5.2v4"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="h3"><AnimatedCount end={50000} suffix="+" /> Community</h3>
          <p className="muted">Baking enthusiasts sharing their creations.</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M12 20.7s-7-4.2-9.4-8.2C.7 9.2 2.6 6.2 6 6.2c1.9 0 3.3 1 4 2 0 0 .7-2 4-2 3.4 0 5.3 3 3.4 6.3-2.4 4-9.4 8.2-9.4 8.2Z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="h3"><AnimatedCount end={100} suffix="%" /> Love</h3>
          <p className="muted">Every recipe made with care and attention.</p>
        </div>
      </div>
    </section>
  );
}
