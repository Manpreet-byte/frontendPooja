import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../../SectionHeading';
import SafeImage from '../../SafeImage';
import { api } from '../../../api/client';
import { sortByDateDesc } from '../../../utils/publicContent';
import mediaMap from '../../../data/seed/media-map.json';
import { formatDateStandard } from '../../../utils/formatDate';

const FALLBACK_BAKERY_IMAGES = [
  '/seed-media/560ebdc890236b1a4092bda8547a446f67b42cc9.jpg',
  '/seed-media/164a1a2765010bda4c89f1b0bfbbc7bda20ea99c.jpg',
  '/seed-media/42849221d1bbdd7b1f8f4a1a4dd72ec14c4d431d.jpg',
  '/seed-media/90fe0f7b913d409627162b8ac6619ec5ac5722c3.jpg',
  '/seed-media/803645d1e47482b4290bf28a0d2804ed00088ecc.jpg',
  '/seed-media/4794a4dc013ae8f0ef553acfd0b24f6fe193186e.jpg',
];

const FALLBACK_POSTS = FALLBACK_BAKERY_IMAGES.map((src, index) => ({
  id: `fallback-${index + 1}`,
  slug: '',
  title: ['New recipe drop', 'Weekend bake', 'Wholesome treat', 'Quick dessert', 'Bakery favourite', 'Seasonal special'][index] ?? `Recipe ${index + 1}`,
  excerptHtml: 'Explore the full recipe library to discover the latest bakes.',
  date: Date.now() - index * 24 * 60 * 60 * 1000,
  featuredImage: src,
  taxonomies: { category: [{ name: 'Recipe', slug: 'recipe' }] },
}));

function resolvePostImage(post) {
  const raw =
    post?.featuredImage ??
    post?.featured_image_url ??
    post?.featuredImageUrl ??
    post?.thumbnail_url ??
    post?.thumbnailUrl ??
    post?.hero_image ??
    post?.heroImage ??
    '';

  const value = String(raw ?? '').trim();
  if (!value) return '';

  if (mediaMap?.[value]) return mediaMap[value];

  const noHost = value.replace(/https?:\/\/loveandflourbypooja\.com/gi, '');
  if (mediaMap?.[noHost]) return mediaMap[noHost];

  // If we don't have a local seed-media mapping, keep the original URL so the browser can load it.
  return value;
}

function withFallbackImages(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((post, index) => {
    const fallback = FALLBACK_BAKERY_IMAGES[index % FALLBACK_BAKERY_IMAGES.length];
    const resolvedImage = resolvePostImage(post);
    return { ...post, featuredImage: resolvedImage || fallback };
  });
}

export default function RecipeHighlightsSection() {
  const [latest, setLatest] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hoverPauseEnabled, setHoverPauseEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api.public.recipes
      .list()
      .then((data) => {
        if (!active) return;
        const incoming = sortByDateDesc(data.recipes ?? []).slice(0, 6);
        setLatest(incoming.length ? withFallbackImages(incoming) : FALLBACK_POSTS);
      })
      .catch(() => {
        if (active) setLatest(FALLBACK_POSTS);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => setHoverPauseEnabled(Boolean(query.matches));
    onChange();
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (latest.length < 2 || paused) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % latest.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [latest.length, paused]);

  const categories = Array.from(
    new Map(
      latest
        .flatMap((post) => post.taxonomies?.category ?? [])
        .map((category) => [category.slug, category]),
    ).values(),
  ).slice(0, 8);

  const slides = useMemo(() => {
    if (!latest.length) return [];

    return latest.map((featured, index) => ({
      featured,
      supportingPrimary: latest[(index + 1) % latest.length],
      supportingSecondary: latest[(index + 2) % latest.length],
    }));
  }, [latest]);

  const total = slides.length;
  const clampedIndex = total ? ((activeIndex % total) + total) % total : 0;

  return (
    <section className="section home-recipes">
      <div className="container">
        <div className="home-recipes-shell">
          <div className="home-recipes-intro">
            <SectionHeading
              badge="Recipe Library"
              title="Find your next bake"
              subtitle="Browse by category, or jump into the newest recipe drops."
              align="left"
            />

            <p className="home-recipes-copy">
              A bakery-style recipe wall: one featured bake, fresh drops, and quick category shortcuts—so you can pick what to make next in
              seconds.
            </p>

            <div className="category-pills">
              <Link className="category-pill" to="/recipe-library">
                All Recipes
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} className="category-pill" to={`/recipe-library?category=${encodeURIComponent(c.slug)}`}>
                  {c.name}
                </Link>
              ))}
            </div>

            <div className="home-recipes-stats">
              <div className="home-recipes-stat">
                <strong>{latest.length.toString().padStart(2, '0')}</strong>
                <span>Fresh recipe drops</span>
              </div>
              <div className="home-recipes-stat">
                <strong>{categories.length.toString().padStart(2, '0')}</strong>
                <span>Browse categories</span>
              </div>
            </div>

            <Link className="button button-solid home-recipes-cta" to="/recipe-library">
              Open the full recipe library
            </Link>
          </div>

          <div
            className="recipe-showcase-carousel"
            onPointerEnter={() => {
              if (hoverPauseEnabled) setPaused(true);
            }}
            onPointerLeave={() => {
              if (hoverPauseEnabled) setPaused(false);
            }}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <div className="recipe-showcase-viewport" aria-roledescription="carousel">
              <div className="recipe-showcase-track" style={{ transform: `translateX(-${clampedIndex * 100}%)` }}>
                {slides.map((slide, slideIndex) => (
                  <div key={slide.featured.id ?? slideIndex} className="recipe-showcase-slide" aria-hidden={slideIndex !== clampedIndex}>
                    <div className="recipe-slide-layout">
                      <Link className="recipe-feature-card" to={slide.featured.slug ? `/recipes/${slide.featured.slug}` : '/recipe-library'}>
                        <div className="recipe-feature-media">
                          {slide.featured.featuredImage ? (
                            <SafeImage src={slide.featured.featuredImage} alt={slide.featured.title} />
                          ) : (
                            <div className="recipe-card-fallback" aria-hidden="true" />
                          )}
                        </div>
                        <div className="recipe-feature-overlay">
                          <div className="pill recipe-feature-pill">Editor&apos;s pick</div>
                          <h3>{slide.featured.title}</h3>
                          <p
                            dangerouslySetInnerHTML={{
                              __html: slide.featured.excerptHtml ?? 'Open the recipe to explore the full method.',
                            }}
                          />
                          <span className="recipe-feature-link">View recipe</span>
                    </div>
                  </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {total > 1 ? (
              <div className="recipe-showcase-dots" role="tablist" aria-label="Choose recipe set">
                {slides.map((slide, index) => (
                  <button
                    key={slide.featured.id ?? index}
                    type="button"
                    className={`testimonial-dot${index === clampedIndex ? ' is-active' : ''}`}
                    aria-label={`Recipe slide ${index + 1}`}
                    aria-pressed={index === clampedIndex}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
