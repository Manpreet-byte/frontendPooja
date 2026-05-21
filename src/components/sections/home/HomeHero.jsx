import { Link } from 'react-router-dom';
import SafeImage from '../../SafeImage';

const heroImage =
  'https://chat.google.com/api/get_attachment_url?url_type=FIFE_URL&content_type=image%2Fpng&attachment_token=AOo0EEUAgpBputXo%2BpU7KxMVqFj2Z%2FHiBexDrlEIYps4o%2B3ZrkHG8VrrEbleLjXqfJx5HN8eY%2Fvua8GaV9DQJgD4R%2BwMGySG1xb2gUgdOWd%2FDCUbiWqkakwCt7YwwMk2UhGRgTKPlwpNDDv1KuYl7aq1Zs5vhuYGYsVqEHaOYsKaD98CVB8cUi1ubX%2BxUosb6Ge9DHDzJ08e3IUPZ63ECBo3lv427PxIcv24jdh6eJ5G19AAs77LeAZ1gghuorHsbymWXDURV1PXN%2BzhHnnH1holOBiTUQ2GFVKOFcp8a7aZ%2F3lWwLd3L7DjL2iJhWJEi4jzEsN1Tjq4ZxZ%2B6RWi%2BOWNuJrodYRk0mGeAxEzfu%2BlIjCcYHF%2B8J4gxHeYJ5L5pEcfTBplkTJoPPRK2pZ0GD4Q2%2Fs0AA6BlXxGEHuswt2%2FjF68iKabMKnDensdWXF%2FSIsDrh37IvDWLYnFWdeTXGTJOCP2MSU1RIjhmpWm2u6yN29UH5hKjvQYwAunr4lXChmQU4j1AdYishYdEjzNmvM07S74hDXUlmHUMvSZLOPHXqGJBSXg5mMJGkOCq5DO51b0ypDy32ofUIGa7zOTnsAdB2NRlJtY9kgvMaTW06OoCTG7UCfjxfgNiQ%3D%3D&allow_caching=true&sz=w1854-h961-rw&auditContext=forDisplay';

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
  const imageUrl = cms?.image_url ?? heroImage;
  const primaryLabel = cms?.primary_cta_label ?? 'Explore All Courses';
  const primaryHref = cms?.primary_cta_href ?? '/courses';
  const secondaryLabel = cms?.secondary_cta_label ?? '';
  const secondaryHref = cms?.secondary_cta_href ?? '';

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
