import { Link } from 'react-router-dom';
import SafeImage from '../../SafeImage';

const heroImage = '/hero.jpeg';

function sentenceCase(text) {
  const value = String(text ?? '').trim();
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function HomeHero({ cms }) {
  const badge = cms?.badge != null && String(cms.badge).trim() ? String(cms.badge) : sentenceCase('artisanal bakery & culinary workshops');
  const title = cms?.title ?? 'Craft Your\nCulinary Story';
  const subtitle =
    cms?.subtitle ??
    'Handcrafted recipes, live baking workshops, and premium ingredients\nto elevate your home kitchen';
  const imageUrl = cms?.image_url ?? heroImage;
  const primaryLabel = cms?.primary_cta_label ?? 'Explore Workshops';
  const primaryHref = cms?.primary_cta_href ?? '/courses';
  const secondaryLabel = cms?.secondary_cta_label ?? 'Browse Recipes';
  const secondaryHref = cms?.secondary_cta_href ?? '/recipe-library';

  const titleLines = String(title).split(/\n/).filter(Boolean);
  const subtitleLines = String(subtitle).split(/\n/).filter(Boolean);

  return (
    <section className="hero-premium" aria-label="Hero">
      <div className="hero-premium-media" aria-hidden="true">
        <SafeImage src={imageUrl} alt="" loading="eager" />
      </div>
      <div className="hero-premium-overlay" />
      <div className="container-wide hero-premium-inner">
        <div className="hero-premium-content">
          <p className="hero-premium-badge">{badge}</p>
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
            <Link className="button button-ghost" to={secondaryHref}>
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
