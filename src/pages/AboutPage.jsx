import WpContentPage from '../components/WpContentPage';
import { pages } from '../data/seededContent';
import AboutSection from '../components/sections/AboutSection';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import mediaMap from '../data/seed/media-map.json';
import usePageTitle from '../utils/usePageTitle';

export default function AboutPage() {
  usePageTitle('About · Love & Flour');
  const featuredImageOverride =
    mediaMap['https://loveandflourbypooja.com/wp-content/uploads/2025/10/Home-Banner-Image.webp'] ?? '/seed-media/accbad363cc9f4ff9ccbc04833046ebde7acb79d.webp';
  const [cms, setCms] = useState(null);

  useEffect(() => {
    let active = true;
    api.public.content
      .about()
      .then((data) => {
        if (!active) return;
        setCms(data?.about ?? null);
      })
      .catch(() => {
        if (active) setCms(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (cms?.content_html) {
    return (
      <WpContentPage
        badge="About"
        title={cms?.title ?? 'About'}
        featuredImage={cms?.content?.featured_image_url ?? featuredImageOverride}
        contentHtml={cms.content_html}
        pageClassName="page-white"
      />
    );
  }

  const page =
    pages.find((p) => p.slug === 'about') ??
    pages.find((p) => p.slug === 'about-us') ??
    pages.find((p) => p.slug === 'about-pooja') ??
    null;

  if (page) {
    return (
      <WpContentPage
        badge="About"
        title={page.title}
        featuredImage={featuredImageOverride || page.featuredImage}
        contentHtml={page.contentHtml}
        pageClassName="page-white"
      />
    );
  }

  return (
    <main>
      <AboutSection featuredImage={featuredImageOverride} />
    </main>
  );
}
