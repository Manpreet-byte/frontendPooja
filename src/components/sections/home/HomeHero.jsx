import { Link } from 'react-router-dom';
import SafeImage from '../../SafeImage';

const heroImage =
  '/heroImage.webp';

const workWithUsImage3 = 'https://loveandflourbypooja.com/wp-content/uploads/2025/09/IMG_5634.jpg';

function sentenceCase(text) {
  const value = String(text ?? '').trim();
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function HomeHero({ cms }) {
  const badge = cms?.badge != null ? String(cms.badge) : '';
  const title = cms?.title ?? 'Learn. Bake.\nFlourish.';
  const subtitle =
    cms?.subtitle ??
    'Join Pooja Ganeriwala \u2013 an award-\nwinning tutor \u2013 on a journey to master\negg free recipes, savouries, and\ndelights that elevate your skills and\nspark joy in every bake.';
  const imageUrl =
    cms?.image_url ??
    cms?.imageUrl ??
    cms?.featured_image_url ??
    cms?.featuredImageUrl ??
    cms?.image ??
    cms?.background_image ??
    cms?.backgroundImage ??
    workWithUsImage3 ??
    heroImage;
  const primaryLabel = cms?.primary_cta_label ?? 'Explore All Courses';
  const primaryHref = cms?.primary_cta_href ?? '/courses';
  const secondaryLabel = cms?.secondary_cta_label ?? '';
  const secondaryHref = cms?.secondary_cta_href ?? '';

  const titleLines = String(title).split(/\n/).filter(Boolean);
  const subtitleLines = String(subtitle).split(/\n/).filter(Boolean);

  return (
    <section className="hero-premium" aria-label="Hero">
      <div className="hero-premium-media" aria-hidden="true">
        <SafeImage
          src={imageUrl}
          alt=""
          loading="eager"
          decoding="async"
          fetchpriority="high"
          className="hero-premium-image is-active"
        />
      </div>
      <div className="hero-premium-overlay" />
      <div className="container-wide hero-premium-inner">
        <div className="hero-premium-content">
          {badge && badge.trim() ? <p className="hero-premium-badge">{sentenceCase(badge)}</p> : null}
          <h1 className="hero-premium-title">
            {titleLines.length ? (
              titleLines.map((line, idx) => (
                <span key={idx}>
                  {line}
                  {idx < titleLines.length - 1 ? <br /> : null}
                </span>
              ))
            ) : (
              <>
                Craft Your
                <br />
                Culinary Story
              </>
            )}
          </h1>
          <p className="hero-premium-subtitle">
            {subtitleLines.length ? (
              subtitleLines.map((line, idx) => (
                <span key={idx}>
                  {line}
                  {idx < subtitleLines.length - 1 ? <br /> : null}
                </span>
              ))
            ) : (
              <>
                Handcrafted recipes, live baking workshops, and premium ingredients
                <br />
                to elevate your home kitchen
              </>
            )}
          </p>
          <div className="hero-premium-actions">
            <Link className="button button-solid" to={primaryHref}>
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryHref ? (
              <Link className="button button-ghost" to={secondaryHref}>
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
