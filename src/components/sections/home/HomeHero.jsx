import { Link } from 'react-router-dom';
import SafeImage from '../../SafeImage';

const heroImage =
  'https://lh3.googleusercontent.com/chat_attachment/AP1Ws4taqLWqBM9Cs4qqBvFMIYRM20XC20uPauA8GXsd4sAUIl1FnNcKw7NxPn1g7pOtHz1TTyuis41dS7X6x2owm112EUXCBKJWtkjoBatmZfAgX7_GU28vUJHR1Ll2xAvgsUX-gDZ7XMju1GKLUk-Sq4cFAT_JRbiTTDYdGP5LBoH3W68yexbx6nprEToB3_htLU9rA5oBv6xTW16mtfWMkTbdgEQUloIFn_kCJRWMCFiXcusG3dv9eC97ukJo8tOFNbcBd8Z0nG8DZne01TT5v-ZNQfjIRqN6ycCjSl6D_CtOw_upyShTcVkYdH0YYAjfxh4=w1854-h961-rw';

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
