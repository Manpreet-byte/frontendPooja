import { Link } from 'react-router-dom';
import SafeImage from '../../SafeImage';

const heroImage =
  'https://chat.google.com/api/get_attachment_url?url_type=FIFE_URL&content_type=image%2Fpng&attachment_token=AOo0EEXt9ALj22lQdlYdxvJ6ZPvkNa%2B0mvcE5pcPwcWvWhAx3Dz%2FUYqAIwiqFzL1jnFP14m%2Bp46ajK8M0TKd90NmusiLaDcSVQfcyy6JpbVRq78%2FuL7TzZuzpaRSVuYg4rChMGR0rIv1WtULUDHzxuFb8woP365wT6Nu0UfT2orqw4hSILro7CRCjO8EjlAWaQcVORemzQotxtdqRDIlwiAEt7g1FqkAvXhKNHCWrFVGtn0YHpy3LA0pnzGzH4kcu2Ovc3hjidBdPV5TeOKqDXpMjtK5DwDuR8P%2Fxj8fKe8EPyiydAAQtXxzDZj%2Fa2scMiIBvWsYjtj%2Bm6u8tQRsA4Zqv0AwAK51NRr8dLX08RiuN%2FSlrZbXK67aVnVsfSpdbV6XF6ZvcysUA5C%2BWxdv%2Fe0oX9SGQPjOyliJSCj2rQX2KoDqod953OvFKp1D61d5tObTWTKvzyi6UeAGOrP6xJUr8bcubMM%2BpmFUoaEn%2BgMCd05nrNi38YA78UCUoAfWC0onBxa6QxHp%2Fa5PI1ufZL%2Bv9QjV9iJFSb6oaYMceZXeJGm04pJipab45v7%2BkINbkhd836xw3X9c93PyjCMGw%2Fg94OxZkstYsxSq7KOBSzktxa68gHWCdtQ%3D&allow_caching=true&sz=w512';

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
