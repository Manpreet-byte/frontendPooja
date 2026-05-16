import { Link, useParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading';
import WpContentPage from '../components/WpContentPage';
import { findPageBySlug } from '../data/seededContent';

export default function WpPageDetailPage() {
  const { slug } = useParams();
  const page = findPageBySlug(slug);

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

  return <WpContentPage badge="Page" title={page.title} featuredImage={page.featuredImage} contentHtml={page.contentHtml} />;
}

