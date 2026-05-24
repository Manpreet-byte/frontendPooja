import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SectionHeading from '../components/SectionHeading';
import WpContentPage from '../components/WpContentPage';
import { findPageBySlug } from '../data/seededContent';
import { api } from '../api/client';
import usePageSeo from '../utils/usePageSeo';
import usePageTitle from '../utils/usePageTitle';

export default function WpPageDetailPage() {
  const { slug } = useParams();
  const page = findPageBySlug(slug);
  const isFaqPage = slug === 'frequently-asked-questions';
  const [faqItems, setFaqItems] = useState([]);

  usePageSeo(isFaqPage ? 'frequently-asked-questions' : slug, page?.title ?? 'Love & Flour');
  usePageTitle(page?.title ?? 'Love & Flour');

  useEffect(() => {
    let active = true;
    if (!isFaqPage) return undefined;

    api.public.faqs
      .list()
      .then((data) => {
        if (!active) return;
        setFaqItems((data?.faqs ?? []).slice(0, 200));
      })
      .catch(() => {
        if (active) setFaqItems([]);
      });

    return () => {
      active = false;
    };
  }, [isFaqPage]);

  if (isFaqPage && faqItems.length) {
    const grouped = faqItems.reduce((acc, item) => {
      const key = String(item?.category ?? 'General').trim() || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return (
      <main className="section page-white page-60 faq-page page-typography">
        <div className="container">
          <SectionHeading badge="FAQs" title="Frequently Asked Questions" subtitle="Answers from the team behind Love & Flour." align="left" />
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category} className="panel prose-block" style={{ marginTop: 18 }}>
              <h2>{category}</h2>
              <div className="flow">
                {items.map((item) => (
                  <details key={item.id} className="faq-toggle" open={false}>
                    <summary className="faq-toggle-summary">{item.question}</summary>
                    <div className="faq-toggle-content" dangerouslySetInnerHTML={{ __html: item.answer_html ?? '' }} />
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="section">
        <div className="container">
          <SectionHeading badge="Not Found" title="Page not found" subtitle={null} />
          <Link className="button" to="/">
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <WpContentPage
      badge="Page"
      title={page.title}
      featuredImage={page.featuredImage}
      contentHtml={page.contentHtml}
      pageClassName={isFaqPage ? 'faq-page' : ''}
    />
  );
}
