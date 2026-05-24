import { useEffect, useState } from 'react';
import WpContentPage from './WpContentPage';
import { api } from '../api/client';
import usePageTitle from '../utils/usePageTitle';
import usePageSeo from '../utils/usePageSeo';

export default function PublicLegalPage({ slug, defaultTitle, badge = 'Page', pageClassName = '', children }) {
  const [legal, setLegal] = useState(null);

  usePageTitle(defaultTitle);
  usePageSeo(slug, defaultTitle);

  useEffect(() => {
    let active = true;
    const key = String(slug ?? '').trim();
    if (!key) return undefined;

    api.public.legal
      .get(key)
      .then((data) => {
        if (!active) return;
        setLegal(data?.legal ?? null);
      })
      .catch(() => {
        if (active) setLegal(null);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (legal?.content_html) {
    return (
      <WpContentPage
        badge={badge}
        title={legal?.title ?? defaultTitle}
        featuredImage={null}
        contentHtml={legal.content_html}
        pageClassName={pageClassName}
      />
    );
  }

  return children ?? null;
}