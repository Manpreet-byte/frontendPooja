import { useEffect, useRef, useState } from 'react';
import SectionHeading from '../SectionHeading';
import mediaMap from '../../data/seed/media-map.json';
import SafeImage from '../SafeImage';

const DEFAULT_ABOUT_IMAGE =
  mediaMap['https://loveandflourbypooja.com/wp-content/uploads/2025/10/Home-Banner-Image.webp'] ??
  '/seed-media/accbad363cc9f4ff9ccbc04833046ebde7acb79d.webp';

function AnimatedCount({ end, suffix = '', duration = 1200 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
    if (!duration) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (typeof requestAnimationFrame === 'undefined') return undefined;
    if (typeof performance === 'undefined' || typeof performance.now !== 'function') return undefined;

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

function useInViewOnce(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && (e.intersectionRatio ?? 0) >= (options.minRatio ?? 0.25))) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: options.threshold ?? [0, 0.25, 0.5, 1] },
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [inView, options.minRatio, options.threshold]);

  return { ref, inView };
}

export default function AboutSection({ featuredImage } = {}) {
  const sectionRef = useRef(null);
  const floatCount = useInViewOnce({ minRatio: 0.25 });
  const recipesCount = useInViewOnce({ minRatio: 0.25 });
  const communityCount = useInViewOnce({ minRatio: 0.25 });
  const loveCount = useInViewOnce({ minRatio: 0.25 });

  return (
    <section ref={sectionRef} id="about" className="section section-about">
      <div className="container about-grid">
        <div className="about-content">
          <SectionHeading
            align="left"
            badge="About"
            title="Love and Flour by Pooja"
            subtitle="We believe that baking is more than a skill. It’s a language of creativity, care, and connection."
          />
          <div className="prose">
            <p>
              At Love &amp; Flour by Pooja, we exist to make professional-quality, egg-free baking simple, approachable,
              and inspiring, no matter where you are in your journey.
            </p>
            <p>
              Every workshop, every recipe, and every resource we share is designed with one promise in mind: to help
              you bake with confidence, express yourself creatively, and build something you’re proud of.
            </p>

            <h3 className="h3">Our Values</h3>
            <div className="about-feature-list">
            <p className="about-feature">
              <strong>Simplicity</strong>
              <br />
              We believe learning should be joyful, not intimidating. Our methods are approachable, practical, and
              designed for real home kitchens.
            </p>
            <p className="about-feature">
              <strong>Excellence</strong>
              <br />
              Every recipe is tested, refined, and crafted with care, ensuring professional results that never
              compromise on quality or flavour.
            </p>
            <p className="about-feature">
              <strong>Empowerment</strong>
              <br />
              Baking can change lives. We’re here to help you discover your potential, whether that means mastering your
              first cake or starting your own small business.
            </p>
            <p className="about-feature">
              <strong>Community</strong>
              <br />
              We’re more than a platform. We’re a family of bakers who support, celebrate, and grow together.
            </p>
            </div>

            <h3 className="h3">What Makes Us Different</h3>
            <div className="about-feature-list">
            <p className="about-feature">
              <strong>Egg-Free Without Compromise</strong>
              <br />
              We’ve redefined what egg-free baking can be. Delicious, indulgent, and perfectly balanced. Recipes that
              match and often exceed the quality of traditional baking.
            </p>
            <p className="about-feature">
              <strong>Designed for Real Kitchens</strong>
              <br />
              Our methods are built around home bakers. No complicated tools or commercial equipment needed.
            </p>
            <p className="about-feature">
              <strong>Support That Lasts</strong>
              <br />
              Every class comes with video access, live Q&amp;As, and continued long-term support, so your learning
              doesn’t stop when the class ends.
            </p>
            <p className="about-feature">
              <strong>Beyond Recipes</strong>
              <br />
              Our workshops go deeper than just “how to bake.” We focus on technique, business skills, and product
              presentation, helping you think like a baker and an entrepreneur so that you can actually thrive in the
              baking world.
            </p>
            <p className="about-feature">
              <strong>Heart-Led Teaching</strong>
              <br />
              Every course is designed to teach not just technique, but confidence, so you enjoy every step of your
              journey.
            </p>
            </div>

            <h3 className="h3">Our Promise</h3>
            <ul>
              <li>To make learning fun, reliable, and deeply rewarding.</li>
              <li>To be honest, approachable, and supportive in everything we do.</li>
              <li>And to remind you that behind every perfect dessert is a story, a little patience, and a whole lot of love.</li>
            </ul>

            <p>
              Because at Love &amp; Flour by Pooja, we don’t just teach baking — we nurture joy, skill, and self-belief,
              one recipe at a time.
            </p>
          </div>
        </div>

        <div className="about-media">
          <SafeImage src={featuredImage || DEFAULT_ABOUT_IMAGE} alt="Baking workspace" loading="lazy" />
          <div ref={floatCount.ref} className="about-float">
            <p className="about-float-number">
              {floatCount.inView ? <AnimatedCount end={10000} suffix="+" /> : <span>0+</span>}
            </p>
            <p className="about-float-label">Happy Bakers</p>
          </div>
        </div>
      </div>

      <div className="container about-stats">
        <div ref={recipesCount.ref} className="stat-card">
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
          <h3 className="h3">
            {recipesCount.inView ? <AnimatedCount end={162} suffix="+" /> : <span>0+</span>} Recipes
          </h3>
          <p className="muted">Tested and perfected recipes for every occasion.</p>
        </div>
        <div ref={communityCount.ref} className="stat-card">
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
          <h3 className="h3">
            {communityCount.inView ? <AnimatedCount end={50000} suffix="+" /> : <span>0+</span>} Community
          </h3>
          <p className="muted">Baking enthusiasts sharing their creations.</p>
        </div>
        <div ref={loveCount.ref} className="stat-card">
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
          <h3 className="h3">
            {loveCount.inView ? <AnimatedCount end={100} suffix="%" /> : <span>0%</span>} Love
          </h3>
          <p className="muted">Every recipe made with care and attention.</p>
        </div>
      </div>
    </section>
  );
}
