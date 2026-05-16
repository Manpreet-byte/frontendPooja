import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';
import { sanitizeHtmlForApp } from '../utils/htmlSanitize';
import SafeImage from './SafeImage';

export default function WpContentPage({
  badge = 'Page',
  title,
  featuredImage,
  contentHtml,
  backTo,
  backLabel,
  contentClassName = '',
  pageClassName = '',
}) {
  const safeHtml = contentHtml ? sanitizeHtmlForApp(contentHtml) : '';

  // Initialize Elementor toggle/accordion functionality
  useEffect(() => {
    const setupToggles = () => {
      const toggleTitles = document.querySelectorAll('.elementor-tab-title');

      toggleTitles.forEach((title) => {
        // Remove any existing listeners to avoid duplicates
        const clone = title.cloneNode(true);
        title.parentNode.replaceChild(clone, title);

        // Add click handler to the cloned element
        clone.addEventListener('click', (e) => {
          e.preventDefault();
          const isExpanded = clone.getAttribute('aria-expanded') === 'true';
          clone.setAttribute('aria-expanded', !isExpanded);
        });

        // Handle keyboard: Enter and Space should toggle
        clone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isExpanded = clone.getAttribute('aria-expanded') === 'true';
            clone.setAttribute('aria-expanded', !isExpanded);
          }
        });
      });
    };

    // Run after a small delay to ensure DOM is fully rendered
    const timer = setTimeout(setupToggles, 100);
    return () => clearTimeout(timer);
  }, [safeHtml]);

  return (
    <main className={`section${pageClassName ? ` ${pageClassName}` : ''}`}>
      <div className="container">
        {backTo ? (
          <div className="page-topline">
            <Link className="button" to={backTo}>
              ← {backLabel ?? 'Back'}
            </Link>
          </div>
        ) : null}

        <SectionHeading align="left" badge={badge} title={title} subtitle={null} />

        {featuredImage ? (
          <div className="hero-image">
            <SafeImage src={featuredImage} alt={title} loading="eager" />
          </div>
        ) : null}

        {safeHtml ? (
          <div
            className={`panel prose-block${contentClassName ? ` ${contentClassName}` : ''}`}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : null}
      </div>
    </main>
  );
}
